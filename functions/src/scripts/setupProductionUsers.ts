/**
 * Script to set up production users for Artis Sales
 *
 * Usage:
 *   1. Edit the TEAM_DATA array below with your actual team info
 *   2. Run: cd functions && npx ts-node src/scripts/setupProductionUsers.ts
 *
 * This script:
 *   - Creates all users with proper phone normalization (+91...)
 *   - Sets JWT custom claims for role-based security
 *   - Handles duplicate phone numbers gracefully
 */

import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "artis-sales-dev",
});

const db = admin.firestore();
const auth = admin.auth();

// ============================================================================
// TEAM DATA - EDIT THIS SECTION WITH YOUR ACTUAL TEAM INFO
// ============================================================================

interface TeamMember {
  name: string;
  phone: string; // 10-digit phone number (will be normalized to +91...)
  email: string;
  role: "admin" | "national_head" | "zonal_head" | "area_manager" | "rep";
  territory: string;
}

const TEAM_DATA: TeamMember[] = [
  // ============ ADMIN ============
  {
    name: "Kunal Gupta",
    phone: "9729037977",
    email: "kunalg9797@gmail.com",
    role: "admin",
    territory: "All India",
  },

  // ============ NATIONAL HEAD ============
  {
    name: "Shiv",
    phone: "7043045045",
    email: "", // Email pending - will be added later
    role: "national_head",
    territory: "All India",
  },

  // ============ SALES REPS ============
  {
    name: "Pankaj Ashok Vighare",
    phone: "9970300264",
    email: "pvighare@gmail.com",
    role: "rep",
    territory: "Nagpur",
  },
  {
    name: "Hardik H Panchal",
    phone: "8980893112",
    email: "hardikpanchal185@gmail.com",
    role: "rep",
    territory: "Ahmedabad",
  },
  {
    name: "Sujit Kumar",
    phone: "9905462235",
    email: "sujitkumar843438@gmail.com",
    role: "rep",
    territory: "Ranchi",
  },
  {
    name: "Vikas Pandey",
    phone: "9335071115",
    email: "pandeyvikas794@gmail.com",
    role: "rep",
    territory: "Vasai (Mumbai)",
  },
  {
    name: "Mukesh Ramesh Ghime",
    phone: "9167135916",
    email: "Mukeshghime@gmail.com",
    role: "rep",
    territory: "Pune, Maharashtra",
  },
  {
    name: "Vishal Devgirkar",
    phone: "9977713443",
    email: "pankhprint.feb@gmail.com",
    role: "rep",
    territory: "Indore, MP",
  },
  {
    name: "Arun Mallick",
    phone: "8697622096",
    email: "arun.mallick86@gmail.com",
    role: "rep",
    territory: "Kolkata",
  },
  {
    name: "Bidya Kumar Verma",
    phone: "7903404887",
    email: "bidyaverma52@gmail.com",
    role: "rep",
    territory: "Dhanbad, Jharkhand",
  },
];

// ============================================================================
// DO NOT EDIT BELOW THIS LINE
// ============================================================================

