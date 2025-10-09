// Run with: firebase exec seed-accounts-firestore.js
const admin = require('firebase-admin');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const app = initializeApp();
const db = getFirestore(app);

const repUserId = 'kz41QuuZT7dMEs6QmJPSlbYUvAp2';

const accounts = [
  { name: "Royal Laminates & Hardware", type: "distributor", contactPerson: "Mr. Rajesh Sharma", phone: "+919876543210", address: "Shop No. 45, Lajpat Nagar Market", city: "Delhi", state: "Delhi", pincode: "110024", territory: "Delhi NCR" },
  { name: "Premier Ply & Boards", type: "dealer", contactPerson: "Mr. Amit Kumar", phone: "+919810234567", address: "G-12, Karol Bagh Industrial Area", city: "Delhi", state: "Delhi", pincode: "110005", territory: "Delhi NCR" },
  { name: "Golden Laminates Depot", type: "distributor", contactPerson: "Mr. Suresh Gupta", phone: "+919811345678", address: "Sector 18, Noida", city: "Noida", state: "Uttar Pradesh", pincode: "201301", territory: "Delhi NCR" },
  { name: "Mehta Plywood & Laminates", type: "dealer", contactPerson: "Mr. Vikram Mehta", phone: "+919414567890", address: "MI Road, C-Scheme", city: "Jaipur", state: "Rajasthan", pincode: "302001", territory: "Rajasthan" },
  { name: "Mumbai Laminates Corporation", type: "distributor", contactPerson: "Mrs. Priya Patel", phone: "+919823456789", address: "Andheri Industrial Estate, Unit 23", city: "Mumbai", state: "Maharashtra", pincode: "400053", territory: "Mumbai Central" },
  { name: "Shree Ganesh Ply House", type: "dealer", contactPerson: "Mr. Ganesh Naik", phone: "+919820112233", address: "Dadar West, Near Station", city: "Mumbai", state: "Maharashtra", pincode: "400028", territory: "Mumbai Central" },
  { name: "Gujarat Laminates Traders", type: "distributor", contactPerson: "Mr. Jayesh Shah", phone: "+919825678901", address: "CG Road, Navrangpura", city: "Ahmedabad", state: "Gujarat", pincode: "380009", territory: "Gujarat" },
  { name: "Perfect Decor & Laminates", type: "dealer", contactPerson: "Mrs. Neha Desai", phone: "+919879123456", address: "Satellite Area, Near ISRO", city: "Ahmedabad", state: "Gujarat", pincode: "380015", territory: "Gujarat" },
  { name: "Artis Laminates Depot", type: "distributor", contactPerson: "Mr. Kumar Reddy", phone: "+919845678901", address: "Peenya Industrial Area, Phase 2", city: "Bangalore", state: "Karnataka", pincode: "560058", territory: "Bangalore South" },
  { name: "Bangalore Ply Mart", type: "dealer", contactPerson: "Mr. Ravi Shankar", phone: "+919880234567", address: "Jayanagar 4th Block", city: "Bangalore", state: "Karnataka", pincode: "560011", territory: "Bangalore South" },
  { name: "Chennai Laminates Hub", type: "distributor", contactPerson: "Mr. Rajendran", phone: "+919840123456", address: "Ambattur Industrial Estate", city: "Chennai", state: "Tamil Nadu", pincode: "600058", territory: "Tamil Nadu" },
  { name: "South Indian Ply & Boards", type: "dealer", contactPerson: "Mrs. Lakshmi Iyer", phone: "+919841234567", address: "T Nagar, Usman Road", city: "Chennai", state: "Tamil Nadu", pincode: "600017", territory: "Tamil Nadu" }
];

async function seed() {
  console.log('🌱 Seeding accounts...\n');
  const batch = db.batch();
  const now = Timestamp.now();

  accounts.forEach((acc, i) => {
    const ref = db.collection('accounts').doc();
    batch.set(ref, { ...acc, id: ref.id, assignedRepUserId: repUserId, status: 'active', createdAt: now, updatedAt: now });
    console.log(`${i+1}. ${acc.name} (${acc.type}) - ${acc.city}`);
  });

  await batch.commit();
  console.log(`\n✅ Added ${accounts.length} accounts!`);
  process.exit(0);
}

seed().catch(e => { console.error('❌ Error:', e); process.exit(1); });
