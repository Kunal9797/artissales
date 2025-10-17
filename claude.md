# Artis Field Sales App - AI Development Context

## Project Overview
Building an Android-first, offline-capable field sales tracking app for **Artis Laminates** to manage sales team performance, lead routing, visit tracking, and daily reporting.

---

## Core Philosophy & Approach

### Development Principles
1. **Backend-First Architecture** - Spend time getting data models, Firebase structure, and Cloud Functions right before rushing to features
2. **Event-Driven Design** - All state changes emit domain events; side effects handled by listeners/triggers
3. **Offline-First** - All writes must work offline and sync reliably
4. **Boring Technology** - Proven, stable tech stack (Firebase + Expo); no experimental libraries
5. **Context Preservation** - Maintain clear documentation so future AI agents can understand and extend easily

### Code Quality Standards
- **Plan before code** - Always outline approach, affected files, and trade-offs before implementation
- **Test-driven for services** - Write tests for business logic before implementation
- **Small, focused changes** - Max 200 lines per change unless explicitly needed
- **Schema safety** - All database changes documented with migration notes
- **Security checklist** - Input validation, auth checks, Firestore rules, PII handling reviewed before merging
- **Firebase Modular API** - Always use modular Firebase API (v9+) instead of deprecated namespaced API (see Firebase guidelines below)

---

## Tech Stack (V1)

### Mobile (Android-first)
- **Framework**: React Native + Expo SDK 53 (managed workflow)
- **Firebase**: `@react-native-firebase/*` packages
  - Firestore (data sync + offline)
  - Auth (phone number)
  - Cloud Messaging (FCM for push)
  - Storage (photos)
- **Location**: expo-location
- **Media**: expo-camera, expo-av, expo-image-manipulator (compression)
- **Maps**: react-native-maps (optional)

### Backend
- **Database**: Firebase Firestore (NoSQL, offline-first)
- **Functions**: Cloud Functions for Firebase (Node.js/TypeScript)
- **Auth**: Firebase Auth (phone + JWT)
- **Scheduling**: Cloud Scheduler for cron jobs
- **Analytics**: Firebase Analytics + Custom events
- **Monitoring**: Firebase Crashlytics + Cloud Functions logs

### Security
- Firestore Security Rules (role-based access)
- Field-level validation in rules
- Signed URLs for image uploads
- No continuous background location tracking

---

## V1 Scope

###  Goals (Must Have)
1. **Attendance**: GPS-stamped check-in/check-out (accuracy d 50-100m)
2. **Lead Routing**: Webhook from website � auto-assign by pincode � 4-hour SLA
3. **Visit Logging**: Track distributor/dealer/architect visits with **mandatory photo of counter** (no GPS), notes
4. **Daily Sheets Sales**: Track laminate sheets sold per catalog (Fine Decor, Artvio, Woodrica, Artis)
5. **Expense Reporting**: Sales reps can log daily expenses (travel, food, etc.) with receipts
6. **DSR Auto-compile**: Daily Sales Report from day's events; manager approval
7. **Manager Dashboard**: Team attendance, visit stats, monthly reports (visits by type, sheets sold), CSV/PDF export
8. **Offline Support**: All writes queue locally, sync when online

### L Non-Goals (V1)
- Payroll/salary
- Sales incentive calculation (post-V1, after sales verification workflow)
- Continuous GPS tracking (battery drain)
- Route optimization/planning
- Quoting/invoicing module
- ERP integration (only CSV exports)
- Full-text search (future: Algolia)

---

## Data Architecture (Firestore)

### Collections Schema

