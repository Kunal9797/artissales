/**
 * Script to create a national head user
 */

import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "artis-sales-dev",
});

const db = admin.firestore();

async function createNationalHead() {
  try {
    const phone = "+919891234989";
    const name = "Test Manager";
    const role = "national_head";
    const territory = "National";

    console.log(`\n🔄 Creating national_head user...\n`);
    console.log(`Phone: ${phone}`);
    console.log(`Name: ${name}`);
    console.log(`Role: ${role}`);
    console.log(`Territory: ${territory}\n`);

    // Check if user with this phone already exists
    const existingUsers = await db.collection("users")
      .where("phone", "==", phone)
      .get();

    if (!existingUsers.empty) {
      const existingDoc = existingUsers.docs[0];
      console.log(`⚠️  User with phone ${phone} already exists!`);
      console.log(`User ID: ${existingDoc.id}`);
      console.log(`Updating role to national_head...\n`);

      await existingDoc.ref.update({
        role: role,
        updatedAt: Timestamp.now(),
      });

      console.log(`✅ Successfully updated existing user to national_head\n`);
      console.log(`User ID: ${existingDoc.id}`);
      process.exit(0);
    }

    // Create new user document
    const newUserRef = db.collection("users").doc();
    const userId = newUserRef.id;

    await newUserRef.set({
      id: userId,
      phone: phone,
      name: name,
      email: "",
      role: role,
      isActive: true,
      territory: territory,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    console.log(`✅ Successfully created national_head user!\n`);
    console.log(`User ID: ${userId}`);
    console.log(`Phone: ${phone}`);
    console.log(`Role: ${role}\n`);
    console.log(`🎉 Now login with this phone number to test the Manager Dashboard!\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating user:", error);
    process.exit(1);
  }
}

createNationalHead();
