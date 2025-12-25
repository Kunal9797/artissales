/**
 * Account Management API
 * Handles creation and management of distributors, dealers, and architects
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
} from "../utils/validation";
import {requireAuth} from "../utils/auth";
import {AccountType, ApiError} from "../types";
import {getDirectReportIds, getTeamDistributorIds} from "../utils/team";

const db = getFirestore();

/**
 * Batch fetch user roles to avoid N+1 queries
 * Firestore 'in' supports up to 30 items per query, so we chunk larger sets
 */
async function batchFetchUserRoles(userIds: string[]): Promise<Map<string, string>> {
  const roleMap = new Map<string, string>();
  if (userIds.length === 0) return roleMap;

  // Firestore 'in' supports up to 30 items per query
  const chunks: string[][] = [];
  for (let i = 0; i < userIds.length; i += 30) {
    chunks.push(userIds.slice(i, i + 30));
  }

  await Promise.all(chunks.map(async (chunk) => {
    const usersSnapshot = await db.collection("users")
      .where("__name__", "in", chunk)
      .select("role")
      .get();
    usersSnapshot.docs.forEach((doc) => {
      roleMap.set(doc.id, doc.data()?.role || "unknown");
    });
  }));

  return roleMap;
}

/**
 * Get all admin user IDs (cached for efficiency)
 * Used to identify admin-created accounts that should be visible to all users
 */
async function getAdminUserIds(): Promise<string[]> {
  const adminSnapshot = await db.collection("users")
    .where("role", "==", "admin")
    .select("__name__")
    .get();
  return adminSnapshot.docs.map((doc) => doc.id);
}

/**
 * Fetch accounts visible to a rep using targeted queries (optimized)
 * Instead of fetching all accounts and filtering, we query specifically for:
 * 1. Accounts created by the rep
 * 2. Accounts created by their manager
 * 3. Accounts created by admins
 * 4. Their assigned distributor
 * 5. Legacy accounts (no createdByUserId)
 */
async function fetchRepVisibleAccounts(
  userId: string,
  reportsToUserId: string | undefined,
  migratedFromId: string | undefined,
  primaryDistributorId: string | undefined,
  type: string | undefined
): Promise<any[]> {
  const adminIds = await getAdminUserIds();

  // Build list of creator IDs to query (rep + manager + admins)
  const creatorIds: string[] = [userId];
  if (migratedFromId) creatorIds.push(migratedFromId);
  if (reportsToUserId) creatorIds.push(reportsToUserId);

  // Parallel queries for maximum efficiency
  const queries: Promise<FirebaseFirestore.QuerySnapshot>[] = [];

  // Query 1: Accounts created by rep, manager, or migrated ID (up to 30 IDs)
  // We combine these since they're all "trusted" creators
  if (creatorIds.length > 0) {
    let creatorQuery = db.collection("accounts")
      .where("status", "==", "active")
      .where("createdByUserId", "in", creatorIds.slice(0, 30));
    if (type) creatorQuery = creatorQuery.where("type", "==", type);
    queries.push(creatorQuery.get());
  }

  // Query 2: Accounts created by admins (chunk if > 30)
  if (adminIds.length > 0) {
    const adminChunks: string[][] = [];
    for (let i = 0; i < adminIds.length; i += 30) {
      adminChunks.push(adminIds.slice(i, i + 30));
    }
    for (const chunk of adminChunks) {
      let adminQuery = db.collection("accounts")
        .where("status", "==", "active")
        .where("createdByUserId", "in", chunk);
      if (type) adminQuery = adminQuery.where("type", "==", type);
      queries.push(adminQuery.get());
    }
  }

  // Query 3: Their assigned distributor (single doc fetch, only if not filtering by type or type is distributor)
  if (primaryDistributorId && (!type || type === "distributor")) {
    queries.push(
      db.collection("accounts")
        .where("__name__", "==", primaryDistributorId)
        .where("status", "==", "active")
        .get()
    );
  }

  // Query 4: Legacy accounts with empty/missing createdByUserId
  // These are older accounts that predate the createdByUserId field
  let legacyQuery = db.collection("accounts")
    .where("status", "==", "active")
    .where("createdByUserId", "==", "");
  if (type) legacyQuery = legacyQuery.where("type", "==", type);
  queries.push(legacyQuery.get());

  // Execute all queries in parallel
  const snapshots = await Promise.all(queries);

  // Merge and dedupe results
  const accountMap = new Map<string, any>();
  for (const snapshot of snapshots) {
    for (const doc of snapshot.docs) {
      if (!accountMap.has(doc.id)) {
        const data = doc.data();
        // Filter out distributors that aren't the rep's assigned one
        if (data.type === "distributor" && data.id !== primaryDistributorId) {
          continue;
        }
        accountMap.set(doc.id, {
          id: data.id,
          name: data.name,
          type: data.type,
          contactPerson: data.contactPerson || undefined,
          phone: data.phone,
          email: data.email || undefined,
          birthdate: data.birthdate || undefined,
          address: data.address || undefined,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          territory: data.territory,
          assignedRepUserId: data.assignedRepUserId,
          parentDistributorId: data.parentDistributorId || undefined,
          createdByUserId: data.createdByUserId,
          lastVisitAt: data.lastVisitAt?.toDate().toISOString() || undefined,
        });
      }
    }
  }

  return Array.from(accountMap.values());
}

