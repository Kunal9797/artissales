/**
 * Update User Last Active Utility
 *
 * Updates the lastActiveAt timestamp on user documents when they log activity.
 * Called inline from visits, sheetsSales, and expenses endpoints.
 */

import {getFirestore, Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

/**
 * Update user's lastActiveAt timestamp
 * Non-blocking - errors are logged but don't throw
 *
 * @param userId - The user ID to update
 */
export async function updateUserLastActive(userId: string): Promise<void> {
  try {
    await db.collection("users").doc(userId).update({
      lastActiveAt: Timestamp.now(),
    });
    logger.debug(`[updateLastActive] Updated lastActiveAt for user ${userId}`);
  } catch (error) {
    // Non-blocking - log but don't throw
    // This ensures activity logging doesn't fail if lastActiveAt update fails
    logger.error(`[updateLastActive] Failed to update lastActiveAt for ${userId}`, {error});
  }
}
