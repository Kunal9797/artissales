/**
 * Spinner Component
 * Standardized loading indicator with consistent sizing
 */

import React from 'react';
import { ActivityIndicator, ActivityIndicatorProps, StyleSheet } from 'react-native';
import { colors, roles } from '../theme';
import type { RoleKey } from '../theme';

export interface SpinnerProps {
  /**
   * Size variant
   * - sm: 16px (for inline text)
   * - md: 24px (default, for cards/buttons)
   * - lg: 32px (for full-screen loading)
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Color tone - uses role tokens or theme colors
   */
  tone?: 'primary' | 'accent' | RoleKey;

  /**
   * Additional ActivityIndicator props
   */
  activityIndicatorProps?: Omit<ActivityIndicatorProps, 'size' | 'color'>;
}

const SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 32,
} as const;

export function Spinner({ size = 'md', tone = 'primary', activityIndicatorProps }: SpinnerProps) {
  // Map tone to color
  const color = tone === 'primary'
    ? colors.primary
    : tone === 'accent'
    ? colors.accent
    : roles[tone as RoleKey]?.base || colors.primary;

  return (
    <ActivityIndicator
      size={SIZE_MAP[size]}
      color={color}
      {...activityIndicatorProps}
    />
  );
}
