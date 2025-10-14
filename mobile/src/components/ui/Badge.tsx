/**
 * Badge Component
 * Role-based status badges with consistent styling
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { roles, typography, spacing } from '../theme';
import type { RoleKey } from '../theme';

export interface BadgeProps {
  /**
   * Variant based on semantic roles
   */
  variant?: 'neutral' | RoleKey;

  /**
   * Size variant
   */
  size?: 'sm' | 'md';

  /**
   * Optional icon (React element)
   */
  icon?: React.ReactNode;

  /**
   * Badge content (text)
   */
  children: React.ReactNode;

  /**
   * Additional styles
   */
  style?: ViewStyle;
}

export function Badge({
  variant = 'neutral',
  size = 'md',
  icon,
  children,
  style,
}: BadgeProps) {
  // Get colors from role tokens
  const getRoleColors = () => {
    if (variant === 'neutral') {
      return {
        bg: '#ECECEC',
        text: '#666666',
        border: '#CCCCCC',
      };
    }

    const role = roles[variant];
    return {
      bg: role.bg,
      text: role.text,
      border: role.border,
    };
  };

  const { bg, text, border } = getRoleColors();

  const containerStyle: ViewStyle = [
    styles.container,
    size === 'sm' ? styles.containerSm : styles.containerMd,
    {
      backgroundColor: bg,
      borderColor: border,
    },
    style,
  ] as ViewStyle;

  const textStyle: TextStyle = [
    styles.text,
    size === 'sm' ? styles.textSm : styles.textMd,
    { color: text },
  ] as TextStyle;

  return (
    <View style={containerStyle}>
      {icon && <View style={styles.icon}>{icon}</View>}
      <Text style={textStyle}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999, // pill shape
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  containerSm: {
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs / 2,
  },
  containerMd: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs / 2,
  },
  text: {
    ...typography.styles.caption,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 12,
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
