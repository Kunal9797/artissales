/**
 * Expense Reporting API
 *
 * Endpoints for sales reps to submit daily expenses (travel, food, etc.)
 * Supports multiple expense items in one report
 * Manager approval workflow
 */

import {onRequest} from "firebase-functions/v2/https";
import {firestore} from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {
  ApiError,
  Expense,
  ExpenseItem,
} from "../types";
import {validateRequiredFields} from "../utils/validation";
import {requireAuth} from "../utils/auth";

const db = firestore();

/**
 * Individual expense item in a report
 */
export interface ExpenseItemRequest {
  amount: number; // In INR
  category: "travel" | "food" | "accommodation" | "other";
  categoryOther?: string; // Required when category is "other"
  description: string;
}

/**
 * Request body for submitting an expense report
 */
export interface SubmitExpenseRequest {
  date: string; // YYYY-MM-DD
  items: ExpenseItemRequest[]; // Array of expense items
  receiptPhotos?: string[]; // Optional receipt photo URLs from Storage
  requestId?: string; // For idempotency
}

/**
 * Response for expense submission
 */
export interface SubmitExpenseResponse {
  ok: boolean;
  expenseId: string;
  totalAmount: number;
  itemCount: number;
  status: "pending" | "approved" | "rejected";
}

/**
 * POST /api/expenses/submit
 *
 * Submit a daily expense report with multiple items
 */
export const submitExpense = onRequest({cors: true}, async (request, response) => {
  try {
    // Only POST allowed
    if (request.method !== "POST") {
      const error: ApiError = {
        ok: false,
        error: "Method not allowed",
        code: "METHOD_NOT_ALLOWED",
      };
      response.status(405).json(error);
      return;
    }

    // Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const body = request.body as SubmitExpenseRequest;

    // Validate required fields
    const validation = validateRequiredFields(body, [
      "date",
      "items",
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

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(body.date)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid date format. Expected YYYY-MM-DD",
        code: "INVALID_DATE_FORMAT",
        details: {provided: body.date},
      };
      response.status(400).json(error);
      return;
    }

    // Validate items array
    if (!Array.isArray(body.items) || body.items.length === 0) {
      const error: ApiError = {
        ok: false,
        error: "At least one expense item is required",
        code: "NO_ITEMS",
      };
      response.status(400).json(error);
      return;
    }

    // Validate each item
    const validCategories = ["travel", "food", "accommodation", "other"];
    const validatedItems: ExpenseItem[] = [];
    let totalAmount = 0;

    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i];

      // Validate amount
      if (typeof item.amount !== "number" || item.amount <= 0) {
        const error: ApiError = {
          ok: false,
          error: `Item ${i + 1}: Amount must be a positive number`,
          code: "INVALID_ITEM_AMOUNT",
          details: {itemIndex: i, provided: item.amount},
        };
        response.status(400).json(error);
        return;
      }

      // Validate category
      if (!validCategories.includes(item.category)) {
        const error: ApiError = {
          ok: false,
          error: `Item ${i + 1}: Invalid category`,
          code: "INVALID_ITEM_CATEGORY",
          details: {
            itemIndex: i,
            provided: item.category,
            valid: validCategories,
          },
        };
        response.status(400).json(error);
        return;
      }

      // Validate categoryOther for "other" category
      if (item.category === "other") {
        if (!item.categoryOther || item.categoryOther.trim().length === 0) {
          const error: ApiError = {
            ok: false,
            error: `Item ${i + 1}: Category name is required when selecting "Other"`,
            code: "MISSING_CATEGORY_OTHER",
            details: {itemIndex: i},
          };
          response.status(400).json(error);
          return;
        }
      }

      // Validate description
      if (!item.description || item.description.trim().length === 0) {
        const error: ApiError = {
          ok: false,
          error: `Item ${i + 1}: Description cannot be empty`,
          code: "EMPTY_ITEM_DESCRIPTION",
          details: {itemIndex: i},
        };
        response.status(400).json(error);
        return;
      }

      // Add validated item
      validatedItems.push({
        amount: item.amount,
        category: item.category,
        ...(item.categoryOther && {categoryOther: item.categoryOther.trim()}),
        description: item.description.trim(),
      });

      totalAmount += item.amount;
    }

    // Validate receipt photos if provided
    if (body.receiptPhotos) {
      if (!Array.isArray(body.receiptPhotos)) {
        const error: ApiError = {
          ok: false,
          error: "Receipt photos must be an array",
          code: "INVALID_RECEIPT_PHOTOS",
        };
        response.status(400).json(error);
        return;
      }

      const invalidPhotos = body.receiptPhotos.filter(
        (url) => !url || typeof url !== "string" || url.trim().length === 0
      );
      if (invalidPhotos.length > 0) {
        const error: ApiError = {
          ok: false,
          error: "Invalid receipt photo URLs",
          code: "INVALID_RECEIPT_URL",
        };
        response.status(400).json(error);
        return;
      }
    }

    // Create expense document
    const expenseData: Partial<Expense> = {
      userId: auth.uid,
      date: body.date,
      items: validatedItems,
      totalAmount,
      receiptPhotos: body.receiptPhotos || [],
      status: "pending", // All expenses start as pending
      createdAt: firestore.Timestamp.now(),
    };

    // Add expense to Firestore
    const expenseRef = await db.collection("expenses").add(expenseData);

    logger.info("Expense report submitted successfully", {
      expenseId: expenseRef.id,
      userId: auth.uid,
      totalAmount,
      itemCount: validatedItems.length,
      date: body.date,
    });

    const result: SubmitExpenseResponse = {
      ok: true,
      expenseId: expenseRef.id,
      totalAmount,
      itemCount: validatedItems.length,
      status: "pending",
    };

    response.status(200).json(result);
  } catch (error) {
    logger.error("Error submitting expense", {error});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error,
    };
    response.status(500).json(apiError);
  }
});
