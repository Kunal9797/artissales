/**
 * Checkbox Component
 * Accessible checkbox with focus ring, role tokens, and 48dp hit target
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors, spacing, typography, roles, states } from '../../theme';
import type { RoleKey } from '../../theme/tokens';

export interface CheckboxProps {
  /** Checked state */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Label text */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Role variant for checked state */
  variant?: RoleKey;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
  variant = 'primary',
  accessibilityLabel,
}: CheckboxProps) {
  const [isFocused, setIsFocused] = useState(false);

  const role = variant === 'primary' ? { base: colors.primary, border: colors.primary } : roles[variant];

  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={styles.container}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel || label}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: checked ? role.border : colors.border.default,
            backgroundColor: checked ? role.base : colors.surface,
          },
          disabled && { opacity: states.disabled.opacity, borderColor: states.disabled.border },
          isFocused && {
            borderColor: states.focus.border,
            borderWidth: states.focus.borderWidth,
            ...states.focus.shadow,
          },
        ]}
      >
        {checked && <Check size={16} color={colors.text.inverse} strokeWidth={3} />}
      </View>
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48, // ≥48dp hit target
    paddingVertical: spacing.sm,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  label: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },
});
