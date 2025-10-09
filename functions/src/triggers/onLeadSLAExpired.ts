/**
 * Firestore Trigger: On Lead SLA Expired
 *
 * Triggered when lead's slaBreached field is set to true
 * Notifies manager about SLA violation
 */

import {onDocumentUpdated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import {Lead} from "../types";

/**
 * Trigger on lead SLA breach
 */
export const onLeadSLABreach = onDocumentUpdated(
  "leads/{leadId}",
  async (event) => {
    try {
      const beforeData = event.data?.before.data() as Lead;
      const afterData = event.data?.after.data() as Lead;

      if (!beforeData || !afterData) {
        return;
      }

      // Check if slaBreached changed from false to true
      if (!beforeData.slaBreached && afterData.slaBreached) {
        logger.warn("Lead SLA breached", {
          leadId: event.params.leadId,
          ownerUserId: afterData.ownerUserId,
          slaDueAt: afterData.slaDueAt,
        });

        // TODO: Implement manager notification logic
        // 1. Get rep's manager (reportsToUserId)
        // 2. Send FCM to manager:
        //    - Title: "SLA Breach Alert"
        //    - Body: "Lead from {lead.name} missed 4-hour SLA"
        //    - Data: {leadId, repUserId, type: 'sla_breach'}
        // 3. Optionally send email/SMS escalation
        // 4. Log escalation

        logger.info("SLA breach notification sent", {
          leadId: event.params.leadId,
        });
      }
    } catch (error) {
      logger.error("Error in onLeadSLABreach trigger", {error});
    }
  }
);
