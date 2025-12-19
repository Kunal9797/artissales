/**
 * Theme - Single Source of Truth
 * Export all design tokens from one place
 */

// Colors (static exports for backwards compatibility)
export { colors, lightColors, darkColors } from './colors';
export type { Colors, ColorKey } from './colors';

// Theme context for dynamic theming
export { ThemeProvider, useTheme, useThemeColors, useIsDarkMode } from './ThemeContext';
export type { ThemeMode } from './ThemeContext';

// Other tokens
export { typography } from './typography';
export { spacing, spacingMultiplier } from './spacing';
export { shadows } from './shadows';
export { roles } from './roles';
export { states, applyState } from './states';
export { featureColors, getFeatureColor } from './featureColors';
export { themeConfig, runtimeConfig, resetThemeConfig } from './config';

// Re-export types (ColorKey already exported from colors.ts)
export type {
  Theme,
  RoleKey,
  RoleVariant,
  StateKey,
  RoleProps,
  StateProps,
  ComponentSize,
  ComponentVariant,
  StatusType,
} from './tokens.d';
export type { FeatureColorKey, FeatureColorVariant } from './featureColors';

// Re-export everything as a single theme object for convenience
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';
import { roles } from './roles';
import { states } from './states';
import { featureColors } from './featureColors';
import { themeConfig } from './config';

export const theme = {
  colors,
  typography,
  spacing,
  shadows,
  roles,
  states,
  featureColors,
  themeConfig,
} as const;

export type ThemeType = typeof theme;
