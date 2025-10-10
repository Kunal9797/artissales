import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Clock, Building2, BarChart3, Wallet, Phone } from 'lucide-react-native';
import { useDSR } from '../../hooks/useDSR';
import { useTodayStats } from '../../hooks/useTodayStats';
import { colors, spacing, typography, shadows } from '../../theme';

interface DSRScreenProps {
  navigation: any;
}

export const DSRScreen: React.FC<DSRScreenProps> = ({ navigation }) => {
  const today = new Date().toISOString().split('T')[0];
  const { report, loading } = useDSR(today);
  const { stats, loading: statsLoading } = useTodayStats();

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return 'Not recorded';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'approved':
        return '#4CAF50';
      case 'needs_revision':
        return '#FF9800';
      default:
        return '#FFC107';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'needs_revision':
        return 'Needs Revision';
      default:
        return 'Pending Review';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading today's report...</Text>
      </View>
    );
  }

  if (!report) {
    // Show real-time "Today So Far" stats
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Today So Far</Text>
          <Text style={styles.subtitle}>{new Date().toLocaleDateString()}</Text>
          <View style={styles.liveIndicatorContainer}>
            <View style={styles.liveIndicatorDot} />
            <Text style={styles.liveIndicator}>Live Updates</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.infoBadge}>
            <Text style={styles.infoText}>
              Final report will be generated at 11:00 PM
            </Text>
          </View>
        </View>

        {/* Attendance */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Clock size={20} color={colors.accent} />
            <Text style={styles.sectionTitle}>Attendance</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>Check In:</Text>
              <Text style={styles.value}>{formatTime(stats.checkInAt)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Check Out:</Text>
              <Text style={styles.value}>{formatTime(stats.checkOutAt)}</Text>
            </View>
          </View>
        </View>

        {/* Visits */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Building2 size={20} color="#2196F3" />
            <Text style={styles.sectionTitle}>Visits</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statNumber}>{stats.visits.total}</Text>
              <Text style={styles.statLabel}>
                {stats.visits.total === 1 ? 'Visit' : 'Visits'}
              </Text>
            </View>
            {Object.keys(stats.visits.byType).length > 0 && (
              <>
                <View style={styles.divider} />
                {Object.entries(stats.visits.byType).map(([type, count]) => (
                  <View key={type} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}s
                    </Text>
                    <Text style={styles.detailValue}>{count}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </View>

        {/* Sheets Sales */}
        {stats.sheetsSales.total > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <BarChart3 size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Sheets Sold</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.statRow}>
                <Text style={styles.statNumber}>{stats.sheetsSales.total}</Text>
                <Text style={styles.statLabel}>Total Sheets</Text>
              </View>
              <View style={styles.divider} />
              {Object.entries(stats.sheetsSales.byCatalog).map(([catalog, count]) => (
                <View key={catalog} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{catalog}</Text>
                  <Text style={styles.detailValue}>{count} sheets</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Expenses */}
        {stats.expenses.total > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <Wallet size={20} color="#FF9800" />
              <Text style={styles.sectionTitle}>Expenses</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.statRow}>
                <Text style={styles.statNumber}>₹{stats.expenses.total}</Text>
                <Text style={styles.statLabel}>Total Expenses</Text>
              </View>
              <View style={styles.divider} />
              {Object.entries(stats.expenses.byCategory).map(([category, amount]) => (
                <View key={category} style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                  <Text style={styles.detailValue}>₹{amount}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Daily Sales Report</Text>
        <Text style={styles.subtitle}>{new Date(report.date).toLocaleDateString()}</Text>
      </View>

      {/* Status Badge */}
      <View style={styles.section}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(report.status) },
          ]}
        >
          <Text style={styles.statusText}>{getStatusLabel(report.status)}</Text>
        </View>
        {report.managerComments && (
          <View style={styles.commentsCard}>
            <Text style={styles.commentsLabel}>Manager Comments:</Text>
            <Text style={styles.commentsText}>{report.managerComments}</Text>
          </View>
        )}
      </View>

      {/* Attendance */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Clock size={20} color={colors.accent} />
          <Text style={styles.sectionTitle}>Attendance</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Check In:</Text>
            <Text style={styles.value}>{formatTime(report.checkInAt)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Check Out:</Text>
            <Text style={styles.value}>{formatTime(report.checkOutAt)}</Text>
          </View>
        </View>
      </View>

      {/* Visits */}
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <Building2 size={20} color="#2196F3" />
          <Text style={styles.sectionTitle}>Visits</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.statNumber}>{report.totalVisits}</Text>
            <Text style={styles.statLabel}>
              {report.totalVisits === 1 ? 'Visit' : 'Visits'} Completed
            </Text>
          </View>
        </View>
      </View>

      {/* Sheets Sales */}
      {report.sheetsSales && report.sheetsSales.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <BarChart3 size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Sheets Sold</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statNumber}>{report.totalSheetsSold}</Text>
              <Text style={styles.statLabel}>Total Sheets</Text>
            </View>
            <View style={styles.divider} />
            {report.sheetsSales.map((sale, index) => (
              <View key={index} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{sale.catalog}</Text>
                <Text style={styles.detailValue}>{sale.totalSheets} sheets</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Expenses */}
      {report.expenses && report.expenses.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Wallet size={20} color="#FF9800" />
            <Text style={styles.sectionTitle}>Expenses</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statNumber}>₹{report.totalExpenses}</Text>
              <Text style={styles.statLabel}>Total Expenses</Text>
            </View>
            <View style={styles.divider} />
            {report.expenses.map((expense, index) => (
              <View key={index} style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {expense.category.charAt(0).toUpperCase() +
                    expense.category.slice(1)}
                </Text>
                <Text style={styles.detailValue}>₹{expense.totalAmount}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Leads */}
      {report.leadsContacted > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Phone size={20} color="#9C27B0" />
            <Text style={styles.sectionTitle}>Leads</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statNumber}>{report.leadsContacted}</Text>
              <Text style={styles.statLabel}>
                {report.leadsContacted === 1 ? 'Lead' : 'Leads'} Contacted
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: '#fff',
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  liveIndicator: {
    fontSize: typography.fontSize.xs,
    color: colors.accent,
    fontWeight: '600',
  },
  infoBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: spacing.borderRadius.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: '#1976D2',
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyHint: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadge: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
  commentsCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginTop: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  commentsLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  commentsText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  value: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 15,
    color: colors.text.secondary,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
