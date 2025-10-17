# DSR System - Implementation Plan Based on Your Decisions

## Your Answers Summary

| Q# | Issue | Your Choice | Implementation |
|----|-------|-------------|----------------|
| 1 | Pending sheets count display | **B** - Show total sheets | Change count calculation |
| 2 | Manager permissions | **A** - Keep top-level only | No change needed |
| 3 | DSR rejection flow | **B** - Leave as pending | No change needed (correct behavior) |
| 4 | Post-compilation edits | **11:59 PM cutoff + lock** | Change time + add validation |
| 5 | Late submissions (after 11:59 PM) | **A** - Block with error | Add time validation |
| 7 | Date format validation | **Add to expense/sheets API** | Add validation to APIs |
| 8 | DSR compilation failures | **B+C** - Alert + retry | Add error handling + notifications |
| 9 | Zero-activity days | **B** - No DSR if zero | Change compilation logic |
| 10 | Leads in DSR | **B** - Remove leads | Remove from DSR |

---

## Implementation Tasks

### ✅ ALREADY DONE
- [x] DSR approval marks expenses/sheets as approved/verified
- [x] Fixed undefined field handling
- [x] Fixed DSR list query filter
- [x] Oct 17 temporary data fix

### 🔨 TO IMPLEMENT

#### 1. Change Pending Sheets Display (Q1: Option B)
**File:** `/mobile/src/screens/StatsScreen.tsx` (lines 100-103)

**Change from:**
```typescript
setPendingCounts({
  pendingExpenses: expensesSnapshot.size,  // Count of records
  unverifiedSheets: sheetsSnapshot.size,   // Count of records
});
```

**Change to:**
```typescript
setPendingCounts({
  pendingExpenses: expensesSnapshot.size,
  unverifiedSheets: sheetsSnapshot.docs.reduce((sum, doc) => {
    return sum + (doc.data().sheetsCount || 0);
  }, 0),  // Sum of all sheet counts
});
```

**Impact:** UI will show "16 sheets pending" instead of "3 sheets pending"

---

#### 2. Change DSR Compilation Time to 11:59 PM (Q4)
**Files:**
- `/functions/src/scheduled/dsrCompiler.ts` (line 239)

**Change from:**
```typescript
onSchedule("0 23 * * *", ...) // 11:00 PM
```

**Change to:**
```typescript
onSchedule("59 23 * * *", ...) // 11:59 PM
```

**Reason:** Gives reps until 11:58 PM to submit data

---

#### 3. Lock Data Editing After 11:59 PM (Q4 + Q5)
**Files:**
- `/functions/src/api/expenses.ts` - submitExpense, updateExpense
- `/functions/src/api/sheetsSales.ts` - logSheetsSale, updateSheetsSale

**Add to each function (after auth, before processing):**
```typescript
// Check if trying to edit/add data for a past date after 11:59 PM
const now = new Date();
const nowIST = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
const currentHour = nowIST.getHours();
const currentMinute = nowIST.getMinutes();
const todayIST = nowIST.toISOString().split('T')[0]; // YYYY-MM-DD

// If it's after 11:59 PM AND trying to submit for today or earlier
if ((currentHour === 23 && currentMinute >= 59) || currentHour < 23) {
  if (date <= todayIST && date < todayIST) {
    return response.status(400).json({
      ok: false,
      error: "Cannot add/edit data for past dates. Day's reporting closed at 11:59 PM.",
      code: "REPORTING_CLOSED"
    });
  }
}

// If it's after midnight (00:00+) trying to submit for yesterday
if (currentHour >= 0 && currentHour < 6) { // Grace period until 6 AM
  const yesterday = new Date(nowIST);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (date === yesterdayStr) {
    return response.status(400).json({
      ok: false,
      error: "Previous day's reporting closed. Cannot add data for yesterday.",
      code: "REPORTING_CLOSED"
    });
  }
}
```

---

#### 4. Add Date Format Validation (Q7)
**Files:**
- `/functions/src/api/expenses.ts` - submitExpense
- `/functions/src/api/sheetsSales.ts` - logSheetsSale

**Add after request body extraction:**
```typescript
// Validate date format
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  return response.status(400).json({
    ok: false,
    error: "Invalid date format. Must be YYYY-MM-DD",
    code: "INVALID_DATE_FORMAT"
  });
}

// Validate date is not in future
const dateObj = new Date(date);
const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
const todayIST = nowIST.toISOString().split('T')[0];

if (date > todayIST) {
  return response.status(400).json({
    ok: false,
    error: "Cannot submit data for future dates",
    code: "FUTURE_DATE_NOT_ALLOWED"
  });
}
```

---

#### 5. Add DSR Compilation Error Alerts (Q8: B+C)
**File:** `/functions/src/scheduled/dsrCompiler.ts`

