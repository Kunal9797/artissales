const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'artis-sales-dev',
  storageBucket: 'artis-sales-dev.firebasestorage.app'
});

const db = admin.firestore();

async function findDuplicateUsers() {
  console.log('\n🔍 Finding duplicate users in Firestore...\n');

  try {
    const usersSnapshot = await db.collection('users').get();

    console.log(`📊 Total users found: ${usersSnapshot.size}\n`);

    const usersByPhone = new Map();
    const usersByName = new Map();
    const allUsers = [];

    usersSnapshot.forEach((doc) => {
      const data = doc.data();
      const user = {
        id: doc.id,
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        role: data.role || '',
        territory: data.territory || '',
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate().toISOString() || 'N/A'
      };

      allUsers.push(user);

      // Track by phone
      if (user.phone) {
        if (!usersByPhone.has(user.phone)) {
          usersByPhone.set(user.phone, []);
        }
        usersByPhone.get(user.phone).push(user);
      }

      // Track by name
      if (user.name) {
        if (!usersByName.has(user.name)) {
          usersByName.set(user.name, []);
        }
        usersByName.get(user.name).push(user);
      }
    });

    console.log('👥 All users:');
    console.log('═'.repeat(80));
    allUsers.forEach(user => {
      console.log(`ID: ${user.id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Phone: ${user.phone}`);
      console.log(`Role: ${user.role}`);
      console.log(`Territory: ${user.territory}`);
      console.log(`Active: ${user.isActive}`);
      console.log(`Created: ${user.createdAt}`);
      console.log('─'.repeat(80));
    });

    console.log('\n🔴 DUPLICATES BY PHONE NUMBER:');
    console.log('═'.repeat(80));
    let phoneDuplicates = 0;
    usersByPhone.forEach((users, phone) => {
      if (users.length > 1) {
        phoneDuplicates++;
        console.log(`\n📞 Phone: ${phone} (${users.length} users)`);
        users.forEach((user, index) => {
          console.log(`  [${index + 1}] ${user.name} (${user.id}) - Role: ${user.role}, Created: ${user.createdAt}`);
        });
      }
    });

    if (phoneDuplicates === 0) {
      console.log('✅ No duplicates by phone number');
    }

    console.log('\n\n🔴 DUPLICATES BY NAME:');
    console.log('═'.repeat(80));
    let nameDuplicates = 0;
    usersByName.forEach((users, name) => {
      if (users.length > 1) {
        nameDuplicates++;
        console.log(`\n👤 Name: ${name} (${users.length} users)`);
        users.forEach((user, index) => {
          console.log(`  [${index + 1}] ${user.phone} (${user.id}) - Role: ${user.role}, Created: ${user.createdAt}`);
        });
      }
    });

    if (nameDuplicates === 0) {
      console.log('✅ No duplicates by name');
    }

    console.log('\n\n📋 SUMMARY:');
    console.log('═'.repeat(80));
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Duplicate phone numbers: ${phoneDuplicates}`);
    console.log(`Duplicate names: ${nameDuplicates}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findDuplicateUsers();
