# October 25 Changes - Testing Checklist

**Date**: October 25, 2025
**Changes Made**: Performance optimizations, security fixes, UI updates
**Device**: Android phone
**Build**: Development build

---

## 🎯 WHAT WE CHANGED TODAY

### Performance Optimizations (Morning)
1. ✅ LogVisitScreen now uses direct account lookup (faster edit mode)
2. ✅ Visits query now has timestamp filter (less data transferred)
3. ✅ FlatList → FlashList in 3 screens (smoother scrolling)
4. ✅ Optimistic updates for visit logging (instant submission)
5. ✅ Background photo upload queue

### UI/UX Updates
1. ✅ SelectAccountScreen uses new compact card design
2. ✅ "Artis" renamed to "Artis 1MM" everywhere
3. ✅ Role restrictions in AddUserScreen (national_head can't add admin)
4. ✅ Photo label changed from "Optional" to required (red asterisk)

### Backend/Security Fixes (Afternoon)
1. ✅ Photo validation re-enabled in backend
2. ✅ Dangerous functions removed (deleteAllAccounts, seedAccounts, etc.)
3. ✅ Admin gatekeeping added to createUser
4. ✅ Console logs cleaned (169 → 17)

---

## 📋 TESTING PRIORITY ORDER

### **TEST 1: Visit Logging with Optimistic Updates** ⭐ CRITICAL

**What Changed**:
- Background photo upload
- Instant navigation (no waiting 5-30 seconds)
- "Syncing..." indicator

**Steps**:
1. [ ] Go to Home → Activities → Log Visit
2. [ ] Select any account
3. [ ] Take a photo with camera
4. [ ] Select purpose (e.g., "Follow Up")
5. [ ] Add optional notes
6. [ ] Tap "Submit"

**Expected**:
- ✅ Should navigate away **INSTANTLY** (no 5-30 second wait!)
- ✅ Should see "Syncing 1 item..." badge at bottom of screen
- ✅ Badge should disappear after 10-20 seconds (upload complete)
- ✅ Visit should appear in activity list after sync

**If It Fails**:
- Check console logs for upload errors
- Verify "Syncing..." badge appears
- Check if visit is actually created in backend

---

### **TEST 2: Photo Validation (Backend Now Enforces)** ⭐ CRITICAL

**What Changed**: Backend now REQUIRES photo (was commented out before)

**Steps**:
1. [ ] Try to submit visit WITHOUT taking photo

**Expected**:
- ✅ Mobile should block with: "Please take a photo of the counter"
- ✅ If somehow bypassing mobile, backend should return error

**Why This Matters**: Photo is V1 requirement - must be enforced

---

### **TEST 3: Edit Visit Performance** ⭐ HIGH

**What Changed**: Now uses direct account lookup instead of fetching all accounts

**Steps**:
1. [ ] Go to any existing visit
2. [ ] Tap to edit
3. [ ] Wait for screen to load

**Expected**:
- ✅ Should load in 1-2 seconds (was 5-8 seconds before)
- ✅ Account details should populate correctly
- ✅ Photo should display
- ✅ Can edit and save

---

### **TEST 4: Scrolling Performance (FlashList)** ⭐ MEDIUM

**What Changed**: Replaced FlatList with FlashList in 3 screens

**Screens to Test**:
1. [ ] **Team Screen** (Manager → Team tab)
   - Scroll through user list
   - Should be smooth, no jank

2. [ ] **User List Screen** (Manager → user management)
   - Scroll through users
   - Should be 60 FPS smooth

3. [ ] **Select Account Screen** (Log Visit → Select Account)
   - Scroll through accounts
   - Should be smooth with 50+ accounts

**Expected**:
- ✅ Butter-smooth scrolling
- ✅ No stuttering or frame drops
- ✅ Instant rendering

---

### **TEST 5: "Artis 1MM" Catalog Display** ⭐ MEDIUM

**What Changed**: Renamed "Artis" to "Artis 1MM"

**Screens to Check**:
1. [ ] **Sheets Entry**: Tap "Log Sheets" → Should see "Artis 1MM" button
2. [ ] **Stats Screen**: View monthly stats → Sheets breakdown should show "Artis 1MM"
3. [ ] **DSR Screen**: View today's DSR → Should show "Artis 1MM"
4. [ ] **Set Target Screen** (Manager): Should have "Artis 1MM" option

**Expected**:
- ✅ All displays show "Artis 1MM"
- ✅ Old data still displays correctly (display mapper handles it)
- ✅ New entries saved as "Artis 1MM"

---

### **TEST 6: Role Restrictions in Add User** ⭐ MEDIUM

**What Changed**: National head can't add admin or national_head anymore

**Steps** (requires logging in as national_head):
1. [ ] Log in as national_head role
2. [ ] Go to Team → Add User (+ button)
3. [ ] Look at role options

**Expected**:
- ✅ Should only see: Sales Rep, Area Manager, Zonal Head
- ✅ Should NOT see: National Head, Admin

**Test as Admin** (if you have admin account):
- ✅ Admin should see all 5 roles

---

### **TEST 7: SelectAccountScreen New Design** ⭐ LOW

**What Changed**: Account cards redesigned to match manager accounts page

**Steps**:
1. [ ] Go to Log Visit → Select Account
2. [ ] Look at account cards

**Expected**:
- ✅ 2-row compact layout
- ✅ Name on top row with Edit button
- ✅ Colored badge (blue/green/orange/purple) on bottom row
- ✅ Location shows as "City, ST" (2-letter state)
- ✅ No more contact person or last visit date

---

### **TEST 8: Offline Sync (Background Upload)** ⭐ CRITICAL

**What Changed**: New upload queue with offline support

**Steps**:
1. [ ] Log a visit with photo
2. [ ] Navigate away immediately (should be instant)
3. [ ] Turn on Airplane Mode before photo finishes uploading
4. [ ] Check if "Syncing..." badge persists
5. [ ] Turn off Airplane Mode
6. [ ] Wait and watch

**Expected**:
- ✅ Visit submits instantly even offline
- ✅ "Syncing..." badge shows
- ✅ When back online, upload completes automatically
- ✅ Badge disappears when done
- ✅ Visit appears in backend

---

### **TEST 9: General App Stability** ⭐ MEDIUM

**What Changed**: Console log cleanup (169 statements removed)

**Steps**:
1. [ ] Navigate through all main screens:
   - Home
   - Stats
   - Activities
   - Documents
   - Profile (Me tab)
2. [ ] Manager screens (if national_head):
   - Dashboard
   - Team
   - Accounts
   - Review

**Expected**:
- ✅ No crashes
- ✅ No blank screens
- ✅ All data loads correctly
- ✅ No error messages

**Check Console/Logcat**:
- ✅ Should see fewer logs in development
- ✅ Error logs should still appear (we kept those)
- ✅ No "undefined" or "null" errors

---

## 🧪 TESTING NOTES

### If Something Breaks:

**Visit submission doesn't work**:
- Check console for upload queue errors
- Verify photo validation isn't blocking incorrectly
- Check backend logs

**Scrolling is choppy**:
- FlashList might need estimatedItemSize tuning
- Report which screen

**"Artis 1MM" not showing**:
- Might be old cached data
- Pull to refresh
- Clear app data and re-login

**App crashes on certain screen**:
- Note which screen
- Check console error
- Probably a logger import issue in that file

---

## ✅ QUICK TEST (5 Minutes)

If you just want to verify nothing broke:

1. [ ] Login
2. [ ] Check-in
3. [ ] Log one visit with photo (test optimistic update!)
4. [ ] Log sheets for "Artis 1MM" (test catalog rename!)
5. [ ] Check stats
6. [ ] Check-out

If all 6 steps work, app is stable! ✅

---

## 🎯 FOCUS TESTING PRIORITIES

**Priority 1** (Must test):
- Visit logging with photo (optimistic updates)
- Photo validation enforcement
- Edit visit performance

**Priority 2** (Should test):
- Scrolling performance (FlashList)
- "Artis 1MM" catalog displays
- Offline sync with upload queue

**Priority 3** (Nice to test):
- Role restrictions
- SelectAccountScreen design
- General stability

---

## 📊 EXPECTED IMPROVEMENTS

| What | Before | After | Test This |
|------|--------|-------|-----------|
| Visit submission | 5-30s wait | Instant! | ✅ Priority 1 |
| Edit visit load | 5-8s | 1-2s | ✅ Priority 1 |
| List scrolling | 30-45 FPS | 55-60 FPS | ✅ Priority 2 |
| Catalog name | "Artis" | "Artis 1MM" | ✅ Priority 2 |

---

## 🐛 BUG TRACKING

If you find bugs, note:
- **Screen**: Which screen/flow
- **Steps**: How to reproduce
- **Expected**: What should happen
- **Actual**: What actually happened
- **Severity**: Critical/High/Medium/Low

Report back and I'll fix! 🚀

---

**Start with the Quick Test (5 min) to verify nothing broke, then dive into Priority 1 testing!**