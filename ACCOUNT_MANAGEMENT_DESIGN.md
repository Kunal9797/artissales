# Account Management & Sales Rep Assignment Design

**Date**: October 11, 2025
**Status**: Design Phase - Ready for Implementation

---

## 🎯 Business Requirements

### 1. **Sales Rep → Distributor Linking**
**Problem**: Many sales reps work exclusively for specific distributors and their dealer networks.

**Solution**:
- When creating a sales rep, National Head can assign them to a **primary distributor**
- This creates a clear reporting structure: Distributor → Sales Rep → Dealers/Architects
- Rep will primarily work with that distributor's network

### 2. **Account Creation Permissions**
**Problem**: Need control over who can add which types of accounts.

**Permissions Matrix**:
```
┌─────────────────┬──────────────┬────────┬───────────┐
│ Role            │ Distributors │ Dealers│ Architects│
├─────────────────┼──────────────┼────────┼───────────┤
│ Sales Rep       │ ❌           │ ✅     │ ✅        │
│ Zonal Head      │ ❌           │ ✅     │ ✅        │
│ National Head   │ ✅           │ ✅     │ ✅        │
│ Admin           │ ✅           │ ✅     │ ✅        │
└─────────────────┴──────────────┴────────┴───────────┘
```

**Rationale**:
- **Distributors**: High-value accounts, require approval from National Head
- **Dealers/Architects**: Can be added by reps in the field
- **Admin**: Full access to everything (for you)

### 3. **Admin Role Supremacy**
**Problem**: Need one role with unrestricted access for system administration.

**Solution**: Admin role has access to:
- All manager features
- All rep features
- All data across all users/territories
- System configuration
- User management (create/edit/deactivate any user)
- Account management (create/edit any account type)

---

## 📊 Updated Data Models

### **User Model (Updated)**
```typescript
export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  isActive: boolean;

  // Hierarchy
  reportsToUserId?: string;  // Manager hierarchy
  territory?: string;         // Area/zone assignment

  // NEW: Distributor Assignment
  primaryDistributorId?: string;  // For reps assigned to distributors

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### **Account Model (Updated)**
```typescript
export interface Account {
  id: string;
  name: string;
  type: AccountType; // "distributor" | "dealer" | "architect"

  // Assignment
  territory: string;
  assignedRepUserId: string;  // Rep responsible for this account

  // NEW: Distributor Network
  parentDistributorId?: string;  // For dealers/architects under a distributor

  // Contact
  contactPerson?: string;
  phone: string;
  email?: string;

  // Location
  address?: string;
  city: string;
  state: string;
  pincode: string;
  geoLocation?: GeoPoint;

  // Status
  status: AccountStatus;
  lastVisitAt?: Timestamp;

  // NEW: Creation tracking
  createdByUserId: string;  // Who added this account

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  extra?: Record<string, any>;
}
```

---

## 🔐 Permission System

### **Backend Permission Checks**

#### **Create User (National Head/Admin only)**
```typescript
// In createUserByManager function
const canCreateUser = (callerRole: UserRole): boolean => {
  return callerRole === 'national_head' || callerRole === 'admin';
};
```

#### **Create Account (Role + Account Type Based)**
```typescript
// New function: createAccount
const canCreateAccount = (
  callerRole: UserRole,
  accountType: AccountType
): boolean => {
  // Admin can create anything
  if (callerRole === 'admin') return true;

  // National Head can create anything
  if (callerRole === 'national_head') return true;

  // Reps and Zonal Heads can only create dealers/architects
  if (callerRole === 'rep' || callerRole === 'zonal_head') {
    return accountType === 'dealer' || accountType === 'architect';
  }

  return false;
};
```

#### **View All Data (Admin Override)**
```typescript
// In all "get" functions (getUsersList, getTeamStats, etc.)
const canViewAllData = (callerRole: UserRole): boolean => {
  return callerRole === 'admin';
};

