/**
 * Firebase Auth Trigger: On User Created
 *
 * This function is triggered when a new user is created in Firebase Auth.
 * It handles migrating user documents from auto-generated IDs to Auth UIDs.
 *
 * Problem it solves:
 * - When a manager adds a user, a Firestore doc is created with auto-generated ID
 * - When that user logs in, they get a Firebase Auth UID (different from doc ID)
 * - This function migrates the doc to use Auth UID and deletes the old doc
 *
 * This is more reliable than client-side migration because:
 * 1. Cloud Functions run server-side with guaranteed execution
 * 2. No risk of app closing mid-migration
 * 3. Atomic operation - either completes fully or fails (can be retried)
 */

import * as functions from "firebase-functions/v1";
import * as logger from "firebase-functions/logger";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

const db = getFirestore();

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  const authUid = user.uid;
  const phoneNumber = user.phoneNumber;

  logger.info(`[onUserCreated] New auth user: ${authUid}, phone: ${phoneNumber}`);

  // Skip if no phone number (shouldn't happen with phone auth)
  if (!phoneNumber) {
    logger.warn(`[onUserCreated] User ${authUid} has no phone number, skipping migration`);
    return;
  }

  try {
    // Check if a user doc already exists with this Auth UID
    const existingDocWithUid = await db.collection("users").doc(authUid).get();
    if (existingDocWithUid.exists) {
      logger.info(`[onUserCreated] User doc already exists with Auth UID ${authUid}, no migration needed`);
      return;
    }

    // Look for a user doc with matching phone number (created by manager)
    const usersSnapshot = await db.collection("users")
      .where("phone", "==", phoneNumber)
      .get();

    if (usersSnapshot.empty) {
      // No existing user doc - this is an unauthorized login attempt
      // The client-side useAuth hook will handle showing error and signing out
      logger.warn(`[onUserCreated] No user doc found for phone ${phoneNumber} - unauthorized login`);
      return;
    }

    // Handle potential duplicates - find the doc that's NOT the Auth UID
    const docsToMigrate = usersSnapshot.docs.filter((doc) => doc.id !== authUid);

    if (docsToMigrate.length === 0) {
      logger.info(`[onUserCreated] All docs already have correct ID, no migration needed`);
      return;
    }

    // Take the first doc (oldest one, created by manager)
    const oldDoc = docsToMigrate[0];
    const oldDocId = oldDoc.id;
    const userData = oldDoc.data();

    logger.info(`[onUserCreated] Migrating user doc from ${oldDocId} to ${authUid}`);

    // Create new doc with Auth UID
    await db.collection("users").doc(authUid).set({
      ...userData,
      id: authUid,
      migratedFrom: oldDocId,
      migratedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    logger.info(`[onUserCreated] Created new doc with Auth UID ${authUid}`);

    // Delete old doc(s) with this phone number (cleanup any duplicates)
    const deletePromises = docsToMigrate.map((doc) => {
      logger.info(`[onUserCreated] Deleting old doc: ${doc.id}`);
      return doc.ref.delete();
    });
    await Promise.all(deletePromises);

    logger.info(`[onUserCreated] ✅ Migration complete: ${oldDocId} -> ${authUid}, deleted ${docsToMigrate.length} old doc(s)`);
  } catch (error: any) {
    logger.error(`[onUserCreated] ❌ Migration failed for ${authUid}:`, error);
    // Don't throw - let the user continue logging in
    // The client-side hook will handle any remaining issues
  }
});
