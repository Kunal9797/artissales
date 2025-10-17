# Firestore Database Schema

**Last Updated**: October 17, 2025
**Database Type**: NoSQL (Cloud Firestore)
**Source of Truth**: `/functions/src/types/index.ts`

---

## Overview

The Artis Sales App uses **Cloud Firestore**, a NoSQL document database that provides:
- Real-time synchronization
- Offline persistence
- Automatic scaling
- Strong security with Security Rules

### Collections Summary

| Collection | Documents | Purpose |
|------------|-----------|---------|
| `users` | ~50-100 | User profiles and role hierarchy |
| `accounts` | ~500-1000 | Distributors, dealers, architects |
| `pincodeRoutes` | ~10000+ | Lead routing by pincode |
| `leads` | Growing | Website leads with SLA tracking |
| `visits` | Growing | Visit logs with photos |
| `sheetsSales` | Growing | Daily sheet sales tracking |
| `expenses` | Growing | Expense reports for approval |
| `attendance` | Growing | GPS check-in/out records |
| `dsrReports` | Growing | Daily Sales Reports |
| `targets` | ~50-100 | Monthly sales & visit targets |
| `events` | Growing | Event outbox for processing |

---

## Collection Schemas

### 1. `users` Collection

**Purpose**: User profiles with role-based hierarchy

**Document ID**: Auto-generated UID from Firebase Auth

