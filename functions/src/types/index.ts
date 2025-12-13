/**
 * Artis Sales App - Type Definitions
 *
 * This file contains all TypeScript type definitions for the app.
 * These types are the single source of truth for data models.
 */

import {Timestamp, GeoPoint} from "firebase-admin/firestore";

// ============================================================================
// USER TYPES
// ============================================================================

export type UserRole =
  | "rep"
  | "area_manager"
  | "zonal_head"
  | "national_head"
  | "admin";

export interface User {
  id: string;
  name: string;
  phone: string; // Normalized: +91XXXXXXXXXX
  email?: string;
  role: UserRole;
  isActive: boolean;
  reportsToUserId?: string; // Manager hierarchy
  territory?: string; // Area/zone assignment
  primaryDistributorId?: string; // For reps assigned to distributors
  profilePhotoUrl?: string; // Firebase Storage URL for profile photo
  lastActiveAt?: Timestamp; // Auto-updated when user logs activity (visits, sales, expenses)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// ACCOUNTS TYPES (Distributors, Dealers, Architects & OEMs)
// ============================================================================

export type AccountType = "distributor" | "dealer" | "architect" | "OEM";
export type AccountStatus = "active" | "inactive";

export interface Account {
  id: string;
  name: string; // "ABC Laminates Pvt Ltd"
  type: AccountType;

  // Assignment
  territory: string; // "Delhi NCR"
  assignedRepUserId: string; // Rep responsible for this account

  // Hierarchy
  parentDistributorId?: string; // For dealers/architects under a distributor

  // Contact
  contactPerson?: string; // "Mr. Sharma"
  phone: string; // Normalized: +91XXXXXXXXXX
  email?: string;
  birthdate?: string; // YYYY-MM-DD (for dealers and architects)

  // Location
  address?: string; // "123 Main Street, Delhi"
  city: string;
  state: string;
  pincode: string;
  geoLocation?: GeoPoint; // Optional GPS coordinates

  // Status
  status: AccountStatus;
  lastVisitAt?: Timestamp; // Auto-updated from visits

  // Metadata
  createdByUserId: string; // Who added this account
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Flexible fields for future
  extra?: Record<string, any>; // Can add: gst, pan, targets, etc.
}

// ============================================================================
// PINCODE ROUTING TYPES
// ============================================================================

export interface PincodeRoute {
  pincode: string; // Document ID
  repUserId: string; // Primary rep for this pincode
  backupRepUserId?: string; // Fallback for SLA escalation
  territory: string; // Area/zone name
  updatedAt: Timestamp;
}

// ============================================================================
// LEAD TYPES
// ============================================================================

export type LeadSource =
  | "website"
  | "referral"
  | "cold_call"
  | "exhibition"
  | "other";

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "quoted"
  | "won"
  | "lost";

export interface LeadAssignmentHistoryEntry {
  userId: string;
  assignedAt: Timestamp;
  reason: "initial" | "sla_expired" | "manual";
}

export interface Lead {
  id: string;
  source: LeadSource;

  // Customer info
  name: string;
  phone: string; // Normalized, indexed
  email?: string;
  company?: string;
  city: string;
  state: string;
  pincode: string;
  message?: string;

  // Routing & status
  status: LeadStatus;
  ownerUserId: string; // Current assigned rep
  assignmentHistory: LeadAssignmentHistoryEntry[];

  // SLA tracking
  createdAt: Timestamp;
  slaDueAt: Timestamp; // createdAt + 4 hours
  firstTouchAt?: Timestamp; // When rep first contacted
  slaBreached: boolean;

  // Additional
  extra?: Record<string, any>; // Flexible data
}

// ============================================================================
// VISIT TYPES (Simplified)
// ============================================================================

export type VisitPurpose =
  | "meeting"
  | "order"
  | "payment"
  | "sample_delivery"
  | "folder_delivery"
  | "follow_up"
  | "complaint"
  | "new_lead"
  | "site_visit"
  | "other";

export interface Visit {
  id: string;
  userId: string; // Rep who made visit

