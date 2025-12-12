/**
 * Approvals API - Manager approval for sheets and expenses
 *
 * Provides endpoints for managers to:
 * - Get pending items from their team
 * - Approve individual sheets or expenses
 * - Reject individual sheets or expenses
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {requireAuth} from "../utils/auth";
import {ApiError, UserRole} from "../types";

const db = getFirestore();

// ============================================================================
// TYPES
// ============================================================================

export type PendingItemType = "sheets" | "expense";

export interface PendingItem {
  id: string;
  type: PendingItemType;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD

  // For sheets
  catalog?: string;
  sheetsCount?: number;

  // For expenses
  amount?: number;
  category?: string;
  description?: string;
  receiptPhotos?: string[];

  // Common
  createdAt: string; // ISO 8601
}

// ============================================================================
// HELPER: Check if user is a manager
// ============================================================================

function isManagerRole(role: UserRole): boolean {
  return ["area_manager", "zonal_head", "national_head", "admin"].includes(role);
}

// ============================================================================
// GET PENDING ITEMS
// ============================================================================

export const getPendingItems = onRequest({cors: true}, async (request, response) => {
  try {
    // Auth check
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const userId = auth.uid;

    // Get user role
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const userData = userDoc.data();
    const role = userData?.role as UserRole;

    // Role check - must be manager
    if (!isManagerRole(role)) {
      const error: ApiError = {
        ok: false,
        error: "Only managers can view pending items",
        code: "PERMISSION_DENIED",
      };
      response.status(403).json(error);
      return;
    }

    // Get team member IDs and build user name map in one query (fix N+1)
    let teamIds: string[];
    const userNameMap: Record<string, string> = {};

    if (role === "admin") {
      // Admin sees all reps
      const allRepsSnapshot = await db
        .collection("users")
        .where("role", "==", "rep")
        .where("isActive", "==", true)
        .get();
      teamIds = allRepsSnapshot.docs.map((doc) => doc.id);
      // Build user name map from the same query (no extra reads!)
      allRepsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        userNameMap[doc.id] = data?.name || "Unknown";
        // Also include migratedFrom IDs for data aggregation
        if (data?.migratedFrom) {
          teamIds.push(data.migratedFrom);
          userNameMap[data.migratedFrom] = data?.name || "Unknown";
        }
      });
    } else {
      // National Head / Area Manager / Zonal Head - see ONLY direct reports
      // Each manager only approves items from users who report directly to them
      const usersSnapshot = await db
        .collection("users")
        .where("reportsToUserId", "==", userId)
        .where("isActive", "==", true)
        .get();
      teamIds = usersSnapshot.docs.map((doc) => doc.id);
      // Build user name map from the same query (no extra reads!)
      usersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        userNameMap[doc.id] = data?.name || "Unknown";
        // Also include migratedFrom IDs for data aggregation
        if (data?.migratedFrom) {
          teamIds.push(data.migratedFrom);
          userNameMap[data.migratedFrom] = data?.name || "Unknown";
        }
      });
    }

    if (teamIds.length === 0) {
      response.json({
        ok: true,
        items: [],
        counts: {sheets: 0, expenses: 0, total: 0},
      });
      return;
    }

    // Firestore "in" queries limited to 30 items, chunk if needed
    const chunks: string[][] = [];
    for (let i = 0; i < teamIds.length; i += 30) {
      chunks.push(teamIds.slice(i, i + 30));
    }

    // Parallelize all queries for sheets and expenses (major perf fix)
    const sheetsPromises = chunks.map((chunk) =>
      db
        .collection("sheetsSales")
        .where("userId", "in", chunk)
        .where("verified", "==", false)
        .orderBy("date", "desc")
        .get()
    );

    const expensesPromises = chunks.map((chunk) =>
      db
        .collection("expenses")
        .where("userId", "in", chunk)
        .where("status", "==", "pending")
        .orderBy("date", "desc")
        .get()
    );

    // Execute ALL queries in parallel
    const [sheetsSnapshots, expensesSnapshots] = await Promise.all([
      Promise.all(sheetsPromises),
      Promise.all(expensesPromises),
    ]);

    const pendingItems: PendingItem[] = [];

    // Process sheets results
    sheetsSnapshots.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        // Skip if already rejected
        if (data.rejectedAt) return;

        pendingItems.push({
          id: doc.id,
          type: "sheets",
          userId: data.userId,
          userName: userNameMap[data.userId] || "Unknown",
          date: data.date,
          catalog: data.catalog,
          sheetsCount: data.sheetsCount,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });
    });

    // Process expenses results
    expensesSnapshots.forEach((snapshot) => {
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        // Get first item's details (expense is now single-item)
        const firstItem = data.items?.[0];

        pendingItems.push({
          id: doc.id,
          type: "expense",
          userId: data.userId,
          userName: userNameMap[data.userId] || "Unknown",
          date: data.date,
          amount: data.totalAmount || firstItem?.amount,
          category: firstItem?.category,
          description: firstItem?.description,
          receiptPhotos: data.receiptPhotos,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });
    });

    // Sort by date descending (newest first)
    pendingItems.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    // Calculate counts
    const sheetsCount = pendingItems.filter((i) => i.type === "sheets").length;
    const expensesCount = pendingItems.filter((i) => i.type === "expense").length;

    response.json({
      ok: true,
      items: pendingItems,
      counts: {
        sheets: sheetsCount,
        expenses: expensesCount,
        total: pendingItems.length,
      },
    });
  } catch (error: any) {
    logger.error("getPendingItems error:", error);
    const apiError: ApiError = {
      ok: false,
      error: error.message || "Internal server error",
      code: "INTERNAL_ERROR",
    };
    response.status(500).json(apiError);
  }
});

// ============================================================================
// APPROVE ITEM
// ============================================================================

export const approveItem = onRequest({cors: true}, async (request, response) => {
  try {
    // Auth check
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const managerId = auth.uid;
    const {itemId, type} = request.body;

    // Validate input
    if (!itemId || !type) {
      const error: ApiError = {
        ok: false,
        error: "itemId and type are required",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    // Get manager role
    const managerDoc = await db.collection("users").doc(managerId).get();
    if (!managerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Manager not found",
        code: "USER_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const role = managerDoc.data()?.role as UserRole;
    if (!isManagerRole(role)) {
      const error: ApiError = {
        ok: false,
        error: "Only managers can approve items",
        code: "PERMISSION_DENIED",
      };
      response.status(403).json(error);
      return;
    }

    const now = Timestamp.now();

    if (type === "sheets") {
      // Update sheet sale
      const sheetRef = db.collection("sheetsSales").doc(itemId);
      const sheetDoc = await sheetRef.get();

      if (!sheetDoc.exists) {
        const error: ApiError = {
          ok: false,
          error: "Sheet sale not found",
          code: "NOT_FOUND",
        };
        response.status(404).json(error);
        return;
      }

      await sheetRef.update({
        verified: true,
        verifiedBy: managerId,
        verifiedAt: now,
      });

      response.json({ok: true, message: "Sheet sale approved"});
    } else if (type === "expense") {
      // Update expense
      const expenseRef = db.collection("expenses").doc(itemId);
      const expenseDoc = await expenseRef.get();

      if (!expenseDoc.exists) {
        const error: ApiError = {
          ok: false,
          error: "Expense not found",
          code: "NOT_FOUND",
        };
        response.status(404).json(error);
        return;
      }

      await expenseRef.update({
        status: "approved",
        reviewedBy: managerId,
        reviewedAt: now,
      });

      response.json({ok: true, message: "Expense approved"});
    } else {
      const error: ApiError = {
        ok: false,
        error: "Invalid type. Must be 'sheets' or 'expense'",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
    }
  } catch (error: any) {
    logger.error("approveItem error:", error);
    const apiError: ApiError = {
      ok: false,
      error: error.message || "Internal server error",
      code: "INTERNAL_ERROR",
    };
    response.status(500).json(apiError);
  }
});

// ============================================================================
// REJECT ITEM
// ============================================================================

export const rejectItem = onRequest({cors: true}, async (request, response) => {
  try {
    // Auth check
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const managerId = auth.uid;
    const {itemId, type, comment} = request.body;

    // Validate input
    if (!itemId || !type) {
      const error: ApiError = {
        ok: false,
        error: "itemId and type are required",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    // Get manager role
    const managerDoc = await db.collection("users").doc(managerId).get();
    if (!managerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Manager not found",
        code: "USER_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const role = managerDoc.data()?.role as UserRole;
    if (!isManagerRole(role)) {
      const error: ApiError = {
        ok: false,
        error: "Only managers can reject items",
        code: "PERMISSION_DENIED",
      };
      response.status(403).json(error);
      return;
    }

    const now = Timestamp.now();

    if (type === "sheets") {
      // Update sheet sale with rejection
      const sheetRef = db.collection("sheetsSales").doc(itemId);
      const sheetDoc = await sheetRef.get();

      if (!sheetDoc.exists) {
        const error: ApiError = {
          ok: false,
          error: "Sheet sale not found",
          code: "NOT_FOUND",
        };
        response.status(404).json(error);
        return;
      }

      await sheetRef.update({
        verified: false,
        rejectedBy: managerId,
        rejectedAt: now,
        rejectionComment: comment || null,
      });

      response.json({ok: true, message: "Sheet sale rejected"});
    } else if (type === "expense") {
      // Update expense
      const expenseRef = db.collection("expenses").doc(itemId);
      const expenseDoc = await expenseRef.get();

      if (!expenseDoc.exists) {
        const error: ApiError = {
          ok: false,
          error: "Expense not found",
          code: "NOT_FOUND",
        };
        response.status(404).json(error);
        return;
      }

      await expenseRef.update({
        status: "rejected",
        reviewedBy: managerId,
        reviewedAt: now,
        managerComments: comment || null,
      });

      response.json({ok: true, message: "Expense rejected"});
    } else {
      const error: ApiError = {
        ok: false,
        error: "Invalid type. Must be 'sheets' or 'expense'",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
    }
  } catch (error: any) {
    logger.error("rejectItem error:", error);
    const apiError: ApiError = {
      ok: false,
      error: error.message || "Internal server error",
      code: "INTERNAL_ERROR",
    };
    response.status(500).json(apiError);
  }
});
