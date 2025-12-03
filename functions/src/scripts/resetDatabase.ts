/**
 * Script to reset the database for production launch
 * KEEPS: documents collection
 * DELETES: everything else
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "artis-sales-dev",
});

const db = admin.firestore();

// Collections to DELETE (in order to respect dependencies)
const COLLECTIONS_TO_DELETE = [
  // Activity data first (references users/accounts)
  "visits",
  "sheetsSales",
  "expenses",
  "attendance",
  // Targets and incentives
  "targets",
  "incentiveSchemes",
  "incentiveResults",
  // Accounts (references users)
  "accounts",
  // Internal collections
  "events",
  "leads",
  "pincodeRoutes",
  // Users last
  "users",
];

// Collection to KEEP
const COLLECTIONS_TO_KEEP = ["documents"];

async function deleteCollection(collectionName: string): Promise<number> {
  const collectionRef = db.collection(collectionName);
  const batchSize = 500;
  let totalDeleted = 0;

  while (true) {
    const snapshot = await collectionRef.limit(batchSize).get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    totalDeleted += snapshot.size;

    console.log(`  Deleted batch of ${snapshot.size} docs from ${collectionName}`);

    // Small delay to avoid overwhelming Firestore
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return totalDeleted;
}

async function resetDatabase() {
  console.log("\n" + "=".repeat(60));
  console.log("🗑️  DATABASE RESET SCRIPT");
  console.log("=".repeat(60));
  console.log("\nProject: artis-sales-dev");
  console.log("\n⚠️  WARNING: This will DELETE ALL DATA except documents!\n");

  // Show current counts
  console.log("Current document counts:");
  console.log("-".repeat(40));

  for (const col of [...COLLECTIONS_TO_DELETE, ...COLLECTIONS_TO_KEEP]) {
    try {
      const snapshot = await db.collection(col).count().get();
      const count = snapshot.data().count;
      const action = COLLECTIONS_TO_KEEP.includes(col) ? "✅ KEEP" : "🗑️  DELETE";
      console.log(`  ${col.padEnd(20)}: ${String(count).padStart(4)} docs  ${action}`);
    } catch {
      console.log(`  ${col.padEnd(20)}: error reading`);
    }
  }

  console.log("\n" + "-".repeat(40));
  console.log("Starting deletion in 5 seconds... Press Ctrl+C to cancel\n");

  // Give user a chance to cancel
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Delete collections
  console.log("Deleting collections...\n");

  let grandTotal = 0;
  for (const collectionName of COLLECTIONS_TO_DELETE) {
    console.log(`📦 ${collectionName}...`);
    const deleted = await deleteCollection(collectionName);
    grandTotal += deleted;
    console.log(`   ✅ Deleted ${deleted} documents\n`);
  }

  console.log("=".repeat(60));
  console.log(`\n🎉 DATABASE RESET COMPLETE!`);
  console.log(`   Total documents deleted: ${grandTotal}`);
  console.log(`   Collections preserved: ${COLLECTIONS_TO_KEEP.join(", ")}`);
  console.log("\n" + "=".repeat(60) + "\n");

  process.exit(0);
}

resetDatabase().catch((error) => {
  console.error("❌ Error resetting database:", error);
  process.exit(1);
});
