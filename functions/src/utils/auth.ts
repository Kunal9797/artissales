/**
 * Authentication & Authorization Utilities
 */

import {Request} from "firebase-functions/v2/https";
import {auth} from "firebase-admin";
import {ApiError} from "../types";

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
 * (This will require fetching user document from Firestore)
 */
export async function hasRole(
  uid: string,
  allowedRoles: string[]
): Promise<boolean> {
  // TODO: Implement role checking by fetching user document
  // For now, return true (implement after Firestore setup)
  return true;
}
