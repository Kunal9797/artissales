# Activity Feed Refactor & DSR Removal

**Date Started**: November 22, 2025
**Status**: 🔄 In Progress (~70% Complete)
**Type**: Major Feature Refactor

---

## V1 Simplified Model

### Core Philosophy
Everything is a **single log item** - no batching, no daily reports. Keep it simple.

| Activity Type | What's Logged | Needs Approval? | Approver Action |
|---------------|---------------|-----------------|-----------------|
| Visit | 1 account + notes + photo | No | Just viewable |
| Sheets Sales | 1 catalog + sheet count | Yes | Verify / Reject |
| Expense | 1 category + amount + receipt | Yes | Verify / Reject |

### Logging Rules (ONE item at a time)
- **Visit**: Log one visit per account
- **Sheets**: Log one catalog + count (not multiple catalogs)
- **Expense**: Log one category + amount (not multiple categories)
- If user needs to log more, they submit again (quick flow)

### Approval States
```
pending → verified (manager approved)
pending → rejected (user creates new if needed)
```

### Edit Rules
| Status | Can Rep Edit? |
|--------|---------------|
| Pending | ✅ Yes |
| Verified | ❌ No (locked) |
| Rejected | ❌ No (create new instead) |

### What's NOT in V1
- ❌ Attendance tracking (disabled via feature flag)
- ❌ DSR compilation (removed)
- ❌ Edit & resubmit flow (just create new)
- ❌ "needs_revision" status (just approve/reject)

---

## Executive Summary

Converting the Sales Rep HomeScreen from "Today's Activities" (single-day view) to "Activity Feed" (paginated historical view). Simultaneously removing DSR (Daily Sales Report) functionality entirely in favor of inline item-level approval.

### Key Changes
1. **Activity Feed**: Show last 30-100 activities (not just today)
2. **Pagination**: Load 30 items initially, "Load More" for next batch
3. **Date Display**: Show "PAST" badge for older items, relative time for today
4. **Remove DSR**: Delete DSR screens, hooks, and backend compiler
5. **Simplified Approvals**: Verify/reject individual items instead of daily reports
6. **One Item Per Log**: Simplify logging to one catalog/category per submission

---

## Motivation

### Why Remove DSR?
1. **Redundant**: DSR compiled data from visits/sheets/expenses - but managers can approve items individually
2. **Complex Workflow**: "needs_revision" state added unnecessary complexity
3. **Not Field-Friendly**: Reps log activities throughout the day, not in batch at end-of-day
4. **Simplification**: Focus on core workflow - log activity → manager verifies/rejects

### Why Activity Feed?
1. **User Request**: "Show past 50-100 entries, not just today"
2. **Better UX**: Reps can see their activity history in one place
3. **Edit Access**: Easily find and edit recent items (if still pending)
4. **Context**: See patterns over time, not just daily snapshots

### Why One Item Per Log?
1. **Simpler Flow**: Log quickly, don't need complex multi-select UI
2. **Easier Review**: Manager sees one item = one decision
3. **Faster Entry**: User can log multiple quickly by repeating
4. **Cleaner Data**: Each log is atomic and self-contained

---

## Implementation Progress

### ✅ Phase 1: Attendance Error Fix (COMPLETED)
**File**: `mobile/src/screens/HomeScreen_v2.tsx`

**Problem**: When `ATTENDANCE_FEATURE_ENABLED = false`, the code tried to call `.forEach()` on a plain object.

**Fix** (Line ~287):
```typescript
// BEFORE (broken):
attendanceSnapshot.forEach((doc: any) => { ... });

// AFTER (fixed):
if (ATTENDANCE_FEATURE_ENABLED && attendanceSnapshot?.docs) {
  attendanceSnapshot.docs.forEach((doc: any) => { ... });
}
```

---

### ✅ Phase 2: Remove DSR Screens & Navigation (COMPLETED)

**Files Deleted**:
- `mobile/src/screens/dsr/DSRListScreen.tsx`
- `mobile/src/screens/dsr/DSRScreen.tsx`
- `mobile/src/hooks/useDSR.ts`

**Files Modified**:
- `mobile/src/navigation/RootNavigator.tsx`:
  - Removed imports for DSRScreen, DSRListScreen
  - Removed `DSR` and `DSRList` from RootStackParamList
  - Removed Stack.Screen registrations for DSR routes

