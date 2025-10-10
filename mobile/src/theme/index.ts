/**
 * Theme - Single Source of Truth
 * Export all design tokens from one place
 */

export { colors } from './colors';
export { typography } from './typography';
export { spacing, spacingMultiplier } from './spacing';
export { shadows } from './shadows';

// Re-export everything as a single theme object for convenience
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';

export const theme = {
  colors,
  typography,
  spacing,
  shadows,
} as const;

export type Theme = typeof theme;
