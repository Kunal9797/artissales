// Seed data utility - run via Cloud Functions
import * as admin from "firebase-admin";
import {onRequest} from "firebase-functions/v2/https";

const repUserId = "kz41QuuZT7dMEs6QmJPSlbYUvAp2";

const accounts = [
  {
    name: "Royal Laminates & Hardware",
    type: "distributor",
    contactPerson: "Mr. Rajesh Sharma",
    phone: "+919876543210",
    address: "Shop No. 45, Lajpat Nagar Market",
    city: "Delhi",
    state: "Delhi",
    pincode: "110024",
    territory: "Delhi NCR",
  },
  {
    name: "Premier Ply & Boards",
    type: "dealer",
    contactPerson: "Mr. Amit Kumar",
    phone: "+919810234567",
    address: "G-12, Karol Bagh Industrial Area",
    city: "Delhi",
    state: "Delhi",
    pincode: "110005",
    territory: "Delhi NCR",
  },
  {
    name: "Golden Laminates Depot",
    type: "distributor",
    contactPerson: "Mr. Suresh Gupta",
    phone: "+919811345678",
    address: "Sector 18, Noida",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    territory: "Delhi NCR",
  },
  {
    name: "Mumbai Laminates Corporation",
    type: "distributor",
    contactPerson: "Mrs. Priya Patel",
    phone: "+919823456789",
    address: "Andheri Industrial Estate, Unit 23",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400053",
    territory: "Mumbai Central",
  },
  {
    name: "Shree Ganesh Ply House",
    type: "dealer",
    contactPerson: "Mr. Ganesh Naik",
    phone: "+919820112233",
    address: "Dadar West, Near Station",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400028",
    territory: "Mumbai Central",
  },
  {
    name: "Artis Laminates Depot",
    type: "distributor",
    contactPerson: "Mr. Kumar Reddy",
    phone: "+919845678901",
    address: "Peenya Industrial Area, Phase 2",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560058",
    territory: "Bangalore South",
  },
];

export const seedAccounts = onRequest(async (request, response) => {
  try {
    const db = admin.firestore();
    const batch = db.batch();
    const now = admin.firestore.Timestamp.now();

    const results: string[] = [];

    accounts.forEach((acc) => {
      const ref = db.collection("accounts").doc();
      const data = {
        ...acc,
        id: ref.id,
        assignedRepUserId: repUserId,
        status: "active",
        createdAt: now,
        updatedAt: now,
      };
      batch.set(ref, data);
      results.push(`${acc.name} (${acc.type}) - ${acc.city}`);
    });

    await batch.commit();

    response.status(200).json({
      ok: true,
      message: `Successfully seeded ${accounts.length} accounts`,
      accounts: results,
    });
  } catch (error: any) {
    response.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});
