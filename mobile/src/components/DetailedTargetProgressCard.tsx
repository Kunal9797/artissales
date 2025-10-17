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

  // Loading skeleton - compact version
  if (loading) {
    return (
      <View style={[{
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
      }, style]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <Target size={16} color="#E0E0E0" strokeWidth={2.5} />
          <View style={{ width: 100, height: 14, backgroundColor: '#F0F0F0', borderRadius: 4 }} />
        </View>
        {[1, 2].map((i) => (
          <View key={i} style={{ paddingVertical: 8, borderBottomWidth: i === 2 ? 0 : 1, borderBottomColor: '#F0F0F0' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ width: 80, height: 16, backgroundColor: '#F0F0F0', borderRadius: 4 }} />
              <View style={{ width: 60, height: 18, backgroundColor: '#F0F0F0', borderRadius: 4 }} />
            </View>
            <View style={{ height: 4, backgroundColor: '#F0F0F0', borderRadius: 2 }} />
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
    <View style={[{
      backgroundColor: '#FFFFFF',
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: '#E0E0E0',
    }, style]}>
      {/* Compact Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
      }}>
        <Target size={16} color="#C9A961" strokeWidth={2.5} />
        <Text style={{
          fontSize: 13,
          fontWeight: '600',
          color: '#666666',
          textTransform: 'uppercase',
          letterSpacing: 0.3,
        }}>
          Monthly Progress
        </Text>
      </View>

      {/* Compact Progress Rows */}
      {progress.map((item, index) => {
        const isLast = index === progress.length - 1;
        const progressColor = getProgressColor(item.percentage);

        return (
          <View
            key={item.catalog}
            style={{
              paddingVertical: 8,
              borderBottomWidth: isLast ? 0 : 1,
              borderBottomColor: '#F0F0F0',
            }}
          >
            {/* Catalog name and percentage in one line */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
                {item.catalog}
              </Text>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}>
                <Text style={{ fontSize: 11, color: '#666666' }}>
                  {item.achieved.toLocaleString()} / {item.target.toLocaleString()}
                </Text>
                <View style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 4,
                  backgroundColor: progressColor + '20',
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: progressColor }}>
                    {item.percentage >= 100 ? '+' : ''}{item.percentage}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Thin progress bar */}
            <View style={{
              height: 4,
              backgroundColor: '#F0F0F0',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <View
                style={{
                  height: '100%',
                  width: `${Math.min(item.percentage, 100)}%`,
                  backgroundColor: progressColor,
                  borderRadius: 2,
                }}
              />
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
