/**
 * EmptyState Pattern
 * Shows when no data is available with optional action
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, typography } from '../theme';

export interface EmptyStateProps {
  /** Icon (Lucide component or custom element) */
  icon?: ReactNode;
  /** Main title */
  title: string;
  /** Subtitle text */
  subtitle?: string;
  /** Primary action button */
  primaryAction?: {
    label: string;
    onPress: () => void;
  };
}

export function EmptyState({ icon, title, subtitle, primaryAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {primaryAction && (
        <TouchableOpacity style={styles.button} onPress={primaryAction.onPress}>
          <Text style={styles.buttonText}>{primaryAction.label}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
  },
  iconContainer: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.styles.h4,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    marginTop: spacing.md,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    ...typography.styles.button,
    color: '#fff',
  },
});
