/**
 * StatsScreen - Monthly Performance at a Glance
 *
 * Shows:
 * - Target Progress Card (monthly sales)
 * - Visit Progress Card (monthly visits)
 * - Monthly summary stats
 * - Performance trends
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { Calendar as CalendarComponent } from 'react-native-calendars';
import { useFocusEffect } from '@react-navigation/native';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { TargetProgressCard } from '../components/TargetProgressCard';
import { VisitProgressCard } from '../components/VisitProgressCard';
import { Card } from '../components/ui';
import { KpiCard } from '../patterns/KpiCard';
import { colors, spacing, typography, featureColors } from '../theme';
import {
  TrendingUp,
  Calendar,
  Target,
  MapPin,
  FileText,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';

interface StatsScreenProps {
  navigation: any;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  // State for selected month
  const [selectedDate, setSelectedDate] = useState(new Date());
  const currentMonth = selectedDate.toISOString().substring(0, 7);

  // State for monthly stats
  const [monthlyStats, setMonthlyStats] = useState({
    totalVisits: 0,
    totalSheets: 0,
    totalExpenses: 0,
    daysWorked: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // State for pending items
  const [pendingCounts, setPendingCounts] = useState({
    pendingExpenses: 0,
    unverifiedSheets: 0,
  });
  const [loadingPending, setLoadingPending] = useState(false);

  // State for attendance calendar modal
  const [showCalendar, setShowCalendar] = useState(false);
  const [attendanceDays, setAttendanceDays] = useState<Set<string>>(new Set());

  // Fetch pending items count
  const fetchPendingCounts = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoadingPending(true);
      const firestore = getFirestore();
      const { query, collection, where, getDocs } = await import('@react-native-firebase/firestore');

      // Fetch pending expenses (status = 'pending')
      const expensesQuery = query(
        collection(firestore, 'expenses'),
        where('userId', '==', user.uid),
        where('status', '==', 'pending')
      );
      const expensesSnapshot = await getDocs(expensesQuery);

      // Fetch unverified sheet sales (verified = false or missing)
      const sheetsQuery = query(
        collection(firestore, 'sheetsSales'),
        where('userId', '==', user.uid),
        where('verified', '==', false)
      );
      const sheetsSnapshot = await getDocs(sheetsQuery);

      setPendingCounts({
        pendingExpenses: expensesSnapshot.size,
        unverifiedSheets: sheetsSnapshot.size,
      });
    } catch (error) {
      console.error('Error fetching pending counts:', error);
    } finally {
      setLoadingPending(false);
    }
  }, [user?.uid]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchMonthlyStats(), fetchPendingCounts()]);
    setRefreshing(false);
  }, [fetchMonthlyStats, fetchPendingCounts]);

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

  // Fetch monthly stats
  const fetchMonthlyStats = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);
      const firestore = getFirestore();
      const { query, collection, where, getDocs } = await import('@react-native-firebase/firestore');

      const attendanceDaysSet = new Set<string>();

      // Get first and last day of selected month
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0, 23, 59, 59, 999);

      // Fetch visits for the month
      const visitsQuery = query(
        collection(firestore, 'visits'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', firstDay),
        where('timestamp', '<=', lastDay)
      );
      const visitsSnapshot = await getDocs(visitsQuery);

      // Fetch sheets for the month
      const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

      const sheetsQuery = query(
        collection(firestore, 'sheetsSales'),
        where('userId', '==', user.uid),
        where('date', '>=', startDateStr),
        where('date', '<=', endDateStr)
      );
      const sheetsSnapshot = await getDocs(sheetsQuery);
      let totalSheets = 0;
      sheetsSnapshot.forEach((doc: any) => {
        totalSheets += doc.data().sheetsCount || 0;
      });

      // Fetch expenses for the month
      const expensesQuery = query(
        collection(firestore, 'expenses'),
        where('userId', '==', user.uid),
        where('date', '>=', startDateStr),
        where('date', '<=', endDateStr)
      );
      const expensesSnapshot = await getDocs(expensesQuery);

      // Fetch attendance for the month to count days worked
      const attendanceQuery = query(
        collection(firestore, 'attendance'),
        where('userId', '==', user.uid),
        where('type', '==', 'check_in'),
        where('timestamp', '>=', firstDay),
        where('timestamp', '<=', lastDay)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);

      // Count unique days worked and store for calendar
      const uniqueDays = new Set<string>();
      attendanceSnapshot.forEach((doc: any) => {
        const timestamp = doc.data().timestamp?.toDate();
        if (timestamp) {
          const dateStr = timestamp.toISOString().substring(0, 10);
          uniqueDays.add(dateStr);
          attendanceDaysSet.add(dateStr);
        }
      });

      setMonthlyStats({
        totalVisits: visitsSnapshot.size,
        totalSheets: totalSheets,
        totalExpenses: expensesSnapshot.size,
        daysWorked: uniqueDays.size,
      });

      setAttendanceDays(attendanceDaysSet);
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, selectedDate]);

  // Fetch data when screen is focused or month changes
  useFocusEffect(
    useCallback(() => {
      fetchMonthlyStats();
      fetchPendingCounts();
    }, [fetchMonthlyStats, fetchPendingCounts])
  );

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
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >

        {/* Target Progress Card */}
        {user?.uid && (
          <TargetProgressCard
            userId={user.uid}
            month={currentMonth}
            onLogPress={() => navigation.navigate('SheetsEntry')}
            style={{ marginBottom: spacing.md }}
          />
        )}

        {/* Visit Progress Card */}
        {user?.uid && (
          <VisitProgressCard
            userId={user.uid}
            month={currentMonth}
            onLogPress={() => navigation.navigate('SelectAccount')}
            style={{ marginBottom: spacing.md }}
          />
        )}

        {/* Monthly Summary - Moved before Pending */}
        <Text style={styles.sectionTitle}>This Month's Summary</Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                <KpiCard
                  title="Total Visits"
                  value={monthlyStats.totalVisits.toString()}
                  icon={<MapPin size={16} color={featureColors.visits.primary} />}
                />
                <KpiCard
                  title="Total Sheets"
                  value={monthlyStats.totalSheets.toString()}
                  icon={<FileText size={16} color={featureColors.sheets.primary} />}
                />
              </View>
              <View style={styles.kpiRow}>
                <KpiCard
                  title="Total Expenses"
                  value={monthlyStats.totalExpenses.toString()}
                  icon={<IndianRupee size={16} color={featureColors.expenses.primary} />}
                />
                <View style={{ flex: 1 }}>
                  <TouchableOpacity onPress={() => setShowCalendar(true)} activeOpacity={0.8}>
                    <KpiCard
                      title="Days Worked"
                      value={monthlyStats.daysWorked.toString()}
                      icon={<Calendar size={16} color={featureColors.attendance.primary} />}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}

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

      {/* Attendance Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="slide" onRequestClose={() => setShowCalendar(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.6)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '700' }}>
                Attendance - {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Text style={{ fontSize: 28, color: '#666' }}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
              {monthlyStats.daysWorked} days present • Green = present
            </Text>

            <CalendarComponent
              current={selectedDate.toISOString().substring(0, 10)}
              markedDates={Object.fromEntries(
                Array.from(attendanceDays).map(date => [
                  date,
                  { marked: true, dotColor: '#2E7D32', selected: false }
                ])
              )}
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
            />

            <TouchableOpacity
              onPress={() => setShowCalendar(false)}
              style={{ backgroundColor: '#393735', padding: 14, borderRadius: 12, marginTop: 16 }}
            >
              <Text style={{ color: '#FFF', textAlign: 'center', fontSize: 16, fontWeight: '600' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 100, // Extra padding for floating nav bar
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
