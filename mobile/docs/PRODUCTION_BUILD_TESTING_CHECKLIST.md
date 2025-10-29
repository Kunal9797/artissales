# Production Build Testing Checklist

**Version:** 1.0.5 (Next Production Build)
**Created:** 2025-10-29
**Status:** 🔄 In Progress - Collecting changes before build

---

## 📝 Changes Pending Testing

### Layout Fixes (Safe Area Bottom Padding)

All screens below now use the `useBottomSafeArea` hook to automatically adapt bottom padding based on your device's navigation bar type.

#### ✅ Phase 1 Complete (6 screens):
1. **ExpenseEntryScreen** - Category grid fix + sticky footer
2. **HomeScreen_v2** - Sales rep landing page
3. **ManagerHomeScreenSimple** - Manager landing page
4. **StatsScreen** - Sales rep performance tab
5. **ProfileScreen** - Shared profile/settings tab
6. **CompactSheetsEntryScreen** - Daily sheets logging + sticky footer

#### ✅ Phase 2 Complete (4 screens):
7. **LogVisitScreen** - Visit logging form
8. **SelectAccountScreen** - Account selection list
9. **DSRScreen** - Daily sales report view
10. **DSRApprovalDetailScreen** - Manager DSR approval

#### 🔄 Phase 3 (Optional - Manager Screens):
- [ ] TeamScreenSimple
- [ ] AccountsListScreen
- [ ] ReviewHomeScreen
- [ ] AccountDetailScreen

---

## 🧪 Testing Scenarios

### Device Configuration Testing

Test on devices with **different navigation types**:

#### Device Type 1: Gesture Navigation
- [ ] Navigation bar is minimal (0-16px)
- [ ] Bottom UI has proper minimum spacing (12px)
- [ ] No excessive white space at bottom

#### Device Type 2: 3-Button Navigation (Most Common)
- [ ] Navigation bar is ~48px
- [ ] Bottom buttons fully visible above nav bar
- [ ] Proper spacing between buttons and nav bar (~12px)

#### Device Type 3: Tablet Navigation (If Available)
- [ ] Navigation bar is ~56px
- [ ] Bottom buttons fully visible
- [ ] Layout scales properly on larger screen

---

## 📱 Screen-by-Screen Testing

### Sales Rep Screens

#### 1. Expense Entry Screen (Report Expenses)
**Path:** Home → Report Expenses OR Activities → Edit Expense

**Test Cases:**
- [ ] **Category Grid Layout**
  - [ ] Category buttons (Travel, Food, Accommodation, Other) display in **2 columns** (2×2 grid)
  - [ ] NOT stacked vertically in single column
  - [ ] Buttons properly sized and spaced
  - [ ] Icon and text visible on each button

- [ ] **Sticky Footer (New Expense)**
  - [ ] Cancel button visible
  - [ ] Submit button visible
  - [ ] Both buttons fully above navigation bar (not cut off)
  - [ ] Submit button shows item count and total amount
  - [ ] Proper spacing between buttons and nav bar

- [ ] **Sticky Footer (Edit Expense)**
  - [ ] Delete button visible
  - [ ] Update button visible
  - [ ] Both buttons fully above navigation bar

- [ ] **ScrollView Content**
  - [ ] Can scroll to see all form fields
  - [ ] Last item (expense items list) not hidden behind footer
  - [ ] No overlap between content and sticky footer

- [ ] **Keyboard Interaction**
  - [ ] Keyboard doesn't cover input fields
  - [ ] Can scroll when keyboard is open
  - [ ] Submit button accessible with keyboard open

---

#### 2. Compact Sheets Entry Screen (Log Sheets Sold)
**Path:** Home → Log Sheets Sold OR Activities → Edit Sheets

