import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Target, Plus } from 'lucide-react-native';
import { colors, spacing, typography, featureColors } from '../theme';
import { TargetProgress } from '../types';
import { api } from '../services/api';

interface TargetProgressCardProps {
  userId: string;
  month: string; // YYYY-MM
  title?: string;
  showDetails?: boolean;
  style?: any;
  onLogPress?: () => void; // Optional callback for log button
}

export const TargetProgressCard: React.FC<TargetProgressCardProps> = ({
  userId,
  month,
  title = 'Target Progress',
  showDetails = true,
  style,
  onLogPress,
}) => {
  const [progress, setProgress] = useState<TargetProgress[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTarget = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.getTarget({ userId, month });

        if (response.target && response.progress) {
          setProgress(response.progress);
        } else {
          setProgress(null);
        }
      } catch (err: any) {
        console.error('[TargetProgressCard] Error fetching target:', err);
        setError(err.message || 'Failed to load target');
        setProgress(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTarget();
  }, [userId, month]);

  if (loading) {
    return null; // Don't show anything while loading
  }

  if (error) {
    return null; // Don't show error, fail silently
  }

  // No targets - show "Log Sheet Sales" prompt
  if (!progress || progress.length === 0) {
    return (
      <TouchableOpacity
        style={[styles.emptyCard, style]}
        onPress={onLogPress}
        activeOpacity={onLogPress ? 0.7 : 1}
        disabled={!onLogPress}
      >
        <Target size={24} color={featureColors.sheets.primary} strokeWidth={2.5} />
        <Text style={styles.emptyText}>Log Sheet Sales</Text>
      </TouchableOpacity>
    );
  }

  const getProgressColor = (percentage: number): string => {
    // Use feature color (orange) for sales, with intensity based on percentage
    if (percentage >= 80) return colors.success;      // Green for great progress
    if (percentage >= 50) return featureColors.sheets.primary;  // Orange for moderate
    return colors.error;                               // Red for behind
  };

  const totalTarget = progress.reduce((sum, p) => sum + p.target, 0);
  const totalAchieved = progress.reduce((sum, p) => sum + p.achieved, 0);
  const overallPercentage = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;

  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onLogPress}
      activeOpacity={onLogPress ? 0.7 : 1}
      disabled={!onLogPress}
    >
      {/* Header with icon and log button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Target size={20} color={featureColors.sheets.primary} />
          <Text style={styles.headerText}>Sales Target</Text>
        </View>
        {onLogPress && (
          <View style={styles.logButton}>
            <Plus size={18} color={featureColors.sheets.primary} strokeWidth={2.5} />
          </View>
        )}
      </View>

      {/* Each catalog as one clean line */}
      {progress.map((item) => (
        <View key={item.catalog} style={styles.catalogRow}>
          <Text style={styles.catalogName}>{item.catalog}</Text>
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.min(item.percentage, 100)}%`,
                  backgroundColor: getProgressColor(item.percentage),
                },
              ]}
            />
          </View>
          <Text style={[styles.percentage, { color: getProgressColor(item.percentage) }]}>
            {item.percentage}%
          </Text>
          <Text style={styles.numbers}>
            {item.achieved.toLocaleString()}
          </Text>
        </View>
      ))}
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
    backgroundColor: featureColors.sheets.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  catalogName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    width: 80,
    flexShrink: 0,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border.default,
    borderRadius: spacing.borderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: spacing.borderRadius.full,
  },
  percentage: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    width: 45,
    textAlign: 'right',
    flexShrink: 0,
  },
  numbers: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    width: 50,
    textAlign: 'right',
    flexShrink: 0,
  },
});