// Example usage in getUsersList:
if (callerRole === 'admin') {
  // Return ALL users regardless of territory
  const allUsers = await db.collection('users').where('isActive', '==', true).get();
  return allUsers;
}
```

---

## 🎨 UI/UX Changes

### **1. AddUserScreen (Updated)**
**Location**: `mobile/src/screens/manager/AddUserScreen.tsx`

**New Fields**:
```typescript
// Add after Territory field
{role === 'rep' && (
  <View style={styles.inputContainer}>
    <Text style={styles.inputLabel}>Primary Distributor (Optional)</Text>
    <TouchableOpacity
      style={styles.distributorPicker}
      onPress={() => setShowDistributorModal(true)}
    >
      <Text style={styles.distributorPickerText}>
        {selectedDistributor?.name || 'Select distributor...'}
      </Text>
      <ChevronDown size={20} color={colors.text.tertiary} />
    </TouchableOpacity>
  </View>
)}
```

**Distributor Selection Modal**:
- Search distributors by name/city
- List all active distributors
- "No distributor (independent rep)" option
- Clear selection button

---

### **2. AddAccountScreen (New)**
**Location**: `mobile/src/screens/AddAccountScreen.tsx` (NEW)

**Purpose**: Allow reps to add dealers and architects in the field

**UI Structure**:
```
┌──────────────────────────────────────┐
│ 🏢 Add New Account                   │
│                                      │
│ Account Type*                        │
│ [Dealer] [Architect]                 │
│ (Distributor disabled for reps)      │
│                                      │
│ Account Name*                        │
│ [__________________________]         │
│                                      │
│ Contact Person                       │
│ [__________________________]         │
│                                      │
│ Phone Number*                        │
│ [__________________________]         │
│                                      │
│ City*                                │
│ [__________________________]         │
│                                      │
│ State*                               │
│ [Dropdown: Select state...]          │
│                                      │
│ Pincode*                             │
│ [__________________________]         │
│                                      │
│ Address (Optional)                   │
│ [__________________________]         │
│ [__________________________]         │
│                                      │
│ Parent Distributor (Optional)        │
│ [Select distributor...]              │
│                                      │
│ [Cancel]          [Save Account]     │
└──────────────────────────────────────┘
```

**Validation**:
- Account name: min 2 chars, required
- Phone: 10 digits, required
- City: required
- State: required (dropdown with Indian states)
- Pincode: 6 digits, required
- Account type: Disabled options based on role

**Navigation**:
- Add to Home screen quick actions
- Add to navigation menu

---

### **3. UserDetailScreen (Updated)**
**Location**: `mobile/src/screens/manager/UserDetailScreen.tsx`

**Show Distributor Assignment**:
```typescript
// In header section, after territory
{userData?.primaryDistributorId && (
  <View style={styles.distributorBadge}>
    <Building2 size={12} color={colors.info} />
    <Text style={styles.distributorText}>
      {distributorName}
    </Text>
  </View>
)}
```

**Edit Modal Update**:
- Add distributor picker to edit modal
- Allow National Head to change distributor assignment

---

### **4. Home Screen (Updated)**
**Location**: `mobile/src/screens/HomeScreen.tsx`

**Add Quick Action for Reps**:
```typescript
<TouchableOpacity
  style={styles.actionButton}
  onPress={() => navigation.navigate('AddAccount')}
>
  <BuildingPlus size={24} color={colors.accent} />
  <Text style={styles.actionButtonText}>Add Dealer/Architect</Text>
