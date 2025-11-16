/**
 * One-time utility to manually trigger DSR compilation
 * Use this for testing the DSR compiler
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore, Timestamp} from "firebase-admin/firestore";
import {
  DSRReport,
  SheetsSalesSummary,
  ExpenseSummary,
  CatalogType,
} from "../types";

const db = getFirestore();

interface DailySummary {
  userId: string;
  date: string;
  checkInAt?: Timestamp;
  checkOutAt?: Timestamp;
  visitIds: string[];
  sheetsSales: Map<CatalogType, number>;
  expenses: Map<string, number>;
}

async function getActiveReps(): Promise<string[]> {
  const usersSnapshot = await db
    .collection("users")
    .where("isActive", "==", true)
    .where("role", "==", "rep")
    .get();

  return usersSnapshot.docs.map((doc) => doc.id);
}

async function compileDailySummary(
  userId: string,
  date: string
): Promise<DailySummary> {
  const summary: DailySummary = {
    userId,
    date,
    visitIds: [],
    sheetsSales: new Map(),
    expenses: new Map(),
  };

  const startOfDay = new Date(`${date}T00:00:00+05:30`);
  const endOfDay = new Date(`${date}T23:59:59+05:30`);

  // Get attendance
  const attendanceSnapshot = await db
    .collection("attendance")
    .where("userId", "==", userId)
    .where("timestamp", ">=", Timestamp.fromDate(startOfDay))
    .where("timestamp", "<=", Timestamp.fromDate(endOfDay))
    .orderBy("timestamp", "asc")
    .get();

  attendanceSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.type === "check_in" && !summary.checkInAt) {
      summary.checkInAt = data.timestamp;
    } else if (data.type === "check_out") {
      summary.checkOutAt = data.timestamp;
    }
  });

  // Get visits
  const visitsSnapshot = await db
    .collection("visits")
    .where("userId", "==", userId)
    .where("timestamp", ">=", Timestamp.fromDate(startOfDay))
    .where("timestamp", "<=", Timestamp.fromDate(endOfDay))
    .get();

  summary.visitIds = visitsSnapshot.docs.map((doc) => doc.id);

  // Get sheets sales
  const sheetsSalesSnapshot = await db
    .collection("sheetsSales")
    .where("userId", "==", userId)
    .where("date", "==", date)
    .get();

  sheetsSalesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    const catalog = data.catalog as CatalogType;
    const count = data.sheetsCount as number;
    const current = summary.sheetsSales.get(catalog) || 0;
    summary.sheetsSales.set(catalog, current + count);
  });

  // Get expenses
  const expensesSnapshot = await db
    .collection("expenses")
    .where("userId", "==", userId)
    .where("date", "==", date)
    .get();

  expensesSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: any) => {
        const category = item.category as string;
        const current = summary.expenses.get(category) || 0;
        summary.expenses.set(category, current + item.amount);
      });
    }
  });

  return summary;
}

async function saveDSRReport(summary: DailySummary): Promise<void> {
  const reportId = `${summary.userId}_${summary.date}`;

  const sheetsSales: SheetsSalesSummary[] = Array.from(
    summary.sheetsSales.entries()
  ).map(([catalog, totalSheets]) => ({
    catalog,
    totalSheets,
  }));

  const expenses: ExpenseSummary[] = Array.from(
    summary.expenses.entries()
  ).map(([category, totalAmount]) => ({
    category,
    totalAmount,
  }));

  const totalSheetsSold = sheetsSales.reduce(
    (sum, item) => sum + item.totalSheets,
    0
  );
  const totalExpenses = expenses.reduce(
    (sum, item) => sum + item.totalAmount,
    0
  );

  // Calculate activity-based presence (NEW - replaces attendance tracking)
  const wasActive =
    summary.visitIds.length > 0 ||
    totalSheetsSold > 0 ||
    totalExpenses > 0;

  const activityCount =
    summary.visitIds.length +
    sheetsSales.length +
    expenses.length;

  // Smart approval: Auto-approve if no sheets or expenses
  const requiresApproval = totalSheetsSold > 0 || totalExpenses > 0;
  const status = requiresApproval ? "pending" : "approved";

  const dsrReport: DSRReport = {
    id: reportId,
    userId: summary.userId,
    date: summary.date,
    checkInAt: summary.checkInAt || null,
    checkOutAt: summary.checkOutAt || null,
    totalVisits: summary.visitIds.length,
    visitIds: summary.visitIds,
    wasActive, // NEW: Activity-based presence
    activityCount, // NEW: Total activity count
    sheetsSales,
    totalSheetsSold,
    expenses,
    totalExpenses,
    status,
    generatedAt: Timestamp.now(),
  };

  await db.collection("dsrReports").doc(reportId).set(dsrReport, {merge: true});
  logger.info(`DSR created for ${summary.userId}: ${status}`, {reportId, totalSheetsSold, totalExpenses});
}

export const triggerDSRCompiler = onRequest(async (request, response) => {
  try {
    // Get date from query param or use today
    const date = (request.query.date as string) || new Date().toISOString().split("T")[0];

    logger.info(`Manually triggering DSR compilation for date: ${date}`);

    const repUserIds = await getActiveReps();
    logger.info(`Found ${repUserIds.length} active reps`);

    for (const userId of repUserIds) {
      try {
        const summary = await compileDailySummary(userId, date);
        await saveDSRReport(summary);
      } catch (error: any) {
        logger.error(`Failed to compile DSR for user ${userId}`, {
          errorMessage: error?.message || String(error),
          errorStack: error?.stack,
          errorCode: error?.code,
          errorName: error?.name,
        });
      }
    }

    response.json({
      ok: true,
      message: `DSR compilation completed for ${repUserIds.length} reps`,
      date,
      repsProcessed: repUserIds.length,
    });
  } catch (error) {
    logger.error("DSR compilation failed", {error});
    response.status(500).json({
      ok: false,
      error: "Failed to compile DSRs",
    });
  }
});
