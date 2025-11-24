# Session Changes - November 24, 2025

**Single Source of Truth** for all changes made during this development session.

---

## Overview

This session focused on:
1. Fixing pending sections date sorting in Stats page
2. Removing unused attendance query from backend
3. **Complete DSR functionality removal** (code, database, functions)
4. Cleanup for V1 launch - sales rep focused

---

## 1. Pending Sections Date Sorting (Fixed)

### Problem
Pending sheets and expenses in Stats page were NOT sorted by date - showed in arbitrary order.

### Root Cause
Backend queries in `getUserStats` had no `.orderBy()` clause for `sheetsSales` and `expenses`.

### Fix Applied
**File:** `functions/src/api/users.ts`

```typescript
// Before (no order):
db.collection("sheetsSales")
  .where("userId", "==", userId)
  .where("date", ">=", startDate)
  .where("date", "<=", endDate)
  .get()

// After (date descending - latest first):
db.collection("sheetsSales")
  .where("userId", "==", userId)
  .where("date", ">=", startDate)
  .where("date", "<=", endDate)
  .orderBy("date", "desc")  // Added
  .get()
```

Same fix applied to `expenses` query.

---

## 2. Attendance Query Removed

### Reason
Attendance feature is **disabled for V1** (see ADR 005). The query was running but returning unused data.

### Change
Removed the attendance Firestore query from `getUserStats`:
- Now returns empty array without hitting Firestore
- Reduces query cost and latency

---

## 3. DSR Functionality Completely Removed

### Decision
DSR (Daily Sales Report) functionality removed in favor of simpler **individual item approval** flow.

### What Was Removed

#### Backend (Cloud Functions) - 7 functions deleted:
| Function | Purpose |
|----------|---------|
| `compileDSRReports` | Scheduled daily DSR compilation |
| `reviewDSR` | Manager approve/reject DSR |
| `getPendingDSRs` | List pending DSRs |
| `getDSRDetail` | Get single DSR detail |
| `resubmitDSR` | Rep resubmit rejected DSR |
| `triggerDSRCompiler` | Manual DSR trigger (debug) |
| `checkPendingDSRs` | Check pending DSRs (debug) |

#### Backend Source Files Deleted:
- `functions/src/scheduled/dsrCompiler.ts`
- `functions/src/api/dsrReview.ts`
- `functions/src/api/resubmitDSR.ts`
- `functions/src/utils/trigger-dsr.ts`
- `functions/src/utils/check-pending-dsrs.ts`

#### Mobile Screens Deleted:
- `mobile/src/screens/manager/DSRApprovalDetailScreen.tsx`
- `mobile/src/screens/manager/ReviewHomeScreen.tsx`

#### Mobile Updates:
- `RootNavigator.tsx` - Removed DSRApprovalDetail route
- `ManagerTabNavigator.tsx` - Review tab now shows placeholder
- `api.ts` - Removed 4 DSR API methods
- `types/index.ts` - Removed DSR types
- `ManagerHomeScreen.tsx` - Removed DSR alert, updated pending count

#### Database:
- Removed 5 `dsrReports` indexes from `firestore.indexes.json`
- Removed `dsrReports` security rules from `firestore.rules`
- **Deleted** `dsrReports` Firestore collection

---

## 4. Expense Format Clarification

**Corrected understanding:**
- **OLD format**: Multi-item (`items[]` array) - more complex
- **NEW format**: Single item per log - simpler, streamlined

This is the RIGHT approach for field sales:
- Faster entry (one form, done)
- Better approval granularity (approve/reject each individually)
- Clearer data ("₹500 travel" vs "₹700 expense - what's in it?")

---

## 5. Current Status: Sales Rep Dashboard

