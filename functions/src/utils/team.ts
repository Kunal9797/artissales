/**
 * Team Hierarchy Utilities
 * Helper functions for managing team-based data filtering
 */

import {getFirestore} from "firebase-admin/firestore";

const db = getFirestore();

// In-memory cache for direct report IDs with TTL
const directReportsCache = new Map<string, {ids: string[]; timestamp: number}>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get IDs of all direct reports for a manager (with caching)
 * Used by National Heads and Area Managers (same logic for both)
 *
 * @param managerId - The user ID of the manager
 * @returns Array of user IDs who report directly to this manager
 */
export async function getDirectReportIds(managerId: string): Promise<string[]> {
  // Check cache first
  const cached = directReportsCache.get(managerId);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.ids;
  }

  // Fetch from Firestore
  const directReportsSnap = await db.collection("users")
    .where("reportsToUserId", "==", managerId)
    .where("isActive", "==", true)
    .get();

  const ids = directReportsSnap.docs.map((doc) => doc.id);

  // Update cache
  directReportsCache.set(managerId, {ids, timestamp: now});

  return ids;
}

/**
 * Invalidate the direct reports cache for a specific manager or all managers
 * Call this when team structure changes (user reassignments, etc.)
 */
export function invalidateDirectReportsCache(managerId?: string): void {
  if (managerId) {
    directReportsCache.delete(managerId);
  } else {
    directReportsCache.clear();
  }
}

/**
 * Get IDs of all active users (for Admin role)
 *
 * @returns Array of all active user IDs
 */
export async function getAllActiveUserIds(): Promise<string[]> {
  const usersSnap = await db.collection("users")
    .where("isActive", "==", true)
    .get();

  return usersSnap.docs.map((doc) => doc.id);
}

/**
 * Get team member IDs based on caller's role
 * - Admin: returns all active users
 * - National Head / Area Manager: returns direct reports only
 *
 * @param userId - The caller's user ID
 * @param userRole - The caller's role
 * @returns Array of user IDs in the caller's team
 */
export async function getTeamMemberIds(
  userId: string,
  userRole: string
): Promise<string[]> {
  if (userRole === "admin") {
    return getAllActiveUserIds();
  }

  // For national_head, area_manager, zonal_head - return direct reports only
  return getDirectReportIds(userId);
}

/**
 * Check if a user is a manager role (can have direct reports)
 */
export function isManagerRole(role: string): boolean {
  return ["area_manager", "zonal_head", "national_head", "admin"].includes(role);
}