#### `users/{userId}`
```typescript
{
  id: string;                    // Auto-generated UID
  name: string;
  phone: string;                 // Normalized: +91XXXXXXXXXX
  email?: string;
  role: 'rep' | 'area_manager' | 'zonal_head' | 'national_head' | 'admin';
  isActive: boolean;
  reportsToUserId?: string;      // Manager hierarchy
  territory?: string;            // Area/zone assignment
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `pincodeRoutes/{pincode}`
```typescript
{
  pincode: string;               // Document ID (e.g., "110001")
  repUserId: string;             // Primary rep for this pincode
  backupRepUserId?: string;      // Fallback for SLA escalation
  territory: string;             // Area/zone name
  updatedAt: Timestamp;
}
```

#### `leads/{leadId}`
```typescript
{
  id: string;
  source: string;                // 'website' | 'referral' | 'cold_call' | 'exhibition'

  // Customer info
  name: string;
  phone: string;                 // Normalized, indexed
  email?: string;
  company?: string;
  city: string;
  state: string;
  pincode: string;
  message?: string;

  // Routing & status
  status: 'new' | 'contacted' | 'qualified' | 'quoted' | 'won' | 'lost';
  ownerUserId: string;           // Current assigned rep
  assignmentHistory: Array<{    // Track reassignments
    userId: string;
    assignedAt: Timestamp;
    reason: 'initial' | 'sla_expired' | 'manual';
  }>;

  // SLA tracking
  createdAt: Timestamp;
  slaDueAt: Timestamp;           // createdAt + 4 hours
  firstTouchAt?: Timestamp;      // When rep first contacted
  slaBreached: boolean;

  // Additional
  extra?: Record<string, any>;   // Flexible data
}

// Indexes needed:
// - ownerUserId + status
// - ownerUserId + slaDueAt
// - phone (for deduplication)
// - createdAt (for sorting)
```

#### `visits/{visitId}`
```typescript
{
  id: string;
  userId: string;                // Rep who made visit

  // Account info (denormalized)
  accountId: string;             // Link to accounts collection
  accountName: string;           // "ABC Laminates"
  accountType: 'distributor' | 'dealer' | 'architect';

  // Visit details
  timestamp: Timestamp;          // When visit was logged
  purpose: 'sample_delivery' | 'follow_up' | 'complaint' | 'new_lead' | 'payment_collection' | 'other';
  notes?: string;                // Optional notes
  photos: string[];              // **REQUIRED** - Counter photo URLs from Storage (min 1)

  // Metadata
  createdAt: Timestamp;
  extra?: Record<string, any>;
}

// Indexes:
// - userId + timestamp (descending)
// - userId + purpose
// - accountId + timestamp
```

#### `sheetsSales/{saleId}` (Daily Sales Tracking)
```typescript
{
  id: string;
  userId: string;                // Rep who logged the sale
  date: string;                  // YYYY-MM-DD

  // Catalog selection
  catalog: 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis';
  sheetsCount: number;           // Number of sheets sold

  // Optional details
  notes?: string;
  distributorId?: string;        // Optional link to account (for verification later)
  distributorName?: string;

  // Verification (for future incentive calculation)
  verified: boolean;             // Default: false
  verifiedBy?: string;           // Manager userId
  verifiedAt?: Timestamp;

  // Metadata
  createdAt: Timestamp;
}

// Indexes:
// - userId + date (descending)
// - date + catalog
// - verified + userId
```

#### `expenses/{expenseId}` (Daily Expense Reporting)
```typescript
{
  id: string;
  userId: string;                // Rep who incurred expense
  date: string;                  // YYYY-MM-DD

  // Expense details
  amount: number;                // In INR
  category: 'travel' | 'food' | 'accommodation' | 'other';
  description: string;           // Brief description
  receiptPhoto?: string;         // Optional receipt photo URL

  // Approval workflow
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;           // Manager userId
  reviewedAt?: Timestamp;
  managerComments?: string;

  // Metadata
  createdAt: Timestamp;
}

// Indexes:
// - userId + date (descending)
// - status + userId
// - date + status
```

#### `attendance/{attendanceId}`
```typescript
{
  id: string;
  userId: string;
  type: 'check_in' | 'check_out';
  timestamp: Timestamp;
  geo: GeoPoint;
  accuracyM: number;
  deviceInfo?: {
    isMocked: boolean;           // GPS spoofing detection
    battery: number;
    timezone: string;
  };
}

// Indexes:
// - userId + timestamp (descending)
// - timestamp (for daily queries)
```

#### `dsrReports/{reportId}` (Daily Sales Report)
```typescript
{
  id: string;                    // Format: {userId}_{YYYY-MM-DD}
  userId: string;
  date: string;                  // YYYY-MM-DD

  // Auto-compiled stats
  checkInAt?: Timestamp;
  checkOutAt?: Timestamp;
  totalVisits: number;
  visitIds: string[];
  leadsContacted: number;
  leadIds: string[];

  // Manager review
  status: 'pending' | 'approved' | 'needs_revision';
  reviewedBy?: string;           // Manager userId
  reviewedAt?: Timestamp;
  managerComments?: string;

  // Metadata
  generatedAt: Timestamp;
}