  // Account info (denormalized for easy reading)
  accountId: string; // Link to accounts collection
  accountName: string; // "ABC Laminates"
  accountType: AccountType; // "distributor" | "dealer" | "architect" | "OEM"

  // When (single timestamp - when visit was logged)
  timestamp: Timestamp; // When visit logged

  // Visit details
  purpose: VisitPurpose;
  notes?: string; // Optional notes (voice-to-text or typed)
  photos: string[]; // REQUIRED - Counter photo URLs from Storage (min 1)

  // Metadata
  createdAt: Timestamp;

  // Flexible fields for future (order value, payment amount, etc.)
  extra?: Record<string, any>;
}

// ============================================================================
// ATTENDANCE TYPES
// ============================================================================

export type AttendanceType = "check_in" | "check_out";

export interface AttendanceDeviceInfo {
  isMocked: boolean; // GPS spoofing detection
  battery: number;
  timezone: string;
}

export interface Attendance {
  id: string;
  userId: string;
  type: AttendanceType;
  timestamp: Timestamp;
  geo: GeoPoint;
  accuracyM: number;
  deviceInfo?: AttendanceDeviceInfo;
}

// ============================================================================
// SHEETS SALES TYPES (Daily Sales Tracking)
// ============================================================================

export type CatalogType = "Fine Decor" | "Artvio" | "Woodrica" | "Artis 1MM";

export interface SheetsSale {
  id: string;
  userId: string; // Rep who logged the sale
  date: string; // YYYY-MM-DD

  // Catalog selection
  catalog: CatalogType;
  sheetsCount: number; // Number of sheets sold

  // Optional details
  notes?: string;
  distributorId?: string; // Optional link to account (for verification later)
  distributorName?: string;

  // Verification (for future incentive calculation)
  verified: boolean; // Default: false
  verifiedBy?: string; // Manager userId
  verifiedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
}

// ============================================================================
// EXPENSE TYPES (Daily Expense Reporting)
// ============================================================================

export type ExpenseCategory = "travel" | "food" | "accommodation" | "other";
export type ExpenseStatus = "pending" | "approved" | "rejected";

// Individual expense item within a report
export interface ExpenseItem {
  amount: number; // In INR
  category: ExpenseCategory;
  categoryOther?: string; // Required when category is "other"
  description: string; // Brief description
}

// Daily expense report (can contain multiple items)
export interface Expense {
  id: string;
  userId: string; // Rep who incurred expense
  date: string; // YYYY-MM-DD

  // Expense items (multiple expenses in one report)
  items: ExpenseItem[]; // Array of expense items
  totalAmount: number; // Sum of all items (auto-calculated)
  receiptPhotos: string[]; // Optional receipt photo URLs

  // Approval workflow
  status: ExpenseStatus;
  reviewedBy?: string; // Manager userId
  reviewedAt?: Timestamp;
  managerComments?: string;

