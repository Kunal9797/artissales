/**
 * Artis Sales App - Cloud Functions Entry Point
 *
 * This file exports all Cloud Functions for deployment
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export all functions
// ============================================================================

// API Endpoints
export {logVisit} from "./api/visits";
export {checkIn, checkOut} from "./api/attendance";
export {logSheetsSale} from "./api/sheetsSales";
export {submitExpense} from "./api/expenses";

// Webhooks
export {leadWebhook} from "./webhooks/lead";

// Scheduled Functions
export {checkSLAViolations} from "./scheduled/slaEscalator";
export {compileDSRReports} from "./scheduled/dsrCompiler";
export {processOutboxEvents} from "./scheduled/outboxProcessor";

// Firestore Triggers
export {onLeadCreated} from "./triggers/onLeadCreated";
export {onLeadSLABreach} from "./triggers/onLeadSLAExpired";
export {onVisitCreated} from "./triggers/onVisitEnded";

// Utilities (one-time use)
export {seedAccounts, deleteAllAccounts} from "./utils/seed-data";
