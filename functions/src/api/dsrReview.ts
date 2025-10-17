/**
 * DSR Review API
 * Allows managers to approve or request revision for DSRs
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {requireAuth} from "../utils/auth";
import {ApiError} from "../types";

const db = getFirestore();

/**
 * Review DSR
 * Allows manager to approve or request revision for a DSR
 *
 * POST /reviewDSR
 * Body: {
 *   reportId: string,  // DSR document ID (format: {userId}_{YYYY-MM-DD})
 *   status: 'approved' | 'needs_revision',
 *   comments?: string  // Optional manager comments
 * }
 */
export const reviewDSR = onRequest(async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const managerId = auth.uid;

    // Get manager's role
    const managerDoc = await db.collection("users").doc(managerId).get();
    if (!managerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found in system",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const managerRole = managerDoc.data()?.role;
    if (managerRole !== "national_head" && managerRole !== "admin") {
      const error: ApiError = {
        ok: false,
        error: "Only National Head or Admin can review DSRs",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Validate request body
    const {reportId, status, comments} = request.body;

    if (!reportId || typeof reportId !== "string") {
      const error: ApiError = {
        ok: false,
        error: "Report ID is required",
        code: "REPORT_ID_REQUIRED",
      };
      response.status(400).json(error);
      return;
    }

    if (!status || !["approved", "needs_revision"].includes(status)) {
      const error: ApiError = {
        ok: false,
        error: "Status must be 'approved' or 'needs_revision'",
        code: "INVALID_STATUS",
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

    // Check if already reviewed
    if (dsrData?.status === "approved") {
      const error: ApiError = {
        ok: false,
        error: "This DSR has already been approved",
        code: "ALREADY_APPROVED",
      };
      response.status(400).json(error);
      return;
    }

    // 4. Update DSR status
    await dsrRef.update({
      status: status,
      reviewedBy: managerId,
      reviewedAt: Timestamp.now(),
      managerComments: comments || "",
    });

    logger.info(`[reviewDSR] ✅ DSR ${reportId} reviewed by ${managerId}: ${status}`);

    // 5. Return success
    response.status(200).json({
      ok: true,
      message: status === "approved" ?
        "DSR approved successfully" :
        "Revision requested for DSR",
    });
  } catch (error: any) {
    logger.error("[reviewDSR] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});

/**
 * Get Pending DSRs
 * Returns list of all pending DSRs for manager review
 *
 * POST /getPendingDSRs
 * Body: {
 *   date?: string  // YYYY-MM-DD (optional, defaults to all pending)
 * }
 */
export const getPendingDSRs = onRequest(async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const managerId = auth.uid;

    // Get manager's role
    const managerDoc = await db.collection("users").doc(managerId).get();
    if (!managerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found in system",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const managerRole = managerDoc.data()?.role;
    if (managerRole !== "national_head" && managerRole !== "admin") {
      const error: ApiError = {
        ok: false,
        error: "Only National Head or Admin can view DSRs",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Query DSRs with optional status filter
    const {date, status} = request.body;

    let query: any = db.collection("dsrReports");

    // Filter by status if provided (pending, approved, rejected)
    // If no status provided or status='all', fetch all DSRs
    if (status && status !== "all") {
      query = query.where("status", "==", status);
    }

    // Optional date filter
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const error: ApiError = {
          ok: false,
          error: "Invalid date format. Expected YYYY-MM-DD",
          code: "INVALID_DATE",
        };
        response.status(400).json(error);
        return;
      }
      query = query.where("date", "==", date);
    }

    const dsrsSnapshot = await query.orderBy("date", "desc").get();

    // Get user names for each DSR
    const dsrsWithUserNames = await Promise.all(
      dsrsSnapshot.docs.map(async (doc: any) => {
        const data = doc.data();
        const userDoc = await db.collection("users").doc(data.userId).get();
        const userName = userDoc.exists ? userDoc.data()?.name : "Unknown";

        return {
          id: doc.id,
          ...data,
          userName: userName,
          generatedAt: data.generatedAt?.toDate().toISOString() || null,
        };
      })
    );

    response.status(200).json({
      ok: true,
      dsrs: dsrsWithUserNames,
    });
  } catch (error: any) {
    logger.error("[getPendingDSRs] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});