**Routes Removed**:
```typescript
// REMOVED from RootStackParamList:
DSR: { date?: string };
DSRList: undefined;

// REMOVED from Stack.Navigator:
<Stack.Screen name="DSR" component={DSRScreen} />
<Stack.Screen name="DSRList" component={DSRListScreen} />
```

---

### ✅ Phase 3: Activity Feed Conversion (COMPLETED & VERIFIED)
**File**: `mobile/src/screens/HomeScreen_v2.tsx`
**Status**: ✅ Working (tested Nov 22, 2025)

#### 3.1 New Pagination State
```typescript
const [lastVisibleVisit, setLastVisibleVisit] = useState<any>(null);
const [lastVisibleSheet, setLastVisibleSheet] = useState<any>(null);
const [lastVisibleExpense, setLastVisibleExpense] = useState<any>(null);
const [hasMore, setHasMore] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);
```

#### 3.2 Query Pattern
```typescript
// Visits: userId + timestamp (desc)
// Sheets: userId + createdAt (desc)
// Expenses: userId + createdAt (desc)
```

#### 3.3 Firestore Indexes Added
**File**: `firestore.indexes.json`

Added two new indexes for Activity Feed pagination:
```json
{
  "collectionGroup": "sheetsSales",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "expenses",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Why `createdAt` not `date`?**
- `date` is YYYY-MM-DD string (day-level granularity)
- `createdAt` is Timestamp (exact time ordering)
- Activity Feed shows "2h ago" - needs exact timestamps for proper sorting

---

### ✅ Phase 4: Status Icons (COMPLETED)

**Goal**: Show approval status on each activity item using icons (not text badges)

**Implementation**:

1. **Activity Type with Status**:
```typescript
type: 'visit' | 'sheets' | 'expense';
status?: 'pending' | 'verified' | 'rejected'; // Only for sheets/expenses
```

2. **Fetch Status with Data**:
```typescript
// Sheets: verified field
status: data.verified ? 'verified' : 'pending',

// Expenses: status field (supports 'approved' as alias for 'verified')
status: data.status, // 'pending' | 'verified' | 'approved' | 'rejected'
```

3. **Status Icons**:
| Status | Icon | Color |
|--------|------|-------|
| pending | Clock (Lucide) | #F9A825 (Yellow) |
| verified/approved | CheckCircle (Lucide) | #2E7D32 (Green) |
| rejected | ✕ text in circle | #C62828 (Red) |

---

### ✅ Phase 5: Conditional Edit Buttons (COMPLETED)

**Goal**: Only show edit button for items that can still be edited

**Logic**:
```typescript
// Visits: editable if logged today
// Sheets/Expenses: editable only if status === 'pending'
const canEdit = activity.type === 'visit'
  ? isToday
  : (activity.type === 'sheets' || activity.type === 'expense')
    ? activity.status === 'pending'
    : false;
