# Manual Testing Guide - Android Device

**Created**: October 25, 2025
**Device**: Android phone
**Build**: Development build
**Tester**: Kunal (Product Owner)
**Estimated Time**: 3-4 hours for comprehensive testing

---

## 🎯 TESTING OBJECTIVES

1. Verify all October 25 performance optimizations work
2. Test complete sales rep daily workflow
3. Test complete manager oversight workflow
4. Test offline scenarios (critical for field use!)
5. Find and document any bugs before V1 launch

---

## 📱 PRE-TEST SETUP

### Before You Start:
- [ ] Phone fully charged (testing takes 3-4 hours)
- [ ] Good WiFi connection
- [ ] Camera cleaned
- [ ] Location/GPS enabled
- [ ] Notepad ready for bug tracking
- [ ] Current time noted (for attendance testing)

### Test Data Needed:
- [ ] 2-3 test accounts (distributor, dealer, architect)
- [ ] Login as sales rep role
- [ ] Login as national_head/manager role

---

## 🚀 PRIORITY 1: CRITICAL FEATURES (Must Work!)

### **TEST 1: Optimistic Visit Logging** ⭐⭐⭐⭐⭐

**What**: Visit submission should be instant, upload in background

**Steps**:
1. [ ] Go to Home → Activities tab → "Log Visit" button
2. [ ] Select any account
3. [ ] Take photo with camera
4. [ ] Select purpose (e.g., "Follow Up")
5. [ ] Optionally add notes
6. [ ] Tap "Submit" button
7. [ ] **START TIMER** when you tap submit

**Expected Results**:
- ✅ Should navigate away in <500ms (half a second)
- ✅ Should see "Visit logged! Photo uploading in background..." message
- ✅ Should see "Syncing 1 item..." badge appear at bottom
- ✅ Badge should disappear after 10-30 seconds (when upload completes)
- ✅ Visit should appear in Activities list after sync

**If It Fails**:
- Note how long it took to navigate
- Check if you see "Syncing..." badge
- Check console/logcat for errors
- **Report**: "Optimistic update not working - waited X seconds"

**Pass Criteria**: Navigation happens in <1 second ✅

---

### **TEST 2: Photo Validation Enforcement** ⭐⭐⭐⭐⭐

**What**: Cannot submit visit without photo (V1 requirement)

**Steps**:
1. [ ] Go to Log Visit
2. [ ] Select account
3. [ ] Select purpose
4. [ ] **DO NOT** take photo
5. [ ] Tap "Submit"

**Expected Results**:
- ✅ Should show Alert: "Please take a photo of the counter"
- ✅ Should NOT navigate away
- ✅ Form should remain open

**If It Fails**:
- **CRITICAL BUG**: Photo validation not working
- **Report immediately**

**Pass Criteria**: Blocks submission without photo ✅

---

### **TEST 3: Offline Visit Logging** ⭐⭐⭐⭐⭐

**What**: App should work offline and sync when online (core feature!)

**Steps**:
1. [ ] Turn on **Airplane Mode**
2. [ ] Go to Log Visit
3. [ ] Select account, take photo, fill form
4. [ ] Tap "Submit"
5. [ ] Note if it navigates away
6. [ ] Check for "Syncing..." badge
7. [ ] Wait 30 seconds (badge should persist)
8. [ ] Turn off **Airplane Mode**
9. [ ] Wait and watch

**Expected Results**:
- ✅ Should still navigate away instantly (even offline!)
- ✅ "Syncing 1 item..." badge should appear
- ✅ Badge should persist while offline
- ✅ When back online, upload should auto-start
- ✅ Badge should disappear after upload completes
- ✅ Visit should appear in backend

**If It Fails**:
- Note at which step it failed
- Check if queue persisted
- **Report**: "Offline sync issue - [describe what happened]"

**Pass Criteria**: Works offline, syncs automatically when online ✅

---

### **TEST 4: Check-In with GPS** ⭐⭐⭐⭐

**What**: GPS attendance tracking

