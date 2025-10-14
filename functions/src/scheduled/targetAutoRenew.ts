/**
 * Target Auto-Renew - Scheduled Function
 *
 * Runs on the 1st of every month at 12:01 AM IST
 * Copies all targets with autoRenew=true from previous month to current month
 */

import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import {getFirestore, FieldValue, Timestamp} from "firebase-admin/firestore";
import {Target} from "../types";

const db = getFirestore();

export const targetAutoRenewScheduled = onSchedule({
  schedule: "1 0 1 * *", // Run at 12:01 AM on the 1st of every month
  timeZone: "Asia/Kolkata", // IST
}, async () => {
  try {
    logger.info("[targetAutoRenew] Starting auto-renew process...");

    // Get current month (YYYY-MM)
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Get previous month
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = `${prevMonthDate.getFullYear()}-${String(
      prevMonthDate.getMonth() + 1
    ).padStart(2, "0")}`;

    logger.info(`[targetAutoRenew] Current month: ${currentMonth}, Previous month: ${previousMonth}`);

    // Query all targets from previous month with autoRenew=true
    const targetsSnapshot = await db
      .collection("targets")
      .where("month", "==", previousMonth)
      .where("autoRenew", "==", true)
      .get();

    logger.info(`[targetAutoRenew] Found ${targetsSnapshot.size} targets to auto-renew`);

    if (targetsSnapshot.empty) {
      logger.info("[targetAutoRenew] No targets to auto-renew. Exiting.");
      return;
    }

    // Create new targets for current month
    const batch = db.batch();
    let renewedCount = 0;

    for (const targetDoc of targetsSnapshot.docs) {
      const oldTarget = targetDoc.data() as Target;

      // Create new target for current month
      const newTargetId = `${oldTarget.userId}_${currentMonth}`;
      const newTargetRef = db.collection("targets").doc(newTargetId);

      // Check if target already exists for current month (avoid duplicates)
      const existingTarget = await newTargetRef.get();
      if (existingTarget.exists) {
        logger.info(`[targetAutoRenew] Target already exists for ${newTargetId}, skipping`);
        continue;
      }

      const newTarget: Partial<Target> = {
        id: newTargetId,
        userId: oldTarget.userId,
        month: currentMonth,
        targetsByCatalog: oldTarget.targetsByCatalog,
        targetsByAccountType: oldTarget.targetsByAccountType, // Copy visit targets
        autoRenew: oldTarget.autoRenew,
        sourceTargetId: oldTarget.id,
        createdBy: oldTarget.createdBy,
        createdByName: oldTarget.createdByName,
        createdAt: FieldValue.serverTimestamp() as Timestamp,
        updatedAt: FieldValue.serverTimestamp() as Timestamp,
      };

      batch.set(newTargetRef, newTarget);
      renewedCount++;

      logger.info(`[targetAutoRenew] Renewing target for user ${oldTarget.userId}: ${oldTarget.id} -> ${newTargetId}`);
    }

    // Commit batch
    await batch.commit();

    logger.info(`[targetAutoRenew] Successfully renewed ${renewedCount} targets for ${currentMonth}`);
  } catch (error: any) {
    logger.error("[targetAutoRenew] Error:", error);
    throw new Error(`Failed to auto-renew targets: ${error.message}`);
  }
});
