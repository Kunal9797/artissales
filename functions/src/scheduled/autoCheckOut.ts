/**
 * Auto Check-Out Scheduled Function
 *
 * Runs daily at 11:58 PM IST
 * Automatically checks out users who checked in but didn't check out
 */

import {onSchedule} from "firebase-functions/v2/scheduler";
import {firestore} from "firebase-admin";
import * as logger from "firebase-functions/logger";

const db = firestore();

export const autoCheckOut = onSchedule(
  {
    schedule: "58 18 * * *", // 11:58 PM IST = 6:28 PM UTC (IST is UTC+5:30)
    timeZone: "Asia/Kolkata",
    region: "us-central1",
  },
  async (event) => {
    const startTime = Date.now();
    logger.info("[AutoCheckOut] Starting daily auto check-out process");

    try {
      // Get today's date in IST
      const now = new Date();
      const istOffset = 5.5 * 60 * 60 * 1000;
      const nowIST = new Date(now.getTime() + istOffset);
      const todayIST = nowIST.toISOString().split("T")[0]; // YYYY-MM-DD

      // Calculate start of day (00:00:00 IST)
      const startOfDayIST = new Date(`${todayIST}T00:00:00+05:30`);
      const startTimestamp = firestore.Timestamp.fromDate(startOfDayIST);

      logger.info("[AutoCheckOut] Processing for date:", {
        todayIST,
        startOfDay: startOfDayIST.toISOString(),
      });

      // Get all users who checked in today
      const checkInsSnapshot = await db
        .collection("attendance")
        .where("type", "==", "check_in")
        .where("timestamp", ">=", startTimestamp)
        .get();

      logger.info(`[AutoCheckOut] Found ${checkInsSnapshot.size} check-ins for today`);

      if (checkInsSnapshot.empty) {
        logger.info("[AutoCheckOut] No check-ins found for today. Exiting.");
        return;
      }

      // Get unique user IDs from check-ins
      const userIds = new Set<string>();
      checkInsSnapshot.docs.forEach((doc) => {
        userIds.add(doc.data().userId);
      });

      logger.info(`[AutoCheckOut] Processing ${userIds.size} unique users`);

      // Process each unique user
      let autoCheckOutCount = 0;
      let alreadyCheckedOutCount = 0;

      for (const userId of userIds) {

        // Check the LATEST attendance record to see current state
        // This correctly handles multiple check-ins/check-outs per day
        const latestAttendanceSnapshot = await db
          .collection("attendance")
          .where("userId", "==", userId)
          .where("timestamp", ">=", startTimestamp)
          .orderBy("timestamp", "desc")
          .limit(1)
          .get();

        if (!latestAttendanceSnapshot.empty) {
          const latestRecord = latestAttendanceSnapshot.docs[0].data();

          if (latestRecord.type === "check_out") {
            // User's latest action was checkout - already checked out
            alreadyCheckedOutCount++;
            continue;
          }
        }

        // Create auto check-out record
        const autoCheckOutData = {
          userId,
          type: "check_out",
          timestamp: firestore.Timestamp.now(),
          geo: null, // No GPS for auto check-out
          accuracyM: -1, // Indicates auto check-out
          method: "auto",
          triggeredBy: "end_of_day",
          createdAt: firestore.Timestamp.now(),
        };

        await db.collection("attendance").add(autoCheckOutData);
        autoCheckOutCount++;

        logger.info("[AutoCheckOut] Created auto check-out", {
          userId,
        });
      }

      const duration = Date.now() - startTime;

      logger.info("[AutoCheckOut] Process complete", {
        totalCheckIns: checkInsSnapshot.size,
        alreadyCheckedOut: alreadyCheckedOutCount,
        autoCheckOutsCreated: autoCheckOutCount,
        durationMs: duration,
      });
    } catch (error: any) {
      logger.error("[AutoCheckOut] Error during auto check-out process", {
        error: error.message,
        stack: error.stack,
      });
      throw error; // Re-throw to mark the function execution as failed
    }
  }
);