// Indexes:
// - userId + date
// - date + status
```

#### `events/{eventId}` (Outbox Pattern)
```typescript
{
  id: string;
  eventType: 'LeadCreated' | 'LeadAssigned' | 'LeadSLAExpired' |
             'VisitStarted' | 'VisitEnded' | 'AttendanceCheckedIn' | 'AttendanceCheckedOut';
  payload: Record<string, any>;
  createdAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;          // Function name
  retryCount: number;
  error?: string;
}

// Indexes:
// - processedAt (null first) + createdAt
// - eventType + processedAt
```

---

## Cloud Functions Structure

```
functions/
   src/
      webhooks/
         lead.ts              # POST /webhooks/lead
      scheduled/
         slaEscalator.ts      # Every 5 min: check overdue leads
         dsrCompiler.ts       # Daily at 11 PM: compile DSRs
      ���   outboxProcessor.ts   # Every 30s: process events
      triggers/
         onLeadCreated.ts     # Send FCM to assigned rep
         onLeadSLAExpired.ts  # Notify manager
         onVisitEnded.ts      # Update stats
      utils/
         validation.ts        # Input validators
         auth.ts              # Auth middleware
         geo.ts               # GPS accuracy checks
      types/
          index.ts             # Shared TypeScript types
   package.json
```

---

## API Contracts (Cloud Functions HTTP endpoints)

### `POST /webhooks/lead`
**Input:**
```json
{
  "source": "website",
  "name": "John Dealer",
  "phone": "9876543210",
  "email": "john@example.com",
  "company": "ABC Traders",
  "city": "Delhi",
  "state": "Delhi",
  "pincode": "110001",
  "message": "Interested in laminate samples"
}
```

**Output:**
```json
{
  "ok": true,
  "leadId": "abc123",
  "ownerUserId": "rep_xyz",
  "slaDueAt": "2025-10-08T14:30:00Z"
}
```

**Logic:**
1. Validate + normalize phone
2. Check duplicate by phone (return existing if found)
3. Lookup `pincodeRoutes/{pincode}` � get `repUserId`
4. Create lead with `slaDueAt = now() + 4h`
5. Emit `LeadCreated` + `LeadAssigned` events
6. Return lead ID + owner

---

## Mobile App Structure (Expo)

```
mobile/
   src/
      screens/
         auth/
            PhoneLogin.tsx
         home/
            Dashboard.tsx
         attendance/
            CheckInOut.tsx
         leads/
            LeadList.tsx
            LeadDetail.tsx
         visits/
            StartVisit.tsx
            EndVisit.tsx
         reports/
             DSR.tsx
      services/
         firebase.ts          # Firebase init
         firestore.ts         # Firestore helpers
         location.ts          # GPS utilities
         notifications.ts     # FCM handlers
      hooks/
         useAuth.ts
         useLeads.ts
         useAttendance.ts
      components/
         LocationPicker.tsx
         PhotoCapture.tsx
         VoiceNotes.tsx
      types/
          index.ts
   app.json
   package.json
   firestore.rules              # Local copy for reference
```

---

## Firestore Security Rules (Draft)

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

    // Leads collection
    match /leads/{leadId} {
      allow read: if isAuthenticated() && (
        request.auth.uid == resource.data.ownerUserId || isManager()
      );
      allow create: if isManager(); // Only webhook/managers can create
      allow update: if request.auth.uid == resource.data.ownerUserId || isManager();
    }

    // Attendance collection
    match /attendance/{attendanceId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }

    // Visits collection
    match /visits/{visitId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
    }

    // DSR Reports
    match /dsrReports/{reportId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated(); // Auto-generated by function
      allow update: if isManager(); // Only managers can approve
    }
  }
}
```

---

## Development Workflow

### Phase 1: Foundation (Week 1-2)
**Goal**: Rock-solid backend and data models

1. **Firebase Setup**
   - Create Firebase project
   - Enable Firestore, Auth, Functions, Storage
   - Set up development + production environments

2. **Firestore Schema Implementation**
   - Create collections with sample data
   - Write and deploy security rules
   - Create composite indexes
   - Test queries for performance

3. **Cloud Functions - Core Logic**
   - Lead routing webhook
   - SLA escalator (scheduled)
   - Event outbox processor
   - Write unit tests for business logic