**Steps**:
1. [ ] Go outside or near window (good GPS signal)
2. [ ] Tap "Check In" on Home screen
3. [ ] Note GPS accuracy shown
4. [ ] Confirm check-in

**Expected Results**:
- ✅ GPS accuracy should be <100m (ideally <50m)
- ✅ Should show location coordinates
- ✅ Should save successfully
- ✅ "Check In" button should change to "Check Out"

**Edge Case - Poor GPS**:
1. [ ] Go indoors (poor GPS signal)
2. [ ] Try to check-in
3. [ ] Expected: Should warn if accuracy >100m but still allow

**Pass Criteria**: Check-in works with good GPS ✅

---

## 📊 PRIORITY 2: FEATURE COMPLETENESS

### **TEST 5: Sheets Sales Entry** ⭐⭐⭐⭐

**What**: Log sheets sold for all catalogs

**Steps**:
1. [ ] Go to Home → Activities tab → "Log Sheets" button
2. [ ] Tap "Fine Decor" → Enter 100 → Confirm
3. [ ] Tap "Artvio" → Enter 50 → Confirm
4. [ ] Tap "Woodrica" → Enter 75 → Confirm
5. [ ] Tap "**Artis 1MM**" → Enter 25 → Confirm ⭐ (verify new name!)
6. [ ] Check today's summary shows all 4 entries

**Expected Results**:
- ✅ All 4 catalog buttons should work
- ✅ **"Artis 1MM"** should be the 4th catalog name (not "Artis")
- ✅ Entries should save immediately
- ✅ Today's total should update
- ✅ Can edit each entry
- ✅ Can delete entries

**Pass Criteria**: All 4 catalogs work, "Artis 1MM" displays correctly ✅

---

### **TEST 6: Stats Page Display** ⭐⭐⭐⭐

**What**: Monthly stats should display correctly with "Artis 1MM"

**Steps**:
1. [ ] Go to Stats tab
2. [ ] Look at attendance, visits, sheets breakdown
3. [ ] Specifically check sheets by catalog section

**Expected Results**:
- ✅ Stats page loads (you said this is fixed now)
- ✅ Should show "**Artis 1MM**" in sheets breakdown (not "Artis")
- ✅ All numbers should display correctly
- ✅ Month navigation works (prev/next)

**Pass Criteria**: Stats load and "Artis 1MM" displays ✅

---

### **TEST 7: Edit Visit Performance** ⭐⭐⭐

**What**: Edit should load faster now (direct account lookup)

**Steps**:
1. [ ] Find any existing visit in Activities list
2. [ ] Tap to edit
3. [ ] **START TIMER** when you tap
4. [ ] Wait for form to load

**Expected Results**:
- ✅ Should load in 1-2 seconds (was 5-8s before)
- ✅ Account details should populate
- ✅ Photo should display
- ✅ Can change purpose/notes
- ✅ Can save changes

**Note**: If you CHANGE the photo, submission will be slow (5-30s) - that's expected! Just changing text should be fast.

**Pass Criteria**: Loads in <2 seconds ✅

---

### **TEST 8: Scrolling Performance (FlashList)** ⭐⭐⭐

**What**: Lists should scroll smoothly now

**Screens to Test**:

**A. Select Account Screen** (when logging visit):
1. [ ] Go to Log Visit → Select Account
2. [ ] Scroll through account list
3. [ ] Scroll fast, scroll slow

**Expected**: Butter-smooth, no stuttering

