import {onRequest} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";

const db = getFirestore();

export const checkPendingDSRs = onRequest(async (request, response) => {
  try {
    const userId = 'kz41QuuZT7dMEs6QmJPSlbYUvAp2';

    // Get all DSR reports for this user
    const dsrReports = await db.collection('dsrReports')
      .where('userId', '==', userId)
      .get();

    const allDSRs: any[] = [];
    const pendingDSRs: any[] = [];
    let totalPendingExpenses = 0;
    let totalPendingSheets = 0;

    dsrReports.docs.forEach((doc: any) => {
      const data = doc.data();
      allDSRs.push({
        id: doc.id,
        date: data.date,
        status: data.status,
        totalExpenses: data.totalExpenses,
        totalSheetsSold: data.totalSheetsSold,
      });

      if (data.status === 'pending') {
        pendingDSRs.push({
          id: doc.id,
          date: data.date,
          totalExpenses: data.totalExpenses,
          totalSheetsSold: data.totalSheetsSold,
        });
        totalPendingExpenses += data.totalExpenses || 0;
        totalPendingSheets += data.totalSheetsSold || 0;
      }
    });

    response.json({
      ok: true,
      summary: {
        totalDSRs: allDSRs.length,
        pendingDSRs: pendingDSRs.length,
        totalPendingExpenses,
        totalPendingSheets,
      },
      allDSRs: allDSRs.sort((a, b) => b.date.localeCompare(a.date)),
      pendingDSRs,
    });
  } catch (error: any) {
    console.error('Error:', error);
    response.status(500).json({ok: false, error: error.message});
  }
});
