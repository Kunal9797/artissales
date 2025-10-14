/**
 * Authentication & Authorization Utilities
 */

import {Request} from "firebase-functions/v2/https";
import {auth, firestore} from "firebase-admin";
import {ApiError} from "../types";
import * as logger from "firebase-functions/logger";

/**
 * Extract and verify Firebase Auth token from request
 */
export async function verifyAuthToken(
  request: Request
): Promise<{valid: true; uid: string; email?: string} | ApiError> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return {
        ok: false,
        error: "Missing or invalid authorization header",
        code: "AUTH_MISSING",
      };
    }

    const token = authHeader.split("Bearer ")[1];

    // Verify the token
    const decodedToken = await auth().verifyIdToken(token);

    return {
      valid: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    return {
      ok: false,
      error: "Invalid or expired token",
      code: "AUTH_INVALID",
      details: error,
    };
  }
}

/**
 * Middleware to check if user is authenticated
 * Usage: const auth = await requireAuth(request);
 *        if (!auth.valid) return auth; // Return error
 */
export async function requireAuth(
  request: Request
): Promise<{valid: true; uid: string; email?: string} | ApiError> {
  return await verifyAuthToken(request);
}

/**
 * Check if user has required role
 * Fetches user document from Firestore and verifies role
 *
 * @param uid - User ID to check
 * @param allowedRoles - Array of allowed roles (e.g., ['area_manager', 'admin'])
 * @returns true if user has one of the allowed roles, false otherwise
 */
export async function hasRole(
  uid: string,
  allowedRoles: string[]
): Promise<boolean> {
  try {
    // Fetch user document from Firestore
    const userDoc = await firestore().collection("users").doc(uid).get();

    // Return false if user doesn't exist
    if (!userDoc.exists) {
      logger.warn("User not found in hasRole check", {uid});
      return false;
    }

    // Get user data and check role
    const userData = userDoc.data();
    const userRole = userData?.role;

    if (!userRole) {
      logger.warn("User has no role defined", {uid});
      return false;
    }

    // Check if user's role is in allowed roles
    const hasPermission = allowedRoles.includes(userRole);

    if (!hasPermission) {
      logger.info("User role not permitted", {
        uid,
        userRole,
        allowedRoles,
      });
    }

    return hasPermission;
  } catch (error) {
    logger.error("Error checking user role", {uid, error});
    // Return false on error (fail-safe)
    return false;
  }
}

/**
 * Check if user is a manager (any level)
 * Convenience function for common role check
 */
export async function isManager(uid: string): Promise<boolean> {
  return hasRole(uid, ["area_manager", "zonal_head", "national_head", "admin"]);
}

/**
 * Check if user is admin
 */
export async function isAdmin(uid: string): Promise<boolean> {
  return hasRole(uid, ["admin"]);
}

/**
 * Check if user is national head or admin
 */
export async function isNationalHeadOrAdmin(uid: string): Promise<boolean> {
  return hasRole(uid, ["national_head", "admin"]);
}