4. **Documentation**
   - API contracts in Postman/OpenAPI
   - Event schema definitions
   - Firestore data model diagram

### Phase 2: Mobile Foundation (Week 3)
**Goal**: Basic app shell with auth and offline support

1. **Expo Setup**
   - Initialize project with TypeScript
   - Integrate Firebase SDK
   - Set up navigation (React Navigation)

2. **Authentication**
   - Phone number login flow
   - JWT token management
   - Auto re-auth on app launch

3. **Offline Infrastructure**
   - Firestore offline persistence config
   - Network status monitoring
   - Sync status UI indicators

### Phase 3: Core Features (Week 4-6)
**Goal**: Implement V1 features one by one

1. **Attendance Module** (3-4 days)
2. **Leads Module** (4-5 days)
3. **Visits Module** (4-5 days)
4. **DSR Module** (2-3 days)

### Phase 4: Manager Dashboard (Week 7)
**Goal**: Web/mobile dashboard for managers

### Phase 5: Testing & Deployment (Week 8)
**Goal**: Internal testing + Play Store beta release

---

## AI Agent Instructions

### When Making Changes
1. **Always read related files first** - Understand current implementation
2. **Propose a plan** - List files to change, functions to add/modify, risks
3. **Respect the event-driven pattern** - Mutations emit events, side effects via triggers
4. **Maintain type safety** - Update TypeScript types in `/types` directories
5. **Test Firestore rules** - Use Firebase emulator suite before deploying
6. **Keep functions small** - One function = one responsibility
7. **Document trade-offs** - If choosing between approaches, explain why

### When Adding Features
1. **Check V1 scope** - If not in V1 goals, discuss first
2. **Data model first** - Design Firestore collections/fields before coding
3. **Security rules** - Update Firestore rules for new collections
4. **Cloud Function if needed** - Background processing via functions, not mobile app
5. **Mobile UI last** - Backend � Types � Hooks � UI components

### Common Pitfalls to Avoid
- L No SQL joins (denormalize data instead)
- L Don't query large collections without indexes
- L No client-side secrets (use Cloud Functions)
- L Don't store raw phone numbers (normalize to E.164)
- L No synchronous HTTP calls in Firestore triggers (use events)
- L **Never use deprecated Firebase namespaced API** (see Firebase API guidelines below)

---

## Firebase API Guidelines (Critical)

### ALWAYS Use Modular API (v9+ Style)

React Native Firebase is migrating to match the modular Firebase Web SDK. **Always use the modular API pattern:**

#### ✅ CORRECT - Modular API (Use This)
```typescript
import firestore, { doc, getDoc, setDoc, collection, query, where, getDocs } from '@react-native-firebase/firestore';

// Initialize firestore instance
const db = firestore();

// Read a document
const userDocRef = doc(db, 'users', userId);
const userDoc = await getDoc(userDocRef);
if (userDoc.exists()) {
  const data = userDoc.data();
}

// Write a document
const newDocRef = doc(db, 'visits', visitId);
await setDoc(newDocRef, { ...visitData });

// Query collection
const q = query(
  collection(db, 'attendance'),
  where('userId', '==', userId)
);
const snapshot = await getDocs(q);
snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});
```

#### ❌ WRONG - Deprecated Namespaced API (Never Use)
```typescript
// DO NOT USE - This is deprecated!
const userDoc = await firestore().collection('users').doc(userId).get();
if (userDoc.exists) {  // Note: exists is a property, not a method
  const data = userDoc.data();
}
```

### Key Differences
1. **`exists`**: Old API uses `exists` (property), new API uses `exists()` (method)
2. **Imports**: Import specific functions (`doc`, `getDoc`, etc.) from the package
3. **Pattern**: Get firestore instance first (`const db = firestore()`), then use modular functions

### Migration Checklist
- [ ] Import modular functions: `doc`, `getDoc`, `setDoc`, `collection`, `query`, `where`, `getDocs`
- [ ] Get firestore instance: `const db = firestore()`
- [ ] Use `doc(db, collectionName, docId)` instead of `firestore().collection().doc()`
- [ ] Use `getDoc(docRef)` instead of `docRef.get()`
- [ ] Use `exists()` method instead of `exists` property
- [ ] Use `getDocs(query)` for collection queries

### Why This Matters
- The old namespaced API will be **removed in the next major version**
- Reduces bundle size with tree-shaking
- Matches Firebase Web SDK patterns (better documentation)
- Prevents deprecation warnings