### What's Complete (V1 Ready):
| Feature | Status | Notes |
|---------|--------|-------|
| HomeScreen KPI cards | ✅ | Visits, Sheets, Expenses |
| Recent activity feed | ✅ | Shows all activity types |
| Activity detail modal | ✅ | View, Edit, Delete actions |
| Visit logging | ✅ | With photo upload |
| Sheets sales logging | ✅ | Single catalog per entry |
| Expense logging | ✅ | Single category per entry |
| Stats page | ✅ | Monthly stats, pending sections |
| Profile page | ✅ | Basic profile |
| Attendance | ⏸️ | Disabled for V1 (feature flag) |

### What's Missing/To Review:

1. **Photo viewing in activity logs** - Currently NO photos shown when viewing activity
2. **Edit flow for visits** - Need to test edit with photo changes
3. **Delete confirmation** - Verify delete works properly
4. **Offline support** - Test offline logging and sync
5. **Pull-to-refresh** - Verify all screens refresh properly
6. **Error states** - What happens on network errors?

---

## 6. Next Steps: Manager Dashboard

### Current State:
- Review tab shows "Coming Soon" placeholder
- Home shows team stats (pending count now excludes DSRs)

### To Build:
New **Individual Approval Flow** for managers:
- Log-style cards (same as HomeScreen recent activity)
- Swipe or button actions for approve/reject
- Filters: by date, user, type (expense/sheets)
- Show pending sheets needing verification
- Show pending expenses needing approval

### Screens Needed:
1. `ReviewHomeScreen` (new) - List of pending items
2. `ApprovalDetailScreen` (new) - Individual item detail with approve/reject

---

## 7. Files Modified Summary

### Backend (functions/)
| File | Change |
|------|--------|
| `src/api/users.ts` | Added orderBy, removed attendance query |
| `src/index.ts` | Removed DSR exports |
| `src/types/index.ts` | Removed DSR types |

### Mobile (mobile/src/)
| File | Change |
|------|--------|
| `navigation/RootNavigator.tsx` | Removed DSR route |
| `navigation/ManagerTabNavigator.tsx` | Review tab placeholder |
| `services/api.ts` | Removed DSR methods |
| `types/index.ts` | Removed DSR types |
| `screens/manager/ManagerHomeScreen.tsx` | Removed DSR alert |

### Config
| File | Change |
|------|--------|
| `firestore.indexes.json` | Removed 5 dsrReports indexes |
| `firestore.rules` | Removed dsrReports rules |

---

## 8. Testing Checklist - Sales Rep

### HomeScreen
- [ ] KPI cards show correct counts for today
- [ ] Recent activity shows visits, sheets, expenses
- [ ] Tapping activity opens detail modal
- [ ] Edit navigates to correct edit screen
- [ ] Delete removes item (with confirmation)
- [ ] Quick action buttons work (Visit, Sheets, Expense)
- [ ] Pull-to-refresh updates data

### Visit Logging
- [ ] Select account works
- [ ] Photo capture/upload works
- [ ] Purpose selection works
- [ ] Notes can be added
- [ ] Submit creates visit
- [ ] Edit existing visit works
- [ ] Photos can be changed during edit

### Sheets Sales
- [ ] Catalog selection works
- [ ] Sheet count input works
- [ ] Submit creates entry
- [ ] Shows as "Pending" in activity
- [ ] Edit works (only while pending)

### Expenses
- [ ] Category selection works
- [ ] Amount input works
- [ ] Description works
- [ ] Receipt photo upload works
- [ ] Submit creates entry
- [ ] Shows as "Pending" in activity
- [ ] Edit works (only while pending)

### Stats Page
- [ ] Monthly stats load correctly
- [ ] KPI cards match HomeScreen style
- [ ] Pending sections show items (sorted by date DESC)
- [ ] Month navigation works
- [ ] Calendar button opens Activity History
- [ ] Pull-to-refresh works

### Profile Page
- [ ] Shows user info
- [ ] Logout works

---

## 9. Known Issues

