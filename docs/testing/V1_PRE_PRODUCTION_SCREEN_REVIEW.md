# V1 Pre-Production Screen Review

**Status**: In Progress
**Last Updated**: 2025-10-25
**Purpose**: Systematic review of all mobile screens before production beta deployment

---

## Overview

This document tracks the review of all 29 mobile screens for obvious errors, UI issues, and functionality problems before V1 MVP production deployment.

---

## Review Checklist (Per Screen)

For each screen, verify:
- [ ] No runtime errors or crashes
- [ ] No console warnings or errors
- [ ] Proper loading states
- [ ] Error handling (network failures, empty states)
- [ ] Navigation works correctly
- [ ] Data displays properly
- [ ] Forms validate correctly
- [ ] Buttons and interactions work
- [ ] UI follows design system (colors, spacing, typography)
- [ ] Status bar color is correct (#393735)
- [ ] Back button works properly
- [ ] Offline behavior (if applicable)

---

## 🔐 Auth Screens (2)

### ✅ LoginScreen.tsx
- [ ] Phone number input validation
- [ ] Country code selector works
- [ ] Navigation to OTP screen
- [ ] Error messages display
- [ ] Loading state during auth

### ✅ OTPScreen.tsx
- [ ] OTP input fields work
- [ ] Auto-focus on input
- [ ] Resend OTP functionality
- [ ] Error handling for invalid OTP
- [ ] Navigation after successful auth

---

## 🏠 Home & Navigation (2)

### ✅ HomeScreen_v2.tsx
- [ ] All quick action buttons work
- [ ] Stats cards display correctly
- [ ] Navigation to all sub-screens
- [ ] Attendance status shows correctly
- [ ] Role-based UI (rep vs manager)

---

## 📊 Sales Rep Screens (8)

### ✅ visits/LogVisitScreen.tsx
- [ ] Account selection works
- [ ] Account type picker displays
- [ ] Purpose dropdown populated
- [ ] Photo upload (counter photo required)
- [ ] Notes input
- [ ] Submit button validation
- [ ] Success message & navigation

### ✅ visits/SelectAccountScreen.tsx
- [ ] Account list loads
- [ ] Search/filter works
- [ ] Account selection returns to LogVisit
- [ ] Empty state when no accounts
- [ ] Loading state

### ✅ sheets/CompactSheetsEntryScreen.tsx
- [ ] Date picker works
- [ ] Catalog dropdown (Fine Decor, Artvio, Woodrica, Artis)
- [ ] Sheets count input (numeric)
- [ ] Distributor selection (optional)
- [ ] Notes input
- [ ] Submit validation
- [ ] Success feedback

### ✅ expenses/ExpenseEntryScreen.tsx
- [ ] Date picker
- [ ] Amount input (numeric, validation)
- [ ] Category dropdown (travel/food/accommodation/other)
- [ ] Description input
- [ ] Receipt photo upload (optional)
- [ ] Submit button works
- [ ] Pending status shows after submit

### ✅ dsr/DSRScreen.tsx
- [ ] Daily stats display correctly (check-in, check-out, visits, sheets)
- [ ] Visit list renders
- [ ] Sheets sales list renders
- [ ] Approval status shows
- [ ] Manager comments visible (if any)
- [ ] Date selector works
- [ ] Empty state for no data

### ✅ StatsScreen.tsx
- [ ] Attendance calendar displays
- [ ] Month navigation works
- [ ] Legend shows correctly
- [ ] Day status colors (present/absent/off)
- [ ] Summary stats accurate
- [ ] Loading state

### ✅ DocumentsScreen.tsx
- [ ] Document list loads
- [ ] Document categories filter
- [ ] Document preview/download works
- [ ] Empty state
- [ ] Loading state

### ✅ ManageDownloadsScreen.tsx
- [ ] Downloads list displays
- [ ] Progress indicators work
- [ ] Open file action
- [ ] Delete file action
- [ ] Empty state

---

## 👤 Profile & Settings (1)

### ✅ profile/ProfileScreen.tsx
- [ ] User info displays (name, phone, role)
- [ ] Territory shows
- [ ] Manager name displays (if applicable)
- [ ] Logout button works
- [ ] Version info displays
- [ ] Theme toggle (if implemented)

---

## 👔 Manager Screens (15)

### ✅ manager/ManagerHomeScreen.tsx
- [ ] Tab navigation works (Home/Team/Review/Accounts)
- [ ] All tabs load correctly
- [ ] Status bar consistent

### ✅ manager/ManagerHomeScreenSimple.tsx
- [ ] Stats cards display (total users, attendance today, pending DSRs)
- [ ] Quick actions work
- [ ] Navigation to sub-screens

### ✅ manager/TeamScreenSimple.tsx
- [ ] Team list renders
- [ ] User cards show name, role, attendance status
- [ ] Tap user → navigate to UserDetailScreen
- [ ] Empty state if no team members
- [ ] Loading state

### ✅ manager/TeamTargetsScreen.tsx
- [ ] Target list by user displays
- [ ] Monthly/yearly toggle
- [ ] Progress bars accurate
- [ ] Set target navigation works
- [ ] Empty state

### ✅ manager/SetTargetScreen.tsx
- [ ] User selection (if applicable)
- [ ] Target type selection (visits/sheets/revenue)
- [ ] Target value input (numeric)
- [ ] Period selection (monthly/quarterly/yearly)
- [ ] Submit validation
- [ ] Success feedback

### ✅ manager/UserListScreen.tsx
- [ ] User list with FlashList performance
- [ ] Search/filter works
- [ ] User status indicator (active/inactive)
- [ ] Tap user → UserDetailScreen
- [ ] Add user button navigates correctly
- [ ] Empty state

### ✅ manager/UserDetailScreen.tsx
- [ ] User info displays (name, phone, role, territory)
- [ ] Stats summary (visits, sheets, attendance rate)
- [ ] Recent activity list
- [ ] Edit user button (if implemented)
- [ ] Deactivate user action (if implemented)

### ✅ manager/AddUserScreen.tsx
- [ ] Name input validation
- [ ] Phone input validation
- [ ] Email input (optional)
- [ ] Role picker (rep/area_manager/etc.)
- [ ] Territory input
- [ ] Manager assignment picker
- [ ] Submit validation
- [ ] Success feedback & navigation

### ✅ manager/AccountsListScreen.tsx
- [ ] Account list renders with FlashList
- [ ] Search/filter by type
- [ ] Account cards show name, type, city
- [ ] Tap account → AccountDetailScreen
- [ ] Add account button works
- [ ] Empty state

### ✅ manager/AccountDetailScreen.tsx
- [ ] Account info displays (name, type, city, phone)
- [ ] Assigned rep shows
- [ ] Visit history list
- [ ] Sales history (if applicable)
- [ ] Edit button navigates
- [ ] Call/WhatsApp actions work

### ✅ manager/ReviewHomeScreen.tsx
- [ ] Pending DSR count shows
- [ ] Pending expense count shows
- [ ] Quick filters work
- [ ] Navigation to approval screens

### ✅ manager/DSRApprovalListScreen.tsx
- [ ] DSR list renders (grouped by date or user)
- [ ] Filter by status (pending/approved/needs_revision)
- [ ] Tap DSR → DSRApprovalDetailScreen
- [ ] Empty state

### ✅ manager/DSRApprovalDetailScreen.tsx
- [ ] DSR details display (check-in/out, visits, sheets)
- [ ] Visit list with photos
- [ ] Sheets sales list
- [ ] Approve button works
- [ ] Reject button with comments input
- [ ] Comments save correctly
- [ ] Status updates in Firestore

---

## 🛠️ Utility & Admin Screens (3)

### ✅ AddAccountScreen.tsx
- [ ] Name input validation
- [ ] Type picker (distributor/dealer/architect)
- [ ] Address inputs (city, state, pincode)
- [ ] Phone input validation
- [ ] Email input (optional)
- [ ] Notes input
- [ ] Submit validation
- [ ] Success feedback

### ✅ EditAccountScreen.tsx
- [ ] Pre-fills existing account data
- [ ] All fields editable
- [ ] Validation on save
- [ ] Update success feedback

### ✅ UploadDocumentScreen.tsx
- [ ] Document title input
- [ ] Category picker
- [ ] File picker works (PDF, images)
- [ ] Upload progress indicator
- [ ] Success feedback
- [ ] Firebase Storage upload succeeds

---

## 🧪 Dev/Testing Screens (2)

### ✅ DesignLabScreen.tsx
- [ ] Component showcase renders
- [ ] Theme tokens display
- [ ] Color palette accurate
- [ ] Typography samples correct

### ✅ KitchenSinkScreen.tsx
- [ ] All test components render
- [ ] No errors in console

---

## 🚨 Known Issues (To Fix Before Production)

### Critical (Must Fix)
1. [ ] **Issue**: [To be filled during review]
   - **Screen**:
   - **Description**:
   - **Fix**:

### High Priority
1. [ ] **Issue**:
   - **Screen**:
   - **Description**:
   - **Fix**:

### Medium Priority
1. [ ] **Issue**:
   - **Screen**:
   - **Description**:
   - **Fix**:

### Low Priority (Nice to Have)
1. [ ] **Issue**:
   - **Screen**:
   - **Description**:
   - **Fix**:

---

## 🧪 Testing Scenarios

### Authentication Flow
1. [ ] Fresh install → Login → OTP → Home
2. [ ] Logout → Login again
3. [ ] Invalid OTP error handling

### Sales Rep Daily Workflow
1. [ ] Check-in → Log visit → Log sheets → Check-out → View DSR
2. [ ] Offline visit logging → Go online → Sync verification
3. [ ] Expense entry → Receipt upload

### Manager Daily Workflow
1. [ ] View team attendance
2. [ ] Review pending DSRs → Approve/Reject
3. [ ] View team stats
4. [ ] Add new user
5. [ ] Set targets

### Offline Scenarios
1. [ ] Go offline → Log visit → Come online → Verify sync
2. [ ] Go offline → Log sheets → Come online → Verify sync
3. [ ] Offline data queued correctly

---

## 🎯 Review Progress

**Total Screens**: 29
**Reviewed**: 0
**Issues Found**: 0
**Issues Fixed**: 0

**Completion**: 0%

---

## 📝 Review Notes

### Session 1 (Date: _____)
- Screens reviewed:
- Issues found:
- Notes:

### Session 2 (Date: _____)
- Screens reviewed:
- Issues found:
- Notes:

---

## ✅ Sign-Off

- [ ] All screens reviewed
- [ ] Critical issues fixed
- [ ] High priority issues fixed
- [ ] Testing scenarios completed
- [ ] Ready for production beta deployment

**Reviewed By**: _______________
**Date**: _______________

---

## 🔗 Related Documents

- [V1_PLUS_FUTURE_ENHANCEMENTS.md](../planning/V1_PLUS_FUTURE_ENHANCEMENTS.md)
- [HOW_TO_TEST.md](HOW_TO_TEST.md)
- [MANAGER_DASHBOARD_COMPLETE.md](../implementation/MANAGER_DASHBOARD_COMPLETE.md)
- [SALES_REP_COMPLETE.md](../implementation/SALES_REP_COMPLETE.md)

---

**Last Updated**: 2025-10-25