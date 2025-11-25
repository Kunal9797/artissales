/**
 * Logger Utility
 * Conditionally logs based on environment
 *
 * In development: All logs visible
 * In production: Only errors visible + sent to Crashlytics
 */

const isDev = __DEV__;

// Lazy-load analytics to avoid import chain issues at startup
// Analytics may not be ready when logger is first imported
let analyticsModule: typeof import('../services/analytics') | null = null;

const getAnalytics = () => {
  if (!analyticsModule) {
    try {
      analyticsModule = require('../services/analytics');
    } catch (e) {
      console.warn('[Logger] Analytics not available yet');
    }
  }
  return analyticsModule;
};

export const logger = {
  /**
   * Debug/info logs - only in development
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Info logs - only in development
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Warning logs - only in development
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Error logs - ALWAYS visible + sent to Crashlytics in production
   * @param context - Optional context string (e.g., 'API:fetchUser', 'LogVisitScreen')
   * @param args - Error details (first arg can be Error object)
   */
  error: (context: string, ...args: any[]) => {
    console.error(`[${context}]`, ...args);

    // Send to Crashlytics in production
    if (!isDev) {
      try {
        const analytics = getAnalytics();
        if (analytics?.logError) {
          const firstArg = args[0];
          if (firstArg instanceof Error) {
            analytics.logError(firstArg, context);
          } else {
            // Create an error from the message for stack trace
            const message = args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
            analytics.logError(new Error(message), context);
          }
        }
      } catch (e) {
        // Silently fail - don't crash the app due to logging
      }
    }
  },

  /**
   * Debug logs with prefix - only in development
   */
  debug: (prefix: string, ...args: any[]) => {
    if (isDev) {
      console.log(`[${prefix}]`, ...args);
    }
  },

  /**
   * Breadcrumb logging - logs to Crashlytics timeline
   * Use for important state transitions (login, navigation, API calls)
   */
  breadcrumb: (message: string) => {
    if (isDev) {
      console.log(`[Breadcrumb] ${message}`);
    }
    try {
      const analytics = getAnalytics();
      if (analytics?.logMessage) {
        analytics.logMessage(message);
      }
    } catch (e) {
      // Silently fail - don't crash the app due to logging
    }
  },
};
