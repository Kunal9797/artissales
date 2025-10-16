/**
 * Feature Colors for Hybrid Color Strategy
 *
 * Provides category-specific colors for visual separation and faster recognition.
 * Each feature gets its own color to help users scan and navigate quickly.
 *
 * Usage:
 * - Icon backgrounds: featureColors.attendance.light
 * - Icon colors: featureColors.attendance.primary
 * - Progress bars: featureColors.sheets.primary
 * - Badges: featureColors.visits.primary
 */

export const featureColors = {
  /**
   * Attendance - Green
   * Psychology: Active, present, verified, "go"
   * Used for: Attendance screens, check-in/out buttons, status badges
   */
  attendance: {
    primary: '#2E7D32',      // Deep green
    light: '#E8F5E9',        // Very light green (for backgrounds)
    dark: '#1B5E20',         // Darker green (for pressed states)
  },

  /**
   * Visits - Blue
   * Psychology: Trust, professionalism, external relationships
   * Used for: Visit logging, client interactions, distributor/dealer cards
   */
  visits: {
    primary: '#1976D2',      // Professional blue
    light: '#E3F2FD',        // Very light blue
    dark: '#0D47A1',         // Darker blue
  },

  /**
   * Sheet Sales - Orange
   * Psychology: Energy, achievement, revenue generation
   * Used for: Sales entry, target progress, revenue metrics
   */
  sheets: {
    primary: '#EF6C00',      // Deep orange (not too bright)
    light: '#FFF3E0',        // Very light orange
    dark: '#E65100',         // Darker orange
  },

  /**
   * Expenses - Purple
   * Psychology: Money management, careful spending
   * Used for: Expense entry, expense reports, approval screens
   */
  expenses: {
    primary: '#6A1B9A',      // Deep purple
    light: '#F3E5F5',        // Very light purple
    dark: '#4A148C',         // Darker purple
  },

  /**
   * DSR (Daily Sales Report) - Cyan
   * Psychology: Data, information, reporting
   * Used for: DSR screens, report generation, analytics
   */
  dsr: {
    primary: '#0277BD',      // Deep cyan
    light: '#E0F7FA',        // Very light cyan
    dark: '#01579B',         // Darker cyan
  },

  /**
   * Documents - Blue-gray
   * Psychology: Neutral, reference material, static resources
   * Used for: Document library, downloads, help resources
   */
  documents: {
    primary: '#546E7A',      // Blue-gray
    light: '#ECEFF1',        // Very light blue-gray
    dark: '#37474F',         // Darker blue-gray
  },

  /**
   * Leads (Future) - Teal
   * Psychology: Growth, opportunity, new connections
   * Used for: Lead management, new opportunities, SLA tracking
   */
  leads: {
    primary: '#00796B',      // Deep teal
    light: '#E0F2F1',        // Very light teal
    dark: '#004D40',         // Darker teal
  },
} as const;

/**
 * Helper function to get feature color by feature name
 * Useful for dynamic color selection based on feature type
 */
export const getFeatureColor = (
  feature: keyof typeof featureColors,
  variant: 'primary' | 'light' | 'dark' = 'primary'
): string => {
  return featureColors[feature][variant];
};

/**
 * Type helper for autocomplete
 */
export type FeatureColorKey = keyof typeof featureColors;
export type FeatureColorVariant = 'primary' | 'light' | 'dark';