**Schema**:
```typescript
{
  id: string                    // Auto-generated UID
  name: string                  // "Kunal Gupta"
  phone: string                 // Normalized: "+919876543210"
  email?: string                // Optional: "kunal@artislaminates.com"
  role: UserRole                // "rep" | "area_manager" | "zonal_head" | "national_head" | "admin"
  isActive: boolean             // true
  reportsToUserId?: string      // Manager hierarchy (rep → area_manager → ...)
  territory?: string            // "Delhi NCR", "Mumbai West"
  primaryDistributorId?: string // For reps assigned to specific distributors
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Example Document**:
```json
{
  "id": "abc123xyz",
  "name": "Rajesh Kumar",
  "phone": "+919876543210",
  "email": "rajesh@artislaminates.com",
  "role": "rep",
  "isActive": true,
  "reportsToUserId": "mgr456def",
  "territory": "Delhi NCR",
  "primaryDistributorId": "dist789",
  "createdAt": "2025-10-01T10:00:00Z",
  "updatedAt": "2025-10-17T08:30:00Z"
}
```

**Indexes Required**:
```
- phone (ascending) - For phone lookup
- role + isActive (ascending) - For filtering active users by role
- reportsToUserId + isActive (ascending) - For manager team queries
```

**Security Rules**:
- Authenticated users can read all users
- Only managers and admins can create/update users
- Users can update their own profile (limited fields)

---

### 2. `accounts` Collection

**Purpose**: Distributors, dealers, architects, and contractors

**Document ID**: Auto-generated

**Schema**:
```typescript
{
  id: string
  name: string                  // "ABC Laminates Pvt Ltd"
  type: AccountType             // "distributor" | "dealer" | "architect" | "contractor"

  // Assignment
  territory: string             // "Delhi NCR"
  assignedRepUserId: string     // Rep responsible for this account

  // Hierarchy
  parentDistributorId?: string  // For dealers/architects under a distributor

  // Contact
  contactPerson?: string        // "Mr. Sharma"
  phone: string                 // Normalized: "+919876543210"
  email?: string
  birthdate?: string            // YYYY-MM-DD (for dealers and architects)

  // Location
  address?: string              // "123 Main Street, Connaught Place"
  city: string                  // "New Delhi"
  state: string                 // "Delhi"
  pincode: string               // "110001"
  geoLocation?: GeoPoint        // Optional GPS coordinates

  // Status
  status: AccountStatus         // "active" | "inactive"
  lastVisitAt?: Timestamp       // Auto-updated from visits

  // Metadata
  createdByUserId: string       // Who added this account
  createdAt: Timestamp
  updatedAt: Timestamp

  // Flexible fields for future
  extra?: Record<string, any>   // Can add: gst, pan, targets, etc.
}
```

**Example Document**:
```json
{
  "id": "acc123",
  "name": "Sharma Laminates Trading Co",
  "type": "dealer",
  "territory": "Delhi NCR",
  "assignedRepUserId": "rep456",
  "parentDistributorId": "dist789",
  "contactPerson": "Mr. Rajesh Sharma",
  "phone": "+919876543210",
  "email": "sharma@example.com",
  "birthdate": "1975-05-15",
  "address": "Shop 45, Lajpat Nagar Market",
  "city": "New Delhi",
  "state": "Delhi",
  "pincode": "110024",
  "status": "active",
  "lastVisitAt": "2025-10-15T14:30:00Z",
  "createdByUserId": "mgr123",
  "createdAt": "2025-09-01T10:00:00Z",
  "updatedAt": "2025-10-17T09:00:00Z"
}
```

**Indexes Required**:
```
- assignedRepUserId + status (ascending) - Rep's accounts query
- type + territory (ascending) - Filter by account type and location
- pincode (ascending) - Location-based queries
- parentDistributorId (ascending) - Hierarchy queries
```

**Security Rules**:
- Authenticated users can read accounts assigned to them or in their territory
- Managers can read all accounts in their team's territories
- Only managers can create/update accounts

---

### 3. `pincodeRoutes` Collection

**Purpose**: Lead routing configuration by pincode

**Document ID**: Pincode (e.g., "110001")

**Schema**:
```typescript
{
  pincode: string               // Document ID
  repUserId: string             // Primary rep for this pincode
  backupRepUserId?: string      // Fallback for SLA escalation
  territory: string             // "Delhi NCR"
  updatedAt: Timestamp
}
```

**Example Document**:
```json
{
  "pincode": "110001",
  "repUserId": "rep456",
  "backupRepUserId": "rep789",
  "territory": "Delhi NCR",
  "updatedAt": "2025-10-01T10:00:00Z"
}
```

**Indexes Required**:
```
- None (document ID is pincode, direct lookup)
```

**Security Rules**:
- Only admins and managers can read/write pincode routes

---

### 4. `leads` Collection

**Purpose**: Website leads with SLA tracking and assignment history

**Document ID**: Auto-generated

**Schema**:
```typescript
{
  id: string
  source: LeadSource            // "website" | "referral" | "cold_call" | "exhibition" | "other"

  // Customer info
  name: string
  phone: string                 // Normalized, indexed
  email?: string
  company?: string
  city: string
  state: string
  pincode: string
  message?: string

  // Routing & status
  status: LeadStatus            // "new" | "contacted" | "qualified" | "quoted" | "won" | "lost"
  ownerUserId: string           // Current assigned rep
  assignmentHistory: Array<{
    userId: string
    assignedAt: Timestamp
    reason: "initial" | "sla_expired" | "manual"
  }>

  // SLA tracking
  createdAt: Timestamp
  slaDueAt: Timestamp           // createdAt + 4 hours
  firstTouchAt?: Timestamp      // When rep first contacted
  slaBreached: boolean

  // Additional
  extra?: Record<string, any>   // Flexible data
}
```

**Example Document**:
```json
{
  "id": "lead123",
  "source": "website",
  "name": "Anita Desai",
  "phone": "+919876543210",
  "email": "anita@example.com",
  "company": "Desai Interiors",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "message": "Interested in premium laminates for hotel project",
  "status": "contacted",
  "ownerUserId": "rep456",
  "assignmentHistory": [
    {
      "userId": "rep456",
      "assignedAt": "2025-10-17T10:00:00Z",
      "reason": "initial"
    }
  ],
  "createdAt": "2025-10-17T10:00:00Z",
  "slaDueAt": "2025-10-17T14:00:00Z",
  "firstTouchAt": "2025-10-17T11:30:00Z",
  "slaBreached": false
}
```

**Indexes Required**:
```
- ownerUserId + status (ascending) - Rep's leads by status
- ownerUserId + slaDueAt (ascending) - SLA monitoring
- phone (ascending) - Deduplication lookup
- status + slaDueAt (ascending) - Overdue leads query (for SLA escalator)
- createdAt (descending) - Recent leads
```

**Security Rules**:
- Reps can read leads assigned to them
- Managers can read all leads in their team
- Only backend functions can create/update leads (webhook)

---

### 5. `visits` Collection

**Purpose**: Visit logs with mandatory counter photos

**Document ID**: Auto-generated

**Schema**:
```typescript
{
  id: string
  userId: string                // Rep who made visit

  // Account info (denormalized)
  accountId: string             // Link to accounts collection
  accountName: string           // "ABC Laminates"
  accountType: AccountType      // "distributor" | "dealer" | "architect" | "contractor"

  // When
  timestamp: Timestamp          // When visit was logged

  // Visit details
  purpose: VisitPurpose         // "meeting" | "order" | "payment" | "sample_delivery" | "follow_up" | "complaint" | "new_lead" | "site_visit" | "other"
  notes?: string                // Optional notes
  photos: string[]              // REQUIRED - Counter photo URLs from Storage (min 1)

  // Metadata
  createdAt: Timestamp

  // Flexible fields for future
  extra?: Record<string, any>   // Order value, payment amount, etc.
}
```

**Example Document**:
```json
{
  "id": "visit123",
  "userId": "rep456",
  "accountId": "acc789",
  "accountName": "Sharma Laminates Trading Co",
  "accountType": "dealer",
  "timestamp": "2025-10-17T14:30:00Z",
  "purpose": "follow_up",
  "notes": "Discussed new Artvio catalog. Dealer interested in bulk order.",
  "photos": [
    "gs://artis-sales/visits/visit123/photo1.jpg",
    "gs://artis-sales/visits/visit123/photo2.jpg"
  ],
  "createdAt": "2025-10-17T14:35:00Z"
}
```

**Indexes Required**:
```
- userId + timestamp (descending) - Rep's visit history
- userId + purpose (ascending) - Filter visits by purpose
- accountId + timestamp (descending) - Account visit history
- timestamp (descending) - Recent visits (for managers)
```

**Security Rules**:
- Reps can read their own visits
- Reps can create visits (with validation)
- Managers can read all visits from their team
- Photos array must not be empty

---

### 6. `sheetsSales` Collection

**Purpose**: Daily laminate sheets sales tracking by catalog

**Document ID**: Auto-generated

**Schema**:
```typescript
{
  id: string
  userId: string                // Rep who logged the sale
  date: string                  // YYYY-MM-DD

  // Catalog selection
  catalog: CatalogType          // "Fine Decor" | "Artvio" | "Woodrica" | "Artis"
  sheetsCount: number           // Number of sheets sold

  // Optional details
  notes?: string
  distributorId?: string        // Optional link to account
  distributorName?: string

  // Verification (for future incentive calculation)
  verified: boolean             // Default: false
  verifiedBy?: string           // Manager userId
  verifiedAt?: Timestamp

  // Metadata
  createdAt: Timestamp
}
```

**Example Document**:
```json
{
  "id": "sale123",
  "userId": "rep456",
  "date": "2025-10-17",
  "catalog": "Artis",
  "sheetsCount": 50,
  "notes": "Bulk order from Sharma Laminates",
  "distributorId": "acc789",
  "distributorName": "Sharma Laminates Trading Co",
  "verified": false,
  "createdAt": "2025-10-17T15:00:00Z"
}
```

**Indexes Required**:
```
- userId + date (descending) - Rep's daily sales
- date + catalog (ascending) - Daily sales by catalog
- verified + userId (ascending) - Unverified sales
```

**Security Rules**:
- Reps can read their own sales
- Reps can create sales entries
- Managers can read all sales from their team
- Managers can update verification fields

---

### 7. `expenses` Collection

**Purpose**: Daily expense reports with approval workflow

**Document ID**: Auto-generated

**Schema**:
```typescript
{
  id: string
  userId: string                // Rep who incurred expense
  date: string                  // YYYY-MM-DD

  // Expense items (multiple expenses in one report)
  items: Array<{
    amount: number              // In INR
    category: ExpenseCategory   // "travel" | "food" | "accommodation" | "other"
    categoryOther?: string      // Required when category is "other"
    description: string         // Brief description
  }>
  totalAmount: number           // Sum of all items
  receiptPhotos: string[]       // Optional receipt photo URLs

  // Approval workflow
  status: ExpenseStatus         // "pending" | "approved" | "rejected"
  reviewedBy?: string           // Manager userId
  reviewedAt?: Timestamp
  managerComments?: string

  // Metadata
  createdAt: Timestamp
}
```

**Example Document**:
```json
{
  "id": "exp123",
  "userId": "rep456",
  "date": "2025-10-17",
  "items": [
    {
      "amount": 500,
      "category": "travel",
      "description": "Auto rickshaw - Home to market"
    },
    {
      "amount": 200,
      "category": "food",
      "description": "Lunch with dealer"
    }
  ],
  "totalAmount": 700,
  "receiptPhotos": [
    "gs://artis-sales/expenses/exp123/receipt1.jpg"
  ],
  "status": "pending",
  "createdAt": "2025-10-17T18:00:00Z"
}
```

**Indexes Required**:
```
- userId + date (descending) - Rep's expense history
- status + userId (ascending) - Pending approvals
- date + status (ascending) - Daily pending expenses
```

**Security Rules**:
- Reps can read their own expenses
- Reps can create expense reports
- Managers can read all expenses from their team
- Managers can update status and review fields

---

### 8. `attendance` Collection

**Purpose**: GPS check-in/out records with location accuracy

**Document ID**: Auto-generated

**Schema**:
```typescript
{
  id: string
  userId: string
  type: AttendanceType          // "check_in" | "check_out"
  timestamp: Timestamp
  geo: GeoPoint                 // Firebase GeoPoint
  accuracyM: number             // GPS accuracy in meters
  deviceInfo?: {
    isMocked: boolean           // GPS spoofing detection
    battery: number
    timezone: string
  }
}
```

**Example Document**:
```json
{
  "id": "att123",
  "userId": "rep456",
  "type": "check_in",
  "timestamp": "2025-10-17T09:00:00Z",
  "geo": {
    "_latitude": 28.6139,
    "_longitude": 77.2090
  },
  "accuracyM": 15,
  "deviceInfo": {
    "isMocked": false,
    "battery": 85,
    "timezone": "Asia/Kolkata"
  }
}
```

**Indexes Required**:
```
- userId + timestamp (descending) - Rep's attendance history
- timestamp (descending) - Daily attendance query
- userId + type + timestamp (descending) - Filter by check-in/out
```

**Security Rules**:
- Reps can read their own attendance
- Reps can create attendance records (validation: accuracy ≤ 100m)
- Managers can read all attendance from their team

---

### 9. `dsrReports` Collection

**Purpose**: Auto-compiled Daily Sales Reports for manager review

**Document ID**: `{userId}_{YYYY-MM-DD}` (e.g., "rep456_2025-10-17")

**Schema**:
```typescript
{
  id: string                    // Format: {userId}_{YYYY-MM-DD}
  userId: string
  date: string                  // YYYY-MM-DD

  // Auto-compiled stats
  checkInAt?: Timestamp
  checkOutAt?: Timestamp
  totalVisits: number
  visitIds: string[]
  leadsContacted: number
  leadIds: string[]

  // Sheets sales summary
  sheetsSales: Array<{
    catalog: CatalogType
    totalSheets: number
  }>
  totalSheetsSold: number       // Sum across all catalogs

  // Expenses summary
  expenses: Array<{
    category: string            // ExpenseCategory or custom
    totalAmount: number
  }>
  totalExpenses: number         // Sum in INR

  // Manager review
  status: DSRStatus             // "pending" | "approved" | "needs_revision"
  reviewedBy?: string           // Manager userId
  reviewedAt?: Timestamp
  managerComments?: string

  // Metadata
  generatedAt: Timestamp
}
```

**Example Document**:
```json
{
  "id": "rep456_2025-10-17",
  "userId": "rep456",
  "date": "2025-10-17",
  "checkInAt": "2025-10-17T09:00:00Z",
  "checkOutAt": "2025-10-17T18:00:00Z",
  "totalVisits": 5,
  "visitIds": ["visit123", "visit124", "visit125", "visit126", "visit127"],
  "leadsContacted": 2,
  "leadIds": ["lead123", "lead124"],
  "sheetsSales": [
    {"catalog": "Artis", "totalSheets": 50},
    {"catalog": "Artvio", "totalSheets": 30}
  ],
  "totalSheetsSold": 80,
  "expenses": [
    {"category": "travel", "totalAmount": 500},
    {"category": "food", "totalAmount": 200}
  ],
  "totalExpenses": 700,
  "status": "pending",
  "generatedAt": "2025-10-17T23:00:00Z"
}
```

**Indexes Required**:
```
- userId + date (descending) - Rep's DSR history
- date + status (ascending) - Pending DSRs for managers
- status + generatedAt (descending) - Recent pending DSRs
```

**Security Rules**:
- Reps can read their own DSRs
- Backend function creates DSRs (daily at 11 PM)
- Managers can read all DSRs from their team
- Managers can update status and review fields

---

### 10. `targets` Collection

**Purpose**: Monthly sales and visit targets for reps

**Document ID**: `{userId}_{YYYY-MM}` (e.g., "rep456_2025-10")

**Schema**:
```typescript
{
  id: string                    // Format: {userId}_{YYYY-MM}
  userId: string
  month: string                 // YYYY-MM

  // Targets
  sheetsTarget: number          // Target sheets to sell this month
  visitsTarget: number          // Target visits to complete this month

  // Progress (auto-updated)
  sheetsSold: number            // Current progress
  visitsCompleted: number       // Current progress

  // Metadata
  setByUserId: string           // Manager who set the target
  setAt: Timestamp
  updatedAt: Timestamp
}
```

**Example Document**:
```json
{
  "id": "rep456_2025-10",
  "userId": "rep456",
  "month": "2025-10",
  "sheetsTarget": 1000,
  "visitsTarget": 50,
  "sheetsSold": 450,
  "visitsCompleted": 28,
  "setByUserId": "mgr123",
  "setAt": "2025-10-01T10:00:00Z",
  "updatedAt": "2025-10-17T20:00:00Z"
}
```

**Indexes Required**:
```
- userId + month (descending) - Rep's target history
- month (ascending) - All targets for a month
```

**Security Rules**:
- Reps can read their own targets
- Managers can read/write targets for their team
- Backend functions can update progress fields

---

### 11. `events` Collection (Outbox Pattern)

**Purpose**: Event outbox for reliable event processing

**Document ID**: Auto-generated

**Schema**:
```typescript
{
  id: string
  eventType: EventType          // "LeadCreated" | "LeadAssigned" | "LeadSLAExpired" | "VisitStarted" | "VisitEnded" | "AttendanceCheckedIn" | "AttendanceCheckedOut"
  payload: Record<string, any>  // Event-specific data
  createdAt: Timestamp
  processedAt?: Timestamp
  processedBy?: string          // Function name
  retryCount: number
  error?: string
}
```

**Example Document**:
```json
{
  "id": "evt123",
  "eventType": "LeadCreated",
  "payload": {
    "leadId": "lead123",
    "ownerUserId": "rep456",
    "name": "Anita Desai",
    "phone": "+919876543210"
  },
  "createdAt": "2025-10-17T10:00:00Z",
  "processedAt": "2025-10-17T10:00:30Z",
  "processedBy": "outboxProcessor",
  "retryCount": 0
}
```

**Indexes Required**:
```
- processedAt (ascending, null first) + createdAt (ascending) - Unprocessed events
- eventType + processedAt (ascending) - Filter by event type
```

**Security Rules**:
- Only backend functions can read/write events

---

## Security Rules Summary

Firestore Security Rules enforce role-based access control:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isRep() {
      return getUserRole() == 'rep';
    }

    function isManager() {
      return getUserRole() in ['area_manager', 'zonal_head', 'national_head', 'admin'];
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isManager() || request.auth.uid == userId;
    }

    // Other collection rules...
    // See firestore.rules file for complete implementation
  }
}
```

