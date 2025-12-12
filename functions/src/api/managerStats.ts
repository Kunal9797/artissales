/**
 * Manager Statistics API
 * Provides aggregated team statistics for manager dashboard
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {getFirestore} from "firebase-admin/firestore";
import {requireAuth} from "../utils/auth";
import {ApiError} from "../types";
import {getDirectReportIds} from "../utils/team";

const db = getFirestore();

/**
 * Get Team Statistics
 * Returns aggregated stats for all team members
 *
 * POST /getTeamStats
 * Body: {
 *   date: string           // YYYY-MM-DD (default: today) - used for today/week/month ranges
 *   range: string          // 'today' | 'week' | 'month' | 'custom' (default: today)
 *   startDate?: string     // YYYY-MM-DD - required for custom range
 *   endDate?: string       // YYYY-MM-DD - required for custom range
 *   filterByManagerId?: string  // Admin only: filter to specific manager's team
 *   filterByUserId?: string     // View stats for a single user (rep)
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

    // Check if caller has permission to view team stats
    const canViewStats = ["admin", "national_head", "area_manager"].includes(managerRole);
    if (!canViewStats) {
      const error: ApiError = {
        ok: false,
        error: "Only Admin, National Head, or Area Manager can view team statistics",
        code: "INSUFFICIENT_PERMISSIONS",
      };
      response.status(403).json(error);
      return;
    }

    // 2. Parse parameters
    const {date, range, startDate: customStartDate, endDate: customEndDate, filterByManagerId, filterByUserId} = request.body;
    let targetDate: string;
    let startDateStr: string;
    let endDateStr: string;
    let startDate: Date;
    let endDate: Date;

    // Handle custom date range
    if (range === "custom") {
      // Validate custom dates are provided
      if (!customStartDate || !customEndDate) {
        const error: ApiError = {
          ok: false,
          error: "Custom range requires startDate and endDate",
          code: "MISSING_DATES",
        };
        response.status(400).json(error);
        return;
      }

      // Validate date formats
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(customStartDate) || !dateRegex.test(customEndDate)) {
        const error: ApiError = {
          ok: false,
          error: "Invalid date format. Expected YYYY-MM-DD",
          code: "INVALID_DATE",
        };
        response.status(400).json(error);
        return;
      }

      // Validate start date is not after end date
      if (customStartDate > customEndDate) {
        const error: ApiError = {
          ok: false,
          error: "Start date cannot be after end date",
          code: "INVALID_DATE_RANGE",
        };
        response.status(400).json(error);
        return;
      }

      startDateStr = customStartDate;
      endDateStr = customEndDate;
      targetDate = customEndDate; // Use end date as reference
      startDate = new Date(startDateStr + "T00:00:00Z");
      endDate = new Date(endDateStr + "T23:59:59Z");
    } else {
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
    }

    logger.info(
      `[getTeamStats] Fetching stats for range: ${range || "today"}` +
      ` (${startDateStr} to ${endDateStr})` +
      ` | Timestamps: ${startDate.toISOString()} to ${endDate.toISOString()}`
    );

    // 3. Get team members based on caller's role
    let teamMemberIds: string[];
    let allUsers: any[] = [];
    let isSingleRepView = false; // Track if viewing a single rep

    // Handle filterByUserId (single rep view)
    if (filterByUserId) {
      // Verify the target user exists
      const targetUserDoc = await db.collection("users").doc(filterByUserId).get();
      if (!targetUserDoc.exists) {
        const error: ApiError = {
          ok: false,
          error: "User not found",
          code: "USER_NOT_FOUND",
        };
        response.status(404).json(error);
        return;
      }

      const targetUserData = targetUserDoc.data();

      // Check if user was migrated - if so, include both old and new IDs for data aggregation
      // This handles the case where data was logged with old ID before migration
      const migratedFromId = targetUserData?.migratedFrom;
      const userIdsToInclude = migratedFromId
        ? [filterByUserId, migratedFromId]
        : [filterByUserId];

      if (migratedFromId) {
        logger.info(`[getTeamStats] User ${filterByUserId} was migrated from ${migratedFromId}, including both IDs`);
      }

      // Permission check: admin can view anyone, managers can only view their direct reports
      if (managerRole === "admin") {
        // Admin can view any user
        teamMemberIds = userIdsToInclude;
        allUsers = [{id: filterByUserId, ...targetUserData}];
        isSingleRepView = true;
        logger.info(`[getTeamStats] Admin viewing single rep: ${filterByUserId}`);
      } else {
        // NH/AM can only view their direct reports
        const directReportIds = await getDirectReportIds(managerId);
        if (!directReportIds.includes(filterByUserId)) {
          const error: ApiError = {
            ok: false,
            error: "You can only view statistics for your direct reports",
            code: "INSUFFICIENT_PERMISSIONS",
          };
          response.status(403).json(error);
          return;
        }
        teamMemberIds = userIdsToInclude;
        allUsers = [{id: filterByUserId, ...targetUserData}];
        isSingleRepView = true;
        logger.info(`[getTeamStats] Manager ${managerId} viewing direct report: ${filterByUserId}`);
      }
    } else if (managerRole === "admin") {
      // Admin can filter by specific manager
      if (filterByManagerId) {
        // Get the specified manager's direct reports
        teamMemberIds = await getDirectReportIds(filterByManagerId);

        // Fetch user details for filtered team members
        if (teamMemberIds.length > 0) {
          const userPromises = teamMemberIds.map((id) =>
            db.collection("users").doc(id).get()
          );
          const userDocs = await Promise.all(userPromises);
          allUsers = userDocs
            .filter((doc) => doc.exists)
            .map((doc) => ({id: doc.id, ...doc.data()}));
        }

        logger.info(`[getTeamStats] Admin filtering by manager ${filterByManagerId}`);
      } else {
        // Admin sees all reps (no manager filter)
        const usersSnapshot = await db.collection("users")
          .where("isActive", "==", true)
          .get();

        allUsers = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Filter to only reps (exclude managers from stats)
        const teamMembers = allUsers.filter((u: any) =>
          u.role === "rep"
        );
        teamMemberIds = teamMembers.map((u: any) => u.id);
      }
    } else {
      // National Head / Area Manager - see only direct reports
      teamMemberIds = await getDirectReportIds(managerId);

      // Fetch user details for team members
      if (teamMemberIds.length > 0) {
        const userPromises = teamMemberIds.map((id) =>
          db.collection("users").doc(id).get()
        );
        const userDocs = await Promise.all(userPromises);
        allUsers = userDocs
          .filter((doc) => doc.exists)
          .map((doc) => ({id: doc.id, ...doc.data()}));
      }
    }

    const totalTeamMembers = teamMemberIds.length;

    // For team view: also include migratedFrom IDs so we aggregate data from both old and new IDs
    // This is needed because some data may have been logged with the old user ID before migration
    if (!isSingleRepView && allUsers.length > 0) {
      const migratedFromIds = allUsers
        .filter((u: any) => u.migratedFrom && !teamMemberIds.includes(u.migratedFrom))
        .map((u: any) => u.migratedFrom);

      if (migratedFromIds.length > 0) {
        logger.info(`[getTeamStats] Including ${migratedFromIds.length} migrated-from IDs for data aggregation`);
        teamMemberIds = [...teamMemberIds, ...migratedFromIds];
      }
    }

    logger.info(`[getTeamStats] Manager ${managerId} (${managerRole}) has ${totalTeamMembers} team members (${teamMemberIds.length} IDs including migrations)`);

    // 4-8. Execute all queries in parallel for better performance
    const [
      attendanceSnapshot,
      visitsSnapshot,
      sheetsSnapshot,
      pendingSheetsSnapshot,
      pendingExpensesSnapshot,
      allExpensesSnapshot,
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

      // Query 3: Approved/Verified Sheets Sales
      // Sheets use `verified: true` for approved
      (range === "week" || range === "month")
        ? db.collection("sheetsSales")
            .where("date", ">=", startDateStr)
            .where("date", "<=", endDateStr)
            .where("verified", "==", true)
            .get()
        : db.collection("sheetsSales")
            .where("date", "==", targetDate)
            .where("verified", "==", true)
            .get(),

      // Query 4: Pending Sheets (verified === false)
      (range === "week" || range === "month")
        ? db.collection("sheetsSales")
            .where("date", ">=", startDateStr)
            .where("date", "<=", endDateStr)
            .where("verified", "==", false)
            .get()
        : db.collection("sheetsSales")
            .where("date", "==", targetDate)
            .where("verified", "==", false)
            .get(),

      // Query 5: Pending Expenses (for pending count)
      (range === "week" || range === "month" || range === "custom")
        ? db.collection("expenses")
            .where("date", ">=", startDateStr)
            .where("date", "<=", endDateStr)
            .where("status", "==", "pending")
            .get()
        : db.collection("expenses")
            .where("date", "==", targetDate)
            .where("status", "==", "pending")
            .get(),

      // Query 6: All Expenses (for single rep view - expense breakdown by category)
      // Only fetch if viewing a single rep to avoid unnecessary queries
      isSingleRepView
        ? ((range === "week" || range === "month" || range === "custom")
            ? db.collection("expenses")
                .where("date", ">=", startDateStr)
                .where("date", "<=", endDateStr)
                .get()
            : db.collection("expenses")
                .where("date", "==", targetDate)
                .get())
        : Promise.resolve(null),
    ]);

    logger.info(`[getTeamStats] Found ${attendanceSnapshot.size} attendance records`);

    // Create a Set for O(1) lookup of team member IDs
    const teamMemberIdSet = new Set(teamMemberIds);

    // Filter helper - only include data from team members
    // For admin without filter: include all reps (teamMemberIdSet has all reps)
    // For admin with filter: only include filtered manager's team
    // For other managers: only include their direct reports
    const isTeamMember = (userId: string) => teamMemberIdSet.has(userId);

    // Process attendance data (OLD - deprecated but kept for backwards compatibility)
    const attendanceByUser: Record<string, any[]> = {};
    attendanceSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId;
      if (!isTeamMember(userId)) return; // Skip non-team members
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
    // Active = any team member who logged a visit, sheet sale, or expense in the date range
    const activeUserIds = new Set<string>();
    visitsSnapshot.docs.forEach((doc) => {
      const userId = doc.data().userId;
      if (isTeamMember(userId)) activeUserIds.add(userId);
    });
    sheetsSnapshot.docs.forEach((doc) => {
      const userId = doc.data().userId;
      if (isTeamMember(userId)) activeUserIds.add(userId);
    });
    pendingExpensesSnapshot.docs.forEach((doc) => {
      const userId = doc.data().userId;
      if (isTeamMember(userId)) activeUserIds.add(userId);
    });

    const activeCount = activeUserIds.size;
    const inactiveCount = totalTeamMembers - activeCount;

    // Process visits data (filtered by team members)
    let totalVisits = 0;
    let distributorVisits = 0;
    let dealerVisits = 0;
    let architectVisits = 0;
    let oemVisits = 0;

    // For month view: track daily activity (unique reps with visits per day)
    const dailyVisitsByUser: Record<string, Set<string>> = {};
    // For single rep view: track daily visit counts
    const dailyVisitCounts: Record<string, number> = {};

    // For single rep view: collect recent visits and account visit counts
    const recentVisits: Array<{
      id: string;
      accountName: string;
      accountType: string;
      timestamp: string;
      purpose: string;
    }> = [];
    const accountVisitCounts: Record<string, {accountId: string; accountName: string; count: number}> = {};

    visitsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!isTeamMember(data.userId)) return; // Skip non-team members
      totalVisits++;
      if (data.accountType === "distributor") distributorVisits++;
      else if (data.accountType === "dealer") dealerVisits++;
      else if (data.accountType === "architect") architectVisits++;
      else if (data.accountType === "OEM") oemVisits++;

      // Track daily activity for week/month/custom view heatmap
      if ((range === "month" || range === "week" || range === "custom") && data.timestamp) {
        // Convert Firestore timestamp to YYYY-MM-DD
        const visitDate = data.timestamp.toDate().toISOString().split("T")[0];
        if (!dailyVisitsByUser[visitDate]) {
          dailyVisitsByUser[visitDate] = new Set();
        }
        dailyVisitsByUser[visitDate].add(data.userId);

        // For single rep view: count actual visits per day
        if (isSingleRepView) {
          dailyVisitCounts[visitDate] = (dailyVisitCounts[visitDate] || 0) + 1;
        }
      }

      // For single rep view: collect visit details
      if (isSingleRepView && data.timestamp) {
        recentVisits.push({
          id: doc.id,
          accountName: data.accountName || "Unknown",
          accountType: data.accountType || "unknown",
          timestamp: data.timestamp.toDate().toISOString(),
          purpose: data.purpose || "other",
        });

        // Track visits per account for "most visited"
        const accountId = data.accountId || "unknown";
        if (!accountVisitCounts[accountId]) {
          accountVisitCounts[accountId] = {
            accountId,
            accountName: data.accountName || "Unknown",
            count: 0,
          };
        }
        accountVisitCounts[accountId].count++;
      }
    });

    logger.info(`[getTeamStats] Filtered to ${totalVisits} team visits (raw query returned ${visitsSnapshot.size})`);

    // Process sheets sales data (filtered by team members)
    let totalSheets = 0;
    const sheetsByCatalog: Record<string, number> = {
      "Fine Decor": 0,
      "Artvio": 0,
      "Woodrica": 0,
      "Artis 1MM": 0,
    };

    // Process verified sheets (Query 3 already filtered to verified === true)
    sheetsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (!isTeamMember(data.userId)) return; // Skip non-team members
      totalSheets += data.sheetsCount || 0;
      if (sheetsByCatalog[data.catalog] !== undefined) {
        sheetsByCatalog[data.catalog] += data.sheetsCount || 0;
      }
    });

    // Process pending sheets and expenses (filtered by team members)
    let pendingSheetsCount = 0;  // Total sheets count from pending entries
    let pendingSheetsLogs = 0;   // Number of pending sheet log entries
    let pendingExpenses = 0;

    pendingSheetsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      // Skip rejected sheets (they have rejectedAt timestamp)
      if (data.rejectedAt) return;
      if (isTeamMember(data.userId)) {
        pendingSheetsCount += data.sheetsCount || 0;
        pendingSheetsLogs++;
      }
    });

    pendingExpensesSnapshot.docs.forEach((doc) => {
      if (isTeamMember(doc.data().userId)) pendingExpenses++;
    });

    // Process expense breakdown for single rep view (using allExpensesSnapshot)
    let expenseBreakdown: {
      total: number;
      byCategory: {
        travel: number;
        food: number;
        accommodation: number;
        other: number;
      };
    } | undefined;

    if (isSingleRepView && allExpensesSnapshot) {
      let totalExpenses = 0;
      const expensesByCategory = {
        travel: 0,
        food: 0,
        accommodation: 0,
        other: 0,
      };

      allExpensesSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!isTeamMember(data.userId)) return;

        // Only count approved expenses in totals
        if (data.status !== "approved") return;

        // Handle both old format (amount/category) and new format (items array)
        if (data.items && Array.isArray(data.items)) {
          // New format: items array
          data.items.forEach((item: any) => {
            const amount = item.amount || 0;
            totalExpenses += amount;
            const category = item.category || "other";
            if (expensesByCategory[category as keyof typeof expensesByCategory] !== undefined) {
              expensesByCategory[category as keyof typeof expensesByCategory] += amount;
            }
          });
        } else {
          // Old format: single amount/category
          const amount = data.amount || 0;
          totalExpenses += amount;
          const category = data.category || "other";
          if (expensesByCategory[category as keyof typeof expensesByCategory] !== undefined) {
            expensesByCategory[category as keyof typeof expensesByCategory] += amount;
          }
        }
      });

      expenseBreakdown = {
        total: totalExpenses,
        byCategory: expensesByCategory,
      };

      logger.info(`[getTeamStats] Built expense breakdown: total=${totalExpenses}, travel=${expensesByCategory.travel}, food=${expensesByCategory.food}`);
    }

    logger.info(`[getTeamStats] Found ${pendingSheetsLogs} pending sheet logs (${pendingSheetsCount} sheets total), ${pendingExpenses} pending expenses`);

    // Build visitDetails for single rep view
    let visitDetails: {
      recent: Array<{
        id: string;
        accountName: string;
        accountType: string;
        timestamp: string;
        purpose: string;
      }>;
      topAccounts: Array<{
        accountId: string;
        accountName: string;
        visitCount: number;
      }>;
    } | undefined;

    if (isSingleRepView && recentVisits.length > 0) {
      // Sort recent visits by timestamp (most recent first) and take top 5
      const sortedRecent = recentVisits
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

      // Sort accounts by visit count (most visited first) and take top 3
      const sortedAccounts = Object.values(accountVisitCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((acc) => ({
          accountId: acc.accountId,
          accountName: acc.accountName,
          visitCount: acc.count,
        }));

      visitDetails = {
        recent: sortedRecent,
        topAccounts: sortedAccounts,
      };

      logger.info(`[getTeamStats] Built visitDetails: ${sortedRecent.length} recent, ${sortedAccounts.length} top accounts`);
    }

    // Build dailyActivity array for week/month/custom view heatmap
    // For single rep view: visitCount is the actual number of visits that day
    // For team view: activeCount is the number of unique reps with visits
    let dailyActivity: Array<{date: string; activeCount: number; totalCount: number; visitCount?: number; isInRange?: boolean}> | undefined;
    if (range === "month") {
      // Parse year/month from startDateStr (first day of month)
      const [monthYear, monthNum] = startDateStr.split("-").map(Number);
      // Generate array for all days in the month
      const daysInMonth = new Date(monthYear, monthNum, 0).getDate();
      dailyActivity = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${monthYear}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        const activeOnDay = dailyVisitsByUser[dateStr]?.size || 0;
        dailyActivity.push({
          date: dateStr,
          activeCount: activeOnDay,
          totalCount: totalTeamMembers,
          ...(isSingleRepView && {visitCount: dailyVisitCounts[dateStr] || 0}),
        });
      }
      logger.info(`[getTeamStats] Built dailyActivity for ${daysInMonth} days`);
    } else if (range === "week") {
      // Generate array for 7 days of the week (Sunday to Saturday)
      dailyActivity = [];
      const startOfWeekDate = new Date(startDateStr + "T00:00:00");
      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(startOfWeekDate);
        currentDate.setDate(startOfWeekDate.getDate() + d);
        const dateStr = currentDate.toISOString().split("T")[0];
        const activeOnDay = dailyVisitsByUser[dateStr]?.size || 0;
        dailyActivity.push({
          date: dateStr,
          activeCount: activeOnDay,
          totalCount: totalTeamMembers,
          ...(isSingleRepView && {visitCount: dailyVisitCounts[dateStr] || 0}),
        });
      }
      logger.info(`[getTeamStats] Built dailyActivity for 7 days (week view)`);
    } else if (range === "custom") {
      // For custom range: only show heatmap if start and end are in the same month
      const [startYear, startMonth] = startDateStr.split("-").map(Number);
      const [endYear, endMonth] = endDateStr.split("-").map(Number);

      if (startYear === endYear && startMonth === endMonth) {
        // Same month - generate full month heatmap with range indicators
        const daysInMonth = new Date(startYear, startMonth, 0).getDate();
        dailyActivity = [];
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${startYear}-${String(startMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const activeOnDay = dailyVisitsByUser[dateStr]?.size || 0;
          const isInRange = dateStr >= startDateStr && dateStr <= endDateStr;
          dailyActivity.push({
            date: dateStr,
            activeCount: activeOnDay,
            totalCount: totalTeamMembers,
            isInRange, // Flag to indicate if day is within custom range
            ...(isSingleRepView && {visitCount: dailyVisitCounts[dateStr] || 0}),
          });
        }
        logger.info(`[getTeamStats] Built dailyActivity for custom range (same month: ${startMonth}/${startYear})`);
      } else {
        // Different months - no heatmap
        logger.info(`[getTeamStats] Custom range spans multiple months, no heatmap`);
      }
    }

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
          // Daily activity for month view heatmap
          dailyActivity,
        },
        visits: {
          total: totalVisits,
          distributor: distributorVisits,
          dealer: dealerVisits,
          architect: architectVisits,
          OEM: oemVisits,
        },
        sheets: {
          total: totalSheets,
          byCatalog: sheetsByCatalog,
        },
        pending: {
          sheets: pendingSheetsCount,      // Sum of sheets from pending logs
          sheetsLogs: pendingSheetsLogs,   // Number of pending sheet log entries
          expenses: pendingExpenses,       // Number of pending expense log entries
        },
        // Only included for single rep view
        ...(visitDetails && {visitDetails}),
        // Expense breakdown for single rep view
        ...(expenseBreakdown && {expenses: expenseBreakdown}),
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
