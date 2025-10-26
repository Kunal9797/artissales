/**
 * DetailedStatsView - Reusable component for detailed user statistics
 * Shows attendance, visits, sales, and expenses breakdown with tab navigation
 * Used in both sales rep's StatsScreen and manager's UserDetailScreen
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Calendar as CalendarComponent } from 'react-native-calendars';
import { Calendar as CalendarIcon } from 'lucide-react-native';
import { colors, spacing } from '../theme';
import { getCatalogDisplayName } from '../types';

type TabType = 'attendance' | 'visits' | 'sales' | 'expenses';

interface DetailedStatsProps {
  stats: {
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
        contractor: number;
      };
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
    expenses: {
      total: number;
      byCategory: {
        travel: number;
        food: number;
        accommodation: number;
        other: number;
      };
    };
  };
  attendanceDays: {
    present: number;
    absent: number;
    total: number;
  };
  attendancePercentage: number;
  attendanceMarkedDates?: any; // Dates to mark on calendar
  selectedMonth?: Date; // For calendar header
  targets?: {
    visitsByType?: {
      distributor?: number;
      dealer?: number;
      architect?: number;
      contractor?: number;
    };
    sheetsByCatalog?: {
      'Fine Decor'?: number;
      'Artvio'?: number;
      'Woodrica'?: number;
      'Artis'?: number;
    };
  };
  userId?: string; // To fetch targets if needed
}

export const DetailedStatsView: React.FC<DetailedStatsProps> = ({
  stats,
  attendanceDays,
  attendancePercentage,
  attendanceMarkedDates = {},
  selectedMonth = new Date(),
  targets = {},
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [showCalendar, setShowCalendar] = useState(false);

  const renderProgressBarWithTarget = (current: number, target: number | undefined, color: string) => {
    if (!target || target === 0) {
      // No target set, show simple bar (current as % of a reasonable max)
      const maxValue = Math.max(current * 2, 10);
      const percentage = (current / maxValue) * 100;
      return (
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(percentage, 75)}%`,
                  backgroundColor: color,
                },
              ]}
            />
          </View>
        </View>
      );
    }

    // Target is set - show bar with target line
    const TARGET_LINE_POSITION = 65; // Target line at 65% of bar
    const MAX_BAR_WIDTH = 75; // Bar never exceeds 75%
    const achievementPercentage = current === 0 ? 0 : (current / target) * 100;

    // Calculate bar width: scales with achievement but never exceeds MAX_BAR_WIDTH
    const barWidth = current === 0 ? 0 : Math.min((achievementPercentage / 100) * TARGET_LINE_POSITION, MAX_BAR_WIDTH);

    // Determine color based on achievement
    const isAboveTarget = current >= target;
    const isNearTarget = achievementPercentage >= 80 && achievementPercentage < 100;

    return (
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          {/* Progress Bar */}
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${barWidth}%`,
                backgroundColor: color,
              },
            ]}
          />
          {/* Target Line - Red */}
          <View
            style={[
              styles.targetLineRed,
              {
                left: `${TARGET_LINE_POSITION}%`,
              },
            ]}
          />
        </View>
        {/* Achievement Percentage with color coding */}
        <Text
          style={[
            styles.achievementText,
            isAboveTarget && styles.achievementTextSuccess,
            isNearTarget && styles.achievementTextWarning,
          ]}
        >
          {Math.round(achievementPercentage)}%
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tab Carousel - Summary Metrics */}
      <View style={styles.summaryBar}>
        <TouchableOpacity
          style={[
            styles.summaryMetric,
            activeTab === 'attendance' && styles.summaryMetricActive,
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
          <Text
            style={[
              styles.summaryLabel,
              activeTab === 'attendance' && { color: '#fff', opacity: 0.9 }
            ]}
            numberOfLines={1}
          >
            Attendance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.summaryMetric,
            activeTab === 'visits' && styles.summaryMetricActive,
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
          <Text
            style={[
              styles.summaryLabel,
              activeTab === 'visits' && { color: '#fff', opacity: 0.9 }
            ]}
            numberOfLines={1}
          >
            Visits
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.summaryMetric,
            activeTab === 'sales' && styles.summaryMetricActive,
            activeTab === 'sales' && { backgroundColor: colors.success },
          ]}
          onPress={() => setActiveTab('sales')}
        >
          <Text style={[
            styles.summaryValue,
            { color: activeTab === 'sales' ? '#fff' : colors.success },
            { fontSize: stats.sheets.total > 9999 ? 16 : 18 }
          ]}>
            {stats.sheets.total.toLocaleString('en-IN')}
          </Text>
          <Text
            style={[
              styles.summaryLabel,
              activeTab === 'sales' && { color: '#fff', opacity: 0.9 }
            ]}
            numberOfLines={1}
          >
            Sheets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.summaryMetric,
            activeTab === 'expenses' && styles.summaryMetricActive,
            activeTab === 'expenses' && { backgroundColor: colors.warning },
          ]}
          onPress={() => setActiveTab('expenses')}
        >
          <Text style={[
            styles.summaryValue,
            { color: activeTab === 'expenses' ? '#fff' : colors.warning }
          ]}>
            {stats.expenses.total === 0
              ? '₹0'
              : stats.expenses.total >= 1000
                ? `₹${(stats.expenses.total / 1000).toFixed(1)}k`
                : `₹${stats.expenses.total}`
            }
          </Text>
          <Text
            style={[
              styles.summaryLabel,
              activeTab === 'expenses' && { color: '#fff', opacity: 0.9 }
            ]}
            numberOfLines={1}
          >
            Expenses
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <View>
            <Text style={styles.tabContentTitle}>ATTENDANCE BREAKDOWN</Text>
            <View style={styles.progressSection}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${attendancePercentage}%`,
                      backgroundColor: colors.accent,
                    },
                  ]}
                />
              </View>
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
            <View style={styles.breakdownHeader}>
              <Text style={styles.tabContentTitle}>VISITS BREAKDOWN</Text>
              <Text style={styles.targetBadge}>TARGET</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Visits:</Text>
              <Text style={[styles.detailValue, styles.detailValueLarge]}>{stats.visits.total}</Text>
            </View>
            <View style={styles.categorySection}>
              <View style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryDot, { backgroundColor: colors.info }]} />
                    <Text style={styles.categoryLabel}>Distributor</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryValue}>{stats.visits.byType.distributor}</Text>
                    {targets?.visitsByType?.distributor && (
                      <Text style={styles.categoryTargetRed}>/ {targets.visitsByType.distributor}</Text>
                    )}
                  </View>
                </View>
                {renderProgressBarWithTarget(
                  stats.visits.byType.distributor,
                  targets?.visitsByType?.distributor,
                  colors.info
                )}
              </View>

              <View style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryDot, { backgroundColor: colors.success }]} />
                    <Text style={styles.categoryLabel}>Dealer</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryValue}>{stats.visits.byType.dealer}</Text>
                    {targets?.visitsByType?.dealer && (
                      <Text style={styles.categoryTargetRed}>/ {targets.visitsByType.dealer}</Text>
                    )}
                  </View>
                </View>
                {renderProgressBarWithTarget(
                  stats.visits.byType.dealer,
                  targets?.visitsByType?.dealer,
                  colors.success
                )}
              </View>

              <View style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryDot, { backgroundColor: colors.accent }]} />
                    <Text style={styles.categoryLabel}>Architect</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryValue}>{stats.visits.byType.architect}</Text>
                    {targets?.visitsByType?.architect && (
                      <Text style={styles.categoryTargetRed}>/ {targets.visitsByType.architect}</Text>
                    )}
                  </View>
                </View>
                {renderProgressBarWithTarget(
                  stats.visits.byType.architect,
                  targets?.visitsByType?.architect,
                  colors.accent
                )}
              </View>

              <View style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryDot, { backgroundColor: colors.warning }]} />
                    <Text style={styles.categoryLabel}>Contractor</Text>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text style={styles.categoryValue}>{stats.visits.byType.contractor}</Text>
                    {targets?.visitsByType?.contractor && (
                      <Text style={styles.categoryTargetRed}>/ {targets.visitsByType.contractor}</Text>
                    )}
                  </View>
                </View>
                {renderProgressBarWithTarget(
                  stats.visits.byType.contractor,
                  targets?.visitsByType?.contractor,
                  colors.warning
                )}
              </View>
            </View>
          </View>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <View>
            <View style={styles.breakdownHeader}>
              <Text style={styles.tabContentTitle}>SALES BREAKDOWN</Text>
              <Text style={styles.targetBadge}>TARGET</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Sheets:</Text>
              <Text style={[styles.detailValue, styles.detailValueLarge]}>{stats.sheets.total.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.categorySection}>
              {Object.entries(stats.sheets.byCatalog).map(([catalog, count], index) => {
                const colorMap = [colors.success, colors.info, colors.accent, colors.warning];
                const color = colorMap[index % colorMap.length];
                const catalogTarget = targets?.sheetsByCatalog?.[catalog as keyof typeof targets.sheetsByCatalog];
                return (
                  <View key={catalog} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: color }]} />
                        <Text style={styles.categoryLabel}>{getCatalogDisplayName(catalog)}</Text>
                      </View>
                      <View style={styles.categoryRight}>
                        <Text style={styles.categoryValue}>{count.toLocaleString('en-IN')}</Text>
                        {catalogTarget && (
                          <Text style={styles.categoryTargetRed}>/ {catalogTarget.toLocaleString('en-IN')}</Text>
                        )}
                      </View>
                    </View>
                    {renderProgressBarWithTarget(count, catalogTarget, color)}
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
                      <Text style={styles.categoryValue}>
                        ₹{amount.toLocaleString('en-IN')} ({percentage}%)
                      </Text>
                    </View>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* Permanent Calendar Section - Only show for Attendance tab */}
      {activeTab === 'attendance' && (
        <View style={styles.calendarSection}>
          <Text style={styles.calendarSectionTitle}>
            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <Text style={styles.calendarSubtitle}>
            {attendanceDays.present} days present
          </Text>
          <CalendarComponent
            current={selectedMonth.toISOString().substring(0, 10)}
            markedDates={attendanceMarkedDates}
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
        </View>
      )}

      {/* Attendance Calendar Modal */}
      <Modal visible={showCalendar} transparent animationType="slide" onRequestClose={() => setShowCalendar(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Attendance - {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {attendanceDays.present} days present • Green = present
            </Text>

            <CalendarComponent
              current={selectedMonth.toISOString().substring(0, 10)}
              markedDates={attendanceMarkedDates}
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
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  // Tab Carousel
  summaryBar: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  summaryMetric: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryMetricActive: {
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    transform: [{ scale: 1.02 }],
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.text.secondary,
    textAlign: 'center',
    letterSpacing: 0.2,
    numberOfLines: 1,
  },
  // Tab Content
  tabContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabContentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  breakdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  targetBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  calendarButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
    minWidth: 50,
    textAlign: 'right',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  detailValueLarge: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
  },
  // Target Section
  targetSection: {
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  targetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  targetProgressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  targetFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetPercentage: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.secondary,
    textAlign: 'right',
  },
  categorySection: {
    marginTop: 8,
    gap: 16,
  },
  categoryItem: {
    gap: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  categoryTarget: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  categoryTargetRed: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  progressBarContainer: {
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    position: 'relative',
  },
  progressBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: 4,
  },
  targetLine: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: '#393735',
    borderRadius: 1,
    zIndex: 10,
  },
  targetLineRed: {
    position: 'absolute',
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: '#DC2626',
    borderRadius: 1,
    zIndex: 10,
  },
  achievementText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.secondary,
    minWidth: 45,
    textAlign: 'right',
  },
  achievementTextSuccess: {
    color: colors.success,
  },
  achievementTextWarning: {
    color: colors.warning,
  },
  // Permanent Calendar Section
  calendarSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  calendarSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  calendarSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 16,
  },
  // Calendar Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalClose: {
    fontSize: 28,
    color: '#666',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalCloseButton: {
    backgroundColor: '#393735',
    padding: 14,
    borderRadius: 12,
    marginTop: 16,
  },
  modalCloseButtonText: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
