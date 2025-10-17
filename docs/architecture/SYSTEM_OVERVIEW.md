# System Overview

**Last Updated**: October 17, 2025
**Architecture Style**: Event-Driven, Offline-First, Mobile-First

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MOBILE APP (React Native + Expo)         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Sales Rep   │  │   Manager    │  │    Admin     │     │
│  │  Features    │  │  Features    │  │  Features    │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                   ┌────────▼─────────┐                      │
│                   │  Firebase SDK    │                      │
│                   │  - Auth          │                      │
│                   │  - Firestore     │                      │
│                   │  - Storage       │                      │
│                   │  - Messaging     │                      │
│                   └────────┬─────────┘                      │
└────────────────────────────┼──────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │   INTERNET       │
                    └────────┬─────────┘
                             │
┌────────────────────────────▼──────────────────────────────┐
│               FIREBASE BACKEND (Google Cloud)              │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │              Firebase Authentication                  ││
│  │  - Phone number auth                                 ││
│  │  - Custom claims (role-based)                        ││
│  └──────────────────────────────────────────────────────┘│
│                                                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │              Cloud Firestore (Database)              ││
│  │  - 11 collections                                    ││
│  │  - Real-time sync                                    ││
│  │  - Offline persistence                               ││
│  │  - Security Rules (role-based)                       ││
│  └──────────────────────────────────────────────────────┘│
│                                                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │       Cloud Functions (Serverless Backend)           ││
│  │  ┌──────────────┐  ┌──────────────┐                ││
│  │  │  REST APIs   │  │  Scheduled   │                ││
│  │  │  (47 endpoints)  │  Functions   │                ││
│  │  │              │  │  (4 crons)   │                ││
│  │  └──────┬───────┘  └──────┬───────┘                ││
│  │         │                  │                         ││
│  │  ┌──────▼──────────────────▼───────┐                ││
│  │  │   Firestore Triggers (3)        │                ││
│  │  └──────────────────────────────────┘                ││
│  └──────────────────────────────────────────────────────┘│
│                                                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │            Cloud Storage (File Storage)              ││
│  │  - Visit photos                                      ││
│  │  - Receipt photos                                    ││
│  │  - Documents (PDFs, catalogs)                        ││
│  └──────────────────────────────────────────────────────┘│
│                                                            │
│  ┌──────────────────────────────────────────────────────┐│
│  │     Firebase Cloud Messaging (Push Notifications)    ││
│  └──────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  External APIs   │
                    │  - Website       │
                    │  - WhatsApp      │
                    │  (future)        │
                    └──────────────────┘
