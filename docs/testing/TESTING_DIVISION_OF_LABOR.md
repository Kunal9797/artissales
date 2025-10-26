# Testing Division of Labor - V1 Pre-Launch

**Date**: October 25, 2025
**Purpose**: Define what automated/code testing can be done vs what requires manual device testing

---

## 🤖 WHAT I CAN TEST (Automated/Static Analysis)

### **1. Code Quality & Syntax** ✅ Can Do Now

**What I'll Check**:
- TypeScript compilation errors
- Import issues
- Syntax errors
- Missing dependencies
- Type safety issues
- Unused variables/imports

**How**:
```bash
cd mobile && npx tsc --noEmit --skipLibCheck
```

**Time**: 5 minutes

---

### **2. Firebase Security Rules Testing** ✅ Can Do Now

**What I'll Check**:
- Firestore rules logic
- Storage rules logic
- Permission checks
- Role-based access control
- Data isolation

**How**: Use Firebase Emulator + test scenarios
```bash
cd /Users/kunal/ArtisSales
firebase emulators:start
# Run test scenarios
```

**Time**: 1-2 hours to set up + run

---

### **3. Cloud Functions Unit Testing** ✅ Can Do

**What I'll Check**:
- Validation logic (phone numbers, dates, etc.)
- Business logic (DSR compilation, target calculations)
- Error handling
- Edge cases

**How**: Create Jest test files for functions
```bash
cd functions
npm install --save-dev jest @types/jest firebase-functions-test
# Write and run tests
```

**Time**: 4-6 hours to set up + write tests

---

### **4. API Endpoint Contract Testing** ✅ Can Do

**What I'll Check**:
- Endpoint exists and responds
- Returns correct HTTP status codes
- Response structure matches expected
- Authentication works
- Error responses are correct

**How**: Automated API testing with curl/fetch
```bash
# Test each endpoint with valid/invalid inputs
```

**Time**: 2-3 hours

---

### **5. Code Analysis & Static Checks** ✅ Can Do Now

**What I'll Check**:
- Firestore query patterns (check for missing indexes)
- Missing error handling
- Unhandled promise rejections
- Memory leaks (static analysis)
- Performance anti-patterns
- Security vulnerabilities

**How**: Code review + grep searches
**Time**: 1 hour

---

### **6. Build & Deployment Validation** ✅ Can Do

**What I'll Check**:
- Functions build without errors
- Mobile bundles without errors
- All environment variables present
- Firebase deployment succeeds
- No broken imports

**How**:
```bash
cd functions && npm run build
cd mobile && npx tsc --noEmit
```

**Time**: 15 minutes

---

## 📱 WHAT YOU NEED TO TEST (Manual Device Testing)

### **1. End-to-End User Flows** ⚠️ ONLY YOU

**Why You**: Requires actual device, camera, GPS, Firebase Auth

**What to Test**:

#### Sales Rep Daily Workflow
- [ ] Login with phone number
- [ ] Receive and enter OTP
- [ ] Check-in with GPS
- [ ] Log visit (select account, take photo, submit)
- [ ] Log sheets sale (all 4 catalogs)
- [ ] Submit expense
- [ ] View stats
- [ ] View DSR
- [ ] Check-out

#### Manager Workflows
- [ ] View team dashboard
- [ ] Review and approve DSR
- [ ] Add new user (test role restrictions)
- [ ] Set targets
- [ ] Manage accounts
- [ ] View user details

**Time**: 2-3 hours for comprehensive test

---

### **2. Camera & Photo Functionality** ⚠️ ONLY YOU

**Why You**: Requires device camera

**What to Test**:
- [ ] Camera permissions (grant/deny)
- [ ] Take photo in good light
- [ ] Take photo in low light
- [ ] Retake photo
- [ ] Photo upload (check quality)
- [ ] Photo display in visit log
- [ ] Photo requirement enforcement

**Time**: 30 minutes

---

### **3. GPS & Location Features** ⚠️ ONLY YOU

**Why You**: Requires device GPS

**What to Test**:
- [ ] Check-in with good GPS (outdoors)
- [ ] Check-in with poor GPS (indoors) - should warn
- [ ] Check-in with location off - should fail
- [ ] GPS accuracy validation (>100m should warn/block)
- [ ] Location permission (grant/deny)

**Time**: 30 minutes

---

### **4. Offline Scenarios** ⚠️ ONLY YOU

**Why You**: Requires controlling device network state

