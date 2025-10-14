/**
 * Artis Laminates Brand Colors
 * Extracted from brand guidelines and logo
 */

export const colors = {
  // Brand Colors - Brand Background + Yellower Gold
  primary: '#393735',        // Brand Background - main buttons, headers
  primaryDark: '#2A2725',    // Darker background for pressed states
  primaryLight: '#4F4B48',   // Lighter background for hover/disabled

  // Gold Accents (yellower than original)
  accent: '#D4A944',         // Yellower gold for highlights, icons, badges
  accentDark: '#B8935F',     // Darker gold
  accentLight: '#E8C977',    // Lighter gold for backgrounds

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
    active: '#D4A944',       // Gold border for active/focused states
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

// Type helper for autocomplete
export type ColorKey = keyof typeof colors;
