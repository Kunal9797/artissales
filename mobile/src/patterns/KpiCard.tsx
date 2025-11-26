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

  // Dynamic font size based on value length
  const getDynamicFontSize = () => {
    const valueStr = String(value);
    const length = valueStr.length;

    if (length <= 3) return 36;      // 0-999: Large, impactful
    if (length === 4) return 30;      // 1000-9999: Slightly smaller
    if (length === 5) return 26;      // 10000-99999: More compact
    return 22;                         // 100000+: Very compact
  };

  // Dynamic letter spacing (tighter for smaller fonts)
  const getDynamicLetterSpacing = () => {
    const fontSize = getDynamicFontSize();
    if (fontSize >= 36) return -1;
    if (fontSize >= 30) return -0.8;
    if (fontSize >= 26) return -0.6;
    return -0.5;
  };

  return (
    <View style={[styles.container, shadows.md]}>
      {/* Icon Section - Centered */}
      {icon && (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      )}

      {/* Value - Large and centered, always single line */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.value,
          {
            fontSize: getDynamicFontSize(),
            letterSpacing: getDynamicLetterSpacing(),
            lineHeight: getDynamicFontSize() + 4,
          }
        ]}
      >
        {value}
      </Text>

      {/* Title - Centered below value */}
      <Text style={styles.title}>{title}</Text>

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
    borderRadius: spacing.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 110,
  },
  iconContainer: {
    marginBottom: spacing.xs,
    alignItems: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  value: {
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
    textAlign: 'center',
  },
  deltaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginTop: spacing.xs / 2,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: typography.fontWeight.semiBold,
  },
});
