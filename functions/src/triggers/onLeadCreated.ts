/**
 * Firestore Trigger: On Lead Created
 *
 * Triggered when a new lead document is created
 * Sends push notification to assigned rep
 */

import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {Lead} from "../types";

/**
 * Trigger on new lead creation
 */
export const onLeadCreated = onDocumentCreated(
  "leads/{leadId}",
  async (event) => {
    try {
      const lead = event.data?.data() as Lead;

      if (!lead) {
        logger.warn("Lead data not found in trigger");
        return;
      }

      logger.info("Lead created trigger fired", {
        leadId: event.params.leadId,
        ownerUserId: lead.ownerUserId,
      });

      // TODO: Implement notification logic
      // 1. Get owner user document to fetch FCM token
      // 2. Send FCM push notification:
      //    - Title: "New Lead Assigned"
      //    - Body: "{lead.name} from {lead.city}"
      //    - Data: {leadId, type: 'new_lead'}
      // 3. Log notification sent

      logger.info("Lead created notification sent", {
        leadId: event.params.leadId,
      });
    } catch (error) {
      logger.error("Error in onLeadCreated trigger", {error});
      // Don't throw - triggers should be idempotent
    }
  }
);
