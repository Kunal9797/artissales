const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'artis-sales-dev',
  storageBucket: 'artis-sales-dev.firebasestorage.app'
});

const db = admin.firestore();

async function cleanupDuplicateUsers() {
  console.log('\n🗑️  Removing duplicate user documents...\n');

  try {
    // Delete duplicate Rahul K (keep kNII8nO6vNJVjTi2N9zv)
    console.log('Deleting Rahul K duplicate (qwI34LsqEVXtgBetbdoSAtEzESj1)...');
    await db.collection('users').doc('qwI34LsqEVXtgBetbdoSAtEzESj1').delete();
    console.log('✅ Deleted: Rahul K duplicate\n');

    // Delete duplicate Test Manager (keep shiv: IsANSsqmn4RWxdzDp4k28xr8jJh2)
    console.log('Deleting Test Manager duplicate (A6fCqoCmBPzP0zYvsDZA)...');
    await db.collection('users').doc('A6fCqoCmBPzP0zYvsDZA').delete();
    console.log('✅ Deleted: Test Manager duplicate\n');

    console.log('✨ Cleanup complete! Remaining users:');
    console.log('  - Kunal (+91919991239999)');
    console.log('  - Rahul K (+917123456789) - single entry');
    console.log('  - shiv (+919891234989) - single entry\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupDuplicateUsers();
