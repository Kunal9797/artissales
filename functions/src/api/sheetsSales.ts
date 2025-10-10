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
      "Artis",
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

    const db = firestore();
    const now = firestore.Timestamp.now();

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
      createdAt: now,
    };

    await saleRef.set(saleData);

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
