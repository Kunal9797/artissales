/**
 * Semantic Role Tokens
 * Map semantic meaning to base colors for consistency
 */

import { colors } from './colors';

export const roles = {
  // Success Role - confirmations, completed states
  success: {
    base: colors.success,
    bg: colors.successLight,
    text: colors.success,
    border: colors.success,
  },

  // Warning Role - alerts, pending states
  warning: {
    base: colors.warning,
    bg: colors.warningLight,
    text: colors.warningDark,
    border: colors.warning,
  },

  // Alias for backward compatibility
  warn: {
    base: colors.warning,
    bg: colors.warningLight,
    text: colors.warningDark,
    border: colors.warning,
  },

  // Error Role - errors, destructive actions
  error: {
    base: colors.error,
    bg: colors.errorLight,
    text: colors.error,
    border: colors.error,
  },

  // Info Role - informational messages
  info: {
    base: colors.info,
    bg: colors.infoLight,
    text: colors.info,
    border: colors.info,
  },

  // Neutral Role - default states
  neutral: {
    base: colors.text.secondary,
    bg: colors.surface,
    text: colors.text.primary,
    border: colors.border.default,
  },

  // Primary Role - brand actions
  primary: {
    base: colors.primary,
    bg: colors.primary,
    text: colors.text.inverse,
    border: colors.primary,
  },

  // Accent Role - highlights, special emphasis
  accent: {
    base: colors.accent,
    bg: colors.accentLight,
    text: colors.primary, // Dark text on light gold background
    border: colors.accent,
  },
} as const;

export type RoleKey = keyof typeof roles;
export type RoleVariant = keyof typeof roles.success;
