/**
 * FiltersBar Pattern
 * Horizontal quick chips with "More filters" modal using Selects
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Filter, X } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';
import { Select, SelectOption } from '../../components/ui/Select';

export interface Chip {
  label: string;
  value: string;
  active: boolean;
}

export interface FilterSpec {
  key: string;
  label: string;
  options: SelectOption[];
}

export interface FiltersBarProps {
  /** Quick filter chips */
  chips: Chip[];
  /** Chip toggle handler */
  onChipToggle: (value: string) => void;
  /** Advanced filters (optional) */
  moreFilters?: FilterSpec[];
  /** Apply filters handler */
  onApply?: (filters: Record<string, string>) => void;
}

export function FiltersBar({ chips, onChipToggle, moreFilters, onApply }: FiltersBarProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  const handleApply = () => {
    if (onApply) {
      onApply(filterValues);
    }
    setModalVisible(false);
  };

  const handleReset = () => {
    setFilterValues({});
  };

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {chips.map((chip) => (
          <Pressable
            key={chip.value}
            onPress={() => onChipToggle(chip.value)}
            style={[styles.chip, chip.active && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: chip.active }}
            accessibilityLabel={chip.label}
          >
            <Text style={[styles.chipText, chip.active && styles.chipTextActive]}>
              {chip.label}
            </Text>
          </Pressable>
        ))}

        {moreFilters && moreFilters.length > 0 && (
          <Pressable
            onPress={() => setModalVisible(true)}
            style={styles.moreButton}
            accessibilityRole="button"
            accessibilityLabel="More filters"
          >
            <Filter size={16} color={colors.text.secondary} />
            <Text style={styles.moreButtonText}>More</Text>
          </Pressable>
        )}
      </ScrollView>

      {moreFilters && moreFilters.length > 0 && (
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setModalVisible(false)}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {moreFilters.map((filter) => (
                <Select
                  key={filter.key}
                  label={filter.label}
                  value={filterValues[filter.key] || null}
                  onChange={(value) =>
                    setFilterValues((prev) => ({ ...prev, [filter.key]: value }))
                  }
                  options={filter.options}
                  placeholder={`Select ${filter.label.toLowerCase()}`}
                />
              ))}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={handleReset}
                style={styles.resetButton}
                accessibilityRole="button"
                accessibilityLabel="Reset filters"
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApply}
                style={styles.applyButton}
                accessibilityRole="button"
                accessibilityLabel="Apply filters"
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    ...typography.styles.labelSmall,
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: typography.fontWeight.bold,
  },
  moreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    minHeight: 36,
  },
  moreButtonText: {
    ...typography.styles.labelSmall,
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
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    gap: spacing.md,
  },
  resetButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.surface,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    ...typography.styles.button,
    color: colors.text.primary,
  },
  applyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.primary,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    ...typography.styles.button,
    color: '#fff',
  },
});
