/**
 * Firestore Security Rules Testing Script
 *
 * This script tests the security rules to ensure proper access control
 * Requires: @firebase/rules-unit-testing
 *
 * Run with: npm install --save-dev @firebase/rules-unit-testing
 *           node firestore-rules-test.js
 */

const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const fs = require('fs');
const path = require('path');

// Load Firestore rules
const rulesPath = path.join(__dirname, '../firestore.rules');
const rules = fs.readFileSync(rulesPath, 'utf8');

let testEnv;

async function setup() {
  // Initialize test environment
  testEnv = await initializeTestEnvironment({
    projectId: 'artis-sales-test',
    firestore: {
      rules: rules,
      host: 'localhost',
      port: 8080,
    },
  });

  console.log('✓ Test environment initialized');
}

async function teardown() {
  await testEnv.cleanup();
  console.log('✓ Test environment cleaned up');
}

// Test utilities
function getAuthContext(uid, role = 'rep') {
  return testEnv.authenticatedContext(uid, {
    role: role,
  });
}

function getUnauthContext() {
  return testEnv.unauthenticatedContext();
}

// ==============================================================================
// TEST SUITE 1: Users Collection
// ==============================================================================
async function testUsersCollection() {
  console.log('\n=== Testing Users Collection ===');

  // Setup test data
  const repContext = getAuthContext('rep123', 'rep');
  const managerContext = getAuthContext('manager123', 'area_manager');
  const unauthContext = getUnauthContext();

  // Pre-populate user documents
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('users').doc('rep123').set({
      id: 'rep123',
      name: 'Test Rep',
      phone: '+919876543210',
      role: 'rep',
    });

    await context.firestore().collection('users').doc('manager123').set({
      id: 'manager123',
      name: 'Test Manager',
      phone: '+919876543211',
      role: 'area_manager',
    });
  });

  // Test 1.1: Unauthenticated users cannot read users
  console.log('Test 1.1: Unauthenticated users cannot read users');
  await assertFails(
    unauthContext.firestore().collection('users').doc('rep123').get()
  );
  console.log('  ✓ PASS: Unauthenticated read denied');

  // Test 1.2: Authenticated users can read users
  console.log('Test 1.2: Authenticated users can read users');
  await assertSucceeds(
    repContext.firestore().collection('users').doc('manager123').get()
  );
  console.log('  ✓ PASS: Authenticated read allowed');

  // Test 1.3: Users can update their own profile
  console.log('Test 1.3: Users can update their own profile');
  await assertSucceeds(
    repContext.firestore().collection('users').doc('rep123').update({
      name: 'Updated Name',
    })
  );
  console.log('  ✓ PASS: Own profile update allowed');

  // Test 1.4: Users cannot update other users' profiles (non-managers)
  console.log('Test 1.4: Reps cannot update other users');
  await assertFails(
    repContext.firestore().collection('users').doc('manager123').update({
      name: 'Hacked',
    })
  );
  console.log('  ✓ PASS: Other user update denied');

  // Test 1.5: Managers can update any user
  console.log('Test 1.5: Managers can update any user');
  await assertSucceeds(
    managerContext.firestore().collection('users').doc('rep123').update({
      name: 'Manager Updated',
    })
  );
  console.log('  ✓ PASS: Manager update allowed');
}

