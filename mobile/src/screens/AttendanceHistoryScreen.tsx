/**
 * AttendanceHistoryScreen - Activity-Based Presence Calendar
 *
 * Shows a calendar view of days where the user logged any activity
 * (visits, sheets sales, or expenses). Green dots indicate "active days".
 *
 * This replaces GPS-based attendance with activity-based presence tracking.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Calendar as CalendarComponent } from 'react-native-calendars';
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  MapPin,
  FileText,
  IndianRupee,
} from 'lucide-react-native';
import { getAuth } from '@react-native-firebase/auth';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing } from '../theme';
import { api } from '../services/api';
import { logger } from '../utils/logger';

interface AttendanceHistoryScreenProps {
  navigation: any;
}

export const AttendanceHistoryScreen: React.FC<AttendanceHistoryScreenProps> = ({
  navigation,
}) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  // State for selected month
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Calculate date range for the selected month
  const dateRange = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const lastDay = new Date(year, month + 1, 0);

    return {
      startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`,
    };
  }, [selectedDate]);

  // Fetch stats using React Query
  const {
    data: statsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['activityHistory', user?.uid, dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      if (!user?.uid) throw new Error('No user ID');

      logger.log('[AttendanceHistory] Fetching activity data...');
      const response = await api.getUserStats({
        userId: user.uid,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      return response.stats;
    },
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
  });

  // Extract active days from stats data (days with any activity)
  const { activeDays, activityBreakdown } = useMemo(() => {
    const daysSet = new Set<string>();
    const breakdown = {
      visits: new Set<string>(),
      sheets: new Set<string>(),
      expenses: new Set<string>(),
    };

    if (!statsData) return { activeDays: daysSet, activityBreakdown: breakdown };

    // Extract visit dates
    if (statsData.visits?.records) {
      statsData.visits.records.forEach((record: any) => {
        if (record.timestamp) {
          const date = record.timestamp.toDate?.() || new Date(record.timestamp);
          const dateStr = date.toISOString().substring(0, 10);
          daysSet.add(dateStr);
          breakdown.visits.add(dateStr);
        }
      });
    }

    // Extract sheets dates
    if (statsData.sheets?.records) {
      statsData.sheets.records.forEach((record: any) => {
        const dateField = record.createdAt || record.date;
        if (dateField) {
          const date = dateField.toDate?.() || new Date(dateField);
          const dateStr = typeof dateField === 'string' ? dateField.substring(0, 10) : date.toISOString().substring(0, 10);
          daysSet.add(dateStr);
          breakdown.sheets.add(dateStr);
        }
      });
    }

    // Extract expense dates
    if (statsData.expenses?.records) {
      statsData.expenses.records.forEach((record: any) => {
        const dateField = record.createdAt || record.date;
        if (dateField) {
          const date = dateField.toDate?.() || new Date(dateField);
          const dateStr = typeof dateField === 'string' ? dateField.substring(0, 10) : date.toISOString().substring(0, 10);
          daysSet.add(dateStr);
          breakdown.expenses.add(dateStr);
        }
      });
    }

    return { activeDays: daysSet, activityBreakdown: breakdown };
  }, [statsData]);

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const isCurrentMonth =
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth();

    const totalDays = isCurrentMonth
      ? now.getDate()
      : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

    const activeDaysCount = activeDays.size;
    const percentage = totalDays > 0 ? Math.round((activeDaysCount / totalDays) * 100) : 0;

    return {
      activeDays: activeDaysCount,
      totalDays,
      percentage,
      visitDays: activityBreakdown.visits.size,
      sheetDays: activityBreakdown.sheets.size,
      expenseDays: activityBreakdown.expenses.size,
    };
  }, [selectedDate, activeDays, activityBreakdown]);

  // Create marked dates for calendar
  const markedDates = useMemo(() => {
    return Object.fromEntries(
      Array.from(activeDays).map((date) => [
        date,
        { marked: true, dotColor: '#2E7D32', selected: false },
      ])
    );
  }, [activeDays]);

  // Navigation handlers
  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity History</Text>
        </View>
        <View style={styles.monthPicker}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthNavButton}>
            <ChevronLeft size={20} color="#C9A961" />
          </TouchableOpacity>
          <Text style={styles.monthText}>
            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.monthNavButton}>
            <ChevronRight size={20} color="#C9A961" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryMain}>
            <Text style={styles.summaryValue}>{stats.activeDays}</Text>
            <Text style={styles.summaryLabel}>Active Days</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summarySecondary}>
            <Text style={styles.summaryPercentage}>{stats.percentage}%</Text>
            <Text style={styles.summarySubtext}>of {stats.totalDays} days</Text>
          </View>
        </View>

        {/* Activity Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>ACTIVITY BREAKDOWN</Text>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownIcon, { backgroundColor: '#E3F2FD' }]}>
                <MapPin size={16} color="#1976D2" />
              </View>
              <Text style={styles.breakdownValue}>{stats.visitDays}</Text>
              <Text style={styles.breakdownLabel}>Visit Days</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownIcon, { backgroundColor: '#E8F5E9' }]}>
                <FileText size={16} color="#2E7D32" />
              </View>
              <Text style={styles.breakdownValue}>{stats.sheetDays}</Text>
              <Text style={styles.breakdownLabel}>Sheet Days</Text>
            </View>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownIcon, { backgroundColor: '#FFF3E0' }]}>
                <IndianRupee size={16} color="#E65100" />
              </View>
              <Text style={styles.breakdownValue}>{stats.expenseDays}</Text>
              <Text style={styles.breakdownLabel}>Expense Days</Text>
            </View>
          </View>
        </View>

        {/* Calendar */}
        <View style={styles.calendarCard}>
          <CalendarComponent
            current={selectedDate.toISOString().substring(0, 10)}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#393735',
              selectedDayBackgroundColor: '#C9A961',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#C9A961',
              dayTextColor: '#1A1A1A',
              textDisabledColor: '#E0E0E0',
              dotColor: '#2E7D32',
              selectedDotColor: '#ffffff',
              monthTextColor: '#393735',
              textMonthFontWeight: '700',
            }}
            enableSwipeMonths={false}
            hideArrows={true}
            hideExtraDays={true}
          />
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#2E7D32' }]} />
            <Text style={styles.legendText}>Active day (logged visit, sheets, or expense)</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: '#393735',
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  monthPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  monthNavButton: {
    padding: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
    gap: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryMain: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#2E7D32',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 20,
  },
  summarySecondary: {
    flex: 1,
    alignItems: 'center',
  },
  summaryPercentage: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
  },
  summarySubtext: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  breakdownValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  breakdownLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  legend: {
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
});

export default AttendanceHistoryScreen;
