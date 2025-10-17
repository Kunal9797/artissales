# Security Architecture

**Last Updated**: October 17, 2025
**Authentication**: Firebase Auth (Phone Number + SMS OTP)
**Authorization**: Role-Based Access Control (RBAC)

---

## Security Overview

The Artis Sales App implements defense-in-depth security with multiple layers:

1. **Authentication** - Firebase Auth with phone number verification
2. **Authorization** - Role-based access control (5 roles)
3. **Data Protection** - Firestore Security Rules + API validation
4. **Transport Security** - HTTPS/TLS for all communication
5. **Input Validation** - Server-side validation for all inputs
6. **Audit Logging** - Event outbox for complete audit trail

---

## Authentication Flow

### Phone Number Authentication

```
[Mobile App]
User enters phone number (10 digits)
  ↓
Normalize: "+91" + phone
  ↓
Firebase Auth sends SMS OTP
  ↓
User enters 6-digit OTP
  ↓
Firebase Auth verifies OTP
  ↓
If valid:
  → Issue JWT token with custom claims
  → Token includes: userId, role, exp
  ↓
Mobile app stores token securely
  ↓
All API requests include:
  Authorization: Bearer <jwt-token>
```

### Custom Claims (Role-Based)

```typescript
// Set custom claims (admin only)
await auth().setCustomUserClaims(userId, {
  role: 'rep',
  territory: 'Delhi NCR'
});

// JWT payload includes:
{
  "uid": "rep456",
  "phone": "+919876543210",
  "role": "rep",              // Custom claim
  "territory": "Delhi NCR",   // Custom claim
  "iat": 1697520000,
  "exp": 1697523600
}
```

---

## Role-Based Access Control (RBAC)

### Roles

| Role | Description | Count | Permissions |
|------|-------------|-------|-------------|
| **rep** | Sales representative | ~40-85 | Own data only |
| **area_manager** | Manages 5-10 reps | ~10-15 | Team data |
| **zonal_head** | Manages area managers | ~2-5 | Zone data |
| **national_head** | Top management | ~1-2 | All data |
| **admin** | System administrator | ~1-2 | Full access |

### Permission Matrix

| Resource | Rep | Area Manager | Zonal Head | National Head | Admin |
|----------|-----|--------------|------------|---------------|-------|
| **Own Profile** | R/W | R/W | R/W | R/W | R/W |
| **Own Attendance** | R/W | R/W | R/W | R/W | R/W |
| **Own Visits** | R/W | R/W | R/W | R/W | R/W |
| **Own DSRs** | R | R | R | R | R/W |
| **Team Data** | - | R | R | R | R/W |
| **All Users Data** | - | - | - | R | R/W |
| **User Management** | - | Team | Team | Team | All |
| **Account Management** | R (assigned) | R/W (territory) | R/W (zone) | R/W | R/W |
| **Reports & Analytics** | Own | Team | Zone | All | All |
| **System Settings** | - | - | - | - | Full |

---

## Firestore Security Rules

### Overview

Firestore Security Rules enforce access control at the database level:
- Evaluated on every read/write
- Run before data is accessed
- Independent of backend logic
- Cannot be bypassed by client