---

## Context Files for AI Agents

- **This file** (`CLAUDE.md`) - Project overview, architecture, development approach
- **`proposal.md`** - Original requirements and V1 scope
- **`/functions/src/types/index.ts`** - TypeScript type definitions (source of truth)
- **`firestore.rules`** - Security rules (keep in sync)
- **`README.md`** - Setup instructions for developers

---

## Questions to Ask Before Implementation

1. Does this change require a Firestore schema update? � Document it
2. Does this add a new API endpoint? � Define contract first
3. Does this need background processing? � Use Cloud Function + events
4. Does this affect security? � Update Firestore rules
5. Does this work offline? � Test with Firestore offline mode
6. Is this idempotent? � Important for retries

---

## Success Metrics (Post-V1)

- **SLA Compliance**: >90% leads contacted within 4 hours
- **Attendance Accuracy**: GPS accuracy d 100m for >95% check-ins
- **Offline Reliability**: 100% offline writes sync successfully
- **App Performance**: App launch < 2s, Firestore queries < 500ms
- **Manager Adoption**: >80% managers review DSRs within 24 hours

---

## Future Enhancements (Post-V1)

- Quoting/invoicing module
- Expense tracking
- Route planning with Google Maps
- Product catalog with inventory sync
- Advanced analytics (BigQuery export)
- Full-text search (Algolia)
- Multi-language support (Hindi, regional languages)
- WhatsApp integration for lead updates

---

## 📚 Documentation Structure & Standards

All project documentation is centrally organized in `docs/` with **41 files** across **8 categories**.

### 🗂️ Directory Overview

```
docs/
├── README.md                   # Complete index of all docs
├── DOCUMENTATION_MAP.md        # Quick "I want to..." navigation
├── proposal.md                 # Original requirements
├── MOBILE_SETUP_SUMMARY.md    # Setup instructions
│
├── design/          (9 files)  # UI/UX, branding, design system
├── development/     (6 files)  # Setup, Firebase, troubleshooting
├── implementation/  (6 files)  # Feature completion status
├── planning/        (6 files)  # Architecture & feature plans
├── releases/        (5 files)  # PR descriptions & changelogs
├── testing/         (2 files)  # Test procedures & progress
└── archive/         (2 files)  # Historical logs (e.g., PROGRESS.md)
```

---

## 📝 Documentation Standards for New Features

### When Building a New Feature - Follow This Pattern:

#### 1. Planning Phase: Create Design Doc
**Location:** `docs/planning/FEATURE_NAME_DESIGN.md`

**Must include:**
- Overview & user stories
- Data model changes (collections, indexes, security rules)
- API endpoints (if backend changes needed)
- UI screens & navigation flows
- Implementation phases with time estimates
- Success criteria & risks

#### 2. Implementation Phase: Track Progress
**Location:** `docs/implementation/FEATURE_NAME_IMPLEMENTATION.md`

**Must include:**
- Checklist of tasks (backend, mobile, testing)
- Files created/modified with descriptions
- Known issues & blockers
- Current status & next steps

#### 3. Completion Phase: Document Results
**Location:** `docs/implementation/FEATURE_NAME_COMPLETE.md`

**Must include:**
- What's complete (✅ checked list)
- How to use (for developers & users)
- APIs/functions deployed with URLs
- Screens implemented with file paths
- Testing completed checklist
- Known limitations & future enhancements

#### 4. Release Phase (if applicable)
**Location:** `docs/releases/PR#_FEATURE_NAME.md`

**Must include:**
- PR summary & motivation
- Files changed
- Testing checklist
- Deployment notes
- Rollback plan

---

## 📂 Where to Put Different Doc Types

