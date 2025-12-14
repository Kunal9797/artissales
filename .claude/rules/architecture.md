# Data Architecture (Firestore)

## Collections Schema

### `users/{userId}`
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

### `accounts/{accountId}`
```typescript
{
  id: string;
  name: string;
  type: 'distributor' | 'dealer' | 'architect' | 'OEM';
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  createdByUserId: string;       // Rep who created (for permission checks)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `visits/{visitId}`
```typescript
{
  id: string;
  userId: string;                // Rep who made visit

  // Account info (denormalized)
  accountId: string;
  accountName: string;
  accountType: 'distributor' | 'dealer' | 'architect';

  // Visit details
  timestamp: Timestamp;
  purpose: 'sample_delivery' | 'follow_up' | 'complaint' | 'new_lead' | 'payment_collection' | 'other';
  notes?: string;
  photos: string[];              // **REQUIRED** - Counter photo URLs (min 1)

  createdAt: Timestamp;
  extra?: Record<string, any>;
}

// Indexes: userId+timestamp(desc), userId+purpose, accountId+timestamp
```

### `sheetsSales/{saleId}`
```typescript
{
  id: string;
  userId: string;
  date: string;                  // YYYY-MM-DD

  catalog: 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis';
  sheetsCount: number;

  notes?: string;
  distributorId?: string;
  distributorName?: string;

  // Verification (for incentive calculation)
  verified: boolean;             // Default: false
  verifiedBy?: string;
  verifiedAt?: Timestamp;

  createdAt: Timestamp;
}

// Indexes: userId+date(desc), date+catalog, verified+userId
```

### `expenses/{expenseId}`
```typescript
{
  id: string;
  userId: string;
  date: string;                  // YYYY-MM-DD

  amount: number;                // In INR
  category: 'travel' | 'food' | 'accommodation' | 'other';
  description: string;
  receiptPhoto?: string;

  // Approval workflow
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  managerComments?: string;

  createdAt: Timestamp;
}

// Indexes: userId+date(desc), status+userId, date+status
```

### `targets/{targetId}`
```typescript
{
  id: string;
  userId: string;                // Rep this target is for
  month: string;                 // YYYY-MM format

  // Target values
  visitTarget?: number;
  sheetsTarget?: number;

  // Set by
  setBy: string;                 // Manager userId
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `attendance/{attendanceId}` ⏸️ DISABLED FOR V1
> Feature disabled via flag. Collection exists but receives no new writes.

```typescript
{
  id: string;
  userId: string;
  type: 'check_in' | 'check_out';
  timestamp: Timestamp;
  geo: GeoPoint;
  accuracyM: number;
  deviceInfo?: {
    isMocked: boolean;
    battery: number;
    timezone: string;
  };
}
```

### `leads/{leadId}` ⏸️ DEFERRED FOR V1
```typescript
{
  id: string;
  source: 'website' | 'referral' | 'cold_call' | 'exhibition';
  name: string;
  phone: string;
  status: 'new' | 'contacted' | 'qualified' | 'quoted' | 'won' | 'lost';
  ownerUserId: string;
  createdAt: Timestamp;
  slaDueAt: Timestamp;
  slaBreached: boolean;
}
```

### `documents/{documentId}`
```typescript
{
  id: string;
  name: string;
  description?: string;
  fileUrl: string;               // Storage URL
  fileType: string;              // MIME type
  fileSize: number;              // Bytes
  uploadedBy: string;            // Manager userId
  createdAt: Timestamp;
}
```

### `incentiveSchemes/{schemeId}`
```typescript
{
  id: string;
  name: string;
  description?: string;
  startDate: string;             // YYYY-MM-DD
  endDate: string;               // YYYY-MM-DD
  rules: object;                 // Incentive calculation rules
  createdBy: string;
  createdAt: Timestamp;
}
```

### `incentiveResults/{resultId}`
```typescript
{
  id: string;
  userId: string;
  schemeId: string;
  period: string;                // YYYY-MM
  amount: number;                // Calculated incentive
  calculatedAt: Timestamp;
}
```

### `config/{configId}`
```typescript
{
  // Example: config/appVersion
  minVersion: string;            // Minimum app version required
  currentVersion: string;
  forceUpdate: boolean;
  updateUrl?: string;
}
```

### `events/{eventId}` (Outbox Pattern)
```typescript
{
  id: string;
  eventType: string;
  payload: Record<string, any>;
  createdAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;
  retryCount: number;
  error?: string;
}
// Access: Cloud Functions only (denied to clients)
```

---

## Cloud Functions Structure

```
functions/
└── src/
    ├── api/                 # HTTP API endpoints
    ├── webhooks/            # External webhook handlers
    ├── scheduled/           # Cron jobs (dsrCompiler, etc.)
    ├── triggers/            # Firestore triggers
    ├── migrations/          # Data migration scripts
    ├── scripts/             # Utility scripts
    ├── utils/               # Shared utilities
    ├── types/               # TypeScript types
    └── index.ts             # Function exports
```

---

## Mobile App Structure

```
mobile/
└── src/
    ├── screens/             # Feature screens
    ├── components/          # Reusable UI components
    ├── hooks/               # Custom React hooks
    ├── services/            # Firebase, API services
    ├── navigation/          # React Navigation setup
    ├── providers/           # Context providers
    ├── patterns/            # UI patterns (skeletons, etc.)
    ├── theme/               # Design tokens, colors
    ├── types/               # TypeScript types
    └── utils/               # Utility functions
```

---

## Key Indexes

Most important composite indexes (defined in `firestore.indexes.json`):

| Collection | Fields | Purpose |
|------------|--------|---------|
| `visits` | userId, timestamp (desc) | User's visits timeline |
| `expenses` | userId, date (desc) | User's expenses timeline |
| `sheetsSales` | userId, date (desc) | User's sales timeline |
| `targets` | userId, month | User's monthly targets |
