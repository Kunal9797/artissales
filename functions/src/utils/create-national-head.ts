/**
 * Utility function to create a national head user
 * This can be called via HTTP Cloud Function
 */

import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

export const createNationalHeadUser = onRequest(async (request, response) => {
  try {
    const phone = "+919891234989";
    const name = "Test Manager";
    const role = "national_head";
    const territory = "National";

    logger.info("Creating national_head user...");
    logger.info(`Phone: ${phone}`);

    // Check if user with this phone already exists
    const existingUsers = await db.collection("users")
      .where("phone", "==", phone)
      .get();

    if (!existingUsers.empty) {
      const existingDoc = existingUsers.docs[0];
      logger.info(`User with phone ${phone} already exists!`);
      logger.info(`User ID: ${existingDoc.id}`);
      logger.info("Updating role to national_head...");

      await existingDoc.ref.update({
        role: role,
        updatedAt: Timestamp.now(),
      });

      response.status(200).json({
        ok: true,
        message: "Updated existing user to national_head",
        userId: existingDoc.id,
        phone: phone,
        role: role,
      });
      return;
    }

    // Create new user document
    const newUserRef = db.collection("users").doc();
    const userId = newUserRef.id;

    await newUserRef.set({
      id: userId,
      phone: phone,
      name: name,
      email: "",
      role: role,
      isActive: true,
      territory: territory,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    logger.info("Successfully created national_head user!");
    logger.info(`User ID: ${userId}`);

    response.status(200).json({
      ok: true,
      message: "Successfully created national_head user",
      userId: userId,
      phone: phone,
      role: role,
    });
  } catch (error: any) {
    logger.error("Error creating user:", error);
    response.status(500).json({
      ok: false,
      error: "Failed to create user",
      details: error.message,
    });
  }
});
