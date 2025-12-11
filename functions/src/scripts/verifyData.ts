import * as admin from 'firebase-admin';
admin.initializeApp({ projectId: 'artis-sales-dev' });
const db = admin.firestore();

async function verify() {
  const usersSnap = await db.collection('users').get();
  const phoneCount = new Map<string, string[]>();
  
  usersSnap.docs.forEach((doc) => {
    const phone = doc.data().phone;
    if (!phoneCount.has(phone)) phoneCount.set(phone, []);
    phoneCount.get(phone)!.push(doc.data().name + ' (' + doc.id.slice(0,8) + ')');
  });
  
  console.log('=== Duplicate Phone Check ===');
  let hasDupes = false;
  phoneCount.forEach((names, phone) => {
    if (names.length > 1) {
      console.log('DUPLICATE:', phone, '->', names);
      hasDupes = true;
    }
  });
  if (!hasDupes) console.log('No duplicate phone numbers');
  
  console.log('\n=== Reps Without Manager ===');
  const repsWithoutManager = usersSnap.docs.filter((doc) => {
    const d = doc.data();
    return d.role === 'rep' && d.isActive && !d.reportsToUserId;
  });
  
  if (repsWithoutManager.length === 0) {
    console.log('All active reps have reportsToUserId set');
  } else {
    repsWithoutManager.forEach((doc) => {
      console.log('No manager:', doc.data().name, doc.id);
    });
  }
  
  console.log('\n=== User Summary ===');
  const roles = new Map<string, number>();
  usersSnap.docs.forEach((doc) => {
    const role = doc.data().role || 'unknown';
    roles.set(role, (roles.get(role) || 0) + 1);
  });
  roles.forEach((count, role) => console.log(role + ':', count));
  console.log('Total:', usersSnap.size);
}

verify().then(() => process.exit(0));
