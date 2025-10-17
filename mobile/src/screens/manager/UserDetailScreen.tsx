import React, { useEffect, useState } from 'react';
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
} from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { colors, spacing, typography } from '../../theme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { api } from '../../services/api';

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
  };
}

type TimeRange = 'today' | 'week' | 'month' | 'custom';
type TabType = 'attendance' | 'visits' | 'sales' | 'expenses';

export const UserDetailScreen: React.FC<UserDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { userId } = route.params;
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('month'); // Default: This Month
  const [activeTab, setActiveTab] = useState<TabType>('attendance'); // Default: Attendance
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editTerritory, setEditTerritory] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [userId, timeRange, customStartDate, customEndDate]);

  const loadData = async () => {
    try {
      setError(null);
      const { startDate, endDate } = getDateRange(timeRange);

      const response = await api.getUserStats({ userId, startDate, endDate });

      setUserData(response.user);
      setStats(response.stats);
    } catch (err) {
      console.error('Error loading user details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load user details');
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  // Render progress bar
  const renderProgressBar = (value: number, total: number, color: string) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return (
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
      </View>
    );
  };

  // Handle edit user details
  const handleEditPress = () => {
    setEditPhone(userData?.phone || '');
    setEditTerritory(userData?.territory || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editPhone.trim() || !editTerritory.trim()) {
      Alert.alert('Error', 'Phone and territory are required');
      return;
    }

    try {
      setSaving(true);
      await api.updateUser({
        userId,
        phone: editPhone.trim(),
        territory: editTerritory.trim(),
      });

      Alert.alert('Success', 'User details updated successfully');
      setShowEditModal(false);
      loadData(); // Reload data
    } catch (err) {
      console.error('Error updating user:', err);
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
          <Text style={styles.headerTitle}>User Details</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading user details...</Text>
        </View>
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
          <Text style={styles.headerTitle}>User Details</Text>
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

  return (
    <View style={styles.container}>
      {/* Header - Dark style matching other tabs */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 20,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 }}>
              {userData?.name || 'User'}
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
              {formatRoleLabel(userData?.role || '')} • {userData?.territory}
            </Text>
          </View>

          {/* Set Target Button - Aligned to top */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#C9A961',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              marginTop: -4, // Align with title baseline
            }}
            onPress={() => {
              const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
              navigation.navigate('SetTarget', {
                userId: userId,
                userName: userData?.name,
                currentMonth,
              });
            }}
          >
            <TargetIcon size={18} color="#393735" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#393735' }}>Target</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Old headerMain removed - user info now in dark header above */}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
        }
      >
        <View style={styles.content}>
          {/* Edit Details Button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 12,
              backgroundColor: '#F8F8F8',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#E0E0E0',
              marginBottom: 16,
            }}
            onPress={handleEditPress}
          >
            <Edit size={18} color="#666666" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#666666' }}>
              Edit Phone & Territory
            </Text>
          </TouchableOpacity>

          {/* Date Range Selector */}
          <View style={styles.dateRangeContainer}>
            {(['today', 'week', 'month', 'custom'] as TimeRange[]).map((range) => (
              <TouchableOpacity
                key={range}
                style={[
                  styles.dateRangePill,
                  timeRange === range && styles.dateRangePillActive,
                ]}
                onPress={() => {
                  if (range === 'custom') {
                    setShowCustomDatePicker(true);
                  } else {
                    setTimeRange(range);
                  }
                }}
              >
                <Text
                  style={[
                    styles.dateRangePillText,
                    timeRange === range && styles.dateRangePillTextActive,
                  ]}
                >
                  {formatTimeRangeLabel(range)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Clickable Summary Metrics (Act as Tabs) */}
          {stats && (
            <View style={styles.summaryBar}>
              <TouchableOpacity
                style={[
                  styles.summaryMetric,
                  activeTab === 'attendance' && { backgroundColor: colors.accent },
                ]}
                onPress={() => setActiveTab('attendance')}
              >
                <Text style={[
                  styles.summaryValue,
                  { color: activeTab === 'attendance' ? '#fff' : colors.accent }
                ]}>
                  {attendancePercentage}%
                </Text>
                <Text style={[
                  styles.summaryLabel,
                  activeTab === 'attendance' && { color: '#fff', opacity: 0.9 }
                ]}>
                  Attendance
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.summaryMetric,
                  activeTab === 'visits' && { backgroundColor: colors.info },
                ]}
                onPress={() => setActiveTab('visits')}
              >
                <Text style={[
                  styles.summaryValue,
                  { color: activeTab === 'visits' ? '#fff' : colors.info }
                ]}>
                  {stats.visits.total}
                </Text>
                <Text style={[
                  styles.summaryLabel,
                  activeTab === 'visits' && { color: '#fff', opacity: 0.9 }
                ]}>
                  Visits
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.summaryMetric,
                  activeTab === 'sales' && { backgroundColor: colors.success },
                ]}
                onPress={() => setActiveTab('sales')}
              >
                <Text style={[
                  styles.summaryValue,
                  { color: activeTab === 'sales' ? '#fff' : colors.success }
                ]}>
                  {stats.sheets.total}
                </Text>
                <Text style={[
                  styles.summaryLabel,
                  activeTab === 'sales' && { color: '#fff', opacity: 0.9 }
                ]}>
                  Sheets
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.summaryMetric,
                  activeTab === 'expenses' && { backgroundColor: colors.warning },
                ]}
                onPress={() => setActiveTab('expenses')}
              >
                <Text style={[
                  styles.summaryValue,
                  { color: activeTab === 'expenses' ? '#fff' : colors.warning }
                ]}>
                  ₹{(stats.expenses.total / 1000).toFixed(1)}k
                </Text>
                <Text style={[
                  styles.summaryLabel,
                  activeTab === 'expenses' && { color: '#fff', opacity: 0.9 }
                ]}>
                  Expenses
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tab Content */}
          {stats && (
            <View style={styles.tabContent}>
              {/* Attendance Tab */}
              {activeTab === 'attendance' && (
                <View>
                  <Text style={styles.tabContentTitle}>ATTENDANCE BREAKDOWN</Text>
                  <View style={styles.progressSection}>
                    {renderProgressBar(attendanceDays.present, attendanceDays.total, colors.accent)}
                    <Text style={styles.progressPercentage}>{attendancePercentage}%</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Present:</Text>
                    <Text style={styles.detailValue}>{attendanceDays.present} days</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Absent:</Text>
                    <Text style={styles.detailValue}>{attendanceDays.absent} days</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>On Leave:</Text>
                    <Text style={styles.detailValue}>0 days</Text>
                  </View>
                </View>
              )}

              {/* Visits Tab */}
              {activeTab === 'visits' && (
                <View>
                  <Text style={styles.tabContentTitle}>VISITS BREAKDOWN</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Visits:</Text>
                    <Text style={[styles.detailValue, styles.detailValueLarge]}>{stats.visits.total}</Text>
                  </View>
                  <View style={styles.categorySection}>
                    <View style={styles.categoryRow}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: colors.info }]} />
                        <Text style={styles.categoryLabel}>Distributor</Text>
                      </View>
                      <Text style={styles.categoryValue}>{stats.visits.byType.distributor}</Text>
                    </View>
                    {renderProgressBar(stats.visits.byType.distributor, stats.visits.total, colors.info)}

                    <View style={styles.categoryRow}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: colors.success }]} />
                        <Text style={styles.categoryLabel}>Dealer</Text>
                      </View>
                      <Text style={styles.categoryValue}>{stats.visits.byType.dealer}</Text>
                    </View>
                    {renderProgressBar(stats.visits.byType.dealer, stats.visits.total, colors.success)}

                    <View style={styles.categoryRow}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: colors.accent }]} />
                        <Text style={styles.categoryLabel}>Architect</Text>
                      </View>
                      <Text style={styles.categoryValue}>{stats.visits.byType.architect}</Text>
                    </View>
                    {renderProgressBar(stats.visits.byType.architect, stats.visits.total, colors.accent)}
                  </View>
                </View>
              )}

              {/* Sales Tab */}
              {activeTab === 'sales' && (
                <View>
                  <Text style={styles.tabContentTitle}>SALES BREAKDOWN</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Sheets:</Text>
                    <Text style={[styles.detailValue, styles.detailValueLarge]}>{stats.sheets.total}</Text>
                  </View>
                  <View style={styles.categorySection}>
                    {Object.entries(stats.sheets.byCatalog).map(([catalog, count], index) => {
                      const colorMap = [colors.success, colors.info, colors.accent, colors.warning];
                      const color = colorMap[index % colorMap.length];
                      return (
                        <View key={catalog}>
                          <View style={styles.categoryRow}>
                            <View style={styles.categoryLeft}>
                              <View style={[styles.categoryDot, { backgroundColor: color }]} />
                              <Text style={styles.categoryLabel}>{catalog}</Text>
                            </View>
                            <Text style={styles.categoryValue}>{count}</Text>
                          </View>
                          {renderProgressBar(count, stats.sheets.total, color)}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Expenses Tab */}
              {activeTab === 'expenses' && (
                <View>
                  <Text style={styles.tabContentTitle}>EXPENSES BREAKDOWN</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Expenses:</Text>
                    <Text style={[styles.detailValue, styles.detailValueLarge]}>
                      ₹{stats.expenses.total.toLocaleString('en-IN')}
                    </Text>
                  </View>
                  <View style={styles.categorySection}>
                    {Object.entries(stats.expenses.byCategory).map(([category, amount], index) => {
                      const colorMap = [colors.warning, colors.info, colors.accent, colors.text.secondary];
                      const color = colorMap[index % colorMap.length];
                      const percentage = stats.expenses.total > 0
                        ? ((amount / stats.expenses.total) * 100).toFixed(0)
                        : 0;
                      return (
                        <View key={category}>
                          <View style={styles.categoryRow}>
                            <View style={styles.categoryLeft}>
                              <View style={[styles.categoryDot, { backgroundColor: color }]} />
                              <Text style={styles.categoryLabel}>
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </Text>
                            </View>
                            <Text style={styles.categoryValue}>₹{amount.toLocaleString('en-IN')} ({percentage}%)</Text>
                          </View>
                          {renderProgressBar(amount, stats.expenses.total, color)}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Empty state if no data */}
              {stats.attendance.total === 0 &&
                stats.visits.total === 0 &&
                stats.sheets.total === 0 &&
                stats.expenses.total === 0 && (
                  <View style={styles.emptyStateContainer}>
                    <CheckCircle size={48} color={colors.text.tertiary} />
                    <Text style={styles.emptyStateText}>
                      No data for selected date range
                    </Text>
                  </View>
                )}
            </View>
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

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                editable={!saving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Territory</Text>
              <TextInput
                style={styles.input}
                value={editTerritory}
                onChangeText={setEditTerritory}
                placeholder="Enter territory"
                editable={!saving}
              />
            </View>

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
                  <Text style={styles.saveButtonText}>Save</Text>
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
    padding: spacing.screenPadding,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.xs,
    marginBottom: spacing.lg,
  },
  dateRangePill: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: spacing.borderRadius.md,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  dateRangePillActive: {
    backgroundColor: colors.accent + '15',
    borderColor: colors.accent,
  },
  dateRangePillText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.semiBold,
  },
  dateRangePillTextActive: {
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    gap: spacing.sm,
  },
  summaryMetric: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
  },
  summaryValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: typography.fontWeight.medium,
  },
  tabContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabContentTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  progressSection: {
    marginBottom: spacing.lg,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: colors.text.tertiary + '20',
    borderRadius: spacing.borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: spacing.borderRadius.full,
  },
  progressPercentage: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  detailLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  detailValueLarge: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
  },
  categorySection: {
    marginTop: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  categoryLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  categoryValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    marginTop: spacing.md,
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
});
