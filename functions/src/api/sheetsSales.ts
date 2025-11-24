/**
 * Sheets Sales Logging API
 *
 * Allows sales reps to log daily laminate sheet sales
 * Supports 4 catalogs: Fine Decor, Artvio, Woodrica, Artis
 */

import {onRequest} from "firebase-functions/v2/https";
import {firestore} from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {ApiError, CatalogType} from "../types";
import {validateRequiredFields} from "../utils/validation";
import {requireAuth} from "../utils/auth";
import {invalidateTargetCache} from "./targets";

interface LogSheetsRequest {
  date: string; // YYYY-MM-DD format
  catalog: CatalogType;
  sheetsCount: number;
  distributorId?: string;
  distributorName?: string;
  notes?: string;
}

interface LogSheetsResponse {
  ok: boolean;
  saleId: string;
  date: string;
  catalog: string;
  sheetsCount: number;
}

export const logSheetsSale = onRequest(async (request, response) => {
  try {
    // Authenticate user
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const body = request.body as LogSheetsRequest;

    // Validate required fields
    const validation = validateRequiredFields(body, [
      "date",
      "catalog",
      "sheetsCount",
    ]);

    if (!validation.valid) {
      const error: ApiError = {
        ok: false,
        error: "Missing required fields",
        code: "VALIDATION_ERROR",
        details: {missing: validation.missing},
      };
      response.status(400).json(error);
      return;
    }

    // Validate catalog
    const validCatalogs: CatalogType[] = [
      "Fine Decor",
      "Artvio",
      "Woodrica",
      "Artis 1MM",
    ];
    if (!validCatalogs.includes(body.catalog)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid catalog",
        code: "INVALID_CATALOG",
        details: {
          provided: body.catalog,
          valid: validCatalogs,
        },
      };
      response.status(400).json(error);
      return;
    }

    // Validate sheets count
    if (typeof body.sheetsCount !== "number" || body.sheetsCount <= 0) {
      const error: ApiError = {
        ok: false,
        error: "Sheets count must be a positive number",
        code: "INVALID_SHEETS_COUNT",
      };
      response.status(400).json(error);
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.date)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid date format. Use YYYY-MM-DD",
        code: "INVALID_DATE_FORMAT",
      };
      response.status(400).json(error);
      return;
    }

    // Check if trying to log data for a past date after 11:59 PM
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const nowIST = new Date(now.getTime() + istOffset);
    const currentHour = nowIST.getUTCHours();
    const currentMinute = nowIST.getUTCMinutes();
    const todayIST = nowIST.toISOString().split("T")[0]; // YYYY-MM-DD

    // If it's after 11:59 PM AND trying to log for today or earlier
    if (currentHour === 23 && currentMinute >= 59) {
      if (body.date <= todayIST) {
        const error: ApiError = {
          ok: false,
          error: "Cannot log sheets sales for today after 11:59 PM. Day's reporting closed.",
          code: "REPORTING_CLOSED",
          details: {
            currentTime: nowIST.toISOString(),
            attemptedDate: body.date,
          },
        };
        response.status(400).json(error);
        return;
      }
    }

    // If it's past midnight (00:00-05:59) trying to log for yesterday or earlier
    if (currentHour >= 0 && currentHour < 6) {
      const yesterday = new Date(nowIST);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayIST = yesterday.toISOString().split("T")[0];

      if (body.date <= yesterdayIST) {
        const error: ApiError = {
          ok: false,
          error: "Cannot log sheets sales for past dates. Grace period until 6 AM only for previous day.",
          code: "REPORTING_CLOSED",
          details: {
            currentTime: nowIST.toISOString(),
            attemptedDate: body.date,
          },
        };
        response.status(400).json(error);
        return;
      }
    }

    const db = firestore();
    const timestamp = firestore.Timestamp.now();

    // Create sheets sale record
    const saleRef = db.collection("sheetsSales").doc();
    const saleData = {
      id: saleRef.id,
      userId: auth.uid,
      date: body.date,
      catalog: body.catalog,
      sheetsCount: body.sheetsCount,
      distributorId: body.distributorId || null,
      distributorName: body.distributorName || null,
      notes: body.notes || null,
      verified: false, // Default to unverified (for future incentive calculation)
      createdAt: timestamp,
    };

    await saleRef.set(saleData);

    // Invalidate target cache for this user's month
    const month = body.date.substring(0, 7); // YYYY-MM
    invalidateTargetCache(auth.uid, month);

    logger.info("Sheets sale logged", {
      saleId: saleRef.id,
      userId: auth.uid,
      catalog: body.catalog,
      sheetsCount: body.sheetsCount,
      date: body.date,
    });

    const result: LogSheetsResponse = {
      ok: true,
      saleId: saleRef.id,
      date: body.date,
      catalog: body.catalog,
      sheetsCount: body.sheetsCount,
    };

    response.status(200).json(result);
  } catch (error: any) {
    logger.error("Error logging sheets sale", {error: error.message});
    const errorResponse: ApiError = {
      ok: false,
      error: error.message || "Internal server error",
      code: "INTERNAL_ERROR",
    };
    response.status(500).json(errorResponse);
  }
});