1. **processOutboxEvents scheduler error** - Pre-existing, unrelated to DSR removal
2. **Photos not shown in activity logs** - Feature gap, not a bug
3. **Firebase deprecation warnings** - Should migrate to modular API fully

---

## 10. Additional Features Added

### 10.1 Duplicate Phone Number Check (Accounts)

**Backend:** `functions/src/api/accounts.ts`
- Added validation in `createAccount`: Checks if phone already exists
- Added validation in `updateAccount`: Checks if changed phone already exists (excluding current account)
- Returns error with existing account name: "An account with this phone number already exists: [Name]"
- HTTP 409 Conflict response code

### 10.2 User-Created Accounts Sorted First (SelectAccountScreen)

**File:** `mobile/src/screens/visits/SelectAccountScreen.tsx`
- Modified `filteredAccounts` useMemo to sort by `createdByUserId`
- User's created accounts appear first in all filters
- Within each group (user's vs others), sorted alphabetically by name

### 10.3 Photo Viewing for Editable Visits

**File:** `mobile/src/screens/HomeScreen_v2.tsx`
- Added `photos` field to activity type definition
- Store `data.photos` when building visit activities
- Added "View Photos" button in activity detail modal:
  - Only shown for visits within 48hr edit window
  - Only shown if visit has photos
- Added photo viewing modal with:
  - Full-screen dark overlay
  - Photo counter (1 of N)
  - Navigation arrows for multiple photos
  - Close button

**UX Decision:** Photos only viewable for editable visits (48hr window). Older visits don't show photo option to keep UI fast and simple.

### 10.4 Inline Editing in Bottom Sheet Modal

**File:** `mobile/src/screens/HomeScreen_v2.tsx`

Replaced full-screen edit navigation with tap-to-edit inline editing in the activity detail modal:

#### Sheets Sales
- Tap sheet count to edit inline
- Input field with Save/Cancel buttons
- Validates positive integer
- Calls `api.updateSheetsSale()`
- No separate Edit button needed

#### Expenses
- Tap amount (₹) to edit inline
- Input field with Save/Cancel buttons
- Validates positive integer
- Calls `api.updateExpense()`
- No separate Edit button needed

#### Visits
- Tap notes to edit inline (multiline input)
- "Change Photos" button navigates to full LogVisit screen (photos require camera UI)
- Keeps Delete button

**Benefits:**
- Faster edits (no screen transition)
- Better UX for single-field changes
- Photos still use full screen (camera/gallery picker needs it)

### 10.5 Backend APIs Updated for Partial Updates

**Files Modified:**
- `functions/src/api/visits.ts` - `updateVisit` now accepts partial updates (only `id` required)
- `functions/src/api/sheetsSales.ts` - `updateSheetsSale` accepts partial updates (count OR catalog)
- `functions/src/api/expenses.ts` - `updateExpense` supports two modes:
  - Full update: `{ id, date, items[] }`
  - Partial update: `{ id, amount?, category?, description? }`

**Mobile API Types Updated:**
- `mobile/src/services/api.ts` - Updated type signatures for partial updates

### 10.6 SelectAccountScreen User ID Fix

**Problem:** `user?.uid` returned `undefined` because Firebase User object's `uid` is a getter that doesn't spread properly.

**Fix:** Use `getAuth().currentUser?.uid` directly instead of spreading the user object.

**File:** `mobile/src/screens/visits/SelectAccountScreen.tsx`

### 10.7 Catalog/Category Chip Editing

**File:** `mobile/src/screens/HomeScreen_v2.tsx`

Added inline chip buttons for changing catalog (sheets) and category (expenses):
- Sheets: Row of chips for Fine Decor, Artvio, Woodrica, Artis 1MM
- Expenses: Row of chips for Travel, Food, Accommodation, Other
- Tap to select, auto-saves immediately
- Visual feedback: selected chip highlighted with feature color

---

**Last Updated:** November 24, 2025
**Session Duration:** ~5 hours
