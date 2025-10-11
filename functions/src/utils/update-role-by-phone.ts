/**
 * Update user role by phone number
 */

import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

const db = getFirestore();

export const updateRoleByPhone = onRequest(async (request, response) => {
  try {
    // Hardcoded for quick fix
    const phone = "+919891234989";
    const role = "national_head";

    logger.info(`Updating all users with phone ${phone} to role ${role}`);

    // Find all users with this phone
    const usersSnapshot = await db.collection("users")
      .where("phone", "==", phone)
      .get();

    if (usersSnapshot.empty) {
      response.status(404).json({
        ok: false,
        error: "No users found with this phone",
      });
      return;
    }

    // Update all matching users
    const updates = usersSnapshot.docs.map((doc) => {
      logger.info(`Updating user ${doc.id}`);
      return doc.ref.update({
        role: role,
        updatedAt: Timestamp.now(),
      });
    });

    await Promise.all(updates);

    const userIds = usersSnapshot.docs.map((doc) => doc.id);

    logger.info(`Successfully updated ${updates.length} user(s)`);

    response.status(200).json({
      ok: true,
      message: `Updated ${updates.length} user(s) to ${role}`,
      userIds: userIds,
      phone: phone,
      role: role,
    });
  } catch (error: any) {
    logger.error("Error updating role:", error);
    response.status(500).json({
      ok: false,
      error: "Internal server error",
      details: error.message,
    });
  }
});
