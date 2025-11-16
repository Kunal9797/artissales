/**
 * DSR Compiler - Scheduled Function
 *
 * Runs daily at 11:00 PM IST
 * Compiles Daily Sales Reports for all active reps
 * Aggregates attendance, visits, leads, sheets sales, and expenses
 */

import {onSchedule} from "firebase-functions/v2/scheduler";
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
  sheetsSales: Map<CatalogType, number>; // catalog -> total sheets
  expenses: Map<string, number>; // category -> total amount
}

/**
 * Get all active sales reps (exclude managers/admins)
 */
async function getActiveReps(): Promise<string[]> {
  const usersSnapshot = await db
    .collection("users")
    .where("isActive", "==", true)
    .where("role", "==", "rep")
    .get();

  return usersSnapshot.docs.map((doc) => doc.id);
}

/**
 * Compile daily summary for a single rep
 */
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

  // Date boundaries (start of day to end of day in IST)
  const startOfDay = new Date(`${date}T00:00:00+05:30`);
  const endOfDay = new Date(`${date}T23:59:59+05:30`);

  // 1. Get attendance records (check-in/out)
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
      summary.checkOutAt = data.timestamp; // Take last check-out
    }
  });

  // 2. Get visits
  const visitsSnapshot = await db
    .collection("visits")
    .where("userId", "==", userId)
    .where("timestamp", ">=", Timestamp.fromDate(startOfDay))
    .where("timestamp", "<=", Timestamp.fromDate(endOfDay))
    .get();

  summary.visitIds = visitsSnapshot.docs.map((doc) => doc.id);

  // 3. Get sheets sales (by date string match)
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

  // 5. Get expenses (by date string match)
  const expensesSnapshot = await db
    .collection("expenses")
    .where("userId", "==", userId)
    .where("date", "==", date)
    .get();

  expensesSnapshot.docs.forEach((doc) => {
    const data = doc.data();

    // Aggregate by category from expense items
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

/**
 * Create or update DSR report in Firestore
 */
async function saveDSRReport(summary: DailySummary): Promise<void> {
  const reportId = `${summary.userId}_${summary.date}`;

  // Convert Maps to arrays for Firestore
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

  // **FIX: Skip creating DSR if user had NO activity that day**
  const hasActivity =
    summary.checkInAt ||
    summary.checkOutAt ||
    wasActive;

  if (!hasActivity) {
    logger.info("Skipping DSR - no activity", {
      userId: summary.userId,
      date: summary.date,
    });
    return; // Don't create DSR
  }

  // Smart approval: Auto-approve if no sheets or expenses, otherwise pending
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
}

/**
 * Scheduled function to compile daily sales reports
 * Runs at 11:59 PM IST every day
 */
export const compileDSRReports = onSchedule(
  {
    schedule: "59 23 * * *", // 11:59 PM daily
    timeZone: "Asia/Kolkata",
  },
  async (event) => {
    try {
      logger.info("DSR compiler started");

      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      // Get all active sales reps
      const repUserIds = await getActiveReps();
      logger.info(`Found ${repUserIds.length} active reps`);

      let successCount = 0;
      let errorCount = 0;

      // Compile DSR for each rep
      for (const userId of repUserIds) {
        try {
          const summary = await compileDailySummary(userId, today);
          await saveDSRReport(summary);

          logger.info("DSR compiled successfully", {
            userId,
            date: today,
            visits: summary.visitIds.length,
            sheetsSold: Array.from(summary.sheetsSales.values()).reduce(
              (sum, n) => sum + n,
              0
            ),
            totalExpenses: Array.from(summary.expenses.values()).reduce(
              (sum, n) => sum + n,
              0
            ),
          });

          successCount++;
        } catch (error: any) {
          logger.error("Failed to compile DSR for user", {
            userId,
            errorMessage: error?.message || String(error),
            errorStack: error?.stack,
            errorCode: error?.code,
          });
          errorCount++;
        }
      }

      logger.info("DSR compiler completed", {
        date: today,
        totalReps: repUserIds.length,
        success: successCount,
        errors: errorCount,
      });
    } catch (error) {
      logger.error("Error in DSR compiler", {error});
      throw error;
    }
  }
);
