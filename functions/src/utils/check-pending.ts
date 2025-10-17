import {onRequest} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";

const db = getFirestore();

export const checkPendingData = onRequest(async (request, response) => {
  try {
    const userId = 'kz41QuuZT7dMEs6QmJPSlbYUvAp2';

    // Get all pending expenses
    const expenses = await db.collection('expenses')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .get();

    const expensesByDate: Record<string, number> = {};
    expenses.docs.forEach((doc: any) => {
      const data = doc.data();
      expensesByDate[data.date] = (expensesByDate[data.date] || 0) + 1;
    });

    // Get all unverified sheets
    const sheets = await db.collection('sheetsSales')
      .where('userId', '==', userId)
      .where('verified', '==', false)
      .get();

    const sheetsByDate: Record<string, number> = {};
    const sheetCountByDate: Record<string, number> = {};
    sheets.docs.forEach((doc: any) => {
      const data = doc.data();
      sheetsByDate[data.date] = (sheetsByDate[data.date] || 0) + 1;
      sheetCountByDate[data.date] = (sheetCountByDate[data.date] || 0) + data.sheetsCount;
    });

    response.json({
      ok: true,
      summary: {
        totalPendingExpenses: expenses.size,
        totalUnverifiedSheetRecords: sheets.size,
        totalUnverifiedSheets: sheets.docs.reduce((sum: number, doc: any) => sum + doc.data().sheetsCount, 0)
      },
      expensesByDate,
      sheetsByDate,
      sheetCountByDate
    });
  } catch (error: any) {
    console.error('Error:', error);
    response.status(500).json({ok: false, error: error.message});
  }
});
