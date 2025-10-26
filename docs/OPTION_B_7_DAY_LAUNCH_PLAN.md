# Option B: 7-Day Launch Plan (Pragmatic V1)

**Scope**: Core sales tracking without lead routing
**Timeline**: 7 working days
**Risk Level**: 🟡 Medium (finishing mostly-complete features)

---

## 📅 DAY-BY-DAY BREAKDOWN

### **DAY 1: CRITICAL FIXES** (Monday)

#### Morning (3 hours)

**Task 1.1**: Re-enable Visit Photo Validation ⏱️ 10 minutes
```bash
# File: /functions/src/api/visits.ts
# Lines: 67-78
# Action: UN-COMMENT the photo validation block

# Deploy
cd /Users/kunal/ArtisSales/functions
npm run build
firebase deploy --only functions:logVisit

# Test
# Try to log visit without photo → should fail with error
```

**Task 1.2**: Remove Dangerous Utility Functions ⏱️ 30 minutes
```bash
# File: /functions/src/index.ts
# Action: Comment out or remove these exports:
# - deleteAllAccounts
# - seedAccounts
# - fixOct17Data
# - fixAllPendingData
# - createUser (keep for emergency)
# - updateRoleByPhone (keep for emergency, but gate with admin check)

# Deploy
firebase deploy --only functions
```

**Task 1.3**: Fix EAS Build Configuration ⏱️ 1 hour
```bash
# File: /mobile/eas.json
# Add Android production config

# File: /mobile/app.json
# Add: "android": { "versionCode": 1 }
# Add: "ios": { "buildNumber": "1" }

# Test build
cd /Users/kunal/ArtisSales/mobile
eas build --platform android --profile production --local
# (First build takes ~15 minutes)
```

**Task 1.4**: Start Expense Approval Backend ⏱️ 90 minutes
```bash
# File: /functions/src/api/expenses.ts
# Add two new endpoints:
# 1. getPendingExpenses
# 2. reviewExpense
```

**Code to Add**:
```typescript
// At end of expenses.ts

/**
 * Get Pending Expenses for Manager
 * Returns team's pending expenses
 */
export const getPendingExpenses = onRequest({cors: true}, async (request, response) => {
  try {
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    // Get manager's team
    const userDoc = await db.collection("users").doc(auth.uid).get();
    const userData = userDoc.data();

    if (!['area_manager', 'zonal_head', 'national_head', 'admin'].includes(userData?.role)) {
      response.status(403).json({ ok: false, error: "Not authorized", code: "FORBIDDEN" });
      return;
    }

    // Get team members who report to this manager
    const teamSnapshot = await db.collection("users")
      .where("reportsToUserId", "==", auth.uid)
      .get();

    const teamUserIds = teamSnapshot.docs.map(doc => doc.id);

    // Get pending expenses for team
    const expensesSnapshot = await db.collection("expenses")
      .where("status", "==", "pending")
      .where("userId", "in", teamUserIds)
      .orderBy("date", "desc")
      .limit(100)
      .get();

    // Fetch user names
    const expenses = await Promise.all(
      expensesSnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const userDoc = await db.collection("users").doc(data.userId).get();
        return {
          id: doc.id,
          ...data,
          userName: userDoc.data()?.name || "Unknown",
        };
      })
    );

    response.status(200).json({ ok: true, expenses });
  } catch (error: any) {
    logger.error("Error fetching pending expenses", error);
    response.status(500).json({ ok: false, error: "Internal error", code: "INTERNAL_ERROR" });
  }
});

/**
 * Review Expense (Approve/Reject)
 */
export const reviewExpense = onRequest({cors: true}, async (request, response) => {
  try {
    const auth = await requireAuth(request);
    if (!("valid" in auth) || !auth.valid) {
      response.status(401).json(auth);
      return;
    }

    const { expenseId, status, comments } = request.body;

    if (!expenseId || !status || !['approved', 'rejected'].includes(status)) {
      response.status(400).json({ ok: false, error: "Invalid input", code: "VALIDATION_ERROR" });
      return;
    }

    // Verify manager role
    const userDoc = await db.collection("users").doc(auth.uid).get();
    const userData = userDoc.data();

    if (!['area_manager', 'zonal_head', 'national_head', 'admin'].includes(userData?.role)) {
      response.status(403).json({ ok: false, error: "Not authorized", code: "FORBIDDEN" });
      return;
    }

    // Update expense
    await db.collection("expenses").doc(expenseId).update({
      status,
      reviewedBy: auth.uid,
      reviewedAt: firestore.Timestamp.now(),
      managerComments: comments || "",
    });

    logger.info("Expense reviewed", { expenseId, status, reviewedBy: auth.uid });

    response.status(200).json({ ok: true, message: "Expense reviewed successfully" });
  } catch (error: any) {
    logger.error("Error reviewing expense", error);
    response.status(500).json({ ok: false, error: "Internal error", code: "INTERNAL_ERROR" });
  }
});
```

