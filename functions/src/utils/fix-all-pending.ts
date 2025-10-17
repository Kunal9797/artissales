import {onRequest} from "firebase-functions/v2/https";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

const db = getFirestore();

export const fixAllPendingData = onRequest(async (request, response) => {
  try {
    const userId = 'kz41QuuZT7dMEs6QmJPSlbYUvAp2';
    const managerId = 'SYSTEM_FIX';

    // Get all pending expenses
    const pendingExpenses = await db.collection('expenses')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .get();

    // Get all unverified sheets
    const unverifiedSheets = await db.collection('sheetsSales')
      .where('userId', '==', userId)
      .where('verified', '==', false)
      .get();

    console.log(`Found ${pendingExpenses.size} pending expenses`);
    console.log(`Found ${unverifiedSheets.size} unverified sheet sales`);

    // Batch update all
    const batch = db.batch();

    pendingExpenses.docs.forEach((doc: any) => {
      const data = doc.data();
      console.log(`  - Approving expense ${doc.id}: ${data.date} ${data.category} ${data.amount}`);
      batch.update(doc.ref, {
        status: 'approved',
        reviewedBy: managerId,
        reviewedAt: Timestamp.now(),
      });
    });

    unverifiedSheets.docs.forEach((doc: any) => {
      const data = doc.data();
      console.log(`  - Verifying sheets ${doc.id}: ${data.date} ${data.catalog} ${data.sheetsCount}`);
      batch.update(doc.ref, {
        verified: true,
        verifiedBy: managerId,
        verifiedAt: Timestamp.now(),
      });
    });

    await batch.commit();

    response.json({
      ok: true,
      message: 'Fixed all pending data',
      expensesFixed: pendingExpenses.size,
      sheetsFixed: unverifiedSheets.size,
      breakdown: {
        expensesByDate: groupByDate(pendingExpenses.docs),
        sheetsByDate: groupByDate(unverifiedSheets.docs),
      }
    });
  } catch (error: any) {
    console.error('Error:', error);
    response.status(500).json({ok: false, error: error.message});
  }
});

function groupByDate(docs: any[]) {
  const grouped: Record<string, number> = {};
  docs.forEach(doc => {
    const date = doc.data().date;
    grouped[date] = (grouped[date] || 0) + 1;
  });
  return grouped;
}
