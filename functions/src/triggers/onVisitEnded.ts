/**
 * Firestore Trigger: On Visit Created
 *
 * Triggered when a new visit is logged
 * Can be used to update stats, send notifications, etc.
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {Visit} from "../types";

/**
 * Trigger on new visit creation
 */
export const onVisitCreated = onDocumentCreated(
  "visits/{visitId}",
  async (event) => {
    try {
      const visit = event.data?.data() as Visit;

      if (!visit) {
        return;
      }

      logger.info("Visit logged", {
        visitId: event.params.visitId,
        userId: visit.userId,
        accountId: visit.accountId,
        purpose: visit.purpose,
      });

      // TODO: Implement post-visit logic
      // 1. Update account's lastVisitAt field
      // 2. Update user's daily visit count
      // 3. Update aggregated metrics (visits per day, etc.)
      // 4. Log analytics event
      // 5. Send notification to manager if needed

      logger.info("Visit processed", {visitId: event.params.visitId});
    } catch (error) {
      logger.error("Error in onVisitCreated trigger", {error});
    }
  }
);
