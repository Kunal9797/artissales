import React, { useEffect, useState, useMemo } from 'react';
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
  useWindowDimensions,
  LayoutAnimation,
  UIManager,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  User,
  Calendar as CalendarIcon,
  Building2,
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
  ChevronUp,
  ChevronRight,
  Activity,
} from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { colors, spacing, typography, useTheme } from '../../theme';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { api } from '../../services/api';
import { DetailedStatsView } from '../../components/DetailedStatsView';
import { Skeleton } from '../../patterns';
import { AccountListItem, ManagerListItem } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Daily activity for heatmap
interface DailyActivity {
  date: string;
  visitCount: number;
  isInRange?: boolean;
}

// Grid cell type for heatmap
interface GridCell {
  key: string;
  isEmpty: boolean;
  isToday: boolean;
  isFuture: boolean;
  isOutOfRange: boolean;
  color: string;
  date?: string;
  visitCount?: number;
  isMonthLabel?: boolean;
  monthLabelText?: string;
  spanCells?: number;
}

// Heatmap colors (GitHub-style green scale)
const HEATMAP_COLORS = {
  EMPTY: '#EBEDF0',    // No activity (0 visits)
  LOW: '#C6E9C7',      // 1 visit
  MEDIUM: '#40C463',   // 2-3 visits
  HIGH: '#30A14E',     // 4-5 visits
  FULL: '#216E39',     // 6+ visits
};

// Get heatmap color for rep view (based on visit count with relative scale)
const getRepHeatmapColor = (visitCount: number, maxVisits: number): string => {
  if (visitCount === 0) return HEATMAP_COLORS.EMPTY;
  if (maxVisits <= 0) return HEATMAP_COLORS.LOW;
  const percentage = (visitCount / maxVisits) * 100;
  if (percentage <= 25) return HEATMAP_COLORS.LOW;
  if (percentage <= 50) return HEATMAP_COLORS.MEDIUM;
  if (percentage <= 75) return HEATMAP_COLORS.HIGH;
  return HEATMAP_COLORS.FULL;
};

// Day labels for heatmap header
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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