**Critical Tests**:
- [ ] Turn on Airplane Mode
- [ ] Log visit with photo (should queue)
- [ ] Log sheets (should queue)
- [ ] Navigate app (should work from cache)
- [ ] Turn off Airplane Mode
- [ ] Verify automatic sync
- [ ] Check "Syncing..." indicator appears/disappears

**Edge Cases**:
- [ ] Submit visit offline → Close app → Reopen → Should sync
- [ ] Start photo upload → Go offline mid-upload → Should retry when online
- [ ] Work offline for 1 hour → Go online → All items should sync

**Time**: 1-2 hours

---

### **5. UI/UX Testing** ⚠️ ONLY YOU

**Why You**: Requires visual verification

**What to Test**:
- [ ] All screens render correctly
- [ ] No visual glitches
- [ ] Buttons work
- [ ] Forms validate properly
- [ ] Loading states show correctly
- [ ] Error messages are user-friendly
- [ ] Scrolling is smooth (FlashList)
- [ ] "Artis 1MM" displays correctly everywhere

**Time**: 1-2 hours

---

### **6. Edge Cases & Error Scenarios** ⚠️ ONLY YOU

**What to Test**:
- [ ] Invalid phone number format
- [ ] Expired OTP
- [ ] Network timeout during API call
- [ ] Very large expense amount (₹1,000,000)
- [ ] Very long notes (1000+ characters)
- [ ] Submit 10 visits rapidly
- [ ] Low battery during photo upload
- [ ] App backgrounded during operation

**Time**: 2-3 hours

---

### **7. Multi-Device Testing** ⚠️ ONLY YOU (if possible)

**What to Test**:
- [ ] Different Android versions
- [ ] Different screen sizes
- [ ] Different GPS accuracy
- [ ] Different network speeds (WiFi, 4G, 3G)

**Time**: 2-3 hours (if you have multiple devices)

---

## ✅ RECOMMENDED DIVISION

### **What I'll Do** (Today/Tomorrow - 6-8 hours):

1. ✅ **Code Quality Check** (30 min)
   - Run TypeScript compilation
   - Check for errors
   - Verify all imports

2. ✅ **Firestore Query Analysis** (1 hour)
   - Verify all queries have proper indexes
   - Check for performance anti-patterns
   - Validate query structure

3. ✅ **API Contract Testing** (2 hours)
   - Test all 37 endpoints programmatically
   - Verify authentication works
   - Check error responses

4. ✅ **Security Rules Review** (1 hour)
   - Audit Firestore rules
   - Audit Storage rules
   - Verify role-based access

5. ✅ **Build Validation** (30 min)
   - Verify functions build
   - Verify mobile builds
   - Check for warnings

6. ⏳ **Create Test Data** (1 hour)
   - Seed test accounts
   - Create sample visits/sheets/expenses
   - Set up test users (rep, manager, admin)

7. ✅ **Write Testing Checklist** (1 hour)
   - Detailed step-by-step guide
   - Expected results for each test
   - Bug tracking template

---

### **What You'll Do** (This Week - 3-4 days):

**Day 1: Core Flows** (3-4 hours)
- Login → Check-in → Log visit → Sheets → Expense → DSR → Check-out
- Manager dashboard → DSR approval

**Day 2: Offline Testing** (2-3 hours)
- Offline visit logging
- Offline queue sync
- App restart with pending items

**Day 3: Edge Cases** (2-3 hours)
- Camera edge cases
- GPS edge cases
- Network failures
- Input validation

**Day 4: Bug Fixing** (flexible)
- Fix any issues found
- Retest fixes
- Final QA

---

## 🚀 LET'S START NOW

### **Phase 1: I'll Do First** (Next 2 hours)

Let me run automated tests while you relax:

1. ✅ **Code quality check** - Verify no TypeScript errors
2. ✅ **Query analysis** - Check all Firestore queries
3. ✅ **Build validation** - Ensure clean builds
4. ✅ **Create testing checklist** - Detailed guide for you

### **Phase 2: You Do After** (When Ready)

Then you take over with your Android phone:

1. 📱 Follow the testing checklist I create
2. 📱 Test real user flows
3. 📱 Test offline scenarios
4. 📱 Report any bugs you find

---

## 📋 IMMEDIATE ACTION

**Should I start automated testing now?**

I'll run:
1. TypeScript compilation check
2. Firestore query validation
3. Build verification
4. Create your detailed testing guide

This will take ~2 hours and ensure the code is solid before you do device testing.

**Want me to proceed?** 🚀

Or do you want me to focus on something else first?