import React, { useEffect, useState } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
  FlatList,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  User,
  Calendar as CalendarIcon,
  Building2,
  FileBarChart,
  IndianRupee,
  MapPin,
  Phone,
  CheckCircle,
  ArrowLeft,
  Users,
  Edit,
  X,
  Target as TargetIcon,
  ChevronDown,
  ChevronRight,
  Activity,
} from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { colors, spacing, typography } from '../../theme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { api } from '../../services/api';
import { DetailedStatsView } from '../../components/DetailedStatsView';
import { Skeleton } from '../../patterns';
import { AccountListItem, ManagerListItem } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

type UserDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'UserDetail'
>;
type UserDetailScreenRouteProp = RouteProp<RootStackParamList, 'UserDetail'>;

interface UserDetailScreenProps {
  navigation: UserDetailScreenNavigationProp;
  route: UserDetailScreenRouteProp;
}

interface UserData {
  id: string;
  name: string;
  phone: string;
  role: string;
  territory: string;
  primaryDistributorId?: string;
  isActive?: boolean;
  reportsToUserId?: string;
  reportsToUserName?: string;
}

interface UserStats {
  attendance: {
    total: number;
    records: any[];
  };
  visits: {
    total: number;
    byType: {
      distributor: number;
      dealer: number;
      architect: number;
    };
    records: any[];
  };
  sheets: {
    total: number;
    byCatalog: {
      'Fine Decor': number;
      'Artvio': number;
      'Woodrica': number;
      'Artis': number;
    };
    records?: any[];
  };
  expenses: {
    total: number;
    byStatus: {
      pending: number;
      approved: number;
      rejected: number;
    };
    byCategory: {
      travel: number;
      food: number;
      accommodation: number;
      other: number;
    };
    records?: any[];
  };
}

type TimeRange = 'today' | 'week' | 'month' | 'custom';

