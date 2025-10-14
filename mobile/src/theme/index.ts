/**
 * Theme - Single Source of Truth
 * Export all design tokens from one place
 */

export { colors } from './colors';
export { typography } from './typography';
export { spacing, spacingMultiplier } from './spacing';
export { shadows } from './shadows';
export { roles } from './roles';
export { states, applyState } from './states';

// Re-export types
export type {
  Theme,
  ColorKey,
  RoleKey,
  RoleVariant,
  StateKey,
  RoleProps,
  StateProps,
  ComponentSize,
  ComponentVariant,
  StatusType,
} from './tokens.d';

// Re-export everything as a single theme object for convenience
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { shadows } from './shadows';
import { roles } from './roles';
import { states } from './states';

export const theme = {
  colors,
  typography,
  spacing,
  shadows,
  roles,
  states,
} as const;

export type ThemeType = typeof theme;