/**
 * Get Sheets Sales - Fetch sheet sales for a user on a specific date
 */
export const getSheetsSales = onRequest(async (request, response) => {
  try {
    // Authenticate user
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {userId, date} = request.body;

    // Validate required fields
    if (!userId || !date) {
      const error: ApiError = {
        ok: false,
        error: "Missing required fields: userId, date",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    const db = firestore();

    // Fetch all sheet sales for the user on the specified date
    const salesSnapshot = await db
      .collection("sheetsSales")
      .where("userId", "==", userId)
      .where("date", "==", date)
      .get();

    const sales = salesSnapshot.docs.map((doc) => doc.data());

    response.status(200).json(sales);
  } catch (error: any) {
    logger.error("Error fetching sheets sales", {error: error.message});
    const errorResponse: ApiError = {
      ok: false,
      error: error.message || "Internal server error",
      code: "INTERNAL_ERROR",
    };
    response.status(500).json(errorResponse);
  }
});

/**
 * Update Sheets Sale - Update an existing sheet sale
 */
export const updateSheetsSale = onRequest(async (request, response) => {
  try {
    // Authenticate user
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {id, catalog, sheetsCount} = request.body;

    // Only id is truly required - support partial updates
    if (!id) {
      const error: ApiError = {
        ok: false,
        error: "Missing required field: id",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    // At least one field to update must be provided
    if (catalog === undefined && sheetsCount === undefined) {
      const error: ApiError = {
        ok: false,
        error: "At least one field to update required: catalog or sheetsCount",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    // Validate catalog if provided
    const validCatalogs: CatalogType[] = [
      "Fine Decor",
      "Artvio",
      "Woodrica",
      "Artis 1MM",
    ];
    if (catalog !== undefined && !validCatalogs.includes(catalog)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid catalog",
        code: "INVALID_CATALOG",
      };
      response.status(400).json(error);
      return;
    }

    // Validate sheets count if provided
    if (sheetsCount !== undefined && (typeof sheetsCount !== "number" || sheetsCount <= 0)) {
      const error: ApiError = {
        ok: false,
        error: "Sheets count must be a positive number",
        code: "INVALID_SHEETS_COUNT",
      };
      response.status(400).json(error);
      return;
    }

    const db = firestore();
    const saleRef = db.collection("sheetsSales").doc(id);
    const saleDoc = await saleRef.get();

    if (!saleDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Sheet sale not found",
        code: "NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    // Verify ownership
    const saleData = saleDoc.data();
    if (saleData?.userId !== auth.uid) {
      const error: ApiError = {
        ok: false,
        error: "Unauthorized to update this sheet sale",
        code: "UNAUTHORIZED",
      };
      response.status(403).json(error);
      return;
    }

    // Check if trying to edit data for a past date after 11:59 PM
    const saleDate = saleData?.date; // YYYY-MM-DD
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const nowIST = new Date(now.getTime() + istOffset);
    const currentHour = nowIST.getUTCHours();
    const currentMinute = nowIST.getUTCMinutes();
    const todayIST = nowIST.toISOString().split("T")[0]; // YYYY-MM-DD

    // If it's after 11:59 PM AND trying to edit for today or earlier
    if (currentHour === 23 && currentMinute >= 59) {
      if (saleDate <= todayIST) {
        const error: ApiError = {
          ok: false,
          error: "Cannot edit sheets sales for today after 11:59 PM. Day's reporting closed.",
          code: "REPORTING_CLOSED",
          details: {
            currentTime: nowIST.toISOString(),
            saleDate: saleDate,
          },
        };
        response.status(400).json(error);
        return;
      }
    }

    // If it's past midnight (00:00-05:59) trying to edit for yesterday or earlier
    if (currentHour >= 0 && currentHour < 6) {
      const yesterday = new Date(nowIST);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayIST = yesterday.toISOString().split("T")[0];

      if (saleDate <= yesterdayIST) {
        const error: ApiError = {
          ok: false,
          error: "Cannot edit sheets sales for past dates. Grace period until 6 AM only for previous day.",
          code: "REPORTING_CLOSED",
          details: {
            currentTime: nowIST.toISOString(),
            saleDate: saleDate,
          },
        };
        response.status(400).json(error);
        return;
      }
    }

    // Update the sheet sale - only include provided fields (partial update support)
    const updateData: any = {
      updatedAt: firestore.Timestamp.now(),
    };

    if (catalog !== undefined) {
      updateData.catalog = catalog;
    }

    if (sheetsCount !== undefined) {
      updateData.sheetsCount = sheetsCount;
    }

    await saleRef.update(updateData);

    // Invalidate target cache for this user's month
    const month = saleDate.substring(0, 7); // YYYY-MM
    invalidateTargetCache(auth.uid, month);

    logger.info("Sheet sale updated", {
      saleId: id,
      userId: auth.uid,
      fieldsUpdated: Object.keys(updateData).filter((k) => k !== "updatedAt"),
    });

    response.status(200).json({ok: true, saleId: id});
  } catch (error: any) {
    logger.error("Error updating sheet sale", {error: error.message});
    const errorResponse: ApiError = {
      ok: false,
      error: error.message || "Internal server error",
      code: "INTERNAL_ERROR",
    };
    response.status(500).json(errorResponse);
  }
});

/**
 * Delete Sheets Sale - Delete an existing sheet sale
 */
export const deleteSheetsSale = onRequest(async (request, response) => {
  try {
    // Authenticate user
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {id} = request.body;

    // Validate required fields
    if (!id) {
      const error: ApiError = {
        ok: false,
        error: "Missing required field: id",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    const db = firestore();
    const saleRef = db.collection("sheetsSales").doc(id);
    const saleDoc = await saleRef.get();

    if (!saleDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Sheet sale not found",
        code: "NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    // Verify ownership
    const saleData = saleDoc.data();
    if (saleData?.userId !== auth.uid) {
      const error: ApiError = {
        ok: false,
        error: "Unauthorized to delete this sheet sale",
        code: "UNAUTHORIZED",
      };
      response.status(403).json(error);
      return;
    }

    // Delete the sheet sale
    await saleRef.delete();

    // Invalidate target cache for this user's month
    const saleDate = saleData?.date; // YYYY-MM-DD
    if (saleDate) {
      const month = saleDate.substring(0, 7); // YYYY-MM
      invalidateTargetCache(auth.uid, month);
    }

    logger.info("Sheet sale deleted", {
      saleId: id,
      userId: auth.uid,
    });

    response.status(200).json({ok: true, saleId: id});
  } catch (error: any) {
    logger.error("Error deleting sheet sale", {error: error.message});
    const errorResponse: ApiError = {
      ok: false,
      error: error.message || "Internal server error",
      code: "INTERNAL_ERROR",
    };
    response.status(500).json(errorResponse);
  }
});
