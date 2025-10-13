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

const db = getFirestore();

/**
 * Helper function to check if user can create this account type
 */
function canCreateAccount(
  callerRole: string,
  accountType: AccountType
): boolean {
  // Admin can create anything
  if (callerRole === "admin") return true;

  // National Head can create anything
  if (callerRole === "national_head") return true;

  // Reps and Zonal Heads can only create dealers/architects/contractors
  if (callerRole === "rep" || callerRole === "zonal_head") {
    return accountType === "dealer" || accountType === "architect" || accountType === "contractor";
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
    if (!["distributor", "dealer", "architect", "contractor"].includes(type)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid account type. Must be: distributor, dealer, architect, or contractor",
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
        error: `${callerRole} cannot create ${type} accounts. Only National Head or Admin can create distributors. Reps can create dealers, architects, and contractors.`,
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

    // 7. Create account
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

    await accountRef.set(newAccount);

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
 * Returns list of accounts with optional filters
 *
 * POST /getAccountsList
 * Body: {
 *   type?: "distributor" | "dealer" | "architect"  // Filter by type
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

    // 2. Parse filters
    const {type} = request.body;

    // 3. Build query
    let query = db.collection("accounts")
      .where("status", "==", "active");

    // Filter by type if provided
    if (type) {
      if (!["distributor", "dealer", "architect", "contractor"].includes(type)) {
        const error: ApiError = {
          ok: false,
          error: "Invalid account type filter",
          code: "INVALID_TYPE",
        };
        response.status(400).json(error);
        return;
      }
      query = query.where("type", "==", type);
    }

    // Admin and National Head can see all accounts
    // Reps see only their assigned accounts
    if (callerRole !== "admin" && callerRole !== "national_head") {
      query = query.where("assignedRepUserId", "==", userId);
    }

    // 4. Execute query
    const accountsSnap = await query.get();

    // 5. Format response
    const accounts = accountsSnap.docs.map((doc) => {
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

    logger.info(`[getAccountsList] ✅ Returned ${accounts.length} accounts for`, userId);

    response.status(200).json({
      ok: true,
      accounts: accounts,
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
      (["dealer", "architect", "contractor"].includes(existingAccount?.type) &&
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
