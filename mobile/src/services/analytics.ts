/**
 * Analytics Service
 *
 * Centralized service for Firebase Analytics and Crashlytics.
 * Provides event tracking, user identification, and error logging.
 *
 * Uses modular Firebase API (v9+ style) to avoid deprecation warnings.
 */

import {
  getAnalytics,
  logEvent,
  setUserId as setAnalyticsUserId,
  setUserProperty,
  logScreenView,
} from '@react-native-firebase/analytics';
import type { FirebaseAnalyticsTypes } from '@react-native-firebase/analytics';

import {
  getCrashlytics,
  recordError,
  log as crashlyticsLog,
  setUserId as setCrashlyticsUserId,
  setAttributes,
  setAttribute,
  crash,
} from '@react-native-firebase/crashlytics';
import type { FirebaseCrashlyticsTypes } from '@react-native-firebase/crashlytics';

// ============================================================================
// Safe Module Accessors
// ============================================================================

// Track if modules are available (they might not be during early startup)
let analyticsAvailable = true;
let crashlyticsAvailable = true;

// Cached instances
let analyticsInstance: FirebaseAnalyticsTypes.Module | null = null;
let crashlyticsInstance: FirebaseCrashlyticsTypes.Module | null = null;

/**
 * Safely get analytics instance. Returns null if not available.
 */
const getAnalyticsInstance = (): FirebaseAnalyticsTypes.Module | null => {
  if (!analyticsAvailable) return null;
  if (analyticsInstance) return analyticsInstance;
  try {
    analyticsInstance = getAnalytics();
    return analyticsInstance;
  } catch (e) {
    analyticsAvailable = false;
    console.warn('[Analytics] Module not available:', e);
    return null;
  }
};

/**
 * Safely get crashlytics instance. Returns null if not available.
 */
const getCrashlyticsInstance = (): FirebaseCrashlyticsTypes.Module | null => {
  if (!crashlyticsAvailable) return null;
  if (crashlyticsInstance) return crashlyticsInstance;
  try {
    crashlyticsInstance = getCrashlytics();
    return crashlyticsInstance;
  } catch (e) {
    crashlyticsAvailable = false;
    console.warn('[Crashlytics] Module not available:', e);
    return null;
  }
};

// ============================================================================
// Types
// ============================================================================

/**
 * Event names for analytics tracking.
 * Keep this list small and focused on actionable insights.
 */
export type AnalyticsEvent =
  // Auth events
  | 'login_completed'
  | 'logout'
  // Core business events
  | 'visit_logged'
  | 'sheets_logged'
  | 'expense_submitted'
  // Manager events
  | 'item_approved'
  | 'item_rejected'
  // Error events
  | 'photo_capture_failed'
  | 'sync_failed'
  // App lifecycle
  | 'app_opened';

/**
 * User properties for segmentation in Analytics.
 */
export interface UserProperties {
  role: 'rep' | 'area_manager' | 'zonal_head' | 'national_head' | 'admin';
  territory?: string;
  reportsToUserId?: string;
}

// ============================================================================
// Analytics Functions
// ============================================================================

/**
 * Log a custom analytics event.
 * @param eventName - One of the predefined event names
 * @param params - Optional event parameters (max 25 params, values < 100 chars)
 */
export const trackEvent = async (
  eventName: AnalyticsEvent,
  params?: Record<string, string | number | boolean>
): Promise<void> => {
  try {
    const instance = getAnalyticsInstance();
    if (instance) {
      await logEvent(instance, eventName, params);
    }
  } catch (error) {
    // Don't let analytics errors crash the app
    if (__DEV__) {
      console.warn('[Analytics] Failed to log event:', eventName, error);
    }
  }
};

/**
 * Log a screen view event.
 * Call this when a screen becomes visible.
 * @param screenName - Name of the screen (e.g., 'HomeScreen', 'LogVisitScreen')
 * @param screenClass - Optional class name for the screen
 */
