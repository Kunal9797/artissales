const admin = require('firebase-admin');

// Initialize Firebase Admin with project ID
admin.initializeApp({
  projectId: 'artis-sales-dev'
});
const db = admin.firestore();

async function addTestOEMs() {
  const oems = [
    {
      name: "Rajesh Kumar (Site Supervisor)",
      type: "OEM",
      contactPerson: "Rajesh Kumar",
      phone: "+919876543210",
      email: "rajesh.oem@gmail.com",
      birthdate: "1985-03-15",
      address: "Site 12, DLF Phase 3, Sector 24",
      city: "Gurugram",
      state: "Haryana",
      pincode: "122002",
      territory: "Delhi NCR",
      assignedRepUserId: "test_rep_1",
      status: "active",
      createdByUserId: "test_rep_1",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    },
    {
      name: "Vijay Builders - Amit Sharma",
      type: "OEM",
      contactPerson: "Amit Sharma",
      phone: "+919876543211",
      email: "amit@vijaybuilders.com",
      birthdate: "1982-07-22",
      address: "Construction Site, Electronic City Phase 1",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560100",
      territory: "South India",
      assignedRepUserId: "test_rep_1",
      status: "active",
      createdByUserId: "test_rep_1",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    },
    {
      name: "Pradeep Construction Co.",
      type: "OEM",
      contactPerson: "Pradeep Singh",
      phone: "+919876543212",
      email: "pradeep.construction@yahoo.com",
      birthdate: "1978-11-08",
      address: "Hiranandani Gardens Site Office",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400076",
      territory: "West India",
      assignedRepUserId: "test_rep_1",
      parentDistributorId: "test_dist_1",
      status: "active",
      createdByUserId: "test_rep_1",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    },
    {
      name: "Santosh Yadav (Independent)",
      type: "OEM",
      contactPerson: "Santosh Yadav",
      phone: "+919876543213",
      birthdate: "1990-01-25",
      address: "Banjara Hills Project Site",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500034",
      territory: "South India",
      assignedRepUserId: "test_rep_1",
      status: "active",
      createdByUserId: "test_rep_1",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    },
    {
      name: "Modern Interiors - Suresh Reddy",
      type: "OEM",
      contactPerson: "Suresh Reddy",
      phone: "+919876543214",
      email: "suresh@moderninteriors.in",
      birthdate: "1987-09-12",
      address: "Koramangala Commercial Complex Site",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560034",
      territory: "South India",
      assignedRepUserId: "test_rep_1",
      status: "active",
      createdByUserId: "test_rep_1",
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    }
  ];

  console.log('Adding 5 test OEMs...\n');

  for (const oem of oems) {
    const docRef = db.collection('accounts').doc();
    oem.id = docRef.id;
    await docRef.set(oem);
    console.log(`✅ Added: ${oem.name} (${oem.city})`);
  }

  console.log('\n✨ All 5 test OEMs added successfully!');
  process.exit(0);
}

addTestOEMs().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
