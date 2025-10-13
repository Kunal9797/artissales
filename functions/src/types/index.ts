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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// ACCOUNTS TYPES (Distributors, Dealers, Architects & Contractors)
// ============================================================================

export type AccountType = "distributor" | "dealer" | "architect" | "contractor";
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
  accountType: AccountType; // "distributor" | "dealer" | "architect" | "contractor"

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

export type CatalogType = "Fine Decor" | "Artvio" | "Woodrica" | "Artis";

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
// DSR (DAILY SALES REPORT) TYPES
// ============================================================================

export type DSRStatus = "pending" | "approved" | "needs_revision";

export interface SheetsSalesSummary {
  catalog: CatalogType;
  totalSheets: number;
}

export interface ExpenseSummary {
  category: string; // ExpenseCategory or custom
  totalAmount: number;
}

export interface DSRReport {
  id: string; // Format: {userId}_{YYYY-MM-DD}
  userId: string;
  date: string; // YYYY-MM-DD

  // Auto-compiled stats
  checkInAt?: Timestamp;
  checkOutAt?: Timestamp;
  totalVisits: number;
  visitIds: string[];
  leadsContacted: number;
  leadIds: string[];

  // Sheets sales summary
  sheetsSales: SheetsSalesSummary[]; // e.g., [{catalog: "Artis", totalSheets: 50}, ...]
  totalSheetsSold: number; // Sum across all catalogs

  // Expenses summary
  expenses: ExpenseSummary[]; // e.g., [{category: "travel", totalAmount: 500}, ...]
  totalExpenses: number; // Sum of all expenses in INR

  // Manager review
  status: DSRStatus;
  reviewedBy?: string; // Manager userId
  reviewedAt?: Timestamp;
  managerComments?: string;

  // Metadata
  generatedAt: Timestamp;
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

// Visit Log (Photo-based verification)
export interface VisitLogRequest {
  accountId: string;
  purpose: VisitPurpose;
  notes?: string;
  photos: string[]; // REQUIRED - Storage URLs (min 1)
  requestId?: string; // For idempotency
}

export interface VisitLogResponse {
  ok: boolean;
  visitId: string;
  timestamp: string; // ISO 8601
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
// MANAGER API TYPES (User Management, DSR Approval, Reports)
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

// Review DSR
export interface ReviewDSRRequest {
  reportId: string; // DSR document ID (format: {userId}_{YYYY-MM-DD})
  status: "approved" | "needs_revision";
  comments?: string; // Optional manager comments
}

export interface ReviewDSRResponse {
  ok: true;
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
  "Artis"?: number;
}

export interface Target {
  id: string; // Format: {userId}_{YYYY-MM}
  userId: string; // Rep assigned this target
  month: string; // YYYY-MM (e.g., "2025-10")

  // Target by catalog (undefined = no target set for that catalog)
  targetsByCatalog: TargetsByCatalog;

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

// ============================================================================
// TARGET API TYPES
// ============================================================================

// Set Target
export interface SetTargetRequest {
  userId: string;
  month: string; // YYYY-MM
  targetsByCatalog: TargetsByCatalog;
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
  progress?: TargetProgress[]; // Only if target exists
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
// UTILITY TYPES
// ============================================================================

export interface ApiError {
  ok: false;
  error: string;
  code: string;
  details?: any;
}

export type ApiResponse<T> = T | ApiError;
