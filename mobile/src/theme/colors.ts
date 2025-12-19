/**
 * Artis Laminates Brand Colors
 * Supports Light and Dark mode
 */

// Accent color - using Antique Gold
const ANTIQUE_GOLD = '#C9A961';
const ANTIQUE_GOLD_DARK = '#B08D4A';
const ANTIQUE_GOLD_LIGHT = '#E0D4B8';

/**
 * Light Mode Colors (Default)
 */
export const lightColors = {
  // Brand Colors - Brand Background + Gold Accent
  primary: '#393735',        // Brand Background - main buttons, headers
  primaryDark: '#2A2725',    // Darker background for pressed states
  primaryLight: '#4F4B48',   // Lighter background for hover/disabled

  // Gold Accents
  accent: ANTIQUE_GOLD,
  accentDark: ANTIQUE_GOLD_DARK,
  accentLight: ANTIQUE_GOLD_LIGHT,

  // Neutral Colors
  background: '#FFFFFF',     // Main background
  surface: '#F8F8F8',        // Card backgrounds
  surfaceAlt: '#FAFAFA',     // Alternate surface (subtle variation)

  // Text Colors
  text: {
    primary: '#1A1A1A',      // Main text
    secondary: '#666666',    // Secondary text, descriptions
    tertiary: '#999999',     // Disabled text, placeholders
    inverse: '#FFFFFF',      // Text on dark backgrounds
  },

  // Border Colors
  border: {
    default: '#E0E0E0',      // Default borders
    light: '#F0F0F0',        // Subtle borders
    dark: '#CCCCCC',         // Stronger borders
    active: ANTIQUE_GOLD,    // Gold border for active/focused states
  },

  // Status Colors
  success: '#4CAF50',        // Success states, confirmations
  successLight: '#E8F5E9',   // Success backgrounds
  successDark: '#2E7D32',    // Darker green for success text (better contrast)

  warning: '#FFA726',        // Warnings, pending states
  warningLight: '#FFF3E0',   // Warning backgrounds
  warningDark: '#E65100',    // Darker orange for warning text (better contrast)

  error: '#EF5350',          // Errors, destructive actions
  errorLight: '#FFEBEE',     // Error backgrounds
  errorDark: '#C62828',      // Darker red for error text (better contrast)

  info: '#42A5F5',           // Info messages
  infoLight: '#E3F2FD',      // Info backgrounds

  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.5)',        // Modal overlays
  overlayLight: 'rgba(0, 0, 0, 0.25)',  // Lighter overlays

  // Shadow Colors
  shadow: 'rgba(0, 0, 0, 0.1)',         // Shadow for cards/elevation

  // Transparent
  transparent: 'transparent',
} as const;

/**
 * Dark Mode Colors
 * Material Design inspired dark theme with elevated surfaces
 */
export const darkColors = {
  // Brand Colors - Inverted for dark mode
  primary: '#C9A961',        // Gold becomes primary in dark mode (for buttons, accents)
  primaryDark: '#B08D4A',    // Darker gold for pressed states
  primaryLight: '#E0D4B8',   // Lighter gold for hover

  // Gold Accents - Same gold, works well on dark
  accent: ANTIQUE_GOLD,
  accentDark: ANTIQUE_GOLD_DARK,
  accentLight: '#4A4235',    // Muted gold for dark backgrounds

  // Neutral Colors - Material Design dark surfaces
  background: '#121212',     // Main background (true dark)
  surface: '#1E1E1E',        // Elevated cards (+1dp)
  surfaceAlt: '#252525',     // Higher elevation (+2dp)

  // Text Colors
  text: {
    primary: '#FFFFFF',      // Main text (high emphasis)
    secondary: '#B3B3B3',    // Secondary text (medium emphasis)
    tertiary: '#666666',     // Disabled text, placeholders
    inverse: '#1A1A1A',      // Text on light/gold backgrounds
  },

  // Border Colors
  border: {
    default: '#333333',      // Default borders
    light: '#2A2A2A',        // Subtle borders
    dark: '#444444',         // Stronger borders
    active: ANTIQUE_GOLD,    // Gold border for active/focused states
  },

  // Status Colors - Slightly adjusted for dark mode contrast
  success: '#66BB6A',        // Lighter green for dark bg
  successLight: '#1B3D1F',   // Dark green background
  successDark: '#81C784',    // Even lighter for text on dark bg

  warning: '#FFB74D',        // Lighter orange for dark bg
  warningLight: '#3D2E1A',   // Dark orange background
  warningDark: '#FFCC80',    // Even lighter for text

  error: '#EF5350',          // Red works on dark
  errorLight: '#3D1A1A',     // Dark red background
  errorDark: '#EF9A9A',      // Lighter red for text

  info: '#64B5F6',           // Lighter blue for dark bg
  infoLight: '#1A2D3D',      // Dark blue background

  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.7)',        // Darker overlays on dark
  overlayLight: 'rgba(0, 0, 0, 0.5)',   // Medium overlays

  // Shadow Colors - More prominent on dark
  shadow: 'rgba(0, 0, 0, 0.3)',

  // Transparent
  transparent: 'transparent',
} as const;

/**
 * Default export for backwards compatibility
 * Components using static imports will get light theme
 * For dynamic theming, use useTheme() hook
 */
export const colors = lightColors;

// Type helpers - use interface for compatibility between light/dark
export interface Colors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: {
    default: string;
    light: string;
    dark: string;
    active: string;
  };
  success: string;
  successLight: string;
  successDark: string;
  warning: string;
  warningLight: string;
  warningDark: string;
  error: string;
  errorLight: string;
  errorDark: string;
  info: string;
  infoLight: string;
  overlay: string;
  overlayLight: string;
  shadow: string;
  transparent: string;
}

export type ColorKey = keyof Colors;
