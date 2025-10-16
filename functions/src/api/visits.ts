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

    // Validate required fields (TEMPORARY: photos optional for testing)
    const validation = validateRequiredFields(body, [
      "accountId",
      "purpose",
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

    // TEMPORARY: Make photos optional for testing camera issues
    // Validate photos array (must have at least 1 photo)
    /* TEMPORARY: Commented out for testing
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
    */

    // Validate photo URLs (basic check) - only if photos provided
    if (body.photos && body.photos.length > 0) {
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

    // Create visit reference first to get ID
    const visitRef = db.collection("visits").doc();

    // Create visit document (Firestore doesn't accept undefined values)
    const visitData: any = {
      id: visitRef.id,
      userId: auth.uid,
      accountId: body.accountId,
      accountName: accountData?.name || "Unknown",
      accountType: accountData?.type || "dealer",
      timestamp: firestore.Timestamp.now(),
      purpose: body.purpose,
      photos: body.photos || [], // Default to empty array if no photos
      createdAt: firestore.Timestamp.now(),
    };

    // Only add notes if it's provided (Firestore rejects undefined)
    if (body.notes) {
      visitData.notes = body.notes;
    }

    // Add visit to Firestore
    await visitRef.set(visitData);

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
  } catch (error: any) {
    logger.error("Error logging visit", {error: error.message});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message || "Unknown error",
    };
    response.status(500).json(apiError);
  }
});

/**
 * Get Visit - Fetch a specific visit by ID
 */
export const getVisit = onRequest({cors: true}, async (request, response) => {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {id} = request.body;

    if (!id) {
      const error: ApiError = {
        ok: false,
        error: "Missing required field: id",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    const visitDoc = await db.collection("visits").doc(id).get();

    if (!visitDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Visit not found",
        code: "NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const visitData = visitDoc.data();

    // Verify ownership
    if (visitData?.userId !== auth.uid) {
      const error: ApiError = {
        ok: false,
        error: "Unauthorized to access this visit",
        code: "UNAUTHORIZED",
      };
      response.status(403).json(error);
      return;
    }

    response.status(200).json(visitData);
  } catch (error: any) {
    logger.error("Error fetching visit", {error: error.message});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message || "Unknown error",
    };
    response.status(500).json(apiError);
  }
});

/**
 * Update Visit - Update an existing visit
 */
export const updateVisit = onRequest({cors: true}, async (request, response) => {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {id, purpose, notes, photos} = request.body;

    if (!id || !purpose) {
      const error: ApiError = {
        ok: false,
        error: "Missing required fields: id, purpose",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    const visitRef = db.collection("visits").doc(id);
    const visitDoc = await visitRef.get();

    if (!visitDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Visit not found",
        code: "NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    // Verify ownership
    const visitData = visitDoc.data();
    if (visitData?.userId !== auth.uid) {
      const error: ApiError = {
        ok: false,
        error: "Unauthorized to update this visit",
        code: "UNAUTHORIZED",
      };
      response.status(403).json(error);
      return;
    }

    // Update the visit
    const updateData: any = {
      purpose,
      updatedAt: firestore.Timestamp.now(),
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (photos !== undefined) {
      updateData.photos = photos;
    }

    await visitRef.update(updateData);

    logger.info("Visit updated", {
      visitId: id,
      userId: auth.uid,
      purpose,
    });

    response.status(200).json({ok: true, visitId: id});
  } catch (error: any) {
    logger.error("Error updating visit", {error: error.message});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message || "Unknown error",
    };
    response.status(500).json(apiError);
  }
});

/**
 * Delete Visit - Delete an existing visit
 */
export const deleteVisit = onRequest({cors: true}, async (request, response) => {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {id} = request.body;

    if (!id) {
      const error: ApiError = {
        ok: false,
        error: "Missing required field: id",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    const visitRef = db.collection("visits").doc(id);
    const visitDoc = await visitRef.get();

    if (!visitDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Visit not found",
        code: "NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    // Verify ownership
    const visitData = visitDoc.data();
    if (visitData?.userId !== auth.uid) {
      const error: ApiError = {
        ok: false,
        error: "Unauthorized to delete this visit",
        code: "UNAUTHORIZED",
      };
      response.status(403).json(error);
      return;
    }

    // Delete the visit
    await visitRef.delete();

    logger.info("Visit deleted", {
      visitId: id,
      userId: auth.uid,
    });

    response.status(200).json({ok: true, visitId: id});
  } catch (error: any) {
    logger.error("Error deleting visit", {error: error.message});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message || "Unknown error",
    };
    response.status(500).json(apiError);
  }
});