### Example Rules

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
      // Anyone authenticated can read user profiles
      allow read: if isAuthenticated();

      // Only managers can create users
      allow create: if isManager();

      // Users can update their own profile, managers can update anyone
      allow update: if request.auth.uid == userId || isManager();

      // Only admins can delete users
      allow delete: if getUserRole() == 'admin';
    }

    // Accounts collection
    match /accounts/{accountId} {
      // Reps can read accounts assigned to them
      // Managers can read all accounts in their territory
      allow read: if isAuthenticated() && (
        resource.data.assignedRepUserId == request.auth.uid
        || isManager()
      );

      // Only managers can create/update accounts
      allow create, update: if isManager();

      // Only admins can delete accounts
      allow delete: if getUserRole() == 'admin';
    }

    // Attendance collection
    match /attendance/{attendanceId} {
      // Users can read their own attendance
      // Managers can read team attendance
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid
        || isManager()
      );

      // Users can create their own attendance
      // Validate: accuracy ≤ 100m, userId matches auth
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.accuracyM <= 100;

      // No updates or deletes allowed
      allow update, delete: if false;
    }

    // Visits collection
    match /visits/{visitId} {
      // Users can read their own visits
      // Managers can read team visits
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid
        || isManager()
      );

      // Users can create their own visits
      // Validate: photos array not empty, userId matches auth
      allow create: if isAuthenticated()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.photos.size() > 0;

      // Users can delete their own visits (within 24 hours)
      allow delete: if request.auth.uid == resource.data.userId
        && request.time < resource.data.createdAt + duration.value(24, 'h');

      // No updates allowed (immutable)
      allow update: if false;
    }

    // DSR Reports collection
    match /dsrReports/{reportId} {
      // Users can read their own DSRs
      // Managers can read team DSRs
      allow read: if isAuthenticated() && (
        resource.data.userId == request.auth.uid
        || isManager()
      );

      // Only backend functions can create DSRs
      allow create: if false;  // Use admin SDK

      // Only managers can update DSR status (approve/reject)
      allow update: if isManager()
        && request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['status', 'reviewedBy', 'reviewedAt', 'managerComments']);

      // No deletes allowed
      allow delete: if false;
    }

    // Events collection (outbox pattern)
    match /events/{eventId} {
      // Only backend functions can access events
      allow read, write: if false;  // Use admin SDK only
    }
  }
}
```

---

## API Security

### Authentication Middleware

```typescript
// Cloud Function middleware
async function authenticateRequest(req: express.Request): Promise<AuthUser> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new functions.https.HttpsError('unauthenticated', 'Missing auth token');
  }

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await auth().verifyIdToken(token);

  return {
    uid: decodedToken.uid,
    phone: decodedToken.phone_number,
    role: decodedToken.role,  // Custom claim
    territory: decodedToken.territory
  };
}
```

### Authorization Checks

```typescript
// Example: Only managers can create users
export const createUser = functions.https.onRequest(async (req, res) => {
  // Authenticate
  const user = await authenticateRequest(req);

  // Authorize
  if (!['area_manager', 'zonal_head', 'national_head', 'admin'].includes(user.role)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only managers can create users'
    );
  }

  // Proceed with logic
  // ...
});
```

### Input Validation

```typescript
// Validate all inputs
function validateAttendanceRequest(data: any): AttendanceRequest {
  if (!data.lat || !data.lon) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing GPS coordinates');
  }

  if (typeof data.lat !== 'number' || typeof data.lon !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid coordinates');
  }

  if (data.accuracyM > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'GPS accuracy must be ≤ 100m');
  }

  return {
    lat: data.lat,
    lon: data.lon,
    accuracyM: data.accuracyM,
    deviceInfo: data.deviceInfo
  };
}
```

---

## Data Protection

### Sensitive Data

**PII (Personally Identifiable Information)**:
- Phone numbers (normalized, indexed)
- Email addresses
- User names
- GPS coordinates

**Protection Measures**:
- ✅ Firestore Security Rules enforce access control
- ✅ No client-side caching of sensitive data
- ✅ HTTPS/TLS for all communication
- ⏳ Future: Field-level encryption for phone/email

### Photo Storage

**Cloud Storage Security**:
- Photos stored with signed URLs (1-hour expiry)
- No public access
- Client uploads via signed URL (no direct access)

```typescript
// Generate signed URL for upload
const bucket = storage().bucket('artis-sales');
const file = bucket.file(`visits/${visitId}/photo.jpg`);

const [signedUrl] = await file.getSignedUrl({
  action: 'write',
  expires: Date.now() + 60 * 60 * 1000,  // 1 hour
  contentType: 'image/jpeg'
});

