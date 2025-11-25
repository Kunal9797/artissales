# Session Changes - November 25, 2025

**Single Source of Truth** for all changes made during this development session.

---

## Overview

This session focused on:
1. **Firebase Analytics integration** - Event tracking, screen views, user properties
2. **Firebase Crashlytics integration** - Crash reporting, error logging
3. **Fixing Crashlytics crash** - Missing Gradle plugin configuration
4. **Dev testing tools** - Test buttons and debug helpers

---

## 1. Firebase Analytics Added

### New File: `mobile/src/services/analytics.ts`

Centralized analytics service with:

| Function | Purpose |
|----------|---------|
| `trackEvent()` | Log custom events (login, visit_logged, etc.) |
| `trackScreenView()` | Log screen views |
| `setAnalyticsUser()` | Set user ID and properties |
| `clearAnalyticsUser()` | Clear on logout |
| `trackVisitLogged()` | Convenience for visit events |
| `trackSheetsLogged()` | Convenience for sheets events |
| `trackExpenseSubmitted()` | Convenience for expense events |
| `trackItemReviewed()` | Convenience for manager approval events |

### Event Types Defined:
```typescript
type AnalyticsEvent =
  | 'login_completed'
  | 'logout'
  | 'visit_logged'
  | 'sheets_logged'
  | 'expense_submitted'
  | 'item_approved'
  | 'item_rejected'
  | 'photo_capture_failed'
  | 'sync_failed'
  | 'app_opened';
```

---

## 2. Firebase Crashlytics Added

### Crashlytics Functions in `analytics.ts`:

| Function | Purpose |
|----------|---------|
| `logError()` | Record non-fatal errors |
| `logMessage()` | Add breadcrumb messages to crash timeline |
| `setCrashlyticsAttribute()` | Set custom key-value attributes |
| `testCrash()` | DEV ONLY: Force test crash |
| `testNonFatalError()` | DEV ONLY: Send test error |

### Logger Integration (`mobile/src/utils/logger.ts`):

Updated logger to automatically send to Crashlytics in production:

```typescript
// In production, errors are sent to Crashlytics
logger.error('PhotoUpload', error); // → recordError()

// Breadcrumbs add context to crash reports
logger.breadcrumb('User tapped submit'); // → crashlytics.log()
```

Uses lazy-loading to avoid import chain issues at startup.

---

## 3. Crashlytics Crash Fix

### Problem
App crashed immediately on startup with:
```
FATAL EXCEPTION: main
The Crashlytics build ID is missing. This occurs when the Crashlytics Gradle
plugin is missing from your app's build configuration.
```

### Root Cause
The `@react-native-firebase/crashlytics` package requires the Crashlytics Gradle plugin to be configured in Android build files.

### Fix Applied

**File: `android/build.gradle`**
```gradle
dependencies {
    classpath 'com.google.gms:google-services:4.4.1'
    classpath 'com.google.firebase:firebase-crashlytics-gradle:3.0.3'  // Added
    // ...
}
```

**File: `android/app/build.gradle`**
```gradle
apply plugin: 'com.google.gms.google-services'
apply plugin: 'com.google.firebase.crashlytics'  // Added
```

---

## 4. Debug Mode Configuration

### New File: `mobile/firebase.json`
```json
{
  "react-native": {
    "crashlytics_debug_enabled": true,
    "crashlytics_auto_collection_enabled": true
  }
}
```

By default, Crashlytics is disabled in debug mode. This config enables it for testing.

---

## 5. Dev Testing Button

Added a dev-only "Test Crashlytics" button to HomeScreen:

**File: `mobile/src/screens/HomeScreen_v2.tsx`**
- Import `testNonFatalError` from analytics
- Orange button at bottom of home screen (only in `__DEV__` mode)
- Sends test non-fatal error to Crashlytics
- Shows confirmation alert

---

## 6. Integration Points

### Screens with Analytics:

| Screen | Events Tracked |
|--------|----------------|
| `useAuth.ts` | `login_completed`, `logout`, user properties |
| `RootNavigator.tsx` | Screen views via navigation state |
| `LogVisitScreen.tsx` | `visit_logged` |
| `CompactSheetsEntryScreen.tsx` | `sheets_logged` |
| `ExpenseEntryScreen.tsx` | `expense_submitted` |
| `ReviewHomeScreen.tsx` | `item_approved`, `item_rejected` |
| `ErrorBoundary.tsx` | `logError` for uncaught errors |

### User Properties Set:
- `user_role`: rep, area_manager, zonal_head, etc.
- `territory`: User's assigned territory
- `userId`: Firebase Auth UID

---

## 7. Files Modified Summary

### New Files:
| File | Purpose |
|------|---------|
| `mobile/src/services/analytics.ts` | Analytics/Crashlytics service |
| `mobile/firebase.json` | Firebase debug configuration |

### Modified Files:
| File | Change |
|------|--------|
| `mobile/src/utils/logger.ts` | Lazy-load analytics, send errors to Crashlytics |
| `mobile/src/hooks/useAuth.ts` | Track login/logout, set user properties |
| `mobile/src/navigation/RootNavigator.tsx` | Track screen views |
| `mobile/src/screens/visits/LogVisitScreen.tsx` | Track visit_logged |
| `mobile/src/screens/sheets/CompactSheetsEntryScreen.tsx` | Track sheets_logged |
| `mobile/src/screens/expenses/ExpenseEntryScreen.tsx` | Track expense_submitted |
| `mobile/src/screens/manager/ReviewHomeScreen.tsx` | Track approve/reject |
| `mobile/src/providers/ErrorBoundary.tsx` | Log uncaught errors |
| `mobile/src/screens/HomeScreen_v2.tsx` | Dev test button |
| `mobile/android/build.gradle` | Crashlytics Gradle classpath |
| `mobile/android/app/build.gradle` | Crashlytics plugin apply |

---

## 8. Firebase Console Setup

### To View Analytics:
1. Firebase Console → Analytics → Events
2. Real-time data available within minutes
3. Full reports within 24 hours

### To View Crashlytics:
1. Firebase Console → Crashlytics
2. Click "Add SDK" if prompted (SDK is already added)
3. Crashes appear after first crash is sent
4. Non-fatal errors appear under "Non-fatals" tab

---

## 9. Testing Checklist

### Analytics
- [ ] Login triggers `login_completed` event
- [ ] Logout triggers `logout` event
- [ ] Screen navigation triggers screen_view events
- [ ] Visit submission triggers `visit_logged`
- [ ] Sheets submission triggers `sheets_logged`
- [ ] Expense submission triggers `expense_submitted`
- [ ] Manager approval triggers `item_approved`

### Crashlytics
- [ ] Test button sends non-fatal error
- [ ] Errors appear in Firebase Console (2-5 min delay)
- [ ] User ID is set in crash reports
- [ ] ErrorBoundary catches and logs React errors

---

## 10. Known Limitations

1. **Crashlytics debug mode**: Enabled via firebase.json for testing. Consider disabling in production if too noisy.

2. **Analytics delay**: Events may take up to 24 hours to appear in full reports (real-time view is faster).

3. **First crash requirement**: Crashlytics dashboard won't fully activate until first crash/error is received.

---

**Last Updated:** November 25, 2025
**Session Focus:** Analytics & Crashlytics Integration
