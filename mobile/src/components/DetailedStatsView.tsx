/**
 * DetailedStatsView - Reusable component for detailed user statistics
 * Shows visits, sales (sheets), and expenses breakdown with tab navigation
 * Includes pending logs inline and top visited accounts
 * Used in both sales rep's StatsScreen and manager's UserDetailScreen
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, FileText, IndianRupee, Building2, Clock } from 'lucide-react-native';
import { colors, spacing, featureColors } from '../theme';
import { getCatalogDisplayName } from '../types';
import { KpiCard } from '../patterns';

// Helper to format relative time
const formatRelativeTime = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = typeof timestamp === 'string' ? new Date(timestamp) : (timestamp.toDate?.() || new Date(timestamp));
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  return `${diffDays}d`;
};

type TabType = 'visits' | 'sales' | 'expenses';

interface DetailedStatsProps {
  stats: {
    attendance?: {
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
      records?: any[]; // For top visited accounts
    };
    sheets: {
      total: number;
      byCatalog: {
        'Fine Decor': number;
        'Artvio': number;
        'Woodrica': number;
        'Artis 1MM': number;
      };
      pendingRecords?: any[]; // Pending sheets from API
    };
    expenses: {
      total: number;
      byCategory: {
        travel: number;
        food: number;
        accommodation: number;
        other: number;
      };
      pendingRecords?: any[]; // Pending expenses from API
    };
  };
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
  userId?: string;
}

export const DetailedStatsView: React.FC<DetailedStatsProps> = ({
  stats,
  targets = {},
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('visits');

  // Calculate top visited accounts (group by accountName since API doesn't return accountId)
  const topVisitedAccounts = useMemo(() => {
    if (!stats.visits?.records || stats.visits.records.length === 0) return [];

    // Group by accountName and count
    const accountCounts: Record<string, { name: string; count: number; type: string }> = {};
    stats.visits.records.forEach((visit: any) => {
      const name = visit.accountName;
      if (!name) return;
      if (!accountCounts[name]) {
        accountCounts[name] = {
          name: name,
          count: 0,
          type: visit.accountType || 'dealer',
        };
      }
      accountCounts[name].count++;
    });

    // Sort by count and take top 5
    return Object.entries(accountCounts)
      .map(([name, data]) => ({ id: name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [stats.visits?.records]);

  // Calculate pending sheets total and records
  const pendingSheets = useMemo(() => {
    const records = stats.sheets?.pendingRecords || [];
    const total = records.reduce((sum: number, r: any) => sum + (r.sheetsCount || 0), 0);
    return { records: records.slice(0, 5), total, count: records.length };
  }, [stats.sheets?.pendingRecords]);

  // Calculate pending expenses total and records
  const pendingExpenses = useMemo(() => {
    const records = stats.expenses?.pendingRecords || [];
    const total = records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
    return { records: records.slice(0, 5), total, count: records.length };
  }, [stats.expenses?.pendingRecords]);

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
      {/* KPI Cards - Matches HomeScreen style exactly */}
      <View style={styles.kpiRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('visits')}
          style={{
            flex: 1,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: activeTab === 'visits' ? featureColors.visits.primary : 'transparent',
          }}
        >
          <KpiCard
            title="Visits"
            value={stats.visits.total.toString()}
            icon={<MapPin size={20} color={featureColors.visits.primary} />}
          />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('sales')}
          style={{
            flex: 1,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: activeTab === 'sales' ? featureColors.sheets.primary : 'transparent',
          }}
        >
          <KpiCard
            title="Sheets"
            value={stats.sheets.total.toLocaleString('en-IN')}
            icon={<FileText size={20} color={featureColors.sheets.primary} />}
          />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setActiveTab('expenses')}
          style={{
            flex: 1,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: activeTab === 'expenses' ? featureColors.expenses.primary : 'transparent',
          }}
        >
          <KpiCard
            title="Expenses"
            value={
              stats.expenses.total === 0
                ? '0'
                : stats.expenses.total >= 1000
                  ? `${(stats.expenses.total / 1000).toFixed(1)}k`
                  : stats.expenses.total.toString()
            }
            icon={<IndianRupee size={20} color={featureColors.expenses.primary} />}
          />
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
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

            {/* Top Visited Accounts */}
            {topVisitedAccounts.length > 0 && (
              <View style={styles.pendingSection}>
                <Text style={styles.pendingSectionTitle}>TOP VISITED ACCOUNTS</Text>
                {topVisitedAccounts.map((account, index) => (
                  <View key={account.id} style={styles.activityCard}>
                    <Building2 size={20} color={colors.info} />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityValue} numberOfLines={1}>
                        {account.name}
                      </Text>
                      <Text style={styles.activityMeta}>
                        {account.type} • {account.count} {account.count === 1 ? 'visit' : 'visits'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
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

            {/* Pending Sheets Section */}
            {pendingSheets.count > 0 && (
              <View style={styles.pendingSection}>
                <View style={styles.pendingHeader}>
                  <Text style={styles.pendingSectionTitle}>
                    PENDING VERIFICATION
                  </Text>
                  <Text style={styles.pendingTotal}>
                    {pendingSheets.total.toLocaleString('en-IN')} sheets
                  </Text>
                </View>
                {pendingSheets.records.map((sheet: any, index: number) => (
                  <View key={sheet.id || index} style={styles.activityCard}>
                    <FileText size={20} color={featureColors.sheets.primary} />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityValue}>
                        {(sheet.sheetsCount || 0).toLocaleString('en-IN')} • {getCatalogDisplayName(sheet.catalog || 'Unknown')}
                      </Text>
                      <Text style={styles.activityMeta}>
                        {sheet.date || 'No date'} • {formatRelativeTime(sheet.createdAt)}
                      </Text>
                    </View>
                    <Clock size={16} color="#F9A825" />
                  </View>
                ))}
                {pendingSheets.count > 5 && (
                  <Text style={styles.moreText}>+{pendingSheets.count - 5} more pending</Text>
                )}
              </View>
            )}

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

            {/* Pending Expenses Section */}
            {pendingExpenses.count > 0 && (
              <View style={styles.pendingSection}>
                <View style={styles.pendingHeader}>
                  <Text style={styles.pendingSectionTitle}>
                    PENDING APPROVAL
                  </Text>
                  <Text style={styles.pendingTotal}>
                    ₹{pendingExpenses.total.toLocaleString('en-IN')}
                  </Text>
                </View>
                {pendingExpenses.records.map((expense: any, index: number) => (
                  <View key={expense.id || index} style={styles.activityCard}>
                    <IndianRupee size={20} color={featureColors.expenses.primary} />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityValue}>
                        ₹{(expense.amount || 0).toLocaleString('en-IN')} • {expense.category || 'Other'}
                      </Text>
                      <Text style={styles.activityMeta}>
                        {expense.date || 'No date'} • {formatRelativeTime(expense.createdAt)}
                      </Text>
                    </View>
                    <Clock size={16} color="#F9A825" />
                  </View>
                ))}
                {pendingExpenses.count > 5 && (
                  <Text style={styles.moreText}>+{pendingExpenses.count - 5} more pending</Text>
                )}
              </View>
            )}

          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  // KPI Row - Matches HomeScreen exactly
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
  // Pending/Activity Sections
  pendingSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pendingSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    letterSpacing: 0.5,
  },
  pendingTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F9A825',
  },
  moreText: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 4,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    marginBottom: 8,
  },
  activityContent: {
    flex: 1,
  },
  activityValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  activityMeta: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
  },
});
