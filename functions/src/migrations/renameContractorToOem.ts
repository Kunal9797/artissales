/**
 * Data Migration: Rename "contractor" to "OEM"
 *
 * This script migrates all existing Firestore documents that use the
 * "contractor" account type to use "OEM" instead.
 *
 * Collections affected:
 * - accounts: type field
 * - visits: accountType field
 * - targets: targetsByAccountType keys
 *
 * Usage:
 * Run this as a one-time Cloud Function or via Firebase Admin SDK locally.
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const BATCH_SIZE = 500; // Firestore batch limit

interface MigrationResult {
  collection: string;
  documentsUpdated: number;
  errors: string[];
}

/**
 * Migrate accounts collection: type: "contractor" → type: "OEM"
 */
async function migrateAccounts(): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "accounts",
    documentsUpdated: 0,
    errors: [],
  };

  try {
    const snapshot = await db
      .collection("accounts")
      .where("type", "==", "contractor")
      .get();

    logger.info(`[Migration] Found ${snapshot.size} accounts with type "contractor"`);

    if (snapshot.empty) {
      return result;
    }

    // Process in batches
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      batch.update(doc.ref, {
        type: "OEM",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchCount++;
      result.documentsUpdated++;

      // Commit batch when it reaches the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        logger.info(`[Migration] Committed batch of ${batchCount} accounts`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining documents
    if (batchCount > 0) {
      await batch.commit();
      logger.info(`[Migration] Committed final batch of ${batchCount} accounts`);
    }

    logger.info(`[Migration] ✅ Migrated ${result.documentsUpdated} accounts`);
  } catch (error: any) {
    logger.error("[Migration] ❌ Error migrating accounts:", error);
    result.errors.push(`accounts: ${error.message}`);
  }

  return result;
}

/**
 * Migrate visits collection: accountType: "contractor" → accountType: "OEM"
 */
async function migrateVisits(): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "visits",
    documentsUpdated: 0,
    errors: [],
  };

  try {
    const snapshot = await db
      .collection("visits")
      .where("accountType", "==", "contractor")
      .get();

    logger.info(`[Migration] Found ${snapshot.size} visits with accountType "contractor"`);

    if (snapshot.empty) {
      return result;
    }

    // Process in batches
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      batch.update(doc.ref, {
        accountType: "OEM",
      });
      batchCount++;
      result.documentsUpdated++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        logger.info(`[Migration] Committed batch of ${batchCount} visits`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      logger.info(`[Migration] Committed final batch of ${batchCount} visits`);
    }

    logger.info(`[Migration] ✅ Migrated ${result.documentsUpdated} visits`);
  } catch (error: any) {
    logger.error("[Migration] ❌ Error migrating visits:", error);
    result.errors.push(`visits: ${error.message}`);
  }

  return result;
}

/**
 * Migrate targets collection: targetsByAccountType.contractor → targetsByAccountType.OEM
 *
 * Note: This requires reading all targets and checking if they have the contractor key
 */
async function migrateTargets(): Promise<MigrationResult> {
  const result: MigrationResult = {
    collection: "targets",
    documentsUpdated: 0,
    errors: [],
  };

  try {
    // Get all targets (no direct query for nested field keys)
    const snapshot = await db.collection("targets").get();

    logger.info(`[Migration] Checking ${snapshot.size} targets for contractor key`);

    if (snapshot.empty) {
      return result;
    }

    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();

      // Check if targetsByAccountType.contractor exists
      if (data.targetsByAccountType?.contractor !== undefined) {
        const contractorValue = data.targetsByAccountType.contractor;

        // Update: remove contractor key, add OEM key
        batch.update(doc.ref, {
          "targetsByAccountType.OEM": contractorValue,
          "targetsByAccountType.contractor": admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batchCount++;
        result.documentsUpdated++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          logger.info(`[Migration] Committed batch of ${batchCount} targets`);
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      logger.info(`[Migration] Committed final batch of ${batchCount} targets`);
    }

    logger.info(`[Migration] ✅ Migrated ${result.documentsUpdated} targets`);
  } catch (error: any) {
    logger.error("[Migration] ❌ Error migrating targets:", error);
    result.errors.push(`targets: ${error.message}`);
  }

  return result;
}

/**
 * Run the full migration
 */
export async function runMigration(): Promise<{
  success: boolean;
  results: MigrationResult[];
  totalDocumentsUpdated: number;
}> {
  logger.info("[Migration] 🚀 Starting contractor → OEM migration");

  const results: MigrationResult[] = [];

  // Run migrations in sequence to avoid conflicts
  results.push(await migrateAccounts());
  results.push(await migrateVisits());
  results.push(await migrateTargets());

  const totalDocumentsUpdated = results.reduce(
    (sum, r) => sum + r.documentsUpdated,
    0
  );
  const hasErrors = results.some((r) => r.errors.length > 0);

  logger.info("[Migration] =======================================");
  logger.info(`[Migration] Total documents updated: ${totalDocumentsUpdated}`);
  results.forEach((r) => {
    logger.info(`[Migration]   - ${r.collection}: ${r.documentsUpdated} updated`);
    if (r.errors.length > 0) {
      r.errors.forEach((e) => logger.error(`[Migration]     Error: ${e}`));
    }
  });
  logger.info("[Migration] =======================================");

  if (hasErrors) {
    logger.error("[Migration] ⚠️ Migration completed with errors");
  } else {
    logger.info("[Migration] ✅ Migration completed successfully");
  }

  return {
    success: !hasErrors,
    results,
    totalDocumentsUpdated,
  };
}

// Export for use as a Cloud Function
export { migrateAccounts, migrateVisits, migrateTargets };
