/**
 * ManagerHomeScreen - Redesigned with DS v0.1
 *
 * Modern manager dashboard with:
 * - Minimal greeting bar
 * - 4 KPI cards (Team present, Pending, Visits, Sheets)
 * - Alerts section (SLA breaches, anomalies)
 * - Top performers mini-leaderboard
 * - Documents & Resources section
 */

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc } from '@react-native-firebase/firestore';
import { Card, Badge } from '../../components/ui';
import { KpiCard } from '../../patterns/KpiCard';
import { colors, spacing, typography, featureColors } from '../../theme';
import { getGreeting } from '../../utils/greeting';
import {
  Users,
  Bell,
  ChevronRight,
  CheckCircle,
  Sun,
  Moon,
  Sunrise,
  MapPin,
  FileText,
  AlertTriangle,
  Folder,
} from 'lucide-react-native';
import { api } from '../../services/api';

interface ManagerHomeScreenProps {
  navigation: any;
}

export const ManagerHomeScreen: React.FC<ManagerHomeScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Team stats
  const [teamStats, setTeamStats] = useState({
    present: 0,
    total: 0,
    pendingApprovals: 0,
    todayVisits: 0,
    todaySheets: 0,
  });

  // Alerts
  const [alerts, setAlerts] = useState<Array<{ id: string; text: string; type: 'warning' | 'error' }>>([]);

  // Top performers
  const [topPerformers, setTopPerformers] = useState<Array<{ id: string; name: string; visits: number }>>([]);

  // Fetch user name
  const fetchUserName = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const firestore = getFirestore();
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(userData?.name || 'Manager');
      }
    } catch (error) {
      logger.error('Error fetching user name:', error);
      setUserName('Manager');
    }
  }, [user?.uid]);

  // Fetch team stats
  const fetchTeamStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().substring(0, 10);
      const response = await api.getTeamStats({ date: today });

      if (response.ok && response.stats) {
        setTeamStats({
          present: response.stats.team?.present || 0,
          total: response.stats.team?.total || 0,
          pendingApprovals: (response.stats.pending?.dsrs || 0) + (response.stats.pending?.expenses || 0),
          todayVisits: response.stats.visits?.total || 0,
          todaySheets: response.stats.sheets?.total || 0,
        });

        // Generate alerts based on stats
        const newAlerts: Array<{ id: string; text: string; type: 'warning' | 'error' }> = [];

        const absent = (response.stats.team?.total || 0) - (response.stats.team?.present || 0);
        if (absent > 0) {
          newAlerts.push({
            id: 'absent',
            text: `${absent} ${absent === 1 ? 'rep hasn\'t' : 'reps haven\'t'} checked in`,
            type: 'warning',
          });
        }

        if (response.stats.pending?.dsrs > 0) {
          newAlerts.push({
            id: 'dsrs',
            text: `${response.stats.pending.dsrs} ${response.stats.pending.dsrs === 1 ? 'DSR needs' : 'DSRs need'} review`,
            type: 'warning',
          });
        }

        setAlerts(newAlerts);
      }
    } catch (error) {
      logger.error('Error fetching team stats:', error);
    }
  }, []);

  // Fetch top performers (mock for now - will be replaced with actual API)
  const fetchTopPerformers = useCallback(async () => {
    // TODO: Implement actual API call for top performers
    // For now, using mock data
    setTopPerformers([
      { id: '1', name: 'Rahul Kumar', visits: 5 },
      { id: '2', name: 'Priya Singh', visits: 4 },
      { id: '3', name: 'Amit Sharma', visits: 3 },
    ]);
  }, []);

  // Refresh function for pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchUserName(), fetchTeamStats(), fetchTopPerformers()]);
    setRefreshing(false);
  }, [fetchUserName, fetchTeamStats, fetchTopPerformers]);

  // Load data on mount only (Phase 2A optimization)
  // User can manually refresh via pull-to-refresh
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchUserName(), fetchTeamStats(), fetchTopPerformers()]);
      setLoading(false);
    };
    loadData();
  }, [fetchUserName, fetchTeamStats, fetchTopPerformers]);

  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      {/* Minimal Greeting Bar */}
      <View style={styles.greetingBar}>
        <View style={styles.greetingContent}>
          {greeting.icon === 'sunrise' && <Sunrise size={20} color={colors.text.inverse} />}
          {greeting.icon === 'sun' && <Sun size={20} color={colors.text.inverse} />}
          {greeting.icon === 'moon' && <Moon size={20} color={colors.text.inverse} />}
          <Text style={styles.greetingText}>
            {greeting.text}, {userName || 'Manager'}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >

        {/* Today's Overview - KPI Cards */}
        <View style={styles.kpiSection}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.kpiRow}>
            <KpiCard
              title="Present"
              value={`${teamStats.present}/${teamStats.total}`}
              icon={<Users size={16} color={featureColors.attendance.primary} />}
            />
            <KpiCard
              title="Pending"
              value={teamStats.pendingApprovals.toString()}
              icon={<CheckCircle size={16} color={featureColors.dsr.primary} />}
            />
          </View>
          <View style={styles.kpiRow}>
            <KpiCard
              title="Visits"
              value={teamStats.todayVisits.toString()}
              icon={<MapPin size={16} color={featureColors.visits.primary} />}
            />
            <KpiCard
              title="Sheets"
              value={teamStats.todaySheets.toString()}
              icon={<FileText size={16} color={featureColors.sheets.primary} />}
            />
          </View>
        </View>

        {/* Alerts Section */}
        {alerts.length > 0 && (
          <Card elevation="md" style={styles.alertsCard}>
            <View style={styles.alertsHeader}>
              <Bell size={20} color={colors.warning} />
              <Text style={styles.alertsTitle}>Alerts</Text>
              <Badge variant="warning">{alerts.length}</Badge>
            </View>
            {alerts.map((alert, index) => (
              <View key={alert.id}>
                {index > 0 && <View style={styles.alertDivider} />}
                <View style={styles.alertItem}>
                  <AlertTriangle size={16} color={colors.warning} />
                  <Text style={styles.alertText}>{alert.text}</Text>
                </View>
              </View>
            ))}
          </Card>
        )}

        {/* Top Performers */}
        {topPerformers.length > 0 && (
          <Card elevation="md" style={styles.topPerformersCard}>
            <Text style={styles.sectionTitle}>🏆 Top Performers Today</Text>
            {topPerformers.map((performer, index) => (
              <TouchableOpacity
                key={performer.id}
                style={styles.performerItem}
                onPress={() => navigation.navigate('UserDetail', { userId: performer.id })}
              >
                <View style={styles.performerRank}>
                  <Text style={styles.performerRankText}>{index + 1}</Text>
                </View>
                <Text style={styles.performerName}>{performer.name}</Text>
                <Text style={styles.performerVisits}>{performer.visits} visits</Text>
                <ChevronRight size={16} color={colors.text.tertiary} />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* Documents & Resources */}
        <Card elevation="md" style={styles.documentsCard}>
          <View style={styles.documentsHeader}>
            <Folder size={20} color={featureColors.documents.primary} />
            <Text style={styles.sectionTitle}>Documents & Resources</Text>
          </View>
          <Text style={styles.documentsSubtext}>
            Product catalogs, price lists, sales reports, and more
          </Text>
          <TouchableOpacity
            style={styles.documentsButton}
            onPress={() => navigation.navigate('DocumentLibrary')}
          >
            <Text style={styles.documentsButtonText}>View All Documents</Text>
            <ChevronRight size={16} color={colors.accent} />
          </TouchableOpacity>
        </Card>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Minimal Greeting Bar
  greetingBar: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: 52, // Status bar space
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  greetingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greetingText: {
    fontSize: 19,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
    paddingBottom: 100, // Extra padding for floating nav bar
  },

  // KPI Section
  kpiSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },

  // Alerts Card
  alertsCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  alertsTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    flex: 1,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  alertText: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },
  alertDivider: {
    height: 1,
    backgroundColor: colors.border.light,
  },

  // Top Performers Card
  topPerformersCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  performerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: spacing.sm,
  },
  performerRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  performerRankText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.bold,
    color: colors.accent,
  },
  performerName: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    flex: 1,
  },
  performerVisits: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },

  // Documents Card
  documentsCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  documentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  documentsSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  documentsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accent + '10',
    borderRadius: spacing.borderRadius.md,
  },
  documentsButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
  },
});
