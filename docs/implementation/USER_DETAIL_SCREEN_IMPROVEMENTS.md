# User Detail Screen Improvements

**Last Updated:** November 25, 2024
**Status:** Complete

## Overview

Comprehensive UI/UX improvements to the manager's User Detail screen (`mobile/src/screens/manager/UserDetailScreen.tsx`) to reduce clutter, improve navigation, and add activity tracking.

---

## Changes Summary

### 1. Navigation Bug Fix
**Issue:** "View All Pending" button threw navigation error
**Error:** `The action 'NAVIGATE' with payload {"name":"ManagerTabs",...} was not handled`

**Root Cause:** UserDetailScreen is a Stack-level screen, not inside ManagerTabNavigator. Code was navigating to `'ManagerTabs'` but correct screen name is `'Home'`.

**Fix:** Changed navigation call at line ~589:
```typescript
// Before (wrong)
navigation.navigate('ManagerTabs', { screen: 'ReviewTab', ... });

// After (correct)
navigation.navigate('Home', { screen: 'ReviewTab', ... });
```

---

### 2. Enhanced Edit User Modal
Extended the edit modal to support more fields beyond just phone and territory.

**New Fields:**
- Name
- Phone (existing)
- Territory (existing)
- Assigned Distributor (dropdown picker)
- Active Status (toggle switch)

**Backend Changes (`functions/src/api/users.ts`):**
- Extended `updateUser` endpoint to accept: `name`, `primaryDistributorId`, `isActive`
- Added validation for name (2-100 chars)
- Added validation for distributorId (verifies account exists and is type distributor)

**Files Modified:**
- `functions/src/api/users.ts` - Backend API
- `mobile/src/services/api.ts` - API client types
- `mobile/src/screens/manager/UserDetailScreen.tsx` - Modal UI

---

### 3. iOS Segmented Control → Pill Buttons
Replaced the connected segmented control with separate pill-style buttons.

**Before:**
- Connected gray bar with segments
- Selected segment had white background + gold text

**After:**
- Separate rounded pill buttons with 8px gap
- Unselected: Light gray background (#F0F0F0), gray text
- Selected: Gold background (#C9A961), white text
- More modern appearance

**Styles:**
```typescript
segmentedControl: {
  flexDirection: 'row',
  gap: 8,
  marginBottom: 12,
},
segmentedButton: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 20,
  backgroundColor: '#F0F0F0',
},
segmentedButtonActive: {
  backgroundColor: colors.accent, // Gold
},
segmentedButtonTextActive: {
  color: '#FFFFFF',
},
```

---

### 4. Activity Summary Card
Added a lightweight activity card that shows active days count and navigates to full calendar.

**Display:** "X Active Days (Y%)" with Activity icon and chevron arrow

**Behavior:** Tapping navigates to `AttendanceHistoryScreen` with userId param

**Calculation Logic:**
- Extracts unique dates from visits, sheets, and expenses records
- Calculates percentage based on days in selected time range
- No additional API calls (uses existing stats data)

**Files Modified:**
- `mobile/src/screens/manager/UserDetailScreen.tsx` - Added card + `getActiveDays()` function
- `mobile/src/screens/AttendanceHistoryScreen.tsx` - Now accepts optional `userId` and `userName` params
- `mobile/src/navigation/RootNavigator.tsx` - Updated route params type

---

### 5. Header Declutter
Moved action buttons to header to reduce visual clutter.

**Before:**
```
┌─────────────────────────────────────────┐
│ Kunal TEST                    [Target]  │
│ Sales Rep • yamunanagar                 │
├─────────────────────────────────────────┤
│ [    📝 Edit User Details    ]          │  ← Large button (removed)
├─────────────────────────────────────────┤
│ [Time picker...]                        │
```

**After:**
```
┌─────────────────────────────────────────┐
│ [←] Kunal TEST               [✎]  [⊕]  │
│     Sales Rep • yamunanagar             │
├─────────────────────────────────────────┤
│ [Time picker...]                        │  ← Content moves up
```

**Changes:**
- Added back arrow button (left)
- Name + subtitle (center)
- Edit icon button (pencil) - opens edit modal
- Target icon button - navigates to SetTarget
- Removed large "Edit User Details" button below header
- Icon buttons: 40x40 circles with semi-transparent background

---

### 6. Spacing Improvements
Tightened overall spacing for cleaner look.

**Changes:**
- Content top padding: 12px (reduced from screenPadding ~20px)
- Time picker to activity card gap: 12px
- Activity card padding: 14px
- Activity card bottom margin: 12px

---

## Files Modified

| File | Changes |
|------|---------|
| `mobile/src/screens/manager/UserDetailScreen.tsx` | Header restructure, edit modal, activity card, pill buttons, spacing |
| `mobile/src/screens/AttendanceHistoryScreen.tsx` | Accept userId/userName params for viewing other users |
| `mobile/src/navigation/RootNavigator.tsx` | AttendanceHistory route params |
| `mobile/src/screens/manager/ReviewHomeScreen.tsx` | Accept filterUserName from navigation params |
| `mobile/src/components/DetailedStatsView.tsx` | Added onViewPending callback |
| `functions/src/api/users.ts` | Extended updateUser with name, distributorId, isActive |
| `mobile/src/services/api.ts` | Updated updateUser types |

---

## Other Fixes (Same Session)

### processOutboxEvents Scheduler Fix
**Issue:** Firebase deploy failed for `processOutboxEvents` function
**Error:** "Schedule or time zone is invalid"

**Root Cause:** Cron expression `*/30 * * * * *` (6 fields with seconds) not supported by Cloud Scheduler. Minimum granularity is 1 minute.

**Fix:** Changed to `* * * * *` (every minute) in `functions/src/scheduled/outboxProcessor.ts`

---

## Testing Checklist

- [x] Header shows back, name, edit icon, target icon
- [x] Edit icon opens edit modal with all fields
- [x] Target icon navigates to SetTarget screen
- [x] Pill buttons switch time ranges correctly
- [x] Custom date picker still works
- [x] Activity card shows correct count and percentage
- [x] Tapping activity card opens full calendar for that user
- [x] "View All Pending" navigates to Review tab correctly
- [x] AttendanceHistoryScreen works for both self and other users
- [x] Firebase functions deployed successfully