  // Metadata
  createdAt: Timestamp;
}

// ============================================================================
// EVENT OUTBOX TYPES (Event-Driven Architecture)
// ============================================================================

export type EventType =
  | "LeadCreated"
  | "LeadAssigned"
  | "LeadSLAExpired"
  | "VisitStarted"
  | "VisitEnded"
  | "AttendanceCheckedIn"
  | "AttendanceCheckedOut";

export interface OutboxEvent {
  id: string;
  eventType: EventType;
  payload: Record<string, any>;
  createdAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string; // Function name
  retryCount: number;
  error?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// Webhook: Lead Creation
export interface WebhookLeadRequest {
  source: LeadSource;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  city: string;
  state: string;
  pincode: string;
  message?: string;
}

export interface WebhookLeadResponse {
  ok: boolean;
  leadId: string;
  ownerUserId: string;
  slaDueAt: string; // ISO 8601
}

// Attendance Check-in/out
export interface AttendanceRequest {
  lat: number;
  lon: number;
  accuracyM: number;
  deviceInfo?: AttendanceDeviceInfo;
  requestId?: string; // For idempotency
}

export interface AttendanceResponse {
  ok: boolean;
  id: string;
  timestamp: string; // ISO 8601
}

// Visit Log (Photo OR GPS verification)
export interface VisitLogRequest {
  accountId: string;
  purpose: VisitPurpose;
  notes?: string;
  photos?: string[]; // Storage URLs - optional if GPS provided
  requestId?: string; // For idempotency
  geo?: { // GPS verification - optional if photos provided
    lat: number;
    lon: number;
    accuracyM?: number;
  };
  // Validation: At least one of photos (min 1) OR geo must be provided
}

export interface VisitLogResponse {
  ok: boolean;
  visitId: string;
  timestamp: string; // ISO 8601
  autoCheckedIn?: boolean; // True if auto check-in was triggered
}

// Lead First Touch
export interface LeadFirstTouchRequest {
  leadId: string;
  requestId?: string;
}

export interface LeadFirstTouchResponse {
  ok: boolean;
  leadId: string;
  firstTouchAt: string; // ISO 8601
}

// ============================================================================
// MANAGER API TYPES (User Management, Reports)
// ============================================================================

// Create User By Manager
export interface CreateUserByManagerRequest {
  phone: string; // 10-digit Indian mobile
  name: string; // User's full name
  role: UserRole;
  territory: string; // City name
  primaryDistributorId?: string; // Optional distributor assignment
}

export interface CreateUserByManagerResponse {
  ok: true;
  userId: string;
  message: string;
}

// Get Rep Report
export interface GetRepReportRequest {
  userId: string; // Rep's user ID
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface GetRepReportResponse {
  ok: true;
  report: {
    userId: string;
    userName: string;
    dateRange: {
      start: string;
      end: string;
    };
    attendance: {
      daysPresent: number;
      totalWorkingDays: number;
      attendancePercentage: number;
    };
    visits: {
      total: number;
      distributor: number;
      dealer: number;
      architect: number;
    };
    sheetsSales: {
      total: number;
      byCatalog: {
        "Fine Decor": number;
        "Artvio": number;
        "Woodrica": number;
        "Artis": number;
      };
    };
    expenses: {
      totalAmount: number;
      count: number;
      byCategory: Record<string, number>;
    };
  };
}

// Get Users List
export interface GetUsersListRequest {
  role?: UserRole; // Optional filter by role
}

export interface GetUsersListResponse {
  ok: true;
  users: Array<{
    id: string;
    name: string;
    phone: string;
    role: UserRole;
    territory: string;
    primaryDistributorId?: string;
  }>;
}

// Get User Stats
export interface GetUserStatsRequest {
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

// Create Account
export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  contactPerson?: string;
  phone: string; // 10 digits
  email?: string;
  birthdate?: string; // YYYY-MM-DD (for dealers and architects)
  address?: string;
  city: string;
  state: string;
  pincode: string; // 6 digits
  parentDistributorId?: string; // For dealers/architects
}

export interface CreateAccountResponse {
  ok: true;
  accountId: string;
  message: string;
}

// Get Accounts List
export interface GetAccountsListRequest {
  type?: AccountType; // Optional filter by type
}

export interface GetAccountsListResponse {
  ok: true;
  accounts: Array<{
    id: string;
    name: string;
    type: AccountType;
    contactPerson?: string;
    phone: string;
    email?: string;
    birthdate?: string; // YYYY-MM-DD
    address?: string;
    city: string;
    state: string;
    pincode: string;
    territory: string;
    assignedRepUserId: string;
    parentDistributorId?: string;
    createdByUserId: string;
    lastVisitAt?: string; // ISO 8601
  }>;
}

// ============================================================================
// TARGET TYPES (Monthly Sales Targets)
// ============================================================================

export interface TargetsByCatalog {
  "Fine Decor"?: number;
  "Artvio"?: number;
  "Woodrica"?: number;
  "Artis 1MM"?: number;
}

// Visit targets by account type
export interface TargetsByAccountType {
  dealer?: number;
  architect?: number;
  OEM?: number;
}

export interface Target {
  id: string; // Format: {userId}_{YYYY-MM}
  userId: string; // Rep assigned this target
  month: string; // YYYY-MM (e.g., "2025-10")

