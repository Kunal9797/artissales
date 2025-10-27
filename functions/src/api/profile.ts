/**
 * Profile API - Update User Profile
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {requireAuth} from "../utils/auth";
import {ApiError} from "../types";

const db = getFirestore();

interface UpdateProfileRequest {
  name?: string;
  email?: string;
  profilePhotoUrl?: string;
}

/**
 * Update user profile (name, email)
 * PUT /updateProfile
 */
export const updateProfile = onRequest(async (request, response) => {
  try {
    // Authenticate user
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const body = request.body as UpdateProfileRequest;

    // Validate: at least one field must be provided
    if (body.name === undefined && body.email === undefined && body.profilePhotoUrl === undefined) {
      const error: ApiError = {
        ok: false,
        error: "At least one field (name, email, or profilePhotoUrl) must be provided",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    // Validate name if provided
    if (body.name !== undefined) {
      const trimmedName = body.name.trim();
      if (trimmedName.length < 2) {
        const error: ApiError = {
          ok: false,
          error: "Name must be at least 2 characters",
          code: "INVALID_NAME",
        };
        response.status(400).json(error);
        return;
      }
      if (trimmedName.length > 100) {
        const error: ApiError = {
          ok: false,
          error: "Name must be less than 100 characters",
          code: "INVALID_NAME",
        };
        response.status(400).json(error);
        return;
      }
    }

    // Validate email if provided
    if (body.email !== undefined && body.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email.trim())) {
        const error: ApiError = {
          ok: false,
          error: "Invalid email format",
          code: "INVALID_EMAIL",
        };
        response.status(400).json(error);
        return;
      }
    }

    // Validate profilePhotoUrl if provided
    if (body.profilePhotoUrl !== undefined && body.profilePhotoUrl.trim().length > 0) {
      const photoUrl = body.profilePhotoUrl.trim();
      // Check if it's a valid Firebase Storage URL
      if (!photoUrl.includes("firebasestorage.googleapis.com")) {
        const error: ApiError = {
          ok: false,
          error: "Profile photo URL must be a valid Firebase Storage URL",
          code: "INVALID_PHOTO_URL",
        };
        response.status(400).json(error);
        return;
      }
    }

    // Get user document
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

    // Build update data
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (body.name !== undefined) {
      updateData.name = body.name.trim();
    }

    if (body.email !== undefined) {
      updateData.email = body.email.trim() || null; // null if empty string
    }

    if (body.profilePhotoUrl !== undefined) {
      updateData.profilePhotoUrl = body.profilePhotoUrl.trim() || null; // null if empty string
    }

    // Update user document
    await userRef.update(updateData);

    logger.info("Profile updated successfully", {
      userId: auth.uid,
      updatedFields: Object.keys(updateData).filter((k) => k !== "updatedAt"),
    });

    response.status(200).json({
      ok: true,
      message: "Profile updated successfully",
      data: updateData,
    });
  } catch (error) {
    logger.error("Error updating profile", {error});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
    };
    response.status(500).json(apiError);
  }
});
