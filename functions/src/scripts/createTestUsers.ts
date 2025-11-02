/**
 * Script to create test users for Google Play review
 * Run with: npm run create-test-users
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'artis-sales-dev'
});

const db = admin.firestore();

async function createTestUsers() {
  console.log('Creating test users for Google Play review...\n');

  // Test Sales Rep
  const repUser = {
    id: 'test-rep-google-play',
    name: 'Test Sales Rep',
    phone: '+919876543210',
    email: 'test-rep@artislaminates.com',
    role: 'rep' as const,
    isActive: true,
    territory: 'Test Territory',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  };

  // Test Manager
  const managerUser = {
    id: 'test-manager-google-play',
    name: 'Test Manager',
    phone: '+919876543211',
    email: 'test-manager@artislaminates.com',
    role: 'area_manager' as const,
    isActive: true,
    territory: 'Test Territory',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now()
  };

  try {
    // Create rep
    await db.collection('users').doc(repUser.id).set(repUser);
    console.log('✅ Created Sales Rep test user');
    console.log(`   Phone: ${repUser.phone}`);
    console.log(`   Role: ${repUser.role}\n`);

    // Create manager
    await db.collection('users').doc(managerUser.id).set(managerUser);
    console.log('✅ Created Manager test user');
    console.log(`   Phone: ${managerUser.phone}`);
    console.log(`   Role: ${managerUser.role}\n`);

    console.log('🎉 Test users created successfully!');
    console.log('\nNext steps:');
    console.log('1. Add these phone numbers to Firebase Auth test numbers:');
    console.log(`   ${repUser.phone} → OTP: 123456`);
    console.log(`   ${managerUser.phone} → OTP: 654321`);
    console.log('\n2. Provide these credentials to Google Play reviewers');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
    throw error;
  }
}

createTestUsers()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
