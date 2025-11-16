/**
 * TypeScript Type Definitions
 *
 * These types mirror the backend types defined in /functions/src/types/index.ts
 * Ensures type safety between frontend and backend.
 */

/**
 * User Roles
 */
export type UserRole = 'rep' | 'area_manager' | 'zonal_head' | 'national_head' | 'admin';

/**
 * User/Employee Model
 */
export interface User {
  id: string;
  name: string;
  phone: string; // Normalized: +91XXXXXXXXXX
  email?: string;
  role: UserRole;
  isActive: boolean;
  reportsToUserId?: string; // Manager hierarchy
  territory?: string; // Area/zone assignment
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Pincode Route Model
 */
export interface PincodeRoute {
  pincode: string; // Document ID
  repUserId: string; // Primary rep
  backupRepUserId?: string; // Fallback for SLA escalation
  territory: string;
  updatedAt: Date;
}

/**
 * Lead Source
 */
export type LeadSource = 'website' | 'referral' | 'cold_call' | 'exhibition' | 'other';

/**
 * Lead Status
 */
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'quoted' | 'won' | 'lost';

/**
 * Lead Assignment History Entry
 */
export interface LeadAssignmentHistory {
  userId: string;
  assignedAt: Date;
  reason: 'initial' | 'sla_expired' | 'manual';
}

/**
 * Lead Model
 */
export interface Lead {
  id: string;
  source: LeadSource;

  // Customer info
  name: string;
  phone: string;
  email?: string;
  company?: string;
  city: string;
  state: string;
  pincode: string;
  message?: string;

  // Routing & status
  status: LeadStatus;
  ownerUserId: string; // Current assigned rep
  assignmentHistory: LeadAssignmentHistory[];

  // SLA tracking
  createdAt: Date;
  slaDueAt: Date; // createdAt + 4 hours
  firstTouchAt?: Date; // When rep first contacted
  slaBreached: boolean;

  // Additional
  extra?: Record<string, any>;
}

/**
 * Account Type
 */
export type AccountType = 'distributor' | 'dealer' | 'architect';

/**
 * Visit Purpose
 */
export type VisitPurpose =
  | 'sample_delivery'
  | 'follow_up'
  | 'complaint'
  | 'new_lead'
  | 'payment_collection'
  | 'other';

/**
 * Visit Model
 */
export interface Visit {
  id: string;
  userId: string; // Rep who made visit

  // Account info (denormalized)
  accountId: string;
  accountName: string;
  accountType: AccountType;

  // Visit details
  timestamp: Date;
  purpose: VisitPurpose;
  notes?: string;
  photos: string[]; // REQUIRED - Counter photo URLs (min 1)

  // Metadata
  createdAt: Date;
  extra?: Record<string, any>;
}

/**
 * Laminate Catalog
 */
export type LaminateCatalog = 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis';

/**
 * Sheets Sale Model
 */
export interface SheetsSale {
  id: string;
  userId: string; // Rep who logged the sale
  date: string; // YYYY-MM-DD

  // Catalog selection
  catalog: LaminateCatalog;
  sheetsCount: number;

  // Optional details
  notes?: string;
  distributorId?: string;
  distributorName?: string;

  // Verification (for future incentive calculation)
  verified: boolean; // Default: false
  verifiedBy?: string; // Manager userId
  verifiedAt?: Date;

  // Metadata
  createdAt: Date;
}

/**
 * Expense Category
 */
export type ExpenseCategory = 'travel' | 'food' | 'accommodation' | 'other';

/**
 * Expense Status
 */
export type ExpenseStatus = 'pending' | 'approved' | 'rejected';

/**
 * Expense Model
 */
export interface Expense {
  id: string;
  userId: string; // Rep who incurred expense
  date: string; // YYYY-MM-DD

  // Expense details
  amount: number; // In INR
  category: ExpenseCategory;
  description: string;
  receiptPhoto?: string; // Optional receipt photo URL

  // Approval workflow
  status: ExpenseStatus;
  reviewedBy?: string; // Manager userId
  reviewedAt?: Date;
  managerComments?: string;

  // Metadata
  createdAt: Date;
}

/**
 * Attendance Type
 */
export type AttendanceType = 'check_in' | 'check_out';

/**
 * Attendance Device Info
 */
export interface AttendanceDeviceInfo {
  isMocked: boolean; // GPS spoofing detection
  battery: number;
  timezone: string;
}

/**
 * Attendance Model
 */
export interface Attendance {
  id: string;
  userId: string;
  type: AttendanceType;
  timestamp: Date;
  geo: {
    latitude: number;
    longitude: number;
  };
  accuracyM: number;
  deviceInfo?: AttendanceDeviceInfo;
}

/**
 * DSR Status
 */
export type DSRStatus = 'pending' | 'approved' | 'needs_revision';

/**
 * DSR Report Model
 */
export interface DSRReport {
  id: string; // Format: {userId}_{YYYY-MM-DD}
  userId: string;
  date: string; // YYYY-MM-DD

  // Auto-compiled stats
  checkInAt?: Date;
  checkOutAt?: Date;
  totalVisits: number;
  visitIds: string[];
  totalSheetsSold: number;
  totalExpenses: number;
  leadsContacted: number;
  leadIds: string[];

  // Manager review
  status: DSRStatus;
  reviewedBy?: string; // Manager userId
  reviewedAt?: Date;
  managerComments?: string;

  // Metadata
  generatedAt: Date;
}

/**
 * Event Type
 */
export type EventType =
  | 'LeadCreated'
  | 'LeadAssigned'
  | 'LeadSLAExpired'
  | 'VisitStarted'
  | 'VisitEnded'
  | 'AttendanceCheckedIn'
  | 'AttendanceCheckedOut';

/**
 * Event Model (Outbox Pattern)
 */
export interface Event {
  id: string;
  eventType: EventType;
  payload: Record<string, any>;
  createdAt: Date;
  processedAt?: Date;
  processedBy?: string; // Function name
  retryCount: number;
  error?: string;
}

/**
 * Account Model (Distributors, Dealers, Architects)
 */
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  phone: string;
  email?: string;
  address?: string;
  city: string;
  state: string;
  pincode: string;
  territory?: string;
  ownerUserId?: string; // Primary rep handling this account
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Team Statistics (for dashboard)
 */
export interface TeamStats {
  totalReps: number;
  activeReps: number;
  attendanceToday: number;
  attendancePercentage: number;
  visitsToday: number;
  visitsTotalWeek: number;
  visitsTotalMonth: number;
  sheetsSoldToday: number;
  sheetsSoldWeek: number;
  sheetsSoldMonth: number;
  pendingDSRs: number;
  pendingExpenses: number;
}

/**
 * Rep Performance Summary
 */
export interface RepPerformance {
  userId: string;
  repName: string;
  territory: string;
  visitsThisMonth: number;
  sheetsSoldThisMonth: number;
  dsrsSubmittedThisMonth: number;
  expensesThisMonth: number;
  attendancePercentage: number;
  lastCheckIn?: Date;
}

/**
 * Date Range Filter
 */
export interface DateRangeFilter {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

/**
 * Table Pagination
 */
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

/**
 * Table Sorting
 */
export interface SortingState {
  id: string;
  desc: boolean;
}

/**
 * Table Filtering
 */
export interface FilterState {
  id: string;
  value: any;
}

/**
 * API Response Wrapper
 */
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Cloud Function Callable Response
 */
export interface CallableResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