**B. Team List** (if you're manager):
1. [ ] Go to Team tab
2. [ ] Scroll through users

**Expected**: Smooth scrolling

**C. Account List** (if you're manager):
1. [ ] Go to Accounts tab
2. [ ] Scroll through accounts

**Expected**: Smooth scrolling

**Pass Criteria**: All lists scroll at 60 FPS with no jank ✅

---

## 🔄 PRIORITY 3: OFFLINE SCENARIOS

### **TEST 9: Multiple Items in Queue** ⭐⭐⭐⭐

**What**: Queue multiple uploads offline

**Steps**:
1. [ ] Turn on Airplane Mode
2. [ ] Log 3 visits with photos (quick succession)
3. [ ] Check "Syncing..." badge - should say "Syncing 3 items..."
4. [ ] Turn off Airplane Mode
5. [ ] Watch badge count decrease: 3 → 2 → 1 → 0

**Expected Results**:
- ✅ All 3 visits submit instantly
- ✅ Badge shows correct count
- ✅ All 3 upload when online
- ✅ All 3 appear in backend

**Pass Criteria**: Queue handles multiple items ✅

---

### **TEST 10: App Restart with Pending Queue** ⭐⭐⭐⭐

**What**: Queue survives app restarts

**Steps**:
1. [ ] Turn on Airplane Mode
2. [ ] Log 2 visits with photos
3. [ ] **Close app completely** (swipe away from recent apps)
4. [ ] Wait 30 seconds
5. [ ] Reopen app
6. [ ] Check for "Syncing..." badge
7. [ ] Turn off Airplane Mode

**Expected Results**:
- ✅ Badge should reappear when app opens
- ✅ Should show "Syncing 2 items..."
- ✅ Should auto-sync when online
- ✅ Both visits should save successfully

**Pass Criteria**: Queue persists across app restarts ✅

---

### **TEST 11: Network Interruption Mid-Upload** ⭐⭐⭐

**What**: Handle network loss during upload

**Steps**:
1. [ ] Start logging a visit
2. [ ] Take photo and submit
3. [ ] **Immediately** turn on Airplane Mode (try to catch it mid-upload)
4. [ ] Wait 10 seconds
5. [ ] Turn off Airplane Mode

**Expected Results**:
- ✅ Upload should retry automatically
- ✅ Badge should show upload completing
- ✅ Visit should save successfully

**Pass Criteria**: Handles network interruption gracefully ✅

---

## 🎨 PRIORITY 4: UI/UX VERIFICATION

### **TEST 12: SelectAccountScreen Design** ⭐⭐

**What**: Verify new compact card design

**Steps**:
1. [ ] Go to Log Visit → Select Account
2. [ ] Look at account cards

**Expected Design**:
- ✅ 2-row compact layout
- ✅ Name on top row
- ✅ Edit button on top row (if you created the account)
- ✅ Colored badge on bottom row (blue/green/orange/purple)
- ✅ City, State (2-letter) on bottom row
- ✅ No more contact person or last visit

**Pass Criteria**: Matches new design ✅

---

### **TEST 13: Role Restrictions in Add User** ⭐⭐⭐

**What**: National head can't add admin/national_head

**Steps** (requires national_head login):
1. [ ] Log in as national_head
2. [ ] Go to Team tab → "+" button (Add User)
3. [ ] Look at role options

**Expected**:
- ✅ Should see: Sales Rep, Area Manager, Zonal Head (3 options)
- ✅ Should NOT see: National Head, Admin

**If you have admin account**:
1. [ ] Log in as admin
2. [ ] Go to Add User
3. [ ] Expected: Should see all 5 roles

**Pass Criteria**: Role restrictions enforced correctly ✅

---

## ⚠️ PRIORITY 5: EDGE CASES & ERROR HANDLING

### **TEST 14: Camera Permission Denial** ⭐⭐

**Steps**:
1. [ ] Deny camera permission
2. [ ] Try to log visit
3. [ ] Tap "Take Photo"

**Expected**:
- ✅ Should show permission request
- ✅ If denied, should show error message
- ✅ Should be able to grant permission and retry

---

### **TEST 15: GPS Permission Denial** ⭐⭐

**Steps**:
1. [ ] Deny location permission
2. [ ] Try to check-in

**Expected**:
- ✅ Should show permission request
- ✅ If denied, should show error message
- ✅ Can grant and retry

---

### **TEST 16: Very Large Expense** ⭐⭐

**Steps**:
1. [ ] Go to Log Expense
2. [ ] Add item: Travel, ₹500,000 (5 lakh)
3. [ ] Submit

**Expected**:
- ✅ Should save successfully (no limit currently)
- ⚠️ Or should show warning if limit implemented

---

### **TEST 17: Invalid Inputs** ⭐⭐

**Steps**:
1. [ ] Try to log 0 sheets
2. [ ] Try to add ₹0 expense
3. [ ] Try to check-in twice without check-out

**Expected**:
- ✅ Should show validation errors
- ✅ Error messages should be user-friendly

---

## 👔 PRIORITY 6: MANAGER FLOWS

### **TEST 18: Manager Dashboard** ⭐⭐⭐⭐

**Steps** (requires manager login):
1. [ ] Log in as national_head/manager
2. [ ] View Home dashboard
3. [ ] Check team stats (attendance, visits, sheets)
4. [ ] Change date to view historical data

**Expected**:
- ✅ Stats load quickly (<2 seconds)
- ✅ All numbers accurate
- ✅ Date picker works

---

### **TEST 19: DSR Approval** ⭐⭐⭐⭐

**Steps**:
1. [ ] Go to Review tab
2. [ ] See pending DSRs
3. [ ] Open one DSR
4. [ ] Review details
5. [ ] Approve or reject

**Expected**:
- ✅ Pending list shows correctly
- ✅ DSR details comprehensive
- ✅ Approval/rejection works
- ✅ Status updates immediately

---

### **TEST 20: Add User with Role Restrictions** ⭐⭐⭐

**Steps**:
1. [ ] Team tab → "+" button
2. [ ] Check role options (should be 3 only)
3. [ ] Add new test user (Sales Rep role)
4. [ ] Fill phone, name, territory
5. [ ] Submit

**Expected**:
- ✅ Only 3 roles visible (Rep, Area Manager, Zonal Head)
- ✅ User created successfully
- ✅ Appears in team list

---

## 📸 PRIORITY 7: CAMERA & PHOTOS

### **TEST 21: Photo Capture Quality** ⭐⭐⭐

**Steps**:
1. [ ] Log visit
2. [ ] Take photo in good light
3. [ ] Check preview
4. [ ] Submit
5. [ ] Later: View visit and check photo

**Expected**:
- ✅ Photo is clear and recognizable
- ✅ Photo is compressed (not 10MB original)
- ✅ Photo displays correctly in visit detail

---

### **TEST 22: Retake Photo** ⭐⭐

**Steps**:
1. [ ] Log visit
2. [ ] Take photo
3. [ ] Tap "Retake"
4. [ ] Take new photo
5. [ ] Submit

**Expected**:
- ✅ Can retake photo
- ✅ New photo replaces old one
- ✅ Submit uses new photo

---

### **TEST 23: Remove Photo** ⭐⭐

**Steps**:
1. [ ] Log visit
2. [ ] Take photo
3. [ ] Tap "Remove" or "X" button
4. [ ] Try to submit

**Expected**:
- ✅ Photo removed
- ✅ Submit should block (photo required)

---

## 🔍 PRIORITY 8: DATA ACCURACY

### **TEST 24: "Artis 1MM" Catalog Everywhere** ⭐⭐⭐

**Screens to Check**:
1. [ ] Sheets Entry screen - button should say "Artis 1MM"
2. [ ] Stats screen - breakdown should show "Artis 1MM"
3. [ ] DSR screen - should show "Artis 1MM"
4. [ ] Manager Set Target - should have "Artis 1MM" option

**Expected**:
- ✅ All 4 places show "Artis 1MM"
- ✅ Old data (if any "Artis") also displays as "Artis 1MM"

---

### **TEST 25: Stats Calculation Accuracy** ⭐⭐⭐

**Steps**:
1. [ ] Note today's stats on Home screen:
   - Visits count
   - Sheets sold
   - Expenses total
2. [ ] Go to Stats tab
3. [ ] Check monthly breakdown

**Expected**:
- ✅ Numbers should match
- ✅ Attendance calendar should be accurate
- ✅ Visit breakdown by type should sum correctly

---

## ⚡ PRIORITY 9: PERFORMANCE VERIFICATION

### **TEST 26: Screen Load Times** ⭐⭐⭐

**Measure with stopwatch**:

| Screen | Target | Actual | Pass? |
|--------|--------|--------|-------|
| Home | <1s | ___ | ___ |
| Stats | <2s | ___ | ___ |
| Activities | <1s | ___ | ___ |
| Documents | <2s | ___ | ___ |
| Team (manager) | <2s | ___ | ___ |
| Accounts (manager) | <2s | ___ | ___ |

**Pass Criteria**: All screens load in <2 seconds ✅

---

### **TEST 27: No App Crashes** ⭐⭐⭐⭐⭐

**Steps**:
1. [ ] Navigate through ALL screens in random order
2. [ ] Visit every tab
3. [ ] Open every screen type
4. [ ] Stay in app for 30 minutes

**Expected**:
- ✅ Zero crashes
- ✅ No blank screens
- ✅ No "Something went wrong" errors
- ✅ App remains responsive

---

## 📝 BUG TRACKING TEMPLATE

When you find a bug, document using this format:

### Bug #[Number]
**Severity**: Critical / High / Medium / Low
**Screen**: [Screen name]
**Steps to Reproduce**:
1. Step 1
2. Step 2
3. ...

**Expected**: [What should happen]
**Actual**: [What actually happened]
**Screenshots**: [If applicable]
**Console Logs**: [Any errors shown]

---

## ✅ TESTING COMPLETION CHECKLIST

### Core Features
- [ ] Test 1: Optimistic visit logging
- [ ] Test 2: Photo validation
- [ ] Test 3: Offline visit logging
- [ ] Test 4: Check-in with GPS
- [ ] Test 5: Sheets sales (all 4 catalogs)
- [ ] Test 6: Stats page display
- [ ] Test 7: Edit visit performance

### UI/UX
- [ ] Test 8: Scrolling performance
- [ ] Test 12: SelectAccountScreen design
- [ ] Test 13: Role restrictions
- [ ] Test 24: "Artis 1MM" everywhere

### Offline
- [ ] Test 9: Multiple items in queue
- [ ] Test 10: App restart with queue
- [ ] Test 11: Network interruption

### Edge Cases
- [ ] Test 14: Camera permission
- [ ] Test 15: GPS permission
- [ ] Test 16: Large expense
- [ ] Test 17: Invalid inputs

### Manager Features
- [ ] Test 18: Manager dashboard
- [ ] Test 19: DSR approval
- [ ] Test 20: Add user

### Photos
- [ ] Test 21: Photo quality
- [ ] Test 22: Retake photo
- [ ] Test 23: Remove photo

### Performance
- [ ] Test 26: Screen load times
- [ ] Test 27: No crashes

---

## 🎯 SUGGESTED TESTING ORDER

### **Session 1: Core Flow** (1 hour)
Tests: 1, 2, 4, 5, 6, 7
**Goal**: Verify main features work

### **Session 2: Offline** (1 hour)
Tests: 3, 9, 10, 11
**Goal**: Verify offline sync works

### **Session 3: Manager** (1 hour)
Tests: 13, 18, 19, 20
**Goal**: Verify manager features

### **Session 4: Edge Cases** (1 hour)
Tests: 14-17, 21-23
**Goal**: Find corner case bugs

---

## 📊 SUCCESS CRITERIA

### Minimum to Pass:
- ✅ All Priority 1 tests pass (Tests 1-4)
- ✅ No critical bugs found
- ✅ Offline sync works reliably
- ✅ No crashes in 1-hour session

### Ideal to Pass:
- ✅ All 27 tests complete
- ✅ <3 medium/low bugs found
- ✅ All bugs documented
- ✅ Performance targets met

---

## 🚀 AFTER TESTING

### If All Tests Pass:
1. ✅ Document results in `/docs/testing/ANDROID_TESTING_RESULTS_OCT25.md`
2. ✅ Report to me: "All tests passed!"
3. ✅ Decision: Ready for V1 launch

### If Bugs Found:
1. 📝 Document each bug using template above
2. 📝 Report to me with bug list
3. 🔧 I'll fix bugs
4. 🔄 Retest fixes
5. ✅ Repeat until all critical bugs fixed

---

**Good luck with testing!** 🎯

Take your time, be thorough, and report any issues you find. The more bugs we catch now, the better V1 will be!