**Key Rules**:
- All writes require authentication
- Reps can only access their own data
- Managers can access their team's data
- Admins have full access
- Backend functions bypass rules (admin SDK)

---

## Common Query Patterns

### Get Rep's Pending DSRs
```typescript
db.collection('dsrReports')
  .where('userId', '==', repUserId)
  .where('status', '==', 'pending')
  .orderBy('date', 'desc')
  .limit(10)
```

### Get Today's Attendance
```typescript
const startOfDay = new Date();
startOfDay.setHours(0, 0, 0, 0);

db.collection('attendance')
  .where('userId', '==', repUserId)
  .where('timestamp', '>=', startOfDay)
  .orderBy('timestamp', 'desc')
```

### Get Rep's Visits This Month
```typescript
const startOfMonth = new Date();
startOfMonth.setDate(1);
startOfMonth.setHours(0, 0, 0, 0);

db.collection('visits')
  .where('userId', '==', repUserId)
  .where('timestamp', '>=', startOfMonth)
  .orderBy('timestamp', 'desc')
```

### Get Overdue Leads (for SLA Escalator)
```typescript
db.collection('leads')
  .where('status', '==', 'new')
  .where('slaDueAt', '<=', new Date())
  .limit(100)
```

---

## Data Retention

**Current**: No automatic deletion (retain all data)

**Future Considerations**:
- Archive DSRs older than 2 years to Cloud Storage
- Archive old attendance records (> 1 year)
- Keep leads indefinitely for sales analytics

---

## Backup & Recovery

**Automatic Backups**: Firestore provides automatic backups
**Export**: Can export to Cloud Storage via `gcloud firestore export`
**Restore**: Can restore from backup or import from Cloud Storage

---

**Related Documentation**:
- [API Contracts](API_CONTRACTS.md) - How to interact with this data via APIs
- [Security](SECURITY.md) - Detailed security rules explanation
- [Data Flow](DATA_FLOW.md) - How data flows through the system
