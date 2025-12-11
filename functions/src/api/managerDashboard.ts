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
import {getDirectReportIds} from "../utils/team";

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

    // 3. Get user info first to determine role
    const userDoc = await db.collection("users").doc(managerId).get();

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

    // 4. Get team member IDs based on role
    let teamMemberIds: string[];

    if (userRole === "admin") {
      // Admin sees all reps
      const allRepsSnapshot = await db.collection("users")
        .where("role", "==", "rep")
        .where("isActive", "==", true)
        .get();
      teamMemberIds = allRepsSnapshot.docs.map((doc) => doc.id);
    } else {
      // National Head / Area Manager / Zonal Head - see ONLY direct reports
      teamMemberIds = await getDirectReportIds(managerId);
    }

    const teamSize = teamMemberIds.length;
    const teamMemberIdSet = new Set(teamMemberIds);

    logger.info(`[getManagerDashboard] Manager ${managerId} (${userRole}) has ${teamSize} team members`);

    // 5. Execute data queries in parallel
    // Note: Firestore doesn't support 'in' with count(), so we fetch and filter
    const [
      pendingSheetsSnapshot,
      pendingExpensesSnapshot,
      todayVisitsSnapshot,
      todaySheetsSnapshot,
    ] = await Promise.all([
      // Pending sheets (unverified)
      db.collection("sheetsSales")
        .where("verified", "==", false)
        .get(),

      // Pending expenses
      db.collection("expenses")
        .where("status", "==", "pending")
        .get(),

      // Today's visits
      db.collection("visits")
        .where("timestamp", ">=", startOfDay)
        .where("timestamp", "<=", endOfDay)
        .get(),

      // Today's sheets
      db.collection("sheetsSales")
        .where("date", "==", targetDate)
        .select("sheetsCount", "userId")
        .get(),
    ]);

    // Helper to check if userId belongs to team
    const isTeamMember = (userId: string) =>
      userRole === "admin" || teamMemberIdSet.has(userId);

    // Filter and count pending sheets by team members
    let pendingSheetsCount = 0;
    pendingSheetsSnapshot.docs.forEach((doc) => {
      if (isTeamMember(doc.data().userId)) pendingSheetsCount++;
    });

    // Filter and count pending expenses by team members
    let pendingExpensesCount = 0;
    pendingExpensesSnapshot.docs.forEach((doc) => {
      if (isTeamMember(doc.data().userId)) pendingExpensesCount++;
    });

    // Filter and count today's visits by team members
    let todayVisitsCount = 0;
    todayVisitsSnapshot.docs.forEach((doc) => {
      if (isTeamMember(doc.data().userId)) todayVisitsCount++;
    });

    // Filter and sum today's sheets by team members
    let todaySheetsTotal = 0;
    todaySheetsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (isTeamMember(data.userId)) {
        todaySheetsTotal += data.sheetsCount || 0;
      }
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

/**
 * Get Today's Visits Summary
 * Lightweight endpoint for manager popup - returns last 5 visits with details
 *
 * POST /getTodayVisitsSummary
 * Body: {
 *   date?: string  // YYYY-MM-DD (default: today)
 * }
 *
 * Response: {
 *   ok: true,
 *   date: string,
 *   totalCount: number,
 *   recentVisits: Array<{
 *     id: string,
 *     accountName: string,
 *     accountType: string,
 *     repName: string,
 *     timestamp: string (ISO)
 *   }>
 * }
 */
export const getTodayVisitsSummary = onRequest({cors: true}, async (request, response) => {
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
      const now = new Date();
      targetDate = now.toISOString().split("T")[0];
    }

    // Calculate start/end timestamps
    const startOfDay = new Date(targetDate + "T00:00:00Z");
    const endOfDay = new Date(targetDate + "T23:59:59Z");

    // 3. Verify manager permissions
    const userDoc = await db.collection("users").doc(managerId).get();
    if (!userDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      };
      response.status(403).json(error);
      return;
    }

    const userData = userDoc.data();
    const managerRoles = ["area_manager", "zonal_head", "national_head", "admin"];
    if (!managerRoles.includes(userData?.role)) {
      const error: ApiError = {
        ok: false,
        error: "Only managers can access this data",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    logger.info(`[getTodayVisitsSummary] Fetching visits summary for ${targetDate}`);

    // 4. Get team member IDs based on role
    const userRole = userData?.role;
    let teamMemberIds: string[];

    if (userRole === "admin") {
      // Admin sees all reps
      const allRepsSnapshot = await db.collection("users")
        .where("role", "==", "rep")
        .where("isActive", "==", true)
        .get();
      teamMemberIds = allRepsSnapshot.docs.map((doc) => doc.id);
    } else {
      // National Head / Area Manager / Zonal Head - see ONLY direct reports
      teamMemberIds = await getDirectReportIds(managerId);
    }

    const teamMemberIdSet = new Set(teamMemberIds);
    const isTeamMember = (userId: string) =>
      userRole === "admin" || teamMemberIdSet.has(userId);

    // 5. Get all visits for today (we'll filter by team)
    const visitsSnapshot = await db.collection("visits")
      .where("timestamp", ">=", startOfDay)
      .where("timestamp", "<=", endOfDay)
      .orderBy("timestamp", "desc")
      .get();

    // Filter visits by team members
    const teamVisitDocs = visitsSnapshot.docs.filter((doc) =>
      isTeamMember(doc.data().userId)
    );

    const totalCount = teamVisitDocs.length;

    // Get last 5 team visits
    const recentVisitDocs = teamVisitDocs.slice(0, 5);

    // 6. Get rep names for visits (batch lookup)
    const userIds = [...new Set(recentVisitDocs.map((doc) => doc.data().userId))];
    const userDocs = await Promise.all(
      userIds.map((uid) => db.collection("users").doc(uid).get())
    );
    const userNameMap = new Map<string, string>();
    userDocs.forEach((doc) => {
      if (doc.exists) {
        userNameMap.set(doc.id, doc.data()?.name || "Unknown");
      }
    });

    // 7. Format response
    const recentVisits = recentVisitDocs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        accountName: data.accountName || "Unknown Account",
        accountType: data.accountType || "unknown",
        repName: userNameMap.get(data.userId) || "Unknown Rep",
        timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    logger.info(`[getTodayVisitsSummary] Found ${totalCount} visits, returning ${recentVisits.length}`);

    response.status(200).json({
      ok: true,
      date: targetDate,
      totalCount,
      recentVisits,
    });
  } catch (error: any) {
    logger.error("[getTodayVisitsSummary] ❌ Error:", error);
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message,
    };
    response.status(500).json(apiError);
  }
});