  // Target by catalog (undefined = no target set for that catalog)
  targetsByCatalog: TargetsByCatalog;

  // Visit targets by account type (optional)
  targetsByAccountType?: TargetsByAccountType;

  // Auto-renew settings
  autoRenew: boolean; // If true, copy to next month automatically
  sourceTargetId?: string; // Reference to original target (if auto-copied)

  // Who set this target
  createdBy: string; // Manager userId
  createdByName: string; // Manager name (denormalized)

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Target progress (calculated from sheetsSales)
export interface TargetProgress {
  catalog: CatalogType;
  target: number;
  achieved: number;
  percentage: number; // 0-100
}

// Visit progress (calculated from visits)
export interface VisitProgress {
  accountType: "dealer" | "architect" | "OEM";
  target: number;
  achieved: number;
  percentage: number; // 0-100
}

// ============================================================================
// TARGET API TYPES
// ============================================================================

// Set Target
export interface SetTargetRequest {
  userId: string;
  month: string; // YYYY-MM
  targetsByCatalog: TargetsByCatalog;
  targetsByAccountType?: TargetsByAccountType; // Optional visit targets
  autoRenew: boolean;
  updateFutureMonths?: boolean; // For editing existing auto-renewed targets
}

export interface SetTargetResponse {
  ok: true;
  targetId: string;
  message: string;
}

// Get Target
export interface GetTargetRequest {
  userId: string;
  month: string; // YYYY-MM
}

export interface GetTargetResponse {
  ok: true;
  target: Target | null;
  progress?: TargetProgress[]; // Sheet sales progress
  visitProgress?: VisitProgress[]; // Visit progress
}

// Get User Targets (for manager to see all team targets)
export interface GetUserTargetsRequest {
  month: string; // YYYY-MM
}

export interface UserTargetSummary {
  userId: string;
  userName: string;
  territory: string;
  target: Target | null;
  progress: TargetProgress[];
  totalAchieved: number;
  totalTarget: number;
  overallPercentage: number;
}

export interface GetUserTargetsResponse {
  ok: true;
  targets: UserTargetSummary[];
}

// Stop Auto Renew
export interface StopAutoRenewRequest {
  userId: string;
  month: string; // YYYY-MM - stop from this month onwards
}

export interface StopAutoRenewResponse {
  ok: true;
  message: string;
}

// ============================================================================
// DOCUMENT LIBRARY TYPES
// ============================================================================

export type DocumentFileType = "pdf" | "image";

export interface Document {
  id: string;
  name: string;
  description?: string;
  fileUrl: string; // Firebase Storage download URL
  fileType: DocumentFileType;
  fileSizeBytes: number;
  uploadedBy: string; // userId (manager/national_head)
  uploadedByName: string;
  uploadedAt: Timestamp;
}

export interface UploadDocumentRequest {
  name: string;
  description?: string;
  // File uploaded separately via multipart/form-data
}

export interface UploadDocumentResponse {
  ok: true;
  documentId: string;
  fileUrl: string;
}

export interface GetDocumentsRequest {
  // No filters for now - return all documents
}

export interface GetDocumentsResponse {
  ok: true;
  documents: Document[];
}

export interface DeleteDocumentRequest {
  documentId: string;
}

export interface DeleteDocumentResponse {
  ok: true;
  message: string;
}

// ============================================================================
// INCENTIVE SCHEME TYPES
// ============================================================================

export interface IncentiveScheme {
  id: string;
  name: string; // e.g., "Q4 Fine Decor Bonus"
  description: string;