// Activity Heatmap Component - GitHub-style grid (for single rep view)
const ActivityHeatmap: React.FC<{
  dailyActivity?: DailyActivity[];
  loading?: boolean;
  isWeekView?: boolean;
  isCustomRange?: boolean;
}> = ({ dailyActivity, loading, isWeekView = false, isCustomRange = false }) => {
  const { width: screenWidth } = useWindowDimensions();
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Calculate max visits for relative scale
  const maxVisits = useMemo(() => {
    if (!dailyActivity) return 0;
    const validDays = dailyActivity.filter(d => d.date <= today);
    return Math.max(...validDays.map(d => d.visitCount || 0), 1);
  }, [dailyActivity, today]);

  // Build grid data
  const gridData = useMemo((): GridCell[] => {
    if (!dailyActivity || dailyActivity.length === 0) {
      const skeletonCount = isWeekView ? 7 : 35;
      return Array(skeletonCount).fill(null).map((_, i): GridCell => ({
        key: `skeleton-${i}`,
        isEmpty: true,
        isToday: false,
        isFuture: false,
        isOutOfRange: false,
        color: HEATMAP_COLORS.EMPTY,
        visitCount: 0,
      }));
    }

    // For week view, no offset needed - just 7 days Sun-Sat
    if (isWeekView) {
      return dailyActivity.map((day): GridCell => {
        const isFuture = day.date > today;
        const visitCount = day.visitCount || 0;
        const color = isFuture
          ? HEATMAP_COLORS.EMPTY
          : getRepHeatmapColor(visitCount, maxVisits);
        return {
          key: day.date,
          isEmpty: false,
          isToday: day.date === today,
          isFuture,
          isOutOfRange: false,
          color,
          date: day.date,
          visitCount,
        };
      });
    }

    // For month view, calculate offset for first day
    const firstDate = dailyActivity[0].date;
    const [year, month] = firstDate.split('-').map(Number);
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay();
    const daysInMonth = dailyActivity.length;
    const lastDayOfMonth = new Date(year, month - 1, daysInMonth).getDay();
    const trailingEmpty = lastDayOfMonth === 6 ? 0 : 6 - lastDayOfMonth;

    // Month names
    const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const showMonthAtStart = firstDayOfMonth >= trailingEmpty && firstDayOfMonth >= 2;
    const showMonthAtEnd = trailingEmpty > firstDayOfMonth && trailingEmpty >= 2;

    const emptyCells = showMonthAtStart ? firstDayOfMonth : trailingEmpty;
    const fullName = monthNamesFull[month - 1];
    const shortName = monthNamesShort[month - 1];
    const monthName = (fullName.length >= 7 && emptyCells < 3) ? shortName : fullName;

    const grid: GridCell[] = [];

    if (showMonthAtStart) {
      grid.push({
        key: 'month-label-start',
        isEmpty: true,
        isToday: false,
        isFuture: false,
        isOutOfRange: false,
        color: 'transparent',
        isMonthLabel: true,
        monthLabelText: monthName,
        spanCells: firstDayOfMonth,
      });
    } else {
      for (let i = 0; i < firstDayOfMonth; i++) {
        grid.push({
          key: `empty-start-${i}`,
          isEmpty: true,
          isToday: false,
          isFuture: false,
          isOutOfRange: false,
          color: 'transparent',
        });
      }
    }

    dailyActivity.forEach((day) => {
      const isFuture = day.date > today;
      const isOutOfRange = isCustomRange && day.isInRange === false;
      const visitCount = day.visitCount || 0;
      const color = isFuture
        ? HEATMAP_COLORS.EMPTY
        : getRepHeatmapColor(visitCount, maxVisits);
      grid.push({
        key: day.date,
        isEmpty: false,
        isToday: day.date === today,
        isFuture,
        isOutOfRange,
        color,
        date: day.date,
        visitCount,
      });
    });

    if (showMonthAtEnd) {
      grid.push({
        key: 'month-label-end',
        isEmpty: true,
        isToday: false,
        isFuture: false,
        isOutOfRange: false,
        color: 'transparent',
        isMonthLabel: true,
        monthLabelText: monthName,
        spanCells: trailingEmpty,
      });
    } else {
      for (let i = 0; i < trailingEmpty; i++) {
        grid.push({
          key: `empty-end-${i}`,
          isEmpty: true,
          isToday: false,
          isFuture: false,
          isOutOfRange: false,
          color: 'transparent',
        });
      }
    }

    return grid;
  }, [dailyActivity, today, isWeekView, isCustomRange, maxVisits]);

  // Calculate cell size dynamically based on screen width
  const GAP = 5;
  const AVAILABLE_WIDTH = screenWidth - 64;
  const CELL_WIDTH = Math.floor((AVAILABLE_WIDTH - (GAP * 6)) / 7);
  const CELL_HEIGHT = isWeekView ? Math.floor(CELL_WIDTH * 0.8) : Math.floor(CELL_WIDTH * 0.6);
  const GRID_WIDTH = (CELL_WIDTH * 7) + (GAP * 6);

  return (
    <View style={heatmapStyles.container}>
      <View style={heatmapStyles.centered}>
        {/* Day labels header */}
        <View style={[heatmapStyles.dayLabels, { width: GRID_WIDTH, gap: GAP }]}>
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={{ width: CELL_WIDTH, alignItems: 'center' }}>
              <Text style={heatmapStyles.dayLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Grid */}
        <View style={[heatmapStyles.grid, { width: GRID_WIDTH, gap: GAP }]}>
          {gridData.map((cell) => {
            if (cell.isMonthLabel && cell.spanCells) {
              const labelWidth = (CELL_WIDTH * cell.spanCells) + (GAP * (cell.spanCells - 1));
              return (
                <View
                  key={cell.key}
                  style={[heatmapStyles.monthLabel, { width: labelWidth, height: CELL_HEIGHT }]}
                >
                  <Text style={heatmapStyles.monthLabelText}>{cell.monthLabelText}</Text>
                </View>
              );
            }

            return (
              <View
                key={cell.key}
                style={[
                  heatmapStyles.cell,
                  { width: CELL_WIDTH, height: CELL_HEIGHT },
                  { backgroundColor: cell.color },
                  cell.isToday && heatmapStyles.cellToday,
                  cell.isEmpty && cell.color === 'transparent' && heatmapStyles.cellInvisible,
                  cell.isFuture && heatmapStyles.cellFuture,
                  cell.isOutOfRange && heatmapStyles.cellOutOfRange,
                  loading && heatmapStyles.cellSkeleton,
                ]}
              >
                {cell.isFuture && !loading && (
                  <View style={heatmapStyles.cellFutureLine} />
                )}
                {!cell.isFuture && !cell.isEmpty && !loading && cell.visitCount !== undefined && (
                  <Text style={[
                    heatmapStyles.cellCount,
                    cell.visitCount >= 4 && heatmapStyles.cellCountLight,
                  ]}>
                    {cell.visitCount}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View style={heatmapStyles.legend}>
        <Text style={heatmapStyles.legendText}>0</Text>
        <View style={heatmapStyles.legendCells}>
          <View style={[heatmapStyles.legendCell, { backgroundColor: HEATMAP_COLORS.EMPTY }]} />
          <View style={[heatmapStyles.legendCell, { backgroundColor: HEATMAP_COLORS.LOW }]} />
          <View style={[heatmapStyles.legendCell, { backgroundColor: HEATMAP_COLORS.MEDIUM }]} />
          <View style={[heatmapStyles.legendCell, { backgroundColor: HEATMAP_COLORS.HIGH }]} />
          <View style={[heatmapStyles.legendCell, { backgroundColor: HEATMAP_COLORS.FULL }]} />
        </View>
        <Text style={heatmapStyles.legendText}>{maxVisits}</Text>
      </View>
    </View>
  );
};

export const UserDetailScreen: React.FC<UserDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { isDark, colors: themeColors } = useTheme();
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

  // Activity heatmap state
  const [activityExpanded, setActivityExpanded] = useState(false);

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
    // Use local date components to avoid UTC timezone shift
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

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

  // Build dailyActivity data for heatmap from visit records
  const dailyActivity = useMemo((): DailyActivity[] => {
    if (!stats?.visits?.records) {
      logger.log('[UserDetail Heatmap] No visit records');
      return [];
    }

    const { startDate, endDate } = getDateRange(timeRange);
    logger.log('[UserDetail Heatmap] timeRange:', timeRange, 'startDate:', startDate, 'endDate:', endDate);

    // Count visits by date
    const visitsByDate: Record<string, number> = {};
    stats.visits.records.forEach((record: any) => {
      if (record.timestamp) {
        // timestamp is already an ISO string from the API
        const dateStr = typeof record.timestamp === 'string'
          ? record.timestamp.split('T')[0]
          : (record.timestamp.toDate?.() || new Date(record.timestamp)).toISOString().split('T')[0];
        visitsByDate[dateStr] = (visitsByDate[dateStr] || 0) + 1;
      }
    });

    // For week view: generate 7 days
    if (timeRange === 'week' || timeRange === 'today') {
      const days: DailyActivity[] = [];
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const startOfWeekDate = new Date(startYear, startMonth - 1, startDay);

      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(startOfWeekDate);
        currentDate.setDate(startOfWeekDate.getDate() + d);
        const dateStr = currentDate.toISOString().split('T')[0];
        days.push({
          date: dateStr,
          visitCount: visitsByDate[dateStr] || 0,
          isInRange: true,
        });
      }
      return days;
    }

    // For month view: generate FULL month (1st to last day)
    if (timeRange === 'month') {
      const [year, month] = startDate.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      logger.log('[UserDetail Heatmap] Month view - year:', year, 'month:', month, 'daysInMonth:', daysInMonth);
      const days: DailyActivity[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({
          date: dateStr,
          visitCount: visitsByDate[dateStr] || 0,
          isInRange: true,
        });
      }
      logger.log('[UserDetail Heatmap] Generated days, first:', days[0]?.date, 'last:', days[days.length-1]?.date, 'count:', days.length);
      return days;
    }

    // For custom range: generate full month but mark out-of-range days
    if (timeRange === 'custom' && customStartDate && customEndDate) {
      const [year, month] = customStartDate.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const days: DailyActivity[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isInRange = dateStr >= customStartDate && dateStr <= customEndDate;
        days.push({
          date: dateStr,
          visitCount: visitsByDate[dateStr] || 0,
          isInRange,
        });
      }
      return days;
    }

    return [];
  }, [stats, timeRange, customStartDate, customEndDate]);

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

          {/* Activity Summary Card - Expandable with heatmap */}
          {stats && (
            <>
              <TouchableOpacity
                style={[styles.activityCard, activityExpanded && styles.activityCardExpanded]}
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setActivityExpanded(!activityExpanded);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.activityCardLeft}>
                  <View style={styles.activityIconContainer}>
                    <Activity size={20} color="#2E7D32" />
                  </View>
                  <View>
                    <Text style={styles.activityCardLabel}>ACTIVITY</Text>
                    <Text style={styles.activityCardValue}>
                      {activityStats.activeDays} of {activityStats.totalDays} days active
                    </Text>
                  </View>
                </View>
                {activityExpanded ? (
                  <ChevronUp size={20} color={colors.text.secondary} />
                ) : (
                  <ChevronDown size={20} color={colors.text.secondary} />
                )}
              </TouchableOpacity>

              {activityExpanded && (
                <View style={styles.heatmapContainer}>
                  <ActivityHeatmap
                    dailyActivity={dailyActivity}
                    loading={loading}
                    isWeekView={timeRange === 'week' || timeRange === 'today'}
                    isCustomRange={timeRange === 'custom'}
                  />
                </View>
              )}
            </>
          )}

          {/* Detailed Stats View - Same component as StatsScreen */}
          {stats && (
            <DetailedStatsView
              stats={stats as any}
              targets={targets}
              userId={userId}
              onViewPending={(type) => {
                // Navigate to Review tab with this user pre-filtered
                (navigation as any).navigate('Home', {
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
          <View style={[styles.editModalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, { color: themeColors.text.primary }]}>Edit User Details</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editModalScroll} showsVerticalScrollIndicator={false}>
              {/* Name Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.text.secondary }]}>Name</Text>
                <View style={[styles.inputWithIcon, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
                  <User size={18} color={themeColors.text.tertiary} />
                  <TextInput
                    style={[styles.inputField, { color: themeColors.text.primary }]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Enter name"
                    placeholderTextColor={themeColors.text.tertiary}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.text.secondary }]}>Phone Number</Text>
                <View style={[styles.inputWithIcon, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
                  <Phone size={18} color={themeColors.text.tertiary} />
                  <TextInput
                    style={[styles.inputField, { color: themeColors.text.primary }]}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="Enter phone number"
                    placeholderTextColor={themeColors.text.tertiary}
                    keyboardType="phone-pad"
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Territory Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.text.secondary }]}>Territory</Text>
                <View style={[styles.inputWithIcon, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
                  <MapPin size={18} color={themeColors.text.tertiary} />
                  <TextInput
                    style={[styles.inputField, { color: themeColors.text.primary }]}
                    value={editTerritory}
                    onChangeText={setEditTerritory}
                    placeholder="Enter territory"
                    placeholderTextColor={themeColors.text.tertiary}
                    editable={!saving}
                  />
                </View>
              </View>

              {/* Distributor Picker */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.text.secondary }]}>Assigned Distributor</Text>
                <TouchableOpacity
                  style={[styles.dropdownButton, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}
                  onPress={() => setShowDistributorModal(true)}
                  disabled={saving}
                >
                  <Building2 size={18} color={themeColors.text.tertiary} />
                  <Text style={editDistributorName ? [styles.dropdownText, { color: themeColors.text.primary }] : [styles.dropdownPlaceholder, { color: themeColors.text.tertiary }]}>
                    {editDistributorName || 'Select distributor...'}
                  </Text>
                  <ChevronDown size={18} color={themeColors.text.tertiary} />
                </TouchableOpacity>
                {editDistributorId && (
                  <TouchableOpacity
                    onPress={() => {
                      setEditDistributorId(null);
                      setEditDistributorName('');
                    }}
                    style={styles.clearButton}
                  >
                    <Text style={[styles.clearButtonText, { color: themeColors.accent }]}>Clear selection</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Reports To (Manager) - Admin only */}
              {currentUser?.role === 'admin' && userData?.role === 'rep' && (
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: themeColors.text.secondary }]}>Reports To</Text>
                  <TouchableOpacity
                    style={[styles.dropdownButton, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}
                    onPress={() => setShowManagerModal(true)}
                    disabled={saving}
                  >
                    <Users size={18} color={themeColors.text.tertiary} />
                    <Text style={editManagerName ? [styles.dropdownText, { color: themeColors.text.primary }] : [styles.dropdownPlaceholder, { color: themeColors.text.tertiary }]}>
                      {editManagerName || 'Select manager...'}
                    </Text>
                    <ChevronDown size={18} color={themeColors.text.tertiary} />
                  </TouchableOpacity>
                  {editManagerId && (
                    <TouchableOpacity
                      onPress={() => {
                        setEditManagerId(null);
                        setEditManagerName('');
                      }}
                      style={styles.clearButton}
                    >
                      <Text style={[styles.clearButtonText, { color: themeColors.accent }]}>Clear selection</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Active Status Toggle */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, { color: themeColors.text.secondary }]}>Account Status</Text>
                <View style={[styles.switchRow, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}>
                  <View style={styles.switchLabelContainer}>
                    <Text style={[styles.switchLabel, { color: editIsActive ? themeColors.success : themeColors.error }]}>
                      {editIsActive ? 'Active' : 'Inactive'}
                    </Text>
                    <Text style={[styles.switchSubLabel, { color: themeColors.text.tertiary }]}>
                      {editIsActive ? 'User can access the app' : 'User is blocked from the app'}
                    </Text>
                  </View>
                  <Switch
                    value={editIsActive}
                    onValueChange={setEditIsActive}
                    trackColor={{ false: themeColors.error + '40', true: themeColors.success + '40' }}
                    thumbColor={editIsActive ? themeColors.success : themeColors.error}
                    disabled={saving}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.editModalButton, styles.cancelButton, { backgroundColor: themeColors.background, borderColor: themeColors.border.default }]}
                onPress={() => setShowEditModal(false)}
                disabled={saving}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalButton, styles.saveButton, { backgroundColor: themeColors.accent }]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={[styles.saveButtonText, { color: colors.primary }]}>Save Changes</Text>
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
          <View style={[styles.distributorModalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, { color: themeColors.text.primary }]}>Select Distributor</Text>
              <TouchableOpacity onPress={() => setShowDistributorModal(false)}>
                <X size={24} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>

            {loadingDistributors ? (
              <View style={styles.distributorLoading}>
                <ActivityIndicator size="small" color={themeColors.accent} />
                <Text style={[styles.distributorLoadingText, { color: themeColors.text.secondary }]}>Loading distributors...</Text>
              </View>
            ) : (
              <FlatList
                data={distributors}
                keyExtractor={(item) => item.id}
                style={styles.distributorList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.distributorItem, { borderBottomColor: themeColors.border.default }]}
                    onPress={() => {
                      setEditDistributorId(item.id);
                      setEditDistributorName(item.name);
                      setShowDistributorModal(false);
                    }}
                  >
                    <Text style={[styles.distributorName, { color: themeColors.text.primary }]}>{item.name}</Text>
                    <Text style={[styles.distributorMeta, { color: themeColors.text.secondary }]}>
                      {item.city}, {item.state}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.distributorEmpty}>
                    <Text style={[styles.distributorEmptyText, { color: themeColors.text.secondary }]}>No distributors found</Text>
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
          <View style={[styles.distributorModalContent, { backgroundColor: themeColors.surface }]}>
            <View style={styles.editModalHeader}>
              <Text style={[styles.editModalTitle, { color: themeColors.text.primary }]}>Select Manager</Text>
              <TouchableOpacity onPress={() => setShowManagerModal(false)}>
                <X size={24} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>

            {loadingManagers ? (
              <View style={styles.distributorLoading}>
                <ActivityIndicator size="small" color={themeColors.accent} />
                <Text style={[styles.distributorLoadingText, { color: themeColors.text.secondary }]}>Loading managers...</Text>
              </View>
            ) : (
              <FlatList
                data={managers}
                keyExtractor={(item) => item.id}
                style={styles.distributorList}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.distributorItem, { borderBottomColor: themeColors.border.default }]}
                    onPress={() => {
                      setEditManagerId(item.id);
                      setEditManagerName(item.name);
                      setShowManagerModal(false);
                    }}
                  >
                    <Text style={[styles.distributorName, { color: themeColors.text.primary }]}>{item.name}</Text>
                    <Text style={[styles.distributorMeta, { color: themeColors.text.secondary }]}>
                      {item.role.replace('_', ' ')} • {item.territory}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.distributorEmpty}>
                    <Text style={[styles.distributorEmptyText, { color: themeColors.text.secondary }]}>No managers found</Text>
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
  activityCardExpanded: {
    marginBottom: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  heatmapContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
    marginBottom: 12,
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

// Heatmap styles
const heatmapStyles = StyleSheet.create({
  container: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  centered: {
    alignItems: 'center',
  },
  dayLabels: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellToday: {
    borderWidth: 2,
    borderColor: '#393735',
  },
  cellInvisible: {
    backgroundColor: 'transparent',
  },
  cellFuture: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  cellFutureLine: {
    position: 'absolute',
    top: '50%',
    left: -4,
    right: -4,
    height: 1,
    backgroundColor: '#CCCCCC',
    transform: [{ rotate: '45deg' }],
  },
  cellSkeleton: {
    opacity: 0.5,
  },
  cellOutOfRange: {
    opacity: 0.3,
  },
  cellCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  cellCountLight: {
    color: '#FFFFFF',
  },
  monthLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  legendText: {
    fontSize: 11,
    color: '#888',
  },
  legendCells: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  legendCell: {
    flex: 1,
    height: 10,
    borderRadius: 2,
  },
});