export const trackScreenView = async (
  screenName: string,
  screenClass?: string
): Promise<void> => {
  try {
    const instance = getAnalyticsInstance();
    if (instance) {
      await logScreenView(instance, {
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[Analytics] Failed to log screen view:', screenName, error);
    }
  }
};

/**
 * Set the current user for analytics and crash reporting.
 * Call this after login and when user properties change.
 * @param userId - Firebase Auth UID
 * @param properties - User properties for segmentation
 */
export const setAnalyticsUser = async (
  userId: string,
  properties: UserProperties
): Promise<void> => {
  try {
    const analytics = getAnalyticsInstance();
    const crashlytics = getCrashlyticsInstance();

    // Set user ID for both Analytics and Crashlytics
    if (analytics) {
      await setAnalyticsUserId(analytics, userId);
      await setUserProperty(analytics, 'user_role', properties.role);
      if (properties.territory) {
        await setUserProperty(analytics, 'territory', properties.territory);
      }
    }

    if (crashlytics) {
      await setCrashlyticsUserId(crashlytics, userId);
      await setAttributes(crashlytics, {
        role: properties.role,
        territory: properties.territory || 'unknown',
      });
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[Analytics] Failed to set user:', error);
    }
  }
};

/**
 * Clear user data on logout.
 */
export const clearAnalyticsUser = async (): Promise<void> => {
  try {
    const instance = getAnalyticsInstance();
    if (instance) {
      await setAnalyticsUserId(instance, null);
    }
    // Note: Crashlytics userId persists until next setUserId call
  } catch (error) {
    if (__DEV__) {
      console.warn('[Analytics] Failed to clear user:', error);
    }
  }
};

// ============================================================================
// Crashlytics Functions
// ============================================================================

/**
 * Log a non-fatal error to Crashlytics.
 * Use this for caught errors that don't crash the app.
 * @param error - The error object
 * @param context - Optional context about where/why the error occurred
 */
export const logError = (
  error: Error | unknown,
  context?: string
): void => {
  try {
    const instance = getCrashlyticsInstance();
    if (!instance) return;

    if (context) {
      crashlyticsLog(instance, `Context: ${context}`);
    }

    if (error instanceof Error) {
      recordError(instance, error);
    } else {
      // Convert non-Error objects to Error
      recordError(instance, new Error(String(error)));
    }
  } catch (e) {
    // Crashlytics itself failed - just log to console
    if (__DEV__) {
      console.warn('[Crashlytics] Failed to record error:', e);
    }
  }
};

/**
 * Log a message to Crashlytics.
 * These messages appear in the crash report timeline.
 * @param message - The message to log
 */
export const logMessage = (message: string): void => {
  try {
    const instance = getCrashlyticsInstance();
    if (instance) {
      crashlyticsLog(instance, message);
    }
  } catch (e) {
    if (__DEV__) {
      console.warn('[Crashlytics] Failed to log message:', e);
    }
  }
};

/**
 * Set a custom key-value attribute for crash reports.
 * Use sparingly - max 64 key-value pairs.
 * @param key - Attribute key
 * @param value - Attribute value
 */
export const setCrashlyticsAttribute = (
  key: string,
  value: string
): void => {
  try {
    const instance = getCrashlyticsInstance();
    if (instance) {
      setAttribute(instance, key, value);
    }
  } catch (e) {
    if (__DEV__) {
      console.warn('[Crashlytics] Failed to set attribute:', e);
    }
  }
};

// ============================================================================
// Convenience Event Loggers
// ============================================================================

/**
 * Track visit logged event with relevant parameters.
 */
export const trackVisitLogged = (params: {
  accountType: string;
  hasPhoto: boolean;
  purpose?: string;
}): Promise<void> => {
  return trackEvent('visit_logged', {
    account_type: params.accountType,
    has_photo: params.hasPhoto,
    purpose: params.purpose || 'unknown',
  });
};

/**
 * Track sheets logged event with relevant parameters.
 */
export const trackSheetsLogged = (params: {
  catalog: string;
  count: number;
}): Promise<void> => {
  return trackEvent('sheets_logged', {
    catalog: params.catalog,
    count: params.count,
  });
};

/**
 * Track expense submitted event with relevant parameters.
 */
export const trackExpenseSubmitted = (params: {
  category: string;
  amount: number;
  hasReceipt: boolean;
}): Promise<void> => {
  return trackEvent('expense_submitted', {
    category: params.category,
    amount: params.amount,
    has_receipt: params.hasReceipt,
  });
};

/**
 * Track item approved/rejected event (for managers).
 */
export const trackItemReviewed = (params: {
  approved: boolean;
  itemType: 'sheets' | 'expense';
  hoursPending?: number;
  reasonLength?: number;
}): Promise<void> => {
  const eventName = params.approved ? 'item_approved' : 'item_rejected';
  return trackEvent(eventName, {
    item_type: params.itemType,
    hours_pending: params.hoursPending || 0,
    reason_length: params.reasonLength || 0,
  });
};

/**
 * Track photo capture failure.
 */
export const trackPhotoCaptureFailure = (params: {
  screen: string;
  errorType: string;
}): Promise<void> => {
  return trackEvent('photo_capture_failed', {
    screen: params.screen,
    error_type: params.errorType,
  });
};

/**
 * Track sync failure.
 */
export const trackSyncFailure = (params: {
  operation: string;
  errorCode?: string;
}): Promise<void> => {
  return trackEvent('sync_failed', {
    operation: params.operation,
    error_code: params.errorCode || 'unknown',
  });
};

// ============================================================================
// Testing Functions (DEV ONLY)
// ============================================================================

/**
 * Force a test crash to activate Crashlytics dashboard.
 * WARNING: This WILL crash the app! Only use for testing.
 */
export const testCrash = (): void => {
  if (__DEV__) {
    console.log('[Crashlytics] Triggering test crash in 2 seconds...');
    setTimeout(() => {
      const instance = getCrashlyticsInstance();
      if (instance) {
        crash(instance);
      }
    }, 2000);
  } else {
    console.warn('[Crashlytics] testCrash is disabled in production');
  }
};

/**
 * Send a test non-fatal error to Crashlytics.
 * Use this to verify Crashlytics is working without crashing the app.
 */
export const testNonFatalError = (): void => {
  const instance = getCrashlyticsInstance();
  if (instance) {
    crashlyticsLog(instance, 'Test non-fatal error triggered');
    recordError(instance, new Error('Test non-fatal error from Artis Sales app'));
    console.log('[Crashlytics] Test non-fatal error sent - check Firebase Console in a few minutes');
  }
};
