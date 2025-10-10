/**
 * Button Component
 * Reusable button with multiple variants, icons, and loading states
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors, typography, spacing, shadows } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) => {
  const getButtonStyle = (): ViewStyle[] => {
    const baseStyles: ViewStyle[] = [styles.base];

    // Variant styles
    switch (variant) {
      case 'primary':
        baseStyles.push(styles.primary);
        break;
      case 'secondary':
        baseStyles.push(styles.secondary);
        break;
      case 'outline':
        baseStyles.push(styles.outline);
        break;
      case 'ghost':
        baseStyles.push(styles.ghost);
        break;
      case 'danger':
        baseStyles.push(styles.danger);
        break;
    }

    // Size styles
    switch (size) {
      case 'small':
        baseStyles.push(styles.small);
        break;
      case 'medium':
        baseStyles.push(styles.medium);
        break;
      case 'large':
        baseStyles.push(styles.large);
        break;
    }

    if (fullWidth) {
      baseStyles.push(styles.fullWidth);
    }

    if (disabled || loading) {
      baseStyles.push(styles.disabled);
    }

    if (style) {
      baseStyles.push(style);
    }

    return baseStyles;
  };

  const getTextStyle = (): TextStyle[] => {
    const baseStyles: TextStyle[] = [styles.text];

    // Variant text styles
    switch (variant) {
      case 'primary':
        baseStyles.push(styles.primaryText);
        break;
      case 'secondary':
        baseStyles.push(styles.secondaryText);
        break;
      case 'outline':
        baseStyles.push(styles.outlineText);
        break;
      case 'ghost':
        baseStyles.push(styles.ghostText);
        break;
      case 'danger':
        baseStyles.push(styles.dangerText);
        break;
    }

    // Size text styles
    switch (size) {
      case 'small':
        baseStyles.push(styles.smallText);
        break;
      case 'medium':
        baseStyles.push(styles.mediumText);
        break;
      case 'large':
        baseStyles.push(styles.largeText);
        break;
    }

    if (disabled || loading) {
      baseStyles.push(styles.disabledText);
    }

    if (textStyle) {
      baseStyles.push(textStyle);
    }

    return baseStyles;
  };

  const getSpinnerColor = () => {
    if (variant === 'primary' || variant === 'danger') {
      return colors.text.inverse;
    }
    return colors.primary;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        ...getButtonStyle(),
        pressed && !disabled && !loading && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <>
            <ActivityIndicator
              size="small"
              color={getSpinnerColor()}
              style={styles.spinner}
            />
            <Text style={[getTextStyle(), { opacity: 0.7 }]}>{children}</Text>
          </>
        ) : (
          <>
            {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
            <Text style={getTextStyle()}>{children}</Text>
            {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // Base styles
  base: {
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...shadows.md,
  },

  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },

  leftIcon: {
    marginRight: -spacing.xs,
  },

  rightIcon: {
    marginLeft: -spacing.xs,
  },

  spinner: {
    marginRight: spacing.xs,
  },

  // Variants
  primary: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  outline: {
    backgroundColor: colors.transparent,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  ghost: {
    backgroundColor: colors.transparent,
  },
  danger: {
    backgroundColor: colors.error,
    borderWidth: 2,
    borderColor: colors.errorDark,
  },

  // Sizes
  small: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  large: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg - 4,
    minHeight: 56,
  },

  fullWidth: {
    width: '100%',
  },

  // States
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },

  // Text styles
  text: {
    ...typography.styles.button,
  },
  primaryText: {
    color: colors.text.inverse,
  },
  secondaryText: {
    color: colors.text.primary,
  },
  outlineText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
  dangerText: {
    color: colors.text.inverse,
  },

  // Text sizes
  smallText: {
    ...typography.styles.buttonSmall,
  },
  mediumText: {
    ...typography.styles.button,
  },
  largeText: {
    fontSize: typography.fontSize.lg,
  },

  disabledText: {
    opacity: 0.7,
  },
});
