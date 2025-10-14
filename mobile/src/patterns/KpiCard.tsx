/**
 * KpiCard Pattern
 * Displays key performance indicator with auto-colored delta
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { colors, spacing, typography, roles } from '../theme';

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
      <TrendingUp size={16} color={iconColor} />
    ) : (
      <TrendingDown size={16} color={iconColor} />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {icon && <View style={styles.iconContainer}>{icon}</View>}
      </View>
      <Text style={styles.value}>{value}</Text>
      {delta && (
        <View style={styles.deltaContainer}>
          {getDeltaIcon()}
          <Text style={[styles.deltaText, { color: getDeltaColor() }]}>
            {Math.abs(delta.value)}%
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
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    minWidth: 150,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.styles.labelSmall,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  iconContainer: {
    marginLeft: spacing.xs,
  },
  value: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  deltaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  deltaText: {
    ...typography.styles.labelSmall,
    fontWeight: typography.fontWeight.semiBold,
  },
});
