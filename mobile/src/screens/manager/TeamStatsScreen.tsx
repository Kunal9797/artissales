/**
 * TeamStatsScreen - Team Performance Analytics
 *
 * Shows aggregated team stats with breakdowns:
 * - Active team members count
 * - Visits by type (distributor, dealer, architect, OEM)
 * - Sheets by catalog
 * - Pending approvals summary
 *
 * Features:
 * - Time range toggle (Today, Week, Month, Custom)
 * - Admin filter by manager
 * - Number grid layout for breakdowns
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  FlatList,
  LayoutAnimation,
  UIManager,
  Platform,
  useWindowDimensions,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import {
  ArrowLeft,
  Users,
  MapPin,
  Layers,
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  X,
  Check,
  Phone,
  Edit2,
  Target,
  IndianRupee,
  BarChart3,
} from 'lucide-react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { Skeleton } from '../../patterns/Skeleton';
import { TargetProgress } from '../../types';
import { formatPhoneForDisplay } from '../../utils/formatTime';

// User type for filter (managers and reps)
interface FilterUser {
  id: string;
  name: string;
  role: string;
  phone?: string;
  territory?: string;
  reportsToUserId?: string;
  isActive?: boolean;
  primaryDistributorId?: string;
}

// Filter type
type FilterType = 'all' | 'manager' | 'rep';

type TimeRange = 'today' | 'week' | 'month' | 'custom';

// Format large numbers (1000+ becomes 1.0k, etc.)
const formatNumber = (num: number): string => {
  if (num >= 10000) return `${(num / 1000).toFixed(0)}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

// Format rupee amounts compactly (₹8,200 → ₹8.2k)
const formatRupee = (num: number): string => {
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 10000) return `₹${(num / 1000).toFixed(0)}k`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(1)}k`;
  return `₹${num.toLocaleString('en-IN')}`;
};

// Daily activity for heatmap
interface DailyActivity {
  date: string;
  activeCount: number;
  totalCount: number;
  visitCount?: number; // For single rep view: actual number of visits
  isInRange?: boolean; // For custom range: true if day is within selected range
}

// Visit detail for single rep view
interface VisitDetail {
  id: string;
  accountName: string;
  accountType: string;
  timestamp: string;
  purpose: string;
}

// Top account for single rep view
interface TopAccount {
  accountId: string;
  accountName: string;
  visitCount: number;
}

// API Response type
interface TeamStatsResponse {
  ok: boolean;
  date: string;
  stats: {
    team: {
      total: number;
      active: number;
      inactive: number;
      activePercentage: number;
      dailyActivity?: DailyActivity[]; // Only present for month range
    };
    visits: {
      total: number;
      distributor: number;
      dealer: number;
      architect: number;
      OEM: number;
    };
    sheets: {
      total: number;
      byCatalog: {
        'Fine Decor': number;
        'Artvio': number;
        'Woodrica': number;
        'Artis 1MM': number;
      };
    };
    pending: {
      sheets: number;
      sheetsLogs?: number;
      expenses: number;
    };
    visitDetails?: {
      recent: VisitDetail[];
      topAccounts: TopAccount[];
    };
    // Expense breakdown for single rep view
    expenses?: {
      total: number;
      byCategory: {
        travel: number;
        food: number;
        accommodation: number;
        other: number;
      };
    };
  };
}

// Heatmap colors (GitHub-style green scale)
const HEATMAP_COLORS = {
  EMPTY: '#EBEDF0',    // No activity (0%) - neutral gray
  LOW: '#C6E9C7',      // 1-25% active - light green
  MEDIUM: '#40C463',   // 26-50% active
  HIGH: '#30A14E',     // 51-75% active
  FULL: '#216E39',     // 76-100% active
};

// Get heatmap color based on activity percentage
const getHeatmapColor = (activeCount: number, totalCount: number): string => {
  if (totalCount === 0 || activeCount === 0) return HEATMAP_COLORS.EMPTY;
  const percentage = (activeCount / totalCount) * 100;
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

// Get heatmap color for single rep view (based on visit count with relative scale)
const getRepHeatmapColor = (visitCount: number, maxVisits: number): string => {
  if (visitCount === 0) return HEATMAP_COLORS.EMPTY;
  if (maxVisits <= 0) return HEATMAP_COLORS.LOW;
  const percentage = (visitCount / maxVisits) * 100;
  if (percentage <= 25) return HEATMAP_COLORS.LOW;
  if (percentage <= 50) return HEATMAP_COLORS.MEDIUM;
  if (percentage <= 75) return HEATMAP_COLORS.HIGH;
  return HEATMAP_COLORS.FULL;
};

// Activity Heatmap Component - GitHub-style grid
const ActivityHeatmap: React.FC<{
  dailyActivity?: DailyActivity[];
  loading?: boolean;
  isWeekView?: boolean;
  isCustomRange?: boolean;
  isSingleRepView?: boolean;
}> = ({ dailyActivity, loading, isWeekView = false, isCustomRange = false, isSingleRepView = false }) => {
  const { width: screenWidth } = useWindowDimensions();
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Calculate max visits for relative scale (only for single rep view)
  const maxVisits = useMemo(() => {
    if (!isSingleRepView || !dailyActivity) return 0;
    const validDays = dailyActivity.filter(d => d.date <= today);
    return Math.max(...validDays.map(d => d.visitCount || 0), 1); // Min 1 to avoid division by zero
  }, [dailyActivity, today, isSingleRepView]);

  // Build grid data
  const gridData = useMemo((): GridCell[] => {
    if (!dailyActivity || dailyActivity.length === 0) {
      // Return skeleton data (7 for week, 35 for month)
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
        // For single rep: use visitCount from API
        const visitCount = isSingleRepView ? (day.visitCount || 0) : 0;
        const color = isFuture
          ? HEATMAP_COLORS.EMPTY
          : isSingleRepView
            ? getRepHeatmapColor(visitCount, maxVisits)
            : getHeatmapColor(day.activeCount, day.totalCount);
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
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0 = Sunday
    const daysInMonth = dailyActivity.length;
    const lastDayOfMonth = new Date(year, month - 1, daysInMonth).getDay(); // 0 = Sunday
    const trailingEmpty = lastDayOfMonth === 6 ? 0 : 6 - lastDayOfMonth; // Empty cells after last day

    // Month names (full and short)
    const monthNamesFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Decide where to place month label: whichever side has more empty space
    const showMonthAtStart = firstDayOfMonth >= trailingEmpty && firstDayOfMonth >= 2;
    const showMonthAtEnd = trailingEmpty > firstDayOfMonth && trailingEmpty >= 2;

    // Choose full or short name based on available space
    // Long names (7+ chars) need at least 3 cells to fit nicely
    const emptyCells = showMonthAtStart ? firstDayOfMonth : trailingEmpty;
    const fullName = monthNamesFull[month - 1];
    const shortName = monthNamesShort[month - 1];
    const monthName = (fullName.length >= 7 && emptyCells < 3) ? shortName : fullName;

    // Build grid with empty cells for offset
    const grid: GridCell[] = [];

    // Add empty cells for offset (before day 1) or month label
    if (showMonthAtStart) {
      // Add month label spanning the empty cells
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
      // Add regular empty cells
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

    // Add cells for each day
    dailyActivity.forEach((day) => {
      const isFuture = day.date > today;
      // For custom range, check if day is outside the selected range
      const isOutOfRange = isCustomRange && day.isInRange === false;
      // For single rep: use visitCount from API
      const visitCount = isSingleRepView ? (day.visitCount || 0) : 0;
      const color = isFuture
        ? HEATMAP_COLORS.EMPTY
        : isSingleRepView
          ? getRepHeatmapColor(visitCount, maxVisits)
          : getHeatmapColor(day.activeCount, day.totalCount);
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

    // Add trailing empty cells or month label
    if (showMonthAtEnd) {
      // Add month label spanning the trailing empty cells
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
      // Add regular empty cells at end
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
  }, [dailyActivity, today, isWeekView, isCustomRange, isSingleRepView, maxVisits]);

  // Calculate cell size dynamically based on screen width
  // Card has 16px padding on each side, plus 16px screen padding on each side = 64px total
  const GAP = 5;
  const AVAILABLE_WIDTH = screenWidth - 64; // Screen width minus paddings
  // 7 cells + 6 gaps: availableWidth = 7*cellWidth + 6*gap
  const CELL_WIDTH = Math.floor((AVAILABLE_WIDTH - (GAP * 6)) / 7);
  // Week view: taller cells (square-ish), Month view: shorter cells (compact)
  const CELL_HEIGHT = isWeekView ? Math.floor(CELL_WIDTH * 0.8) : Math.floor(CELL_WIDTH * 0.6);
  const GRID_WIDTH = (CELL_WIDTH * 7) + (GAP * 6);

  return (
    <View style={styles.heatmapContainer}>
      {/* Centered wrapper */}
      <View style={styles.heatmapCentered}>
        {/* Day labels header - aligned with grid */}
        <View style={[styles.heatmapDayLabels, { width: GRID_WIDTH, gap: GAP }]}>
          {DAY_LABELS.map((label, i) => (
            <View key={i} style={{ width: CELL_WIDTH, alignItems: 'center' }}>
              <Text style={styles.heatmapDayLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Grid - constrained to exactly 7 columns */}
        <View style={[styles.heatmapGrid, { width: GRID_WIDTH, gap: GAP }]}>
          {gridData.map((cell) => {
            // Month label cell spans multiple cells
            if (cell.isMonthLabel && cell.spanCells) {
              const labelWidth = (CELL_WIDTH * cell.spanCells) + (GAP * (cell.spanCells - 1));
              return (
                <View
                  key={cell.key}
                  style={[
                    styles.heatmapMonthLabel,
                    { width: labelWidth, height: CELL_HEIGHT },
                  ]}
                >
                  <Text style={styles.heatmapMonthLabelText}>{cell.monthLabelText}</Text>
                </View>
              );
            }

            // Regular cell
            return (
              <View
                key={cell.key}
                style={[
                  styles.heatmapCell,
                  { width: CELL_WIDTH, height: CELL_HEIGHT },
                  { backgroundColor: cell.color },
                  cell.isToday && styles.heatmapCellToday,
                  cell.isEmpty && cell.color === 'transparent' && styles.heatmapCellInvisible,
                  cell.isFuture && styles.heatmapCellFuture,
                  cell.isOutOfRange && styles.heatmapCellOutOfRange,
                  loading && styles.heatmapCellSkeleton,
                ]}
              >
                {/* Diagonal line for future days */}
                {cell.isFuture && !loading && (
                  <View style={styles.heatmapCellFutureLine} />
                )}
                {/* Visit count for single rep view (non-future, non-empty cells) */}
                {isSingleRepView && !cell.isFuture && !cell.isEmpty && !loading && cell.visitCount !== undefined && (
                  <Text style={[
                    styles.heatmapCellCount,
                    cell.visitCount >= 4 && styles.heatmapCellCountLight,
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
      <View style={styles.heatmapLegend}>
        <Text style={styles.heatmapLegendText}>{isSingleRepView ? '0' : 'Less'}</Text>
        <View style={styles.heatmapLegendCells}>
          <View style={[styles.heatmapLegendCell, { backgroundColor: HEATMAP_COLORS.EMPTY }]} />
          <View style={[styles.heatmapLegendCell, { backgroundColor: HEATMAP_COLORS.LOW }]} />
          <View style={[styles.heatmapLegendCell, { backgroundColor: HEATMAP_COLORS.MEDIUM }]} />
          <View style={[styles.heatmapLegendCell, { backgroundColor: HEATMAP_COLORS.HIGH }]} />
          <View style={[styles.heatmapLegendCell, { backgroundColor: HEATMAP_COLORS.FULL }]} />
        </View>
        <Text style={styles.heatmapLegendText}>{isSingleRepView ? maxVisits : 'More'}</Text>
      </View>
    </View>
  );
};

// Number Grid Card - Big number left, 2x2 grid right
const NumberGridCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  total: number;
  totalLabel: string;
  breakdowns: Array<{ label: string; value: number; color: string }>;
  loading?: boolean;
  pendingCount?: number;
}> = ({ icon, title, total, totalLabel, breakdowns, loading, pendingCount }) => {
  return (
    <View style={styles.splitCard}>
      <View style={styles.splitCardHeader}>
        {icon}
        <Text style={styles.splitCardTitle}>{title}</Text>
        {pendingCount !== undefined && pendingCount > 0 && !loading && (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>+{pendingCount} pending</Text>
          </View>
        )}
      </View>
      <View style={styles.splitCardBody}>
        {/* Left - Big Number */}
        <View style={styles.splitCardLeft}>
          {loading ? (
            <Skeleton width={60} height={42} />
          ) : (
            <Text style={styles.splitCardNumber}>{formatNumber(total)}</Text>
          )}
          <Text style={styles.splitCardNumberLabel}>{totalLabel}</Text>
        </View>
        {/* Divider */}
        <View style={styles.splitCardDivider} />
        {/* Right - 2x2 Grid */}
        <View style={styles.numberGrid}>
          {breakdowns.map((item) => (
            <View key={item.label} style={styles.numberGridItem}>
              {loading ? (
                <Skeleton width={30} height={24} />
              ) : (
                <Text style={[styles.numberGridValue, { color: item.color }]}>{formatNumber(item.value)}</Text>
              )}
              <Text style={styles.numberGridLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

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

// Format relative time (e.g., "2h ago", "Yesterday")
const formatRelativeTime = (isoString: string): string => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(isoString.split('T')[0]);
};

// Get account type color
const getAccountTypeColor = (type: string): string => {
  switch (type) {
    case 'distributor': return '#1976D2';
    case 'dealer': return '#388E3C';
    case 'architect': return '#F57C00';
    case 'OEM': return '#7B1FA2';
    default: return '#888';
  }
};

// Catalog colors
const CATALOG_COLORS: Record<string, string> = {
  'Fine Decor': '#D32F2F',
  'Artvio': '#1976D2',
  'Woodrica': '#2E7D32',
  'Artis 1MM': '#F57C00',
};

// Progress Bar Component
const ProgressBar: React.FC<{
  progress: number; // 0-100
  color: string;
  height?: number;
}> = ({ progress, color, height = 8 }) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  return (
    <View style={[progressStyles.container, { height }]}>
      <View
        style={[
          progressStyles.fill,
          { width: `${clampedProgress}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
};

const progressStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});

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

  // Build calendar grid for current month
  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ date: string | null; day: number | null; isSelected: boolean; isDisabled: boolean }> = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, day: null, isSelected: false, isDisabled: true });
    }

    // Days of month
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

  const goToPrevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  };

  return (
    <View style={calendarStyles.container}>
      {/* Month Navigation */}
      <View style={calendarStyles.header}>
        <TouchableOpacity onPress={goToPrevMonth} style={calendarStyles.navButton}>
          <ChevronLeft size={20} color="#393735" />
        </TouchableOpacity>
        <Text style={calendarStyles.monthTitle}>
          {months[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </Text>
        <TouchableOpacity onPress={goToNextMonth} style={calendarStyles.navButton}>
          <ChevronRight size={20} color="#393735" />
        </TouchableOpacity>
      </View>

      {/* Day Labels */}
      <View style={calendarStyles.dayLabels}>
        {dayLabels.map((label, i) => (
          <View key={i} style={calendarStyles.dayLabelCell}>
            <Text style={calendarStyles.dayLabelText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar Grid */}
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

export const TeamStatsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const bottomPadding = useBottomSafeArea(12);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('month');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [teamCardExpanded, setTeamCardExpanded] = useState(false);
  const [visitsCardExpanded, setVisitsCardExpanded] = useState(false);
  const [sheetsCardExpanded, setSheetsCardExpanded] = useState(false);

  // Hierarchical filter state
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedManagerId, setSelectedManagerId] = useState<string | undefined>(undefined);
  const [selectedRepId, setSelectedRepId] = useState<string | undefined>(undefined);
  const [expandedManagerIds, setExpandedManagerIds] = useState<Set<string>>(new Set());

  // Ref for modal scroll view
  const modalScrollRef = React.useRef<ScrollView>(null);
  // Track manager row positions for scrolling
  const managerRowPositions = React.useRef<Record<string, number>>({});

  // Custom date range state
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    // Default to 7 days ago
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [editingDate, setEditingDate] = useState<'start' | 'end'>('start');

  // Edit rep modal state
  const [editRepModalVisible, setEditRepModalVisible] = useState(false);
  const [editRepName, setEditRepName] = useState('');
  const [editRepPhone, setEditRepPhone] = useState('');
  const [editRepTerritory, setEditRepTerritory] = useState('');
  const [editRepManagerId, setEditRepManagerId] = useState<string | undefined>(undefined);
  const [editRepIsActive, setEditRepIsActive] = useState(true);
  const [editRepSaving, setEditRepSaving] = useState(false);

  // Distributor picker state for edit modal
  const [editRepDistributorId, setEditRepDistributorId] = useState<string | null>(null);
  const [editRepDistributorName, setEditRepDistributorName] = useState<string>('');
  const [distributors, setDistributors] = useState<Array<{id: string; name: string}>>([]);
  const [distributorModalVisible, setDistributorModalVisible] = useState(false);
  const [loadingDistributors, setLoadingDistributors] = useState(false);

  const isAdmin = user?.role === 'admin';
  // Get the actual user ID - Firebase user object may have uid directly or nested in _user
  const currentUserId = user?.uid || (user as any)?._user?.uid;

  // Check if current range supports heatmap
  // Custom range only supports heatmap if start and end are in the same month
  const customRangeSameMonth = useMemo(() => {
    if (selectedRange !== 'custom') return false;
    const [startYear, startMonth] = customStartDate.split('-').map(Number);
    const [endYear, endMonth] = customEndDate.split('-').map(Number);
    return startYear === endYear && startMonth === endMonth;
  }, [selectedRange, customStartDate, customEndDate]);

  const supportsHeatmap = selectedRange === 'month' || selectedRange === 'week' || customRangeSameMonth;

  // Toggle team card expansion with animation
  const toggleTeamCardExpand = () => {
    if (!supportsHeatmap) return; // Only expandable in week/month view
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTeamCardExpanded(!teamCardExpanded);
  };

  // Reset expansion when changing time range (except between week/month)
  const handleRangeChange = (range: TimeRange) => {
    const newSupportsHeatmap = range === 'month' || range === 'week';
    if (!newSupportsHeatmap && teamCardExpanded) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setTeamCardExpanded(false);
    }
    // If switching to custom, open the date picker
    if (range === 'custom') {
      setDatePickerVisible(true);
    }
    setSelectedRange(range);
  };

  // Handle custom date selection
  const handleDateSelect = (date: string) => {
    if (editingDate === 'start') {
      setCustomStartDate(date);
      // If new start is after end, adjust end
      if (date > customEndDate) {
        setCustomEndDate(date);
      }
    } else {
      setCustomEndDate(date);
    }
  };

  // Apply custom date range
  const applyCustomRange = () => {
    setDatePickerVisible(false);
  };

  // Fetch users list for filter (managers + reps for admin, just reps for NH/AM)
  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ['teamFilterUsers', user?.role],
    queryFn: async () => {
      // Fetch all users - the backend filters based on caller's permissions
      const response = await api.getUsersList({});
      return response.users || [];
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Separate managers and reps
  const { managers, reps, repsByManager } = useMemo(() => {
    const allUsers: FilterUser[] = usersData || [];
    const managerRoles = ['national_head', 'area_manager'];
    let mgrs = allUsers.filter(u => managerRoles.includes(u.role));
    const salesReps = allUsers.filter(u => u.role === 'rep');

    // For AM/NH: if current user isn't in managers list, add them
    // This allows their reps to be shown in the expandable filter
    const userRole = user?.role;
    if (user && currentUserId && userRole && managerRoles.includes(userRole) && !mgrs.find(m => m.id === currentUserId)) {
      mgrs = [{
        id: currentUserId,
        name: (user as any)?.displayName || (user as any)?._user?.displayName || 'My Team',
        role: userRole,
        territory: '',
        reportsToUserId: undefined,
        isActive: true,
      }, ...mgrs];
    }

    // Group reps by their manager
    const byManager: Record<string, FilterUser[]> = {};
    salesReps.forEach(rep => {
      const managerId = rep.reportsToUserId || 'unassigned';
      if (!byManager[managerId]) byManager[managerId] = [];
      byManager[managerId].push(rep);
    });

    return { managers: mgrs, reps: salesReps, repsByManager: byManager };
  }, [usersData, user, currentUserId]);

  // Get display name for current filter
  const filterDisplayName = useMemo(() => {
    if (filterType === 'all') return 'All Users';
    if (filterType === 'rep' && selectedRepId) {
      const rep = reps.find(r => r.id === selectedRepId);
      return rep?.name || 'Sales Rep';
    }
    if (filterType === 'manager' && selectedManagerId) {
      const manager = managers.find(m => m.id === selectedManagerId);
      return manager ? `${manager.name}'s Team` : 'Team';
    }
    return 'All Users';
  }, [filterType, selectedManagerId, selectedRepId, managers, reps]);

  // Get selected rep details - uses cached data, no API call
  const selectedRepDetails = useMemo(() => {
    if (filterType !== 'rep' || !selectedRepId) return null;
    const rep = reps.find(r => r.id === selectedRepId);
    if (!rep) return null;
    return {
      name: rep.name,
      phone: rep.phone,
      territory: rep.territory,
      reportsToUserId: rep.reportsToUserId,
      isActive: rep.isActive !== false, // Default to true if undefined
      primaryDistributorId: rep.primaryDistributorId,
    };
  }, [filterType, selectedRepId, reps]);

  // Fetch distributors for edit modal (lazy load)
  const fetchDistributors = async () => {
    if (distributors.length > 0) return; // Already fetched
    setLoadingDistributors(true);
    try {
      const response = await api.getAccountsList({ type: 'distributor' });
      if (response.ok && response.accounts) {
        setDistributors(response.accounts.map((a: any) => ({ id: a.id, name: a.name })));
      }
    } catch (err) {
      console.error('Failed to fetch distributors:', err);
    } finally {
      setLoadingDistributors(false);
    }
  };

  // Get today's date
  const today = useMemo(() => new Date().toISOString().substring(0, 10), []);

  // Fetch team stats
  const {
    data: statsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<TeamStatsResponse>({
    queryKey: ['teamStats', selectedRange, selectedRange === 'custom' ? `${customStartDate}-${customEndDate}` : today, filterType, selectedManagerId, selectedRepId],
    queryFn: async () => {
      const baseParams = {
        filterByManagerId: filterType === 'manager' ? selectedManagerId : undefined,
        filterByUserId: filterType === 'rep' ? selectedRepId : undefined,
      };

      if (selectedRange === 'custom') {
        const response = await api.getTeamStats({
          range: 'custom',
          startDate: customStartDate,
          endDate: customEndDate,
          ...baseParams,
        });
        return response;
      }
      const response = await api.getTeamStats({
        date: today,
        range: selectedRange,
        ...baseParams,
      });
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const stats = statsData?.stats;

  // Current month for target fetching
  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Fetch target data for single rep view
  const { data: targetData, isLoading: isLoadingTarget } = useQuery({
    queryKey: ['repTarget', selectedRepId, currentMonth],
    queryFn: async () => {
      if (!selectedRepId) return null;
      const response = await api.getTarget({ userId: selectedRepId, month: currentMonth });
      return response;
    },
    enabled: filterType === 'rep' && !!selectedRepId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Build sheets progress data combining stats + targets
  const sheetsProgressData = useMemo(() => {
    if (filterType !== 'rep' || !stats?.sheets?.byCatalog) return null;

    const catalogs = ['Fine Decor', 'Artvio', 'Woodrica', 'Artis 1MM'] as const;
    const progress = targetData?.progress || [];

    return catalogs.map(catalog => {
      const achieved = stats.sheets.byCatalog[catalog] || 0;
      const targetEntry = progress.find((p: TargetProgress) => p.catalog === catalog);
      const target = targetEntry?.target || 0;
      const percentage = target > 0 ? Math.round((achieved / target) * 100) : 0;

      return {
        catalog,
        achieved,
        target,
        percentage,
        color: CATALOG_COLORS[catalog],
      };
    });
  }, [filterType, stats, targetData]);

  // Calculate total sheets progress
  const totalSheetsProgress = useMemo(() => {
    if (!sheetsProgressData) return null;
    const totalAchieved = sheetsProgressData.reduce((sum, item) => sum + item.achieved, 0);
    const totalTarget = sheetsProgressData.reduce((sum, item) => sum + item.target, 0);
    const percentage = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0;
    return { achieved: totalAchieved, target: totalTarget, percentage };
  }, [sheetsProgressData]);

  // Calculate pending total (sheet logs + expense logs)
  const pendingTotal = (stats?.pending?.sheetsLogs || 0) + (stats?.pending?.expenses || 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <BarChart3 size={24} color="#C9A961" />
          <Text style={styles.headerTitle}>Stats</Text>
        </View>
        <TouchableOpacity
          style={styles.headerFilterChip}
          onPress={() => setFilterModalVisible(true)}
        >
          <Text style={styles.headerFilterText} numberOfLines={1}>
            {filterDisplayName}
          </Text>
          <ChevronDown size={16} color="#C9A961" />
        </TouchableOpacity>
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
        contentContainerStyle={[styles.content, { paddingBottom: 80 + bottomPadding }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Team Activity - Expandable card (week/month view) */}
        <TouchableOpacity
          style={styles.teamCard}
          onPress={toggleTeamCardExpand}
          activeOpacity={supportsHeatmap ? 0.7 : 1}
          disabled={!supportsHeatmap}
        >
          <View style={styles.teamCardHeader}>
            {filterType === 'rep' ? (
              <MapPin size={20} color="#666" />
            ) : (
              <Users size={20} color="#666" />
            )}
            <Text style={styles.teamCardTitle}>
              {filterType === 'rep' ? 'ACTIVITY' : 'TEAM'}
            </Text>
            {supportsHeatmap && (
              <View style={styles.teamCardExpandIcon}>
                {teamCardExpanded ? (
                  <ChevronUp size={16} color="#888" />
                ) : (
                  <ChevronDown size={16} color="#888" />
                )}
              </View>
            )}
          </View>
          <View style={styles.teamCardBody}>
            {isLoading ? (
              <Skeleton width={80} height={48} />
            ) : filterType === 'rep' ? (
              // For single rep: show active days count
              (() => {
                const dailyActivity = stats?.team?.dailyActivity || [];
                const today = new Date().toISOString().split('T')[0];
                const activeDays = dailyActivity.filter(d => d.activeCount > 0 && d.date <= today).length;
                const totalDays = dailyActivity.filter(d => d.date <= today).length;
                return (
                  <>
                    <Text style={styles.teamActiveNumber}>{activeDays}</Text>
                    <Text style={styles.teamActiveLabel}>of {totalDays} days active</Text>
                  </>
                );
              })()
            ) : (
              <>
                <Text style={styles.teamActiveNumber}>{stats?.team?.active || 0}</Text>
                <Text style={styles.teamActiveLabel}>of {stats?.team?.total || 0} active</Text>
              </>
            )}
          </View>

          {/* Expandable Heatmap Section */}
          {supportsHeatmap && teamCardExpanded && (
            <ActivityHeatmap
              dailyActivity={stats?.team?.dailyActivity}
              loading={isLoading}
              isWeekView={selectedRange === 'week'}
              isCustomRange={selectedRange === 'custom'}
              isSingleRepView={filterType === 'rep'}
            />
          )}
        </TouchableOpacity>

        {/* Visits - Number Grid (Expandable for single rep) */}
        <TouchableOpacity
          style={styles.splitCard}
          onPress={() => {
            if (filterType === 'rep' && stats?.visitDetails) {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setVisitsCardExpanded(!visitsCardExpanded);
            }
          }}
          activeOpacity={filterType === 'rep' ? 0.7 : 1}
        >
          <View style={styles.splitCardHeader}>
            <MapPin size={20} color="#2196F3" />
            <Text style={styles.splitCardTitle}>VISITS</Text>
            {filterType === 'rep' && stats?.visitDetails && (
              <View style={styles.teamCardExpandIcon}>
                {visitsCardExpanded ? (
                  <ChevronUp size={16} color="#888" />
                ) : (
                  <ChevronDown size={16} color="#888" />
                )}
              </View>
            )}
          </View>
          <View style={styles.splitCardBody}>
            {/* Left - Big Number */}
            <View style={styles.splitCardLeft}>
              {isLoading ? (
                <Skeleton width={60} height={42} />
              ) : (
                <Text style={styles.splitCardNumber}>{formatNumber(stats?.visits?.total || 0)}</Text>
              )}
              <Text style={styles.splitCardNumberLabel}>total</Text>
            </View>
            {/* Divider */}
            <View style={styles.splitCardDivider} />
            {/* Right - 2x2 Grid */}
            <View style={styles.numberGrid}>
              {[
                { label: 'Distributor', value: stats?.visits?.distributor || 0, color: '#1976D2' },
                { label: 'Dealer', value: stats?.visits?.dealer || 0, color: '#388E3C' },
                { label: 'Architect', value: stats?.visits?.architect || 0, color: '#F57C00' },
                { label: 'OEM', value: stats?.visits?.OEM || 0, color: '#7B1FA2' },
              ].map((item) => (
                <View key={item.label} style={styles.numberGridItem}>
                  {isLoading ? (
                    <Skeleton width={30} height={24} />
                  ) : (
                    <Text style={[styles.numberGridValue, { color: item.color }]}>{formatNumber(item.value)}</Text>
                  )}
                  <Text style={styles.numberGridLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Expandable Visit Details (single rep only) - Clean Account Coverage */}
          {filterType === 'rep' && visitsCardExpanded && stats?.visitDetails && (
            <View style={styles.visitDetailsContainer}>
              {/* Header with unique accounts count and View All */}
              <TouchableOpacity
                style={styles.accountCoverageHeaderRow}
                onPress={() => {
                  if (!selectedRepId || !stats?.visitDetails?.topAccounts?.length) return;

                  const visitData: Record<string, { count: number; lastVisit: string }> = {};
                  stats.visitDetails.topAccounts.forEach((acc: any) => {
                    visitData[acc.accountId] = {
                      count: acc.visitCount,
                      lastVisit: acc.lastVisit || '',
                    };
                  });

                  const repName = reps.find(r => r.id === selectedRepId)?.name || 'User';

                  navigation?.navigate('SelectAccount', {
                    mode: 'manage',
                    filterByUserVisits: {
                      userId: selectedRepId,
                      userName: repName,
                      visitData,
                    },
                  });
                }}
                activeOpacity={stats.visitDetails.topAccounts?.length ? 0.7 : 1}
              >
                <Text style={styles.accountCoverageMainText}>
                  <Text style={styles.accountCoverageNumber}>{stats.visitDetails.topAccounts?.length || 0}</Text> unique accounts
                </Text>
                {stats.visitDetails.topAccounts && stats.visitDetails.topAccounts.length > 0 && (
                  <View style={styles.viewAllChip}>
                    <Text style={styles.viewAllChipText}>View All</Text>
                    <ChevronRight size={14} color="#2196F3" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Most Active & Latest - Full width cards */}
              <View style={styles.accountHighlightRow}>
                {/* Most Active Account */}
                {stats.visitDetails.topAccounts && stats.visitDetails.topAccounts.length > 0 && (
                  <View style={styles.accountHighlightCard}>
                    <View style={styles.accountHighlightIcon}>
                      <Target size={16} color="#FF9800" />
                    </View>
                    <View style={styles.accountHighlightContent}>
                      <Text style={styles.accountHighlightName} numberOfLines={1}>
                        {stats.visitDetails.topAccounts[0].accountName}
                      </Text>
                      <Text style={styles.accountHighlightMeta}>
                        {stats.visitDetails.topAccounts[0].visitCount} visits • Most active
                      </Text>
                    </View>
                  </View>
                )}

                {/* Latest Visit */}
                {stats.visitDetails.recent && stats.visitDetails.recent.length > 0 && (
                  <View style={styles.accountHighlightCard}>
                    <View style={[styles.accountHighlightIcon, { backgroundColor: '#E8F5E9' }]}>
                      <MapPin size={16} color="#4CAF50" />
                    </View>
                    <View style={styles.accountHighlightContent}>
                      <Text style={styles.accountHighlightName} numberOfLines={1}>
                        {stats.visitDetails.recent[0].accountName}
                      </Text>
                      <Text style={styles.accountHighlightMeta}>
                        {formatRelativeTime(stats.visitDetails.recent[0].timestamp)} • Last visit
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Sheets - Number Grid (Expandable for single rep) */}
        {filterType === 'rep' ? (
          <TouchableOpacity
            style={styles.splitCard}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setSheetsCardExpanded(!sheetsCardExpanded);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.splitCardHeader}>
              <Layers size={20} color="#FF9800" />
              <Text style={styles.splitCardTitle}>SHEETS SOLD</Text>
              {!isLoading && (stats?.pending?.sheets ?? 0) > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>+{stats?.pending?.sheets} pending</Text>
                </View>
              )}
              <View style={styles.teamCardExpandIcon}>
                {sheetsCardExpanded ? (
                  <ChevronUp size={16} color="#888" />
                ) : (
                  <ChevronDown size={16} color="#888" />
                )}
              </View>
            </View>

            {/* Collapsed: Show compact view with total and 2x2 grid */}
            {!sheetsCardExpanded && (
              <View style={styles.splitCardBody}>
                {/* Left - Big Number */}
                <View style={styles.splitCardLeft}>
                  {isLoading ? (
                    <Skeleton width={60} height={42} />
                  ) : (
                    <Text style={styles.splitCardNumber}>{formatNumber(stats?.sheets?.total || 0)}</Text>
                  )}
                  <Text style={styles.splitCardNumberLabel}>approved</Text>
                </View>
                {/* Divider */}
                <View style={styles.splitCardDivider} />
                {/* Right - 2x2 Grid */}
                <View style={styles.numberGrid}>
                  {[
                    { label: 'Fine Decor', value: stats?.sheets?.byCatalog?.['Fine Decor'] || 0, color: '#D32F2F' },
                    { label: 'Artvio', value: stats?.sheets?.byCatalog?.['Artvio'] || 0, color: '#1976D2' },
                    { label: 'Woodrica', value: stats?.sheets?.byCatalog?.['Woodrica'] || 0, color: '#2E7D32' },
                    { label: 'Artis 1MM', value: stats?.sheets?.byCatalog?.['Artis 1MM'] || 0, color: '#F57C00' },
                  ].map((item) => (
                    <View key={item.label} style={styles.numberGridItem}>
                      {isLoading ? (
                        <Skeleton width={30} height={24} />
                      ) : (
                        <Text style={[styles.numberGridValue, { color: item.color }]}>{formatNumber(item.value)}</Text>
                      )}
                      <Text style={styles.numberGridLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Expanded: Show progress bars with targets */}
            {sheetsCardExpanded && (
              <View style={styles.sheetsProgressContainer}>
                {isLoading || isLoadingTarget ? (
                  <View style={{ gap: 16 }}>
                    <Skeleton rows={1} style={{ height: 50 }} />
                    <Skeleton rows={1} style={{ height: 50 }} />
                    <Skeleton rows={1} style={{ height: 50 }} />
                    <Skeleton rows={1} style={{ height: 50 }} />
                  </View>
                ) : sheetsProgressData ? (
                  <>
                    {sheetsProgressData.map((item) => (
                      <View key={item.catalog} style={styles.catalogProgressRow}>
                        <View style={styles.catalogProgressHeader}>
                          <Text style={styles.catalogProgressName}>{item.catalog}</Text>
                          <Text style={styles.catalogProgressValues}>
                            <Text style={{ fontWeight: '700', color: item.color }}>{item.achieved}</Text>
                            <Text style={{ color: '#888' }}> / {item.target > 0 ? item.target : '—'}</Text>
                          </Text>
                        </View>
                        <View style={styles.catalogProgressBarRow}>
                          <ProgressBar progress={item.percentage} color={item.color} />
                          <Text style={[
                            styles.catalogProgressPercent,
                            item.percentage >= 100 && styles.catalogProgressComplete,
                          ]}>
                            {item.target > 0 ? `${item.percentage}%` : 'No target'}
                            {item.percentage >= 100 && ' ✓'}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {/* Total Summary */}
                    {totalSheetsProgress && totalSheetsProgress.target > 0 && (
                      <View style={styles.totalProgressSection}>
                        <View style={styles.totalProgressHeader}>
                          <Text style={styles.totalProgressLabel}>Total</Text>
                          <Text style={styles.totalProgressValues}>
                            <Text style={{ fontWeight: '700', color: '#393735' }}>{totalSheetsProgress.achieved}</Text>
                            <Text style={{ color: '#888' }}> / {totalSheetsProgress.target}</Text>
                          </Text>
                        </View>
                        <View style={styles.catalogProgressBarRow}>
                          <ProgressBar progress={totalSheetsProgress.percentage} color="#393735" height={10} />
                          <Text style={[
                            styles.catalogProgressPercent,
                            { fontWeight: '700' },
                            totalSheetsProgress.percentage >= 100 && styles.catalogProgressComplete,
                          ]}>
                            {totalSheetsProgress.percentage}%
                            {totalSheetsProgress.percentage >= 100 && ' ✓'}
                          </Text>
                        </View>
                      </View>
                    )}
                  </>
                ) : (
                  <Text style={{ color: '#888', textAlign: 'center', paddingVertical: 16 }}>
                    No target data available
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <NumberGridCard
            icon={<Layers size={20} color="#FF9800" />}
            title="SHEETS SOLD"
            total={stats?.sheets?.total || 0}
            totalLabel="approved"
            loading={isLoading}
            pendingCount={stats?.pending?.sheets}
            breakdowns={[
              { label: 'Fine Decor', value: stats?.sheets?.byCatalog?.['Fine Decor'] || 0, color: '#D32F2F' },
              { label: 'Artvio', value: stats?.sheets?.byCatalog?.['Artvio'] || 0, color: '#1976D2' },
              { label: 'Woodrica', value: stats?.sheets?.byCatalog?.['Woodrica'] || 0, color: '#2E7D32' },
              { label: 'Artis 1MM', value: stats?.sheets?.byCatalog?.['Artis 1MM'] || 0, color: '#F57C00' },
            ]}
          />
        )}

        {/* Expenses Card - Single Rep View Only */}
        {filterType === 'rep' && selectedRepId && stats?.expenses && (
          <View style={styles.expenseCard}>
            <View style={styles.expenseCardHeader}>
              <IndianRupee size={18} color="#4CAF50" />
              <Text style={styles.expenseCardTitle}>EXPENSES</Text>
              <Text style={styles.expenseCardTotal}>
                {stats.expenses.total > 0 ? formatRupee(stats.expenses.total) : '₹0'}
              </Text>
            </View>
            {stats.expenses.total > 0 && stats.expenses.byCategory && (
              <View style={styles.expenseBreakdown}>
                {(stats.expenses.byCategory.travel || 0) > 0 && (
                  <View style={styles.expenseBreakdownItem}>
                    <Text style={styles.expenseBreakdownLabel}>Travel</Text>
                    <Text style={styles.expenseBreakdownValue}>{formatRupee(stats.expenses.byCategory.travel)}</Text>
                  </View>
                )}
                {(stats.expenses.byCategory.food || 0) > 0 && (
                  <View style={styles.expenseBreakdownItem}>
                    <Text style={styles.expenseBreakdownLabel}>Food</Text>
                    <Text style={styles.expenseBreakdownValue}>{formatRupee(stats.expenses.byCategory.food)}</Text>
                  </View>
                )}
                {(stats.expenses.byCategory.accommodation || 0) > 0 && (
                  <View style={styles.expenseBreakdownItem}>
                    <Text style={styles.expenseBreakdownLabel}>Accommodation</Text>
                    <Text style={styles.expenseBreakdownValue}>{formatRupee(stats.expenses.byCategory.accommodation)}</Text>
                  </View>
                )}
                {(stats.expenses.byCategory.other || 0) > 0 && (
                  <View style={styles.expenseBreakdownItem}>
                    <Text style={styles.expenseBreakdownLabel}>Other</Text>
                    <Text style={styles.expenseBreakdownValue}>{formatRupee(stats.expenses.byCategory.other)}</Text>
                  </View>
                )}
              </View>
            )}
            {(stats?.pending?.expenses ?? 0) > 0 && (
              <Text style={styles.expenseCardPending}>
                {stats.pending.expenses} pending approval
              </Text>
            )}
          </View>
        )}

        {/* Pending Banner */}
        <TouchableOpacity style={styles.pendingBanner} onPress={() => {
          // If a specific rep is selected, pass their name to pre-filter the Review tab
          if (filterType === 'rep' && selectedRepId && filterDisplayName !== 'All Users') {
            navigation?.navigate('Home', { screen: 'ReviewTab', params: { filterUserName: filterDisplayName } });
          } else {
            navigation?.navigate('Home', { screen: 'ReviewTab' });
          }
        }}>
          <View style={styles.pendingLeft}>
            <View style={styles.pendingIconCircle}>
              <Bell size={18} color="#C9A961" />
            </View>
            <View>
              {isLoading ? (
                <Skeleton width={100} height={20} />
              ) : (
                <>
                  <Text style={styles.pendingTitle}>{pendingTotal} Pending Review</Text>
                  <Text style={styles.pendingSub}>
                    {stats?.pending?.sheetsLogs || 0} sheets, {stats?.pending?.expenses || 0} expenses
                  </Text>
                </>
              )}
            </View>
          </View>
          <ChevronRight size={20} color="#C9A961" />
        </TouchableOpacity>

        {/* Rep Action Bar - Shows at bottom for single rep view */}
        {filterType === 'rep' && selectedRepId && (
          <View style={styles.repActionBar}>
            {/* Contact Info Row */}
            <View style={styles.repActionInfoRow}>
              <View style={styles.repActionInfoBlock}>
                <Phone size={14} color="#888" />
                <Text style={styles.repActionInfoLabel}>Phone</Text>
                <Text style={styles.repActionInfoValue}>{formatPhoneForDisplay(selectedRepDetails?.phone) || '—'}</Text>
              </View>
              <View style={styles.repActionInfoDivider} />
              <View style={styles.repActionInfoBlock}>
                <MapPin size={14} color="#888" />
                <Text style={styles.repActionInfoLabel}>Territory</Text>
                <Text style={styles.repActionInfoValue}>{selectedRepDetails?.territory || '—'}</Text>
              </View>
            </View>
            {/* Action Buttons */}
            <View style={styles.repActionButtons}>
              <TouchableOpacity
                style={[styles.repActionBtn, styles.repActionBtnPrimary]}
                onPress={() => navigation?.navigate('SetTarget', {
                  userId: selectedRepId,
                  userName: filterDisplayName,
                  currentMonth: currentMonth,
                })}
              >
                <Target size={16} color="#FFFFFF" />
                <Text style={[styles.repActionBtnText, { color: '#FFFFFF' }]}>Set Target</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.repActionBtn}
                onPress={() => {
                  // Populate all edit fields from selected rep
                  setEditRepName(selectedRepDetails?.name || '');
                  setEditRepPhone(selectedRepDetails?.phone || '');
                  setEditRepTerritory(selectedRepDetails?.territory || '');
                  setEditRepManagerId(selectedRepDetails?.reportsToUserId);
                  setEditRepIsActive(selectedRepDetails?.isActive !== false);
                  // Set distributor info
                  setEditRepDistributorId(selectedRepDetails?.primaryDistributorId || null);
                  // Find distributor name if we have the list cached
                  const distName = distributors.find(d => d.id === selectedRepDetails?.primaryDistributorId)?.name || '';
                  setEditRepDistributorName(distName);
                  // Fetch distributors list (lazy load)
                  fetchDistributors();
                  setEditRepModalVisible(true);
                }}
              >
                <Edit2 size={16} color="#393735" />
                <Text style={[styles.repActionBtnText, { color: '#393735' }]}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Hierarchical Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContent}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Team</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Hierarchical Options List */}
            <ScrollView
              style={styles.modalList}
              ref={modalScrollRef}
              contentContainerStyle={{ paddingBottom: 80 }}
            >
              {/* Build filter options as a single array to avoid key issues */}
              {(() => {
                const options: React.ReactNode[] = [];

                // All Users option (admin only)
                if (isAdmin) {
                  options.push(
                    <TouchableOpacity
                      key="all-users"
                      style={[
                        styles.modalOption,
                        filterType === 'all' && styles.modalOptionSelected,
                      ]}
                      onPress={() => {
                        setFilterType('all');
                        setSelectedManagerId(undefined);
                        setSelectedRepId(undefined);
                        setFilterModalVisible(false);
                      }}
                    >
                      <View style={styles.modalOptionLeft}>
                        <View style={styles.modalOptionAvatar}>
                          <Users size={16} color="#666" />
                        </View>
                        <Text style={styles.modalOptionName}>All Users</Text>
                      </View>
                      {filterType === 'all' && <Check size={20} color="#2E7D32" />}
                    </TouchableOpacity>
                  );
                }

                // Manager rows with expandable reps
                managers.filter(m => {
                  // For non-admin (NH/AM), only show their own entry
                  if (!isAdmin) {
                    return m.id === currentUserId;
                  }
                  // For admin, show all managers
                  return true;
                }).forEach((manager) => {
                  const managerReps = repsByManager[manager.id] || [];
                  const isExpanded = expandedManagerIds.has(manager.id);
                  const isManagerTeamSelected = filterType === 'manager' && selectedManagerId === manager.id;

                  options.push(
                    <View
                      key={`manager-${manager.id}`}
                      onLayout={(e) => {
                        managerRowPositions.current[manager.id] = e.nativeEvent.layout.y;
                      }}
                    >
                      {/* Manager Row */}
                      <TouchableOpacity
                        style={[
                          styles.modalOption,
                          isManagerTeamSelected && styles.modalOptionSelected,
                        ]}
                        onPress={() => {
                          // Toggle expand/collapse
                          const newSet = new Set(expandedManagerIds);
                          if (isExpanded) {
                            newSet.delete(manager.id);
                          } else {
                            newSet.add(manager.id);
                            // Scroll to this manager row after a brief delay (for animation)
                            setTimeout(() => {
                              const y = managerRowPositions.current[manager.id];
                              if (y !== undefined && modalScrollRef.current) {
                                modalScrollRef.current.scrollTo({ y, animated: true });
                              }
                            }, 100);
                          }
                          setExpandedManagerIds(newSet);
                        }}
                      >
                        <View style={styles.modalOptionLeft}>
                          {/* Expand chevron */}
                          {managerReps.length > 0 ? (
                            isExpanded ? (
                              <ChevronDown size={16} color="#888" style={{ marginRight: 8 }} />
                            ) : (
                              <ChevronRight size={16} color="#888" style={{ marginRight: 8 }} />
                            )
                          ) : (
                            <View style={{ width: 24 }} />
                          )}
                          <View style={styles.modalOptionAvatar}>
                            <Users size={16} color="#666" />
                          </View>
                          <View>
                            <Text style={styles.modalOptionName}>{manager.name}</Text>
                            <Text style={styles.modalOptionRole}>
                              {manager.role === 'area_manager' ? 'Area Manager' :
                               manager.role === 'national_head' ? 'National Head' :
                               manager.role}
                              {managerReps.length > 0 && ` • ${managerReps.length} reps`}
                            </Text>
                          </View>
                        </View>
                        {isManagerTeamSelected && <Check size={20} color="#2E7D32" />}
                      </TouchableOpacity>

                      {/* Expanded content: Team option + Individual reps */}
                      {isExpanded && managerReps.length > 0 && (
                        <View style={styles.expandedSection}>
                          {/* Team aggregate option */}
                          <TouchableOpacity
                            style={[
                              styles.modalOption,
                              styles.modalOptionIndented,
                              isManagerTeamSelected && styles.modalOptionSelected,
                            ]}
                            onPress={() => {
                              setFilterType('manager');
                              setSelectedManagerId(manager.id);
                              setSelectedRepId(undefined);
                              setFilterModalVisible(false);
                            }}
                          >
                            <View style={styles.modalOptionLeft}>
                              <View style={[styles.modalOptionAvatar, { backgroundColor: '#E3F2FD' }]}>
                                <Users size={14} color="#1976D2" />
                              </View>
                              <Text style={styles.modalOptionName}>Team ({managerReps.length} reps)</Text>
                            </View>
                            {isManagerTeamSelected && <Check size={20} color="#2E7D32" />}
                          </TouchableOpacity>

                          {/* Individual rep options */}
                          {managerReps.map((rep) => {
                            const isRepSelected = filterType === 'rep' && selectedRepId === rep.id;
                            return (
                              <TouchableOpacity
                                key={rep.id}
                                style={[
                                  styles.modalOption,
                                  styles.modalOptionIndented,
                                  isRepSelected && styles.modalOptionSelected,
                                ]}
                                onPress={() => {
                                  setFilterType('rep');
                                  setSelectedManagerId(manager.id);
                                  setSelectedRepId(rep.id);
                                  setFilterModalVisible(false);
                                }}
                              >
                                <View style={styles.modalOptionLeft}>
                                  <View style={[styles.modalOptionAvatar, { backgroundColor: '#F5F5F5' }]}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#666' }}>
                                      {rep.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                    </Text>
                                  </View>
                                  <View>
                                    <Text style={styles.modalOptionName}>{rep.name}</Text>
                                    {rep.territory && (
                                      <Text style={styles.modalOptionRole}>{rep.territory}</Text>
                                    )}
                                  </View>
                                </View>
                                {isRepSelected && <Check size={20} color="#2E7D32" />}
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                });

                return options;
              })()}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Custom Date Range Picker Modal */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDatePickerVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.datePickerContent}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date Range</Text>
              <TouchableOpacity onPress={() => setDatePickerVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Start/End Toggle */}
            <View style={styles.dateToggleRow}>
              <TouchableOpacity
                style={[styles.dateToggleBtn, editingDate === 'start' && styles.dateToggleBtnActive]}
                onPress={() => setEditingDate('start')}
              >
                <Text style={[styles.dateToggleLabel, editingDate === 'start' && styles.dateToggleLabelActive]}>
                  Start Date
                </Text>
                <Text style={[styles.dateToggleValue, editingDate === 'start' && styles.dateToggleValueActive]}>
                  {formatDateShort(customStartDate)}
                </Text>
              </TouchableOpacity>
              <View style={styles.dateToggleDivider}>
                <ChevronRight size={16} color="#CCC" />
              </View>
              <TouchableOpacity
                style={[styles.dateToggleBtn, editingDate === 'end' && styles.dateToggleBtnActive]}
                onPress={() => setEditingDate('end')}
              >
                <Text style={[styles.dateToggleLabel, editingDate === 'end' && styles.dateToggleLabelActive]}>
                  End Date
                </Text>
                <Text style={[styles.dateToggleValue, editingDate === 'end' && styles.dateToggleValueActive]}>
                  {formatDateShort(customEndDate)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Calendar */}
            <CalendarPicker
              selectedDate={editingDate === 'start' ? customStartDate : customEndDate}
              onDateSelect={handleDateSelect}
              maxDate={editingDate === 'start' ? customEndDate : today}
              minDate={editingDate === 'end' ? customStartDate : undefined}
            />

            {/* Apply Button */}
            <TouchableOpacity style={styles.applyButton} onPress={applyCustomRange}>
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit Rep Modal */}
      <Modal
        visible={editRepModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEditRepModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditRepModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.editRepModalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {filterDisplayName}</Text>
              <TouchableOpacity onPress={() => setEditRepModalVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editRepScrollContent} showsVerticalScrollIndicator={false}>
              {/* Name Field */}
              <View style={styles.editRepField}>
                <Text style={styles.editRepLabel}>Name</Text>
                <TextInput
                  style={styles.editRepInput}
                  value={editRepName}
                  onChangeText={setEditRepName}
                  placeholder="Enter name"
                  placeholderTextColor="#999"
                  autoCapitalize="words"
                />
              </View>

              {/* Phone Field */}
              <View style={styles.editRepField}>
                <Text style={styles.editRepLabel}>Phone</Text>
                <TextInput
                  style={styles.editRepInput}
                  value={editRepPhone}
                  onChangeText={setEditRepPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Territory Field */}
              <View style={styles.editRepField}>
                <Text style={styles.editRepLabel}>Territory</Text>
                <TextInput
                  style={styles.editRepInput}
                  value={editRepTerritory}
                  onChangeText={setEditRepTerritory}
                  placeholder="Enter territory"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Primary Distributor Field */}
              <View style={styles.editRepField}>
                <Text style={styles.editRepLabel}>Primary Distributor</Text>
                <TouchableOpacity
                  style={styles.editRepInput}
                  onPress={() => setDistributorModalVisible(true)}
                >
                  {loadingDistributors ? (
                    <ActivityIndicator size="small" color="#666" />
                  ) : (
                    <Text style={{ fontSize: 16, color: editRepDistributorId ? '#1A1A1A' : '#999' }}>
                      {editRepDistributorName || 'Select distributor (optional)'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Manager (Reports To) Field - Admin sees all, others see only themselves */}
              <View style={styles.editRepField}>
                <Text style={styles.editRepLabel}>Reports To</Text>
                {isAdmin ? (
                  <View style={styles.editRepManagerPicker}>
                    {managers.map((manager) => (
                      <TouchableOpacity
                        key={manager.id}
                        style={[
                          styles.editRepManagerOption,
                          editRepManagerId === manager.id && styles.editRepManagerOptionSelected,
                        ]}
                        onPress={() => setEditRepManagerId(manager.id)}
                      >
                        <Text style={[
                          styles.editRepManagerOptionText,
                          editRepManagerId === manager.id && styles.editRepManagerOptionTextSelected,
                        ]}>
                          {manager.name}
                        </Text>
                        {editRepManagerId === manager.id && (
                          <Check size={16} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.editRepManagerPicker}>
                    <View style={[styles.editRepManagerOption, styles.editRepManagerOptionSelected]}>
                      <Text style={[styles.editRepManagerOptionText, styles.editRepManagerOptionTextSelected]}>
                        {managers.find(m => m.id === user?.uid)?.name || 'You'}
                      </Text>
                      <Check size={16} color="#FFFFFF" />
                    </View>
                    <Text style={styles.editRepFieldHint}>
                      Only admins can reassign reps to other managers
                    </Text>
                  </View>
                )}
              </View>

              {/* Active Status Toggle */}
              <View style={styles.editRepFieldRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.editRepLabel, { marginBottom: 0 }]}>Active Status</Text>
                  <Text style={styles.editRepFieldHint}>
                    {editRepIsActive ? 'User can log in and appears in team list' : 'User is hidden from team and cannot log in'}
                  </Text>
                </View>
                <View style={styles.editRepToggleContainer}>
                  <Switch
                    value={editRepIsActive}
                    onValueChange={setEditRepIsActive}
                    trackColor={{ false: '#E0E0E0', true: '#81C784' }}
                    thumbColor={editRepIsActive ? '#2E7D32' : '#BDBDBD'}
                    style={{ transform: [{ scaleX: 1.2 }, { scaleY: 1.2 }] }}
                  />
                </View>
              </View>

              {/* Bottom padding for scroll content */}
              <View style={{ height: 16 }} />
            </ScrollView>

            {/* Action Buttons - with safe area padding for Android nav bar */}
            <View style={[styles.editRepButtons, { paddingBottom: bottomPadding }]}>
              <TouchableOpacity
                style={styles.editRepCancelBtn}
                onPress={() => setEditRepModalVisible(false)}
              >
                <Text style={styles.editRepCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editRepSaveBtn, editRepSaving && { opacity: 0.6 }]}
                onPress={async () => {
                  if (!selectedRepId) return;
                  setEditRepSaving(true);
                  try {
                    await api.updateUser({
                      userId: selectedRepId,
                      name: editRepName,
                      phone: editRepPhone,
                      territory: editRepTerritory,
                      reportsToUserId: editRepManagerId,
                      isActive: editRepIsActive,
                      primaryDistributorId: editRepDistributorId || undefined,
                    });
                    setEditRepModalVisible(false);
                    Alert.alert('Success', 'User updated successfully');
                    // Refetch users to update cache
                    refetchUsers();
                  } catch (err) {
                    Alert.alert('Error', 'Failed to update user');
                  } finally {
                    setEditRepSaving(false);
                  }
                }}
                disabled={editRepSaving}
              >
                {editRepSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.editRepSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Distributor Picker Modal */}
      <Modal
        visible={distributorModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDistributorModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDistributorModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { maxHeight: '60%' }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Distributor</Text>
              <TouchableOpacity onPress={() => setDistributorModalVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Clear Selection Option */}
            <TouchableOpacity
              style={[styles.distributorOption, !editRepDistributorId && styles.distributorOptionSelected]}
              onPress={() => {
                setEditRepDistributorId(null);
                setEditRepDistributorName('');
                setDistributorModalVisible(false);
              }}
            >
              <Text style={[styles.distributorOptionText, !editRepDistributorId && styles.distributorOptionTextSelected]}>
                None (No Distributor)
              </Text>
              {!editRepDistributorId && <Check size={18} color="#393735" />}
            </TouchableOpacity>

            {/* Distributors List */}
            <FlatList
              data={distributors}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.distributorOption,
                    editRepDistributorId === item.id && styles.distributorOptionSelected,
                  ]}
                  onPress={() => {
                    setEditRepDistributorId(item.id);
                    setEditRepDistributorName(item.name);
                    setDistributorModalVisible(false);
                  }}
                >
                  <Text style={[
                    styles.distributorOptionText,
                    editRepDistributorId === item.id && styles.distributorOptionTextSelected,
                  ]}>
                    {item.name}
                  </Text>
                  {editRepDistributorId === item.id && <Check size={18} color="#393735" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                loadingDistributors ? (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#666" />
                    <Text style={{ marginTop: 8, color: '#666' }}>Loading distributors...</Text>
                  </View>
                ) : (
                  <View style={{ padding: 20, alignItems: 'center' }}>
                    <Text style={{ color: '#888' }}>No distributors found</Text>
                  </View>
                )
              }
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  // Header
  header: {
    backgroundColor: '#393735',
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(201, 169, 97, 0.25)', // Gold tint
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 6,
    maxWidth: 180,
  },
  headerFilterText: { fontSize: 14, fontWeight: '600', color: '#C9A961', flexShrink: 1 },

  // Toggle - Full Width
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
    borderRadius: 10,
    padding: 3,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePillActive: { backgroundColor: '#4A5568' },
  togglePillIcon: { flex: 0, paddingHorizontal: 16 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#888' },
  toggleTextActive: { color: '#FFFFFF' },

  // Scroll
  scrollView: { flex: 1 },
  content: { padding: 16, gap: 14 },

  // Expenses Card
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  expenseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    flex: 1,
  },
  expenseCardTotal: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  expenseBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  expenseBreakdownItem: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: '45%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseBreakdownLabel: {
    fontSize: 13,
    color: '#666',
  },
  expenseBreakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  expenseCardPending: {
    fontSize: 12,
    color: '#888',
    marginTop: 10,
  },

  // Rep Action Bar (single rep view - at bottom)
  repActionBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  repActionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  repActionInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  repActionInfoText: {
    fontSize: 14,
    color: '#444',
  },
  repActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  repActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
  },
  repActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C9A961',
  },

  // Team Card
  teamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  teamCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  teamCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
  },
  teamCardBody: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 8,
  },
  teamActiveNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  teamActiveLabel: {
    fontSize: 16,
    color: '#888',
  },
  teamCardExpandIcon: {
    marginLeft: 'auto',
  },

  // Heatmap
  heatmapContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  heatmapCentered: {
    alignItems: 'center',
  },
  heatmapDayLabels: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  heatmapDayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#888',
    textAlign: 'center',
  },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  heatmapCell: {
    borderRadius: 4,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapCellToday: {
    borderWidth: 2,
    borderColor: '#393735',
  },
  heatmapCellInvisible: {
    backgroundColor: 'transparent',
  },
  heatmapCellFuture: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  heatmapCellFutureLine: {
    position: 'absolute',
    top: '50%',
    left: -4,
    right: -4,
    height: 1,
    backgroundColor: '#CCCCCC',
    transform: [{ rotate: '45deg' }],
  },
  heatmapCellSkeleton: {
    opacity: 0.5,
  },
  heatmapCellOutOfRange: {
    opacity: 0.3,
  },
  heatmapCellCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  heatmapCellCountLight: {
    color: '#FFFFFF',
  },
  heatmapMonthLabel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heatmapMonthLabelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 8,
  },
  heatmapLegendText: {
    fontSize: 11,
    color: '#888',
  },
  heatmapLegendCells: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  heatmapLegendCell: {
    flex: 1,
    height: 10,
    borderRadius: 2,
  },

  // Split Card
  splitCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  splitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  splitCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
  },
  pendingBadge: {
    marginLeft: 8,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E65100',
  },
  splitCardBody: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  splitCardLeft: {
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitCardNumber: {
    fontSize: 42,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  splitCardNumberLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  splitCardDivider: {
    width: 1,
    height: 70,
    backgroundColor: '#E8E8E8',
    marginHorizontal: 14,
  },

  // Number Grid
  numberGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  numberGridItem: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  numberGridValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  numberGridLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },

  // Pending Banner
  pendingBanner: {
    backgroundColor: '#FFFBF0',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F0E6C8',
  },
  pendingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pendingIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#8B7355',
  },
  pendingSub: {
    fontSize: 12,
    color: '#A89070',
    marginTop: 2,
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
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  modalList: {
    flexGrow: 0,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionSelected: {
    backgroundColor: '#F5FFF5',
  },
  modalOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalOptionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  modalOptionRole: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  modalOptionIndented: {
    paddingLeft: 48,
  },
  expandedSection: {
    backgroundColor: '#FAFAFA',
  },

  // Visit Details (expandable section for single rep)
  visitDetailsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  visitDetailsSection: {
    marginBottom: 16,
  },
  visitDetailsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 0.5,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  visitDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  visitDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  visitTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  visitDetailInfo: {
    flex: 1,
  },
  visitDetailName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  visitDetailMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  visitDetailTime: {
    fontSize: 12,
    color: '#888',
    marginLeft: 8,
  },
  topAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  topAccountRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  topAccountRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
  },
  topAccountName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  topAccountCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
  },

  // Account Coverage Section - Clean Design
  accountCoverageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  accountCoverageMainText: {
    fontSize: 15,
    color: '#666',
  },
  accountCoverageNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  viewAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 2,
  },
  viewAllChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
  },
  accountHighlightRow: {
    flexDirection: 'column',
    gap: 10,
  },
  accountHighlightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  accountHighlightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  accountHighlightContent: {
    flex: 1,
  },
  accountHighlightName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  accountHighlightMeta: {
    fontSize: 12,
    color: '#888',
  },

  // Custom Range Display in Toggle
  customRangeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Date Picker Modal
  datePickerContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 16,
  },
  dateToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateToggleBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  dateToggleBtnActive: {
    backgroundColor: '#393735',
  },
  dateToggleLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  dateToggleLabelActive: {
    color: 'rgba(255,255,255,0.7)',
  },
  dateToggleValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  dateToggleValueActive: {
    color: '#FFFFFF',
  },
  dateToggleDivider: {
    paddingHorizontal: 8,
  },
  applyButton: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#393735',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Sheets Progress (expandable for single rep)
  sheetsProgressContainer: {
    marginTop: 4,
    gap: 16,
  },
  catalogProgressRow: {
    gap: 8,
  },
  catalogProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catalogProgressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  catalogProgressValues: {
    fontSize: 16,
  },
  catalogProgressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catalogProgressPercent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
    minWidth: 70,
    textAlign: 'right',
  },
  catalogProgressComplete: {
    color: '#2E7D32',
  },
  totalProgressSection: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    gap: 8,
  },
  totalProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalProgressLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#393735',
  },
  totalProgressValues: {
    fontSize: 17,
  },

  // Rep Action Bar - Info Row with evenly spaced blocks
  repActionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  repActionInfoBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  repActionInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  repActionInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  repActionInfoDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E8E8E8',
  },
  repActionBtnPrimary: {
    backgroundColor: '#393735',
  },

  // Edit Rep Modal
  editRepModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  editRepScrollContent: {
    flexGrow: 0,
  },
  editRepField: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  editRepFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  editRepFieldHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  editRepToggleContainer: {
    paddingLeft: 12,
  },
  editRepLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editRepInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  editRepManagerPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editRepManagerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  editRepManagerOptionSelected: {
    backgroundColor: '#393735',
    borderColor: '#393735',
  },
  editRepManagerOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  editRepManagerOptionTextSelected: {
    color: '#FFFFFF',
  },
  editRepButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  editRepCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  editRepCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  editRepSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#393735',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editRepSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Distributor Picker
  distributorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  distributorOptionSelected: {
    backgroundColor: '#F8F8F8',
  },
  distributorOptionText: {
    fontSize: 16,
    color: '#1A1A1A',
  },
  distributorOptionTextSelected: {
    fontWeight: '600',
  },
});

export default TeamStatsScreen;
