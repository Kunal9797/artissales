/**
 * Card Component
 * Reusable card container for content
 * Enhanced with better press states and modern styling
 */

import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ViewStyle,
  Animated,
} from 'react-native';
import { colors, spacing, shadows } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  style,
  elevation = 'md',
  padding = 'md',
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return spacing.sm;
      case 'md':
        return spacing.cardPadding;
      case 'lg':
        return spacing.lg;
      default:
        return spacing.cardPadding;
    }
  };

  const baseStyles: ViewStyle[] = [
    styles.base,
    shadows[elevation],
    { padding: getPadding() },
  ];

  if (style) {
    baseStyles.push(style);
  }

  // If onPress is provided, use Pressable
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          ...baseStyles,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  // Otherwise, just a View
  return <View style={baseStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
});
