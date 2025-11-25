/**
 * Manager Dashboard API
 * Lightweight endpoint optimized for the manager home screen
 *
 * Returns only what the home screen needs:
 * - User info (name, role, team size)
 * - Pending counts (sheets + expenses)
 * - Today's team stats (visits, sheets)
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {requireAuth} from "../utils/auth";
import {ApiError} from "../types";

const db = getFirestore();

/**
 * Get Manager Dashboard Data
 * Optimized for speed - uses count() queries where possible
 *
 * POST /getManagerDashboard
 * Body: {
 *   date?: string  // YYYY-MM-DD (default: today)
 * }
 */
export const getManagerDashboard = onRequest({cors: true}, async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const managerId = auth.uid;

    // 2. Parse date parameter (default: today)
    const {date} = request.body;
    let targetDate: string;

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
      // Default to today
      const now = new Date();
      targetDate = now.toISOString().split("T")[0];
    }

    // Calculate start/end timestamps for today's visits query
    const startOfDay = new Date(targetDate + "T00:00:00Z");
    const endOfDay = new Date(targetDate + "T23:59:59Z");

    logger.info(`[getManagerDashboard] Fetching dashboard for ${targetDate}`);

    // 3. Execute all queries in parallel for maximum speed
    const [
      userDoc,
      teamSnapshot,
      pendingSheetsAgg,
      pendingExpensesAgg,
      todayVisitsAgg,
      todaySheetsSnapshot,
    ] = await Promise.all([
      // Query 1: User info
      db.collection("users").doc(managerId).get(),

      // Query 2: Team size (active users who are reps/managers)
      db.collection("users")
        .where("isActive", "==", true)
        .get(),

      // Query 3: Pending sheets count (using aggregate count - fastest)
      db.collection("sheetsSales")
        .where("verified", "==", false)
        .count()
        .get(),

      // Query 4: Pending expenses count (using aggregate count)
      db.collection("expenses")
        .where("status", "==", "pending")
        .count()
        .get(),

      // Query 5: Today's visits count (using aggregate count)
      db.collection("visits")
        .where("timestamp", ">=", startOfDay)
        .where("timestamp", "<=", endOfDay)
        .count()
        .get(),

      // Query 6: Today's sheets (need docs to sum sheetsCount field)
      db.collection("sheetsSales")
        .where("date", "==", targetDate)
        .select("sheetsCount")
        .get(),
    ]);

    // Check user exists and has manager permissions
    if (!userDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found in system",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const userData = userDoc.data();
    const userRole = userData?.role;

    // Only managers and above can access dashboard
    const managerRoles = ["area_manager", "zonal_head", "national_head", "admin"];
    if (!managerRoles.includes(userRole)) {
      const error: ApiError = {
        ok: false,
        error: "Only managers can access the dashboard",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // Calculate team size (reps + lower managers, excluding current user)
    const teamRoles = ["rep", "area_manager", "zonal_head"];
    const teamMembers = teamSnapshot.docs.filter((doc) => {
      const role = doc.data().role;
      return teamRoles.includes(role);
    });
    const teamSize = teamMembers.length;

    // Get counts from aggregate results
    const pendingSheetsCount = pendingSheetsAgg.data().count;
    const pendingExpensesCount = pendingExpensesAgg.data().count;
    const todayVisitsCount = todayVisitsAgg.data().count;

    // Sum today's sheets (need to iterate since we need sum, not count)
    let todaySheetsTotal = 0;
    todaySheetsSnapshot.docs.forEach((doc) => {
      todaySheetsTotal += doc.data().sheetsCount || 0;
    });

    logger.info(
      `[getManagerDashboard] Results: pending=${pendingSheetsCount + pendingExpensesCount}, ` +
      `visits=${todayVisitsCount}, sheets=${todaySheetsTotal}`
    );

    // 4. Return optimized response
    response.status(200).json({
      ok: true,
      date: targetDate,
      user: {
        name: userData?.name || "Manager",
        role: userRole,
        teamSize: teamSize,
      },
      summary: {
        pendingSheets: pendingSheetsCount,
        pendingExpenses: pendingExpensesCount,
        pendingTotal: pendingSheetsCount + pendingExpensesCount,
        todayVisits: todayVisitsCount,
        todaySheets: todaySheetsTotal,
      },
    });
  } catch (error: any) {
    logger.error("[getManagerDashboard] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});
