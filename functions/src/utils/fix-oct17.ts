import {onRequest} from "firebase-functions/v2/https";
import {getFirestore, Timestamp} from "firebase-admin/firestore";

const db = getFirestore();

export const fixOct17Data = onRequest(async (request, response) => {
  try {
    const userId = 'kz41QuuZT7dMEs6QmJPSlbYUvAp2';
    const date = '2025-10-17';
    const managerId = 'SYSTEM_FIX';

    const batch = db.batch();

    const expenses = await db.collection('expenses')
      .where('userId', '==', userId)
      .where('date', '==', date)
      .get();

    console.log(`Found ${expenses.size} expenses for ${date}`);
    expenses.docs.forEach((doc: any) => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.category} ${data.amount}`);
      batch.update(doc.ref, {
        status: 'approved',
        reviewedBy: managerId,
        reviewedAt: Timestamp.now(),
      });
    });

    const sheets = await db.collection('sheetsSales')
      .where('userId', '==', userId)
      .where('date', '==', date)
      .get();

    console.log(`Found ${sheets.size} sheet sales for ${date}`);
    sheets.docs.forEach((doc: any) => {
      const data = doc.data();
      console.log(`  - ${doc.id}: ${data.catalog} ${data.sheetsCount}`);
      batch.update(doc.ref, {
        verified: true,
        verifiedBy: managerId,
        verifiedAt: Timestamp.now(),
      });
    });

    await batch.commit();

    response.json({
      ok: true,
      message: 'Fixed Oct 17 data',
      expensesFixed: expenses.size,
      sheetsFixed: sheets.size
    });
  } catch (error: any) {
    console.error('Error:', error);
    response.status(500).json({ok: false, error: error.message});
  }
});
