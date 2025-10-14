/**
 * Tabs Component
 * Segmented control with dense mode support, focus ring, and accessible navigation
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography, states } from '../../theme';

export interface TabItem {
  label: string;
  value: string;
}

export interface TabsProps {
  /** Tab items */
  items: TabItem[];
  /** Current selected value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Dense mode (smaller padding) */
  dense?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

export function Tabs({
  items,
  value,
  onChange,
  dense = false,
  disabled = false,
}: TabsProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContainer}
    >
      <View style={[styles.container, dense && styles.containerDense]}>
        {items.map((item, index) => {
          const isSelected = item.value === value;
          const isFocused = focusedIndex === index;

          return (
            <Pressable
              key={item.value}
              onPress={() => !disabled && onChange(item.value)}
              onFocus={() => setFocusedIndex(index)}
              onBlur={() => setFocusedIndex(null)}
              disabled={disabled}
              style={[
                styles.tab,
                dense && styles.tabDense,
                isSelected && styles.tabSelected,
                disabled && { opacity: states.disabled.opacity },
                isFocused && {
                  borderColor: states.focus.border,
                  borderWidth: states.focus.borderWidth,
                  ...states.focus.shadow,
                },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isSelected, disabled }}
              accessibilityLabel={item.label}
            >
              <Text
                style={[
                  styles.tabText,
                  dense && styles.tabTextDense,
                  isSelected && styles.tabTextSelected,
                  disabled && { color: states.disabled.text },
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    paddingHorizontal: spacing.screenPadding,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.xs / 2,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  containerDense: {
    padding: 2,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    minHeight: 48, // ≥48dp hit target
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabDense: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 36,
  },
  tabSelected: {
    backgroundColor: colors.primary,
  },
  tabText: {
    ...typography.styles.button,
    color: colors.text.primary,
  },
  tabTextDense: {
    fontSize: typography.fontSize.sm,
  },
  tabTextSelected: {
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.bold,
  },
});