```

**UI Layout**:
- **Visits (today)**: Edit button only, no status icon
- **Visits (older)**: No button, no icon
- **Pending sheets/expenses**: Edit button + status icon below it
- **Approved/Rejected sheets/expenses**: Status icon only (no edit button)

---

### ⏳ Phase 6: Simplify Logging Forms (PLANNED)

**Goal**: One item per log submission

**Files to Modify**:
- `mobile/src/screens/sheets/LogSheetsScreen.tsx` - Remove multi-catalog selection
- `mobile/src/screens/expenses/LogExpenseScreen.tsx` - Remove multi-category selection

**Before**:
```
User selects: Fine Decor (10), Artvio (5), Woodrica (3)
→ Creates 1 document with array of catalogs
```

**After**:
```
User selects: Fine Decor, enters count: 10
→ Creates 1 document with 1 catalog
→ User can quickly log again for next catalog
```

---

### ⏳ Phase 7: Update Manager Screens (LATER - after rep side is solid)

**Goal**: Replace DSR approval with individual item approval

**Manager Home Layout**:
```
┌─────────────────────────────────────┐
│  Pending Sheets (12)                │
│  ├── Rep A - Fine Decor - 10 sheets │
│  ├── Rep B - Artvio - 5 sheets      │
│  └── [Load More]                    │
├─────────────────────────────────────┤
│  Pending Expenses (8)               │
│  ├── Rep A - Travel - ₹500          │
│  ├── Rep C - Food - ₹200            │
│  └── [Load More]                    │
└─────────────────────────────────────┘
```

**Actions**: Tap item → Verify / Reject (with optional comment)

---

### ⏳ Phase 8: Remove Backend DSR Function (LATER)

**File to Delete**:
- `functions/src/scheduled/dsrCompiler.ts`

**Files to Modify**:
- `functions/src/index.ts` - Remove dsrCompiler export

**Note**: Keep `dsrReports` collection in Firestore (historical data), just stop writing new ones.

---

### ⏳ Phase 9: Update TypeScript Types (LATER)

**File**: `functions/src/types/index.ts`

**Changes**:
1. Remove `DSRStatus` type
2. Simplify status types:
```typescript
// Unified status for sheets and expenses
export type ApprovalStatus = 'pending' | 'verified' | 'rejected';
```

---

## Current Focus: Sales Rep Side

**Priority Order**:
1. ✅ Activity Feed works (DONE)
2. ✅ Status icons on activity items (DONE)
3. ✅ Tap-to-edit bottom sheet (DONE)
4. ✅ Compact card design (DONE)
5. ✅ Polish header & homepage UX (DONE)
6. ✅ Simplify logging forms - one item per log (DONE)
7. ✅ Delete button in action sheet (DONE)

**Manager side comes AFTER rep side is solid and tested.**

---

## ✅ Phase 6: Compact Card Design (COMPLETED Nov 22)

### Card Layout Evolution
**Before (verbose):**
```
[Icon Box] 567 sheets          [edit] [clock]
           Woodrica • 42m