**Test Cases:**
- [ ] Catalog selection buttons visible
- [ ] Number input field accessible
- [ ] Distributor selection works
- [ ] Bottom footer (Today's Entries) visible
- [ ] Send for Approval button visible above nav bar
- [ ] Can scroll to see all entries

---

#### 3. Log Visit Screen
**Path:** Home → Log Visit OR Activities → Edit Visit

**Test Cases:**
- [ ] Account selection visible
- [ ] Photo upload buttons accessible
- [ ] Counter photo preview visible
- [ ] Notes input field accessible
- [ ] Bottom buttons visible above nav bar
- [ ] Can scroll through entire form

---

#### 4. Select Account Screen
**Path:** Log Visit → Select Account

**Test Cases:**
- [ ] Account list scrollable
- [ ] Last account in list visible (not hidden)
- [ ] Search bar functional
- [ ] Can tap accounts at bottom of list
- [ ] Proper spacing below last account

---

#### 5. Profile Screen
**Path:** Bottom Nav → Profile

**Test Cases:**
- [ ] User info section visible
- [ ] Attendance stats visible
- [ ] Can scroll to bottom
- [ ] Last section (logout/settings) visible
- [ ] Proper spacing below last item

---

#### 6. Stats Screen
**Path:** Bottom Nav → Stats

**Test Cases:**
- [ ] Monthly stats cards visible
- [ ] Sheets by catalog chart visible
- [ ] Can scroll to see all stats
- [ ] Last stat section visible
- [ ] Proper spacing below last item

---

### Manager Screens

#### 7. Manager Home Screen
**Path:** Bottom Nav → Home (Manager Role)

**Test Cases:**
- [ ] Team stats cards visible
- [ ] Attendance summary visible
- [ ] Can scroll to see all sections
- [ ] Last section visible
- [ ] Proper spacing below content

---

#### 8. Accounts List Screen
**Path:** Manager Nav → Accounts

**Test Cases:**
- [ ] Account list scrollable
- [ ] Last account visible
- [ ] Search/filter accessible
- [ ] Can tap accounts at bottom
- [ ] Proper spacing below last account

---

#### 9. Account Detail Screen
**Path:** Accounts → Select Account

**Test Cases:**
- [ ] Account details visible
- [ ] Visit history scrollable
- [ ] Last visit visible
- [ ] Proper spacing below content

---

#### 10. Review Home Screen
**Path:** Manager Nav → Review

**Test Cases:**
- [ ] Pending DSRs visible
- [ ] Pending expenses visible
- [ ] Can scroll through items
- [ ] Last item visible
- [ ] Proper spacing below content

---

#### 11. Team Screen
**Path:** Manager Nav → Team

**Test Cases:**
- [ ] Team member list scrollable
- [ ] Last team member visible
- [ ] Can tap members at bottom
- [ ] Proper spacing below last member

---

### Navigation Testing

#### Bottom Navigation Bar
**Test Cases:**
- [ ] Nav bar visible on all screens
- [ ] Nav bar positioned correctly above system nav
- [ ] All nav icons visible and tappable
- [ ] Selected tab highlighted properly
- [ ] Nav bar doesn't overlap content
- [ ] Nav bar has proper safe area padding

---

## 🎨 Visual Regression Testing

For each fixed screen, verify:

- [ ] No visual glitches or overlaps
- [ ] Consistent spacing across screens
- [ ] Buttons properly sized and aligned
- [ ] Colors and branding intact
- [ ] Icons render correctly
- [ ] Text not cut off

---

## 🐛 Known Issues to Verify Fixed

### Issue 1: Category Buttons Stacking (ExpenseEntryScreen)
**Before:** Category buttons displayed in single column (1×4 layout)
**After:** Category buttons display in 2 columns (2×2 grid)
**Status:** [ ] FIXED / [ ] NOT FIXED / [ ] NEW ISSUE

### Issue 2: Bottom Buttons Hidden (ExpenseEntryScreen)
**Before:** Cancel/Submit buttons partially hidden under navigation bar
**After:** Buttons fully visible with proper spacing above nav bar
**Status:** [ ] FIXED / [ ] NOT FIXED / [ ] NEW ISSUE

---

## 🔄 Regression Testing

Test features that should **still work** after changes:

### Expense Functionality
- [ ] Can add expense items
- [ ] Can remove expense items
- [ ] Amount validation works
- [ ] Description required validation works
- [ ] Can upload receipt photos
- [ ] Can submit expense report
- [ ] Can edit existing expense
- [ ] Can delete expense
- [ ] Validation errors show properly

### Sheets Functionality
- [ ] Can log sheets sold
- [ ] Catalog selection works
- [ ] Distributor selection works
- [ ] Can send for approval
- [ ] Can edit existing sheets entry

### Visit Functionality
- [ ] Can select account
- [ ] Can upload counter photos
- [ ] Can add notes
- [ ] Can submit visit
- [ ] Can edit existing visit

### Manager Functionality
- [ ] Can view team stats
- [ ] Can review DSRs
- [ ] Can approve/reject expenses
- [ ] Can view account details
- [ ] Can view team attendance

---

## 📊 Performance Testing

- [ ] App launch time < 3 seconds
- [ ] Screen transitions smooth (no lag)
- [ ] ScrollView performance good (60 FPS)
- [ ] No memory leaks after navigating between screens
- [ ] Photo upload works without freezing

---

## 🚨 Critical Test Cases (Must Pass)

These **MUST PASS** before releasing to production:

1. [ ] **ExpenseEntryScreen:** Category buttons in 2-column grid
2. [ ] **ExpenseEntryScreen:** Bottom buttons fully visible on 3-button nav device
3. [ ] **All Screens:** Bottom navigation bar visible and functional
4. [ ] **All Screens:** No content hidden behind footers/nav bars
5. [ ] **All Forms:** Can submit data successfully
6. [ ] **Navigation:** Can navigate between all screens without crashes
7. [ ] **Auth:** Can login and logout successfully
8. [ ] **Offline:** App doesn't crash when offline

---

## 📝 Notes Section

Use this section to record any observations during testing:

### Issues Found:
```
Example:
- Screen: ExpenseEntryScreen
- Issue: Category buttons still in single column on Device X
- Device: Samsung Galaxy A52 (3-button nav)
- Screenshot: [link or attached]
```

### Unexpected Behavior:
```
Example:
- Screen: StatsScreen
- Behavior: Extra white space at bottom
- Expected: Minimal spacing
- Actual: 100px white space
```

### Positive Observations:
```
Example:
- Screen: LogVisitScreen
- Observation: Perfect spacing on all tested devices
- Devices: Pixel 6 (gesture), Samsung A52 (3-button)
```

---

## ✅ Sign-off

Once all critical tests pass and no major issues found:

- [ ] All critical test cases passed
- [ ] All fixed screens verified
- [ ] No new regressions introduced
- [ ] Performance acceptable
- [ ] Ready for production release

**Tested By:** ___________________
**Date:** ___________________
**Build Version:** ___________________
**Device(s):** ___________________

---

## 🔗 Related Documentation

- [SAFE_AREA_FIX_NEEDED.md](./SAFE_AREA_FIX_NEEDED.md) - List of screens needing safe area fix
- [VERSION_UPDATE_CHECKLIST.md](../VERSION_UPDATE_CHECKLIST.md) - Version management guide
- [HOW_TO_TEST.md](./HOW_TO_TEST.md) - General testing procedures (if exists)

---

**Last Updated:** 2025-10-29
**Next Build Version:** 1.0.5 (TBD)
