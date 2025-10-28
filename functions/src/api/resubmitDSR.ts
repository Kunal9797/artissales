/**
 * Resubmit DSR API
 * Allows sales reps to resubmit a DSR that was marked as needs_revision
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {requireAuth} from "../utils/auth";
import {ApiError} from "../types";

const db = getFirestore();

/**
 * Resubmit DSR
 * Changes DSR status from needs_revision back to pending
 *
 * POST /resubmitDSR
 * Body: {
 *   reportId: string  // DSR document ID (format: {userId}_{YYYY-MM-DD})
 * }
 */
export const resubmitDSR = onRequest(async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const userId = auth.uid;

    // 2. Validate request body
    const {reportId} = request.body;

    if (!reportId || typeof reportId !== "string") {
      const error: ApiError = {
        ok: false,
        error: "Report ID is required",
        code: "REPORT_ID_REQUIRED",
      };
      response.status(400).json(error);
      return;
    }

    // 3. Get DSR document
    const dsrRef = db.collection("dsrReports").doc(reportId);
    const dsrDoc = await dsrRef.get();

    if (!dsrDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "DSR report not found",
        code: "REPORT_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const dsrData = dsrDoc.data();

    // 4. Verify ownership - only the DSR owner can resubmit
    if (dsrData?.userId !== userId) {
      const error: ApiError = {
        ok: false,
        error: "You can only resubmit your own DSRs",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 5. Verify current status is needs_revision
    if (dsrData?.status !== "needs_revision") {
      const error: ApiError = {
        ok: false,
        error: `Cannot resubmit DSR with status: ${dsrData?.status}. Only DSRs with 'needs_revision' status can be resubmitted.`,
        code: "INVALID_STATUS",
      };
      response.status(400).json(error);
      return;
    }

    // 6. Update DSR status back to pending
    await dsrRef.update({
      status: "pending",
      resubmittedAt: Timestamp.now(),
      // Optionally clear manager comments to start fresh
      // managerComments: "",
      // reviewedBy: null,
      // reviewedAt: null,
    });

    logger.info(`[resubmitDSR] ✅ DSR ${reportId} resubmitted by ${userId}`);

    // 7. Return success
    response.status(200).json({
      ok: true,
      message: "DSR resubmitted successfully. It will be reviewed again by your manager.",
    });
  } catch (error: any) {
    logger.error("[resubmitDSR] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});
