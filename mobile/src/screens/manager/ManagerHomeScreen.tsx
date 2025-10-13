import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { colors, spacing, typography } from '../../theme';
import {
  Users,
  Building2,
  FileBarChart,
  AlertCircle,
  UserPlus,
  ChevronRight,
  User,
  ChevronDown,
  ChevronUp,
  Target,
} from 'lucide-react-native';
import { Logo } from '../../components/ui';
import type { DateRangeOption } from '../../components/DateRangeModal';
import { api } from '../../services/api';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';

interface ManagerHomeScreenProps {
  navigation: any;
}

interface TeamStats {
  team: {
    total: number;
    present: number;
    absent: number;
    presentPercentage: number;
  };
  visits: {
    total: number;
    distributor: number;
    dealer: number;
    architect: number;
  };
  sheets: {
    total: number;
    byCatalog: {
      'Fine Decor': number;
      Artvio: number;
      Woodrica: number;
      Artis: number;
    };
  };
  pending: {
    dsrs: number;
    expenses: number;
  };
}

export const ManagerHomeScreen: React.FC<ManagerHomeScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  const [userName, setUserName] = useState<string>('');
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeOption>('today');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [expandedStat, setExpandedStat] = useState<string | null>(null);

  useEffect(() => {
    loadUserName();
    loadStats();
  }, [dateRange]);

  const loadUserName = async () => {
    if (user?.uid) {
      try {
        const db = getFirestore();
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData?.name || 'Manager');
        }
      } catch (error) {
        console.error('Error loading user name:', error);
        setUserName('Manager');
      }
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await api.getTeamStats({
        date: currentDate,
        range: dateRange === 'today' ? undefined : dateRange
      });
      console.log('[ManagerHome] Stats loaded:', response);
      if (response.ok && response.stats) {
        setStats(response.stats);
      }
    } catch (error: any) {
      console.error('[ManagerHome] Error loading stats:', error);
      Alert.alert('Error', 'Failed to load team statistics');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    loadStats();
  };

  const handleDateRangeChange = (range: DateRangeOption) => {
    setDateRange(range);
  };

  const getDateRangeLabel = (): string => {
    const today = new Date();
    switch (dateRange) {
      case 'today':
        return today.toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      case 'week':
        return 'This Week';
      case 'month':
        return today.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        });
    }
  };


  return (
    <View style={styles.container}>
      {/* Header matching sales rep style */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Logo variant="trans-artis" size="large" style={styles.logo} />
            <View style={styles.headerText}>
              <Text style={styles.title}>Manager Dashboard</Text>
              <Text style={styles.subtitle}>Welcome {userName}!</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <User size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[colors.accent]} />
        }
      >
        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          {/* View Team Button - Primary (70%) */}
          <TouchableOpacity
            style={styles.viewTeamButton}
            onPress={() => navigation.navigate('UserList')}
          >
            <Users size={24} color="#fff" />
            <Text style={styles.viewTeamButtonText}>View Team</Text>
            <ChevronRight size={22} color="#fff" />
          </TouchableOpacity>

          {/* Add User Button - Secondary (30%) */}
          <TouchableOpacity
            style={styles.addUserButton}
            onPress={() => navigation.navigate('AddUser')}
          >
            <UserPlus size={28} color={colors.info} />
          </TouchableOpacity>
        </View>

        {/* Manage Accounts Button */}
        <TouchableOpacity
          style={styles.manageAccountsButton}
          onPress={() => navigation.navigate('AccountsList')}
        >
          <Building2 size={24} color={colors.accent} />
          <Text style={styles.manageAccountsButtonText}>Manage Accounts</Text>
          <ChevronRight size={22} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Team Targets Button */}
        <TouchableOpacity
          style={styles.teamTargetsButton}
          onPress={() => navigation.navigate('TeamTargets')}
        >
          <Target size={24} color={colors.success} />
          <Text style={styles.teamTargetsButtonText}>Team Targets</Text>
          <ChevronRight size={22} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Team Stats Section Header with Date */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>TEAM STATS</Text>
          <TouchableOpacity onPress={() => setDateModalVisible(true)} style={styles.dateButton}>
            <View style={styles.dateTextContainer}>
              <Text style={styles.dateText}>{getDateRangeLabel()}</Text>
            </View>
            <ChevronDown size={16} color="#9E9E9E" />
          </TouchableOpacity>
        </View>

        {/* Simple Date Range Dropdown */}
        {dateModalVisible && (
          <>
            <TouchableOpacity
              style={styles.dropdownBackdrop}
              activeOpacity={1}
              onPress={() => setDateModalVisible(false)}
            />
            <View style={styles.dropdown}>
              <TouchableOpacity
                style={[styles.dropdownItem, dateRange === 'today' && styles.dropdownItemActive]}
                onPress={() => {
                  handleDateRangeChange('today');
                  setDateModalVisible(false);
                }}
              >
                <Text style={[styles.dropdownItemText, dateRange === 'today' && styles.dropdownItemTextActive]}>
                  Today
                </Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={[styles.dropdownItem, dateRange === 'week' && styles.dropdownItemActive]}
                onPress={() => {
                  handleDateRangeChange('week');
                  setDateModalVisible(false);
                }}
              >
                <Text style={[styles.dropdownItemText, dateRange === 'week' && styles.dropdownItemTextActive]}>
                  This Week
                </Text>
              </TouchableOpacity>
              <View style={styles.dropdownDivider} />
              <TouchableOpacity
                style={[styles.dropdownItem, dateRange === 'month' && styles.dropdownItemActive]}
                onPress={() => {
                  handleDateRangeChange('month');
                  setDateModalVisible(false);
                }}
              >
                <Text style={[styles.dropdownItemText, dateRange === 'month' && styles.dropdownItemTextActive]}>
                  This Month
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {stats && (
          <>
            {/* Attendance Stat Bar */}
            <TouchableOpacity
              style={styles.thinStatBar}
              onPress={() => setExpandedStat(expandedStat === 'attendance' ? null : 'attendance')}
            >
              <View style={styles.thinStatBarHeader}>
                <Users size={28} color={colors.accent} />
                <Text style={styles.thinStatBarTitle}>Attendance:</Text>
                <Text style={styles.thinStatBarValue}>{stats.team.presentPercentage}%</Text>
                {expandedStat === 'attendance' ? (
                  <ChevronUp size={22} color={colors.text.tertiary} />
                ) : (
                  <ChevronDown size={22} color={colors.text.tertiary} />
                )}
              </View>
              {expandedStat === 'attendance' && (
                <View style={styles.thinStatBarExpanded}>
                  <View style={styles.progressBarContainer}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${stats.team.presentPercentage}%`, backgroundColor: colors.accent }
                      ]}
                    />
                  </View>
                  <View style={styles.expandedStatsRow}>
                    <View style={styles.expandedStatItem}>
                      <Text style={styles.expandedStatValue}>{stats.team.present}</Text>
                      <Text style={styles.expandedStatLabel}>Present</Text>
                    </View>
                    <View style={styles.expandedStatItem}>
                      <Text style={[styles.expandedStatValue, { color: colors.error }]}>{stats.team.absent}</Text>
                      <Text style={styles.expandedStatLabel}>Absent</Text>
                    </View>
                    <View style={styles.expandedStatItem}>
                      <Text style={styles.expandedStatValue}>{stats.team.total}</Text>
                      <Text style={styles.expandedStatLabel}>Total</Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Visits Stat Bar */}
            <TouchableOpacity
              style={styles.thinStatBar}
              onPress={() => setExpandedStat(expandedStat === 'visits' ? null : 'visits')}
            >
              <View style={styles.thinStatBarHeader}>
                <Building2 size={28} color={colors.info} />
                <Text style={styles.thinStatBarTitle}>Total Visits:</Text>
                <Text style={styles.thinStatBarValue}>{stats.visits.total}</Text>
                {expandedStat === 'visits' ? (
                  <ChevronUp size={22} color={colors.text.tertiary} />
                ) : (
                  <ChevronDown size={22} color={colors.text.tertiary} />
                )}
              </View>
              {expandedStat === 'visits' && (
                <View style={styles.thinStatBarExpanded}>
                  <View style={styles.expandedStatsRow}>
                    <View style={styles.expandedStatItem}>
                      <Text style={styles.expandedStatValue}>{stats.visits.distributor}</Text>
                      <Text style={styles.expandedStatLabel}>Distributors</Text>
                    </View>
                    <View style={styles.expandedStatItem}>
                      <Text style={styles.expandedStatValue}>{stats.visits.dealer}</Text>
                      <Text style={styles.expandedStatLabel}>Dealers</Text>
                    </View>
                    <View style={styles.expandedStatItem}>
                      <Text style={styles.expandedStatValue}>{stats.visits.architect}</Text>
                      <Text style={styles.expandedStatLabel}>Architects</Text>
                    </View>
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* Sheets Sold Stat Bar */}
            <TouchableOpacity
              style={styles.thinStatBar}
              onPress={() => setExpandedStat(expandedStat === 'sheets' ? null : 'sheets')}
            >
              <View style={styles.thinStatBarHeader}>
                <FileBarChart size={28} color={colors.success} />
                <Text style={styles.thinStatBarTitle}>Total Sheets Sold:</Text>
                <Text style={styles.thinStatBarValue}>{stats.sheets.total}</Text>
                {expandedStat === 'sheets' ? (
                  <ChevronUp size={22} color={colors.text.tertiary} />
                ) : (
                  <ChevronDown size={22} color={colors.text.tertiary} />
                )}
              </View>
              {expandedStat === 'sheets' && (
                <View style={styles.thinStatBarExpanded}>
                  <View style={styles.catalogGrid}>
                    {Object.entries(stats.sheets.byCatalog).map(([catalog, count]) => (
                      <View key={catalog} style={styles.catalogItem}>
                        <Text style={styles.catalogValue}>{count}</Text>
                        <Text style={styles.catalogLabel}>{catalog}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </TouchableOpacity>

            {/* DSR Approvals - Always Visible */}
            <TouchableOpacity
              style={[styles.thinStatBar, stats.pending.dsrs > 0 && styles.alertBar]}
              onPress={() => navigation.navigate('DSRApprovalList')}
            >
              <View style={styles.thinStatBarHeader}>
                <AlertCircle size={28} color={stats.pending.dsrs > 0 ? colors.warning : colors.text.secondary} />
                <Text style={styles.thinStatBarTitle}>DSR Reports:</Text>
                <Text style={[styles.thinStatBarValue, stats.pending.dsrs > 0 && { color: colors.warning }]}>
                  {stats.pending.dsrs} pending
                </Text>
                <ChevronRight size={22} color={colors.text.tertiary} />
              </View>
            </TouchableOpacity>
          </>
        )}

        {!stats && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Pull down to refresh</Text>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: 50,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flex: 1,
  },
  logo: {},
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.inverse,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.inverse,
    opacity: 0.9,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  actionCardSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeaderText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateTextContainer: {
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    borderStyle: 'dotted',
    paddingBottom: 2,
  },
  dateText: {
    fontSize: typography.fontSize.lg,
    color: '#9E9E9E',
    fontWeight: typography.fontWeight.bold,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statItemSmall: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
    marginBottom: spacing.xs / 2,
  },
  statValueSmall: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  statLabelSmall: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  catalogItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
  },
  catalogValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: '#4CAF50',
    marginBottom: spacing.xs / 2,
  },
  catalogLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  pendingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  pendingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingItemText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  pendingItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pendingBadge: {
    backgroundColor: colors.accent,
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.borderRadius.full,
    minWidth: 28,
    textAlign: 'center',
  },
  pendingDivider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
  },
  attendanceContent: {
    gap: spacing.sm,
  },
  attendanceStats: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  attendanceMainValue: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  attendanceMainLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: colors.accent + '20',
    borderRadius: spacing.borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: spacing.borderRadius.full,
  },
  progressLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  compactStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  compactStatValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  compactStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  compactStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.default,
  },
  alertCard: {
    backgroundColor: colors.warning + '08',
    borderColor: colors.warning + '30',
    borderWidth: 1,
  },
  alertCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.warning + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertCardContent: {
    flex: 1,
  },
  alertCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  alertCardSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  // Action Buttons Row
  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  viewTeamButton: {
    flex: 7,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  viewTeamButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
  },
  addUserButton: {
    flex: 3,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  // Stat Bars
  thinStatBar: {
    backgroundColor: '#fff',
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.xs,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  thinStatBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  thinStatBarTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    marginRight: 'auto',
  },
  thinStatBarValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  thinStatBarExpanded: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  expandedStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.sm,
  },
  expandedStatItem: {
    alignItems: 'center',
  },
  expandedStatValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  expandedStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  alertBar: {
    backgroundColor: colors.warning + '08',
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  // Dropdown styles
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  dropdown: {
    position: 'absolute',
    top: 180,
    right: spacing.screenPadding,
    backgroundColor: '#fff',
    borderRadius: spacing.borderRadius.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    minWidth: 140,
  },
  dropdownItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownItemActive: {
    backgroundColor: colors.accent + '15',
  },
  dropdownItemText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  dropdownItemTextActive: {
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border.default,
  },
  // Manage Accounts Button
  manageAccountsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  manageAccountsButtonText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginLeft: spacing.md,
  },
  // Team Targets Button
  teamTargetsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  teamTargetsButtonText: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginLeft: spacing.md,
  },
});
