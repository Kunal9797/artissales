/**
 * DSR Compiler - Scheduled Function
 *
 * Runs daily at 11:00 PM IST
 * Compiles Daily Sales Reports for all active reps
 * Aggregates attendance, visits, and leads contacted
 */

import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";

/**
 * Scheduled function to compile daily sales reports
 * Runs at 11:00 PM IST every day
 */
export const compileDSRReports = onSchedule(
  {
    schedule: "0 23 * * *", // 11:00 PM daily
    timeZone: "Asia/Kolkata",
  },
  async (event) => {
    try {
      logger.info("DSR compiler started");

      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // TODO: Implement DSR compilation logic
      // 1. Get all active reps from users collection
      // 2. For each rep:
      //    - Get today's attendance records
      //    - Get today's visits
      //    - Get today's leads contacted (firstTouchAt = today)
      //    - Create/update DSR document:
      //      - id: {userId}_{YYYY-MM-DD}
      //      - Aggregate stats
      //      - status: 'pending'
      // 3. Log summary of reports generated

      logger.info("DSR compiler completed", {date: today});
    } catch (error) {
      logger.error("Error in DSR compiler", {error});
      throw error;
    }
  }
);
