/**
 * Feedback API - User Support/Help Submissions
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {requireAuth} from "../utils/auth";
import {ApiError, SubmitFeedbackRequest, SubmitFeedbackResponse} from "../types";

const db = getFirestore();

/**
 * Submit user feedback/support request
 * POST /submitFeedback
 */
export const submitFeedback = onRequest(async (request, response) => {
  try {
    // Authenticate user
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const body = request.body as SubmitFeedbackRequest;

    // Validate message is provided
    if (!body.message || body.message.trim().length === 0) {
      const error: ApiError = {
        ok: false,
        error: "Message is required",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    // Validate message length
    const trimmedMessage = body.message.trim();
    if (trimmedMessage.length > 5000) {
      const error: ApiError = {
        ok: false,
        error: "Message must be less than 5000 characters",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    // Validate device info
    if (!body.deviceInfo || !body.deviceInfo.platform || !body.deviceInfo.osVersion || !body.deviceInfo.appVersion) {
      const error: ApiError = {
        ok: false,
        error: "Device info is required (platform, osVersion, appVersion)",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    // Validate screenshot URLs if provided
    const screenshotUrls = body.screenshotUrls || [];
    if (screenshotUrls.length > 5) {
      const error: ApiError = {
        ok: false,
        error: "Maximum 5 screenshots allowed",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    // Validate each screenshot URL is a Firebase Storage URL
    for (const url of screenshotUrls) {
      if (!url.includes("firebasestorage.googleapis.com")) {
        const error: ApiError = {
          ok: false,
          error: "Screenshot URLs must be valid Firebase Storage URLs",
          code: "INVALID_SCREENSHOT_URL",
        };
        response.status(400).json(error);
        return;
      }
    }

    // Get user details for denormalization
    const userRef = db.collection("users").doc(auth.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const userData = userDoc.data()!;

    // Create feedback document
    const feedbackRef = db.collection("feedback").doc();
    const now = Timestamp.now();

    await feedbackRef.set({
      id: feedbackRef.id,
      userId: auth.uid,
      userName: userData.name || "Unknown",
      userRole: userData.role || "rep",
      userPhone: userData.phone || "",
      userTerritory: userData.territory || null,
      message: trimmedMessage,
      screenshotUrls: screenshotUrls,
      deviceInfo: {
        platform: body.deviceInfo.platform,
        osVersion: body.deviceInfo.osVersion,
        appVersion: body.deviceInfo.appVersion,
      },
      status: "new",
      createdAt: now,
    });

    logger.info("Feedback submitted successfully", {
      feedbackId: feedbackRef.id,
      userId: auth.uid,
      userName: userData.name,
      hasScreenshots: screenshotUrls.length > 0,
      screenshotCount: screenshotUrls.length,
    });

    const successResponse: SubmitFeedbackResponse = {
      ok: true,
      feedbackId: feedbackRef.id,
      message: "Feedback submitted successfully. Thank you!",
    };

    response.status(200).json(successResponse);
  } catch (error) {
    logger.error("Error submitting feedback", {error});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    };
    response.status(500).json(apiError);
  }
});
