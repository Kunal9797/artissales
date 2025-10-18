/**
 * Custom Claims Management
 *
 * SECURITY: Use JWT custom claims for role instead of Firestore lookups
 * This reduces Firestore reads by 50% and improves RLS performance
 *
 * Background:
 * - Old approach: getUserRole() in firestore.rules calls get() on every read
 * - New approach: Store role in JWT token via custom claims
 * - RLS checks: request.auth.token.role (no extra Firestore read!)
 */

import {auth} from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {UserRole} from "../types";

/**
 * Set custom claims for a user
 * Call this whenever a user's role changes
 *
 * @param uid - User ID
 * @param role - User role (rep, area_manager, zonal_head, national_head, admin)
 */
export async function setUserRoleClaim(
  uid: string,
  role: UserRole
): Promise<void> {
  try {
    await auth().setCustomUserClaims(uid, {
      role,
      claimsVersion: 1, // For future migration tracking
    });

    logger.info("Custom claims set successfully", {uid, role});
  } catch (error) {
    logger.error("Failed to set custom claims", {uid, role, error});
    throw error;
  }
}

/**
 * Remove custom claims for a user
 * Call this when deactivating/deleting a user
 */
export async function clearUserRoleClaim(uid: string): Promise<void> {
  try {
    await auth().setCustomUserClaims(uid, null);
    logger.info("Custom claims cleared", {uid});
  } catch (error) {
    logger.error("Failed to clear custom claims", {uid, error});
    throw error;
  }
}

/**
 * Get custom claims for a user
 * Useful for debugging
 */
export async function getUserClaims(uid: string): Promise<any> {
  try {
    const user = await auth().getUser(uid);
    return user.customClaims || {};
  } catch (error) {
    logger.error("Failed to get custom claims", {uid, error});
    return {};
  }
}

/**
 * Verify custom claims are set correctly
 * Returns true if claims match Firestore role
 */
export async function verifyClaims(
  uid: string,
  expectedRole: UserRole
): Promise<boolean> {
  try {
    const claims = await getUserClaims(uid);
    return claims.role === expectedRole;
  } catch (error) {
    logger.error("Failed to verify claims", {uid, error});
    return false;
  }
}
