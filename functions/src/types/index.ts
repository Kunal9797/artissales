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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================================================================
// ACCOUNTS TYPES (Distributors & Dealers)
// ============================================================================

export type AccountType = "distributor" | "dealer";
export type AccountStatus = "active" | "inactive";

export interface Account {
  id: string;
  name: string; // "ABC Laminates Pvt Ltd"
  type: AccountType;

  // Assignment
  territory: string; // "Delhi NCR"
  assignedRepUserId: string; // Rep responsible for this account

  // Contact
  contactPerson?: string; // "Mr. Sharma"
  phone: string; // Normalized: +91XXXXXXXXXX
  email?: string;

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
  | "other";

export interface Visit {
  id: string;
  userId: string; // Rep who made visit

  // Account info (denormalized for easy reading)
  accountId: string; // Link to accounts collection
  accountName: string; // "ABC Laminates"
  accountType: AccountType; // "distributor" | "dealer"

  // When & Where (single timestamp - when visit was logged)
  timestamp: Timestamp; // When visit logged
  geo: GeoPoint; // Where rep was when logging
  accuracyM: number;

  // Visit details
  purpose: VisitPurpose;
  notes?: string; // Optional notes (voice-to-text or typed)
  photos?: string[]; // Optional photo URLs from Storage

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
// DSR (DAILY SALES REPORT) TYPES
// ============================================================================

export type DSRStatus = "pending" | "approved" | "needs_revision";

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

// Visit Log (Simplified - single action)
export interface VisitLogRequest {
  accountId: string;
  purpose: VisitPurpose;
  lat: number;
  lon: number;
  accuracyM: number;
  notes?: string;
  photos?: string[]; // Storage URLs
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
// UTILITY TYPES
// ============================================================================

export interface ApiError {
  ok: false;
  error: string;
  code: string;
  details?: any;
}

export type ApiResponse<T> = T | ApiError;
