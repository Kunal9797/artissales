const admin = require('firebase-admin');

admin.initializeApp({
  projectId: 'artis-sales-dev',
  storageBucket: 'artis-sales-dev.firebasestorage.app'
});

const db = admin.firestore();

async function removeDuplicate() {
  console.log('\n🗑️  Removing duplicate Woodrica catalog entry...\n');
  
  try {
    // Delete the old manual entry (Op665kY4u5rU1W4tcdv6)
    await db.collection('documents').doc('Op665kY4u5rU1W4tcdv6').delete();
    console.log('✅ Deleted: Woodrica Catalog (Op665kY4u5rU1W4tcdv6)');
    console.log('\n✨ Now you should have only 2 documents in the app!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

removeDuplicate();
