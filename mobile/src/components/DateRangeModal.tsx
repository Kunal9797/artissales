import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { X, CheckCircle, Calendar } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';

export type DateRangeOption = 'today' | 'week' | 'month';

interface DateRangeModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (range: DateRangeOption) => void;
  currentRange: DateRangeOption;
}

interface DateRangeOptionItem {
  value: DateRangeOption;
  label: string;
  description: string;
}

const getDateRangeOptions = (): DateRangeOptionItem[] => {
  const today = new Date();
  const formatDate = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Calculate week start (7 days ago)
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  // Calculate month start
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return [
    {
      value: 'today',
      label: 'Today',
      description: formatDate(today),
    },
    {
      value: 'week',
      label: 'Last 7 Days',
      description: `${formatDate(weekStart)} - ${formatDate(today)}`,
    },
    {
      value: 'month',
      label: 'This Month',
      description: `${formatDate(monthStart)} - ${formatDate(today)}`,
    },
  ];
};

export const DateRangeModal: React.FC<DateRangeModalProps> = ({
  visible,
  onClose,
  onSelect,
  currentRange,
}) => {
  const [selectedRange, setSelectedRange] = React.useState<DateRangeOption>(currentRange);
  const options = getDateRangeOptions();

  React.useEffect(() => {
    if (visible) {
      setSelectedRange(currentRange);
    }
  }, [visible, currentRange]);

  const handleApply = () => {
    onSelect(selectedRange);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={styles.header}>
            <Calendar size={20} color={colors.accent} />
            <Text style={styles.headerTitle}>Date Range</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionItem,
                  selectedRange === option.value && styles.optionItemSelected,
                ]}
                onPress={() => setSelectedRange(option.value)}
              >
                <View style={styles.optionLeft}>
                  <Text
                    style={[
                      styles.optionLabel,
                      selectedRange === option.value && styles.optionLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedRange === option.value && styles.radioButtonSelected,
                  ]}
                >
                  {selectedRange === option.value && (
                    <View style={styles.radioButtonInner} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <CheckCircle size={16} color={colors.text.inverse} />
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.lg,
    width: '70%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.text.tertiary + '20',
  },
  headerTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
    marginLeft: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  optionsContainer: {
    paddingVertical: spacing.sm,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  optionItemSelected: {
    backgroundColor: colors.accent + '10',
    borderLeftColor: colors.accent,
  },
  optionLeft: {
    flex: 1,
  },
  optionLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: colors.accent,
  },
  optionDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonSelected: {
    borderColor: colors.accent,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.text.tertiary + '20',
    gap: spacing.sm,
  },
  cancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    gap: spacing.xs,
  },
  applyButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.inverse,
    fontWeight: '600',
  },
});
