const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'artis-sales-dev'
});

const db = admin.firestore();

// Your user ID
const repUserId = 'kz41QuuZT7dMEs6QmJPSlbYUvAp2';

const accounts = [
  // North India
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
    assignedRepUserId: repUserId,
    status: "active"
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
    assignedRepUserId: repUserId,
    status: "active"
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
    assignedRepUserId: repUserId,
    status: "active"
  },
  {
    name: "Mehta Plywood & Laminates",
    type: "dealer",
    contactPerson: "Mr. Vikram Mehta",
    phone: "+919414567890",
    address: "MI Road, C-Scheme",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    territory: "Rajasthan",
    assignedRepUserId: repUserId,
    status: "active"
  },

  // West India
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
    assignedRepUserId: repUserId,
    status: "active"
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
    assignedRepUserId: repUserId,
    status: "active"
  },
  {
    name: "Gujarat Laminates Traders",
    type: "distributor",
    contactPerson: "Mr. Jayesh Shah",
    phone: "+919825678901",
    address: "CG Road, Navrangpura",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380009",
    territory: "Gujarat",
    assignedRepUserId: repUserId,
    status: "active"
  },
  {
    name: "Perfect Decor & Laminates",
    type: "dealer",
    contactPerson: "Mrs. Neha Desai",
    phone: "+919879123456",
    address: "Satellite Area, Near ISRO",
    city: "Ahmedabad",
    state: "Gujarat",
    pincode: "380015",
    territory: "Gujarat",
    assignedRepUserId: repUserId,
    status: "active"
  },

  // South India
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
    assignedRepUserId: repUserId,
    status: "active"
  },
  {
    name: "Bangalore Ply Mart",
    type: "dealer",
    contactPerson: "Mr. Ravi Shankar",
    phone: "+919880234567",
    address: "Jayanagar 4th Block",
    city: "Bangalore",
    state: "Karnataka",
    pincode: "560011",
    territory: "Bangalore South",
    assignedRepUserId: repUserId,
    status: "active"
  },
  {
    name: "Chennai Laminates Hub",
    type: "distributor",
    contactPerson: "Mr. Rajendran",
    phone: "+919840123456",
    address: "Ambattur Industrial Estate",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600058",
    territory: "Tamil Nadu",
    assignedRepUserId: repUserId,
    status: "active"
  },
  {
    name: "South Indian Ply & Boards",
    type: "dealer",
    contactPerson: "Mrs. Lakshmi Iyer",
    phone: "+919841234567",
    address: "T Nagar, Usman Road",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600017",
    territory: "Tamil Nadu",
    assignedRepUserId: repUserId,
    status: "active"
  }
];

async function seedAccounts() {
  console.log('🌱 Starting to seed accounts...\n');

  const batch = db.batch();

  accounts.forEach((account, index) => {
    const docRef = db.collection('accounts').doc();
    const accountData = {
      ...account,
      id: docRef.id,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    batch.set(docRef, accountData);
    console.log(`${index + 1}. ${account.name} (${account.type}) - ${account.city}`);
  });

  await batch.commit();

  console.log(`\n✅ Successfully added ${accounts.length} accounts to Firestore!`);
  console.log('\nYou can view them at:');
  console.log('https://console.firebase.google.com/project/artis-sales-dev/firestore/data/accounts');

  process.exit(0);
}

seedAccounts().catch(error => {
  console.error('❌ Error seeding accounts:', error);
  process.exit(1);
});