// ==============================================================================
// TEST SUITE 2: Attendance Collection
// ==============================================================================
async function testAttendanceCollection() {
  console.log('\n=== Testing Attendance Collection ===');

  const repContext = getAuthContext('rep123', 'rep');
  const otherRepContext = getAuthContext('rep456', 'rep');
  const managerContext = getAuthContext('manager123', 'area_manager');

  // Pre-populate attendance data
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('attendance').doc('att123').set({
      userId: 'rep123',
      type: 'check_in',
      timestamp: new Date(),
    });
  });

  // Test 2.1: Users can create their own attendance
  console.log('Test 2.1: Users can create their own attendance');
  await assertSucceeds(
    repContext.firestore().collection('attendance').add({
      userId: 'rep123',
      type: 'check_out',
      timestamp: new Date(),
    })
  );
  console.log('  ✓ PASS: Own attendance creation allowed');

  // Test 2.2: Users cannot create attendance for others
  console.log('Test 2.2: Users cannot create attendance for others');
  await assertFails(
    repContext.firestore().collection('attendance').add({
      userId: 'rep456',
      type: 'check_in',
      timestamp: new Date(),
    })
  );
  console.log('  ✓ PASS: Other user attendance creation denied');

  // Test 2.3: Users can read their own attendance
  console.log('Test 2.3: Users can read their own attendance');
  await assertSucceeds(
    repContext.firestore().collection('attendance').doc('att123').get()
  );
  console.log('  ✓ PASS: Own attendance read allowed');

  // Test 2.4: Users cannot read others' attendance
  console.log('Test 2.4: Users cannot read others\' attendance');
  await assertFails(
    otherRepContext.firestore().collection('attendance').doc('att123').get()
  );
  console.log('  ✓ PASS: Other user attendance read denied');

  // Test 2.5: Managers can read all attendance
  console.log('Test 2.5: Managers can read all attendance');
  await assertSucceeds(
    managerContext.firestore().collection('attendance').doc('att123').get()
  );
  console.log('  ✓ PASS: Manager read allowed');
}

// ==============================================================================
// TEST SUITE 3: Visits Collection
// ==============================================================================
async function testVisitsCollection() {
  console.log('\n=== Testing Visits Collection ===');

  const repContext = getAuthContext('rep123', 'rep');
  const otherRepContext = getAuthContext('rep456', 'rep');

  // Test 3.1: Users can create their own visits
  console.log('Test 3.1: Users can create their own visits');
  await assertSucceeds(
    repContext.firestore().collection('visits').add({
      userId: 'rep123',
      accountId: 'acc123',
      accountName: 'Test Account',
      accountType: 'dealer',
      timestamp: new Date(),
      purpose: 'follow_up',
      photos: ['url1', 'url2'],
    })
  );
  console.log('  ✓ PASS: Own visit creation allowed');

  // Test 3.2: Users cannot create visits for others
  console.log('Test 3.2: Users cannot create visits for others');
  await assertFails(
    repContext.firestore().collection('visits').add({
      userId: 'rep456',
      accountId: 'acc123',
      timestamp: new Date(),
    })
  );
  console.log('  ✓ PASS: Other user visit creation denied');
}

// ==============================================================================
// TEST SUITE 4: Expenses Collection
// ==============================================================================
async function testExpensesCollection() {
  console.log('\n=== Testing Expenses Collection ===');

  const repContext = getAuthContext('rep123', 'rep');
  const managerContext = getAuthContext('manager123', 'area_manager');

  // Pre-populate expense data
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('expenses').doc('exp123').set({
      userId: 'rep123',
      date: '2025-10-13',
      items: [
        { category: 'travel', amount: 100, description: 'Bus fare' }
      ],
      totalAmount: 100,
      status: 'pending',
    });

    await context.firestore().collection('expenses').doc('exp456').set({
      userId: 'rep123',
      date: '2025-10-12',
      items: [
        { category: 'food', amount: 200, description: 'Lunch' }
      ],
      totalAmount: 200,
      status: 'approved',
    });
  });

  // Test 4.1: Users can create their own expenses
  console.log('Test 4.1: Users can create their own expenses');
  await assertSucceeds(
    repContext.firestore().collection('expenses').add({
      userId: 'rep123',
      date: '2025-10-13',
      items: [{ category: 'travel', amount: 50, description: 'Auto' }],
      totalAmount: 50,
      status: 'pending',
    })
  );
  console.log('  ✓ PASS: Own expense creation allowed');

  // Test 4.2: Users can update pending expenses
  console.log('Test 4.2: Users can update pending expenses');
  await assertSucceeds(
    repContext.firestore().collection('expenses').doc('exp123').update({
      totalAmount: 150,
    })
  );
  console.log('  ✓ PASS: Pending expense update allowed');

  // Test 4.3: Users cannot update approved expenses
  console.log('Test 4.3: Users cannot update approved expenses');
  await assertFails(
    repContext.firestore().collection('expenses').doc('exp456').update({
      totalAmount: 300,
    })
  );
  console.log('  ✓ PASS: Approved expense update denied');

  // Test 4.4: Managers can update any expense
  console.log('Test 4.4: Managers can approve expenses');
  await assertSucceeds(
    managerContext.firestore().collection('expenses').doc('exp123').update({
      status: 'approved',
      reviewedBy: 'manager123',
    })
  );
  console.log('  ✓ PASS: Manager approval allowed');
}