export const UserDetailScreen: React.FC<UserDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const bottomPadding = useBottomSafeArea(12);
  const { userId } = route.params;
  const { user: currentUser } = useAuth(); // Get logged-in user
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('month'); // Default: This Month
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const [editTerritory, setEditTerritory] = useState('');
  const [editDistributorId, setEditDistributorId] = useState<string | null>(null);
  const [editDistributorName, setEditDistributorName] = useState<string>('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [targets, setTargets] = useState<any>({});

  // Distributor picker states
  const [distributors, setDistributors] = useState<AccountListItem[]>([]);
  const [showDistributorModal, setShowDistributorModal] = useState(false);
  const [loadingDistributors, setLoadingDistributors] = useState(false);

  // Manager (Reports To) picker states - Admin only
  const [editManagerId, setEditManagerId] = useState<string | null>(null);
  const [editManagerName, setEditManagerName] = useState<string>('');
  const [managers, setManagers] = useState<ManagerListItem[]>([]);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [loadingManagers, setLoadingManagers] = useState(false);

  useEffect(() => {
    loadData();
    fetchTargets();
  }, [userId, timeRange, customStartDate, customEndDate]);

  const loadData = async () => {
    try {
      setError(null);
      const { startDate, endDate } = getDateRange(timeRange);

      const response = await api.getUserStats({ userId, startDate, endDate });

      setUserData(response.user);
      setStats(response.stats);
    } catch (err) {
      logger.error('Error loading user details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch targets for the selected month
  const fetchTargets = async () => {
    try {
      // Get current month from timeRange
      const today = new Date();
      const selectedMonth = timeRange === 'custom' && customStartDate
        ? new Date(customStartDate)
        : today;

      const month = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}`;

      logger.log('[UserDetail] Fetching targets for:', { userId, month });
      const response = await api.getTarget({ userId, month });

      if (response.ok && response.target) {
        const newTargets: any = {};

        // Pass category-level targets directly
        if (response.target.targetsByAccountType) {
          newTargets.visitsByType = {
            distributor: response.target.targetsByAccountType.distributor,
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

        logger.log('[UserDetail] Setting targets:', newTargets);
        setTargets(newTargets);
      } else {
        logger.log('[UserDetail] No target found for this month');
        setTargets({});
      }
    } catch (error) {
      logger.error('[UserDetail] Error fetching targets:', error);
      // Targets are optional, so don't show error to user
      setTargets({});
    }
  };

  const getDateRange = (range: TimeRange) => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (range) {
      case 'today':
        return {
          startDate: formatDate(today),
          endDate: formatDate(today),
        };
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6);
        return {
          startDate: formatDate(weekStart),
          endDate: formatDate(today),
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          startDate: formatDate(monthStart),
          endDate: formatDate(today),
        };
      case 'custom':
        return {
          startDate: customStartDate,
          endDate: customEndDate,
        };
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatTimeRangeLabel = (range: TimeRange) => {
    switch (range) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'custom':
        return 'Custom';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'national_head':
        return colors.accent;
      case 'zonal_head':
        return colors.info;
      case 'rep':
        return colors.success;
      default:
        return colors.text.tertiary;
    }
  };

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case 'national_head':
        return 'National Head';
      case 'zonal_head':
        return 'Zonal Head';
      case 'rep':
        return 'Sales Rep';
      default:
        return role;
    }
  };

  // Calculate attendance percentage
  const getAttendancePercentage = () => {
    if (!stats) return 0;
    const { startDate, endDate } = getDateRange(timeRange);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Count unique check-in days
    const uniqueDays = new Set(
      stats.attendance.records
        .filter(r => r.type === 'check_in')
        .map(r => new Date(r.timestamp).toDateString())
    );

    const daysPresent = uniqueDays.size;
    return daysDiff > 0 ? Math.round((daysPresent / daysDiff) * 100) : 0;
  };

  // Calculate days present and absent
  const getAttendanceDays = () => {
    if (!stats) return { present: 0, absent: 0, total: 0 };
    const { startDate, endDate } = getDateRange(timeRange);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const total = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const uniqueDays = new Set(
      stats.attendance.records
        .filter(r => r.type === 'check_in')
        .map(r => new Date(r.timestamp).toDateString())
    );

    const present = uniqueDays.size;
    const absent = total - present;

    return { present, absent, total };
  };

  // Calculate activity-based active days (days with visits, sheets, or expenses)
  const getActiveDays = () => {
    if (!stats) return { activeDays: 0, totalDays: 0, percentage: 0 };

    const { startDate, endDate } = getDateRange(timeRange);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();

    // For current period, only count up to today
    const effectiveEnd = end > now ? now : end;
    const totalDays = Math.ceil((effectiveEnd.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const uniqueDays = new Set<string>();

    // Extract visit dates
    if (stats.visits?.records) {
      stats.visits.records.forEach((record: any) => {
        if (record.timestamp) {
          const date = record.timestamp.toDate?.() || new Date(record.timestamp);
          uniqueDays.add(date.toISOString().substring(0, 10));
        }
      });
    }

    // Extract sheets dates
    if (stats.sheets?.records) {
      stats.sheets.records.forEach((record: any) => {
        const dateField = record.createdAt || record.date;
        if (dateField) {
          const date = dateField.toDate?.() || new Date(dateField);
          const dateStr = typeof dateField === 'string' ? dateField.substring(0, 10) : date.toISOString().substring(0, 10);
          uniqueDays.add(dateStr);
        }
      });
    }

    // Extract expense dates
    if (stats.expenses?.records) {
      stats.expenses.records.forEach((record: any) => {
        const dateField = record.createdAt || record.date;
        if (dateField) {
          const date = dateField.toDate?.() || new Date(dateField);
          const dateStr = typeof dateField === 'string' ? dateField.substring(0, 10) : date.toISOString().substring(0, 10);
          uniqueDays.add(dateStr);
        }
      });
    }

    const activeDays = uniqueDays.size;
    const percentage = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;

    return { activeDays, totalDays, percentage };
  };

  // Load distributors for picker
  const loadDistributors = async () => {
    try {
      setLoadingDistributors(true);
      const response = await api.getAccountsList({ type: 'distributor' });
      if (response.ok) {
        setDistributors(response.accounts);
      }
    } catch (error) {
      logger.error('Error loading distributors:', error);
    } finally {
      setLoadingDistributors(false);
    }
  };

  // Load managers for "Reports To" picker (Admin only)
  const loadManagers = async () => {
    try {
      setLoadingManagers(true);
      const response = await api.getManagersList();
      if (response.ok) {
        setManagers(response.managers);
      }
    } catch (error) {
      logger.error('Error loading managers:', error);
    } finally {
      setLoadingManagers(false);
    }
  };

  const handleEditPress = async () => {
    setEditName(userData?.name || '');
    setEditPhone(userData?.phone || '');
    setEditTerritory(userData?.territory || '');
    setEditDistributorId(userData?.primaryDistributorId || null);
    setEditIsActive(userData?.isActive !== false); // default to true if undefined
    setEditManagerId(userData?.reportsToUserId || null);
    setEditManagerName(userData?.reportsToUserName || '');
    setShowEditModal(true);

    // Load distributors in background
    loadDistributors();

    // Load managers in background (Admin only)
    if (currentUser?.role === 'admin') {
      loadManagers();
    }

    // If user has a distributor assigned, try to get its name
    if (userData?.primaryDistributorId) {
      try {
        const response = await api.getAccountDetails({ accountId: userData.primaryDistributorId });
        if (response.ok && response.account) {
          setEditDistributorName(response.account.name);
        }
      } catch (error) {
        logger.error('Error loading distributor name:', error);
      }
    } else {
      setEditDistributorName('');
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    if (!editPhone.trim()) {
      Alert.alert('Error', 'Phone is required');
      return;
    }

    try {
      setSaving(true);
      await api.updateUser({
        userId,
        name: editName.trim(),
        phone: editPhone.trim(),
        territory: editTerritory.trim() || undefined,
        primaryDistributorId: editDistributorId,
        isActive: editIsActive,
        // Admin can change who user reports to
        reportsToUserId: currentUser?.role === 'admin' ? editManagerId : undefined,
      });

      Alert.alert('Success', 'User details updated successfully');
      setShowEditModal(false);
      loadData(); // Reload data
    } catch (err) {
      logger.error('Error updating user:', err);
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color={colors.text.inverse} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.inverse }}>User Details</Text>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
          <Skeleton card />
          <Skeleton card />
          <Skeleton card />
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color={colors.text.inverse} />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.inverse }}>User Details</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const attendanceDays = getAttendanceDays();
  const attendancePercentage = getAttendancePercentage();
  const activityStats = getActiveDays();

  return (
    <View style={styles.container}>
      {/* Header - Dark style with back, name, and icon buttons */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          {/* Back Button */}
          <TouchableOpacity
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Name and Role */}
          <View style={styles.headerNameSection}>
            <Text style={styles.headerName}>
              {userData?.name || 'User'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {formatRoleLabel(userData?.role || '')} • {userData?.territory}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.headerActions}>
            {/* Edit Icon Button */}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={handleEditPress}
            >
              <Edit size={20} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Target Icon Button */}
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => {
                const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                navigation.navigate('SetTarget', {
                  userId: userId,
                  userName: userData?.name || 'User',
                  currentMonth,
                });
              }}
            >
              <TargetIcon size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Old headerMain removed - user info now in dark header above */}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
        }
      >
        <View style={[styles.content, { paddingBottom: 80 + bottomPadding }]}>
          {/* Date Range Selector - iOS Segmented Control Style */}
          <View style={styles.segmentedControl}>
            {(['today', 'week', 'month', 'custom'] as TimeRange[]).map((range, index) => {
              const isSelected = timeRange === range;
              const isFirst = index === 0;
              const isLast = index === 3;
              return (
                <TouchableOpacity
                  key={range}
                  style={[
                    styles.segmentedButton,
                    isFirst && styles.segmentedButtonFirst,
                    isLast && styles.segmentedButtonLast,
                    isSelected && styles.segmentedButtonActive,
                  ]}
                  onPress={() => {
                    if (range === 'custom') {
                      setShowCustomDatePicker(true);
                    } else {
                      setTimeRange(range);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.segmentedButtonText,
                      isSelected && styles.segmentedButtonTextActive,
                    ]}
                  >
                    {formatTimeRangeLabel(range)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Activity Summary Card - Tap to see full calendar */}
          {stats && (
            <TouchableOpacity
              style={styles.activityCard}
              onPress={() => navigation.navigate('AttendanceHistory', { userId, userName: userData?.name })}
              activeOpacity={0.7}
            >
              <View style={styles.activityCardLeft}>
                <View style={styles.activityIconContainer}>
                  <Activity size={20} color="#2E7D32" />
                </View>
                <View>
                  <Text style={styles.activityCardLabel}>Activity</Text>
                  <Text style={styles.activityCardValue}>
                    {activityStats.activeDays} Active Days ({activityStats.percentage}%)
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={colors.text.secondary} />
            </TouchableOpacity>
          )}

          {/* Detailed Stats View - Same component as StatsScreen */}
          {stats && (
            <DetailedStatsView
              stats={stats as any}
              attendanceDays={attendanceDays}
              attendancePercentage={attendancePercentage}
              attendanceMarkedDates={(() => {
                // Create marked dates from attendance records
                const markedDates: any = {};
                stats.attendance.records
                  .filter(r => r.type === 'check_in')
                  .forEach(r => {
                    const date = new Date(r.timestamp).toISOString().substring(0, 10);
                    markedDates[date] = { marked: true, dotColor: '#2E7D32', selected: false };
                  });
                return markedDates;
              })()}
              selectedMonth={(() => {
                // Calculate selected month from timeRange
                const today = new Date();
                switch (timeRange) {
                  case 'today':
                  case 'week':
                  case 'month':
                    return today;
                  case 'custom':
                    return customStartDate ? new Date(customStartDate) : today;
                  default:
                    return today;
                }
              })()}
              targets={targets}
              userId={userId}
              onViewPending={(type) => {
                // Navigate to Review tab with this user pre-filtered
                navigation.navigate('Home', {
                  screen: 'ReviewTab',
                  params: { filterUserId: userId, filterUserName: userData?.name },
                });
              }}
            />
          )}
        </View>
      </ScrollView>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={showCustomDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModalContent}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => {
                setShowCustomDatePicker(false);
                setCustomStartDate('');
                setCustomEndDate('');
              }}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {(!customStartDate || customEndDate) && (
              <Text style={styles.datePickerInstruction}>
                {!customStartDate ? 'Select start date' : 'Select end date'}
              </Text>
            )}

            <Calendar
              onDayPress={(day: DateData) => {
                if (!customStartDate) {
                  // First selection - set start date
                  setCustomStartDate(day.dateString);
                  setCustomEndDate('');
                } else if (!customEndDate) {
                  // Second selection - set end date
                  if (day.dateString >= customStartDate) {
                    setCustomEndDate(day.dateString);
                  } else {
                    // If selected date is before start, swap them
                    setCustomEndDate(customStartDate);
                    setCustomStartDate(day.dateString);
                  }
                } else {
                  // Both dates selected, start new selection
                  setCustomStartDate(day.dateString);
                  setCustomEndDate('');
                }
              }}
              markedDates={{
                ...(customStartDate ? {
                  [customStartDate]: {
                    startingDay: true,
                    color: colors.accent,
                    textColor: 'white',
                  }
                } : {}),
                ...(customEndDate ? {
                  [customEndDate]: {
                    endingDay: true,
                    color: colors.accent,
                    textColor: 'white',
                  }
                } : {}),
                // Mark days in between
                ...(() => {
                  if (customStartDate && customEndDate) {
                    const marked: any = {};
                    const start = new Date(customStartDate);
                    const end = new Date(customEndDate);
                    const current = new Date(start);
                    current.setDate(current.getDate() + 1);

                    while (current < end) {
                      const dateString = current.toISOString().split('T')[0];
                      marked[dateString] = {
                        color: colors.accent + '40',
                        textColor: colors.text.primary,
                      };
                      current.setDate(current.getDate() + 1);
                    }
                    return marked;
                  }
                  return {};
                })(),
              }}
              markingType="period"
              theme={{
                backgroundColor: colors.surface,
                calendarBackground: colors.surface,
                textSectionTitleColor: colors.text.secondary,
                selectedDayBackgroundColor: colors.accent,
                selectedDayTextColor: '#ffffff',
                todayTextColor: colors.accent,
                dayTextColor: colors.text.primary,
                textDisabledColor: colors.text.tertiary,
                monthTextColor: colors.text.primary,
                indicatorColor: colors.accent,
                arrowColor: colors.accent,
              }}
              maxDate={new Date().toISOString().split('T')[0]}
            />

            <View style={styles.datePickerFooter}>
              <View style={styles.selectedDatesContainer}>
                <View style={styles.selectedDateItem}>
                  <Text style={styles.selectedDateLabel}>Start:</Text>
                  <Text style={styles.selectedDateValue}>
                    {customStartDate || 'Not selected'}
                  </Text>
                </View>
                <View style={styles.selectedDateItem}>
                  <Text style={styles.selectedDateLabel}>End:</Text>
                  <Text style={styles.selectedDateValue}>
                    {customEndDate || 'Not selected'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.applyButton,
                  (!customStartDate || !customEndDate) && styles.applyButtonDisabled
                ]}
                onPress={() => {
                  if (customStartDate && customEndDate) {
                    setTimeRange('custom');
                    setShowCustomDatePicker(false);
                  } else {
                    Alert.alert('Error', 'Please select both start and end dates');
                  }
                }}
                disabled={!customStartDate || !customEndDate}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit User Details</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editModalScroll} showsVerticalScrollIndicator={false}>
              {/* Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Name</Text>
                <View style={styles.inputWithIcon}>
                  <User size={18} color={colors.text.tertiary} />
                  <TextInput
                    style={styles.inputField}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter name"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputWithIcon}>
                  <Phone size={18} color={colors.text.tertiary} />
                  <TextInput
                    style={styles.inputField}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Territory Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Territory</Text>
                <View style={styles.inputWithIcon}>
                  <MapPin size={18} color={colors.text.tertiary} />
                  <TextInput
                    style={styles.inputField}
                    value={editTerritory}
                    onChangeText={setEditTerritory}
                    placeholder="Enter territory"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Distributor Picker */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Assigned Distributor</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setShowDistributorModal(true)}
                  disabled={saving}
                >
                  <Building2 size={18} color={colors.text.tertiary} />
                  <Text style={editDistributorName ? styles.dropdownText : styles.dropdownPlaceholder}>
                    {editDistributorName || 'Select distributor...'}
                  </Text>
                  <ChevronDown size={18} color={colors.text.tertiary} />
                </TouchableOpacity>
                {editDistributorId && (
                  <TouchableOpacity
                    onPress={() => {
                      setEditDistributorId(null);
                      setEditDistributorName('');
                    }}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>Clear selection</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Reports To (Manager) - Admin only */}
              {currentUser?.role === 'admin' && userData?.role === 'rep' && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Reports To</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowManagerModal(true)}
                    disabled={saving}
                  >
                    <Users size={18} color={colors.text.tertiary} />
                    <Text style={editManagerName ? styles.dropdownText : styles.dropdownPlaceholder}>
                      {editManagerName || 'Select manager...'}
                    </Text>
                    <ChevronDown size={18} color={colors.text.tertiary} />
                  </TouchableOpacity>
                  {editManagerId && (
                    <TouchableOpacity
                      onPress={() => {
                        setEditManagerId(null);
                        setEditManagerName('');
                      }}
                      style={styles.clearButton}
                    >
                      <Text style={styles.clearButtonText}>Clear selection</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Active Status Toggle */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Account Status</Text>
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelContainer}>
                    <Text style={[styles.switchLabel, { color: editIsActive ? colors.success : colors.error }]}>
                      {editIsActive ? 'Active' : 'Inactive'}
                    </Text>
                    <Text style={styles.switchSubLabel}>
                      {editIsActive ? 'User can access the app' : 'User is blocked from the app'}
                    </Text>
                  </View>
                  <Switch
                    value={editIsActive}
                    onValueChange={setEditIsActive}
                    trackColor={{ false: colors.error + '40', true: colors.success + '40' }}
                    thumbColor={editIsActive ? colors.success : colors.error}
                    disabled={saving}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.editModalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalButton, styles.saveButton]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Distributor Selection Modal */}
      <Modal
        visible={showDistributorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDistributorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.distributorModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Select Distributor</Text>
              <TouchableOpacity onPress={() => setShowDistributorModal(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {loadingDistributors ? (
              <View style={styles.distributorLoading}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.distributorLoadingText}>Loading distributors...</Text>
              </View>
            ) : (
              <FlatList
                data={distributors}
                keyExtractor={(item) => item.id}
                style={styles.distributorList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.distributorItem}
                    onPress={() => {
                      setEditDistributorId(item.id);
                      setEditDistributorName(item.name);
                      setShowDistributorModal(false);
                    }}
                  >
                    <Text style={styles.distributorName}>{item.name}</Text>
                    <Text style={styles.distributorMeta}>
                      {item.city}, {item.state}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.distributorEmpty}>
                    <Text style={styles.distributorEmptyText}>No distributors found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Manager Selection Modal (for "Reports To" - Admin only) */}
      <Modal
        visible={showManagerModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowManagerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.distributorModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Select Manager</Text>
              <TouchableOpacity onPress={() => setShowManagerModal(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {loadingManagers ? (
              <View style={styles.distributorLoading}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.distributorLoadingText}>Loading managers...</Text>
              </View>
            ) : (
              <FlatList
                data={managers}
                keyExtractor={(item) => item.id}
                style={styles.distributorList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.distributorItem}
                    onPress={() => {
                      setEditManagerId(item.id);
                      setEditManagerName(item.name);
                      setShowManagerModal(false);
                    }}
                  >
                    <Text style={styles.distributorName}>{item.name}</Text>
                    <Text style={styles.distributorMeta}>
                      {item.role.replace('_', ' ')} • {item.territory}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.distributorEmpty}>
                    <Text style={styles.distributorEmptyText}>No managers found</Text>
                  </View>
                }
              />
            )}
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
  // New header styles
  headerContainer: {
    backgroundColor: '#393735',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBackButton: {
    padding: 4,
    marginRight: 12,
  },
  headerNameSection: {
    flex: 1,
  },
  headerName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Legacy styles (kept for compatibility)
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
  },
  headerTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerRightButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  targetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
  },
  buttonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  headerMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accent + '40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
    lineHeight: typography.fontSize.xl * 1.2,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: spacing.borderRadius.full,
  },
  roleBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    lineHeight: typography.fontSize.xs * 1.3,
  },
  headerBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  userMetaText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.inverse,
    opacity: 0.85,
    lineHeight: typography.fontSize.xs * 1.3,
  },
  metaSeparator: {
    fontSize: typography.fontSize.xs,
    color: colors.text.inverse,
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
    paddingBottom: 80, // Base padding, dynamic safe area added in component
  },
  // Pill-style date picker
  segmentedControl: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  segmentedButtonFirst: {
    // No special styling needed for pill style
  },
  segmentedButtonLast: {
    // No special styling needed for pill style
  },
  segmentedButtonActive: {
    backgroundColor: colors.accent,
  },
  segmentedButtonText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  segmentedButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityCardLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  activityCardValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.screenPadding,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: spacing.borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.text.inverse,
    fontWeight: typography.fontWeight.semiBold,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.xl,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  modalCloseButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
  },
  editModalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 400,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  editModalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
  },
  datePickerModalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  datePickerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  datePickerInstruction: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  datePickerFooter: {
    marginTop: spacing.lg,
  },
  selectedDatesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  selectedDateItem: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  selectedDateLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },
  selectedDateValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  applyButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
  },
  applyButtonDisabled: {
    backgroundColor: colors.text.tertiary,
    opacity: 0.5,
  },
  applyButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
  },
  // Enhanced edit modal styles
  editModalScroll: {
    maxHeight: 400,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  inputField: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  dropdownText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  dropdownPlaceholder: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
  clearButton: {
    marginTop: spacing.xs,
  },
  clearButtonText: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: typography.fontWeight.semiBold,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  switchSubLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  // Distributor modal styles
  distributorModalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 400,
    maxHeight: '60%',
  },
  distributorLoading: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  distributorLoadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  distributorList: {
    maxHeight: 300,
  },
  distributorItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  distributorName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  distributorMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  distributorEmpty: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  distributorEmptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
});
