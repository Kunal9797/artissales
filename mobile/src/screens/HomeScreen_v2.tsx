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
import { useFocusEffect } from '@react-navigation/native';
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
} from 'lucide-react-native';

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
  }>>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [needsRevisionCount, setNeedsRevisionCount] = useState(0);

  // Fetch attendance data
  const fetchAttendance = useCallback(async () => {
    if (!user?.uid) return;

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

  // Fetch today's stats and activities
  const fetchTodayStats = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const firestore = getFirestore();

      // Get start of today (00:00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayString = new Date().toISOString().substring(0, 10);

      const { query, collection, where, getDocs } = await import('@react-native-firebase/firestore');

      // Fetch visits - using timestamp field (not date)
      const visitsQuery = query(
        collection(firestore, 'visits'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', today)
      );
      const visitsSnapshot = await getDocs(visitsQuery);

      // Fetch sheets - using date field
      const sheetsQuery = query(
        collection(firestore, 'sheetsSales'),
        where('userId', '==', user.uid),
        where('date', '==', todayString)
      );
      const sheetsSnapshot = await getDocs(sheetsQuery);
      let totalSheets = 0;
      sheetsSnapshot.forEach((doc: any) => {
        totalSheets += doc.data().sheetsCount || 0;
      });

      // Fetch expenses - using date field
      const expensesQuery = query(
        collection(firestore, 'expenses'),
        where('userId', '==', user.uid),
        where('date', '==', todayString)
      );
      const expensesSnapshot = await getDocs(expensesQuery);

      // Calculate total expense amount from all items
      let totalExpenses = 0;
      expensesSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.items && Array.isArray(data.items)) {
          data.items.forEach((item: any) => {
            totalExpenses += item.amount || 0;
          });
        }
      });

      // Fetch attendance for today - to include in timeline
      const attendanceQuery = query(
        collection(firestore, 'attendance'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', today)
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);

      setTodayStats({
        visits: visitsSnapshot.size,
        sheets: totalSheets,
        expenses: totalExpenses,
      });

      // Build activity timeline
      const activities: Array<{
        id: string;
        type: 'visit' | 'sheets' | 'expense' | 'attendance';
        time: Date;
        description: string;
      }> = [];

      // Add attendance (check-in/check-out)
      attendanceSnapshot.forEach((doc: any) => {
        const data = doc.data();
        const time = data.timestamp?.toDate() || new Date();
        activities.push({
          id: doc.id,
          type: 'attendance',
          time,
          description: data.type === 'check_in'
            ? `Checked in at ${time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
            : `Checked out at ${time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
        });
      });

      // Add visits
      visitsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'visit',
          time: data.timestamp?.toDate() || new Date(),
          description: `Visited ${data.accountName || 'a client'}`,
        });
      });

      // Add sheets sales
      sheetsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'sheets',
          time: data.createdAt?.toDate() || new Date(),
          description: `Logged ${data.sheetsCount} sheets - ${data.catalog}`,
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
        let categoryLabel = 'expense';
        if (data.items && data.items.length > 0) {
          const firstItem = data.items[0];
          if (firstItem.category === 'other' && firstItem.categoryOther) {
            categoryLabel = firstItem.categoryOther;
          } else {
            // Capitalize first letter (travel → Travel, food → Food)
            categoryLabel = firstItem.category.charAt(0).toUpperCase() + firstItem.category.slice(1);
          }
        }

        activities.push({
          id: doc.id,
          type: 'expense',
          time: data.createdAt?.toDate() || new Date(),
          description: `Reported ₹${totalAmount} - ${categoryLabel}`,
        });
      });

      // Sort by time (most recent first)
      activities.sort((a, b) => b.time.getTime() - a.time.getTime());
      setTodayActivities(activities);

    } catch (error) {
      logger.error('Error fetching today stats:', error);
    }
  }, [user?.uid]);

  // Fetch DSRs needing revision
  const fetchNeedsRevisionCount = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const firestore = getFirestore();
      const { query, collection, where, getDocs } = await import('@react-native-firebase/firestore');

      // Query DSRs with status = 'needs_revision' for this user
      const dsrQuery = query(
        collection(firestore, 'dsrReports'),
        where('userId', '==', user.uid),
        where('status', '==', 'needs_revision')
      );
      const dsrSnapshot = await getDocs(dsrQuery);
      setNeedsRevisionCount(dsrSnapshot.size);
    } catch (error) {
      logger.error('Error fetching needs revision count:', error);
      setNeedsRevisionCount(0);
    }
  }, [user?.uid]);

  // Refresh function for pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAttendance(), fetchTodayStats(), fetchNeedsRevisionCount()]);
    setRefreshing(false);
  }, [fetchAttendance, fetchTodayStats, fetchNeedsRevisionCount]);

  useEffect(() => {
    const loadUserData = async () => {
      if (user?.uid) {
        try {
          const firestore = getFirestore();
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData?.role || 'rep';
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

  // Fetch data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchAttendance();
      fetchTodayStats();
      fetchNeedsRevisionCount();
    }, [fetchAttendance, fetchTodayStats, fetchNeedsRevisionCount])
  );


  // Helper function to get relative time ("2 hours ago")
  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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

  return (
    <View style={styles.container}>
      {/* Dark Header with Greeting - Matching Manager Style */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        position: 'relative',
      }}>
        {/* Artis Logo - Translucent background (behind text) */}
        <View style={{
          position: 'absolute',
          right: 16,
          top: 40,
          opacity: 0.15,
          zIndex: 0,
        }}>
          <Image
            source={require('../../assets/images/artislogo_blackbgrd.png')}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>

        {/* Greeting content - overlays logo */}
        <View style={{ zIndex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {greeting.icon === 'sunrise' && <Sunrise size={20} color="#C9A961" />}
            {greeting.icon === 'sun' && <Sun size={20} color="#C9A961" />}
            {greeting.icon === 'moon' && <Moon size={20} color="#C9A961" />}
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF', flex: 1 }}>
              {greeting.text}, {userName ? userName.charAt(0).toUpperCase() + userName.slice(1) : 'User'}!
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 }}>
            {attendanceStatus.isCheckedIn
              ? `Checked in at ${attendanceStatus.checkInTime}`
              : 'Not checked in yet'}
          </Text>
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

        {/* Attendance Status Card - Compact Design */}
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

        {/* DSR Reports Button */}
        <TouchableOpacity
          style={styles.dsrButton}
          onPress={() => navigation.navigate('DSRList')}
          activeOpacity={0.7}
        >
          <View style={styles.dsrButtonContent}>
            <FileText size={20} color={colors.accent} />
            <Text style={styles.dsrButtonText}>DSR Reports</Text>
            {needsRevisionCount > 0 && (
              <View style={styles.dsrBadgeContainer}>
                <Badge variant="error">{needsRevisionCount}</Badge>
              </View>
            )}
          </View>
          <ChevronRight size={20} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Today's Activities - KPI Cards in a row */}
        <View style={styles.kpiSection}>
          <Text style={styles.sectionTitle}>Today's Activities</Text>
          <View style={styles.kpiRow}>
            <KpiCard
              title="Visits"
              value={todayStats.visits.toString()}
              icon={<MapPin size={20} color={featureColors.visits.primary} />}
            />
            <KpiCard
              title="Sheets"
              value={todayStats.sheets.toString()}
              icon={<FileText size={20} color={featureColors.sheets.primary} />}
            />
            <KpiCard
              title="Expenses"
              value={todayStats.expenses.toString()}
              icon={<IndianRupee size={20} color={featureColors.expenses.primary} />}
            />
          </View>
        </View>

        {/* Activity Timeline with connecting lines */}
        {todayActivities.length > 0 ? (
          <View style={styles.timelineContainer}>
            {todayActivities.map((activity, index) => {
              const isLast = index === todayActivities.length - 1;

              const getActivityIcon = () => {
                switch (activity.type) {
                  case 'visit':
                    return <MapPin size={16} color={featureColors.visits.primary} />;
                  case 'sheets':
                    return <FileText size={16} color={featureColors.sheets.primary} />;
                  case 'expense':
                    return <IndianRupee size={16} color={featureColors.expenses.primary} />;
                  default:
                    return <CheckCircle size={16} color={featureColors.attendance.primary} />;
                }
              };

              const getActivityColor = () => {
                switch (activity.type) {
                  case 'visit':
                    return featureColors.visits.primary;
                  case 'sheets':
                    return featureColors.sheets.primary;
                  case 'expense':
                    return featureColors.expenses.primary;
                  default:
                    return featureColors.attendance.primary;
                }
              };

              const getDotColor = () => {
                switch (activity.type) {
                  case 'visit':
                    return featureColors.visits.light;
                  case 'sheets':
                    return featureColors.sheets.light;
                  case 'expense':
                    return featureColors.expenses.light;
                  default:
                    return featureColors.attendance.light;
                }
              };

              return (
                <View key={activity.id} style={styles.timelineItem}>
                  {/* Timeline line and dot */}
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, { backgroundColor: getDotColor(), borderColor: getActivityColor() }]} />
                    {!isLast && <View style={styles.timelineConnector} />}
                  </View>

                  {/* Content */}
                  <Card elevation="sm" style={styles.activityCard}>
                    <View style={styles.activityRow}>
                      <View style={[styles.activityIconContainer, { backgroundColor: getDotColor() }]}>
                        {getActivityIcon()}
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityDescription}>{activity.description}</Text>
                        <Text style={styles.activityTime}>{getRelativeTime(activity.time)}</Text>
                      </View>
                      {/* Edit Action - Only for editable activities (not attendance) */}
                      {(activity.type === 'visit' || activity.type === 'sheets' || activity.type === 'expense') && (
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => {
                            // Navigate to the appropriate screen based on activity type
                            switch (activity.type) {
                              case 'visit':
                                // For visits, go directly to LogVisit (account will be fetched via API)
                                navigation.navigate('LogVisit', { editActivityId: activity.id });
                                break;
                              case 'sheets':
                                navigation.navigate('SheetsEntry', { editActivityId: activity.id });
                                break;
                              case 'expense':
                                navigation.navigate('ExpenseEntry', { editActivityId: activity.id });
                                break;
                            }
                          }}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Edit2 size={18} color={colors.text.secondary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </Card>
                </View>
              );
            })}
          </View>
        ) : (
          <Card elevation="sm" style={styles.timelineCard}>
            <View style={styles.emptyTimeline}>
              <Clock size={20} color={colors.text.tertiary} />
              <Text style={styles.emptyTimelineText}>
                Your daily activities will appear here as you log visits, sheets, and expenses
              </Text>
            </View>
          </Card>
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
