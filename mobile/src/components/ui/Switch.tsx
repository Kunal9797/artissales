/**
 * Switch Component
 * Accessible toggle switch with focus ring, role tokens, and 48dp hit target
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { colors, spacing, typography, roles, states } from '../../theme';
import type { RoleKey } from '../../theme/tokens';

export interface SwitchProps {
  /** On/off state */
  value: boolean;
  /** Change handler */
  onChange: (value: boolean) => void;
  /** Label text */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Role variant for on state */
  variant?: RoleKey;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export function Switch({
  value,
  onChange,
  label,
  disabled = false,
  variant = 'primary',
  accessibilityLabel,
}: SwitchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: value ? 20 : 0,
      useNativeDriver: true,
      friction: 7,
    }).start();
  }, [value, translateX]);

  const role = variant === 'primary' ? { base: colors.primary } : roles[variant];

  return (
    <Pressable
      onPress={() => !disabled && onChange(!value)}
      disabled={disabled}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={styles.container}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel || label}
    >
      {label && (
        <Text
          style={[
            styles.label,
            disabled && { color: states.disabled.text },
          ]}
        >
          {label}
        </Text>
      )}
      <View
        style={[
          styles.track,
          {
            backgroundColor: value ? role.base : colors.border.default,
          },
          disabled && { opacity: states.disabled.opacity },
          isFocused && {
            borderColor: states.focus.border,
            borderWidth: states.focus.borderWidth,
            ...states.focus.shadow,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48, // ≥48dp hit target
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.md,
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.text.inverse,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
