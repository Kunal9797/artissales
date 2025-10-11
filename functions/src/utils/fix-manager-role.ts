/**
 * Fix manager role by updating the Firebase Auth UID document
 * This handles the case where the user logged in before the migration code was fixed
 */

import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

export const fixManagerRole = onRequest(async (request, response) => {
  try {
    const phone = "+919891234989";
    const role = "national_head";

    logger.info("Fixing manager role for phone:", phone);

    // Find all users with this phone number
    const usersSnapshot = await db.collection("users")
      .where("phone", "==", phone)
      .get();

    if (usersSnapshot.empty) {
      response.status(404).json({
        ok: false,
        error: "No user found with phone: " + phone,
      });
      return;
    }

    // Update all documents with this phone to national_head role
    const updates: any[] = [];
    usersSnapshot.docs.forEach((doc) => {
      logger.info(`Updating user ${doc.id} to ${role}`);
      updates.push(
        doc.ref.update({
          role: role,
          updatedAt: Timestamp.now(),
        })
      );
    });

    await Promise.all(updates);

    logger.info(`Updated ${updates.length} user document(s) to ${role}`);

    response.status(200).json({
      ok: true,
      message: `Updated ${updates.length} user document(s) to ${role}`,
      phone: phone,
      role: role,
      updatedCount: updates.length,
    });
  } catch (error: any) {
    logger.error("Error fixing manager role:", error);
    response.status(500).json({
      ok: false,
      error: "Failed to fix manager role",
      details: error.message,
    });
  }
});
