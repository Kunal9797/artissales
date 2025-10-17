# Data Flow & Event-Driven Architecture

**Last Updated**: October 17, 2025
**Pattern**: Event-Driven with Outbox Pattern

---

## Overview

The Artis Sales App uses an **event-driven architecture** where all significant state changes emit domain events. This enables:
- **Loose coupling** between components
- **Auditability** with complete event logs
- **Reliability** through automatic retries
- **Extensibility** for future features

---

## Core Pattern: Outbox + Event Processing

```
1. Action occurs (e.g., Visit logged)
   ↓
2. Write to primary collection (visits)
   ↓
3. Write event to 'events' collection (outbox)
   ↓
4. Scheduled function polls outbox (every 30s)
   ↓
5. Process unprocessed events
   ↓
6. Send notifications, update stats
   ↓
7. Mark event as processed
```

### Why Outbox Pattern?
- **Reliability**: Events never lost (stored in Firestore)
- **Retry**: Failed events automatically retried
- **Order**: Events processed in order
- **Idempotency**: Same event won't cause duplicate side effects

---

## Event Types

```typescript
type EventType =
  | "LeadCreated"          // New lead from website
  | "LeadAssigned"         // Lead assigned to rep
  | "LeadSLAExpired"       // Lead not contacted within 4 hours
  | "VisitStarted"         // Visit logged (deprecated - instant now)
  | "VisitEnded"           // Visit completed
  | "AttendanceCheckedIn"  // Rep checked in
  | "AttendanceCheckedOut" // Rep checked out
```

---

## Data Flows by Feature

### 1. Attendance Check-In Flow

```
[Mobile App]
User taps "Check In"
  ↓
Capture GPS location
  ↓
Validate accuracy (≤ 100m)
  ↓
POST /api/attendance/check-in
  ↓
[Cloud Function]
Verify authentication
  ↓
Validate request (no duplicate check-in)
  ↓
Write to 'attendance' collection
  {
    userId: "rep456",
    type: "check_in",
    timestamp: now(),
    geo: GeoPoint(lat, lon),
    accuracyM: 15
  }
  ↓
Create event in 'events' collection
  {
    eventType: "AttendanceCheckedIn",
    payload: {
      userId: "rep456",
      timestamp: now()
    }
  }
  ↓
Return response
  ↓
[Mobile App]
Show success message
Update local state
  ↓
[Scheduled Function: outboxProcessor]
(runs every 30s)
  ↓
Find unprocessed events
  ↓
Process "AttendanceCheckedIn"
  ↓
Update manager dashboard stats
  ↓
Send FCM notification to manager
  "Rajesh Kumar checked in at 9:00 AM"
  ↓
Mark event as processed
```

---

### 2. Visit Logging Flow

```
[Mobile App]
User selects account
  ↓
Captures photo of counter
  ↓
Upload photo to Cloud Storage
  ↓
Gets signed URL
  ↓
POST /api/visits
  {
    accountId: "acc789",
    purpose: "follow_up",
    notes: "Discussed new catalog",
    photos: ["gs://...photo1.jpg"]
  }
  ↓
[Cloud Function]
Verify authentication
  ↓
Validate photos array (min 1 photo)
  ↓
Write to 'visits' collection
  {
    userId: "rep456",
    accountId: "acc789",
    accountName: "Sharma Laminates",  // Denormalized
    accountType: "dealer",
    timestamp: now(),
    purpose: "follow_up",
    notes: "...",
    photos: ["gs://..."]
  }
  ↓
Update 'accounts' collection
  {
    lastVisitAt: now()  // Track last visit
  }
  ↓
Create event in 'events' collection
  {
    eventType: "VisitEnded",
    payload: {
      visitId: "visit123",
      userId: "rep456",
      accountId: "acc789"
    }
  }
  ↓
Return response
  ↓
[Mobile App]
Show success message
Navigate back
  ↓
[Scheduled Function: outboxProcessor]
  ↓
Process "VisitEnded" event
  ↓
Update rep's visit count for the month
  ↓
Update account visit history
  ↓
Check if monthly target met
  ↓
If target met: Send congratulations notification
  ↓
Mark event as processed
```

---

### 3. Sheet Sales Logging Flow

