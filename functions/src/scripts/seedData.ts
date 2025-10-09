/**
 * Seed data script
 * Run with: npx ts-node src/scripts/seedData.ts
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp({
  projectId: "artis-sales-dev",
});
const db = admin.firestore();

async function seedData() {
  console.log("🌱 Starting seed data creation...\n");

  try {
    // 1. Create test user
    console.log("Creating test user...");
    const testUserId = "test_rep_123";
    await db.collection("users").doc(testUserId).set({
      id: testUserId,
      name: "Test Sales Rep",
      phone: "+919876543210",
      email: "test.rep@artislaminates.com",
      role: "rep",
      isActive: true,
      territory: "Delhi NCR",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    });
    console.log("✅ Test user created: test_rep_123\n");

    // 2. Create test accounts (distributors & dealers)
    console.log("Creating test accounts...");

    const accounts = [
      {
        id: "dist_001",
        name: "ABC Laminates Pvt Ltd",
        type: "distributor" as const,
        territory: "Delhi NCR",
        assignedRepUserId: testUserId,
        contactPerson: "Mr. Sharma",
        phone: "+919876543211",
        email: "sharma@abclaminates.com",
        address: "123 Industrial Area, Delhi",
        city: "Delhi",
        state: "Delhi",
        pincode: "110001",
        geoLocation: new admin.firestore.GeoPoint(28.6139, 77.2090),
        status: "active" as const,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      {
        id: "dist_002",
        name: "XYZ Traders",
        type: "distributor" as const,
        territory: "Delhi NCR",
        assignedRepUserId: testUserId,
        contactPerson: "Mr. Kumar",
        phone: "+919876543212",
        email: "kumar@xyztraders.com",
        address: "456 Market Road, Gurgaon",
        city: "Gurgaon",
        state: "Haryana",
        pincode: "122001",
        geoLocation: new admin.firestore.GeoPoint(28.4595, 77.0266),
        status: "active" as const,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      },
      {
        id: "dealer_001",
        name: "Ramesh Hardware Store",
        type: "dealer" as const,
        territory: "Delhi NCR",
        assignedRepUserId: testUserId,
        contactPerson: "Ramesh Singh",
        phone: "+919876543213",
        address: "789 Main Market, Noida",
        city: "Noida",
        state: "Uttar Pradesh",
        pincode: "201301",
        geoLocation: new admin.firestore.GeoPoint(28.5355, 77.3910),
        status: "active" as const,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      },
    ];

    for (const account of accounts) {
      await db.collection("accounts").doc(account.id).set(account);
      console.log(`✅ Created ${account.type}: ${account.name}`);
    }

    console.log("\n🎉 Seed data creation complete!\n");
    console.log("📝 Summary:");
    console.log("- 1 test user (rep)");
    console.log("- 2 distributors");
    console.log("- 1 dealer");
    console.log("\n✅ You can now test the APIs with this data");
    console.log("\nTest User ID: test_rep_123");
    console.log("Note: You'll need to create a Firebase auth user with this UID to get a token\n");
  } catch (error) {
    console.error("❌ Error creating seed data:", error);
    throw error;
  }
}

// Run the script
seedData()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
