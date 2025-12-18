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
    // Look for ALL user docs with matching phone number
    const usersSnapshot = await db.collection("users")
      .where("phone", "==", phoneNumber)
      .get();

    if (usersSnapshot.empty) {
      // No existing user doc - this is an unauthorized login attempt
      // The client-side useAuth hook will handle showing error and signing out
      logger.warn(`[onUserCreated] No user doc found for phone ${phoneNumber} - unauthorized login`);
      return;
    }

    // Check if Auth UID doc exists
    const authUidDocExists = usersSnapshot.docs.some((doc) => doc.id === authUid);

    // Find docs that need to be migrated/deleted (old docs not matching Auth UID)
    const oldDocs = usersSnapshot.docs.filter((doc) => doc.id !== authUid);

    if (oldDocs.length === 0) {
      logger.info(`[onUserCreated] No old docs to clean up for ${authUid}`);
      return;
    }

    logger.info(`[onUserCreated] Found ${oldDocs.length} old doc(s) to clean up for ${authUid}`);

    // Build mapping of old IDs to new Auth UID for reference updates
    const oldDocIds = oldDocs.map((doc) => doc.id);

    // If Auth UID doc doesn't exist yet, create it from the first old doc
    if (!authUidDocExists) {
      const oldDoc = oldDocs[0];
      const userData = oldDoc.data();
      const oldDocId = oldDoc.id;

      logger.info(`[onUserCreated] Creating Auth UID doc from ${oldDocId}`);

      await db.collection("users").doc(authUid).set({
        ...userData,
        id: authUid,
        migratedFrom: oldDocId,
        migratedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      logger.info(`[onUserCreated] Created new doc with Auth UID ${authUid}`);
    }

    // Step 1: Update all reportsToUserId references pointing to old IDs
    const allUsersSnapshot = await db.collection("users").get();
    let refsUpdated = 0;

    for (const userDoc of allUsersSnapshot.docs) {
      const data = userDoc.data();
      if (data.reportsToUserId && oldDocIds.includes(data.reportsToUserId)) {
        logger.info(`[onUserCreated] Updating reportsToUserId for ${data.name}: ${data.reportsToUserId} -> ${authUid}`);
        await userDoc.ref.update({
          reportsToUserId: authUid,
          updatedAt: Timestamp.now(),
        });
        refsUpdated++;
      }
    }

    if (refsUpdated > 0) {
      logger.info(`[onUserCreated] Updated ${refsUpdated} reportsToUserId references`);
    }

    // Step 2: Update createdByUserId in accounts collection
    const accountsSnapshot = await db.collection("accounts").get();
    let accountsUpdated = 0;

    for (const accountDoc of accountsSnapshot.docs) {
      const data = accountDoc.data();
      if (data.createdByUserId && oldDocIds.includes(data.createdByUserId)) {
        logger.info(`[onUserCreated] Updating account ${data.name} createdByUserId: ${data.createdByUserId} -> ${authUid}`);
        await accountDoc.ref.update({
          createdByUserId: authUid,
          updatedAt: Timestamp.now(),
        });
        accountsUpdated++;
      }
    }

    if (accountsUpdated > 0) {
      logger.info(`[onUserCreated] Updated ${accountsUpdated} account createdByUserId references`);
    }

    // Step 3: Delete old duplicate documents
    const deletePromises = oldDocs.map((doc) => {
      logger.info(`[onUserCreated] Deleting old doc: ${doc.id}`);
      return doc.ref.delete();
    });
    await Promise.all(deletePromises);

    logger.info(`[onUserCreated] ✅ Migration complete for ${authUid}: cleaned up ${oldDocs.length} old doc(s), updated ${refsUpdated} refs, updated ${accountsUpdated} accounts`);
  } catch (error: any) {
    logger.error(`[onUserCreated] ❌ Migration failed for ${authUid}:`, error);
    // Don't throw - let the user continue logging in
    // The client-side hook will handle any remaining issues
  }
});
