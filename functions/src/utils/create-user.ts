/**
 * Utility to manually create a user document
 * Run this once via Firebase Functions to create your user
 */

import {onRequest} from "firebase-functions/v2/https";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {requireAuth} from "./auth";

const db = getFirestore();

export const createUser = onRequest(async (request, response) => {
  try {
    // SECURITY: Admin only - verify authentication and role
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    // Check if caller is admin
    const callerDoc = await db.collection("users").doc(auth.uid).get();
    if (!callerDoc.exists || callerDoc.data()?.role !== "admin") {
      response.status(403).json({
        ok: false,
        error: "Admin role required",
        code: "FORBIDDEN",
      });
      return;
    }

    const {userId, phone, name, email, role} = request.body;

    if (!userId || !phone) {
      response.status(400).json({
        ok: false,
        error: "userId and phone are required",
      });
      return;
    }

    await db.collection("users").doc(userId).set({
      id: userId,
      phone: phone,
      name: name || "",
      email: email || "",
      role: role || "rep",
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    logger.info("User created", {userId});

    response.status(200).json({
      ok: true,
      message: "User created successfully",
      userId,
    });
  } catch (error) {
    logger.error("Error creating user", {error});
    response.status(500).json({
      ok: false,
      error: "Failed to create user",
    });
  }
});
