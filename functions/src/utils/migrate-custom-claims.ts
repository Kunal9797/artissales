/**
 * One-time migration script: Sync all user roles to JWT custom claims
 *
 * USAGE:
 *   firebase deploy --only functions:migrateToCustomClaims
 *   curl -X POST https://us-central1-artis-sales-dev.cloudfunctions.net/migrateToCustomClaims
 *
 * This will:
 * 1. Fetch all users from Firestore
 * 2. Set custom claims (role) for each user
 * 3. Allow firestore.rules to use request.auth.token.role instead of get()
 */

import {onRequest} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import {setUserRoleClaim} from "./customClaims";
import {requireAuth, isNationalHeadOrAdmin} from "./auth";

const db = getFirestore();

export const migrateToCustomClaims = onRequest(
  {cors: true, timeoutSeconds: 540}, // 9 min timeout for large datasets
  async (request, response) => {
    try {
      // SECURITY: Only National Head or Admin can run migration
      const auth = await requireAuth(request);
      if (!("valid" in auth) || !auth.valid) {
        response.status(401).json(auth);
        return;
      }

      const isAuthorized = await isNationalHeadOrAdmin(auth.uid);
      if (!isAuthorized) {
        response.status(403).json({
          ok: false,
          error: "Only National Head or Admin can run this migration",
          code: "INSUFFICIENT_PERMISSIONS",
        });
        return;
      }

      logger.info("Starting custom claims migration...");

      // Fetch all users
      const usersSnapshot = await db.collection("users").get();
      const totalUsers = usersSnapshot.size;

      logger.info(`Found ${totalUsers} users to migrate`);

      let successCount = 0;
      let failureCount = 0;
      const failures: Array<{uid: string; error: string}> = [];

      // Process in batches of 10 to avoid rate limits
      const batchSize = 10;
      const users = usersSnapshot.docs;

      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (doc) => {
            try {
              const userData = doc.data();
              const uid = doc.id;
              const role = userData.role;

              if (!role) {
                logger.warn(`User ${uid} has no role, skipping`);
                failureCount++;
                failures.push({uid, error: "No role defined"});
                return;
              }

              await setUserRoleClaim(uid, role);
              successCount++;

              logger.info(`Migrated user ${uid} (${role})`);
            } catch (error: any) {
              failureCount++;
              failures.push({uid: doc.id, error: error.message});
              logger.error(`Failed to migrate user ${doc.id}`, {error});
            }
          })
        );

        // Log progress every batch
        logger.info(
          `Progress: ${Math.min(i + batchSize, totalUsers)}/${totalUsers} users processed`
        );
      }

      logger.info("Migration complete", {
        total: totalUsers,
        success: successCount,
        failures: failureCount,
      });

      response.status(200).json({
        ok: true,
        message: "Custom claims migration complete",
        summary: {
          totalUsers,
          successCount,
          failureCount,
          failures: failures.slice(0, 10), // Return first 10 failures
        },
      });
    } catch (error: any) {
      logger.error("Migration failed", {error});
      response.status(500).json({
        ok: false,
        error: "Migration failed",
        code: "MIGRATION_ERROR",
        details: error.message,
      });
    }
  }
);
