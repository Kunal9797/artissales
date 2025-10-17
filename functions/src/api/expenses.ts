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

    // Check if trying to edit/add data for a past date after 11:59 PM
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const nowIST = new Date(now.getTime() + istOffset);
    const currentHour = nowIST.getUTCHours();
    const currentMinute = nowIST.getUTCMinutes();
    const todayIST = nowIST.toISOString().split("T")[0]; // YYYY-MM-DD

    // If it's after 11:59 PM AND trying to submit for today or earlier
    if (currentHour === 23 && currentMinute >= 59) {
      if (body.date <= todayIST) {
        const error: ApiError = {
          ok: false,
          error: "Cannot add/edit expenses for today after 11:59 PM. Day's reporting closed.",
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

    // If it's past midnight (00:00-05:59) trying to submit for yesterday or earlier
    if (currentHour >= 0 && currentHour < 6) {
      const yesterday = new Date(nowIST);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      const yesterdayIST = yesterday.toISOString().split("T")[0];

      if (body.date <= yesterdayIST) {
        const error: ApiError = {
          ok: false,
          error: "Cannot add/edit expenses for past dates. Grace period until 6 AM only for previous day.",
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

/**
 * Get Expense - Fetch a specific expense by ID
 */
export const getExpense = onRequest({cors: true}, async (request, response) => {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {id} = request.body;

    if (!id) {
      const error: ApiError = {
        ok: false,
        error: "Missing required field: id",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    const expenseDoc = await db.collection("expenses").doc(id).get();

    if (!expenseDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Expense not found",
        code: "NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    const expenseData = expenseDoc.data();

    // Verify ownership
    if (expenseData?.userId !== auth.uid) {
      const error: ApiError = {
        ok: false,
        error: "Unauthorized to access this expense",
        code: "UNAUTHORIZED",
      };
      response.status(403).json(error);
      return;
    }

    response.status(200).json({...expenseData, id: expenseDoc.id});
  } catch (error: any) {
    logger.error("Error fetching expense", {error: error.message});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message || "Unknown error",
    };
    response.status(500).json(apiError);
  }
});

/**
 * Update Expense - Update an existing expense
 */
export const updateExpense = onRequest({cors: true}, async (request, response) => {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {id, date, items, receiptPhotos} = request.body;

    if (!id || !date || !items) {
      const error: ApiError = {
        ok: false,
        error: "Missing required fields: id, date, items",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid date format. Expected YYYY-MM-DD",
        code: "INVALID_DATE_FORMAT",
      };
      response.status(400).json(error);
      return;
    }

    // Check if trying to edit/add data for a past date after 11:59 PM
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const nowIST = new Date(now.getTime() + istOffset);
    const currentHour = nowIST.getUTCHours();
    const currentMinute = nowIST.getUTCMinutes();
    const todayIST = nowIST.toISOString().split("T")[0]; // YYYY-MM-DD

    // If it's after 11:59 PM AND trying to edit for today or earlier
    if (currentHour === 23 && currentMinute >= 59) {
      if (date <= todayIST) {
        const error: ApiError = {
          ok: false,
          error: "Cannot add/edit expenses for today after 11:59 PM. Day's reporting closed.",
          code: "REPORTING_CLOSED",
          details: {
            currentTime: nowIST.toISOString(),
            attemptedDate: date,
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

      if (date <= yesterdayIST) {
        const error: ApiError = {
          ok: false,
          error: "Cannot add/edit expenses for past dates. Grace period until 6 AM only for previous day.",
          code: "REPORTING_CLOSED",
          details: {
            currentTime: nowIST.toISOString(),
            attemptedDate: date,
          },
        };
        response.status(400).json(error);
        return;
      }
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      const error: ApiError = {
        ok: false,
        error: "At least one expense item is required",
        code: "NO_ITEMS",
      };
      response.status(400).json(error);
      return;
    }

    const expenseRef = db.collection("expenses").doc(id);
    const expenseDoc = await expenseRef.get();

    if (!expenseDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Expense not found",
        code: "NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    // Verify ownership
    const expenseData = expenseDoc.data();
    if (expenseData?.userId !== auth.uid) {
      const error: ApiError = {
        ok: false,
        error: "Unauthorized to update this expense",
        code: "UNAUTHORIZED",
      };
      response.status(403).json(error);
      return;
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: ExpenseItemRequest) => sum + item.amount, 0);

    // Update the expense
    const updateData: any = {
      date,
      items,
      totalAmount,
      updatedAt: firestore.Timestamp.now(),
    };

    if (receiptPhotos !== undefined) {
      updateData.receiptPhotos = receiptPhotos;
    }

    await expenseRef.update(updateData);

    logger.info("Expense updated", {
      expenseId: id,
      userId: auth.uid,
      totalAmount,
      itemCount: items.length,
    });

    response.status(200).json({ok: true, expenseId: id, totalAmount});
  } catch (error: any) {
    logger.error("Error updating expense", {error: error.message});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message || "Unknown error",
    };
    response.status(500).json(apiError);
  }
});

/**
 * Delete Expense - Delete an existing expense
 */
export const deleteExpense = onRequest({cors: true}, async (request, response) => {
  try {
    // Verify authentication
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const {id} = request.body;

    if (!id) {
      const error: ApiError = {
        ok: false,
        error: "Missing required field: id",
        code: "VALIDATION_ERROR",
      };
      response.status(400).json(error);
      return;
    }

    const expenseRef = db.collection("expenses").doc(id);
    const expenseDoc = await expenseRef.get();

    if (!expenseDoc.exists) {
      const error: ApiError = {
        ok: false,
        error: "Expense not found",
        code: "NOT_FOUND",
      };
      response.status(404).json(error);
      return;
    }

    // Verify ownership
    const expenseData = expenseDoc.data();
    if (expenseData?.userId !== auth.uid) {
      const error: ApiError = {
        ok: false,
        error: "Unauthorized to delete this expense",
        code: "UNAUTHORIZED",
      };
      response.status(403).json(error);
      return;
    }

    // Delete the expense
    await expenseRef.delete();

    logger.info("Expense deleted", {
      expenseId: id,
      userId: auth.uid,
    });

    response.status(200).json({ok: true, expenseId: id});
  } catch (error: any) {
    logger.error("Error deleting expense", {error: error.message});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error.message || "Unknown error",
    };
    response.status(500).json(apiError);
  }
});