| Category | Use For | Examples |
|----------|---------|----------|
| **design/** | Brand, DS, components, themes | `BRANDING_GUIDE.md`, `COMPONENT_CATALOG.md` |
| **development/** | Setup, Firebase, troubleshooting, QA | `FIREBASE_USAGE.md`, `SDK54_VERSIONS.md` |
| **implementation/** | Feature status, "what's done" | `SALES_REP_COMPLETE.md`, `MANAGER_DASHBOARD_COMPLETE.md` |
| **planning/** | Architecture, feature designs | `NAVIGATION_PLAN.md`, `PAYMENT_DESIGN.md` |
| **releases/** | PR descriptions, changelogs | `PR5_FLASHLIST_PERF.md` |
| **testing/** | Test procedures, QA progress | `HOW_TO_TEST.md` |
| **archive/** | Historical logs, outdated docs | `PROGRESS.md` (4,391 line timeline) |

---

## 🔄 Documentation Workflow Example

**Building Payment Integration:**

1. **Plan**: Create `docs/planning/PAYMENT_INTEGRATION_DESIGN.md`
2. **Build**: Create `docs/implementation/PAYMENT_INTEGRATION_IMPLEMENTATION.md`, update as you code
3. **Complete**: Create `docs/implementation/PAYMENT_INTEGRATION_COMPLETE.md`
4. **Release**: Create `docs/releases/PR15_PAYMENT_INTEGRATION.md`
5. **Index**: Add links to `docs/README.md`

---

## 🎯 Quick Reference for AI Agents

### Starting a new feature?
1. Check `docs/planning/` - Does similar feature exist?
2. Create `docs/planning/YOUR_FEATURE_DESIGN.md`
3. Create `docs/implementation/YOUR_FEATURE_IMPLEMENTATION.md`

### While building?
1. Update implementation doc with ✓ as you complete tasks
2. Document decisions & list all files changed

### When complete?
1. Create `docs/implementation/YOUR_FEATURE_COMPLETE.md`
2. Update `docs/README.md` to add your new docs

### For branding work?
→ **READ FIRST**: `docs/design/BRANDING_GUIDE.md`

### For Firebase code?
→ **⚠️ CRITICAL**: `docs/development/FIREBASE_USAGE.md` (modular API required)

### Can't find something?
→ `docs/DOCUMENTATION_MAP.md` has task-based navigation

---

## 📖 Key Documentation Files

### Essential Starting Points:
- **[docs/README.md](docs/README.md)** - Complete index of all 41 docs
- **[docs/DOCUMENTATION_MAP.md](docs/DOCUMENTATION_MAP.md)** - "I want to..." navigation
- **[docs/proposal.md](docs/proposal.md)** - Original requirements

### Design & Branding:
- **[docs/design/BRANDING_GUIDE.md](docs/design/BRANDING_GUIDE.md)** - Logo usage, colors, integration
- **[docs/design/COMPONENT_CATALOG.md](docs/design/COMPONENT_CATALOG.md)** - Component APIs
- **[docs/design/VISUAL_DIRECTION.md](docs/design/VISUAL_DIRECTION.md)** - Design Lab & tokens

### Development:
- **[docs/development/FIREBASE_USAGE.md](docs/development/FIREBASE_USAGE.md)** - ⚠️ MUST READ
- **[docs/development/SDK54_VERSIONS.md](docs/development/SDK54_VERSIONS.md)** - Versions
- **[docs/development/NEXT_STEPS.md](docs/development/NEXT_STEPS.md)** - Setup

### Current Status:
- **[docs/implementation/SALES_REP_COMPLETE.md](docs/implementation/SALES_REP_COMPLETE.md)**
- **[docs/implementation/MANAGER_DASHBOARD_COMPLETE.md](docs/implementation/MANAGER_DASHBOARD_COMPLETE.md)**

---

## 💡 Documentation Best Practices

1. **Be Specific**: "Manager Dashboard Home Tab" not "Dashboard"
2. **Use Status Indicators**: ✅ ❌ 🔄 ⏳ help scanning
3. **Include Dates**: Always add "Last Updated" at top
4. **Link Liberally**: Reference related docs with markdown links
5. **Show Examples**: Include code snippets, ASCII diagrams
6. **Update Indexes**: Always update `docs/README.md` when adding docs
7. **Archive Old Docs**: Move outdated docs to `docs/archive/`

**Documentation is code.** Keep it clean, organized, and up-to-date!

---

## 📊 Why This Structure?

**Historical Context:** Originally had ONE giant `PROGRESS.md` (4,391 lines!) tracking everything chronologically. Now split into specialized docs by purpose, feature, and category for better maintainability.

**Benefits:**
- ✅ Easy to find feature-specific info (no reading thousands of lines)
- ✅ Multiple agents can work on different docs simultaneously
- ✅ Clear "source of truth" for each feature
- ✅ Better organization and discoverability

---

**Last Updated**: Oct 17, 2025
**Owner**: Kunal Gupta (Artis Laminates)
**AI Context Version**: 1.2
