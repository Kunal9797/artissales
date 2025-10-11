/**
 * Script to update a user's role
 * Usage: npx ts-node src/scripts/update-user-role.ts <userId> <role>
 */

import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

async function updateUserRole(userId: string, newRole: string) {
  try {
    console.log(`\n🔄 Updating user ${userId} to role: ${newRole}\n`);

    // Valid roles
    const validRoles = [
      "rep",
      "area_manager",
      "zonal_head",
      "national_head",
      "admin",
    ];

    if (!validRoles.includes(newRole)) {
      console.error(`❌ Invalid role: ${newRole}`);
      console.log(`Valid roles: ${validRoles.join(", ")}`);
      process.exit(1);
    }

    // Check if user exists
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error(`❌ User not found: ${userId}`);
      process.exit(1);
    }

    const userData = userDoc.data();
    console.log("Current user data:");
    console.log(`  Name: ${userData?.name}`);
    console.log(`  Phone: ${userData?.phone}`);
    console.log(`  Current Role: ${userData?.role}`);
    console.log(`  Territory: ${userData?.territory || "N/A"}`);

    // Update role
    await userRef.update({
      role: newRole,
      updatedAt: Timestamp.now(),
    });

    console.log(`\n✅ Successfully updated role to: ${newRole}\n`);

    // Verify update
    const updatedDoc = await userRef.get();
    const updatedData = updatedDoc.data();
    console.log("Updated user data:");
    console.log(`  Name: ${updatedData?.name}`);
    console.log(`  Phone: ${updatedData?.phone}`);
    console.log(`  New Role: ${updatedData?.role}`);
    console.log(`  Territory: ${updatedData?.territory || "N/A"}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating user role:", error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log("\n📋 Usage: npx ts-node src/scripts/update-user-role.ts <userId> <role>\n");
  console.log("Valid roles:");
  console.log("  - rep");
  console.log("  - area_manager");
  console.log("  - zonal_head");
  console.log("  - national_head");
  console.log("  - admin\n");
  console.log("Example:");
  console.log("  npx ts-node src/scripts/update-user-role.ts kz41QuuZT7dMEs6QmJPSlbYUvAp2 national_head\n");
  process.exit(1);
}

const [userId, role] = args;
updateUserRole(userId, role);