#### Afternoon (2 hours)

**Task 1.5**: Add API Functions to Index ⏱️ 15 minutes
```bash
# File: /functions/src/index.ts
# Add:
# exports.getPendingExpenses = require('./api/expenses').getPendingExpenses;
# exports.reviewExpense = require('./api/expenses').reviewExpense;
```

**Task 1.6**: Deploy and Test Backend ⏱️ 30 minutes
```bash
cd /Users/kunal/ArtisSales/functions
npm run build
firebase deploy --only functions:getPendingExpenses,functions:reviewExpense

# Test with Postman or curl
```

**Task 1.7**: Add Mobile API Methods ⏱️ 15 minutes
```typescript
// File: /mobile/src/services/api.ts
// Add to exports:

getPendingExpenses: async (data: {}) => {
  return callFunction('getPendingExpenses', data);
},

reviewExpense: async (data: {
  expenseId: string;
  status: 'approved' | 'rejected';
  comments?: string
}) => {
  return callFunction('reviewExpense', data);
},
```

**Task 1.8**: Plan Mobile Screens ⏱️ 1 hour
- Sketch UI for ExpenseApprovalListScreen
- Sketch UI for ExpenseApprovalDetailScreen
- Reference DSRApprovalListScreen for patterns

**End of Day 1 Checklist**:
- [ ] Photo validation active
- [ ] Dangerous functions removed
- [ ] EAS config fixed
- [ ] Expense backend complete
- [ ] Mobile API methods added
- [ ] Screen designs planned

---

### **DAY 2: EXPENSE APPROVAL SCREENS** (Tuesday)

#### Morning (4 hours)

**Task 2.1**: Create ExpenseApprovalListScreen ⏱️ 3 hours

**File**: `/mobile/src/screens/manager/ExpenseApprovalListScreen.tsx`

**Implementation**:
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { DollarSign, Calendar, User } from 'lucide-react-native';

