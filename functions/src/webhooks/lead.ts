/**
 * Lead Webhook Handler
 *
 * Receives lead data from website/external sources
 * Routes lead to rep based on pincode
 * Sets SLA timer (4 hours)
 * Emits events for notifications
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import express from "express";
import {
  WebhookLeadRequest,
  WebhookLeadResponse,
  ApiError,
} from "../types";
import {
  normalizePhoneNumber,
  isValidPhoneNumber,
  isValidPincode,
  validateRequiredFields,
} from "../utils/validation";
import {webhookLimiter} from "../utils/rateLimiter";

/**
 * POST /webhooks/lead
 *
 * Expected body:
 * {
 *   source: "website",
 *   name: "John Dealer",
 *   phone: "9876543210",
 *   email?: "john@example.com",
 *   company?: "ABC Traders",
 *   city: "Delhi",
 *   state: "Delhi",
 *   pincode: "110001",
 *   message?: "Interested in samples"
 * }
 *
 * Rate Limit: 100 requests per 15 minutes per IP
 * Payload Limit: 10KB max
 */

// Create Express app with middleware
const app = express();
app.use(express.json({limit: "10kb"})); // Limit payload size
app.use(webhookLimiter); // Apply rate limiting

app.post("/", async (req, res) => {
  try {
    logger.info("Lead webhook received", {body: req.body});

    // Only accept POST requests
    if (req.method !== "POST") {
      const error: ApiError = {
        ok: false,
        error: "Method not allowed",
        code: "METHOD_NOT_ALLOWED",
      };
      res.status(405).json(error);
      return;
    }

    const body = req.body as WebhookLeadRequest;

    // Validate required fields
    const validation = validateRequiredFields(body, [
      "source",
      "name",
      "phone",
      "city",
      "state",
      "pincode",
    ]);

    if (!validation.valid) {
      const error: ApiError = {
        ok: false,
        error: "Missing required fields",
        code: "VALIDATION_ERROR",
        details: {missing: validation.missing},
      };
      res.status(400).json(error);
      return;
    }

    // Validate and normalize phone
    const normalizedPhone = normalizePhoneNumber(body.phone);
    if (!isValidPhoneNumber(normalizedPhone)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid phone number",
        code: "INVALID_PHONE",
      };
      res.status(400).json(error);
      return;
    }

    // Validate pincode
    if (!isValidPincode(body.pincode)) {
      const error: ApiError = {
        ok: false,
        error: "Invalid pincode",
        code: "INVALID_PINCODE",
      };
      res.status(400).json(error);
      return;
    }

    // TODO: Implement lead routing logic
    // 1. Check for duplicate lead by phone
    // 2. Lookup pincode route to find assigned rep
    // 3. Create lead document in Firestore
    // 4. Set slaDueAt = now() + 4 hours
    // 5. Emit LeadCreated and LeadAssigned events
    // 6. Return response

    // Placeholder response
    const result: WebhookLeadResponse = {
      ok: true,
      leadId: "placeholder_lead_id",
      ownerUserId: "placeholder_rep_id",
      slaDueAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    };

    logger.info("Lead created successfully", {leadId: result.leadId});
    res.status(200).json(result);
  } catch (error) {
    logger.error("Error processing lead webhook", {error});
    const apiError: ApiError = {
      ok: false,
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error,
    };
    res.status(500).json(apiError);
  }
});

// Export as Cloud Function
export const leadWebhook = onRequest(
  {
    cors: true,
    maxInstances: 10,
  },
  app
);