**A. Add retry logic (lines 250-255):**
```typescript
} catch (error: any) {
  logger.error("Failed to compile DSR for user", {
    userId,
    errorMessage: error?.message || String(error),
    errorStack: error?.stack,
    errorCode: error?.code,
  });

  // Retry once after 5 seconds
  if (error?.code !== 'ALREADY_RETRIED') {
    logger.info(`Retrying DSR compilation for ${userId} in 5 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
    try {
      await compileDailySummary(userId, targetDate).then(summary =>
        saveDSRReport(summary, targetDate)
      );
      successCount++;
      logger.info(`✅ Retry successful for ${userId}`);
    } catch (retryError: any) {
      retryError.code = 'ALREADY_RETRIED';
      logger.error(`❌ Retry failed for ${userId}`, {
        errorMessage: retryError?.message
      });
      errorCount++;

      // Send alert notification
      await sendDSRFailureAlert(userId, targetDate, retryError);
    }
  } else {
    errorCount++;
  }
}
```

**B. Add alert function:**
```typescript
async function sendDSRFailureAlert(userId: string, date: string, error: any) {
  try {
    // Get user details
    const userDoc = await db.collection('users').doc(userId).get();
    const userName = userDoc.data()?.name || 'Unknown';

    // Create alert document for admin dashboard
    await db.collection('systemAlerts').add({
      type: 'DSR_COMPILATION_FAILURE',
      severity: 'high',
      userId,
      userName,
      date,
      error: error?.message || String(error),
      timestamp: Timestamp.now(),
      resolved: false
    });

    logger.warn(`🚨 Alert created for DSR failure: ${userName} (${date})`);
  } catch (alertError) {
    logger.error('Failed to create alert', {alertError});
  }
}
```

---

#### 6. Skip DSR for Zero-Activity Days (Q9: Option B)
**File:** `/functions/src/scheduled/dsrCompiler.ts` (lines 180-202)

**Change from:**
```typescript
// Always create DSR
const dsrReport: DSRReport = {
  ...
};
await db.collection("dsrReports").doc(reportId).set(dsrReport, {merge: true});
```

**Change to:**
```typescript
// Check if there's any activity
const hasActivity =
  summary.checkInAt ||
  summary.visitIds.length > 0 ||
  totalSheetsSold > 0 ||
  totalExpenses > 0;

if (!hasActivity) {
  logger.info(`Skipping DSR for ${summary.userId} - no activity on ${date}`);
  return; // Don't create DSR
}

// Create DSR only if there's activity
const dsrReport: DSRReport = {
  ...
};
await db.collection("dsrReports").doc(reportId).set(dsrReport, {merge: true});
logger.info(`DSR created for ${summary.userId}: ${status}`, {reportId, totalSheetsSold, totalExpenses});
```

---

#### 7. Remove Leads from DSR (Q10: Option B)
**Files:**
- `/functions/src/scheduled/dsrCompiler.ts` (lines 93-109)
- `/functions/src/types/index.ts` (DSRReport interface)
- Mobile screens that display leads count

**A. Remove leads query from compiler:**
```typescript
// DELETE these lines (93-109):
// 3. Get leads contacted (firstTouchAt = today)
try {
  const leadsSnapshot = await db...
  summary.leadIds = leadsSnapshot.docs.map((doc) => doc.id);
} catch (error) {
  logger.warn("Leads collection query failed (may not exist yet)", {error});
  summary.leadIds = [];
}
```

**B. Update DSRReport type:**
```typescript
// REMOVE from interface:
leadsContacted: number;
leadIds: string[];
```

**C. Remove from DSR save:**
```typescript
// DELETE these lines:
leadsContacted: summary.leadIds.length,
leadIds: summary.leadIds,
```

**Reason:** Leads not critical for V1, causes index errors

---

## Deployment Order

1. **Phase 1 - Critical Fixes (Deploy Today)**
   - [ ] Change sheets count to sum (Q1)
   - [ ] Change DSR time to 11:59 PM (Q4)
   - [ ] Add date validation (Q7)
   - [ ] Remove leads from DSR (Q10)

2. **Phase 2 - Locking Logic (Deploy Tomorrow)**
   - [ ] Add editing lock after 11:59 PM (Q4/Q5)
   - [ ] Test thoroughly with different timezones

3. **Phase 3 - Error Handling (Deploy This Week)**
   - [ ] Add retry logic (Q8)
   - [ ] Add alert system (Q8)
   - [ ] Skip zero-activity DSRs (Q9)

---

## Testing Checklist

### Before Deployment
- [ ] Test pending sheets count shows sum, not count
- [ ] Test DSR compiles at 11:59 PM (wait until tomorrow or manually trigger)
- [ ] Test date validation rejects "10/17/2025"
- [ ] Test date validation accepts "2025-10-17"
- [ ] Test cannot submit data after 11:59 PM
- [ ] Test DSR without leads compiles successfully

### After Deployment
- [ ] Verify no leads in DSR documents
- [ ] Verify zero-activity users don't get DSR
- [ ] Verify alerts created when DSR fails
- [ ] Verify retry happens once before alerting

---

## Estimated Time

- Phase 1: 2-3 hours (coding) + 1 hour (testing) = **4 hours**
- Phase 2: 3-4 hours (coding + timezone testing) = **4 hours**
- Phase 3: 4-5 hours (retry logic + alert system) = **5 hours**

**Total: ~13 hours** (spread over 2-3 days)

---

## Files to Modify

1. `/mobile/src/screens/StatsScreen.tsx` - Sheets count calculation
2. `/functions/src/scheduled/dsrCompiler.ts` - Time, zero-activity, remove leads, retry logic
3. `/functions/src/api/expenses.ts` - Date validation, editing lock
4. `/functions/src/api/sheetsSales.ts` - Date validation, editing lock
5. `/functions/src/types/index.ts` - Remove leads fields
6. Create: `/functions/src/utils/send-alert.ts` - Alert system

---

**Created**: Oct 17, 2025
**Status**: Ready to implement
**Priority**: Phase 1 first (critical for production)