  // Eligibility
  userIds: string[]; // Which reps this applies to
  territory?: string; // Optional: area/zone filter

  // Rules (sheet sales only for now)
  type: "sheets"; // Future: 'visits' | 'combined'
  catalog?: CatalogType; // Specific catalog or undefined (all catalogs)
  targetSheets: number; // e.g., 500
  rewardAmount: number; // e.g., 5000 (in INR)

  // Time period
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD

  // Status
  isActive: boolean;
  createdBy: string; // National Head userId
  createdByName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface IncentiveResult {
  id: string;
  schemeId: string;
  schemeName: string;
  userId: string;
  userName: string;

  // Calculation
  actualSheets: number;
  targetSheets: number;
  qualified: boolean; // actualSheets >= targetSheets
  rewardAmount: number; // 0 if not qualified

  // Period
  periodStart: string; // YYYY-MM-DD
  periodEnd: string; // YYYY-MM-DD

  // Metadata
  calculatedAt: Timestamp;
}

export interface CreateIncentiveSchemeRequest {
  name: string;
  description: string;
  userIds: string[];
  territory?: string;
  catalog?: CatalogType;
  targetSheets: number;
  rewardAmount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface CreateIncentiveSchemeResponse {
  ok: true;
  schemeId: string;
}

export interface GetActiveSchemesRequest {
  // userId from auth token
}

export interface ActiveSchemeWithProgress extends IncentiveScheme {
  currentSheets: number; // Current progress
  progressPercent: number; // 0-100
}

export interface GetActiveSchemesResponse {
  ok: true;
  schemes: ActiveSchemeWithProgress[];
}

export interface GetIncentiveResultsRequest {
  // userId from auth token
}

export interface GetIncentiveResultsResponse {
  ok: true;
  results: IncentiveResult[];
  totalEarned: number; // Sum of all qualified rewardAmounts
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface ApiError {
  ok: false;
  error: string;
  code: string;
  details?: any;
}

export type ApiResponse<T> = T | ApiError;

// ============================================================================
// APPROVAL TYPES (Manager Review)
// ============================================================================

export type PendingItemType = "sheets" | "expense";

export interface PendingItem {
  id: string;
  type: PendingItemType;
  userId: string;
  userName: string;
  date: string; // YYYY-MM-DD

  // For sheets
  catalog?: string;
  sheetsCount?: number;

  // For expenses
  amount?: number;
  category?: string;
  description?: string;
  receiptPhotos?: string[];

  // Common
  createdAt: string; // ISO 8601
}

export interface GetPendingItemsResponse {
  ok: true;
  items: PendingItem[];
  counts: {
    sheets: number;
    expenses: number;
    total: number;
  };
}

export interface ApproveItemRequest {
  itemId: string;
  type: PendingItemType;
}

export interface ApproveItemResponse {
  ok: true;
  message: string;
}

export interface RejectItemRequest {
  itemId: string;
  type: PendingItemType;
  comment?: string;
}

export interface RejectItemResponse {
  ok: true;
  message: string;
}

// ============================================================================
// FEEDBACK TYPES (User Support/Help)
// ============================================================================

export type FeedbackStatus = "new" | "in_progress" | "resolved";

export interface FeedbackDeviceInfo {
  platform: "ios" | "android";
  osVersion: string;
  appVersion: string;
}

export interface Feedback {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  userPhone: string;
  userTerritory?: string;
  message: string;
  screenshotUrls: string[];
  deviceInfo: FeedbackDeviceInfo;
  status: FeedbackStatus;
  resolvedBy?: string;
  resolvedAt?: Timestamp;
  adminNotes?: string;
  createdAt: Timestamp;
}

export interface SubmitFeedbackRequest {
  message: string;
  screenshotUrls?: string[];
  deviceInfo: FeedbackDeviceInfo;
}

export interface SubmitFeedbackResponse {
  ok: true;
  feedbackId: string;
  message: string;
}
