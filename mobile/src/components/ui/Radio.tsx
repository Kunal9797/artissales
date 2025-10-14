/**
 * Radio Component
 * Accessible radio button with focus ring, role tokens, and 48dp hit target
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, typography, roles, states } from '../../theme';
import type { RoleKey } from '../../theme/tokens';

export interface RadioProps {
  /** Selected state */
  selected: boolean;
  /** Change handler */
  onChange: () => void;
  /** Label text */
  label?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Role variant for selected state */
  variant?: RoleKey;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export function Radio({
  selected,
  onChange,
  label,
  disabled = false,
  variant = 'primary',
  accessibilityLabel,
}: RadioProps) {
  const [isFocused, setIsFocused] = useState(false);

  const role = variant === 'primary' ? { base: colors.primary, border: colors.primary } : roles[variant];

  return (
    <Pressable
      onPress={() => !disabled && onChange()}
      disabled={disabled}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={styles.container}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={accessibilityLabel || label}
    >
      <View
        style={[
          styles.circle,
          {
            borderColor: selected ? role.border : colors.border.default,
          },
          disabled && { opacity: states.disabled.opacity, borderColor: states.disabled.border },
          isFocused && {
            borderColor: states.focus.border,
            borderWidth: states.focus.borderWidth,
            ...states.focus.shadow,
          },
        ]}
      >
        {selected && (
          <View
            style={[
              styles.innerCircle,
              { backgroundColor: role.base },
            ]}
          />
        )}
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
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
  },
  innerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  label: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },
});
