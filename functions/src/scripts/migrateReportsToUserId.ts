/**
 * Migration Script: Set reportsToUserId for existing sales reps
 *
 * This script assigns all existing active sales reps to Shiv (National Head)
 * Run this after deploying the backend updates.
 *
 * Usage:
 *   cd functions
 *   npx ts-node src/scripts/migrateReportsToUserId.ts
 *
 * Note: This requires GOOGLE_APPLICATION_CREDENTIALS to be set:
 *   export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.config/firebase/kunalg9797_gmail_com_application_default_credentials.json"
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "artis-sales-dev",
  });
}

const db = admin.firestore();

// Shiv's phone number (National Head)
const SHIV_PHONE = "+917043045045";

async function migrateReportsToUserId() {
  console.log("=== Migration: Set reportsToUserId for existing sales reps ===\n");

  try {
    // Step 1: Find Shiv by phone number
    console.log(`1. Finding National Head (Shiv) by phone: ${SHIV_PHONE}`);
    const shivSnapshot = await db
      .collection("users")
      .where("phone", "==", SHIV_PHONE)
      .limit(1)
      .get();

    if (shivSnapshot.empty) {
      console.error("❌ ERROR: Could not find Shiv by phone number!");
      console.log("   Make sure the phone number is correct: +917043045045");
      process.exit(1);
    }

    const shivDoc = shivSnapshot.docs[0];
    const shivId = shivDoc.id;
    const shivData = shivDoc.data();

    console.log(`   ✅ Found: ${shivData.name} (${shivData.role})`);
    console.log(`   User ID: ${shivId}\n`);

    // Step 2: Find all active reps without reportsToUserId
    console.log("2. Finding active sales reps without reportsToUserId...");
    const repsSnapshot = await db
      .collection("users")
      .where("role", "==", "rep")
      .where("isActive", "==", true)
      .get();

    // Filter to reps without reportsToUserId
    const repsToMigrate = repsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return !data.reportsToUserId;
    });

    console.log(`   Found ${repsSnapshot.size} total active reps`);
    console.log(`   ${repsToMigrate.length} reps need migration\n`);

    if (repsToMigrate.length === 0) {
      console.log("✅ No migration needed - all reps already have reportsToUserId");
      process.exit(0);
    }

    // Step 3: Show list of reps to be migrated
    console.log("3. Reps to be migrated:");
    repsToMigrate.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. ${data.name} (${data.phone}) - ${data.territory}`);
    });
    console.log("");

    // Step 4: Batch update reps
    console.log("4. Updating reps with reportsToUserId...");
    const batch = db.batch();

    repsToMigrate.forEach((doc) => {
      batch.update(doc.ref, {
        reportsToUserId: shivId,
        updatedAt: admin.firestore.Timestamp.now(),
      });
    });

    await batch.commit();
    console.log(`   ✅ Successfully updated ${repsToMigrate.length} reps\n`);

    // Step 5: Verify migration
    console.log("5. Verifying migration...");
    const verifySnapshot = await db
      .collection("users")
      .where("role", "==", "rep")
      .where("isActive", "==", true)
      .where("reportsToUserId", "==", shivId)
      .get();

    console.log(`   ✅ ${verifySnapshot.size} reps now report to ${shivData.name}\n`);

    console.log("=== Migration Complete ===");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
migrateReportsToUserId()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
