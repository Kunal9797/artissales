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
import { DetailedStatsView } from '../components/DetailedStatsView';
import { colors, spacing, typography } from '../theme';
import { api } from '../services/api';
import { Skeleton } from '../patterns';
import { logger } from '../utils/logger';
import { useBottomSafeArea } from '../hooks/useBottomSafeArea';
import {
  Calendar,
  CalendarDays,
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

  // State for targets
  const [targets, setTargets] = useState<{ visits?: number; sheets?: number }>({});

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  }, [refetchStats]);

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
            OEM: response.target.targetsByAccountType.OEM,
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

  // Fetch targets on mount and when month changes
  // Stats are automatically fetched by React Query
  useEffect(() => {
    if (user?.uid) {
      fetchTargets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, currentMonth]);

  return (
    <View style={styles.container}>
      {/* Dark Header */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 20,
        paddingTop: 52,
        paddingBottom: 16,
      }}>
        {/* Title Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Calendar size={20} color="#C9A961" />
            <Text style={{ fontSize: 22, fontWeight: '600', color: '#FFFFFF' }}>Performance</Text>
          </View>
          {/* Activity History Calendar Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('AttendanceHistory')}
            style={{
              padding: 12,
              backgroundColor: 'rgba(201, 169, 97, 0.15)',
              borderRadius: 8,
            }}
          >
            <CalendarDays size={20} color="#C9A961" />
          </TouchableOpacity>
        </View>

        {/* Month Picker Row - Compact */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: 8,
          paddingVertical: 6,
          paddingHorizontal: 12,
        }}>
          <TouchableOpacity onPress={goToPreviousMonth} style={{ padding: 4 }}>
            <ChevronLeft size={18} color="#C9A961" />
          </TouchableOpacity>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', flex: 1, textAlign: 'center' }}>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={{ padding: 4 }}>
            <ChevronRight size={18} color="#C9A961" />
          </TouchableOpacity>
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
            targets={targets}
            userId={user?.uid}
          />
        ) : null}

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
});