/**
 * Helper function to check if user can create this account type
 */
function canCreateAccount(
  callerRole: string,
  accountType: AccountType
): boolean {
  // Admin can create anything
  if (callerRole === "admin") return true;

  // National Head and Area Manager can create anything
  if (callerRole === "national_head" || callerRole === "area_manager") return true;

  // Reps and Zonal Heads can only create dealers/architects/OEMs
  if (callerRole === "rep" || callerRole === "zonal_head") {
    return accountType === "dealer" || accountType === "architect" || accountType === "OEM";
  }

  return false;
}

/**
 * Create Account
 * Allows users to create distributors, dealers, or architects based on permissions
 *
 * POST /createAccount
 * Body: {
 *   name: string,
 *   type: "distributor" | "dealer" | "architect",
 *   contactPerson?: string,
 *   phone: string,  // 10 digits
 *   email?: string,
 *   address?: string,
 *   city: string,
 *   state: string,
 *   pincode: string,  // 6 digits
 *   parentDistributorId?: string
 * }
 */
export const createAccount = onRequest({invoker: "public"}, async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const userId = auth.uid;

    // Get caller's role
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const userData = userDoc.data();
    const callerRole = userData?.role;
    const userTerritory = userData?.territory || "Unassigned";

    // 2. Parse and validate input
    const {
      name,
      type,
      contactPerson,
      phone,
      email,
      birthdate,
      address,
      city,
      state,
      pincode,
      parentDistributorId,
    } = request.body;

    // Validate required fields (phone is now optional)
    if (!name || !type || !city || !state || !pincode) {
      const error: ApiError = {
        ok: false,
        error: "Missing required fields: name, type, city, state, pincode",
        code: "MISSING_FIELDS",
      };
      response.status(400).json(error);
      return;
    }

    // Validate account type
    if (!["distributor", "dealer", "architect", "OEM"].includes(type)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid account type. Must be: distributor, dealer, architect, or OEM",
        code: "INVALID_TYPE",
      };
      response.status(400).json(error);
      return;
    }

    // 3. Check permissions
    const canCreate = canCreateAccount(callerRole, type);
    if (!canCreate) {
      const error: ApiError = {
        ok: false,
        error: `${callerRole} cannot create ${type} accounts. Only National Head or Admin can create distributors. Reps can create dealers, architects, and OEMs.`,
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 4. Normalize and validate phone (if provided)
    let normalizedPhone = "";
    if (phone && phone.trim()) {
      if (!isValidPhoneNumber(phone)) {
        const error: ApiError = {
          ok: false,
          error: "Invalid phone number format. Expected 10-digit Indian number",
          code: "INVALID_PHONE",
        };
        response.status(400).json(error);
        return;
      }
      normalizedPhone = normalizePhoneNumber(phone);
    }

    // 5. Validate pincode (6 digits)
    if (!/^\d{6}$/.test(pincode)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid pincode. Must be 6 digits",
        code: "INVALID_PINCODE",
      };
      response.status(400).json(error);
      return;
    }

    // 6. Validate parent distributor if provided
    if (parentDistributorId) {
      const distributorDoc = await db.collection("accounts")
        .doc(parentDistributorId)
        .get();

      if (!distributorDoc.exists ||
          distributorDoc.data()?.type !== "distributor") {
        const error: ApiError = {
          ok: false,
          error: "Invalid parent distributor",
          code: "INVALID_DISTRIBUTOR",
        };
        response.status(400).json(error);
        return;
      }
    }

    // 7. Create account with atomic duplicate check using transaction
    const accountRef = db.collection("accounts").doc();
    const accountId = accountRef.id;

    const newAccount: any = {
      id: accountId,
      name: name.trim(),
      type: type,
      territory: userTerritory,
      assignedRepUserId: userId, // Auto-assign to creator
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      status: "active",
      createdByUserId: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Only add optional fields if they have values
    if (normalizedPhone) newAccount.phone = normalizedPhone;
    if (parentDistributorId) newAccount.parentDistributorId = parentDistributorId;
    if (contactPerson?.trim()) newAccount.contactPerson = contactPerson.trim();
    if (email?.trim()) newAccount.email = email.trim();
    if (birthdate?.trim()) newAccount.birthdate = birthdate.trim();
    if (address?.trim()) newAccount.address = address.trim();

    // Use transaction for atomic duplicate check + create (prevents race conditions)
    try {
      await db.runTransaction(async (transaction) => {
        // Check for duplicate phone within transaction (atomic read)
        if (normalizedPhone) {
          const existingQuery = db.collection("accounts")
            .where("phone", "==", normalizedPhone)
            .limit(1);
          const existingAccounts = await transaction.get(existingQuery);

          if (!existingAccounts.empty) {
            const existingAccount = existingAccounts.docs[0].data();
            throw new Error(`DUPLICATE_PHONE:${existingAccount.name}`);
          }
        }

        // Create account (atomic write)
        transaction.set(accountRef, newAccount);
      });
    } catch (txError: any) {
      // Handle duplicate phone error from transaction
      if (txError.message?.startsWith("DUPLICATE_PHONE:")) {
        const existingName = txError.message.split(":")[1];
        const error: ApiError = {
          ok: false,
          error: `An account with this phone number already exists: ${existingName}`,
          code: "DUPLICATE_PHONE",
        };
        response.status(409).json(error);
        return;
      }
      // Re-throw other errors
      throw txError;
    }

    logger.info(`[createAccount] ✅ ${type} created:`, accountId, name, "by", userId);

    response.status(200).json({
      ok: true,
      accountId: accountId,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`,
    });
  } catch (error: any) {
    logger.error("[createAccount] ❌ Error:", error);
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
 * Get Accounts List
 * Returns list of accounts with optional filters and pagination
 *
 * POST /getAccountsList
 * Body: {
 *   type?: "distributor" | "dealer" | "architect" | "OEM"  // Filter by type
 *   limit?: number       // Max accounts per page (default 50, max 100)
 *   startAfter?: string  // Last account ID for pagination cursor
 *   sortBy?: "name" | "lastVisitAt"  // Sort field (default "name")
 *   sortDir?: "asc" | "desc"         // Sort direction (default "asc")
 * }
 *
 * Response: {
 *   ok: true,
 *   accounts: AccountListItem[],
 *   pagination: { hasMore: boolean, nextCursor?: string }
 * }
 */
export const getAccountsList = onRequest({invoker: "public"}, async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const userId = auth.uid;

    // Get caller's role
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const callerRole = userDoc.data()?.role;

    // 2. Parse filters and pagination params
    const {
      type,
      createdBy,  // 'mine' | 'all' - filter by creator
      limit: requestedLimit = 50,
      startAfter,
      sortBy = "name",
      sortDir = "asc",
    } = request.body;

    // Validate and cap limit (max 1000 for bulk loading, e.g., offline cache)
    const limit = Math.min(Math.max(1, requestedLimit), 1000);
    // Fetch one extra to check if there are more results
    const fetchLimit = limit + 1;

    // Validate sortBy
    if (!["name", "lastVisitAt"].includes(sortBy)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid sortBy. Must be 'name' or 'lastVisitAt'",
        code: "INVALID_SORT",
      };
      response.status(400).json(error);
      return;
    }

    // Validate sortDir
    if (!["asc", "desc"].includes(sortDir)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid sortDir. Must be 'asc' or 'desc'",
        code: "INVALID_SORT",
      };
      response.status(400).json(error);
      return;
    }

    // Validate type if provided
    if (type && !["distributor", "dealer", "architect", "OEM"].includes(type)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid account type filter",
        code: "INVALID_TYPE",
      };
      response.status(400).json(error);
      return;
    }

    const isAdmin = callerRole === "admin";
    const isManager = callerRole === "national_head" || callerRole === "area_manager";
    const isRep = !isAdmin && !isManager;

    let accounts: any[];

    // 3. Fetch accounts based on role
    // - Reps: Use optimized targeted queries (scalable, fast)
    // - Admins/Managers: Use general query with visibility filtering

    if (isRep && createdBy !== "mine") {
      // OPTIMIZED PATH FOR REPS
      // Uses targeted queries instead of fetching 1000+ accounts and filtering
      const primaryDistributorId = userDoc.data()?.primaryDistributorId;
      const reportsToUserId = userDoc.data()?.reportsToUserId;
      const migratedFromId = userDoc.data()?.migratedFrom;

      accounts = await fetchRepVisibleAccounts(
        userId,
        reportsToUserId,
        migratedFromId,
        primaryDistributorId,
        type
      );

      logger.info(`[getAccountsList] Rep optimized query returned ${accounts.length} accounts`);
    } else {
      // STANDARD PATH FOR ADMINS/MANAGERS (and reps with createdBy='mine')
      let query: FirebaseFirestore.Query = db.collection("accounts")
        .where("status", "==", "active");

      // Filter by type if provided
      if (type) {
        query = query.where("type", "==", type);
      }

      // Filter by createdBy if provided
      // 'mine' = only accounts created by the current user
      if (createdBy === "mine") {
        query = query.where("createdByUserId", "==", userId);
      }

      // Add sorting
      query = query.orderBy(sortBy, sortDir as "asc" | "desc");

      // For managers, we still need to fetch a larger batch because visibility
      // filtering happens AFTER the query. 1000 should be sufficient for most teams.
      const actualFetchLimit = isAdmin ? fetchLimit : 1000;

      // Apply cursor if provided (pagination) - only for admins
      if (startAfter && isAdmin) {
        const cursorDoc = await db.collection("accounts").doc(startAfter).get();
        if (cursorDoc.exists) {
          query = query.startAfter(cursorDoc);
        }
      }

      // Apply limit
      query = query.limit(actualFetchLimit);

      // Execute query
      const accountsSnap = await query.get();

      // Format response
      accounts = accountsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.id,
          name: data.name,
          type: data.type,
          contactPerson: data.contactPerson || undefined,
          phone: data.phone,
          email: data.email || undefined,
          birthdate: data.birthdate || undefined,
          address: data.address || undefined,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          territory: data.territory,
          assignedRepUserId: data.assignedRepUserId,
          parentDistributorId: data.parentDistributorId || undefined,
          createdByUserId: data.createdByUserId,
          lastVisitAt: data.lastVisitAt?.toDate().toISOString() || undefined,
        };
      });

      // Apply visibility rules for managers (admins see all, reps with 'mine' already filtered)
      if (isManager && createdBy !== "mine") {
        // National Head / Area Manager: filter to accounts created by:
        // - Themselves (including pre-migration ID)
        // - Their direct reports
        // - Admin (admin-created accounts are shared)
        // PLUS: Distributors assigned to their team members via primaryDistributorId
        const directReportIds = await getDirectReportIds(userId);
        const migratedFromId = userDoc.data()?.migratedFrom;

        // Include both current ID and migratedFrom ID for the manager
        const managerIds = migratedFromId ? [userId, migratedFromId] : [userId];
        const teamMemberIds = new Set([...managerIds, ...directReportIds]);

        // Get distributor IDs assigned to team members (for distributor visibility)
        const teamDistributorIds = await getTeamDistributorIds([...teamMemberIds]);

        // Get unique creator IDs to check which are admins
        const creatorIds = [
          ...new Set(
            accounts
              .map((acc) => acc.createdByUserId)
              .filter((id): id is string => !!id && id.trim().length > 0)
          ),
        ];

        // Batch fetch creator roles (fixes N+1 query problem)
        const creatorRoleMap = await batchFetchUserRoles(creatorIds);

        // Identify admin creators
        const adminCreatorIds = new Set<string>();
        creatorRoleMap.forEach((role, id) => {
          if (role === "admin") adminCreatorIds.add(id);
        });

        // Filter accounts
        accounts = accounts.filter((account) => {
          // Distributors: only show if assigned to a team member
          if (account.type === "distributor") {
            return teamDistributorIds.has(account.id);
          }

          // Legacy data (no createdByUserId) - show it
          if (!account.createdByUserId || account.createdByUserId.trim().length === 0) {
            return true;
          }

          // Created by self or a direct report
          if (teamMemberIds.has(account.createdByUserId)) {
            return true;
          }

          // Created by admin (shared accounts)
          if (adminCreatorIds.has(account.createdByUserId)) {
            return true;
          }

          // Hide accounts created by other teams
          return false;
        });
      }
    }

    // 4. Apply sorting (for rep optimized path, sorting wasn't applied in queries)
    const multiplier = sortDir === "asc" ? 1 : -1;
    accounts.sort((a, b) => {
      if (sortBy === "lastVisitAt") {
        const aTime = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0;
        const bTime = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0;
        return (aTime - bTime) * multiplier;
      }
      return a.name.localeCompare(b.name) * multiplier;
    });

    // 5. Apply pagination to filtered results
    // For non-admins, we need to handle cursor-based pagination after filtering
    if (!isAdmin && startAfter) {
      // Find the cursor position in the filtered results
      const cursorIndex = accounts.findIndex((a) => a.id === startAfter);
      if (cursorIndex !== -1) {
        // Start after the cursor
        accounts = accounts.slice(cursorIndex + 1);
      }
    }

    // Check if there are more results than requested
    const hasMore = accounts.length > limit;
    // Trim to requested limit
    if (hasMore) {
      accounts = accounts.slice(0, limit);
    }
    // Get cursor for next page (last account ID)
    const nextCursor = accounts.length > 0 ? accounts[accounts.length - 1].id : undefined;

    logger.info(`[getAccountsList] ✅ Returned ${accounts.length} accounts for`, userId, `hasMore: ${hasMore}`);

    response.status(200).json({
      ok: true,
      accounts: accounts,
      pagination: {
        hasMore,
        nextCursor: hasMore ? nextCursor : undefined,
      },
    });
  } catch (error: any) {
    logger.error("[getAccountsList] ❌ Error:", error);
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
 * Update Account
 * Updates an existing account with role-based permissions
 *
 * POST /updateAccount
 * Body: {
 *   accountId: string;
 *   name?: string;
 *   contactPerson?: string;
 *   phone?: string;
 *   email?: string;
 *   address?: string;
 *   city?: string;
 *   state?: string;
 *   pincode?: string;
 *   parentDistributorId?: string;
 * }
 *
 * Permissions:
 * - Admin: Can edit any account
 * - National Head: Can edit any account
 * - Rep: Can only edit dealers/architects they created
 */
export const updateAccount = onRequest({invoker: "public"}, async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const userId = auth.uid;

    // Get caller's role
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const callerRole = userDoc.data()?.role;

    // 2. Parse input
    logger.info(`[updateAccount] 📥 Received request body:`, JSON.stringify(request.body));
    const {
      accountId,
      type,
      name,
      contactPerson,
      phone,
      email,
      birthdate,
      address,
      city,
      state,
      pincode,
      parentDistributorId,
    } = request.body;

    // Validate accountId
    if (!accountId) {
      const error: ApiError = {
        ok: false,
        error: "Missing required field: accountId",
        code: "MISSING_FIELDS",
      };
      response.status(400).json(error);
      return;
    }

    // 3. Get existing account
    const accountRef = db.collection("accounts").doc(accountId);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Account not found",
        code: "ACCOUNT_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const existingAccount = accountDoc.data();

    // 4. Check permissions
    const canEdit =
      callerRole === "admin" ||
      callerRole === "national_head" ||
      callerRole === "area_manager" ||
      (["dealer", "architect", "OEM"].includes(existingAccount?.type) &&
       existingAccount?.createdByUserId === userId);

    if (!canEdit) {
      const error: ApiError = {
        ok: false,
        error: "You don't have permission to edit this account",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 4.5 Validate type change if provided
    if (type !== undefined) {
      // Validate type value
      if (!["distributor", "dealer", "architect", "OEM"].includes(type)) {
        const error: ApiError = {
          ok: false,
          error: "Invalid account type. Must be: distributor, dealer, architect, or OEM",
          code: "INVALID_TYPE",
        };
        response.status(400).json(error);
        return;
      }

      // Check type change permissions
      const isPrivileged = callerRole === "admin" ||
                           callerRole === "national_head" ||
                           callerRole === "area_manager";

      // Reps can only change type for their own accounts, and cannot change TO distributor
      if (!isPrivileged) {
        if (existingAccount?.createdByUserId !== userId) {
          const error: ApiError = {
            ok: false,
            error: "You can only change type for accounts you created",
            code: "INSUFFICIENT_PERMISSIONS",
          };
          response.status(403).json(error);
          return;
        }

        if (type === "distributor") {
          const error: ApiError = {
            ok: false,
            error: "Only managers can change account type to distributor",
            code: "INSUFFICIENT_PERMISSIONS",
          };
          response.status(403).json(error);
          return;
        }
      }
    }

    // 5. Validate phone if provided
    let normalizedPhone = existingAccount?.phone || "";
    if (phone !== undefined) {
      if (phone && phone.trim()) {
        if (!isValidPhoneNumber(phone)) {
          const error: ApiError = {
            ok: false,
            error: "Invalid phone number format. Expected 10-digit Indian number",
            code: "INVALID_PHONE",
          };
          response.status(400).json(error);
          return;
        }
        normalizedPhone = normalizePhoneNumber(phone);

        // 5.5 Check for duplicate phone (only if phone changed)
        if (normalizedPhone !== existingAccount?.phone) {
          const existingAccounts = await db.collection("accounts")
            .where("phone", "==", normalizedPhone)
            .limit(1)
            .get();

          if (!existingAccounts.empty) {
            const duplicateAccount = existingAccounts.docs[0].data();
            const error: ApiError = {
              ok: false,
              error: `An account with this phone number already exists: ${duplicateAccount.name}`,
              code: "DUPLICATE_PHONE",
            };
            response.status(409).json(error);
            return;
          }
        }
      } else {
        normalizedPhone = "";
      }
    }

    // 6. Validate pincode if provided
    if (pincode && !/^\d{6}$/.test(pincode)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid pincode. Must be 6 digits",
        code: "INVALID_PINCODE",
      };
      response.status(400).json(error);
      return;
    }

    // 7. Validate parent distributor if provided
    if (parentDistributorId !== undefined && parentDistributorId) {
      const distributorDoc = await db.collection("accounts")
        .doc(parentDistributorId)
        .get();

      if (!distributorDoc.exists ||
          distributorDoc.data()?.type !== "distributor") {
        const error: ApiError = {
          ok: false,
          error: "Invalid parent distributor",
          code: "INVALID_DISTRIBUTOR",
        };
        response.status(400).json(error);
        return;
      }
    }

    // 8. Build update object (only include fields that were provided)
    const updates: any = {
      updatedAt: Timestamp.now(),
    };

    if (type !== undefined) updates.type = type;
    if (name !== undefined) updates.name = name.trim();
    if (contactPerson !== undefined) {
      if (contactPerson.trim()) {
        updates.contactPerson = contactPerson.trim();
      } else {
        updates.contactPerson = "";
      }
    }
    if (phone !== undefined) {
      if (normalizedPhone) {
        updates.phone = normalizedPhone;
      } else {
        updates.phone = "";
      }
    }
    if (email !== undefined) {
      if (email.trim()) {
        updates.email = email.trim();
      } else {
        updates.email = "";
      }
    }
    if (birthdate !== undefined) {
      if (birthdate.trim()) {
        updates.birthdate = birthdate.trim();
      } else {
        updates.birthdate = "";
      }
    }
    if (address !== undefined) {
      if (address.trim()) {
        updates.address = address.trim();
      } else {
        updates.address = "";
      }
    }
    if (city !== undefined) updates.city = city.trim();
    if (state !== undefined) updates.state = state.trim();
    if (pincode !== undefined) updates.pincode = pincode.trim();
    if (parentDistributorId !== undefined) {
      if (parentDistributorId) {
        updates.parentDistributorId = parentDistributorId;
      } else {
        updates.parentDistributorId = "";
      }
    }

    // 9. Update account
    logger.info(`[updateAccount] 📝 Updating account ${accountId} with:`, JSON.stringify(updates));
    await accountRef.update(updates);

    logger.info(`[updateAccount] ✅ Account updated:`, accountId, "by", userId);

    response.status(200).json({
      ok: true,
      message: "Account updated successfully",
    });
  } catch (error: any) {
    logger.error("[updateAccount] ❌ Error:", error);
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
 * Get Account Details with Visit History (Optimized)
 *
 * POST /getAccountDetails
 * Body: {
 *   accountId: string,
 *   limit?: number (default 10),
 *   startAfter?: string (visitId for pagination)
 * }
 *
 * Response: {
 *   ok: true,
 *   account: {...},
 *   visits: [...],
 *   hasMore: boolean,
 *   lastVisitId?: string
 * }
 */
export const getAccountDetails = onRequest(async (request, response) => {
  try {
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {accountId, limit = 10, startAfter} = request.body;
    if (!accountId) {
      const error: ApiError = {ok: false, error: "accountId is required", code: "MISSING_FIELD"};
      response.status(400).json(error);
      return;
    }

    const accountDoc = await db.collection("accounts").doc(accountId).get();
    if (!accountDoc.exists) {
      const error: ApiError = {ok: false, error: "Account not found", code: "ACCOUNT_NOT_FOUND"};
      response.status(404).json(error);
      return;
    }

    // Build query with pagination support
    // Fetch limit + 1 to check if there are more results
    const fetchLimit = Math.min(limit, 50) + 1;
    let visitsQuery = db.collection("visits")
      .where("accountId", "==", accountId)
      .orderBy("timestamp", "desc")
      .limit(fetchLimit);

    // If paginating, start after the last visit
    if (startAfter) {
      const lastVisitDoc = await db.collection("visits").doc(startAfter).get();
      if (lastVisitDoc.exists) {
        visitsQuery = db.collection("visits")
          .where("accountId", "==", accountId)
          .orderBy("timestamp", "desc")
          .startAfter(lastVisitDoc)
          .limit(fetchLimit);
      }
    }

    const visitsSnapshot = await visitsQuery.get();

    // Check if there are more results
    const hasMore = visitsSnapshot.docs.length > limit;
    const visitsToProcess = hasMore
      ? visitsSnapshot.docs.slice(0, limit)
      : visitsSnapshot.docs;

    // OPTIMIZATION: Batch fetch users instead of N+1 queries
    // 1. Collect unique user IDs
    const userIds = [...new Set(visitsToProcess.map((doc) => doc.data().userId).filter(Boolean))];

    // 2. Batch fetch users (Firestore 'in' supports up to 30 items per query)
    const userMap = new Map<string, string>();
    if (userIds.length > 0) {
      const chunks: string[][] = [];
      for (let i = 0; i < userIds.length; i += 30) {
        chunks.push(userIds.slice(i, i + 30));
      }

      await Promise.all(chunks.map(async (chunk) => {
        const usersSnapshot = await db.collection("users")
          .where("__name__", "in", chunk)
          .get();
        usersSnapshot.docs.forEach((doc) => {
          userMap.set(doc.id, doc.data()?.name || "Unknown");
        });
      }));
    }

    // 3. Map visits with user names from lookup (no additional queries!)
    const visitsWithUserNames = visitsToProcess.map((doc: any) => {
      const visitData = doc.data();
      const photos = visitData.photos || [];
      return {
        id: doc.id,
        timestamp: visitData.timestamp?.toDate().toISOString() || null,
        userId: visitData.userId,
        userName: userMap.get(visitData.userId) || "Unknown",
        purpose: visitData.purpose || "follow_up",
        notes: visitData.notes || "",
        // Return photo count for lazy loading, not full URLs
        photoCount: photos.length,
      };
    });

    const lastVisitId = visitsToProcess.length > 0
      ? visitsToProcess[visitsToProcess.length - 1].id
      : undefined;

    response.status(200).json({
      ok: true,
      account: {id: accountDoc.id, ...accountDoc.data()},
      visits: visitsWithUserNames,
      hasMore,
      lastVisitId,
    });
    logger.info(`[getAccountDetails] ✅ ${accountId}: ${visitsWithUserNames.length} visits, hasMore: ${hasMore}`);
  } catch (error: any) {
    logger.error("[getAccountDetails] ❌", error);
    response.status(500).json({ok: false, error: "Internal error", code: "INTERNAL_ERROR", details: error.message});
  }
});

/**
 * Get Visit Photos (for lazy loading)
 *
 * POST /getVisitPhotos
 * Body: { visitId: string }
 */
export const getVisitPhotos = onRequest(async (request, response) => {
  try {
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {visitId} = request.body;
    if (!visitId) {
      const error: ApiError = {ok: false, error: "visitId is required", code: "MISSING_FIELD"};
      response.status(400).json(error);
      return;
    }

    const visitDoc = await db.collection("visits").doc(visitId).get();
    if (!visitDoc.exists) {
      const error: ApiError = {ok: false, error: "Visit not found", code: "VISIT_NOT_FOUND"};
      response.status(404).json(error);
      return;
    }

    const visitData = visitDoc.data();
    response.status(200).json({
      ok: true,
      photos: visitData?.photos || [],
    });
    logger.info(`[getVisitPhotos] ✅ ${visitId}: ${(visitData?.photos || []).length} photos`);
  } catch (error: any) {
    logger.error("[getVisitPhotos] ❌", error);
    response.status(500).json({ok: false, error: "Internal error", code: "INTERNAL_ERROR", details: error.message});
  }
});

/**
 * Delete Account (Soft Delete)
 * Only National Heads and Admins can delete accounts
 *
 * POST /deleteAccount
 * Body: { accountId: string }
 *
 * Permissions:
 * - Admin: Can delete any account
 * - National Head: Can delete any account
 * - Others: Not allowed
 */
export const deleteAccount = onRequest({invoker: "public"}, async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const userId = auth.uid;

    // Get caller's role
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const callerRole = userDoc.data()?.role;

    // 2. Check permissions - Only admin and national_head can delete
    if (callerRole !== "admin" && callerRole !== "national_head") {
      const error: ApiError = {
        ok: false,
        error: "Only National Heads and Admins can delete accounts",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 3. Parse input
    const {accountId} = request.body;

    if (!accountId) {
      const error: ApiError = {
        ok: false,
        error: "Missing required field: accountId",
        code: "MISSING_FIELDS",
      };
      response.status(400).json(error);
      return;
    }

    // 4. Get existing account
    const accountRef = db.collection("accounts").doc(accountId);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Account not found",
        code: "ACCOUNT_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const accountData = accountDoc.data();

    // 5. Soft delete - update status to "deleted"
    await accountRef.update({
      status: "deleted",
      deletedAt: Timestamp.now(),
      deletedByUserId: userId,
      updatedAt: Timestamp.now(),
    });

    logger.info(`[deleteAccount] ✅ Account deleted:`, accountId, accountData?.name, "by", userId);

    response.status(200).json({
      ok: true,
      message: "Account deleted successfully",
    });
  } catch (error: any) {
    logger.error("[deleteAccount] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});
