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
  Clock,
  Building2,
  FileBarChart,
  AlertCircle,
  UserPlus,
  ClipboardList,
  ChevronRight,
  User,
  ChevronDown,
} from 'lucide-react-native';
import { Logo } from '../../components/ui';
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

type DateRange = 'today' | 'week' | 'month';

export const ManagerHomeScreen: React.FC<ManagerHomeScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  const [userName, setUserName] = useState<string>('');
  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

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
        range: dateRange
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

  const toggleDateRange = () => {
    const nextRange: Record<DateRange, DateRange> = {
      today: 'week',
      week: 'month',
      month: 'today',
    };
    setDateRange(nextRange[dateRange]);
  };

  const getDateRangeLabel = (): string => {
    const today = new Date();
    switch (dateRange) {
      case 'today':
        return today.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'week':
        return 'This Week';
      case 'month':
        return today.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        });
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
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
            <User size={22} color="#fff" />
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
        {/* Date Range Selector */}
        <TouchableOpacity style={styles.dateCard} onPress={toggleDateRange}>
          <Clock size={18} color={colors.accent} />
          <Text style={styles.dateText}>{getDateRangeLabel()}</Text>
          <ChevronDown size={18} color={colors.text.tertiary} />
        </TouchableOpacity>

        {/* Add User Card */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('AddUser')}
        >
          <View style={styles.actionCardLeft}>
            <View style={styles.actionIconContainer}>
              <UserPlus size={22} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.actionCardTitle}>Add New User</Text>
              <Text style={styles.actionCardSubtitle}>Create account for sales rep or manager</Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.text.tertiary} />
        </TouchableOpacity>

        {stats && (
          <>
            {/* Team Attendance Card */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Users size={24} color={colors.accent} />
                <Text style={styles.statCardTitle}>Team Attendance</Text>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.team.present}</Text>
                  <Text style={styles.statLabel}>Present</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.error }]}>
                    {stats.team.absent}
                  </Text>
                  <Text style={styles.statLabel}>Absent</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.success }]}>
                    {stats.team.presentPercentage}%
                  </Text>
                  <Text style={styles.statLabel}>Attendance</Text>
                </View>
              </View>
            </View>

            {/* Visits Card */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Building2 size={24} color="#2196F3" />
                <Text style={styles.statCardTitle}>
                  Visits {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : 'This Month'}
                </Text>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#2196F3' }]}>
                    {stats.visits.total}
                  </Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItemSmall}>
                  <Text style={styles.statValueSmall}>{stats.visits.distributor}</Text>
                  <Text style={styles.statLabelSmall}>Distributors</Text>
                </View>
                <View style={styles.statItemSmall}>
                  <Text style={styles.statValueSmall}>{stats.visits.dealer}</Text>
                  <Text style={styles.statLabelSmall}>Dealers</Text>
                </View>
                <View style={styles.statItemSmall}>
                  <Text style={styles.statValueSmall}>{stats.visits.architect}</Text>
                  <Text style={styles.statLabelSmall}>Architects</Text>
                </View>
              </View>
            </View>

            {/* Sheets Sales Card */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <FileBarChart size={24} color="#4CAF50" />
                <Text style={styles.statCardTitle}>
                  Sheets Sold {dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : 'This Month'}
                </Text>
              </View>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                    {stats.sheets.total}
                  </Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>
              <View style={styles.catalogGrid}>
                {Object.entries(stats.sheets.byCatalog).map(([catalog, count]) => (
                  <View key={catalog} style={styles.catalogItem}>
                    <Text style={styles.catalogValue}>{count}</Text>
                    <Text style={styles.catalogLabel}>{catalog}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Pending Approvals Card */}
            <View style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <AlertCircle size={24} color="#FF9800" />
                <Text style={styles.statCardTitle}>Pending Approvals</Text>
              </View>
              <TouchableOpacity
                style={styles.pendingItem}
                onPress={() => navigation.navigate('DSRApprovalList')}
              >
                <View style={styles.pendingItemLeft}>
                  <ClipboardList size={20} color={colors.accent} />
                  <Text style={styles.pendingItemText}>DSR Reports</Text>
                </View>
                <View style={styles.pendingItemRight}>
                  <Text style={styles.pendingBadge}>{stats.pending.dsrs}</Text>
                  <ChevronRight size={20} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            </View>
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
    paddingTop: 60,
    paddingBottom: spacing.xl,
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
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
    marginBottom: spacing.xs / 4,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  dateText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.md,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 4,
  },
  actionCardSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statCardTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
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
});
