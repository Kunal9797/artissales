/**
 * StatsScreen - Monthly Performance at a Glance
 *
 * Shows:
 * - Target Progress Card (monthly sales)
 * - Visit Progress Card (monthly visits)
 * - Monthly summary stats
 * - Performance trends
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { DetailedStatsView } from '../components/DetailedStatsView';
import { colors, spacing, typography, featureColors } from '../theme';
import { api } from '../services/api';
import { Skeleton } from '../patterns';
import { logger } from '../utils/logger';
import { useBottomSafeArea } from '../hooks/useBottomSafeArea';
import {
  Calendar,
  FileText,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

interface StatsScreenProps {
  navigation: any;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  // Safe area insets for bottom padding (accounts for Android nav bar)
  const bottomPadding = useBottomSafeArea(12);

  // State for selected month
  const [selectedDate, setSelectedDate] = useState(new Date());
  const currentMonth = selectedDate.toISOString().substring(0, 7);

  // State for monthly stats
  const [refreshing, setRefreshing] = useState(false);

  // State for pending items
  const [pendingCounts, setPendingCounts] = useState({
    pendingExpenses: 0,
    unverifiedSheets: 0,
  });
  const [loadingPending, setLoadingPending] = useState(false);

  // State for targets
  const [targets, setTargets] = useState<{ visits?: number; sheets?: number }>({});

  // Fetch pending items count from DSR reports
  const fetchPendingCounts = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoadingPending(true);
      const firestore = getFirestore();
      const { query, collection, where, getDocs } = await import('@react-native-firebase/firestore');

      // Fetch pending DSR reports and sum their totals
      const dsrQuery = query(
        collection(firestore, 'dsrReports'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const dsrSnapshot = await getDocs(dsrQuery);

      let totalPendingExpenseAmount = 0;
      let totalPendingSheets = 0;

      dsrSnapshot.forEach(doc => {
        const data = doc.data();
        totalPendingExpenseAmount += data.totalExpenses || 0;
        totalPendingSheets += data.totalSheetsSold || 0;
      });

      setPendingCounts({
        pendingExpenses: totalPendingExpenseAmount,  // Actual rupee amount
        unverifiedSheets: totalPendingSheets,  // Actual sheet count
      });
    } catch (error) {
      logger.error('Error fetching pending counts:', error);
    } finally {
      setLoadingPending(false);
    }
  }, [user?.uid]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), fetchPendingCounts()]);
    setRefreshing(false);
  }, [refetchStats, fetchPendingCounts]);

  // Navigate to previous month
  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const formattedMonth = selectedDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  // Calculate date range for API query
  const dateRange = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);

    return {
      startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`,
    };
  }, [selectedDate]);

  // Fetch monthly stats using React Query with caching
  const {
    data: statsData,
    isLoading: loading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['userStats', user?.uid, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      if (!user?.uid) throw new Error('No user ID');

      const startTime = Date.now();
      logger.log('[Stats] Fetching stats...');

      const response = await api.getUserStats({
        userId: user.uid,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      logger.log(`[Stats] Stats fetched in ${Date.now() - startTime}ms`);
      return response.stats;
    },
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Extract attendance days from stats data
  const attendanceDays = useMemo(() => {
    if (!statsData?.attendance?.records) return new Set<string>();

    const attendanceDaysSet = new Set<string>();
    statsData.attendance.records.forEach((record: any) => {
      if (record.type === 'check_in' && record.timestamp) {
        const date = record.timestamp.toDate?.() || new Date(record.timestamp);
        const dateStr = date.toISOString().substring(0, 10);
        attendanceDaysSet.add(dateStr);
      }
    });
    return attendanceDaysSet;
  }, [statsData]);

  const detailedStats = statsData;

  // Fetch targets
  const fetchTargets = useCallback(async () => {
    if (!user?.uid) return;

    try {
      logger.log('[Stats] Fetching targets for:', { userId: user.uid, month: currentMonth });
      const response = await api.getTarget({
        userId: user.uid,
        month: currentMonth,
      });

      logger.log('[Stats] Target response:', response);

      if (response.ok && response.target) {
        const newTargets: any = {};

        // Pass category-level targets directly (Note: backend doesn't track distributor visits)
        if (response.target.targetsByAccountType) {
          newTargets.visitsByType = {
            dealer: response.target.targetsByAccountType.dealer,
            architect: response.target.targetsByAccountType.architect,
            contractor: response.target.targetsByAccountType.contractor,
          };
        }

        if (response.target.targetsByCatalog) {
          newTargets.sheetsByCatalog = {
            'Fine Decor': response.target.targetsByCatalog['Fine Decor'],
            'Artvio': response.target.targetsByCatalog['Artvio'],
            'Woodrica': response.target.targetsByCatalog['Woodrica'],
            'Artis 1MM': response.target.targetsByCatalog['Artis 1MM'],
          };
        }

        logger.log('[Stats] Setting targets:', newTargets);
        setTargets(newTargets);
      } else {
        logger.log('[Stats] No target found for this month');
      }
    } catch (error) {
      logger.error('[Stats] Error fetching targets:', error);
      // Targets are optional, so don't show error to user
    }
  }, [user?.uid, currentMonth]);

  // Fetch pending counts and targets on mount and when month changes
  // Stats are automatically fetched by React Query
  useEffect(() => {
    if (user?.uid) {
      fetchPendingCounts();
      fetchTargets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, currentMonth]);

  return (
    <View style={styles.container}>
      {/* Dark Header - Compact */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} color="#C9A961" />
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>Performance</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity onPress={goToPreviousMonth} style={{ padding: 4 }}>
              <ChevronLeft size={20} color="#C9A961" />
            </TouchableOpacity>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', minWidth: 60, textAlign: 'center' }}>
              {selectedDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={{ padding: 4 }}>
              <ChevronRight size={20} color="#C9A961" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 60 + bottomPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >

        {/* Detailed Stats View */}
        {loading ? (
          (() => {
            console.log('[StatsScreen] Rendering skeleton loading state');
            return (
              <>
                <Skeleton card fullWidth />
                <Skeleton card fullWidth />
                <Skeleton card fullWidth />
                <Skeleton card fullWidth />
              </>
            );
          })()
        ) : detailedStats ? (
          <DetailedStatsView
            stats={detailedStats}
            attendanceDays={{
              present: attendanceDays.size,
              absent: (() => {
                const now = new Date();
                const isCurrentMonth = selectedDate.getFullYear() === now.getFullYear() &&
                                      selectedDate.getMonth() === now.getMonth();
                // If viewing current month, count days from 1st to today
                // If viewing past month, count all days in that month
                const totalDaysToConsider = isCurrentMonth
                  ? now.getDate()
                  : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
                return Math.max(0, totalDaysToConsider - attendanceDays.size);
              })(),
              total: (() => {
                const now = new Date();
                const isCurrentMonth = selectedDate.getFullYear() === now.getFullYear() &&
                                      selectedDate.getMonth() === now.getMonth();
                return isCurrentMonth
                  ? now.getDate()
                  : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
              })(),
            }}
            attendancePercentage={(() => {
              const now = new Date();
              const isCurrentMonth = selectedDate.getFullYear() === now.getFullYear() &&
                                    selectedDate.getMonth() === now.getMonth();
              const totalDaysToConsider = isCurrentMonth
                ? now.getDate()
                : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
              return attendanceDays.size > 0
                ? Math.round((attendanceDays.size / totalDaysToConsider) * 100)
                : 0;
            })()}
            attendanceMarkedDates={Object.fromEntries(
              Array.from(attendanceDays).map(date => [
                date,
                { marked: true, dotColor: '#2E7D32', selected: false }
              ])
            )}
            selectedMonth={selectedDate}
            targets={targets}
            userId={user?.uid}
          />
        ) : null}

        {/* Pending Approvals Section - Moved after summary, more compact */}
        {(pendingCounts.pendingExpenses > 0 || pendingCounts.unverifiedSheets > 0) && (
          <>
            <Text style={styles.sectionTitle}>Pending Approvals</Text>
            <View style={{ gap: 8 }}>
              {pendingCounts.pendingExpenses > 0 && (
                <View style={styles.pendingItem}>
                  <View style={[styles.pendingIconContainer, { backgroundColor: featureColors.expenses.light }]}>
                    <IndianRupee size={20} color={featureColors.expenses.primary} />
                  </View>
                  <View style={styles.pendingContent}>
                    <Text style={styles.pendingTitle}>
                      {pendingCounts.pendingExpenses} Expense {pendingCounts.pendingExpenses === 1 ? 'Report' : 'Reports'}
                    </Text>
                    <Text style={styles.pendingSubtitle}>Waiting for manager approval</Text>
                  </View>
                </View>
              )}

              {pendingCounts.pendingExpenses > 0 && pendingCounts.unverifiedSheets > 0 && (
                <View style={styles.pendingDivider} />
              )}

              {pendingCounts.unverifiedSheets > 0 && (
                <View style={styles.pendingItem}>
                  <View style={[styles.pendingIconContainer, { backgroundColor: featureColors.sheets.light }]}>
                    <FileText size={20} color={featureColors.sheets.primary} />
                  </View>
                  <View style={styles.pendingContent}>
                    <Text style={styles.pendingTitle}>
                      {pendingCounts.unverifiedSheets} Sheet {pendingCounts.unverifiedSheets === 1 ? 'Sale' : 'Sales'}
                    </Text>
                    <Text style={styles.pendingSubtitle}>Awaiting verification</Text>
                  </View>
                </View>
              )}
            </View>
          </>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: 52, // Status bar space
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.3,
  },
  // Month Picker
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  monthNavButton: {
    padding: spacing.xs,
  },
  monthText: {
    fontSize: 16,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
    // paddingBottom set dynamically via useBottomSafeArea hook (60 + bottomPadding)
  },
  sectionTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    paddingVertical: spacing.xl * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiGrid: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  // Insight Card
  insightCard: {
    padding: spacing.lg,
    backgroundColor: featureColors.visits.light,
    borderLeftWidth: 4,
    borderLeftColor: featureColors.visits.primary,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  insightTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semiBold,
  },
  insightText: {
    ...typography.styles.body,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  // Pending Approvals Section
  pendingCard: {
    marginBottom: spacing.md,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  pendingIconContainer: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingContent: {
    flex: 1,
  },
  pendingTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  pendingSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  pendingDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.md,
  },
});
