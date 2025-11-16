/**
 * User Management API
 * Handles user creation and management by managers
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
} from "../utils/validation";
import {requireAuth} from "../utils/auth";
import {UserRole, ApiError} from "../types";
import {setUserRoleClaim} from "../utils/customClaims";

const db = getFirestore();

/**
 * Create User By Manager
 * Allows National Head/Admin to create new user accounts
 *
 * POST /createUserByManager
 * Body: {
 *   phone: string,      // 10-digit Indian mobile
 *   name: string,       // User's full name
 *   role: UserRole,     // rep | zonal_head | national_head | admin
 *   territory: string   // City name
 * }
 */
export const createUserByManager = onRequest(async (request, response) => {
  try {
    // 1. Verify authentication and authorization
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const managerId = auth.uid;

    // Get manager's role
    const managerDoc = await db.collection("users").doc(managerId).get();
    if (!managerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found in system",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const managerRole = managerDoc.data()?.role;
    if (managerRole !== "national_head" && managerRole !== "admin") {
      logger.error("[createUserByManager] Insufficient permissions:",
        managerRole);
      const error: ApiError = {
        ok: false,
        error: "Only National Head or Admin can create users",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Validate request body
    const {phone, name, role, territory, primaryDistributorId} = request.body;

    // Validate phone
    if (!phone || typeof phone !== "string") {
      const error: ApiError = {
        ok: false,
        error: "Phone number is required",
        code: "PHONE_REQUIRED",
      };
      response.status(400).json(error);
      return;
    }

    if (!isValidPhoneNumber(phone)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid phone number format. Expected 10-digit Indian number",
        code: "INVALID_PHONE",
      };
      response.status(400).json(error);
      return;
    }

    // Normalize phone to E.164 format
    const normalizedPhone = normalizePhoneNumber(phone);

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      const error: ApiError = {
        ok: false,
        error: "Name is required (minimum 2 characters)",
        code: "INVALID_NAME",
      };
      response.status(400).json(error);
      return;
    }

    if (name.trim().length > 100) {
      const error: ApiError = {
        ok: false,
        error: "Name is too long (maximum 100 characters)",
        code: "NAME_TOO_LONG",
      };
      response.status(400).json(error);
      return;
    }

    // Validate role
    const validRoles: UserRole[] = [
      "rep",
      "area_manager",
      "zonal_head",
      "national_head",
      "admin",
    ];
    if (!role || !validRoles.includes(role)) {
      const error: ApiError = {
        ok: false,
        error: `Invalid role. Must be one of: ${validRoles.join(", ")}`,
        code: "INVALID_ROLE",
      };
      response.status(400).json(error);
      return;
    }

    // Validate territory
    if (!territory || typeof territory !== "string" ||
      territory.trim().length < 2) {
      const error: ApiError = {
        ok: false,
        error: "Territory is required (minimum 2 characters)",
        code: "INVALID_TERRITORY",
      };
      response.status(400).json(error);
      return;
    }

    // 3. Validate distributor if provided
    if (primaryDistributorId) {
      const distributorDoc = await db.collection("accounts")
        .doc(primaryDistributorId)
        .get();

      if (!distributorDoc.exists ||
          distributorDoc.data()?.type !== "distributor") {
        const error: ApiError = {
          ok: false,
          error: "Invalid distributor ID",
          code: "INVALID_DISTRIBUTOR",
        };
        response.status(400).json(error);
        return;
      }
    }

    // 4. Check for duplicate phone number & create user atomically using transaction
    // This prevents race conditions where two requests create the same user simultaneously
    let userId: string;

    try {
      userId = await db.runTransaction(async (transaction) => {
        // Check for existing user with this phone number
        const existingUsersQuery = await transaction.get(
          db.collection("users").where("phone", "==", normalizedPhone).limit(1)
        );

        if (!existingUsersQuery.empty) {
          throw new Error("DUPLICATE_PHONE");
        }

        // Create new user document
        const newUserRef = db.collection("users").doc();
        const newUserId = newUserRef.id;

        const newUser: any = {
          id: newUserId,
          phone: normalizedPhone,
          name: name.trim(),
          email: "", // Empty, can be updated later via profile
          role: role,
          isActive: true,
          territory: territory.trim(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        // Only add primaryDistributorId if it's provided (Firestore doesn't accept undefined)
        if (primaryDistributorId) {
          newUser.primaryDistributorId = primaryDistributorId;
        }

        transaction.set(newUserRef, newUser);
        return newUserId;
      });
    } catch (transactionError: any) {
      if (transactionError.message === "DUPLICATE_PHONE") {
        const error: ApiError = {
          ok: false,
          error: "A user with this phone number already exists",
          code: "DUPLICATE_PHONE",
        };
        response.status(409).json(error);
        return;
      }
      throw transactionError; // Re-throw other errors to be caught by outer catch
    }

    // Set custom claims for JWT (improves RLS performance - P0 fix)
    try {
      await setUserRoleClaim(userId, role);
      logger.info("[createUserByManager] Custom claims set", {userId, role});
    } catch (claimsError) {
      logger.error("[createUserByManager] Failed to set custom claims", {userId, claimsError});
      // Don't fail the request - claims can be set later via migration
    }

    logger.info("[createUserByManager] ✅ User created successfully:",
      userId, normalizedPhone, role, primaryDistributorId);

    // 6. Return success
    response.status(200).json({
      ok: true,
      userId: userId,
      message: "User created successfully",
    });
  } catch (error: any) {
    logger.error("[createUserByManager] ❌ Error:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });
    const apiError: ApiError = {
      ok: false,
      error: error.message || "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message || "Unknown error occurred",
    };
    response.status(500).json(apiError);
  }
});

/**
 * Get Users List
 * Returns list of all users with optional filters
 *
 * POST /getUsersList
 * Body: {
 *   role?: UserRole,      // Filter by role
 *   territory?: string,   // Filter by territory
 *   searchTerm?: string   // Search by name/phone
 * }
 */
export const getUsersList = onRequest({cors: true}, async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const managerId = auth.uid;

    // Get manager's role
    const managerDoc = await db.collection("users").doc(managerId).get();
    if (!managerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found in system",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const managerRole = managerDoc.data()?.role;
    if (managerRole !== "national_head" && managerRole !== "admin") {
      const error: ApiError = {
        ok: false,
        error: "Only National Head or Admin can view users list",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Parse filters
    const {role, territory, searchTerm} = request.body;

    // Build query
    let query = db.collection("users").where("isActive", "==", true);

    if (role) {
      query = query.where("role", "==", role);
    }

    if (territory) {
      query = query.where("territory", "==", territory);
    }

    const usersSnapshot = await query.get();

    // Get all users and filter by search term if provided
    let users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        role: data.role || "rep",
        territory: data.territory || "",
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate().toISOString() || "",
      };
    });

    // Client-side search filter (since Firestore doesn't support full-text search)
    if (searchTerm && searchTerm.trim().length > 0) {
      const term = searchTerm.toLowerCase().trim();
      users = users.filter((user) =>
        user.name.toLowerCase().includes(term) ||
        user.phone.includes(term)
      );
    }

    // Deduplicate by phone number (keep first occurrence)
    const seenPhones = new Set<string>();
    users = users.filter((user) => {
      if (!user.phone || seenPhones.has(user.phone)) {
        if (user.phone) {
          logger.warn(`[getUsersList] Skipping duplicate user with phone ${user.phone}: ${user.name} (${user.id})`);
        }
        return false;
      }
      seenPhones.add(user.phone);
      return true;
    });

    // Sort by name
    users.sort((a, b) => a.name.localeCompare(b.name));

    logger.info(`[getUsersList] Returning ${users.length} users`);

    response.status(200).json({
      ok: true,
      users,
      count: users.length,
    });
  } catch (error: any) {
    logger.error("[getUsersList] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});

/**
 * Get User Stats
 * Returns detailed stats for a specific user
 *
 * POST /getUserStats
 * Body: {
 *   userId: string,
 *   startDate: string,  // YYYY-MM-DD
 *   endDate: string     // YYYY-MM-DD
 * }
 */
export const getUserStats = onRequest(async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const managerId = auth.uid;

    // Get manager's role
    const managerDoc = await db.collection("users").doc(managerId).get();
    if (!managerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found in system",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Parse parameters
    const {userId, startDate, endDate} = request.body;

    // Allow users to view their own stats, or require National Head/Admin for others
    const managerRole = managerDoc.data()?.role;
    const isViewingSelf = auth.uid === userId;

    if (!isViewingSelf && managerRole !== "national_head" && managerRole !== "admin") {
      const error: ApiError = {
        ok: false,
        error: "Only National Head or Admin can view other users' stats",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    if (!userId) {
      const error: ApiError = {
        ok: false,
        error: "User ID is required",
        code: "USER_ID_REQUIRED",
      };
      response.status(400).json(error);
      return;
    }

    // Get user info
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

    // Date range for queries
    const start = new Date(startDate + "T00:00:00Z");
    const end = new Date(endDate + "T23:59:59Z");

    // 3-6. Run all queries in parallel for better performance
    const [attendanceSnap, visitsSnap, sheetsSnap, expensesSnap] =
      await Promise.all([
        db.collection("attendance")
          .where("userId", "==", userId)
          .where("timestamp", ">=", start)
          .where("timestamp", "<=", end)
          .orderBy("timestamp", "desc")
          .get(),
        db.collection("visits")
          .where("userId", "==", userId)
          .where("timestamp", ">=", start)
          .where("timestamp", "<=", end)
          .orderBy("timestamp", "desc")
          .get(),
        db.collection("sheetsSales")
          .where("userId", "==", userId)
          .where("date", ">=", startDate)
          .where("date", "<=", endDate)
          .get(),
        db.collection("expenses")
          .where("userId", "==", userId)
          .where("date", ">=", startDate)
          .where("date", "<=", endDate)
          .get(),
      ]);

    // Process attendance
    const attendance = attendanceSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        type: data.type,
        timestamp: data.timestamp?.toDate().toISOString(),
        geo: data.geo ?
          {lat: data.geo.latitude, lng: data.geo.longitude} : null,
      };
    });

    // Process visits
    const visits = visitsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        accountName: data.accountName,
        accountType: data.accountType,
        purpose: data.purpose,
        timestamp: data.timestamp?.toDate().toISOString(),
      };
    });

    // Count by type
    const visitsByType = {
      distributor: visits.filter((v) => v.accountType === "distributor").length,
      dealer: visits.filter((v) => v.accountType === "dealer").length,
      architect: visits.filter((v) => v.accountType === "architect").length,
      contractor: visits.filter((v) => v.accountType === "contractor").length,
    };

    // Process sheets sales
    let totalSheets = 0;
    const sheetsByCatalog: Record<string, number> = {
      "Fine Decor": 0,
      "Artvio": 0,
      "Woodrica": 0,
      "Artis 1MM": 0,
    };

    sheetsSnap.docs.forEach((doc) => {
      const data = doc.data();

      // Only count verified sheets (approved by manager)
      if (data.verified !== true) {
        return;
      }

      totalSheets += data.sheetsCount || 0;
      if (sheetsByCatalog[data.catalog] !== undefined) {
        sheetsByCatalog[data.catalog] += data.sheetsCount || 0;
      }
    });

    // Process expenses (already fetched above)

    let totalExpenses = 0;
    const expensesByStatus = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    const expensesByCategory = {
      travel: 0,
      food: 0,
      accommodation: 0,
      other: 0,
    };

    expensesSnap.docs.forEach((doc) => {
      const data = doc.data();

      // Only count approved expenses
      if (data.status !== "approved") {
        return;
      }

      // Handle both old format (amount/category fields) and new format (items array)
      if (data.items && Array.isArray(data.items)) {
        // New format: items array
        data.items.forEach((item: any) => {
          const amount = item.amount || 0;
          totalExpenses += amount;

          // Sum by category
          const category = item.category || "other";
          if (expensesByCategory[category as keyof typeof expensesByCategory] !==
            undefined) {
            expensesByCategory[category as keyof typeof expensesByCategory] += amount;
          }
        });

        // Count by status (one count per expense report, not per item)
        const status = data.status || "pending";
        if (expensesByStatus[status as keyof typeof expensesByStatus] !==
          undefined) {
          expensesByStatus[status as keyof typeof expensesByStatus]++;
        }
      } else {
        // Old format: single amount/category
        const amount = data.amount || 0;
        totalExpenses += amount;

        // Count by status
        const status = data.status || "pending";
        if (expensesByStatus[status as keyof typeof expensesByStatus] !==
          undefined) {
          expensesByStatus[status as keyof typeof expensesByStatus]++;
        }

        // Sum by category
        const category = data.category || "other";
        if (expensesByCategory[category as keyof typeof expensesByCategory] !==
          undefined) {
          expensesByCategory[category as keyof typeof expensesByCategory] += amount;
        }
      }
    });

    // 7. Return stats
    response.status(200).json({
      ok: true,
      user: {
        id: userId,
        name: userData?.name,
        role: userData?.role,
        territory: userData?.territory,
        phone: userData?.phone,
      },
      stats: {
        attendance: {
          total: attendance.length,
          records: attendance,
        },
        visits: {
          total: visits.length,
          byType: visitsByType,
          records: visits,
        },
        sheets: {
          total: totalSheets,
          byCatalog: sheetsByCatalog,
        },
        expenses: {
          total: totalExpenses,
          byStatus: expensesByStatus,
          byCategory: expensesByCategory,
        },
      },
    });
  } catch (error: any) {
    logger.error("[getUserStats] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});


/**
 * POST /updateUser
 * Update user details (phone, territory)
 * Only accessible by National Head or Admin
 */
export const updateUser = onRequest({invoker: "public"}, async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const managerId = auth.uid;

    // Get manager's role
    const managerDoc = await db.collection("users").doc(managerId).get();
    if (!managerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found in system",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const managerRole = managerDoc.data()?.role;
    if (managerRole !== "national_head" && managerRole !== "admin") {
      const error: ApiError = {
        ok: false,
        error: "Only National Head or Admin can update user details",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Parse parameters
    const {userId, phone, territory} = request.body;

    if (!userId) {
      const error: ApiError = {
        ok: false,
        error: "User ID is required",
        code: "USER_ID_REQUIRED",
      };
      response.status(400).json(error);
      return;
    }

    // Get user document
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    // 3. Build update object
    const updates: any = {
      updatedAt: Timestamp.now(),
    };

    if (phone !== undefined) {
      // Normalize phone number
      const normalizedPhone = phone.replace(/\D/g, "");
      if (normalizedPhone.length < 10) {
        const error: ApiError = {
          ok: false,
          error: "Invalid phone number (minimum 10 digits)",
          code: "INVALID_PHONE",
        };
        response.status(400).json(error);
        return;
      }

      // Check for duplicate phone (excluding current user)
      const existingUsers = await db.collection("users")
        .where("phone", "==", "+91" + normalizedPhone)
        .limit(1)
        .get();

      if (!existingUsers.empty && existingUsers.docs[0].id !== userId) {
        const error: ApiError = {
          ok: false,
          error: "A user with this phone number already exists",
          code: "DUPLICATE_PHONE",
        };
        response.status(409).json(error);
        return;
      }

      updates.phone = "+91" + normalizedPhone;
    }

    if (territory !== undefined && territory.trim()) {
      updates.territory = territory.trim();
    }

    // 4. Update user
    await userRef.update(updates);

    logger.info("[updateUser] ✅ User updated successfully:", userId);

    response.status(200).json({
      ok: true,
      message: "User updated successfully",
    });
  } catch (error: any) {
    logger.error("[updateUser] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});