```

---

## Core Components

### 1. Mobile App (React Native + Expo)

**Technology**: React Native, Expo SDK 53, TypeScript
**Platform**: Android-first (iOS compatible)
**Size**: ~5,500 lines of TypeScript

**Key Features**:
- 27 screens (11 sales rep, 16 manager)
- 5-tab bottom navigation for both roles
- Offline-first with Firestore persistence
- GPS-based attendance tracking
- Photo capture for visits
- Document caching for offline viewing
- Real-time data sync

**Dependencies**:
```
@react-native-firebase/*  - Firebase integration
expo-location             - GPS tracking
expo-camera               - Photo capture
expo-image-manipulator    - Image compression
@react-navigation/*       - Navigation
@shopify/flash-list       - Performance lists
```

---

### 2. Firebase Backend

#### 2.1 Cloud Firestore (Database)

**Type**: NoSQL document database
**Collections**: 11 (users, accounts, leads, visits, etc.)
**Data Size**: Growing (currently < 1 GB)
**Offline Mode**: Enabled on mobile

**Key Features**:
- Real-time synchronization
- Offline persistence (mobile)
- Security Rules (role-based access)
- Composite indexes for complex queries
- Automatic scaling

#### 2.2 Cloud Functions (Backend Logic)

**Runtime**: Node.js 18, TypeScript
**Total Functions**: ~20 deployed functions
**Organization**:
- **API Endpoints** (47): REST API for mobile app
- **Scheduled Functions** (4): Cron jobs
- **Triggers** (3): Firestore event listeners

**Execution**:
- Region: us-central1
- Memory: 256 MB (default)
- Timeout: 60s (API), 540s (scheduled)

#### 2.3 Firebase Authentication

**Method**: Phone number authentication (SMS OTP)
**Custom Claims**: Role-based (rep, manager, admin)
**Session**: JWT tokens, auto-refresh

#### 2.4 Cloud Storage

**Purpose**: File storage (photos, documents)
**Organization**:
```
gs://artis-sales/
  ├── visits/
  │   └── {visitId}/
  │       ├── photo1.jpg
  │       └── photo2.jpg
  ├── expenses/
  │   └── {expenseId}/
  │       └── receipt1.jpg
  └── documents/
      └── {documentId}/
          └── catalog.pdf
```

**Access**: Signed URLs (1-hour expiry)

#### 2.5 Firebase Cloud Messaging (FCM)

**Purpose**: Push notifications
**Use Cases**:
- New lead assigned
- SLA deadline approaching
- DSR approval status
- Manager announcements

---

## Data Flow Patterns

### 1. Offline-First Write Pattern

```
Mobile App
  ↓ Write to local Firestore
  [Queued if offline]
  ↓ Auto-sync when online
Cloud Firestore
  ↓ Trigger Firestore listener
Cloud Function
  ↓ Process event
Update related data / Send notification
```

### 2. Event-Driven Pattern

```
Action (e.g., Visit logged)
  ↓ Write to Firestore
  ↓ Create event in 'events' collection (outbox)
Scheduled Function (outboxProcessor)
  ↓ Polls every 30s
  ↓ Processes unprocessed events
  ↓ Sends notifications, updates stats
  ↓ Marks event as processed
```

### 3. API Request Pattern

```
Mobile App
  ↓ HTTP request with JWT
Cloud Function (API endpoint)
  ↓ Verify JWT
  ↓ Validate input
  ↓ Check permissions (role-based)
  ↓ Execute business logic
  ↓ Write to Firestore
  ↓ Return response
Mobile App
  ↓ Update UI
```

---

## Security Architecture

### 1. Authentication

```
User enters phone number
  ↓ SMS OTP sent
User enters OTP
  ↓ Firebase Auth verifies
  ↓ Issues JWT token with custom claims
Mobile App
  ↓ Stores token locally
  ↓ Auto-refreshes token
  ↓ Includes token in API requests
```

### 2. Authorization (Role-Based)

**Roles**:
- `rep`: Sales representative (field agent)
- `area_manager`: Manages 5-10 reps in an area
- `zonal_head`: Manages multiple area managers
- `national_head`: Top-level management
- `admin`: System administrator

**Permissions**:
| Resource | Rep | Manager | Admin |
|----------|-----|---------|-------|
| Own data | Read/Write | Read/Write | Read/Write |
| Team data | - | Read/Write | Read/Write |
| All data | - | - | Read/Write |
| User management | - | Team only | All |
| Reports | Own only | Team only | All |

### 3. Data Access Control

**Firestore Security Rules**:
```javascript
// Example: Visits collection
match /visits/{visitId} {
  allow read: if isAuthenticated() && (
    resource.data.userId == request.auth.uid  // Rep sees their own
    || isManager()  // Manager sees team's
  );
  allow create: if isAuthenticated() && isRep() &&
    request.resource.data.photos.size() > 0;  // Photos required
}
```

**Cloud Function Validation**:
```typescript
// Verify user role before allowing action
if (!['area_manager', 'admin'].includes(userRole)) {
  throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
}
```

---

## Scalability & Performance

### Current Capacity
- **Users**: ~50-100 (10-15 managers, 40-85 reps)
- **Accounts**: ~500-1000
- **Daily Transactions**: ~500-1000 (visits, sales, expenses)
- **Storage**: < 1 GB (mostly photos)

### Performance Optimizations
- **FlashList** for heavy lists (vs FlatList)
- **Memoization** for expensive renders
- **Composite indexes** for complex queries
- **Lazy loading** for documents
- **Image compression** before upload
- **Signed URLs** for file access (no download to Firestore)

### Scaling Limits (Firebase)
- **Firestore**: 1 million concurrent connections
- **Cloud Functions**: Auto-scales to demand
- **Cloud Storage**: Petabyte scale
- **No explicit limits** for current usage

---

## Deployment Architecture

### Environments

| Environment | Purpose | Firebase Project |
|-------------|---------|------------------|
| **Dev** | Development testing | `artis-sales-dev` |
| **Staging** | Pre-production testing | `artis-sales-staging` |
| **Production** | Live app | `artis-sales` |

### Deployment Process

```
Code changes
  ↓ Git commit
  ↓ Push to branch
  ↓ Create PR
  ↓ Review & approve
  ↓ Merge to main
Automated CI/CD (future)
  ↓ Run tests
  ↓ Deploy functions
  ↓ Build mobile app
  ↓ Submit to Play Store
```

### Manual Deployment (Current)

**Firebase Functions**:
```bash
firebase deploy --only functions
```

**Mobile App**:
```bash
eas build --platform android --profile production
```

---

## Monitoring & Observability

### Firebase Console
- **Authentication**: User sign-ups, active users
- **Firestore**: Document counts, read/write metrics
- **Functions**: Invocations, errors, duration
- **Storage**: File counts, bandwidth

### Error Tracking
- **Firestore logs**: Function execution logs
- **Crashlytics**: Mobile app crashes (future)
- **Sentry**: Error aggregation (future)

### Metrics to Monitor
- API latency (p50, p95, p99)
- Function error rates
- Firestore read/write costs
- Storage bandwidth costs
- Active user count
- SLA compliance rate

---

## Cost Estimation

### Firebase Pricing (Pay-as-you-go)

**Monthly Estimates** (100 active users):
- **Authentication**: $0 (free tier)
- **Firestore**: $5-10 (reads/writes/storage)
- **Cloud Functions**: $10-20 (invocations/compute)
- **Cloud Storage**: $5-10 (storage/bandwidth)
- **FCM**: $0 (free)
- **Total**: ~$20-40/month

**At Scale** (500 active users):
- ~$100-150/month

---

## Technology Choices & Rationale

### Why Firebase?
- **Offline-first** - Firestore persistence perfect for field sales
- **Real-time** - Live updates for managers
- **Serverless** - No infrastructure to manage
- **Scalable** - Auto-scales to demand
- **Cost-effective** - Pay only for usage
- **Mobile SDKs** - Excellent React Native support

### Why React Native + Expo?
- **Cross-platform** - Android + iOS from one codebase
- **Fast development** - Hot reload, managed workflow
- **Large ecosystem** - Rich library of packages
- **OTA updates** - Push updates without Play Store review
- **Cost-effective** - One team, two platforms

### Why Event-Driven Architecture?
- **Loose coupling** - Components don't depend on each other
- **Auditability** - Full event log for compliance
- **Reliability** - Retry failed events automatically
- **Extensibility** - Easy to add new event consumers

---

## Future Enhancements

### Short-term (3-6 months)
- [ ] Expense approval workflow completion
- [ ] Lead routing webhook integration
- [ ] WhatsApp notifications
- [ ] Advanced analytics dashboard

### Medium-term (6-12 months)
- [ ] Route planning with Google Maps
- [ ] Quoting/invoicing module
- [ ] Multi-language support
- [ ] ERP integration (CSV exports)

### Long-term (12+ months)
- [ ] Multi-tenant support (white-label)
- [ ] AI-powered insights
- [ ] Voice commands
- [ ] Augmented reality product catalog

---

## Related Documentation

- **[Firestore Schema](FIRESTORE_SCHEMA.md)** - Complete database schema
- **[API Contracts](API_CONTRACTS.md)** - All API endpoints
- **[Data Flow](DATA_FLOW.md)** - Event-driven architecture details
- **[Navigation](NAVIGATION.md)** - Mobile app navigation structure
- **[Security](SECURITY.md)** - Authentication & authorization
- **[/docs/STATUS.md](../STATUS.md)** - Current implementation status

---

**Last Updated**: October 17, 2025
