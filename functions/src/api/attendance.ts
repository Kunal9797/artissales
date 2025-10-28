/**
 * Attendance API
 *
 * Check-in and check-out endpoints for daily attendance tracking
 */

import {onRequest} from "firebase-functions/v2/https";
import {firestore} from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  AttendanceRequest,
  AttendanceResponse,
  ApiError,
  Attendance,
} from "../types";
import {
  validateRequiredFields,
  isAcceptableGPSAccuracy,
} from "../utils/validation";
import {isValidCoordinates} from "../utils/geo";
import {requireAuth} from "../utils/auth";

const db = firestore();

/**
 * POST /api/attendance/checkin
 * Mark daily check-in with GPS location
 */
export const checkIn = onRequest({cors: true}, async (request, response) => {
  try {
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

    const body = request.body as AttendanceRequest;

    // Validate required fields
    const validation = validateRequiredFields(body, [
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

    // Validate GPS
    if (!isValidCoordinates(body.lat, body.lon)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid GPS coordinates",
        code: "INVALID_COORDINATES",
      };
      response.status(400).json(error);
      return;
    }

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

    // Check if currently checked in (last action was check-in, not check-out)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = firestore.Timestamp.fromDate(today);

    const todayAttendance = await db
      .collection("attendance")
      .where("userId", "==", auth.uid)
      .where("timestamp", ">=", todayTimestamp)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    // Only block if the LATEST attendance record today is a check-in (meaning they're currently checked in)
    if (!todayAttendance.empty) {
      const latestRecord = todayAttendance.docs[0].data();
      if (latestRecord.type === "check_in") {
        const error: ApiError = {
          ok: false,
          error: "Already checked in. Please check out first.",
          code: "ALREADY_CHECKED_IN",
        };
        response.status(400).json(error);
        return;
      }
    }

    // Create attendance record
    const attendanceData: Partial<Attendance> = {
      userId: auth.uid,
      type: "check_in",
      timestamp: firestore.Timestamp.now(),
      geo: new firestore.GeoPoint(body.lat, body.lon),
      accuracyM: body.accuracyM,
      ...(body.deviceInfo && { deviceInfo: body.deviceInfo }),
    };

    const attendanceRef = await db.collection("attendance").add(
      attendanceData
    );

    logger.info("Check-in recorded", {
      attendanceId: attendanceRef.id,
      userId: auth.uid,
    });

    const result: AttendanceResponse = {
      ok: true,
      id: attendanceRef.id,
      timestamp: attendanceData.timestamp?.toDate().toISOString() || "",
    };

    response.status(200).json(result);
  } catch (error: any) {
    // Detailed error logging
    logger.error("CHECKIN ERROR - Full details:", {
      errorMessage: error?.message || "Unknown error",
      errorStack: error?.stack || "No stack trace",
      errorCode: error?.code,
      errorDetails: error?.details,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });

    const apiError: ApiError = {
      ok: false,
      error: error?.message || "Internal server error",
      code: error?.code || "INTERNAL_ERROR",
      details: {
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.split("\n")[0], // First line only
      },
    };
    response.status(500).json(apiError);
  }
});

/**
 * POST /api/attendance/checkout
 * Mark daily check-out with GPS location
 */
export const checkOut = onRequest({cors: true}, async (request, response) => {
  try {
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

    const body = request.body as AttendanceRequest;

    // Validate required fields
    const validation = validateRequiredFields(body, [
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

    // Validate GPS
    if (!isValidCoordinates(body.lat, body.lon)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid GPS coordinates",
        code: "INVALID_COORDINATES",
      };
      response.status(400).json(error);
      return;
    }

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

    // Check if currently checked in (last action was check-in)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = firestore.Timestamp.fromDate(today);

    const todayAttendance = await db
      .collection("attendance")
      .where("userId", "==", auth.uid)
      .where("timestamp", ">=", todayTimestamp)
      .orderBy("timestamp", "desc")
      .limit(1)
      .get();

    // Must have a check-in record today
    if (todayAttendance.empty) {
      const error: ApiError = {
        ok: false,
        error: "Must check in before checking out",
        code: "NOT_CHECKED_IN",
      };
      response.status(400).json(error);
      return;
    }

    // Only allow checkout if the LATEST attendance record is a check-in (meaning they're currently checked in)
    const latestRecord = todayAttendance.docs[0].data();
    if (latestRecord.type === "check_out") {
      const error: ApiError = {
        ok: false,
        error: "Already checked out. Check in first.",
        code: "ALREADY_CHECKED_OUT",
      };
      response.status(400).json(error);
      return;
    }

    // Create checkout record
    const attendanceData: Partial<Attendance> = {
      userId: auth.uid,
      type: "check_out",
      timestamp: firestore.Timestamp.now(),
      geo: new firestore.GeoPoint(body.lat, body.lon),
      accuracyM: body.accuracyM,
      ...(body.deviceInfo && { deviceInfo: body.deviceInfo }),
    };

    const attendanceRef = await db.collection("attendance").add(
      attendanceData
    );

    logger.info("Check-out recorded", {
      attendanceId: attendanceRef.id,
      userId: auth.uid,
    });

    const result: AttendanceResponse = {
      ok: true,
      id: attendanceRef.id,
      timestamp: attendanceData.timestamp?.toDate().toISOString() || "",
    };

    response.status(200).json(result);
  } catch (error: any) {
    // Detailed error logging
    logger.error("CHECKOUT ERROR - Full details:", {
      errorMessage: error?.message || "Unknown error",
      errorStack: error?.stack || "No stack trace",
      errorCode: error?.code,
      errorDetails: error?.details,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
    });

    const apiError: ApiError = {
      ok: false,
      error: error?.message || "Internal server error",
      code: error?.code || "INTERNAL_ERROR",
      details: {
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.split("\n")[0], // First line only
      },
    };
    response.status(500).json(apiError);
  }
});
