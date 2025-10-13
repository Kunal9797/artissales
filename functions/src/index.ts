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
export {updateProfile} from "./api/profile";
export {createUserByManager, getUsersList, getUserStats, updateUser} from "./api/users";
export {getTeamStats} from "./api/managerStats";
export {reviewDSR, getPendingDSRs} from "./api/dsrReview";
export {createAccount, getAccountsList, updateAccount} from "./api/accounts";
export {setTarget, getTarget, getUserTargets, stopAutoRenew} from "./api/targets";

// Webhooks
export {leadWebhook} from "./webhooks/lead";

// Scheduled Functions
export {checkSLAViolations} from "./scheduled/slaEscalator";
export {compileDSRReports} from "./scheduled/dsrCompiler";
export {processOutboxEvents} from "./scheduled/outboxProcessor";
export {targetAutoRenewScheduled} from "./scheduled/targetAutoRenew";

// Firestore Triggers
export {onLeadCreated} from "./triggers/onLeadCreated";
export {onLeadSLABreach} from "./triggers/onLeadSLAExpired";
export {onVisitCreated} from "./triggers/onVisitEnded";

// Utilities (one-time use)
export {seedAccounts, deleteAllAccounts} from "./utils/seed-data";
export {createUser} from "./utils/create-user";
export {createNationalHeadUser} from "./utils/create-national-head";
export {updateRoleByPhone} from "./utils/update-role-by-phone";
export {triggerDSRCompiler} from "./utils/trigger-dsr";
