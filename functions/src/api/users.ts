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
import {User, UserRole, ApiError} from "../types";

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
    const {phone, name, role, territory} = request.body;

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

    // 3. Check for duplicate phone number
    const existingUsers = await db.collection("users")
      .where("phone", "==", normalizedPhone)
      .limit(1)
      .get();

    if (!existingUsers.empty) {
      const error: ApiError = {
        ok: false,
        error: "A user with this phone number already exists",
        code: "DUPLICATE_PHONE",
      };
      response.status(409).json(error);
      return;
    }

    // 4. Create user document
    const newUserRef = db.collection("users").doc();
    const userId = newUserRef.id;

    const newUser: User = {
      id: userId,
      phone: normalizedPhone,
      name: name.trim(),
      email: "", // Empty, can be updated later via profile
      role: role,
      isActive: true,
      territory: territory.trim(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await newUserRef.set(newUser);

    logger.info("[createUserByManager] ✅ User created successfully:",
      userId, normalizedPhone, role);

    // 5. Return success
    response.status(200).json({
      ok: true,
      userId: userId,
      message: "User created successfully",
    });
  } catch (error: any) {
    logger.error("[createUserByManager] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});
