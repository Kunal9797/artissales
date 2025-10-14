/**
 * Targets API - Monthly Sales Targets Management
 *
 * Endpoints:
 * - setTarget: Create/update monthly targets for a rep
 * - getTarget: Get target + progress for a specific user+month
 * - getUserTargets: Get all team targets for a month (managers only)
 * - stopAutoRenew: Turn off auto-renew for a user's target
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {
  SetTargetRequest,
  SetTargetResponse,
  GetTargetRequest,
  GetTargetResponse,
  GetUserTargetsRequest,
  GetUserTargetsResponse,
  StopAutoRenewRequest,
  StopAutoRenewResponse,
  Target,
  TargetProgress,
  VisitProgress,
  UserTargetSummary,
  CatalogType,
  ApiError,
} from "../types";
import {requireAuth} from "../utils/auth";

const db = getFirestore();

// Helper: Validate YYYY-MM format
function isValidMonthFormat(month: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
  return regex.test(month);
}

// Helper: Calculate progress for a user+month
async function calculateProgress(
  userId: string,
  month: string,
  targetsByCatalog: {[key: string]: number | undefined}
): Promise<TargetProgress[]> {
  const progress: TargetProgress[] = [];

  // Get start and end dates for the month
  const [year, monthNum] = month.split("-");
  const startDate = `${year}-${monthNum}-01`;
  const endDateObj = new Date(parseInt(year), parseInt(monthNum), 0); // Last day of month
  const endDate = endDateObj.toISOString().split("T")[0];

  // Query sheetsSales for this user in this month
  const salesSnapshot = await db
    .collection("sheetsSales")
    .where("userId", "==", userId)
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .get();

  // Aggregate sales by catalog
  const achievedByCatalog: Record<string, number> = {
    "Fine Decor": 0,
    "Artvio": 0,
    "Woodrica": 0,
    "Artis": 0,
  };

  salesSnapshot.forEach((doc) => {
    const sale = doc.data();
    if (achievedByCatalog[sale.catalog] !== undefined) {
      achievedByCatalog[sale.catalog] += sale.sheetsCount || 0;
    }
  });

  // Build progress array for catalogs that have targets
  const catalogs: CatalogType[] = ["Fine Decor", "Artvio", "Woodrica", "Artis"];
  catalogs.forEach((catalog) => {
    if (targetsByCatalog[catalog] !== undefined && targetsByCatalog[catalog]! > 0) {
      const target = targetsByCatalog[catalog]!;
      const achieved = achievedByCatalog[catalog] || 0;
      const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;

      progress.push({
        catalog,
        target,
        achieved,
        percentage,
      });
    }
  });

  return progress;
}

// Calculate visit progress
async function calculateVisitProgress(
  userId: string,
  month: string,
  targetsByAccountType: {[key: string]: number | undefined}
): Promise<VisitProgress[]> {
  const progress: VisitProgress[] = [];

  // Get start and end dates for the month
  const [year, monthNum] = month.split("-");
  const startOfMonth = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  const endOfMonth = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

  // Query visits for this user in this month
  const visitsSnapshot = await db
    .collection("visits")
    .where("userId", "==", userId)
    .where("timestamp", ">=", Timestamp.fromDate(startOfMonth))
    .where("timestamp", "<=", Timestamp.fromDate(endOfMonth))
    .get();

  // Count visits by account type (count ALL purposes)
  const achievedByType: Record<string, number> = {
    "dealer": 0,
    "architect": 0,
    "contractor": 0,
  };

  visitsSnapshot.forEach((doc) => {
    const visit = doc.data();
    const accountType = visit.accountType;
    if (achievedByType[accountType] !== undefined) {
      achievedByType[accountType]++;
    }
  });

  // Build progress array for account types that have targets
  const accountTypes: Array<"dealer" | "architect" | "contractor"> = ["dealer", "architect", "contractor"];
  accountTypes.forEach((type) => {
    if (targetsByAccountType[type] !== undefined && targetsByAccountType[type]! > 0) {
      const target = targetsByAccountType[type]!;
      const achieved = achievedByType[type] || 0;
      const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;

      progress.push({
        accountType: type,
        target,
        achieved,
        percentage,
      });
    }
  });

  return progress;
}

// ============================================================================
// SET TARGET
// ============================================================================
export const setTarget = onRequest(async (request, response) => {
  try {
    // 1. Auth check
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const callerId = auth.uid;

    // 2. Check if caller is a manager
    const callerDoc = await db.collection("users").doc(callerId).get();
    if (!callerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Caller user not found",
        code: "CALLER_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const caller = callerDoc.data();
    const isManager = ["area_manager", "zonal_head", "national_head", "admin"].includes(
      caller?.role
    );

    if (!isManager) {
      const error: ApiError = {
        ok: false,
        error: "Only managers can set targets",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 3. Validate request
    const {userId, month, targetsByCatalog, targetsByAccountType, autoRenew, updateFutureMonths} = request.body as SetTargetRequest;

    if (!userId || !month || !targetsByCatalog) {
      const error: ApiError = {
        ok: false,
        error: "Missing required fields: userId, month, targetsByCatalog",
        code: "INVALID_REQUEST",
      };
      response.status(400).json(error);
      return;
    }

    if (!isValidMonthFormat(month)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid month format. Use YYYY-MM",
        code: "INVALID_MONTH_FORMAT",
      };
      response.status(400).json(error);
      return;
    }

    // Check if user exists
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Target user not found",
        code: "USER_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    // Validate sheet sales target values (must be > 0)
    const catalogKeys = Object.keys(targetsByCatalog) as CatalogType[];
    for (const catalog of catalogKeys) {
      const value = targetsByCatalog[catalog];
      if (value !== undefined && (value <= 0 || !Number.isFinite(value))) {
        const error: ApiError = {
          ok: false,
          error: `Invalid target value for ${catalog}. Must be > 0`,
          code: "INVALID_TARGET_VALUE",
        };
        response.status(400).json(error);
        return;
      }
    }

    // Validate visit target values (must be > 0)
    if (targetsByAccountType) {
      const accountTypes = Object.keys(targetsByAccountType) as Array<keyof typeof targetsByAccountType>;
      for (const type of accountTypes) {
        const value = targetsByAccountType[type];
        if (value !== undefined && (value <= 0 || !Number.isFinite(value))) {
          const error: ApiError = {
            ok: false,
            error: `Invalid target value for ${type}. Must be > 0`,
            code: "INVALID_TARGET_VALUE",
          };
          response.status(400).json(error);
          return;
        }
      }
    }

    // Validate: at least ONE target (sheets OR visits) must be set
    const hasSheetTarget = catalogKeys.some(k => targetsByCatalog[k] !== undefined && targetsByCatalog[k]! > 0);
    const hasVisitTarget = targetsByAccountType && Object.values(targetsByAccountType).some(v => v !== undefined && v > 0);

    if (!hasSheetTarget && !hasVisitTarget) {
      const error: ApiError = {
        ok: false,
        error: "At least one target (sheets or visits) must be set",
        code: "NO_TARGETS_SET",
      };
      response.status(400).json(error);
      return;
    }

    // 4. Create or update target
    const targetId = `${userId}_${month}`;
    const targetRef = db.collection("targets").doc(targetId);
    const existingTarget = await targetRef.get();

    const targetData: Partial<Target> = {
      id: targetId,
      userId,
      month,
      targetsByCatalog,
      autoRenew: autoRenew ?? false,
      createdBy: callerId,
      createdByName: caller?.name || "Manager",
      updatedAt: FieldValue.serverTimestamp() as Timestamp,
    };

    // Only include targetsByAccountType if it has values
    if (targetsByAccountType && Object.keys(targetsByAccountType).length > 0) {
      targetData.targetsByAccountType = targetsByAccountType;
    }

    if (existingTarget.exists) {
      // Update existing target
      await targetRef.update(targetData);

      // If updateFutureMonths is true, update all future auto-renewed targets
      if (updateFutureMonths) {
        const [year, monthNum] = month.split("-").map(Number);
        const currentDate = new Date(year, monthNum - 1, 1);
        const futureMonths: string[] = [];

        // Find all future months with auto-renewed targets (up to 12 months)
        for (let i = 1; i <= 12; i++) {
          const futureDate = new Date(currentDate);
          futureDate.setMonth(futureDate.getMonth() + i);
          const futureMonth = `${futureDate.getFullYear()}-${String(
            futureDate.getMonth() + 1
          ).padStart(2, "0")}`;
          futureMonths.push(futureMonth);
        }

        // Update all future targets
        const batch = db.batch();
        for (const futureMonth of futureMonths) {
          const futureTargetId = `${userId}_${futureMonth}`;
          const futureTargetRef = db.collection("targets").doc(futureTargetId);
          const futureTargetDoc = await futureTargetRef.get();

          if (futureTargetDoc.exists && futureTargetDoc.data()?.sourceTargetId === targetId) {
            batch.update(futureTargetRef, {
              targetsByCatalog,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }
        }
        await batch.commit();
      }
    } else {
      // Create new target
      targetData.createdAt = FieldValue.serverTimestamp() as Timestamp;
      await targetRef.set(targetData);
    }

    const successResponse: SetTargetResponse = {
      ok: true,
      targetId,
      message: existingTarget.exists ? "Target updated successfully" : "Target created successfully",
    };
    response.status(200).json(successResponse);
  } catch (error: any) {
    logger.error("[setTarget] Error:", error);
    const errorResponse: ApiError = {
      ok: false,
      error: error.message || "Failed to set target",
      code: "INTERNAL_ERROR",
      details: error,
    };
    response.status(500).json(errorResponse);
  }
});

// ============================================================================
// GET TARGET
// ============================================================================
export const getTarget = onRequest(async (request, response) => {
  try {
    // 1. Auth check
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const callerId = auth.uid;

    // 2. Validate request
    const {userId, month} = request.body as GetTargetRequest;

    if (!userId || !month) {
      const error: ApiError = {
        ok: false,
        error: "Missing required fields: userId, month",
        code: "INVALID_REQUEST",
      };
      response.status(400).json(error);
      return;
    }

    if (!isValidMonthFormat(month)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid month format. Use YYYY-MM",
        code: "INVALID_MONTH_FORMAT",
      };
      response.status(400).json(error);
      return;
    }

    // 3. Check permissions: can only view own target unless manager
    const callerDoc = await db.collection("users").doc(callerId).get();
    if (!callerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Caller user not found",
        code: "CALLER_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const caller = callerDoc.data();
    const isManager = ["area_manager", "zonal_head", "national_head", "admin"].includes(
      caller?.role
    );

    if (userId !== callerId && !isManager) {
      const error: ApiError = {
        ok: false,
        error: "You can only view your own targets",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 4. Get target
    const targetId = `${userId}_${month}`;
    const targetDoc = await db.collection("targets").doc(targetId).get();

    if (!targetDoc.exists) {
      const successResponse: GetTargetResponse = {
        ok: true,
        target: null,
      };
      response.status(200).json(successResponse);
      return;
    }

    const target = targetDoc.data() as Target;

    logger.info("[getTarget] Target found:", {
      id: target.id,
      userId: target.userId,
      month: target.month,
      hasCatalogTargets: !!target.targetsByCatalog,
      hasVisitTargets: !!target.targetsByAccountType,
      targetsByAccountType: target.targetsByAccountType,
    });

    // 5. Calculate progress for sheet sales
    const progress = await calculateProgress(userId, month, target.targetsByCatalog as {[key: string]: number | undefined});

    // 6. Calculate visit progress (if visit targets exist)
    let visitProgress: VisitProgress[] | undefined;
    if (target.targetsByAccountType) {
      logger.info("[getTarget] Calculating visit progress for:", target.targetsByAccountType);
      visitProgress = await calculateVisitProgress(userId, month, target.targetsByAccountType as {[key: string]: number | undefined});
      logger.info("[getTarget] Visit progress calculated:", visitProgress);
    } else {
      logger.info("[getTarget] No targetsByAccountType found, skipping visit progress");
    }

    const successResponse: GetTargetResponse = {
      ok: true,
      target,
      progress,
      visitProgress,
    };

    logger.info("[getTarget] Sending response with visitProgress:", !!visitProgress);
    response.status(200).json(successResponse);
  } catch (error: any) {
    logger.error("[getTarget] Error:", error);
    const errorResponse: ApiError = {
      ok: false,
      error: error.message || "Failed to get target",
      code: "INTERNAL_ERROR",
      details: error,
    };
    response.status(500).json(errorResponse);
  }
});

// ============================================================================
// GET USER TARGETS (Manager view - all team members)
// ============================================================================
export const getUserTargets = onRequest(async (request, response) => {
  try {
    // 1. Auth check
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const callerId = auth.uid;

    // 2. Check if caller is a manager
    const callerDoc = await db.collection("users").doc(callerId).get();
    if (!callerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Caller user not found",
        code: "CALLER_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const caller = callerDoc.data();
    const isManager = ["area_manager", "zonal_head", "national_head", "admin"].includes(
      caller?.role
    );

    if (!isManager) {
      const error: ApiError = {
        ok: false,
        error: "Only managers can view team targets",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 3. Validate request
    const {month} = request.body as GetUserTargetsRequest;

    if (!month) {
      const error: ApiError = {
        ok: false,
        error: "Missing required field: month",
        code: "INVALID_REQUEST",
      };
      response.status(400).json(error);
      return;
    }

    if (!isValidMonthFormat(month)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid month format. Use YYYY-MM",
        code: "INVALID_MONTH_FORMAT",
      };
      response.status(400).json(error);
      return;
    }

    // 4. Get all users (reps)
    const usersSnapshot = await db
      .collection("users")
      .where("role", "==", "rep")
      .where("isActive", "==", true)
      .get();

    // 5. Get targets for each user
    const targetSummaries: UserTargetSummary[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const userId = userDoc.id;

      // Get target for this user+month
      const targetId = `${userId}_${month}`;
      const targetDoc = await db.collection("targets").doc(targetId).get();

      let target: Target | null = null;
      let progress: TargetProgress[] = [];
      let totalTarget = 0;
      let totalAchieved = 0;
      let overallPercentage = 0;

      if (targetDoc.exists) {
        target = targetDoc.data() as Target;
        progress = await calculateProgress(userId, month, target.targetsByCatalog as {[key: string]: number | undefined});

        // Calculate totals
        progress.forEach((p) => {
          totalTarget += p.target;
          totalAchieved += p.achieved;
        });

        overallPercentage = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
      }

      targetSummaries.push({
        userId,
        userName: user.name || "Unknown",
        territory: user.territory || "N/A",
        target,
        progress,
        totalAchieved,
        totalTarget,
        overallPercentage,
      });
    }

    // Sort by overall percentage (lowest first, to highlight who needs help)
    targetSummaries.sort((a, b) => {
      if (a.target && !b.target) return -1; // Has target comes first
      if (!a.target && b.target) return 1;
      return a.overallPercentage - b.overallPercentage;
    });

    const successResponse: GetUserTargetsResponse = {
      ok: true,
      targets: targetSummaries,
    };
    response.status(200).json(successResponse);
  } catch (error: any) {
    logger.error("[getUserTargets] Error:", error);
    const errorResponse: ApiError = {
      ok: false,
      error: error.message || "Failed to get user targets",
      code: "INTERNAL_ERROR",
      details: error,
    };
    response.status(500).json(errorResponse);
  }
});

// ============================================================================
// STOP AUTO RENEW
// ============================================================================
export const stopAutoRenew = onRequest(async (request, response) => {
  try {
    // 1. Auth check
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const callerId = auth.uid;

    // 2. Check if caller is a manager
    const callerDoc = await db.collection("users").doc(callerId).get();
    if (!callerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Caller user not found",
        code: "CALLER_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const caller = callerDoc.data();
    const isManager = ["area_manager", "zonal_head", "national_head", "admin"].includes(
      caller?.role
    );

    if (!isManager) {
      const error: ApiError = {
        ok: false,
        error: "Only managers can stop auto-renew",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 3. Validate request
    const {userId, month} = request.body as StopAutoRenewRequest;

    if (!userId || !month) {
      const error: ApiError = {
        ok: false,
        error: "Missing required fields: userId, month",
        code: "INVALID_REQUEST",
      };
      response.status(400).json(error);
      return;
    }

    if (!isValidMonthFormat(month)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid month format. Use YYYY-MM",
        code: "INVALID_MONTH_FORMAT",
      };
      response.status(400).json(error);
      return;
    }

    // 4. Update target to turn off auto-renew
    const targetId = `${userId}_${month}`;
    const targetRef = db.collection("targets").doc(targetId);
    const targetDoc = await targetRef.get();

    if (!targetDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Target not found",
        code: "TARGET_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    await targetRef.update({
      autoRenew: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const successResponse: StopAutoRenewResponse = {
      ok: true,
      message: "Auto-renew stopped successfully",
    };
    response.status(200).json(successResponse);
  } catch (error: any) {
    logger.error("[stopAutoRenew] Error:", error);
    const errorResponse: ApiError = {
      ok: false,
      error: error.message || "Failed to stop auto-renew",
      code: "INTERNAL_ERROR",
      details: error,
    };
    response.status(500).json(errorResponse);
  }
});
