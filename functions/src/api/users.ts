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
import {isManagerRole} from "../utils/team";

const db = getFirestore();

/**
 * Create User By Manager
 * Allows Admin, National Head, or Area Manager to create new user accounts
 *
 * POST /createUserByManager
 * Body: {
 *   phone: string,           // 10-digit Indian mobile
 *   name: string,            // User's full name
 *   role: UserRole,          // rep | area_manager | zonal_head | national_head | admin
 *   territory: string,       // City name
 *   reportsToUserId?: string // Manager to assign (Admin only - NH/AM auto-assign to self)
 * }
 *
 * Permission rules:
 * - Admin: Can create any role, can assign to any manager
 * - National Head: Can create rep/area_manager/zonal_head, auto-assigns reps to self
 * - Area Manager: Can only create rep, auto-assigns to self
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

    // Check if caller has permission to create users
    const canCreateUsers = ["admin", "national_head", "area_manager"].includes(managerRole);
    if (!canCreateUsers) {
      logger.error("[createUserByManager] Insufficient permissions:", managerRole);
      const error: ApiError = {
        ok: false,
        error: "Only Admin, National Head, or Area Manager can create users",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Validate request body
    const {phone, name, role, territory, primaryDistributorId, reportsToUserId} = request.body;

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

    // Check role-based creation permissions
    // Admin can create any role
    // National Head can create rep, area_manager, zonal_head (not admin or national_head)
    // Area Manager can only create rep
    if (managerRole === "national_head") {
      if (role === "admin" || role === "national_head") {
        const error: ApiError = {
          ok: false,
          error: "National Head cannot create Admin or National Head users",
          code: "ROLE_NOT_ALLOWED",
        };
        response.status(403).json(error);
        return;
      }
    } else if (managerRole === "area_manager") {
      if (role !== "rep") {
        const error: ApiError = {
          ok: false,
          error: "Area Manager can only create Sales Rep users",
          code: "ROLE_NOT_ALLOWED",
        };
        response.status(403).json(error);
        return;
      }
    }

    // Determine reportsToUserId based on caller's role
    // - Admin: can specify any manager, or leave blank
    // - National Head / Area Manager: auto-assign to themselves
    let finalReportsToUserId: string | null = null;

    if (role === "rep") {
      // Reps MUST have a manager
      if (managerRole === "admin") {
        // Admin can specify reportsToUserId
        if (reportsToUserId) {
          // Validate the specified manager exists and is a manager role
          const targetManagerDoc = await db.collection("users").doc(reportsToUserId).get();
          if (!targetManagerDoc.exists) {
            const error: ApiError = {
              ok: false,
              error: "Specified manager not found",
              code: "INVALID_MANAGER",
            };
            response.status(400).json(error);
            return;
          }
          const targetManagerRole = targetManagerDoc.data()?.role;
          if (!isManagerRole(targetManagerRole)) {
            const error: ApiError = {
              ok: false,
              error: "reportsToUserId must reference a manager (area_manager, zonal_head, national_head, or admin)",
              code: "INVALID_MANAGER_ROLE",
            };
            response.status(400).json(error);
            return;
          }
          finalReportsToUserId = reportsToUserId;
        } else {
          // Admin didn't specify - they must provide a manager for reps
          const error: ApiError = {
            ok: false,
            error: "reportsToUserId is required when creating a rep",
            code: "MANAGER_REQUIRED",
          };
          response.status(400).json(error);
          return;
        }
      } else {
        // National Head or Area Manager - auto-assign to themselves
        finalReportsToUserId = managerId;
        logger.info(`[createUserByManager] Auto-assigning rep to manager: ${managerId}`);
      }
    }
    // For non-rep roles (area_manager, zonal_head, etc.), reportsToUserId is not required

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

        // Add reportsToUserId if set (for reps)
        if (finalReportsToUserId) {
          newUser.reportsToUserId = finalReportsToUserId;
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

    logger.info("[createUserByManager] ✅ User created successfully:", {
      userId,
      phone: normalizedPhone,
      role,
      reportsToUserId: finalReportsToUserId,
      primaryDistributorId,
    });

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
 * Returns list of users with optional filters
 * Results are filtered based on caller's role:
 * - Admin: sees all users
 * - National Head / Area Manager: sees only their direct reports
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

    // Check if caller has permission to view users list
    const canViewUsers = ["admin", "national_head", "area_manager"].includes(managerRole);
    if (!canViewUsers) {
      const error: ApiError = {
        ok: false,
        error: "Only Admin, National Head, or Area Manager can view users list",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Parse filters
    const {role, territory, searchTerm} = request.body;

    // 3. Build query based on caller's role
    let usersSnapshot;

    if (managerRole === "admin") {
      // Admin sees all users
      let query = db.collection("users").where("isActive", "==", true);
      if (role) {
        query = query.where("role", "==", role);
      }
      if (territory) {
        query = query.where("territory", "==", territory);
      }
      usersSnapshot = await query.get();
    } else {
      // National Head / Area Manager - see only direct reports
      let query = db.collection("users")
        .where("reportsToUserId", "==", managerId)
        .where("isActive", "==", true);

      if (role) {
        query = query.where("role", "==", role);
      }
      // Note: Can't combine reportsToUserId with territory in Firestore without composite index
      // Territory filtering will be done client-side for non-admin

      usersSnapshot = await query.get();
    }

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
        lastActiveAt: data.lastActiveAt?.toDate().toISOString() || null,
        createdAt: data.createdAt?.toDate().toISOString() || "",
        reportsToUserId: data.reportsToUserId || null,
      };
    });

    // Client-side territory filter for non-admin (can't combine with reportsToUserId in Firestore)
    if (territory && managerRole !== "admin") {
      users = users.filter((user) => user.territory === territory);
    }

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
    // Note: Attendance query removed - feature disabled for V1 (see ADR 005)
    const [visitsSnap, sheetsSnap, expensesSnap] =
      await Promise.all([
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
          .orderBy("date", "desc")
          .get(),
        db.collection("expenses")
          .where("userId", "==", userId)
          .where("date", ">=", startDate)
          .where("date", "<=", endDate)
          .orderBy("date", "desc")
          .get(),
      ]);

    // Attendance disabled for V1 - return empty array (see ADR 005)
    const attendance: any[] = [];

    // Process visits
    const visits = visitsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        accountId: data.accountId,
        accountName: data.accountName,
        accountType: data.accountType,
        purpose: data.purpose,
        notes: data.notes || "",
        photos: data.photos || [], // Include photos for manager verification
        timestamp: data.timestamp?.toDate().toISOString(),
      };
    });

    // Recent visits with photos (for manager quick view)
    const recentVisits = visits.slice(0, 10);

    // Count by type
    const visitsByType = {
      distributor: visits.filter((v) => v.accountType === "distributor").length,
      dealer: visits.filter((v) => v.accountType === "dealer").length,
      architect: visits.filter((v) => v.accountType === "architect").length,
      OEM: visits.filter((v) => v.accountType === "OEM").length,
    };

    // Process sheets sales
    let totalSheets = 0;
    const sheetsByCatalog: Record<string, number> = {
      "Fine Decor": 0,
      "Artvio": 0,
      "Woodrica": 0,
      "Artis 1MM": 0,
    };
    const pendingSheets: any[] = [];

    sheetsSnap.docs.forEach((doc) => {
      const data = doc.data();

      // Collect pending sheets for display
      if (data.verified !== true && data.status !== "rejected") {
        pendingSheets.push({
          id: doc.id,
          catalog: data.catalog,
          sheetsCount: data.sheetsCount || 0,
          date: data.date, // YYYY-MM-DD for debugging
          createdAt: data.createdAt?.toDate().toISOString(),
          status: data.verified ? "verified" : "pending",
        });
      }

      // Only count verified sheets in totals (approved by manager)
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
    const pendingExpenses: any[] = [];

    expensesSnap.docs.forEach((doc) => {
      const data = doc.data();

      // Collect pending expenses for display
      if (data.status === "pending") {
        // Handle both old format (amount/category) and new format (items array)
        let amount = 0;
        let category = "other";
        let description = "";

        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          // NEW FORMAT: items array - sum all items, use first item's category
          amount = data.items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);
          category = data.items[0].category || "other";
          description = data.items[0].description || "";
        } else {
          // OLD FORMAT: single amount/category fields
          amount = data.amount || 0;
          category = data.category || "other";
          description = data.description || "";
        }

        pendingExpenses.push({
          id: doc.id,
          amount,
          category,
          description,
          date: data.date, // YYYY-MM-DD for debugging
          createdAt: data.createdAt?.toDate().toISOString(),
          status: data.status,
        });
      }

      // Only count approved expenses in totals
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
        primaryDistributorId: userData?.primaryDistributorId || null,
        reportsToUserId: userData?.reportsToUserId || null,
        isActive: userData?.isActive !== false,
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
          recentWithPhotos: recentVisits, // Latest 10 visits with photo URLs
        },
        sheets: {
          total: totalSheets,
          byCatalog: sheetsByCatalog,
          pendingRecords: pendingSheets,
        },
        expenses: {
          total: totalExpenses,
          byStatus: expensesByStatus,
          byCategory: expensesByCategory,
          pendingRecords: pendingExpenses,
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
 * Update user details (name, phone, territory, primaryDistributorId, isActive, reportsToUserId)
 *
 * Permission rules:
 * - Admin: Can update any user, can change reportsToUserId
 * - National Head: Can update their direct reports
 * - Area Manager: Can update their direct reports
 * - reportsToUserId can ONLY be changed by Admin
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

    // Check if caller has permission to update users
    const canUpdateUsers = ["admin", "national_head", "area_manager"].includes(managerRole);
    if (!canUpdateUsers) {
      const error: ApiError = {
        ok: false,
        error: "Only Admin, National Head, or Area Manager can update user details",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Parse parameters
    const {userId, name, phone, territory, primaryDistributorId, isActive, reportsToUserId} = request.body;

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

    const targetUserData = userDoc.data();

    // For non-admin managers, verify they can only update their direct reports
    if (managerRole !== "admin") {
      const targetReportsTo = targetUserData?.reportsToUserId;
      if (targetReportsTo !== managerId) {
        const error: ApiError = {
          ok: false,
          error: "You can only update users who report directly to you",
          code: "NOT_YOUR_REPORT",
        };
        response.status(403).json(error);
        return;
      }
    }

    // 3. Build update object
    const updates: any = {
      updatedAt: Timestamp.now(),
    };

    // Validate and add name
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2) {
        const error: ApiError = {
          ok: false,
          error: "Name must be at least 2 characters",
          code: "INVALID_NAME",
        };
        response.status(400).json(error);
        return;
      }
      if (trimmedName.length > 100) {
        const error: ApiError = {
          ok: false,
          error: "Name must be at most 100 characters",
          code: "INVALID_NAME",
        };
        response.status(400).json(error);
        return;
      }
      updates.name = trimmedName;
    }

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

    // Validate and add primaryDistributorId
    if (primaryDistributorId !== undefined) {
      if (primaryDistributorId === null || primaryDistributorId === "") {
        // Allow clearing the distributor
        updates.primaryDistributorId = null;
      } else {
        // Verify the account exists and is a distributor
        const accountDoc = await db.collection("accounts").doc(primaryDistributorId).get();
        if (!accountDoc.exists) {
          const error: ApiError = {
            ok: false,
            error: "Distributor account not found",
            code: "ACCOUNT_NOT_FOUND",
          };
          response.status(404).json(error);
          return;
        }
        const accountData = accountDoc.data();
        if (accountData?.type !== "distributor") {
          const error: ApiError = {
            ok: false,
            error: "Selected account is not a distributor",
            code: "INVALID_ACCOUNT_TYPE",
          };
          response.status(400).json(error);
          return;
        }
        updates.primaryDistributorId = primaryDistributorId;
      }
    }

    // Handle isActive status change
    if (isActive !== undefined) {
      updates.isActive = Boolean(isActive);
    }

    // Handle reportsToUserId change (Admin only)
    if (reportsToUserId !== undefined) {
      if (managerRole !== "admin") {
        const error: ApiError = {
          ok: false,
          error: "Only Admin can change user's reporting manager",
          code: "ADMIN_ONLY",
        };
        response.status(403).json(error);
        return;
      }

      if (reportsToUserId === null || reportsToUserId === "") {
        // Allow clearing the manager (for non-rep roles)
        updates.reportsToUserId = null;
      } else {
        // Validate the new manager exists and has a manager role
        const newManagerDoc = await db.collection("users").doc(reportsToUserId).get();
        if (!newManagerDoc.exists) {
          const error: ApiError = {
            ok: false,
            error: "Specified manager not found",
            code: "INVALID_MANAGER",
          };
          response.status(400).json(error);
          return;
        }
        const newManagerRole = newManagerDoc.data()?.role;
        if (!isManagerRole(newManagerRole)) {
          const error: ApiError = {
            ok: false,
            error: "reportsToUserId must reference a manager (area_manager, zonal_head, national_head, or admin)",
            code: "INVALID_MANAGER_ROLE",
          };
          response.status(400).json(error);
          return;
        }
        // Prevent circular reporting (user can't report to themselves)
        if (reportsToUserId === userId) {
          const error: ApiError = {
            ok: false,
            error: "User cannot report to themselves",
            code: "CIRCULAR_REPORTING",
          };
          response.status(400).json(error);
          return;
        }
        updates.reportsToUserId = reportsToUserId;
      }
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


/**
 * Get Managers List
 * Returns list of users who can be assigned as managers (for "Reports To" dropdown)
 *
 * POST /getManagersList
 * Body: {} (no parameters needed)
 *
 * Returns: {
 *   ok: true,
 *   managers: Array<{id, name, role, territory}>
 * }
 */
export const getManagersList = onRequest({cors: true}, async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const callerId = auth.uid;

    // Get caller's role (only managers can fetch this list)
    const callerDoc = await db.collection("users").doc(callerId).get();
    if (!callerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found in system",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const callerRole = callerDoc.data()?.role;
    const canFetchManagers = ["admin", "national_head", "area_manager"].includes(callerRole);
    if (!canFetchManagers) {
      const error: ApiError = {
        ok: false,
        error: "Only managers can fetch the managers list",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Query users with manager roles
    // Include area_manager, zonal_head, national_head (exclude admin from list)
    const managersSnapshot = await db.collection("users")
      .where("isActive", "==", true)
      .where("role", "in", ["area_manager", "zonal_head", "national_head"])
      .get();

    const managers = managersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        role: data.role || "",
        territory: data.territory || "",
      };
    });

    // Sort by name
    managers.sort((a, b) => a.name.localeCompare(b.name));

    logger.info(`[getManagersList] ✅ Returned ${managers.length} managers`);

    response.status(200).json({
      ok: true,
      managers,
      count: managers.length,
    });
  } catch (error: any) {
    logger.error("[getManagersList] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});
