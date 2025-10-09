/**
 * Visit Logging API
 *
 * Simple endpoint for reps to log visits after meetings
 */

import {onRequest} from "firebase-functions/v2/https";
import {firestore} from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  VisitLogRequest,
  VisitLogResponse,
  ApiError,
  Visit,
} from "../types";
import {
  validateRequiredFields,
  isAcceptableGPSAccuracy,
} from "../utils/validation";
import {isValidCoordinates} from "../utils/geo";
import {requireAuth} from "../utils/auth";

const db = firestore();

/**
 * POST /api/visits/log
 *
 * Log a visit after meeting with distributor/dealer
 */
export const logVisit = onRequest({cors: true}, async (request, response) => {
  try {
    // Only POST allowed
    if (request.method !== "POST") {
      const error: ApiError = {
        ok: false,
        error: "Method not allowed",
        code: "METHOD_NOT_ALLOWED",
      };
      response.status(405).json(error);
      return;
    }

    // Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const body = request.body as VisitLogRequest;

    // Validate required fields
    const validation = validateRequiredFields(body, [
      "accountId",
      "purpose",
      "lat",
      "lon",
      "accuracyM",
    ]);

    if (!validation.valid) {
      const error: ApiError = {
        ok: false,
        error: "Missing required fields",
        code: "VALIDATION_ERROR",
        details: {missing: validation.missing},
      };
      response.status(400).json(error);
      return;
    }

    // Validate GPS coordinates
    if (!isValidCoordinates(body.lat, body.lon)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid GPS coordinates",
        code: "INVALID_COORDINATES",
      };
      response.status(400).json(error);
      return;
    }

    // Validate GPS accuracy
    if (!isAcceptableGPSAccuracy(body.accuracyM, 100)) {
      const error: ApiError = {
        ok: false,
        error: "GPS accuracy too low. Please try again.",
        code: "POOR_GPS_ACCURACY",
        details: {accuracyM: body.accuracyM, required: "≤100m"},
      };
      response.status(400).json(error);
      return;
    }

    // Get account details
    const accountDoc = await db
      .collection("accounts")
      .doc(body.accountId)
      .get();

    if (!accountDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Account not found",
        code: "ACCOUNT_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const accountData = accountDoc.data();

    // Create visit document
    const visitData: Partial<Visit> = {
      userId: auth.uid,
      accountId: body.accountId,
      accountName: accountData?.name || "Unknown",
      accountType: accountData?.type || "dealer",
      timestamp: firestore.Timestamp.now(),
      geo: new firestore.GeoPoint(body.lat, body.lon),
      accuracyM: body.accuracyM,
      purpose: body.purpose,
      notes: body.notes,
      photos: body.photos || [],
      createdAt: firestore.Timestamp.now(),
    };

    // Add visit to Firestore
    const visitRef = await db.collection("visits").add(visitData);

    // Update account's lastVisitAt
    await db.collection("accounts").doc(body.accountId).update({
      lastVisitAt: firestore.Timestamp.now(),
    });

    logger.info("Visit logged successfully", {
      visitId: visitRef.id,
      userId: auth.uid,
      accountId: body.accountId,
    });

    const result: VisitLogResponse = {
      ok: true,
      visitId: visitRef.id,
      timestamp: visitData.timestamp?.toDate().toISOString() || "",
    };

    response.status(200).json(result);
  } catch (error) {
    logger.error("Error logging visit", {error});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error,
    };
    response.status(500).json(apiError);
  }
});