// ==============================================================================
// TEST SUITE 5: DSR Reports Collection
// ==============================================================================
async function testDSRCollection() {
  console.log('\n=== Testing DSR Reports Collection ===');

  const repContext = getAuthContext('rep123', 'rep');
  const otherRepContext = getAuthContext('rep456', 'rep');
  const managerContext = getAuthContext('manager123', 'area_manager');

  // Pre-populate DSR data
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('dsrReports').doc('rep123_2025-10-13').set({
      id: 'rep123_2025-10-13',
      userId: 'rep123',
      date: '2025-10-13',
      totalVisits: 5,
      status: 'pending',
    });
  });

  // Test 5.1: Users can read their own DSRs
  console.log('Test 5.1: Users can read their own DSRs');
  await assertSucceeds(
    repContext.firestore().collection('dsrReports').doc('rep123_2025-10-13').get()
  );
  console.log('  ✓ PASS: Own DSR read allowed');

  // Test 5.2: Users cannot read others' DSRs
  console.log('Test 5.2: Users cannot read others\' DSRs');
  await assertFails(
    otherRepContext.firestore().collection('dsrReports').doc('rep123_2025-10-13').get()
  );
  console.log('  ✓ PASS: Other user DSR read denied');

  // Test 5.3: Users cannot update their own DSRs
  console.log('Test 5.3: Users cannot update their own DSRs');
  await assertFails(
    repContext.firestore().collection('dsrReports').doc('rep123_2025-10-13').update({
      status: 'approved',
    })
  );
  console.log('  ✓ PASS: Self DSR update denied');

  // Test 5.4: Managers can update DSRs
  console.log('Test 5.4: Managers can approve DSRs');
  await assertSucceeds(
    managerContext.firestore().collection('dsrReports').doc('rep123_2025-10-13').update({
      status: 'approved',
      reviewedBy: 'manager123',
    })
  );
  console.log('  ✓ PASS: Manager approval allowed');
}

// ==============================================================================
// TEST SUITE 6: Events Collection (Outbox Pattern)
// ==============================================================================
async function testEventsCollection() {
  console.log('\n=== Testing Events Collection ===');

  const repContext = getAuthContext('rep123', 'rep');

  // Test 6.1: Users cannot read events
  console.log('Test 6.1: Users cannot read events');
  await assertFails(
    repContext.firestore().collection('events').doc('event123').get()
  );
  console.log('  ✓ PASS: User event read denied');

  // Test 6.2: Users cannot write events
  console.log('Test 6.2: Users cannot write events');
  await assertFails(
    repContext.firestore().collection('events').add({
      eventType: 'TestEvent',
      payload: {},
    })
  );
  console.log('  ✓ PASS: User event write denied');
}

// ==============================================================================
// RUN ALL TESTS
// ==============================================================================
async function runAllTests() {
  try {
    console.log('========================================');
    console.log('Firestore Security Rules Test Suite');
    console.log('========================================');

    await setup();

    await testUsersCollection();
    await testAttendanceCollection();
    await testVisitsCollection();
    await testExpensesCollection();
    await testDSRCollection();
    await testEventsCollection();

    console.log('\n========================================');
    console.log('✓ ALL TESTS PASSED');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n✗ TEST FAILED:', error);
    process.exit(1);
  } finally {
    await teardown();
  }
}

// Run tests
runAllTests();