```

**After (compact single-row):**
```
📄 567 • Woodrica • 1h    ⏱️
```

### Changes Made:
1. **Icons** - No background, larger size (24px), just colored icons
2. **Single-row layout** - Value • Detail • Time all on one line
3. **Removed redundancy**:
   - No "sheets" text (icon shows type)
   - No ₹ sign (icon shows it's expense)
   - No visit reason/purpose (just account name)
4. **Tap-to-edit** - Cards are tappable, opens bottom sheet with:
   - Full details (value, detail)
   - Status badge (Pending Review / Verified / Rejected)
   - Timestamp
   - Edit button (if editable)
5. **Font sizes** - Value: 17px, Detail: 15px, Time: 13px

---

## ✅ Phase 7: Homepage Header Redesign (COMPLETED Nov 22)

### Before:
```
☀️ Good afternoon, Kunal!
Have a productive day!          [small logo]
```

### After (Minimal Design):
```
☀️ Welcome, Kunal              [Artis Logo 48px]
```

### Changes Made:
1. **Removed verbose greeting** - No more "Good afternoon" + subtitle
2. **Welcome text** - Simple "Welcome, Name" with time-of-day icon
3. **Larger logo** - Artis logo increased from 32px to 48px
4. **Faded branding** - Logo at 35% opacity, subtle but visible
5. **Compact height** - Minimal padding (paddingTop: 50, paddingBottom: 12)

### Additional UX Changes:
- **KPI cards as filters** - Tap visits/sheets/expenses KPI card to filter activity feed
- **No "Today" label** - Anything above "Earlier" separator is today
- **Visit edit window** - Extended from "today only" to 48 hours

---

## ✅ Phase 8: Simplified Logging Forms (COMPLETED Nov 22)

### Goal
One item per log submission for faster, cleaner workflow.

### Sheets (`CompactSheetsEntryScreen.tsx`)
**Before:** Add entries to local array → click "Send for Approval" → batch submit
**After:** Select catalog → enter count → click "Log Sheets" → done

### Expenses (`ExpenseEntryScreen.tsx`)
**Before:** Add items one by one → view items list → batch submit
**After:** Select category → enter amount → click "Log Expense" → done

### Flow:
1. Tap action from Home → form opens
2. Fill single item
3. Submit → saves → back to Home
4. Want more? Tap action again

---

## ✅ Phase 9: Delete from Action Sheet (COMPLETED Nov 22)

### Goal
Allow reps to delete their own activities (if still editable).

### Implementation:
- Delete button appears alongside Edit button in action sheet
- Only shown for editable items (pending sheets/expenses, visits <48h)
- Shows confirmation alert before deleting
- Removes item from local state immediately
- Calls appropriate API: `deleteVisit`, `deleteSheetsSale`, `deleteExpense`

---

## ✅ Phase 10: UX Polish (COMPLETED Nov 22)

### Changes:
1. **Removed Close button** from action sheet - tap outside to dismiss (standard behavior)
2. **Updated toast** - Pull-to-refresh shows brief "Updated 2:34 PM" pill toast for 2 seconds
3. **Larger numbers** - Sheets/expenses values at 19px (vs 17px for visit account names)

---

## Testing Checklist

### ✅ Activity Feed (VERIFIED Nov 22)
- [x] Initial load shows activities
- [x] Activities sorted by date (newest first)
- [x] Today's items show relative time ("1h")
- [x] Today/Earlier separator working
- [x] Pull-to-refresh resets pagination
- [x] KPI cards work as filters (tap to filter, tap again to show all)
- [x] KPI cards show border highlight when filter active
- [ ] "Load More" fetches next 30 items
- [x] Today's KPI cards show correct counts

### ✅ Status Icons
- [x] Sheets show pending (yellow clock) or verified (green check)
- [x] Expenses show pending/verified/rejected icons
- [x] Visits have no status icon (informational only)

### ✅ Tap-to-Edit/Delete
- [x] Tapping card opens bottom sheet
- [x] Sheet shows full details + status badge
- [x] Edit button shown for editable items (pending sheets/expenses, visits <48h)
- [x] Delete button shown alongside Edit for editable items
- [x] Edit navigates to correct form
- [x] Delete shows confirmation, removes from feed

### ✅ DSR Removal
- [x] DSR routes removed from navigation
- [x] No TypeScript errors about missing screens

---

## Files Modified Summary

### Modified
| File | Changes |
|------|---------|
| `mobile/src/screens/HomeScreen_v2.tsx` | Complete activity feed redesign, pagination, tap-to-edit modal, compact cards |
| `mobile/src/navigation/RootNavigator.tsx` | Removed DSR routes |
| `firestore.indexes.json` | Added userId+createdAt indexes |

### Deleted
| File | Reason |
|------|--------|
| `mobile/src/screens/dsr/DSRListScreen.tsx` | DSR removed |
| `mobile/src/screens/dsr/DSRScreen.tsx` | DSR removed |
| `mobile/src/hooks/useDSR.ts` | DSR removed |

### To Be Modified
| File | Planned Changes |
|------|-----------------|
| `mobile/src/screens/sheets/LogSheetsScreen.tsx` | Single catalog per log |
| `mobile/src/screens/expenses/LogExpenseScreen.tsx` | Single category per log |
| `functions/src/scheduled/dsrCompiler.ts` | DELETE |

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Nov 22, 2025 | Remove DSR entirely | Simplifies workflow, redundant with item-level approval |
| Nov 22, 2025 | Remove "needs_revision" status | Just verify/reject, user creates new if rejected |
| Nov 22, 2025 | Remove attendance for V1 | Focus on core logging, attendance adds complexity |
| Nov 22, 2025 | One item per log | Simpler UI, easier manager review, faster entry |
| Nov 22, 2025 | Visits are informational only | No approval needed, just logged for record |
| Nov 22, 2025 | Can edit until verified/rejected | Gives rep flexibility while pending |
| Nov 22, 2025 | No edit after rejection | Just create new, simpler than resubmit flow |
| Nov 22, 2025 | Use createdAt for ordering | Exact timestamps for proper Activity Feed sorting |
| Nov 22, 2025 | Remove icon backgrounds | Cleaner look, icons already have feature colors |
| Nov 22, 2025 | Single-row card layout | More compact, shows more items on screen |
| Nov 22, 2025 | Tap-to-edit (no visible button) | Cleaner UI, action sheet provides more context |
| Nov 22, 2025 | Remove redundant text | No "sheets"/"₹" - icons indicate type |

---

## Next Steps

**Immediate (This Session)**:
1. [ ] Add notes to action sheet (show visit notes, expense descriptions)
2. [ ] Simplify header design
3. [ ] Final homepage polish

**Next Session**:
4. [ ] Simplify logging forms to one item per log
5. [ ] Test complete rep flow end-to-end
6. [ ] Then move to manager screens

---

**Last Updated**: November 22, 2025
**Author**: Claude Code Assistant
