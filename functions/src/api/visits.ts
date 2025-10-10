/**
 * Visit Logging API
 *
 * Simple endpoint for reps to log visits after meetings
 * Uses photo verification instead of GPS
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
import {validateRequiredFields} from "../utils/validation";
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
      "photos",
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

    // Validate photos array (must have at least 1 photo)
    if (!Array.isArray(body.photos) || body.photos.length < 1) {
      const error: ApiError = {
        ok: false,
        error: "At least one photo is required",
        code: "MISSING_PHOTO",
        details: {photos: body.photos?.length || 0, required: "≥1"},
      };
      response.status(400).json(error);
      return;
    }

    // Validate photo URLs (basic check)
    const invalidPhotos = body.photos.filter(
      (url) => !url || typeof url !== "string" || url.trim().length === 0
    );
    if (invalidPhotos.length > 0) {
      const error: ApiError = {
        ok: false,
        error: "Invalid photo URLs",
        code: "INVALID_PHOTO_URL",
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
      purpose: body.purpose,
      notes: body.notes,
      photos: body.photos,
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
