/**
 * Cleanup script for duplicate visits
 *
 * Identifies duplicates by:
 * - Same userId
 * - Same accountId
 * - Timestamp within 2 minutes of each other
 *
 * Keeps: The earliest visit in each duplicate group
 * Deletes: All subsequent visits in the group
 *
 * Run with: npx ts-node src/scripts/cleanupDuplicateVisits.ts
 *
 * Options:
 *   --dry-run     Show what would be deleted without actually deleting (default)
 *   --execute     Actually delete the duplicates
 */

import * as admin from "firebase-admin";
import * as readline from "readline";

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "artis-sales-dev",
});

const db = admin.firestore();

// Time window for considering visits as duplicates (2 minutes in ms)
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

interface VisitDoc {
  id: string;
  userId: string;
  accountId: string;
  accountName: string;
  purpose: string;
  timestamp: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp | null;
}

interface DuplicateGroup {
  keep: VisitDoc;
  duplicates: VisitDoc[];
  timeDiffs: number[];
}

async function promptUser(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

async function cleanupDuplicateVisits(dryRun: boolean = true) {
  try {
    console.log("\n=== Duplicate Visits Cleanup ===\n");
    console.log(`Mode: ${dryRun ? "DRY RUN (no deletions)" : "EXECUTE (will delete)"}\n`);

    // Query all visits ordered by timestamp
    console.log("Fetching all visits...");
    const visitsSnapshot = await db
      .collection("visits")
      .orderBy("timestamp", "asc")
      .get();

    console.log(`Total visits: ${visitsSnapshot.size}\n`);

    // Group visits by userId + accountId
    const groups = new Map<string, VisitDoc[]>();

    visitsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const key = `${data.userId}_${data.accountId}`;

      const visit: VisitDoc = {
        id: doc.id,
        userId: data.userId || "",
        accountId: data.accountId || "",
        accountName: data.accountName || "Unknown",
        purpose: data.purpose || "",
        timestamp: data.timestamp || null,
        createdAt: data.createdAt || null,
      };

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(visit);
    });

    console.log(`Unique user+account combinations: ${groups.size}\n`);

    // Find duplicates within time window
    const duplicateGroups: DuplicateGroup[] = [];
    const toDelete: string[] = [];

    groups.forEach((groupVisits, key) => {
      // Sort by timestamp ascending
      groupVisits.sort((a, b) => {
        const aTime = a.timestamp?.toMillis() || 0;
        const bTime = b.timestamp?.toMillis() || 0;
        return aTime - bTime;
      });

      // Find consecutive visits within the time window
      let i = 0;
      while (i < groupVisits.length) {
        const keep = groupVisits[i];
        const duplicates: VisitDoc[] = [];
        const timeDiffs: number[] = [];

        // Look ahead for duplicates
        let j = i + 1;
        while (j < groupVisits.length) {
          const curr = groupVisits[j];
          const prevTimestamp = duplicates.length > 0
            ? duplicates[duplicates.length - 1].timestamp
            : keep.timestamp;

          const timeDiff = (curr.timestamp?.toMillis() || 0) - (prevTimestamp?.toMillis() || 0);

          if (timeDiff < DUPLICATE_WINDOW_MS) {
            duplicates.push(curr);
            timeDiffs.push(timeDiff);
            toDelete.push(curr.id);
            j++;
          } else {
            break;
          }
        }

        if (duplicates.length > 0) {
          duplicateGroups.push({ keep, duplicates, timeDiffs });
        }

        i = j > i + 1 ? j : i + 1;
      }
    });

    // Report findings
    console.log("=== Duplicate Groups Found ===\n");

    if (duplicateGroups.length === 0) {
      console.log("No duplicates found!\n");
      process.exit(0);
    }

    duplicateGroups.forEach((group, index) => {
      const keepTime = group.keep.timestamp?.toDate().toISOString() || "unknown";
      console.log(`Group ${index + 1}:`);
      console.log(`  Account: ${group.keep.accountName} (${group.keep.accountId})`);
      console.log(`  User: ${group.keep.userId}`);
      console.log(`  [KEEP] ${group.keep.id}`);
      console.log(`         Time: ${keepTime}`);
      console.log(`         Purpose: ${group.keep.purpose}`);

      group.duplicates.forEach((dup, dupIndex) => {
        const dupTime = dup.timestamp?.toDate().toISOString() || "unknown";
        const diffSecs = Math.round(group.timeDiffs[dupIndex] / 1000);
        console.log(`  [DELETE] ${dup.id} (+${diffSecs}s)`);
        console.log(`           Time: ${dupTime}`);
        console.log(`           Purpose: ${dup.purpose}`);
      });
      console.log("");
    });

    // Summary
    console.log("=== Summary ===\n");
    console.log(`Total visits: ${visitsSnapshot.size}`);
    console.log(`Duplicate groups: ${duplicateGroups.length}`);
    console.log(`Visits to delete: ${toDelete.length}`);
    console.log(`Visits after cleanup: ${visitsSnapshot.size - toDelete.length}\n`);

    if (dryRun) {
      console.log("This was a DRY RUN. No visits were deleted.");
      console.log("Run with --execute to actually delete duplicates.\n");
      process.exit(0);
    }

    // Confirm before deletion
    const confirmed = await promptUser(
      `Are you sure you want to delete ${toDelete.length} duplicate visits? (y/N): `
    );

    if (!confirmed) {
      console.log("\nAborted. No visits were deleted.\n");
      process.exit(0);
    }

    // Delete in batches
    console.log("\nDeleting duplicates...\n");

    const batchSize = 500;
    for (let i = 0; i < toDelete.length; i += batchSize) {
      const batch = db.batch();
      const batchIds = toDelete.slice(i, i + batchSize);

      batchIds.forEach((id) => {
        batch.delete(db.collection("visits").doc(id));
      });

      await batch.commit();
      console.log(`Deleted batch ${Math.floor(i / batchSize) + 1} (${batchIds.length} visits)`);
    }

    console.log(`\n✅ Successfully deleted ${toDelete.length} duplicate visits.\n`);

    // Log deleted IDs for audit
    console.log("=== Deleted Visit IDs (for audit) ===\n");
    toDelete.forEach((id) => console.log(id));
    console.log("");

    process.exit(0);
  } catch (error) {
    console.error("Error cleaning up duplicates:", error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const executeMode = args.includes("--execute");
const dryRun = !executeMode;

cleanupDuplicateVisits(dryRun);
