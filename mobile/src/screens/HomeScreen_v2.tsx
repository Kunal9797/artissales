/**
 * HomeScreen (Sales Rep Dashboard) - Redesigned with DS v0.1
 *
 * Changes from original:
 * - Uses KpiCard pattern for status/stats
 * - Uses Badge for attendance status
 * - Uses featureColors for visual distinction
 * - Reduced from 10+ cards to 5-6 essential items
 * - Added Skeleton loading states
 * - Improved visual hierarchy
 */

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { Card, Badge } from '../components/ui';
import { KpiCard } from '../patterns/KpiCard';
import { colors, spacing, typography, featureColors, shadows } from '../theme';
import { api } from '../services/api';
import { getGreeting } from '../utils/greeting';
import { useBottomSafeArea } from '../hooks/useBottomSafeArea';
import {
  MapPin,
  IndianRupee,
  FileText,
  ChevronRight,
  CheckCircle,
  Clock,
  Bell,
  Sun,
  Edit2,
  Moon,
  Sunrise,
  Lock,
} from 'lucide-react-native';

// FEATURE FLAG: Set to false to disable attendance tracking
const ATTENDANCE_FEATURE_ENABLED = false;

// Simple cache for today's stats (5-minute TTL)
const statsCache: {
  data?: any;
  timestamp?: number;
  userId?: string;
  date?: string;
} = {};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedStats = (userId: string, date: string) => {
  const now = Date.now();
  if (
    statsCache.data &&
    statsCache.userId === userId &&
    statsCache.date === date &&
    statsCache.timestamp &&
    now - statsCache.timestamp < CACHE_TTL
  ) {
    return statsCache.data;
  }
  return null;
};

const setCachedStats = (userId: string, date: string, data: any) => {
  statsCache.data = data;
  statsCache.userId = userId;
  statsCache.date = date;
  statsCache.timestamp = Date.now();
};

