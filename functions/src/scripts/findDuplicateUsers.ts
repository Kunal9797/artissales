/**
 * Script to find duplicate user documents
 *
 * This script identifies users with duplicate phone numbers.
 * Duplicates occur when users log in for the first time and the
 * migration code copies their document to a new Auth UID without
 * deleting the original document.
 *
 * Run with: npx ts-node src/scripts/findDuplicateUsers.ts
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "artis-sales-dev",
});

const db = admin.firestore();

interface UserDoc {
  id: string;
  phone: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: admin.firestore.Timestamp | null;
  updatedAt: admin.firestore.Timestamp | null;
}

async function findDuplicateUsers() {
  try {
    console.log("\n=== Finding Duplicate Users ===\n");

    // Query all users (both active and inactive)
    const usersSnapshot = await db.collection("users").get();

    console.log(`Total user documents: ${usersSnapshot.size}\n`);

    // Group users by phone number
    const usersByPhone = new Map<string, UserDoc[]>();

    usersSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const phone = data.phone || "";

      if (!phone) {
        console.log(`Warning: User ${doc.id} has no phone number`);
        return;
      }

      const user: UserDoc = {
        id: doc.id,
        phone: phone,
        name: data.name || "",
        role: data.role || "rep",
        isActive: data.isActive !== false,
        createdAt: data.createdAt || null,
        updatedAt: data.updatedAt || null,
      };

      if (!usersByPhone.has(phone)) {
        usersByPhone.set(phone, []);
      }
      usersByPhone.get(phone)!.push(user);
    });

    // Find duplicates
    let duplicateCount = 0;
    const docsToDelete: string[] = [];

    console.log("=== Duplicate Users Found ===\n");

    usersByPhone.forEach((users, phone) => {
      if (users.length > 1) {
        duplicateCount++;
        console.log(`Phone: ${phone}`);
        console.log(`  Duplicates: ${users.length}`);

        // Sort by updatedAt (newest first) to determine which to keep
        users.sort((a, b) => {
          const aTime = a.updatedAt?.toMillis() || 0;
          const bTime = b.updatedAt?.toMillis() || 0;
          return bTime - aTime;
        });

        users.forEach((user, index) => {
          const createdAt = user.createdAt
            ? user.createdAt.toDate().toISOString()
            : "unknown";
          const updatedAt = user.updatedAt
            ? user.updatedAt.toDate().toISOString()
            : "unknown";

          if (index === 0) {
            console.log(`  [KEEP]   ${user.id}`);
            console.log(`           Name: ${user.name}, Role: ${user.role}`);
            console.log(`           Created: ${createdAt}`);
            console.log(`           Updated: ${updatedAt}`);
          } else {
            console.log(`  [DELETE] ${user.id}`);
            console.log(`           Name: ${user.name}, Role: ${user.role}`);
            console.log(`           Created: ${createdAt}`);
            console.log(`           Updated: ${updatedAt}`);
            docsToDelete.push(user.id);
          }
        });
        console.log("");
      }
    });

    // Summary
    console.log("=== Summary ===\n");
    console.log(`Total documents: ${usersSnapshot.size}`);
    console.log(`Unique phone numbers: ${usersByPhone.size}`);
    console.log(`Duplicate sets found: ${duplicateCount}`);
    console.log(`Documents to delete: ${docsToDelete.length}`);

    if (docsToDelete.length > 0) {
      console.log("\n=== Documents to Delete ===\n");
      docsToDelete.forEach((id) => {
        console.log(`  firebase firestore:delete users/${id} --project artis-sales-dev`);
      });

      console.log("\nOr delete all at once with:");
      console.log(`  ${docsToDelete.map((id) => `users/${id}`).join(" ")}`);
    } else {
      console.log("\nNo duplicates found!");
    }

    console.log("");
    process.exit(0);
  } catch (error) {
    console.error("Error finding duplicates:", error);
    process.exit(1);
  }
}

findDuplicateUsers();
