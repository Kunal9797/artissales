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
import {updateUserLastActive} from "../utils/updateLastActive";

const db = firestore();

/**
 * POST /api/visits/log
 *
 * Log a visit after meeting with distributor/dealer
 */
export const logVisit = onRequest({
  cors: true,
  maxInstances: 10,
  concurrency: 5,
}, async (request, response) => {
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

    // Validate verification: must have at least photos OR GPS
    const hasPhotos = Array.isArray(body.photos) && body.photos.length >= 1;
    const hasGPS = body.geo &&
      typeof body.geo.lat === "number" &&
      typeof body.geo.lon === "number";

    if (!hasPhotos && !hasGPS) {
      const error: ApiError = {
        ok: false,
        error: "Either photo or GPS verification is required",
        code: "MISSING_VERIFICATION",
        details: {
          photos: body.photos?.length || 0,
          hasGPS: !!body.geo,
        },
      };
      response.status(400).json(error);
      return;
    }

    // Validate photo URLs (basic check) - only if photos provided
    if (hasPhotos) {
      const invalidPhotos = body.photos!.filter(
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

    // IDEMPOTENCY CHECK: Prevent duplicate visits on network retries
    if (body.requestId) {
      const existingVisit = await db
        .collection("visits")
        .where("requestId", "==", body.requestId)
        .where("userId", "==", auth.uid)
        .limit(1)
        .get();

      if (!existingVisit.empty) {
        // Return existing visit (idempotent response)
        const existing = existingVisit.docs[0].data();
        logger.info("Duplicate request detected, returning existing visit", {
          visitId: existing.id,
          requestId: body.requestId,
          userId: auth.uid,
        });
        const result: VisitLogResponse = {
          ok: true,
          visitId: existing.id,
          timestamp: existing.timestamp?.toDate().toISOString() || "",
          autoCheckedIn: false,
        };
        response.status(200).json(result);
        return;
      }
    }

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
      // Verification method tracking
      verificationMethod: hasPhotos && hasGPS ? "both" : hasPhotos ? "photo" : "gps",
    };

    // Store requestId for idempotency (if provided)
    if (body.requestId) {
      visitData.requestId = body.requestId;
    }

    // Only add notes if it's provided (Firestore rejects undefined)
    if (body.notes) {
      visitData.notes = body.notes;
    }

    // Store GPS data if provided
    if (hasGPS) {
      visitData.geo = {
        lat: body.geo!.lat,
        lon: body.geo!.lon,
        accuracyM: body.geo!.accuracyM || null,
      };
    }

    // Add visit to Firestore
    await visitRef.set(visitData);

    // Update account's lastVisitAt
    await db.collection("accounts").doc(body.accountId).update({
      lastVisitAt: firestore.Timestamp.now(),
    });

    // Update user's lastActiveAt (non-blocking)
    await updateUserLastActive(auth.uid);

    logger.info("Visit logged successfully", {
      visitId: visitRef.id,
      userId: auth.uid,
      accountId: body.accountId,
    });

    // AUTO CHECK-IN: If this is the first visit of the day and user hasn't checked in
    let autoCheckedIn = false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayTimestamp = firestore.Timestamp.fromDate(today);

      // Check if user has already checked in today
      const existingCheckIn = await db
        .collection("attendance")
        .where("userId", "==", auth.uid)
        .where("type", "==", "check_in")
        .where("timestamp", ">=", todayTimestamp)
        .limit(1)
        .get();

      // Check if user has already checked out today
      const existingCheckOut = await db
        .collection("attendance")
        .where("userId", "==", auth.uid)
        .where("type", "==", "check_out")
        .where("timestamp", ">=", todayTimestamp)
        .limit(1)
        .get();

      // Only auto check-in if user hasn't checked in AND hasn't checked out
      if (existingCheckIn.empty && existingCheckOut.empty) {
        // User hasn't checked in yet - create auto check-in
        // Use the visit location if available from body, otherwise no GPS
        const autoCheckInData: any = {
          userId: auth.uid,
          type: "check_in",
          timestamp: firestore.Timestamp.now(),
          accuracyM: -1, // Indicates auto check-in (no GPS)
          method: "auto",
          triggeredBy: "first_visit",
          createdAt: firestore.Timestamp.now(),
        };

        // If client sent GPS coordinates for the visit, use them for check-in
        if (body.geo && body.geo.lat && body.geo.lon) {
          autoCheckInData.geo = new firestore.GeoPoint(body.geo.lat, body.geo.lon);
          if (body.geo.accuracyM) {
            autoCheckInData.accuracyM = body.geo.accuracyM;
          }
        } else {
          autoCheckInData.geo = null;
        }

        await db.collection("attendance").add(autoCheckInData);
        autoCheckedIn = true;

        logger.info("Auto check-in completed", {
          userId: auth.uid,
          visitId: visitRef.id,
          hasGPS: !!body.geo,
        });
      }
    } catch (autoCheckInError: any) {
      // Auto check-in failure should NOT block visit logging
      logger.error("Auto check-in failed (non-blocking)", {
        error: autoCheckInError.message,
        userId: auth.uid,
        visitId: visitRef.id,
      });
    }

    const result: VisitLogResponse = {
      ok: true,
      visitId: visitRef.id,
      timestamp: visitData.timestamp?.toDate().toISOString() || "",
      autoCheckedIn, // Let client know if auto check-in happened
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

    // Only id is truly required - support partial updates
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
        error: "Unauthorized to update this visit",
        code: "UNAUTHORIZED",
      };
      response.status(403).json(error);
      return;
    }

    // Update the visit - only include provided fields (partial update support)
    const updateData: any = {
      updatedAt: firestore.Timestamp.now(),
    };

    if (purpose !== undefined) {
      updateData.purpose = purpose;
    }

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
      fieldsUpdated: Object.keys(updateData).filter((k) => k !== "updatedAt"),
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
