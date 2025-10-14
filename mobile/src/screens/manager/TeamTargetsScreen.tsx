import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Target, ChevronRight, RefreshCw } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';
import { api } from '../../services/api';
import { UserTargetSummary } from '../../types';

type TeamTargetsScreenProps = NativeStackScreenProps<any, 'TeamTargets'>;

export const TeamTargetsScreen: React.FC<TeamTargetsScreenProps> = ({ navigation }) => {
  const [month, setMonth] = useState<string>(getCurrentMonth());
  const [targets, setTargets] = useState<UserTargetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'withTargets' | 'withoutTargets'>('all');

  useEffect(() => {
    loadTeamTargets();
  }, [month]);

  function getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const loadTeamTargets = async () => {
    try {
      const response = await api.getUserTargets({ month });

      if (response.ok) {
        setTargets(response.targets);
      }
    } catch (error: any) {
      console.error('[TeamTargets] Error loading targets:', error);
      Alert.alert('Error', 'Failed to load team targets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTeamTargets();
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return colors.success;
    if (percentage >= 50) return colors.warning;
    return colors.error;
  };

  const filteredTargets = targets.filter((t) => {
    if (filter === 'withTargets') return t.target !== null;
    if (filter === 'withoutTargets') return t.target === null;
    return true;
  });

  const renderTargetCard = ({ item }: { item: UserTargetSummary }) => {
    const hasTarget = item.target !== null;
    const progressColor = getProgressColor(item.overallPercentage);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          navigation.navigate('SetTarget', {
            userId: item.userId,
            userName: item.userName,
            currentMonth: month,
          });
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <Text style={styles.userName}>{item.userName}</Text>
            <Text style={styles.userTerritory}>{item.territory}</Text>
          </View>
          <ChevronRight size={20} color={colors.text.tertiary} />
        </View>

        {hasTarget ? (
          <>
            {/* Progress Overview */}
            <View style={styles.progressContainer}>
              <View style={styles.progressStats}>
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatLabel}>Achieved</Text>
                  <Text style={[styles.progressStatValue, { color: progressColor }]}>
                    {item.totalAchieved}
                  </Text>
                </View>
                <View style={styles.progressStatDivider} />
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatLabel}>Target</Text>
                  <Text style={styles.progressStatValue}>{item.totalTarget}</Text>
                </View>
                <View style={styles.progressStatDivider} />
                <View style={styles.progressStat}>
                  <Text style={styles.progressStatLabel}>Progress</Text>
                  <Text style={[styles.progressStatValue, { color: progressColor }]}>
                    {item.overallPercentage}%
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(item.overallPercentage, 100)}%`,
                      backgroundColor: progressColor,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Catalog Breakdown */}
            <View style={styles.catalogsGrid}>
              {item.progress.map((p) => (
                <View key={p.catalog} style={styles.catalogChip}>
                  <Text style={styles.catalogChipName}>{p.catalog}</Text>
                  <Text
                    style={[
                      styles.catalogChipPercentage,
                      { color: getProgressColor(p.percentage) },
                    ]}
                  >
                    {p.percentage}%
                  </Text>
                </View>
              ))}
            </View>

            {/* Auto-Renew Indicator */}
            {item.target?.autoRenew && (
              <View style={styles.autoRenewBadge}>
                <RefreshCw size={12} color={colors.info} />
                <Text style={styles.autoRenewText}>Auto-renew enabled</Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.noTargetContainer}>
            <Target size={32} color={colors.text.tertiary} />
            <Text style={styles.noTargetText}>No target set for this month</Text>
            <TouchableOpacity
              style={styles.setTargetButton}
              onPress={() =>
                navigation.navigate('SetTarget', {
                  userId: item.userId,
                  userName: item.userName,
                  currentMonth: month,
                })
              }
            >
              <Text style={styles.setTargetButtonText}>Set Target</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color={colors.text.inverse} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Targets</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading team targets...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Team Targets</Text>
          <Text style={styles.headerSubtitle}>{formatMonth(month)}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All' },
          { key: 'withTargets', label: 'With Targets' },
          { key: 'withoutTargets', label: 'No Targets' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterTab, filter === item.key && styles.filterTabActive]}
            onPress={() => setFilter(item.key as any)}
          >
            <Text
              style={[
                styles.filterTabText,
                filter === item.key && styles.filterTabTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Team List */}
      {filteredTargets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Target size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyText}>No team members found</Text>
          <Text style={styles.emptySubtext}>
            {filter !== 'all'
              ? 'Try adjusting your filters'
              : 'Team members will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTargets}
          renderItem={renderTargetCard}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
          }
        />
      )}
    </View>
  );
};

function formatMonth(month: string): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.inverse,
    opacity: 0.85,
    marginTop: spacing.xs / 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    gap: spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  filterTabActive: {
    backgroundColor: colors.accent,
  },
  filterTabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: spacing.screenPadding,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardLeft: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  userTerritory: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  progressContainer: {
    marginBottom: spacing.md,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressStat: {
    flex: 1,
    alignItems: 'center',
  },
  progressStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },
  progressStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  progressStatDivider: {
    width: 1,
    backgroundColor: colors.border.default,
    marginHorizontal: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.text.tertiary + '20',
    borderRadius: spacing.borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: spacing.borderRadius.full,
  },
  catalogsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  catalogChip: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  catalogChipName: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  catalogChipPercentage: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
  },
  autoRenewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  autoRenewText: {
    fontSize: typography.fontSize.xs,
    color: colors.info,
    fontWeight: typography.fontWeight.semiBold,
  },
  noTargetContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  noTargetText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  setTargetButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
  },
  setTargetButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: '#fff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
