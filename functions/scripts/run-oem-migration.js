/**
 * Runner script for contractor → OEM migration
 *
 * Usage: node run-oem-migration.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'artis-sales-dev'
});

const db = admin.firestore();
const BATCH_SIZE = 500;

async function migrateAccounts() {
  const result = { collection: 'accounts', documentsUpdated: 0, errors: [] };

  try {
    const snapshot = await db
      .collection('accounts')
      .where('type', '==', 'contractor')
      .get();

    console.log(`[Migration] Found ${snapshot.size} accounts with type "contractor"`);

    if (snapshot.empty) {
      return result;
    }

    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      batch.update(doc.ref, {
        type: 'OEM',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      batchCount++;
      result.documentsUpdated++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`[Migration] Committed batch of ${batchCount} accounts`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`[Migration] Committed final batch of ${batchCount} accounts`);
    }

    console.log(`[Migration] ✅ Migrated ${result.documentsUpdated} accounts`);
  } catch (error) {
    console.error('[Migration] ❌ Error migrating accounts:', error);
    result.errors.push(`accounts: ${error.message}`);
  }

  return result;
}

async function migrateVisits() {
  const result = { collection: 'visits', documentsUpdated: 0, errors: [] };

  try {
    const snapshot = await db
      .collection('visits')
      .where('accountType', '==', 'contractor')
      .get();

    console.log(`[Migration] Found ${snapshot.size} visits with accountType "contractor"`);

    if (snapshot.empty) {
      return result;
    }

    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      batch.update(doc.ref, {
        accountType: 'OEM',
      });
      batchCount++;
      result.documentsUpdated++;

      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`[Migration] Committed batch of ${batchCount} visits`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`[Migration] Committed final batch of ${batchCount} visits`);
    }

    console.log(`[Migration] ✅ Migrated ${result.documentsUpdated} visits`);
  } catch (error) {
    console.error('[Migration] ❌ Error migrating visits:', error);
    result.errors.push(`visits: ${error.message}`);
  }

  return result;
}

async function migrateTargets() {
  const result = { collection: 'targets', documentsUpdated: 0, errors: [] };

  try {
    const snapshot = await db.collection('targets').get();

    console.log(`[Migration] Checking ${snapshot.size} targets for contractor key`);

    if (snapshot.empty) {
      return result;
    }

    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();

      if (data.targetsByAccountType?.contractor !== undefined) {
        const contractorValue = data.targetsByAccountType.contractor;

        batch.update(doc.ref, {
          'targetsByAccountType.OEM': contractorValue,
          'targetsByAccountType.contractor': admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batchCount++;
        result.documentsUpdated++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          console.log(`[Migration] Committed batch of ${batchCount} targets`);
          batch = db.batch();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`[Migration] Committed final batch of ${batchCount} targets`);
    }

    console.log(`[Migration] ✅ Migrated ${result.documentsUpdated} targets`);
  } catch (error) {
    console.error('[Migration] ❌ Error migrating targets:', error);
    result.errors.push(`targets: ${error.message}`);
  }

  return result;
}

async function runMigration() {
  console.log('[Migration] 🚀 Starting contractor → OEM migration\n');

  const results = [];

  results.push(await migrateAccounts());
  results.push(await migrateVisits());
  results.push(await migrateTargets());

  const totalDocumentsUpdated = results.reduce((sum, r) => sum + r.documentsUpdated, 0);
  const hasErrors = results.some((r) => r.errors.length > 0);

  console.log('\n[Migration] =======================================');
  console.log(`[Migration] Total documents updated: ${totalDocumentsUpdated}`);
  results.forEach((r) => {
    console.log(`[Migration]   - ${r.collection}: ${r.documentsUpdated} updated`);
    if (r.errors.length > 0) {
      r.errors.forEach((e) => console.error(`[Migration]     Error: ${e}`));
    }
  });
  console.log('[Migration] =======================================\n');

  if (hasErrors) {
    console.error('[Migration] ⚠️ Migration completed with errors');
  } else {
    console.log('[Migration] ✅ Migration completed successfully');
  }

  process.exit(hasErrors ? 1 : 0);
}

runMigration().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