function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle different formats
  if (digits.length === 10) {
    return `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith("91")) {
    return `+${digits}`;
  } else if (digits.length === 13 && digits.startsWith("91")) {
    return `+${digits.slice(0, 12)}`;
  }

  throw new Error(`Invalid phone number format: ${phone}`);
}

async function setUserCustomClaims(userId: string, role: string): Promise<void> {
  try {
    // Find auth user by custom claim or create mapping
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    if (!userData?.phone) return;

    // Try to find or create auth user
    try {
      const authUser = await auth.getUserByPhoneNumber(userData.phone);
      await auth.setCustomUserClaims(authUser.uid, {role});
      console.log(`    Set custom claims for ${userData.name}: role=${role}`);
    } catch {
      // Auth user doesn't exist yet - they'll get claims on first login
      console.log(`    Note: ${userData.name} will get claims on first login`);
    }
  } catch (error) {
    console.log(`    Warning: Could not set custom claims for user ${userId}`);
  }
}

async function createUser(member: TeamMember): Promise<string | null> {
  try {
    const normalizedPhone = normalizePhone(member.phone);

    // Check for existing user with this phone
    const existingUsers = await db.collection("users")
      .where("phone", "==", normalizedPhone)
      .get();

    if (!existingUsers.empty) {
      const existingDoc = existingUsers.docs[0];
      console.log(`  ⚠️  User with phone ${member.phone} already exists (ID: ${existingDoc.id})`);
      console.log(`      Updating to: ${member.name}, ${member.role}`);

      await existingDoc.ref.update({
        name: member.name,
        email: member.email,
        role: member.role,
        territory: member.territory,
        isActive: true,
        updatedAt: Timestamp.now(),
      });

      await setUserCustomClaims(existingDoc.id, member.role);
      return existingDoc.id;
    }

    // Create new user
    const newUserRef = db.collection("users").doc();
    const userId = newUserRef.id;

    await newUserRef.set({
      id: userId,
      name: member.name,
      phone: normalizedPhone,
      email: member.email,
      role: member.role,
      territory: member.territory,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    await setUserCustomClaims(userId, member.role);

    console.log(`  ✅ Created: ${member.name} (${member.role})`);
    console.log(`      Phone: ${normalizedPhone}`);
    console.log(`      Email: ${member.email}`);
    console.log(`      ID: ${userId}`);

    return userId;
  } catch (error) {
    console.error(`  ❌ Failed to create ${member.name}:`, error);
    return null;
  }
}

async function setupProductionUsers() {
  console.log("\n" + "=".repeat(60));
  console.log("👥 PRODUCTION USER SETUP SCRIPT");
  console.log("=".repeat(60));
  console.log("\nProject: artis-sales-dev");

  // Validate data
  const validMembers = TEAM_DATA.filter((m) => {
    if (m.phone === "XXXXXXXXXX" || m.phone.includes("X")) {
      console.log(`\n⚠️  Skipping ${m.name} - phone number not filled in`);
      return false;
    }
    if (!m.email || m.email.includes("example.com")) {
      console.log(`\n⚠️  Warning: ${m.name} has placeholder email`);
    }
    return true;
  });

  if (validMembers.length === 0) {
    console.log("\n❌ No valid team members found!");
    console.log("   Please edit TEAM_DATA in this script with your actual team info.");
    console.log("\n" + "=".repeat(60) + "\n");
    process.exit(1);
  }

  console.log(`\nCreating ${validMembers.length} users...\n`);

  // Group by role for summary
  const byRole = validMembers.reduce((acc, m) => {
    acc[m.role] = (acc[m.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("Team composition:");
  Object.entries(byRole).forEach(([role, count]) => {
    console.log(`  - ${role}: ${count}`);
  });
  console.log("");

  // Create users
  const results: {success: string[]; failed: string[]} = {
    success: [],
    failed: [],
  };

  for (const member of validMembers) {
    console.log(`\n📝 Processing: ${member.name}`);
    const userId = await createUser(member);
    if (userId) {
      results.success.push(`${member.name} (${member.role})`);
    } else {
      results.failed.push(member.name);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SETUP COMPLETE");
  console.log("=".repeat(60));

  console.log(`\n✅ Successfully created/updated: ${results.success.length} users`);
  results.success.forEach((name) => console.log(`   - ${name}`));

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length} users`);
    results.failed.forEach((name) => console.log(`   - ${name}`));
  }

  // Collect emails for Play Console
  console.log("\n" + "-".repeat(60));
  console.log("📧 EMAILS FOR GOOGLE PLAY CONSOLE INTERNAL TESTING:");
  console.log("-".repeat(60));
  validMembers
    .filter((m) => m.email && !m.email.includes("example.com"))
    .forEach((m) => console.log(`  ${m.email}`));

  console.log("\n" + "=".repeat(60) + "\n");

  process.exit(0);
}

setupProductionUsers().catch((error) => {
  console.error("❌ Error setting up users:", error);
  process.exit(1);
});
