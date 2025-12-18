/**
 * Merge Duplicate User Documents
 *
 * Fixes the issue where users have duplicate Firestore docs:
 * 1. Old doc with auto-generated ID (created by manager)
 * 2. New doc with Auth UID (created on first login)
 *
 * This script:
 * 1. Keeps the Auth UID document (the one with migratedFrom field)
 * 2. Updates all reportsToUserId references to use Auth UIDs
 * 3. Deletes old duplicate documents
 */

import * as admin from "firebase-admin";

admin.initializeApp({ projectId: "artis-sales-dev" });
const db = admin.firestore();

interface DuplicateSet {
  phone: string;
  name: string;
  authUidDoc: admin.firestore.DocumentSnapshot;
  oldDocs: admin.firestore.DocumentSnapshot[];
}

async function findDuplicateSets(): Promise<DuplicateSet[]> {
  const snapshot = await db.collection("users").get();
  const byPhone: Record<string, admin.firestore.DocumentSnapshot[]> = {};

  for (const doc of snapshot.docs) {
    const phone = doc.data().phone as string;
    if (!phone) continue;
    if (!byPhone[phone]) byPhone[phone] = [];
    byPhone[phone].push(doc);
  }

  const duplicates: DuplicateSet[] = [];

  for (const [phone, docs] of Object.entries(byPhone)) {
    if (docs.length <= 1) continue;

    // Find the doc with migratedFrom (that's the Auth UID doc)
    const authUidDoc = docs.find((d) => d.data()?.migratedFrom);
    const oldDocs = docs.filter((d) => !d.data()?.migratedFrom);

    if (authUidDoc && oldDocs.length > 0) {
      const authData = authUidDoc.data();
      duplicates.push({
        phone,
        name: authData?.name || "Unknown",
        authUidDoc,
        oldDocs,
      });
    } else {
      // No migratedFrom found - need manual inspection
      console.log(`[WARNING] Phone ${phone} has duplicates but no clear migration:`);
      for (const d of docs) {
        const dData = d.data();
        console.log(`  - ${d.id} | ${dData?.name}`);
      }
    }
  }

  return duplicates;
}

async function mergeDuplicates(dryRun = true): Promise<void> {
  console.log(`\n=== ${dryRun ? "DRY RUN" : "LIVE RUN"} - Merging Duplicate Users ===\n`);

  const duplicates = await findDuplicateSets();

  if (duplicates.length === 0) {
    console.log("No duplicates found to merge!");
    return;
  }

  // Build mapping of old IDs to new Auth UIDs
  const idMapping: Record<string, string> = {};
  for (const dup of duplicates) {
    for (const oldDoc of dup.oldDocs) {
      idMapping[oldDoc.id] = dup.authUidDoc.id;
    }
  }

  console.log("ID Mappings (old -> new):");
  for (const [oldId, newId] of Object.entries(idMapping)) {
    console.log(`  ${oldId} -> ${newId}`);
  }
  console.log("");

  // Step 1: Update all reportsToUserId references
  console.log("Step 1: Updating reportsToUserId references...");
  const allUsers = await db.collection("users").get();
  let updatedRefs = 0;

  for (const doc of allUsers.docs) {
    const data = doc.data();
    const oldReportsTo = data.reportsToUserId;

    if (oldReportsTo && idMapping[oldReportsTo]) {
      const newReportsTo = idMapping[oldReportsTo];
      console.log(`  ${data.name}: ${oldReportsTo} -> ${newReportsTo}`);

      if (!dryRun) {
        await doc.ref.update({ reportsToUserId: newReportsTo });
      }
      updatedRefs++;
    }
  }
  console.log(`  Updated ${updatedRefs} references\n`);

  // Step 2: Update any other references (createdByUserId, etc.)
  console.log("Step 2: Checking accounts for createdByUserId...");
  const accounts = await db.collection("accounts").get();
  let updatedAccounts = 0;

  for (const doc of accounts.docs) {
    const data = doc.data();
    const oldCreatedBy = data.createdByUserId;

    if (oldCreatedBy && idMapping[oldCreatedBy]) {
      const newCreatedBy = idMapping[oldCreatedBy];
      console.log(`  Account ${data.name}: createdByUserId ${oldCreatedBy} -> ${newCreatedBy}`);

      if (!dryRun) {
        await doc.ref.update({ createdByUserId: newCreatedBy });
      }
      updatedAccounts++;
    }
  }
  console.log(`  Updated ${updatedAccounts} accounts\n`);

  // Step 3: Delete old duplicate documents
  console.log("Step 3: Deleting old duplicate documents...");
  let deleted = 0;

  for (const dup of duplicates) {
    for (const oldDoc of dup.oldDocs) {
      console.log(`  Deleting ${oldDoc.id} (${dup.name})`);
      if (!dryRun) {
        await oldDoc.ref.delete();
      }
      deleted++;
    }
  }
  console.log(`  Deleted ${deleted} old documents\n`);

  // Summary
  console.log("=== Summary ===");
  console.log(`Duplicate sets processed: ${duplicates.length}`);
  console.log(`reportsToUserId references updated: ${updatedRefs}`);
  console.log(`Accounts createdByUserId updated: ${updatedAccounts}`);
  console.log(`Old documents deleted: ${deleted}`);

  if (dryRun) {
    console.log("\n[DRY RUN] No changes made. Run with --live to apply changes.");
  } else {
    console.log("\n[COMPLETE] All changes applied successfully!");
  }
}

// Run with --live flag to actually make changes
const isLive = process.argv.includes("--live");
mergeDuplicates(!isLive).then(() => process.exit(0));
