import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Users, Plus } from 'lucide-react-native';
import { colors, spacing, typography, featureColors } from '../theme';
import { VisitProgress } from '../types';
import { api } from '../services/api';

interface VisitProgressCardProps {
  userId: string;
  month: string;
  onLogPress: () => void;
  style?: any;
}

export const VisitProgressCard: React.FC<VisitProgressCardProps> = ({
  userId,
  month,
  onLogPress,
  style,
}) => {
  const [visitProgress, setVisitProgress] = useState<VisitProgress[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVisitProgress = async () => {
      try {
        setLoading(true);
        const response = await api.getTarget({ userId, month });

        if (response.ok && response.visitProgress) {
          setVisitProgress(response.visitProgress);
        } else {
          setVisitProgress(null);
        }
      } catch (err: any) {
        console.error('[VisitProgressCard] Error fetching:', err);
        setVisitProgress(null);
      } finally {
        setLoading(false);
      }
    };

    fetchVisitProgress();
  }, [userId, month]);

  // Loading skeleton
  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.header}>
          <Users size={20} color={colors.border.default} strokeWidth={2.5} />
          <View style={styles.skeletonHeaderText} />
        </View>
        {[1, 2].map((i) => (
          <View key={i} style={styles.skeletonRow}>
            <View style={styles.skeletonLabel} />
            <View style={styles.skeletonValue} />
          </View>
        ))}
      </View>
    );
  }

  // No targets - show "No target set" message
  if (!visitProgress || visitProgress.length === 0) {
    return (
      <View style={[styles.emptyCard, style]}>
        <Users size={24} color="#E0E0E0" strokeWidth={2.5} />
        <Text style={styles.emptyText}>No visit target set for this month</Text>
      </View>
    );
  }

  // Has targets - show progress
  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onLogPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Users size={20} color={featureColors.visits.primary} strokeWidth={2.5} />
          <Text style={styles.headerText}>Visit Targets</Text>
        </View>
        <View style={styles.logButton}>
          <Plus size={18} color={featureColors.visits.primary} strokeWidth={2.5} />
        </View>
      </View>

      {visitProgress.map((item) => {
        const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
        const percentage = item.target > 0 ? Math.round((item.achieved / item.target) * 100) : 0;
        const isComplete = item.achieved >= item.target;

        return (
          <View key={item.accountType} style={styles.compactRow}>
            <Text style={styles.compactLabel}>{capitalize(item.accountType)}s</Text>
            <Text style={[styles.compactCount, isComplete && styles.compactCountComplete]}>
              {item.achieved}/{item.target}
            </Text>
            <View style={styles.compactBarContainer}>
              <View
                style={[
                  styles.compactBarFill,
                  {
                    width: `${Math.min(percentage, 100)}%`,
                    backgroundColor: isComplete ? colors.success : featureColors.visits.primary
                  },
                ]}
              />
            </View>
            <Text style={[styles.compactPercentage, isComplete && styles.compactPercentageComplete]}>
              {percentage}%{isComplete ? ' ✓' : ''}
            </Text>
          </View>
        );
      })}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  // Empty state (no targets)
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  // Card with progress
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  logButton: {
    width: 32,
    height: 32,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: featureColors.visits.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Compact row layout
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  compactLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    width: 80,
    flexShrink: 0,
  },
  compactCount: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    width: 40,
    flexShrink: 0,
    textAlign: 'right',
  },
  compactCountComplete: {
    color: colors.success,
  },
  compactBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border.default,
    borderRadius: spacing.borderRadius.full,
    overflow: 'hidden',
    marginHorizontal: spacing.xs,
  },
  compactBarFill: {
    height: '100%',
    borderRadius: spacing.borderRadius.full,
    // backgroundColor set inline based on completion status
  },
  compactPercentage: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    width: 42,
    flexShrink: 0,
    textAlign: 'right',
  },
  compactPercentageComplete: {
    color: colors.success,
    fontWeight: typography.fontWeight.semiBold,
  },
  // Skeleton loading styles
  skeletonHeaderText: {
    width: 100,
    height: 16,
    backgroundColor: colors.border.default + '50',
    borderRadius: spacing.borderRadius.sm,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  skeletonLabel: {
    width: 80,
    height: 14,
    backgroundColor: colors.border.default + '50',
    borderRadius: spacing.borderRadius.sm,
  },
  skeletonValue: {
    width: 40,
    height: 14,
    backgroundColor: colors.border.default + '50',
    borderRadius: spacing.borderRadius.sm,
  },
});