export const invalidateHomeStatsCache = () => {
  statsCache.data = undefined;
  statsCache.timestamp = undefined;
};

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  // Safe area insets for bottom padding (accounts for Android nav bar)
  const bottomPadding = useBottomSafeArea(12);

  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<{
    isCheckedIn: boolean;
    hasCheckedOut: boolean;
    checkInTime: string | null;
    checkOutTime: string | null;
    location: string | null;
  }>({
    isCheckedIn: false,
    hasCheckedOut: false,
    checkInTime: null,
    checkOutTime: null,
    location: null,
  });
  const [todayStats, setTodayStats] = useState({
    visits: 0,
    sheets: 0,
    expenses: 0,
  });
  const [pendingItems, setPendingItems] = useState<Array<{ id: number; text: string; screen: string }>>([]);
  const [todayActivities, setTodayActivities] = useState<Array<{
    id: string;
    type: 'visit' | 'sheets' | 'expense' | 'attendance';
    time: Date;
    description: string;
    value?: string;  // Main number/value to highlight (e.g., "10 sheets", "₹500")
    detail?: string; // Secondary info (e.g., "Fine Decor", "Travel")
    notes?: string;  // Notes/description for display in action sheet
    purpose?: string; // Visit purpose
    status?: 'pending' | 'verified' | 'rejected'; // For sheets/expenses
  }>>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state for activity feed
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Activity filter state
  const [activityFilter, setActivityFilter] = useState<'all' | 'visit' | 'sheets' | 'expense'>('all');

  // Activity action sheet state
  const [selectedActivity, setSelectedActivity] = useState<typeof todayActivities[0] | null>(null);
  const [deletingActivity, setDeletingActivity] = useState(false);

  // Updated toast state
  const [showUpdatedToast, setShowUpdatedToast] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // Fetch attendance data
  const fetchAttendance = useCallback(async () => {
    if (!user?.uid || !ATTENDANCE_FEATURE_ENABLED) return;

    try {
      const firestore = getFirestore();

      // Get start of today (00:00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Query attendance for today using timestamp field (not date)
      const { query, collection, where, getDocs } = await import('@react-native-firebase/firestore');
      const attendanceQuery = query(
        collection(firestore, 'attendance'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', today)
      );

      const snapshot = await getDocs(attendanceQuery);

      if (!snapshot.empty) {
        // Sort manually to get latest
        const docs = snapshot.docs.sort((a: any, b: any) => {
          const aTime = a.data().timestamp?.toMillis() || 0;
          const bTime = b.data().timestamp?.toMillis() || 0;
          return bTime - aTime;
        });

        const latestAttendance = docs[0].data();
        const isCheckedIn = latestAttendance.type === 'check_in';
        const hasCheckedOut = latestAttendance.type === 'check_out';
        const time = latestAttendance.timestamp?.toDate();

        // Find check-in time if we have a check-out (to show worked duration)
        let checkInTime = null;
        if (hasCheckedOut) {
          const checkInDoc = docs.find((d: any) => d.data().type === 'check_in');
          if (checkInDoc) {
            const checkInTimestamp = checkInDoc.data().timestamp?.toDate();
            checkInTime = checkInTimestamp ? checkInTimestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
          }
        } else if (isCheckedIn) {
          checkInTime = time ? time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
        }

        setAttendanceStatus({
          isCheckedIn,
          hasCheckedOut,
          checkInTime,
          checkOutTime: hasCheckedOut && time ? time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
          location: 'Location',
        });
      } else {
        // Reset to not checked in if no records found
        setAttendanceStatus({
          isCheckedIn: false,
          hasCheckedOut: false,
          checkInTime: null,
          checkOutTime: null,
          location: null,
        });
      }
    } catch (error) {
      logger.error('Error fetching attendance:', error);
    }
  }, [user?.uid]);

  // Refs for pagination (to avoid dependency issues)
  const lastVisibleVisitRef = React.useRef<any>(null);
  const lastVisibleSheetRef = React.useRef<any>(null);
  const lastVisibleExpenseRef = React.useRef<any>(null);

  // Fetch activity feed (last 30 items, paginated)
  const fetchActivities = useCallback(async (loadMore: boolean = false) => {
    if (!user?.uid) return;

    try {
      const firestore = getFirestore();
      const { query, collection, where, getDocs, orderBy, limit, startAfter } = await import('@react-native-firebase/firestore');

      // Fetch visits - ordered by timestamp, limit 30
      let visitsQuery = query(
        collection(firestore, 'visits'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(30)
      );
      if (loadMore && lastVisibleVisitRef.current) {
        visitsQuery = query(
          collection(firestore, 'visits'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          startAfter(lastVisibleVisitRef.current),
          limit(30)
        );
      }
      const visitsSnapshot = await getDocs(visitsQuery);

      // Fetch sheets - ordered by createdAt, limit 30
      let sheetsQuery = query(
        collection(firestore, 'sheetsSales'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(30)
      );
      if (loadMore && lastVisibleSheetRef.current) {
        sheetsQuery = query(
          collection(firestore, 'sheetsSales'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisibleSheetRef.current),
          limit(30)
        );
      }
      const sheetsSnapshot = await getDocs(sheetsQuery);

      // Fetch expenses - ordered by createdAt, limit 30
      let expensesQuery = query(
        collection(firestore, 'expenses'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(30)
      );
      if (loadMore && lastVisibleExpenseRef.current) {
        expensesQuery = query(
          collection(firestore, 'expenses'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisibleExpenseRef.current),
          limit(30)
        );
      }
      const expensesSnapshot = await getDocs(expensesQuery);

      // Calculate today's stats (for KPI cards - still shows today's counts)
      const todayString = new Date().toISOString().substring(0, 10);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let todayVisits = 0;
      let totalSheets = 0;
      let totalExpenses = 0;

      // Count today's items from the fetched results
      visitsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        const visitTime = data.timestamp?.toDate();
        if (visitTime && visitTime >= today) {
          todayVisits++;
        }
      });

      sheetsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.date === todayString) {
          totalSheets += data.sheetsCount || 0;
        }
      });

      expensesSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.date === todayString && data.items && Array.isArray(data.items)) {
          data.items.forEach((item: any) => {
            totalExpenses += item.amount || 0;
          });
        }
      });

      setTodayStats({
        visits: todayVisits,
        sheets: totalSheets,
        expenses: totalExpenses,
      });

      // Build activity timeline
      const activities: Array<{
        id: string;
        type: 'visit' | 'sheets' | 'expense' | 'attendance';
        time: Date;
        description: string;
        status?: 'pending' | 'verified' | 'rejected';
      }> = [];

      // NOTE: Attendance tracking is disabled for V1 (ATTENDANCE_FEATURE_ENABLED = false)
      // No attendance activities are added to the feed

      // Add visits (no detail on card, but store notes/purpose for action sheet)
      visitsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'visit',
          time: data.timestamp?.toDate() || new Date(),
          description: data.accountName || 'Client visit',
          value: data.accountName || 'Client',
          notes: data.notes || undefined,
          purpose: data.purpose ? data.purpose.replace(/_/g, ' ') : undefined,
        });
      });

      // Add sheets sales (just number + catalog, no "sheets" text)
      sheetsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'sheets',
          time: data.createdAt?.toDate() || new Date(),
          description: `${data.sheetsCount} - ${data.catalog}`,
          value: String(data.sheetsCount),
          detail: data.catalog,
          notes: data.notes || undefined,
          status: data.verified ? 'verified' : 'pending',
        });
      });

      // Add expenses
      expensesSnapshot.forEach((doc: any) => {
        const data = doc.data();
        // Calculate total amount from items array
        const totalAmount = data.items && Array.isArray(data.items)
          ? data.items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
          : 0;

        // Get primary category from first item (capitalize first letter)
        let categoryLabel = 'Expense';
        if (data.items && data.items.length > 0) {
          const firstItem = data.items[0];
          if (firstItem.category === 'other' && firstItem.categoryOther) {
            categoryLabel = firstItem.categoryOther;
          } else {
            // Capitalize first letter (travel → Travel, food → Food)
            categoryLabel = firstItem.category.charAt(0).toUpperCase() + firstItem.category.slice(1);
          }
        }

        // Get description from first item if available
        const expenseNotes = data.items && data.items.length > 0 && data.items[0].description
          ? data.items[0].description
          : undefined;

        activities.push({
          id: doc.id,
          type: 'expense',
          time: data.createdAt?.toDate() || new Date(),
          description: `${totalAmount} - ${categoryLabel}`,
          value: String(totalAmount),
          detail: categoryLabel,
          notes: expenseNotes,
          status: data.status || 'pending', // 'pending' | 'verified' | 'rejected'
        });
      });

      // Sort by time (most recent first)
      activities.sort((a, b) => b.time.getTime() - a.time.getTime());

      // Update activities (append if loadMore, replace if initial)
      if (loadMore) {
        setTodayActivities(prev => [...prev, ...activities]);
      } else {
        setTodayActivities(activities);
      }

      // Store last visible documents for pagination (using refs to avoid re-renders)
      if (visitsSnapshot.docs.length > 0) {
        lastVisibleVisitRef.current = visitsSnapshot.docs[visitsSnapshot.docs.length - 1];
      }
      if (sheetsSnapshot.docs.length > 0) {
        lastVisibleSheetRef.current = sheetsSnapshot.docs[sheetsSnapshot.docs.length - 1];
      }
      if (expensesSnapshot.docs.length > 0) {
        lastVisibleExpenseRef.current = expensesSnapshot.docs[expensesSnapshot.docs.length - 1];
      }

      // Check if there's more data (if all collections returned < 30, we're done)
      const hasMoreData = visitsSnapshot.docs.length === 30 ||
                          sheetsSnapshot.docs.length === 30 ||
                          expensesSnapshot.docs.length === 30;
      setHasMore(hasMoreData);

    } catch (error) {
      logger.error('Error fetching activities:', error);
    }
  }, [user?.uid]); // Only depend on user.uid - refs don't need to be in deps

  // Load more activities for pagination
  const loadMoreActivities = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchActivities(true);
    setLoadingMore(false);
  }, [hasMore, loadingMore, fetchActivities]);

  // Refresh function for pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset pagination refs
    lastVisibleVisitRef.current = null;
    lastVisibleSheetRef.current = null;
    lastVisibleExpenseRef.current = null;
    setHasMore(true);
    // Fetch fresh data
    await Promise.all([fetchAttendance(), fetchActivities(false)]);
    setRefreshing(false);

    // Show "Updated" toast with current time
    const now = new Date();
    setLastUpdatedTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    setShowUpdatedToast(true);
    setTimeout(() => setShowUpdatedToast(false), 2000);
  }, [fetchAttendance, fetchActivities]);

  useEffect(() => {
    const loadUserData = async () => {
      if (user?.uid) {
        try {
          const firestore = getFirestore();
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData?.name || 'User');

            // Managers are routed via RootNavigator based on role
            // No need to manually redirect here
          }
        } catch (error) {
          logger.error('Error loading user data:', error);
          setUserName('User');
        } finally {
          setLoading(false);
        }
      }
    };

    loadUserData();
  }, [user?.uid, navigation]);

  // Fetch data on mount only (Phase 2A optimization)
  // User can manually refresh via pull-to-refresh
  useEffect(() => {
    if (user?.uid) {
      // Run all queries in parallel for faster loading
      Promise.all([
        fetchAttendance(),
        fetchActivities(false),
      ]);
    }
  }, [user?.uid, fetchAttendance, fetchActivities]);


  // Helper function to get date/time display with "Today" indicator
  const getActivityTimeDisplay = (date: Date): { primary: string; secondary: string; isToday: boolean } => {
    const now = new Date();
    const activityDate = new Date(date);

    // Check if it's today
    const isToday = activityDate.toDateString() === now.toDateString();

    if (isToday) {
      // For today: show relative time as primary, no secondary
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      let relativeTime = 'Just now';
      if (diffMins >= 1 && diffMins < 60) relativeTime = `${diffMins}m ago`;
      else if (diffHours >= 1 && diffHours < 24) relativeTime = `${diffHours}h ago`;

      return { primary: relativeTime, secondary: '', isToday: true };
    } else {
      // For older: show date as primary, time as secondary
      const dateStr = activityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = activityDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return { primary: dateStr, secondary: timeStr, isToday: false };
    }
  };

  // Helper to calculate working duration
  const getWorkingDuration = (): string | null => {
    if (!attendanceStatus.isCheckedIn || !attendanceStatus.checkInTime) return null;

    try {
      const now = new Date();
      const timeStr = attendanceStatus.checkInTime;

      // Parse time string like "9:15 AM" or "2:30 PM"
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;

      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();

      // Convert to 24-hour format
      let checkInHour = hours;
      if (period === 'PM' && hours !== 12) {
        checkInHour = hours + 12;
      } else if (period === 'AM' && hours === 12) {
        checkInHour = 0;
      }

      const checkIn = new Date();
      checkIn.setHours(checkInHour, minutes, 0, 0);

      const diffMs = now.getTime() - checkIn.getTime();
      if (diffMs < 0) return '0m'; // Future time

      const totalMins = Math.floor(diffMs / 60000);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;

      if (hrs === 0) return `${mins}m`;
      return `${hrs}h ${mins}m`;
    } catch (error) {
      logger.error('Error calculating duration:', error);
      return null;
    }
  };

  const greeting = getGreeting();

  // Delete activity handler
  const handleDeleteActivity = async (activity: typeof todayActivities[0]) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingActivity(true);
            try {
              if (activity.type === 'visit') {
                await api.deleteVisit({ id: activity.id });
              } else if (activity.type === 'sheets') {
                await api.deleteSheetsSale({ id: activity.id });
              } else if (activity.type === 'expense') {
                await api.deleteExpense({ id: activity.id });
              }

              // Remove from local state immediately
              setTodayActivities(prev => prev.filter(a => a.id !== activity.id));
              setSelectedActivity(null);

              // Invalidate cache and refresh stats
              invalidateHomeStatsCache();
            } catch (error: any) {
              logger.error('Error deleting activity:', error);
              Alert.alert('Error', error.message || 'Failed to delete');
            } finally {
              setDeletingActivity(false);
            }
          },
        },
      ]
    );
  };

  // Helper function to render compact activity item
  const renderActivityItem = (activity: typeof todayActivities[0], isLast: boolean, index: number) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const isToday = activity.time >= todayStart;

    // Icon directly without background (larger size)
    const getActivityIcon = () => {
      switch (activity.type) {
        case 'visit':
          return <MapPin size={24} color={featureColors.visits.primary} />;
        case 'sheets':
          return <FileText size={24} color={featureColors.sheets.primary} />;
        case 'expense':
          return <IndianRupee size={24} color={featureColors.expenses.primary} />;
        default:
          return <CheckCircle size={24} color={featureColors.attendance.primary} />;
      }
    };

    // Status icon (only for sheets/expenses)
    const getStatusIcon = () => {
      if (activity.type !== 'sheets' && activity.type !== 'expense') return null;
      const status = activity.status || 'pending';

      switch (status) {
        case 'pending':
          return <Clock size={16} color="#F9A825" />;
        case 'verified':
        case 'approved':
          return <CheckCircle size={16} color="#2E7D32" />;
        case 'rejected':
          return (
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#C62828' }}>✕</Text>
            </View>
          );
        default:
          return <Clock size={16} color="#F9A825" />;
      }
    };

    // Compact time format
    const getCompactTime = () => {
      const diffMs = now.getTime() - activity.time.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'now';
      if (diffMins < 60) return `${diffMins}m`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}d`;
      return activity.time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
      <TouchableOpacity
        key={activity.id}
        activeOpacity={0.7}
        onPress={() => setSelectedActivity(activity)}
        style={{
          backgroundColor: colors.surface,
          borderRadius: 10,
          paddingVertical: 14,
          paddingHorizontal: 14,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: colors.border.light,
        }}
      >
        {/* Single row: Icon + Value • Detail • Time + Status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Icon without background */}
          {getActivityIcon()}

          {/* Content: Value • Detail • Time */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{
              fontSize: (activity.type === 'sheets' || activity.type === 'expense') ? 19 : 17,
              fontWeight: '600',
              color: colors.text.primary
            }}>
              {activity.value || activity.description}
            </Text>
            {activity.detail && (
              <Text style={{ fontSize: 15, color: colors.text.secondary, marginLeft: 6 }}>
                • {activity.detail}
              </Text>
            )}
            <Text style={{ fontSize: 13, color: colors.text.tertiary, marginLeft: 6 }}>
              • {getCompactTime()}
            </Text>
          </View>

          {/* Status icon for sheets/expenses */}
          {getStatusIcon()}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Minimal Header */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Time icon + Welcome, Name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {greeting.icon === 'sunrise' && <Sunrise size={22} color="#C9A961" />}
          {greeting.icon === 'sun' && <Sun size={22} color="#C9A961" />}
          {greeting.icon === 'moon' && <Moon size={22} color="#C9A961" />}
          <Text style={{ fontSize: 22, fontWeight: '600', color: '#FFFFFF' }}>
            Welcome, {userName ? userName.charAt(0).toUpperCase() + userName.slice(1) : 'User'}
          </Text>
        </View>

        {/* Artis Logo - Larger, faded */}
        <Image
          source={require('../../assets/images/artislogo_blackbgrd.png')}
          style={{ width: 56, height: 56, opacity: 0.4 }}
          resizeMode="contain"
        />
      </View>

      {/* Updated Toast */}
      {showUpdatedToast && (
        <View style={{
          position: 'absolute',
          top: 130,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 100,
        }}>
          <View style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '500' }}>
              Updated {lastUpdatedTime}
            </Text>
          </View>
        </View>
      )}

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

        {/* Attendance Status Card - Compact Design (DISABLED via feature flag) */}
        {ATTENDANCE_FEATURE_ENABLED && (
          <Card elevation="md" style={styles.attendanceCard}>
            {attendanceStatus.isCheckedIn ? (
            // State 1: Currently checked in - Show working duration and Check Out button
            <>
              <View style={styles.attendanceRow}>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusLabel}>Working for</Text>
                  <Text style={styles.statusValue}>{getWorkingDuration()}</Text>
                  <Text style={styles.checkInText}>
                    Checked in at {attendanceStatus.checkInTime}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.checkOutButton}
                  onPress={() => setShowAttendanceModal(true)}
                >
                  <Text style={styles.checkOutButtonText}>Check Out</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : attendanceStatus.hasCheckedOut ? (
            // State 2: Already checked out - Show completion message with Check In Again button
            <>
              <View style={styles.attendanceRow}>
                <View style={styles.statusInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <CheckCircle size={20} color={featureColors.attendance.primary} strokeWidth={2.5} />
                    <Text style={styles.statusLabel}>Day Complete</Text>
                  </View>
                  <Text style={styles.notCheckedInText}>
                    Checked out at {attendanceStatus.checkOutTime}
                  </Text>
                  {attendanceStatus.checkInTime && (
                    <Text style={styles.checkInText}>
                      Started at {attendanceStatus.checkInTime}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.checkInAgainButton}
                  onPress={() => setShowAttendanceModal(true)}
                >
                  <Text style={styles.checkInAgainButtonText}>Check In Again</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            // State 3: Not checked in yet - Show Check In button
            <>
              <View style={styles.attendanceRow}>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusLabel}>Attendance</Text>
                  <Text style={styles.notCheckedInText}>Not checked in</Text>
                </View>
                <TouchableOpacity
                  style={styles.checkInButton}
                  onPress={() => setShowAttendanceModal(true)}
                >
                  <Text style={styles.checkInButtonText}>Check In</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
          </Card>
        )}

        {/* KPI Cards - Today's Stats (Tappable as filters) */}
        <View style={styles.kpiSection}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <View style={styles.kpiRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActivityFilter(activityFilter === 'visit' ? 'all' : 'visit')}
              style={{
                flex: 1,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: activityFilter === 'visit' ? featureColors.visits.primary : 'transparent',
              }}
            >
              <KpiCard
                title="Visits"
                value={todayStats.visits.toString()}
                icon={<MapPin size={20} color={featureColors.visits.primary} />}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActivityFilter(activityFilter === 'sheets' ? 'all' : 'sheets')}
              style={{
                flex: 1,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: activityFilter === 'sheets' ? featureColors.sheets.primary : 'transparent',
              }}
            >
              <KpiCard
                title="Sheets"
                value={todayStats.sheets.toString()}
                icon={<FileText size={20} color={featureColors.sheets.primary} />}
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setActivityFilter(activityFilter === 'expense' ? 'all' : 'expense')}
              style={{
                flex: 1,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: activityFilter === 'expense' ? featureColors.expenses.primary : 'transparent',
              }}
            >
              <KpiCard
                title="Expenses"
                value={todayStats.expenses.toString()}
                icon={<IndianRupee size={20} color={featureColors.expenses.primary} />}
              />
            </TouchableOpacity>
          </View>
        </View>

        {todayActivities.length > 0 ? (
          <View>
            {(() => {
              // Filter activities based on selected filter
              const filteredActivities = activityFilter === 'all'
                ? todayActivities
                : todayActivities.filter(a => a.type === activityFilter);

              // Separate today's and older activities
              const now = new Date();
              const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const todayItems = filteredActivities.filter(a => a.time >= todayStart);
              const olderItems = filteredActivities.filter(a => a.time < todayStart);

              return (
                <>
                  {/* No activities today - show faded message */}
                  {todayItems.length === 0 && olderItems.length > 0 && (
                    <View style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      borderRadius: 12,
                      paddingVertical: 20,
                      paddingHorizontal: 16,
                      marginBottom: 8,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: colors.border.light,
                      borderStyle: 'dashed',
                    }}>
                      <Text style={{ fontSize: 14, color: colors.text.tertiary, textAlign: 'center' }}>
                        No activities logged today
                      </Text>
                    </View>
                  )}

                  {/* Today's Activities (no label needed - anything above "Earlier" is today) */}
                  {todayItems.map((activity, index) => {
                    const isLast = index === todayItems.length - 1 && olderItems.length === 0;
                    return renderActivityItem(activity, isLast, index);
                  })}

                  {/* Earlier separator (only shown when there are older items) */}
                  {olderItems.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 }}>
                      <View style={{ flex: 1, height: 1, backgroundColor: colors.border.light }} />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Earlier
                      </Text>
                      <View style={{ flex: 1, height: 1, backgroundColor: colors.border.light }} />
                    </View>
                  )}

                  {/* Older Activities */}
                  {olderItems.map((activity, index) => {
                    const isLast = index === olderItems.length - 1;
                    return renderActivityItem(activity, isLast, index + todayItems.length);
                  })}

                  {/* Empty state for filtered results */}
                  {filteredActivities.length === 0 && (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Text style={{ color: colors.text.tertiary }}>No {activityFilter} activities found</Text>
                    </View>
                  )}
                </>
              );
            })()}
            {/* Moved outside the IIFE */}
          </View>
        ) : (
          <Card elevation="sm" style={styles.timelineCard}>
            <View style={styles.emptyTimeline}>
              <Clock size={20} color={colors.text.tertiary} />
              <Text style={styles.emptyTimelineText}>
                Your activities will appear here as you log visits, sheets, and expenses
              </Text>
            </View>
          </Card>
        )}

        {/* Load More Button */}
        {hasMore && todayActivities.length > 0 && (
          <TouchableOpacity
            style={{
              marginTop: spacing.md,
              padding: spacing.md,
              backgroundColor: colors.surface,
              borderRadius: spacing.borderRadius.md,
              borderWidth: 1,
              borderColor: colors.border.light,
              alignItems: 'center',
            }}
            onPress={loadMoreActivities}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                Load More
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* Pending Action Items */}
        {pendingItems.length > 0 && (
          <Card elevation="md" style={styles.pendingCard}>
            <View style={styles.pendingHeader}>
              <Bell size={20} color={colors.warning} />
              <Text style={styles.pendingTitle}>Action Items</Text>
              <Badge variant="warning">{pendingItems.length}</Badge>
            </View>
            {pendingItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.pendingItem}
                onPress={() => navigation.navigate(item.screen)}
              >
                <Text style={styles.pendingItemText}>• {item.text}</Text>
                <ChevronRight size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            ))}
          </Card>
        )}

      </ScrollView>

      {/* Attendance Check-In/Out Modal */}
      <Modal
        visible={showAttendanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => !attendanceLoading && setShowAttendanceModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
          }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
              {attendanceStatus.isCheckedIn ? 'Check Out' : 'Check In'}
            </Text>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 24 }}>
              {attendanceStatus.isCheckedIn
                ? `You've been working for ${getWorkingDuration() || 'today'}`
                : 'Start your work day'}
            </Text>

            <View style={{ backgroundColor: '#F8F8F8', padding: 16, borderRadius: 12, marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MapPin size={18} color="#666666" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>Location</Text>
              </View>
              <Text style={{ fontSize: 14, color: '#666666' }}>
                {attendanceStatus.location || 'Getting location...'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Clock size={18} color="#666666" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>Time</Text>
              </View>
              <Text style={{ fontSize: 14, color: '#666666' }}>
                {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: attendanceLoading ? '#E0E0E0' : '#F8F8F8',
                  alignItems: 'center'
                }}
                onPress={() => setShowAttendanceModal(false)}
                disabled={attendanceLoading}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: attendanceLoading ? '#999999' : '#666666' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: attendanceLoading
                    ? (attendanceStatus.isCheckedIn ? '#EF5350' : '#2E7D32') + '99' // Add transparency when loading
                    : (attendanceStatus.isCheckedIn ? '#EF5350' : '#2E7D32'),
                  alignItems: 'center',
                  opacity: attendanceLoading ? 0.7 : 1,
                }}
                onPress={async () => {
                  try {
                    setAttendanceLoading(true);

                    // Get location
                    const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
                    const { status } = await requestForegroundPermissionsAsync();

                    if (status !== 'granted') {
                      Alert.alert('Permission Denied', 'Location permission is required');
                      setAttendanceLoading(false);
                      return;
                    }

                    const location = await getCurrentPositionAsync({ accuracy: 5 });

                    // Call API (backend expects lat/lon not latitude/longitude)
                    const response = attendanceStatus.isCheckedIn
                      ? await api.checkOut({
                          lat: location.coords.latitude,
                          lon: location.coords.longitude,
                          accuracyM: Math.round(location.coords.accuracy || 0),
                        })
                      : await api.checkIn({
                          lat: location.coords.latitude,
                          lon: location.coords.longitude,
                          accuracyM: Math.round(location.coords.accuracy || 0),
                        });

                    if (response.ok) {
                      Alert.alert('Success', attendanceStatus.isCheckedIn ? 'Checked out successfully' : 'Checked in successfully');
                      fetchAttendance();
                    }

                    setShowAttendanceModal(false);
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to process attendance');
                  } finally {
                    setAttendanceLoading(false);
                  }
                }}
                disabled={attendanceLoading}
              >
                {attendanceLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                    {attendanceStatus.isCheckedIn ? 'Check Out' : 'Check In'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activity Action Sheet Modal */}
      <Modal
        visible={!!selectedActivity}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedActivity(null)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setSelectedActivity(null)}
        >
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            paddingBottom: 32,
          }}>
            {selectedActivity && (() => {
              const now = new Date();
              // Visits editable within 48 hours, sheets/expenses editable if pending
              const hoursSinceActivity = (now.getTime() - selectedActivity.time.getTime()) / (1000 * 60 * 60);
              const canEdit = selectedActivity.type === 'visit'
                ? hoursSinceActivity <= 48
                : (selectedActivity.type === 'sheets' || selectedActivity.type === 'expense')
                  ? selectedActivity.status === 'pending'
                  : false;

              const getStatusText = () => {
                if (selectedActivity.type === 'visit') return null;
                const status = selectedActivity.status || 'pending';
                const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
                  pending: { label: 'Pending Review', color: '#F9A825', bg: '#FFF8E1' },
                  verified: { label: 'Verified', color: '#2E7D32', bg: '#E8F5E9' },
                  approved: { label: 'Approved', color: '#2E7D32', bg: '#E8F5E9' },
                  rejected: { label: 'Rejected', color: '#C62828', bg: '#FFEBEE' },
                };
                return statusConfig[status] || statusConfig.pending;
              };

              const statusInfo = getStatusText();

              return (
                <>
                  {/* Header */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary }}>
                        {selectedActivity.value || selectedActivity.description}
                      </Text>
                      {selectedActivity.detail && (
                        <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 2 }}>
                          {selectedActivity.detail}
                        </Text>
                      )}
                    </View>
                    {statusInfo && (
                      <View style={{
                        backgroundColor: statusInfo.bg,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 12,
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: statusInfo.color }}>
                          {statusInfo.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Purpose (for visits) */}
                  {selectedActivity.type === 'visit' && selectedActivity.purpose && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary, textTransform: 'uppercase', marginBottom: 2 }}>Purpose</Text>
                      <Text style={{ fontSize: 14, color: colors.text.secondary }}>{selectedActivity.purpose}</Text>
                    </View>
                  )}

                  {/* Notes */}
                  {selectedActivity.notes && (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary, textTransform: 'uppercase', marginBottom: 2 }}>Notes</Text>
                      <Text style={{ fontSize: 14, color: colors.text.secondary }}>{selectedActivity.notes}</Text>
                    </View>
                  )}

                  {/* Time */}
                  <Text style={{ fontSize: 13, color: colors.text.tertiary, marginBottom: 16 }}>
                    {selectedActivity.time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {selectedActivity.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </Text>

                  {/* Actions */}
                  <View style={{ gap: 10 }}>
                    {canEdit && (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: colors.primary,
                            paddingVertical: 14,
                            borderRadius: 10,
                            alignItems: 'center',
                          }}
                          onPress={() => {
                            setSelectedActivity(null);
                            if (selectedActivity.type === 'visit') {
                              navigation.navigate('LogVisit', { editActivityId: selectedActivity.id });
                            } else if (selectedActivity.type === 'sheets') {
                              navigation.navigate('SheetsEntry', { editActivityId: selectedActivity.id });
                            } else if (selectedActivity.type === 'expense') {
                              navigation.navigate('ExpenseEntry', { editActivityId: selectedActivity.id });
                            }
                          }}
                          disabled={deletingActivity}
                        >
                          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                            Edit
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            paddingVertical: 14,
                            paddingHorizontal: 20,
                            borderRadius: 10,
                            alignItems: 'center',
                            backgroundColor: '#FFEBEE',
                          }}
                          onPress={() => handleDeleteActivity(selectedActivity)}
                          disabled={deletingActivity}
                        >
                          {deletingActivity ? (
                            <ActivityIndicator size="small" color="#C62828" />
                          ) : (
                            <Text style={{ fontSize: 16, fontWeight: '600', color: '#C62828' }}>
                              Delete
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </>
              );
            })()}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Minimal Greeting Bar
  greetingBar: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: 52, // Status bar space
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  greetingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greetingText: {
    fontSize: 19,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
    // paddingBottom set dynamically via useBottomSafeArea hook (60 + bottomPadding)
  },

  // Attendance Status Card - Compact Design
  attendanceCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: featureColors.attendance.primary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  checkInText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  notCheckedInText: {
    fontSize: 15,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  // Check Out button
  checkOutButton: {
    backgroundColor: '#FFEBEE',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
  },
  checkOutButtonText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: '#C62828',
  },
  // Check In button
  checkInButton: {
    backgroundColor: featureColors.attendance.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
  },
  checkInButtonText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.surface,
  },
  // Completed badge (for checked out state)
  completedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: featureColors.attendance.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadgeText: {
    fontSize: 24,
    color: featureColors.attendance.primary,
  },
  // Check In Again button (smaller, secondary style)
  checkInAgainButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: featureColors.attendance.primary,
  },
  checkInAgainButtonText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: featureColors.attendance.primary,
  },

  // KPI Section
  kpiSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Activity Timeline with connecting lines
  timelineContainer: {
    marginBottom: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm, // Add spacing between timeline cards
  },
  timelineLine: {
    alignItems: 'center',
    width: 24,
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 34, // 16px (card padding) + 18px (half of 36px icon) = 34px to center with icon
    zIndex: 2,
  },
  timelineConnector: {
    position: 'absolute',
    width: 2,
    top: 46, // 34px (dot position) + 12px (dot height) = 46px - start right after dot
    bottom: -(spacing.sm + 34 + 6), // Extend through gap to next dot center: -(8px gap + 34px next dot position + 6px to dot center)
    left: 11, // Center the 2px line in 24px width: (24-2)/2 = 11px
    backgroundColor: colors.border.light,
  },
  activityCard: {
    padding: spacing.md,
    flex: 1,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: spacing.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
  },
  editButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  timelineCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  emptyTimeline: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyTimelineText: {
    ...typography.styles.body,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Pending Items Card
  pendingCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pendingTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    flex: 1,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  pendingItemText: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: spacing.md,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  quickActionText: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
    fontWeight: typography.fontWeight.medium,
  },

  // Dev button
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent + '20',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    marginTop: spacing.md,
  },
  devButtonText: {
    ...typography.styles.button,
    color: colors.accent,
    fontSize: typography.fontSize.sm,
  },

  // DSR Reports Button
  dsrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  dsrButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  dsrButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  dsrBadgeContainer: {
    marginLeft: spacing.xs,
  },
});
