/**
 * Logger Utility
 * Conditionally logs based on environment
 *
 * In development: All logs visible
 * In production: Only errors visible (for Crashlytics integration)
 */

const isDev = __DEV__;

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
   * Error logs - ALWAYS visible (for production error tracking)
   * These should be integrated with Crashlytics/Sentry
   */
  error: (...args: any[]) => {
    console.error(...args);
    // TODO: Send to Crashlytics/Sentry in production
  },

  /**
   * Debug logs with prefix - only in development
   */
  debug: (prefix: string, ...args: any[]) => {
    if (isDev) {
      console.log(`[${prefix}]`, ...args);
    }
  },
};