```
[Mobile App]
User enters sheet sales
  {
    catalog: "Artis",
    sheetsCount: 50,
    distributorId: "acc789"
  }
  ↓
POST /api/sheets-sales
  ↓
[Cloud Function]
Validate request
  ↓
Write to 'sheetsSales' collection
  {
    userId: "rep456",
    date: "2025-10-17",
    catalog: "Artis",
    sheetsCount: 50,
    verified: false
  }
  ↓
Return response
  ↓
[Mobile App]
Show success message
  ↓
[Firestore Realtime Sync]
Local Firestore cache updated
  ↓
UI automatically reflects new sale
  ↓
[Scheduled Function: dsrCompiler]
(runs daily at 11 PM)
  ↓
Query all sales for user on this date
  ↓
Aggregate by catalog
  {
    "Artis": 50,
    "Artvio": 30
  }
  ↓
Create DSR report
  ↓
Write to 'dsrReports' collection
```

---

### 4. DSR Auto-Compilation Flow

```
[Scheduled Function: dsrCompiler]
Triggered daily at 11:00 PM
  ↓
Query all active reps
  ↓
For each rep:
  ↓
  Query today's attendance
    → checkInAt, checkOutAt
  ↓
  Query today's visits
    → Count, visitIds
  ↓
  Query today's sheet sales
    → Aggregate by catalog
  ↓
  Query today's expenses
    → Aggregate by category
  ↓
  Create DSR report
  {
    id: "rep456_2025-10-17",
    userId: "rep456",
    date: "2025-10-17",
    checkInAt: "09:00",
    checkOutAt: "18:00",
    totalVisits: 5,
    sheetsSales: [
      {catalog: "Artis", totalSheets: 50}
    ],
    totalSheetsSold: 50,
    expenses: [
      {category: "travel", totalAmount: 500}
    ],
    totalExpenses: 500,
    status: "pending"
  }
  ↓
  Write to 'dsrReports' collection
  ↓
  Send FCM to rep: "Your DSR for Oct 17 is ready for submission"
  ↓
[Mobile App - Next Day]
Rep sees DSR status: "Pending Approval"
  ↓
Manager reviews DSR
  ↓
POST /api/dsr/:reportId/review
  {status: "approved", comments: "Good work!"}
  ↓
Update DSR status
  ↓
Send FCM to rep: "Your DSR for Oct 17 has been approved"
```

---

### 5. Target Progress Tracking Flow

```
[Manager Dashboard]
Manager sets monthly target
  ↓
POST /api/targets
  {
    userId: "rep456",
    month: "2025-10",
    sheetsTarget: 1000,
    visitsTarget: 50
  }
  ↓
[Cloud Function]
Write to 'targets' collection
  {
    id: "rep456_2025-10",
    sheetsTarget: 1000,
    visitsTarget: 50,
    sheetsSold: 0,         // Initialize progress
    visitsCompleted: 0
  }
  ↓
Return response
  ↓
[Firestore Realtime Sync]
Rep's mobile app receives new target
  ↓
Progress card shows: "0 / 1000 sheets (0%)"
  ↓
[Throughout the month]
Every time rep logs sheet sales:
  ↓
  Cloud Function updates target progress
  {
    sheetsSold: sheetsSold + newSheetsCount
  }
  ↓
  Firestore realtime sync
  ↓
  Rep's progress card updates instantly
  "50 / 1000 sheets (5%)"
  ↓
When target reached:
  ↓
  Cloud Function checks: sheetsSold >= sheetsTarget
  ↓
  Send congratulations FCM
  "🎉 Congratulations! You've met your monthly sheets target!"
```

---

### 6. Lead Routing Flow (Future)

