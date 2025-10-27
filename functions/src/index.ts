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
export {logVisit, getVisit, updateVisit, deleteVisit} from "./api/visits";
export {checkIn, checkOut} from "./api/attendance";
export {logSheetsSale, getSheetsSales, updateSheetsSale, deleteSheetsSale} from "./api/sheetsSales";
export {submitExpense, getExpense, updateExpense, deleteExpense} from "./api/expenses";
export {updateProfile} from "./api/profile";
export {createUserByManager, getUsersList, getUserStats, updateUser} from "./api/users";
export {getTeamStats} from "./api/managerStats";
export {reviewDSR, getPendingDSRs, getDSRDetail} from "./api/dsrReview";
export {createAccount, getAccountsList, updateAccount, getAccountDetails, deleteAccount} from "./api/accounts";
export {setTarget, getTarget, getUserTargets, stopAutoRenew} from "./api/targets";
export {uploadDocument, getDocuments, deleteDocument, createDocumentMetadata} from "./api/documents";

// Webhooks
export {leadWebhook} from "./webhooks/lead";

// Scheduled Functions
export {checkSLAViolations} from "./scheduled/slaEscalator";
export {compileDSRReports} from "./scheduled/dsrCompiler";
export {processOutboxEvents} from "./scheduled/outboxProcessor";
export {targetAutoRenewScheduled} from "./scheduled/targetAutoRenew";
export {autoCheckOut} from "./scheduled/autoCheckOut";

// Firestore Triggers
export {onLeadCreated} from "./triggers/onLeadCreated";
export {onLeadSLABreach} from "./triggers/onLeadSLAExpired";
export {onVisitCreated} from "./triggers/onVisitEnded";

// ============================================================================
// ADMIN UTILITIES - Use with caution!
// ============================================================================
// DANGEROUS: Removed from production deployment
// export {seedAccounts, deleteAllAccounts} from "./utils/seed-data";
// export {fixOct17Data} from "./utils/fix-oct17";
// export {fixAllPendingData} from "./utils/fix-all-pending";

// Keep for admin emergency use (gated by role check in implementation)
export {createUser} from "./utils/create-user";
export {createNationalHeadUser} from "./utils/create-national-head";
export {updateRoleByPhone} from "./utils/update-role-by-phone";

// Keep for operational debugging
export {triggerDSRCompiler} from "./utils/trigger-dsr";
export {checkPendingData} from "./utils/check-pending";
export {checkPendingDSRs} from "./utils/check-pending-dsrs";

// Keep for one-time migration (can remove after migration complete)
export {migrateToCustomClaims} from "./utils/migrate-custom-claims";
export {syncStorageDocuments} from "./utils/sync-storage-documents";