</TouchableOpacity>
```

---

## 🔧 Backend Implementation

### **1. Update createUserByManager Function**
**File**: `functions/src/api/users.ts`

**Changes**:
```typescript
export const createUserByManager = onRequest(async (request, response) => {
  // ... existing auth checks ...

  const {
    phone,
    name,
    role,
    territory,
    primaryDistributorId  // NEW
  } = request.body;

  // Validate distributor exists if provided
  if (primaryDistributorId) {
    const distributorDoc = await db.collection('accounts')
      .doc(primaryDistributorId)
      .get();

    if (!distributorDoc.exists || distributorDoc.data()?.type !== 'distributor') {
      return response.status(400).json({
        ok: false,
        error: 'Invalid distributor ID',
        code: 'INVALID_DISTRIBUTOR',
      });
    }
  }

  // Create user with distributor
  await db.collection('users').doc(userId).set({
    // ... existing fields ...
    primaryDistributorId: primaryDistributorId || null,
  });

  // ... rest of function ...
});
```

---

### **2. Create createAccount Function**
**File**: `functions/src/api/accounts.ts` (NEW)

```typescript
export const createAccount = onRequest(async (request, response) => {
  try {
    // 1. Verify authentication
    const auth = await requireAuth(request);
    if (!('valid' in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const userId = auth.uid;

    // Get caller's role
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      response.status(403).json({
        ok: false,
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    const callerRole = userDoc.data()?.role;

    // 2. Parse and validate input
    const {
      name,
      type,
      contactPerson,
      phone,
      email,
      address,
      city,
      state,
      pincode,
      parentDistributorId,
    } = request.body;

    // Validate required fields
    if (!name || !type || !phone || !city || !state || !pincode) {
      response.status(400).json({
        ok: false,
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
      return;
    }

    // Validate account type
    if (!['distributor', 'dealer', 'architect'].includes(type)) {
      response.status(400).json({
        ok: false,
        error: 'Invalid account type',
        code: 'INVALID_TYPE',
      });
      return;
    }

    // 3. Check permissions
    const canCreate = canCreateAccount(callerRole, type);
    if (!canCreate) {
      response.status(403).json({
        ok: false,
        error: `${callerRole} cannot create ${type} accounts. Only National Head or Admin can create distributors.`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
      return;
    }

    // 4. Normalize phone
    const normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length !== 10) {
      response.status(400).json({
        ok: false,
        error: 'Invalid phone number',
        code: 'INVALID_PHONE',
      });
      return;
    }

    // 5. Validate parent distributor if provided
    if (parentDistributorId) {
      const distributorDoc = await db.collection('accounts')
        .doc(parentDistributorId)
        .get();

      if (!distributorDoc.exists || distributorDoc.data()?.type !== 'distributor') {
        response.status(400).json({
          ok: false,
          error: 'Invalid parent distributor',
          code: 'INVALID_DISTRIBUTOR',
        });
        return;
      }
    }

    // 6. Get user's territory for auto-assignment
    const userData = userDoc.data();
    const territory = userData?.territory || 'Unassigned';

    // 7. Create account
    const accountRef = db.collection('accounts').doc();
    const accountId = accountRef.id;

    await accountRef.set({
      id: accountId,
      name: name.trim(),
      type: type,
      territory: territory,
      assignedRepUserId: userId,  // Auto-assign to creator
      contactPerson: contactPerson?.trim() || null,
      phone: `+91${normalizedPhone}`,
      email: email?.trim() || null,
      address: address?.trim() || null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      parentDistributorId: parentDistributorId || null,
      status: 'active',
      createdByUserId: userId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    logger.info(`[createAccount] ✅ Account created: ${accountId} by ${userId}`);

    response.status(200).json({
      ok: true,
      accountId: accountId,
      message: 'Account created successfully',
    });
  } catch (error: any) {
    logger.error('[createAccount] ❌ Error:', error);
    response.status(500).json({
      ok: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error.message,
    });
  }
});

// Helper function
function canCreateAccount(
  callerRole: string,
  accountType: string
): boolean {
  // Admin can create anything
  if (callerRole === 'admin') return true;

  // National Head can create anything
  if (callerRole === 'national_head') return true;

  // Reps and Zonal Heads can only create dealers/architects
  if (callerRole === 'rep' || callerRole === 'zonal_head') {
    return accountType === 'dealer' || accountType === 'architect';
  }

  return false;
}
```

---

### **3. Update Admin Permissions in All APIs**

**Pattern to apply in all manager APIs**:
```typescript
// At the start of every manager function
const userDoc = await db.collection('users').doc(userId).get();
const userRole = userDoc.data()?.role;

// Admin override - can see everything
if (userRole === 'admin') {
  // Return all data without filtering
}

// National Head - territory-based filtering
if (userRole === 'national_head') {
  // Current logic
}
```

**Functions to update**:
1. `getUsersList` - Admin sees all users
2. `getUserStats` - Admin can view any user
3. `getTeamStats` - Admin sees all team stats
4. `reviewDSR` - Admin can approve any DSR
5. `getPendingDSRs` - Admin sees all pending DSRs
6. `updateUser` - Admin can edit any user

---

## 🗂️ Firestore Security Rules Updates

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: Check if user is admin
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Helper: Check if user is national head or admin
    function isNationalHeadOrAdmin() {
      let role = get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
      return role == 'national_head' || role == 'admin';
    }

    // Accounts collection
    match /accounts/{accountId} {
      // Anyone authenticated can read
      allow read: if request.auth != null;

      // Create rules by account type
      allow create: if request.auth != null && (
        // Admin can create anything
        isAdmin() ||
        // National Head can create anything
        isNationalHeadOrAdmin() ||
        // Reps can only create dealers/architects
        (request.resource.data.type in ['dealer', 'architect'] &&
         request.resource.data.createdByUserId == request.auth.uid)
      );

      // Update: only creator or admin/national_head
      allow update: if request.auth != null && (
        isAdmin() ||
        isNationalHeadOrAdmin() ||
        resource.data.createdByUserId == request.auth.uid
      );

      // Delete: only admin
      allow delete: if isAdmin();
    }

    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;

      // Only national_head and admin can create users
      allow create: if isNationalHeadOrAdmin();

      // Admin can update anyone, others can only update themselves
      allow update: if isAdmin() ||
                      isNationalHeadOrAdmin() ||
                      request.auth.uid == userId;
    }
  }
}
```

---

## 📋 Implementation Checklist

### Backend
- [ ] Update User type with `primaryDistributorId`
- [ ] Update Account type with `parentDistributorId` and `createdByUserId`
- [ ] Update `createUserByManager` to accept distributor assignment
- [ ] Create `createAccount` Cloud Function
- [ ] Add admin override logic to all manager APIs
- [ ] Update Firestore security rules
- [ ] Deploy all functions

### Mobile
- [ ] Update AddUserScreen with distributor picker
- [ ] Create AddAccountScreen for dealers/architects
- [ ] Create distributor selection modal (reusable)
- [ ] Update UserDetailScreen to show distributor assignment
- [ ] Add "Add Account" to Home screen quick actions
- [ ] Update navigation to include AddAccountScreen
- [ ] Test permissions (rep can't add distributors)

### Testing
- [ ] Test rep creating dealer/architect
- [ ] Test rep cannot create distributor (error handling)
- [ ] Test national head creating all account types
- [ ] Test admin can access everything
- [ ] Test distributor assignment on user creation
- [ ] Test distributor linking (parent-child)
- [ ] Test edit user with distributor change

---

## 🎯 Success Criteria

1. ✅ Sales reps can be assigned to distributors when created
2. ✅ Reps can add dealers and architects in the field
3. ✅ Reps cannot add distributors (permission denied)
4. ✅ National Head can add all account types
5. ✅ Admin has unrestricted access to all features
6. ✅ Distributor-dealer-architect hierarchy is maintained
7. ✅ Proper error messages for permission violations

---

**Last Updated**: October 11, 2025, 5:45 AM IST
**Status**: Design complete - Ready for implementation