export const ExpenseApprovalListScreen = ({ navigation }) => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const response = await api.getPendingExpenses({});
      setExpenses(response.expenses || []);
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#393735', padding: 24, paddingTop: 52 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#FFFFFF' }}>
          Expense Approvals
        </Text>
        <Text style={{ fontSize: 14, color: '#FFFFFF', opacity: 0.8, marginTop: 4 }}>
          {expenses.length} pending expense reports
        </Text>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadExpenses} />}
      >
        {expenses.map((expense) => (
          <TouchableOpacity
            key={expense.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}
            onPress={() => navigation.navigate('ExpenseApprovalDetail', { expenseId: expense.id })}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A' }}>
                {expense.userName}
              </Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#D32F2F' }}>
                ₹{expense.totalAmount.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Calendar size={14} color="#666" />
                <Text style={{ fontSize: 13, color: '#666' }}>{expense.date}</Text>
              </View>
              <Text style={{ fontSize: 13, color: '#666' }}>•</Text>
              <Text style={{ fontSize: 13, color: '#666' }}>
                {expense.items.length} items
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
```

**Task 2.2**: Test List Screen ⏱️ 30 minutes
- Add to navigation temporarily
- Run app, navigate to screen
- Verify data loads
- Fix any TypeScript errors

#### Afternoon (4 hours)

**Task 2.3**: Create ExpenseApprovalDetailScreen ⏱️ 3 hours

**File**: `/mobile/src/screens/manager/ExpenseApprovalDetailScreen.tsx`

**Features**:
- Show expense details (date, total, items)
- Show each item (category, amount, description)
- Show receipt photos (if any)
- Approve button
- Reject button
- Comments text input
- Submit review

**Reference**: Copy pattern from `DSRApprovalDetailScreen.tsx`

**Task 2.4**: Add to Navigation ⏱️ 30 minutes
```typescript
// File: /mobile/src/navigation/ManagerTabNavigator.tsx
// OR add to ReviewHomeScreen as new card

// Register screens:
<Stack.Screen name="ExpenseApprovalList" component={ExpenseApprovalListScreen} />
<Stack.Screen name="ExpenseApprovalDetail" component={ExpenseApprovalDetailScreen} />
```

**Task 2.5**: Integration Test ⏱️ 30 minutes
- Rep: Submit expense
- Manager: See in list
- Manager: Open detail
- Manager: Approve
- Rep: Check status changed

**End of Day 2 Checklist**:
- [ ] ExpenseApprovalListScreen complete
- [ ] ExpenseApprovalDetailScreen complete
- [ ] Navigation working
- [ ] Full workflow tested

---

### **DAY 3: SECURITY & POLISH** (Wednesday)

#### Morning (3 hours)

**Task 3.1**: Add Rate Limiting ⏱️ 3 hours

**Step 1**: Create rate limiters (30 min)
```typescript
// File: /functions/src/utils/rateLimiter.ts (already exists)
// Add new limiters:

export const writeApiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 60,  // 60 requests per minute per user
  message: "Too many requests, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

export const readApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,  // 300 reads per minute
  message: "Too many requests, please try again later",
});
```

**Step 2**: Apply to all API endpoints (2 hours)
```typescript
// Pattern for each API file:
import { writeApiLimiter } from '../utils/rateLimiter';

const app = express();
app.use(express.json());
app.use(writeApiLimiter);  // ← Add this

app.post('/', async (req, res) => {
  // existing logic
});
```

**Files to Update** (11 files):
- `/functions/src/api/attendance.ts`
- `/functions/src/api/visits.ts`
- `/functions/src/api/sheetsSales.ts`
- `/functions/src/api/expenses.ts`
- `/functions/src/api/accounts.ts`
- `/functions/src/api/users.ts`
- `/functions/src/api/dsrReview.ts`
- `/functions/src/api/targets.ts`
- `/functions/src/api/profile.ts`
- `/functions/src/api/documents.ts`
- `/functions/src/api/managerStats.ts`

**Step 3**: Deploy and test (30 min)
```bash
firebase deploy --only functions
# Test: Rapid API calls → should get 429 error after limit
```

#### Afternoon (3 hours)

**Task 3.2**: Update Documentation ⏱️ 2 hours

**Update these docs**:
1. `/docs/implementation/PERFORMANCE_OPTIMIZATION_PLAN.md`
   - Add completion summary
   - Document all Phase 1-3 changes

2. `/docs/implementation/EXPENSE_APPROVAL_COMPLETE.md` (create new)
   - Document backend endpoints
   - Document mobile screens
   - How to use as manager
   - Screenshots

3. `/CLAUDE.md`
   - Update V1 scope (note: lead routing deferred)
   - Update implementation status

**Task 3.3**: Create Deployment Runbook ⏱️ 1 hour

**File**: `/docs/deployment/PRODUCTION_DEPLOYMENT_GUIDE.md`

**Contents**:
- Pre-deployment checklist
- Environment setup
- Build steps
- Deployment steps (functions, rules, indexes)
- Post-deployment verification
- Rollback procedure

**End of Day 3 Checklist**:
- [ ] Rate limiting on all endpoints
- [ ] Docs updated
- [ ] Deployment runbook created

---

### **DAY 4: TESTING - SALES REP FLOWS** (Thursday)

Full day of systematic testing using real Android device.

#### Morning Flow (4 hours)

**Test 1: Login & Attendance** ⏱️ 1 hour
- [ ] Install production build
- [ ] Phone login with real number
- [ ] OTP verification
- [ ] Check-in from office (good GPS)
- [ ] Try check-in from indoor (poor GPS) → should warn
- [ ] Check-out

**Test 2: Visit Logging** ⏱️ 2 hours
- [ ] Navigate to Activities → Log Visit
- [ ] Select account (search, filter by type)
- [ ] Try to submit WITHOUT photo → should block ✅
- [ ] Take photo with camera
- [ ] Select purpose
- [ ] Add notes
- [ ] Submit → should navigate away instantly
- [ ] Check "Syncing..." badge appears
- [ ] Wait for sync to complete
- [ ] Verify visit appears in activity list
- [ ] Edit visit
- [ ] Delete visit

**Test 3: Offline Visit Logging** ⏱️ 1 hour
- [ ] Turn on Airplane Mode
- [ ] Log visit with photo
- [ ] Submit → should still navigate away
- [ ] Check "Syncing..." badge persists
- [ ] Turn off Airplane Mode
- [ ] Wait for sync
- [ ] Verify visit created in Firestore

#### Afternoon Flow (4 hours)

**Test 4: Sheets Sales** ⏱️ 1 hour
- [ ] Log sheets for Fine Decor
- [ ] Log sheets for Artvio
- [ ] Log sheets for Woodrica
- [ ] Log sheets for Artis 1MM ✅ (verify new name)
- [ ] Edit existing entry
- [ ] Delete entry
- [ ] Check stats updated

**Test 5: Expense Reporting** ⏱️ 2 hours
- [ ] Add expense: Travel, ₹500
- [ ] Add expense: Food, ₹200
- [ ] Add expense: Accommodation, ₹1500
- [ ] Take receipt photo
- [ ] Submit
- [ ] Check status = "pending"
- [ ] Edit expense
- [ ] Delete expense
- [ ] Re-submit one expense for approval test

**Test 6: Stats & DSR** ⏱️ 1 hour
- [ ] View Stats screen
- [ ] Check attendance calendar
- [ ] Check visit breakdown
- [ ] Check sheets by catalog (verify "Artis 1MM" displays)
- [ ] Check expense total
- [ ] View DSR screen
- [ ] Check today's DSR

**Document ALL bugs found in**: `/docs/testing/DAY4_TESTING_RESULTS.md`

---

### **DAY 5: TESTING - MANAGER FLOWS** (Friday)

#### Morning (4 hours)

**Test 7: Manager Dashboard** ⏱️ 1 hour
- [ ] Log in as national_head
- [ ] View manager home dashboard
- [ ] Check team stats
- [ ] Change date → verify stats update
- [ ] Check top performers (shows sample data - OK for V1)

**Test 8: Team Management** ⏱️ 2 hours
- [ ] View team list
- [ ] Search for user
- [ ] Filter by role
- [ ] Open user detail screen
- [ ] View user monthly stats
- [ ] Add new user (test role restrictions ✅)
  - As national_head: Should NOT see admin/national_head options
  - Should only see: Sales Rep, Area Manager, Zonal Head
- [ ] Edit user
- [ ] Verify permissions

**Test 9: Account Management** ⏱️ 1 hour
- [ ] View accounts list
- [ ] Filter by type
- [ ] Search account
- [ ] View account details
- [ ] Add new account
- [ ] Edit account (test permissions)
- [ ] Verify Edit button visibility (role-based)

#### Afternoon (4 hours)

**Test 10: DSR Approval** ⏱️ 2 hours
- [ ] View Review Home dashboard
- [ ] See pending DSRs count
- [ ] Open DSR list
- [ ] Open DSR detail
- [ ] Review breakdown (attendance, visits, sheets, expenses)
- [ ] Approve DSR
- [ ] Check status changed
- [ ] Test reject with comments

**Test 11: Expense Approval** ⏱️ 2 hours (NEW FEATURE!)
- [ ] View expense approval list
- [ ] See expense from Day 4 testing
- [ ] Open expense detail
- [ ] Review all items
- [ ] View receipt photo
- [ ] Approve expense
- [ ] Switch to rep account
- [ ] Verify status = "approved"
- [ ] Test reject workflow

**Test 12: Target Management** ⏱️ 1 hour (flexible)
- [ ] Set target for user
- [ ] Set targets by catalog
- [ ] Set visit targets
- [ ] Enable auto-renew
- [ ] View team targets

**Document ALL bugs** in `/docs/testing/DAY5_TESTING_RESULTS.md`

---

### **DAY 6: OFFLINE & EDGE CASES** (Saturday/Monday)

#### Offline Resilience (3 hours)

**Test 13: Offline Scenarios** ⏱️ 3 hours
- [ ] Turn on Airplane Mode
- [ ] Check-in → should queue
- [ ] Log visit with photo → should queue
- [ ] Log sheets → should queue
- [ ] Log expense → should queue
- [ ] Navigate around app
- [ ] Turn off Airplane Mode
- [ ] Verify all 4 items sync successfully
- [ ] Check for any errors in logs

**Test 14: Network Interruption** ⏱️ 1 hour
- [ ] Start photo upload
- [ ] Turn on Airplane Mode mid-upload
- [ ] Verify retry happens when back online
- [ ] Check sync indicator shows correctly

**Test 15: App Restart with Pending Queue** ⏱️ 30 minutes
- [ ] Queue 3 visits with photos
- [ ] Close app completely
- [ ] Reopen app
- [ ] Verify queue items still present
- [ ] Verify auto-sync happens

#### Edge Cases (3 hours)

**Test 16: GPS Edge Cases** ⏱️ 1 hour
- [ ] Check-in with poor GPS (>100m accuracy)
  - Should show warning but allow?
  - Or should block? (Check implementation)
- [ ] Check-in indoors (GPS unavailable)
- [ ] Check permissions denied
- [ ] Grant permissions mid-flow

**Test 17: Camera Edge Cases** ⏱️ 1 hour
- [ ] Camera permission denied
- [ ] Grant permission
- [ ] Take photo in low light
- [ ] Take photo with large file size (>5MB)
- [ ] Retake photo
- [ ] Remove photo (should block submit now)

**Test 18: Data Validation** ⏱️ 1 hour
- [ ] Submit expense with ₹0 amount → should fail
- [ ] Submit sheets with 0 count → should fail
- [ ] Submit very large expense (₹1,000,000) → test limit
- [ ] Submit long notes (>1000 chars) → test limit
- [ ] Invalid phone number format
- [ ] Invalid date format

**End of Day 6**:
- [ ] All edge cases tested
- [ ] All bugs documented
- [ ] Critical bugs fixed

---

### **DAY 7: FINAL QA & POLISH** (Sunday/Tuesday)

#### Morning (3 hours)

**Task 7.1**: Fix All P0 Bugs ⏱️ 2 hours
- Review bugs from Day 4-6 testing
- Fix any critical (P0) bugs
- Test fixes

**Task 7.2**: Console Log Cleanup ⏱️ 1 hour
Quick cleanup of most verbose files:
- `/mobile/src/services/api.ts` - Keep error logs only
- `/mobile/src/services/uploadQueue.ts` - Keep error logs only
- `/mobile/src/services/storage.ts` - Keep error logs only

#### Afternoon (3 hours)

**Task 7.3**: Full Workflow Test ⏱️ 2 hours
**As Sales Rep**:
1. Login
2. Check-in
3. Log 3 visits (different account types)
4. Log sheets for all 4 catalogs
5. Submit 1 expense
6. Check stats
7. View DSR
8. Check-out
9. Logout

**As Manager**:
1. Login
2. View team stats
3. Approve DSR
4. Approve expense
5. Add new account
6. Set target for user
7. Logout

**Task 7.4**: Performance Check ⏱️ 30 minutes
- [ ] All screens load in <2 seconds
- [ ] List scrolling smooth (60 FPS)
- [ ] No memory leaks
- [ ] No app crashes

**Task 7.5**: Production Build ⏱️ 30 minutes
```bash
cd /Users/kunal/ArtisSales/mobile
eas build --platform android --profile production
# Wait ~15 minutes for cloud build
# Download AAB file
# Test install on device
```

---

## ✅ FINAL CHECKLIST (Before Launch)

### Code Quality
- [ ] Photo validation re-enabled
- [ ] Dangerous functions removed
- [ ] Rate limiting on all endpoints
- [ ] Console logs cleaned (or gated with __DEV__)
- [ ] No TypeScript errors
- [ ] No critical bugs

### Features
- [ ] Attendance working
- [ ] Visit logging working (photo mandatory)
- [ ] Sheets sales working (all 4 catalogs)
- [ ] Expense submission working
- [ ] Expense approval working (NEW)
- [ ] DSR compilation working
- [ ] DSR approval working
- [ ] Manager dashboard working
- [ ] Target management working
- [ ] Account management working
- [ ] Offline sync working

### Infrastructure
- [ ] EAS Android production config complete
- [ ] Production build generates successfully
- [ ] All Cloud Functions deployed
- [ ] All Firestore indexes deployed
- [ ] Storage rules deployed
- [ ] Firestore rules deployed
- [ ] Environment variables configured

### Testing
- [ ] All sales rep flows tested
- [ ] All manager flows tested
- [ ] Offline scenarios tested
- [ ] Edge cases tested
- [ ] No crashes in 8-hour session
- [ ] Performance acceptable

### Documentation
- [ ] Deployment runbook written
- [ ] Bug list documented
- [ ] Known limitations documented
- [ ] V1 scope clearly defined

### Deployment Prep
- [ ] Google Play Console account ready ($25 paid)
- [ ] App screenshots prepared
- [ ] App description written
- [ ] Privacy policy URL live
- [ ] Support email configured
- [ ] Firebase production project ready

---

## 🚨 ESCAPE HATCHES (If Issues Found)

### If Critical Bug Found on Day 5-6:
- **Option 1**: Fix immediately (add 1-2 days)
- **Option 2**: Disable feature temporarily
- **Option 3**: Delay launch

### If Testing Reveals Major Gap:
- Reassess scope
- Consider Option C (MVP launch)
- Ship what's proven, iterate quickly

### If Timeline Slips:
- Focus on P0 fixes only
- Defer console cleanup
- Ship with known minor bugs (document them)

---

## 📊 RISK ASSESSMENT

### High Risk Areas
| Area | Risk | Mitigation |
|------|------|------------|
| Expense approval (new feature) | New code, new screens | Copy DSR approval pattern |
| Photo validation re-enabled | Could break existing visits | Test thoroughly |
| Rate limiting | Could block legit users | Set generous limits |
| NetInfo rebuild | Platform-specific issues | Test on multiple devices |

### Medium Risk
| Area | Risk | Mitigation |
|------|------|------------|
| Console log cleanup | Could break error handling | Only clean debug logs, keep errors |
| Offline testing | Complex scenarios | Systematic test matrix |
| EAS build | First production build | Test build early (Day 1) |

### Low Risk
| Area | Risk | Mitigation |
|------|------|------------|
| Remove utility functions | Backend only | Test existing flows still work |
| Documentation updates | No code changes | Review only |

---

## 🎯 SUCCESS CRITERIA

### Minimum V1 Launch Requirements

**Functional**:
- ✅ Sales rep can work full day (check-in → visits → sheets → expenses → DSR → check-out)
- ✅ Manager can oversee team (stats, approvals, user management)
- ✅ App works offline and syncs when online
- ✅ No data loss
- ✅ No crashes in normal use

**Quality**:
- ✅ All screens load in <2 seconds
- ✅ User-friendly error messages
- ✅ Professional UI/UX
- ✅ No security vulnerabilities (P0/P1)

**Operational**:
- ✅ Can deploy updates via EAS
- ✅ Can monitor with Firebase Console
- ✅ Can support users with documentation
- ✅ Can rollback if needed

---

## 💰 COST ESTIMATE (Firebase/Expo)

**Firebase (Monthly)**:
- Firestore: ~$25-50 (10 users, 1000 docs/day)
- Cloud Functions: ~$10-20 (low invocations)
- Storage: ~$5-10 (photos)
- **Total**: ~$50-100/month

**Expo EAS**:
- Free tier: 30 builds/month (sufficient for V1)
- Paid: $99/month if needed (unlimited builds)

**Play Store**:
- One-time: $25 (Google Play Console)

**Total First Month**: ~$75-125

---

## 📞 DECISION TIME

**You have 3 options. Tell me which one and I'll execute the plan**:

**A**: Full V1 (14 days) - Include lead routing
**B**: Pragmatic V1 (7 days) - Defer leads, ship sales tracking ⭐ **RECOMMENDED**
**C**: MVP (3 days) - Ship core only, defer approvals too

**Questions to help decide**:
1. How urgent is launch? (This week/next week/flexible)
2. Do sales reps need lead management on Day 1? (Yes/No)
3. Can managers approve expenses manually for 1 month? (Yes/No)
4. What's your tolerance for risk? (Low/Medium/High)

**I recommend Option B** because:
- ✅ Delivers full sales rep workflow
- ✅ Delivers full manager oversight
- ✅ Manageable timeline (1 week)
- ✅ Lower risk (finishing vs starting)
- ✅ Can add leads in V1.1 after feedback

**What do you want to do?** 🚀