// Client uploads to signed URL
// No storage credentials on client
```

---

## GPS Spoofing Detection

### Device Info Validation

```typescript
{
  deviceInfo: {
    isMocked: boolean,     // Android: mock location detected
    battery: number,       // Low battery = suspicious
    timezone: string       // Verify matches expected
  }
}
```

### Accuracy Validation

```typescript
// Reject if accuracy > 100 meters
if (request.accuracyM > 100) {
  throw new functions.https.HttpsError(
    'invalid-argument',
    'GPS accuracy insufficient (required: ≤ 100m)'
  );
}
```

### Behavioral Analysis (Future)

- Detect impossible travel speeds
- Flag unusual patterns
- Require manager approval for suspicious locations

---

## Audit Logging

### Event Outbox

All significant actions emit events:

```typescript
{
  eventType: "VisitEnded",
  payload: {
    visitId: "visit123",
    userId: "rep456",
    accountId: "acc789",
    timestamp: "2025-10-17T14:30:00Z"
  },
  createdAt: Timestamp,
  processedAt: Timestamp
}
```

**Benefits**:
- Complete audit trail
- Compliance reporting
- Incident investigation
- Analytics

---

## Secrets Management

### Environment Variables

```bash
# Cloud Functions config
firebase functions:config:set \
  api.key="xxx" \
  sms.gateway_key="yyy"
```

**Never in Code**:
- ❌ API keys
- ❌ Database credentials
- ❌ Service account keys
- ❌ SMS gateway credentials

**Access in Functions**:
```typescript
const apiKey = functions.config().api.key;
```

---

## Security Best Practices

### Mobile App

- ✅ No hardcoded secrets
- ✅ JWT tokens stored securely (AsyncStorage with encryption)
- ✅ HTTPS only (no HTTP)
- ✅ Certificate pinning (future)
- ✅ Biometric auth for re-login (future)

### Backend

- ✅ Input validation on all endpoints
- ✅ Rate limiting (future)
- ✅ CORS configured properly
- ✅ Error messages don't leak info
- ✅ Admin SDK for privileged operations

### Database

- ✅ Firestore Security Rules enforced
- ✅ Indexes for performance (no full scans)
- ✅ Backup enabled
- ✅ Monitoring for suspicious activity

---

## Incident Response

### Security Incident Procedure

1. **Detect**: Monitor logs for suspicious activity
2. **Assess**: Determine scope and impact
3. **Contain**: Revoke compromised tokens, disable accounts
4. **Eradicate**: Patch vulnerability, update rules
5. **Recover**: Restore from backup if needed
6. **Review**: Post-mortem, update procedures

### Emergency Actions

**Revoke User Token**:
```bash
firebase auth:revoke-tokens <userId>
```

**Disable User Account**:
```typescript
await auth().updateUser(userId, {disabled: true});
```

**Update Security Rules** (immediate):
```bash
firebase deploy --only firestore:rules
```

---

## Compliance

### Data Privacy

**GDPR/Privacy Considerations**:
- Users can request data export
- Users can request account deletion
- Data minimization (only collect what's needed)
- Consent for location tracking

**Data Retention**:
- Attendance: 2 years
- Visits: 2 years
- DSRs: 5 years (tax compliance)
- User accounts: Indefinite (unless deleted)

---

## Security Roadmap

### Short-term (3-6 months)
- [ ] Implement rate limiting on APIs
- [ ] Add behavioral analysis for GPS spoofing
- [ ] Enable Firestore backup exports
- [ ] Set up security monitoring alerts

### Medium-term (6-12 months)
- [ ] Add biometric authentication
- [ ] Implement field-level encryption
- [ ] Add certificate pinning
- [ ] Conduct security audit

### Long-term (12+ months)
- [ ] SOC 2 compliance
- [ ] Penetration testing
- [ ] Bug bounty program
- [ ] Advanced threat detection

---

## Related Documentation

- **[Firestore Schema](FIRESTORE_SCHEMA.md)** - Database structure
- **[API Contracts](API_CONTRACTS.md)** - API endpoints
- **[System Overview](SYSTEM_OVERVIEW.md)** - High-level architecture

---

**Last Updated**: October 17, 2025
