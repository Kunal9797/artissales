/**
 * StatsScreen - Performance at a Glance
 *
 * Shows:
 * - Activity Heatmap (daily visit activity)
 * - Target Progress Card (monthly sales)
 * - Visit Progress Card (monthly visits)
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
  LayoutAnimation,
  UIManager,
  Platform,
  useWindowDimensions,
  Modal,
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { DetailedStatsView } from '../components/DetailedStatsView';
import { colors, spacing, typography } from '../theme';
import { api } from '../services/api';
import { Skeleton } from '../patterns';
import { logger } from '../utils/logger';
import { useBottomSafeArea } from '../hooks/useBottomSafeArea';
import {
  BarChart2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MapPin,
  X,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type TimeRange = 'today' | 'week' | 'month' | 'custom';

// Daily activity for heatmap
interface DailyActivity {
  date: string;
  visitCount: number;
  isInRange?: boolean;
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

// Format date as "Dec 12" or "Dec 12, 2024" if different year
const formatDateShort = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentYear = new Date().getFullYear();
  if (year !== currentYear) {
    return `${months[month - 1]} ${day}, ${year}`;
  }
  return `${months[month - 1]} ${day}`;
};

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

// Simple Calendar Picker Component
const CalendarPicker: React.FC<{
  selectedDate: string;
  onDateSelect: (date: string) => void;
  maxDate?: string;
  minDate?: string;
}> = ({ selectedDate, onDateSelect, maxDate, minDate }) => {
  const [viewMonth, setViewMonth] = useState(() => {
    const [y, m] = selectedDate.split('-').map(Number);
    return new Date(y, m - 1, 1);
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ date: string | null; day: number | null; isSelected: boolean; isDisabled: boolean }> = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, day: null, isSelected: false, isDisabled: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isDisabled = (maxDate && dateStr > maxDate) || (minDate && dateStr < minDate);
      days.push({
        date: dateStr,
        day: d,
        isSelected: dateStr === selectedDate,
        isDisabled: isDisabled || false,
      });
    }

    return days;
  }, [viewMonth, selectedDate, maxDate, minDate]);

  return (
    <View style={calendarStyles.container}>
      <View style={calendarStyles.header}>
        <TouchableOpacity onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))} style={calendarStyles.navButton}>
          <ChevronLeft size={20} color="#393735" />
        </TouchableOpacity>
        <Text style={calendarStyles.monthTitle}>
          {months[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </Text>
        <TouchableOpacity onPress={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))} style={calendarStyles.navButton}>
          <ChevronRight size={20} color="#393735" />
        </TouchableOpacity>
      </View>

      <View style={calendarStyles.dayLabels}>
        {dayLabels.map((label, i) => (
          <View key={i} style={calendarStyles.dayLabelCell}>
            <Text style={calendarStyles.dayLabelText}>{label}</Text>
          </View>
        ))}
      </View>

      <View style={calendarStyles.grid}>
        {calendarDays.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={calendarStyles.dayCell}
            onPress={() => item.date && !item.isDisabled && onDateSelect(item.date)}
            disabled={!item.date || item.isDisabled}
          >
            {item.day !== null ? (
              <View style={[
                calendarStyles.dayCircle,
                item.isSelected && calendarStyles.dayCircleSelected,
                item.isDisabled && calendarStyles.dayCircleDisabled,
              ]}>
                <Text style={[
                  calendarStyles.dayText,
                  item.isSelected && calendarStyles.dayTextSelected,
                  item.isDisabled && calendarStyles.dayTextDisabled,
                ]}>
                  {item.day}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

interface StatsScreenProps {
  navigation: any;
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  // Safe area insets for bottom padding (accounts for Android nav bar)
  const bottomPadding = useBottomSafeArea(12);

  // Time range state
  const [selectedRange, setSelectedRange] = useState<TimeRange>('month');
  const [activityCardExpanded, setActivityCardExpanded] = useState(false);

  // Custom date range state
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [editingDate, setEditingDate] = useState<'start' | 'end'>('start');

  // State for monthly stats
  const [refreshing, setRefreshing] = useState(false);

  // State for targets (matches DetailedStatsView props)
  const [targets, setTargets] = useState<{
    visitsByType?: {
      distributor?: number;
      dealer?: number;
      architect?: number;
      OEM?: number;
    };
    sheetsByCatalog?: {
      'Fine Decor'?: number;
      'Artvio'?: number;
      'Woodrica'?: number;
      'Artis'?: number;
    };
  }>({});

  // Check if current range supports heatmap
  const customRangeSameMonth = useMemo(() => {
    if (selectedRange !== 'custom') return false;
    const [startYear, startMonth] = customStartDate.split('-').map(Number);
    const [endYear, endMonth] = customEndDate.split('-').map(Number);
    return startYear === endYear && startMonth === endMonth;
  }, [selectedRange, customStartDate, customEndDate]);

  const supportsHeatmap = selectedRange === 'month' || selectedRange === 'week' || customRangeSameMonth;

  // Toggle activity card expansion
  const toggleActivityCardExpand = () => {
    if (!supportsHeatmap) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActivityCardExpanded(!activityCardExpanded);
  };

  // Handle range change
  const handleRangeChange = (range: TimeRange) => {
    const newSupportsHeatmap = range === 'month' || range === 'week';
    if (!newSupportsHeatmap && activityCardExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setActivityCardExpanded(false);
    }
    if (range === 'custom') {
      setDatePickerVisible(true);
    }
    setSelectedRange(range);
  };

  // Handle custom date selection
  const handleDateSelect = (date: string) => {
    if (editingDate === 'start') {
      setCustomStartDate(date);
      if (date > customEndDate) {
        setCustomEndDate(date);
      }
      setEditingDate('end');
    } else {
      if (date < customStartDate) {
        setCustomStartDate(date);
      } else {
        setCustomEndDate(date);
      }
    }
  };

  // Calculate date range for API query based on selected range
  const dateRange = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (selectedRange === 'today') {
      return { startDate: todayStr, endDate: todayStr };
    }

    if (selectedRange === 'week') {
      // Get Sunday of current week
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0],
      };
    }

    if (selectedRange === 'custom') {
      return { startDate: customStartDate, endDate: customEndDate };
    }

    // Default: month
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDay = new Date(year, month + 1, 0);
    return {
      startDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      endDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`,
    };
  }, [selectedRange, customStartDate, customEndDate]);

  // Calculate current month for targets (always current month)
  const currentMonth = useMemo(() => {
    const now = new Date();
    return now.toISOString().substring(0, 7);
  }, []);

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

  // Build dailyActivity from visit records for heatmap
  const dailyActivity = useMemo((): DailyActivity[] | undefined => {
    if (!statsData?.visits?.records) return undefined;

    // Group visits by date
    const visitsByDate: Record<string, number> = {};
    statsData.visits.records.forEach((visit: any) => {
      if (visit.timestamp) {
        const date = visit.timestamp.split('T')[0];
        visitsByDate[date] = (visitsByDate[date] || 0) + 1;
      }
    });

    // Generate array based on range type
    if (selectedRange === 'week') {
      // Generate 7 days (Sun-Sat of current week)
      const result: DailyActivity[] = [];
      const [startYear, startMonth, startDay] = dateRange.startDate.split('-').map(Number);
      const startOfWeekDate = new Date(startYear, startMonth - 1, startDay);

      for (let d = 0; d < 7; d++) {
        const currentDate = new Date(startOfWeekDate);
        currentDate.setDate(startOfWeekDate.getDate() + d);
        const dateStr = currentDate.toISOString().split('T')[0];
        result.push({
          date: dateStr,
          visitCount: visitsByDate[dateStr] || 0,
        });
      }
      return result;
    }

    if (selectedRange === 'month' || customRangeSameMonth) {
      // Generate full month
      const [year, month] = dateRange.startDate.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate();
      const result: DailyActivity[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isInRange = selectedRange === 'custom'
          ? dateStr >= customStartDate && dateStr <= customEndDate
          : true;
        result.push({
          date: dateStr,
          visitCount: visitsByDate[dateStr] || 0,
          isInRange,
        });
      }
      return result;
    }

    return undefined;
  }, [statsData?.visits?.records, selectedRange, dateRange, customStartDate, customEndDate, customRangeSameMonth]);

  // Calculate active days count
  const activeDaysInfo = useMemo(() => {
    if (!dailyActivity) return { activeDays: 0, totalDays: 0 };
    const today = new Date().toISOString().split('T')[0];
    const validDays = dailyActivity.filter(d => d.date <= today);
    const activeDays = validDays.filter(d => d.visitCount > 0).length;
    return { activeDays, totalDays: validDays.length };
  }, [dailyActivity]);

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchStats();
    setRefreshing(false);
  }, [refetchStats]);

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
      <View style={styles.header}>
        {/* Title Row */}
        <View style={styles.headerTop}>
          <View style={styles.headerTitleRow}>
            <BarChart2 size={20} color="#C9A961" />
            <Text style={styles.headerTitle}>Performance</Text>
          </View>
        </View>
      </View>

      {/* Time Range Toggle - Full Width */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleRow}>
          {(['today', 'week', 'month'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.togglePill, selectedRange === range && styles.togglePillActive]}
              onPress={() => handleRangeChange(range)}
            >
              <Text style={[styles.toggleText, selectedRange === range && styles.toggleTextActive]}>
                {range === 'today' ? 'Today' : range === 'week' ? 'Week' : 'Month'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[
              styles.togglePill,
              selectedRange === 'custom' ? styles.togglePillActive : styles.togglePillIcon,
              selectedRange === 'custom' && { flex: 1.5 },
            ]}
            onPress={() => selectedRange === 'custom' ? setDatePickerVisible(true) : handleRangeChange('custom')}
          >
            {selectedRange === 'custom' ? (
              <View style={styles.customRangeDisplay}>
                <Calendar size={14} color="#393735" />
                <Text style={[styles.toggleText, styles.toggleTextActive, { fontSize: 12 }]}>
                  {formatDateShort(customStartDate)} - {formatDateShort(customEndDate)}
                </Text>
              </View>
            ) : (
              <Calendar size={18} color="#666" />
            )}
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
        {/* Activity Card with Heatmap - Expandable */}
        {supportsHeatmap && (
          <TouchableOpacity
            style={styles.activityCard}
            onPress={toggleActivityCardExpand}
            activeOpacity={0.7}
          >
            <View style={styles.activityCardHeader}>
              <MapPin size={20} color="#666" />
              <Text style={styles.activityCardTitle}>ACTIVITY</Text>
              <View style={styles.activityCardExpandIcon}>
                {activityCardExpanded ? (
                  <ChevronUp size={16} color="#888" />
                ) : (
                  <ChevronDown size={16} color="#888" />
                )}
              </View>
            </View>
            <View style={styles.activityCardBody}>
              {loading ? (
                <Skeleton width={80} height={48} />
              ) : (
                <>
                  <Text style={styles.activityActiveNumber}>{activeDaysInfo.activeDays}</Text>
                  <Text style={styles.activityActiveLabel}>of {activeDaysInfo.totalDays} days active</Text>
                </>
              )}
            </View>

            {/* Expandable Heatmap Section */}
            {activityCardExpanded && (
              <ActivityHeatmap
                dailyActivity={dailyActivity}
                loading={loading}
                isWeekView={selectedRange === 'week'}
                isCustomRange={selectedRange === 'custom'}
              />
            )}
          </TouchableOpacity>
        )}

        {/* Detailed Stats View */}
        {loading ? (
          <>
            <Skeleton card fullWidth />
            <Skeleton card fullWidth />
            <Skeleton card fullWidth />
          </>
        ) : detailedStats ? (
          <DetailedStatsView
            stats={detailedStats}
            targets={targets}
            userId={user?.uid}
          />
        ) : null}
      </ScrollView>

      {/* Custom Date Picker Modal */}
      <Modal
        visible={datePickerVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setDatePickerVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Date Tabs */}
            <View style={styles.dateTabs}>
              <TouchableOpacity
                style={[styles.dateTab, editingDate === 'start' && styles.dateTabActive]}
                onPress={() => setEditingDate('start')}
              >
                <Text style={[styles.dateTabLabel, editingDate === 'start' && styles.dateTabLabelActive]}>
                  Start Date
                </Text>
                <Text style={[styles.dateTabValue, editingDate === 'start' && styles.dateTabValueActive]}>
                  {formatDateShort(customStartDate)}
                </Text>
              </TouchableOpacity>
              <View style={styles.dateTabDivider} />
              <TouchableOpacity
                style={[styles.dateTab, editingDate === 'end' && styles.dateTabActive]}
                onPress={() => setEditingDate('end')}
              >
                <Text style={[styles.dateTabLabel, editingDate === 'end' && styles.dateTabLabelActive]}>
                  End Date
                </Text>
                <Text style={[styles.dateTabValue, editingDate === 'end' && styles.dateTabValueActive]}>
                  {formatDateShort(customEndDate)}
                </Text>
              </TouchableOpacity>
            </View>

            <CalendarPicker
              selectedDate={editingDate === 'start' ? customStartDate : customEndDate}
              onDateSelect={handleDateSelect}
              maxDate={new Date().toISOString().split('T')[0]}
            />

            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setDatePickerVisible(false)}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
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
    backgroundColor: '#393735',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Toggle
  toggleContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 4,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePillActive: {
    backgroundColor: '#FFFFFF',
  },
  togglePillIcon: {
    flex: 0,
    paddingHorizontal: 16,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  toggleTextActive: {
    color: '#393735',
  },
  customRangeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 14,
  },
  // Activity Card
  activityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  activityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  activityCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
  },
  activityCardExpandIcon: {
    marginLeft: 'auto',
  },
  activityCardBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
  },
  activityActiveNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  activityActiveLabel: {
    fontSize: 16,
    color: '#888',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  // Date Tabs
  dateTabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  dateTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  dateTabActive: {
    backgroundColor: '#FFFFFF',
  },
  dateTabDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  dateTabLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  dateTabLabelActive: {
    color: '#393735',
  },
  dateTabValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  dateTabValueActive: {
    color: '#1A1A1A',
  },
  applyButton: {
    backgroundColor: '#393735',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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

// Calendar picker styles
const calendarStyles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dayLabels: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  dayLabelCell: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: '#393735',
  },
  dayCircleDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: '#1A1A1A',
    textAlign: 'center',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: '#CCC',
  },
});
