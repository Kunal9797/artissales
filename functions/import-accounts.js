// Simple script using Firebase CLI auth
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

// Use Firebase CLI credentials (no service account needed)
process.env.FIRESTORE_EMULATOR_HOST = ''; // Ensure we're not using emulator
const app = initializeApp({
  projectId: 'artis-sales-dev'
});

const db = getFirestore(app);
const repUserId = 'kz41QuuZT7dMEs6QmJPSlbYUvAp2';

const accounts = [
  { name: "Royal Laminates & Hardware", type: "distributor", contactPerson: "Mr. Rajesh Sharma", phone: "+919876543210", address: "Shop No. 45, Lajpat Nagar Market", city: "Delhi", state: "Delhi", pincode: "110024", territory: "Delhi NCR" },
  { name: "Premier Ply & Boards", type: "dealer", contactPerson: "Mr. Amit Kumar", phone: "+919810234567", address: "G-12, Karol Bagh Industrial Area", city: "Delhi", state: "Delhi", pincode: "110005", territory: "Delhi NCR" },
  { name: "Golden Laminates Depot", type: "distributor", contactPerson: "Mr. Suresh Gupta", phone: "+919811345678", address: "Sector 18, Noida", city: "Noida", state: "Uttar Pradesh", pincode: "201301", territory: "Delhi NCR" },
  { name: "Mumbai Laminates Corporation", type: "distributor", contactPerson: "Mrs. Priya Patel", phone: "+919823456789", address: "Andheri Industrial Estate, Unit 23", city: "Mumbai", state: "Maharashtra", pincode: "400053", territory: "Mumbai Central" },
  { name: "Shree Ganesh Ply House", type: "dealer", contactPerson: "Mr. Ganesh Naik", phone: "+919820112233", address: "Dadar West, Near Station", city: "Mumbai", state: "Maharashtra", pincode: "400028", territory: "Mumbai Central" },
  { name: "Artis Laminates Depot", type: "distributor", contactPerson: "Mr. Kumar Reddy", phone: "+919845678901", address: "Peenya Industrial Area, Phase 2", city: "Bangalore", state: "Karnataka", pincode: "560058", territory: "Bangalore South" }
];

async function importAccounts() {
  console.log('🌱 Importing accounts to Firestore...\n');

  const batch = db.batch();
  const now = Timestamp.now();

  accounts.forEach((acc, i) => {
    const ref = db.collection('accounts').doc();
    const data = {
      ...acc,
      id: ref.id,
      assignedRepUserId: repUserId,
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    batch.set(ref, data);
    console.log(`${i + 1}. ${acc.name} (${acc.type}) - ${acc.city}`);
  });

  await batch.commit();
  console.log(`\n✅ Successfully imported ${accounts.length} accounts!`);
  console.log('View at: https://console.firebase.google.com/project/artis-sales-dev/firestore/data/accounts\n');
  process.exit(0);
}

importAccounts().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
