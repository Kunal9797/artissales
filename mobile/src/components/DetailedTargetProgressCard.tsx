import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Target, TrendingUp } from 'lucide-react-native';
import { colors, spacing, typography } from '../theme';
import { TargetProgress } from '../types';
import { api } from '../services/api';

interface DetailedTargetProgressCardProps {
  userId: string;
  month: string;
  style?: any;
}

export const DetailedTargetProgressCard: React.FC<DetailedTargetProgressCardProps> = ({
  userId,
  month,
  style,
}) => {
  const [progress, setProgress] = useState<TargetProgress[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTarget = async () => {
      try {
        setLoading(true);
        const response = await api.getTarget({ userId, month });

        if (response.target && response.progress) {
          setProgress(response.progress);
        } else {
          setProgress(null);
        }
      } catch (err: any) {
        console.error('[DetailedTargetProgressCard] Error:', err);
        setProgress(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTarget();
  }, [userId, month]);

  // Loading skeleton
  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Target size={20} color={colors.border.default} strokeWidth={2.5} />
            <View style={styles.skeletonHeaderText} />
          </View>
        </View>
        {[1, 2].map((i) => (
          <View key={i} style={[styles.compactRow, i === 2 && styles.compactRowLast]}>
            <View style={styles.topRow}>
              <View style={styles.skeletonCatalogName} />
              <View style={styles.skeletonBadge} />
            </View>
            <View style={styles.skeletonProgressBar} />
            <View style={styles.bottomRow}>
              <View style={styles.skeletonStats} />
              <View style={styles.skeletonStats} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  if (!progress || progress.length === 0) {
    return null;
  }

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return colors.success;
    if (percentage >= 50) return colors.warning;
    return colors.error;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header with icon */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Target size={20} color={colors.accent} strokeWidth={2.5} />
          <Text style={styles.headerText}>Your Progress</Text>
        </View>
      </View>

      {/* Progress rows with bars */}
      {progress.map((item, index) => {
        const isComplete = item.achieved >= item.target;
        const isLast = index === progress.length - 1;
        const progressColor = getProgressColor(item.percentage);

        return (
          <View key={item.catalog} style={[styles.compactRow, isLast && styles.compactRowLast]}>
            {/* Top row: name and percentage badge */}
            <View style={styles.topRow}>
              <Text style={styles.catalogName}>{item.catalog}</Text>
              <View style={[styles.percentageBadge, { backgroundColor: progressColor + '20' }]}>
                <Text style={[styles.percentageText, { color: progressColor }]}>
                  {item.percentage >= 100 ? '+' : ''}{item.percentage}%
                </Text>
              </View>
            </View>

            {/* Progress bar with animation effect */}
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(item.percentage, 100)}%`,
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>

            {/* Bottom row: achieved vs target */}
            <View style={styles.bottomRow}>
              <Text style={styles.statsText}>
                <Text style={styles.statsLabel}>Achieved: </Text>
                <Text style={styles.statsValue}>{item.achieved.toLocaleString()}</Text>
              </Text>
              <Text style={styles.statsText}>
                <Text style={styles.statsLabel}>Target: </Text>
                <Text style={styles.statsValue}>{item.target.toLocaleString()}</Text>
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  header: {
    marginBottom: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default + '20',
  },
  compactRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs / 2,
  },
  catalogName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  percentageBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.sm,
  },
  percentageText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border.default + '40',
    borderRadius: spacing.borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.xs / 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: spacing.borderRadius.full,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsText: {
    fontSize: typography.fontSize.xs,
  },
  statsLabel: {
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
  },
  statsValue: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semiBold,
  },
  // Skeleton loading styles
  skeletonHeaderText: {
    width: 120,
    height: 20,
    backgroundColor: colors.border.default + '50',
    borderRadius: spacing.borderRadius.sm,
  },
  skeletonCatalogName: {
    width: 100,
    height: 18,
    backgroundColor: colors.border.default + '50',
    borderRadius: spacing.borderRadius.sm,
  },
  skeletonBadge: {
    width: 50,
    height: 24,
    backgroundColor: colors.border.default + '50',
    borderRadius: spacing.borderRadius.full,
  },
  skeletonProgressBar: {
    height: 10,
    backgroundColor: colors.border.default + '30',
    borderRadius: spacing.borderRadius.full,
    marginBottom: spacing.sm,
  },
  skeletonStats: {
    width: 80,
    height: 14,
    backgroundColor: colors.border.default + '50',
    borderRadius: spacing.borderRadius.sm,
  },
});
