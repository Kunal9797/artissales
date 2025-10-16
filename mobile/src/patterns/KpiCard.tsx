/**
 * KpiCard Pattern
 * Displays key performance indicator with auto-colored delta
 * Enhanced with modern styling and optional accent colors
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { colors, spacing, typography, roles, shadows } from '../theme';

export interface KpiCardProps {
  /** KPI title */
  title: string;
  /** KPI value */
  value: string | number;
  /** Delta change */
  delta?: {
    value: number;
    positiveIsGood: boolean;
  };
  /** Optional icon */
  icon?: ReactNode;
}

export function KpiCard({ title, value, delta, icon }: KpiCardProps) {
  const getDeltaColor = () => {
    if (!delta) return colors.text.secondary;
    const isPositive = delta.value > 0;
    const isGood = delta.positiveIsGood ? isPositive : !isPositive;
    return isGood ? roles.success.base : roles.error.base;
  };

  const getDeltaIcon = () => {
    if (!delta) return null;
    const isPositive = delta.value > 0;
    const iconColor = getDeltaColor();
    return isPositive ? (
      <TrendingUp size={14} color={iconColor} />
    ) : (
      <TrendingDown size={14} color={iconColor} />
    );
  };

  return (
    <View style={[styles.container, shadows.sm]}>
      {/* Icon Section */}
      {icon && (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      )}

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Value */}
      <Text style={styles.value}>
        {value}
      </Text>

      {/* Delta */}
      {delta && (
        <View style={styles.deltaContainer}>
          {getDeltaIcon()}
          <Text style={[styles.deltaText, { color: getDeltaColor() }]}>
            {delta.value > 0 ? '+' : ''}{delta.value}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    flex: 1,
    minHeight: 80,
  },
  iconContainer: {
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 11,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs / 2,
  },
  value: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  deltaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semiBold,
  },
});
