/**
 * Manager Statistics API
 * Provides aggregated team statistics for manager dashboard
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {requireAuth} from "../utils/auth";
import {ApiError} from "../types";

const db = getFirestore();

/**
 * Get Team Statistics
 * Returns aggregated stats for all team members
 *
 * POST /getTeamStats
 * Body: {
 *   date: string  // YYYY-MM-DD (default: today)
 * }
 */
export const getTeamStats = onRequest({cors: true}, async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const managerId = auth.uid;

    // Get manager's role
    const managerDoc = await db.collection("users").doc(managerId).get();
    if (!managerDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found in system",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const managerRole = managerDoc.data()?.role;
    if (managerRole !== "national_head" && managerRole !== "admin") {
      const error: ApiError = {
        ok: false,
        error: "Only National Head or Admin can view team statistics",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Parse date parameter (default: today) and range
    const {date, range} = request.body;
    let targetDate: string;
    let startDateStr: string;
    let endDateStr: string;
    let startDate: Date;
    let endDate: Date;

    // Determine target date (date strings are in local device time, stored as YYYY-MM-DD)
    if (date) {
      // Validate date format YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const error: ApiError = {
          ok: false,
          error: "Invalid date format. Expected YYYY-MM-DD",
          code: "INVALID_DATE",
        };
        response.status(400).json(error);
        return;
      }
      targetDate = date;
    } else {
      // Default to today in UTC (client should send their local date)
      const now = new Date();
      targetDate = now.toISOString().split("T")[0];
    }

    // Calculate date range based on 'range' parameter
    // Parse date in local context (don't force UTC)
    const [year, month, day] = targetDate.split("-").map(Number);
    const targetDateObj = new Date(year, month - 1, day);

    if (range === "week") {
      // Get start of week (Sunday) in local time
      const dayOfWeek = targetDateObj.getDay();
      const startOfWeek = new Date(targetDateObj);
      startOfWeek.setDate(targetDateObj.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      startDateStr = startOfWeek.toISOString().split("T")[0];
      endDateStr = endOfWeek.toISOString().split("T")[0];

      // For timestamp queries (attendance, visits)
      startDate = new Date(startDateStr + "T00:00:00Z");
      endDate = new Date(endDateStr + "T23:59:59Z");
    } else if (range === "month") {
      // Get start and end of month
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0); // Last day of month

      startDateStr = startOfMonth.toISOString().split("T")[0];
      endDateStr = endOfMonth.toISOString().split("T")[0];

      // For timestamp queries
      startDate = new Date(startDateStr + "T00:00:00Z");
      endDate = new Date(endDateStr + "T23:59:59Z");
    } else {
      // Default: single day (today)
      startDateStr = targetDate;
      endDateStr = targetDate;
      startDate = new Date(targetDate + "T00:00:00Z");
      endDate = new Date(targetDate + "T23:59:59Z");
    }

    logger.info(
      `[getTeamStats] Fetching stats for range: ${range || "today"}` +
      ` (${startDateStr} to ${endDateStr})` +
      ` | Timestamps: ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // 3. Get all users (for national head, get ALL users)
    const usersSnapshot = await db.collection("users")
      .where("isActive", "==", true)
      .get();

    const allUsers = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter to only reps and managers (exclude current user if needed)
    const teamMembers = allUsers.filter((u: any) =>
      ["rep", "area_manager", "zonal_head"].includes(u.role)
    );

    const totalTeamMembers = teamMembers.length;

    // 4-8. Execute all queries in parallel for better performance
    const [
      attendanceSnapshot,
      visitsSnapshot,
      sheetsSnapshot,
      dsrSnapshot,
      expensesSnapshot,
    ] = await Promise.all([
      // Query 1: Attendance
      db.collection("attendance")
        .where("timestamp", ">=", startDate)
        .where("timestamp", "<=", endDate)
        .get(),

      // Query 2: Visits
      db.collection("visits")
        .where("timestamp", ">=", startDate)
        .where("timestamp", "<=", endDate)
        .get(),

      // Query 3: Sheets Sales
      (range === "week" || range === "month")
        ? db.collection("sheetsSales")
            .where("date", ">=", startDateStr)
            .where("date", "<=", endDateStr)
            .get()
        : db.collection("sheetsSales")
            .where("date", "==", targetDate)
            .get(),

      // Query 4: DSR Reports
      (range === "week" || range === "month")
        ? db.collection("dsrReports")
            .where("date", ">=", startDateStr)
            .where("date", "<=", endDateStr)
            .where("status", "==", "pending")
            .get()
        : db.collection("dsrReports")
            .where("date", "==", targetDate)
            .where("status", "==", "pending")
            .get(),

      // Query 5: Expenses
      (range === "week" || range === "month")
        ? db.collection("expenses")
            .where("date", ">=", startDateStr)
            .where("date", "<=", endDateStr)
            .where("status", "==", "pending")
            .get()
        : db.collection("expenses")
            .where("date", "==", targetDate)
            .where("status", "==", "pending")
            .get(),
    ]);

    logger.info(`[getTeamStats] Found ${attendanceSnapshot.size} attendance records`);

    // Process attendance data (OLD - deprecated but kept for backwards compatibility)
    const attendanceByUser: Record<string, any[]> = {};
    attendanceSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId;
      if (!attendanceByUser[userId]) {
        attendanceByUser[userId] = [];
      }
      attendanceByUser[userId].push(data);
    });

    // Count present (users with check-in) - OLD metric
    const presentUserIds = Object.keys(attendanceByUser).filter((userId) =>
      attendanceByUser[userId].some((a) => a.type === "check_in")
    );
    const presentCount = presentUserIds.length;
    const absentCount = totalTeamMembers - presentCount;

    // Calculate active users (NEW - activity-based metric)
    // Active = any user who logged a visit, sheet sale, or expense in the date range
    const activeUserIds = new Set<string>();
    visitsSnapshot.docs.forEach((doc) => activeUserIds.add(doc.data().userId));
    sheetsSnapshot.docs.forEach((doc) => activeUserIds.add(doc.data().userId));
    expensesSnapshot.docs.forEach((doc) => activeUserIds.add(doc.data().userId));

    const activeCount = activeUserIds.size;
    const inactiveCount = totalTeamMembers - activeCount;

    // Process visits data
    const totalVisits = visitsSnapshot.size;
    logger.info(`[getTeamStats] Found ${totalVisits} visits`);

    let distributorVisits = 0;
    let dealerVisits = 0;
    let architectVisits = 0;
    let contractorVisits = 0;

    visitsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.accountType === "distributor") distributorVisits++;
      else if (data.accountType === "dealer") dealerVisits++;
      else if (data.accountType === "architect") architectVisits++;
      else if (data.accountType === "contractor") contractorVisits++;
    });

    // Process sheets sales data
    let totalSheets = 0;
    const sheetsByCatalog: Record<string, number> = {
      "Fine Decor": 0,
      "Artvio": 0,
      "Woodrica": 0,
      "Artis 1MM": 0,
    };

    sheetsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      totalSheets += data.sheetsCount || 0;
      if (sheetsByCatalog[data.catalog] !== undefined) {
        sheetsByCatalog[data.catalog] += data.sheetsCount || 0;
      }
    });

    // Process DSR and expenses data
    const pendingDSRs = dsrSnapshot.size;
    const pendingExpenses = expensesSnapshot.size;
    logger.info(`[getTeamStats] Found ${pendingExpenses} pending expenses`);

    // 9. Return aggregated stats
    response.status(200).json({
      ok: true,
      date: targetDate,
      stats: {
        team: {
          total: totalTeamMembers,
          // OLD metrics (deprecated but kept for backwards compatibility)
          present: presentCount,
          absent: absentCount,
          presentPercentage: totalTeamMembers > 0 ?
            Math.round((presentCount / totalTeamMembers) * 100) : 0,
          // NEW metrics (activity-based)
          active: activeCount,
          inactive: inactiveCount,
          activePercentage: totalTeamMembers > 0 ?
            Math.round((activeCount / totalTeamMembers) * 100) : 0,
        },
        visits: {
          total: totalVisits,
          distributor: distributorVisits,
          dealer: dealerVisits,
          architect: architectVisits,
          contractor: contractorVisits,
        },
        sheets: {
          total: totalSheets,
          byCatalog: sheetsByCatalog,
        },
        pending: {
          dsrs: pendingDSRs,
          expenses: pendingExpenses,
        },
      },
    });
  } catch (error: any) {
    logger.error("[getTeamStats] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});
