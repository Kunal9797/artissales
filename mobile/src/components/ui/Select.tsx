/**
 * Select Component
 * Modal-based select with optional search, FlatList rendering, and focus ring
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, Search, X, Check } from 'lucide-react-native';
import { colors, spacing, typography, roles, states } from '../../theme';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps {
  /** Selected value */
  value: string | null;
  /** Change handler */
  onChange: (value: string) => void;
  /** Options list */
  options: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Label text */
  label?: string;
  /** Enable search */
  searchable?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Accessibility label */
  accessibilityLabel?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  label,
  searchable = false,
  disabled = false,
  accessibilityLabel,
}: SelectProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = searchable && searchTerm.trim()
    ? options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setModalVisible(false);
    setSearchTerm('');
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={[
          styles.selectButton,
          disabled && { opacity: states.disabled.opacity, borderColor: states.disabled.border },
          isFocused && {
            borderColor: states.focus.border,
            borderWidth: states.focus.borderWidth,
            ...states.focus.shadow,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || `${label} select`}
        accessibilityHint="Opens a modal to select an option"
      >
        <Text
          style={[
            styles.selectButtonText,
            !selectedOption && styles.selectButtonPlaceholder,
            disabled && { color: states.disabled.text },
          ]}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <ChevronDown size={20} color={disabled ? states.disabled.text : colors.text.secondary} />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label || 'Select'}</Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {searchable && (
            <View style={styles.searchContainer}>
              <Search size={20} color={colors.text.secondary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor={colors.text.secondary}
                value={searchTerm}
                onChangeText={setSearchTerm}
                autoCapitalize="none"
                autoFocus
              />
              {searchTerm.length > 0 && (
                <TouchableOpacity onPress={() => setSearchTerm('')} style={styles.clearButton}>
                  <X size={16} color={colors.text.secondary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.value}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelect(item.value)}
                style={({ pressed }) => [
                  styles.optionItem,
                  pressed && { backgroundColor: colors.surface },
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: item.value === value }}
              >
                <Text style={styles.optionText}>{item.label}</Text>
                {item.value === value && (
                  <Check size={20} color={colors.primary} strokeWidth={2.5} />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No options found</Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48, // ≥48dp hit target
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
  },
  selectButtonText: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },
  selectButtonPlaceholder: {
    color: colors.text.secondary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.screenPadding,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  clearButton: {
    padding: spacing.xs,
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48, // ≥48dp hit target
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
  },
  optionText: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
});