```
[Website Form]
User submits inquiry
  {
    name: "Anita Desai",
    phone: "9876543210",
    pincode: "110001",
    message: "Interested in laminates"
  }
  ↓
POST /webhooks/lead (webhook endpoint)
  ↓
[Cloud Function]
Normalize phone: "+919876543210"
  ↓
Check duplicate (query 'leads' by phone)
  ↓
If duplicate: Return existing lead
  ↓
Lookup pincode routing
  Query 'pincodeRoutes' where pincode = "110001"
  ↓
Get assigned rep: repUserId = "rep456"
  ↓
Create lead
  {
    ownerUserId: "rep456",
    status: "new",
    slaDueAt: now() + 4 hours,
    assignmentHistory: [{
      userId: "rep456",
      assignedAt: now(),
      reason: "initial"
    }]
  }
  ↓
Create events
  1. LeadCreated event
  2. LeadAssigned event
  ↓
Return response
  ↓
[Scheduled Function: outboxProcessor]
  ↓
Process "LeadCreated"
  → Log to analytics
  ↓
Process "LeadAssigned"
  → Send FCM to rep456
    "New lead assigned: Anita Desai in Delhi"
  ↓
Mark events as processed
  ↓
[Scheduled Function: slaEscalator]
(runs every 5 minutes)
  ↓
Query overdue leads
  WHERE status = "new" AND slaDueAt < now()
  ↓
For each overdue lead:
  ↓
  Get backup rep from pincodeRoutes
  ↓
  Update lead
    {
      ownerUserId: "backupRep789",
      slaDueAt: now() + 4 hours,
      slaBreached: true,
      assignmentHistory: [
        ...old,
        {
          userId: "backupRep789",
          assignedAt: now(),
          reason: "sla_expired"
        }
      ]
    }
  ↓
  Create events
    1. LeadSLAExpired
    2. LeadAssigned (to backup rep)
  ↓
  Send FCM to original rep
    "Lead SLA expired - reassigned to backup"
  ↓
  Send FCM to manager
    "Lead SLA breach - Rep didn't contact in 4 hours"
```

---

## Offline Behavior

### Write Operations (Offline)

```
[Mobile App - Offline]
User logs visit
  ↓
Write to local Firestore cache
  {
    visitId: "temp-visit-123",  // Temporary ID
    ...visitData,
    _pending: true  // Internal flag
  }
  ↓
Show success message
  "Visit logged (will sync when online)"
  ↓
UI shows pending indicator
  ↓
[Mobile App - Comes Online]
Firestore SDK detects connectivity
  ↓
Automatically syncs pending writes
  ↓
Temporary ID replaced with server ID
  ↓
UI updates to show synced state
  ↓
[Cloud Function]
Receives synced write
  ↓
Processes normally (events, updates, etc.)
```

### Read Operations (Offline)

```
[Mobile App - Offline]
User opens visit history
  ↓
Query local Firestore cache
  ↓
Return cached data
  ↓
Show data with "Offline" indicator
  ↓
[Mobile App - Comes Online]
Firestore SDK syncs latest data
  ↓
Cache updated automatically
  ↓
UI refreshes with latest data
  ↓
"Offline" indicator removed
```

---

## Error Handling & Retries

### Event Processing Errors

```
[Scheduled Function: outboxProcessor]
Fetch unprocessed events
  ↓
For each event:
  ↓
  Try to process
  ↓
  If success:
    → Mark as processed
    → Set processedAt timestamp
  ↓
  If error:
    → Increment retryCount
    → Store error message
    → Leave processedAt null
  ↓
Next run (30s later):
  ↓
  Retry unprocessed events
  ↓
  If retryCount > 5:
    → Log critical error
    → Alert admin
    → Mark as failed (stop retrying)
```

### API Request Errors

```
[Mobile App]
POST /api/visits
  ↓
[Cloud Function]
Network error / Timeout
  ↓
[Mobile App]
Catches error
  ↓
Shows retry dialog
  "Failed to log visit. Retry?"
  ↓
User taps "Retry"
  ↓
Retry request
  ↓
If success: Show success
If fail after 3 retries:
  → Show "Try again later"
  → Data remains in local queue
  → Will sync when connectivity restored
```

---

## Performance Optimization

### 1. Denormalization

**Why**: Avoid expensive joins in NoSQL

**Example**: Visit stores account name
```typescript
// Instead of querying accounts collection every time
{
  accountId: "acc789",
  accountName: "Sharma Laminates",  // Denormalized
  accountType: "dealer"
}
```

### 2. Caching

**Firestore Persistence**: Enabled on mobile
- First load: Query server
- Subsequent loads: Serve from cache
- Background: Sync latest data

### 3. Batching

**Example**: Update multiple targets in one batch
```typescript
const batch = firestore().batch();
batch.update(target1Ref, {sheetsSold: 50});
batch.update(target2Ref, {sheetsSold: 30});
await batch.commit();  // Single network round-trip
```

---

## Related Documentation

- **[Firestore Schema](FIRESTORE_SCHEMA.md)** - Database structure
- **[API Contracts](API_CONTRACTS.md)** - API endpoints
- **[System Overview](SYSTEM_OVERVIEW.md)** - High-level architecture
- **[Security](SECURITY.md)** - Auth & authorization

---

**Last Updated**: October 17, 2025
