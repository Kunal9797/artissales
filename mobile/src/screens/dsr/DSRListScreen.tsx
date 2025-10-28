/**
 * DSRListScreen - View All DSRs with Needs Review & History Tabs
 *
 * Allows sales reps to:
 * - See DSRs needing revision (default tab)
 * - View all past DSRs (history tab)
 * - Tap on any DSR to view details
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { logger } from '../../utils/logger';
import { colors, spacing, typography, shadows } from '../../theme';
import { CheckCircle, AlertCircle, Clock, ChevronRight, FileText } from 'lucide-react-native';

interface DSR {
  id: string;
  date: string;
  status: 'pending' | 'approved' | 'needs_revision';
  totalVisits: number;
  totalSheetsSold: number;
  totalExpenses: number;
  managerComments?: string;
  reviewedAt?: string;
}

interface DSRListScreenProps {
  navigation: any;
}

export const DSRListScreen: React.FC<DSRListScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  const [activeTab, setActiveTab] = useState<'needs_review' | 'history'>('needs_review');
  const [dsrs, setDsrs] = useState<DSR[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDSRs = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const firestore = getFirestore();
      const { query, collection, where, getDocs, orderBy } = await import('@react-native-firebase/firestore');

      let dsrQuery;
      if (activeTab === 'needs_review') {
        // Only fetch DSRs needing revision
        dsrQuery = query(
          collection(firestore, 'dsrReports'),
          where('userId', '==', user.uid),
          where('status', '==', 'needs_revision'),
          orderBy('date', 'desc')
        );
      } else {
        // Fetch all DSRs
        dsrQuery = query(
          collection(firestore, 'dsrReports'),
          where('userId', '==', user.uid),
          orderBy('date', 'desc')
        );
      }

      const dsrSnapshot = await getDocs(dsrQuery);
      const dsrList: DSR[] = [];

      dsrSnapshot.forEach((doc: any) => {
        const data = doc.data();
        dsrList.push({
          id: doc.id,
          date: data.date,
          status: data.status || 'pending',
          totalVisits: data.totalVisits || 0,
          totalSheetsSold: data.totalSheetsSold || 0,
          totalExpenses: data.totalExpenses || 0,
          managerComments: data.managerComments,
          reviewedAt: data.reviewedAt?.toDate().toISOString(),
        });
      });

      setDsrs(dsrList);
    } catch (error) {
      logger.error('Error fetching DSRs:', error);
      setDsrs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchDSRs();
  }, [activeTab, fetchDSRs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDSRs();
    setRefreshing(false);
  }, [fetchDSRs]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          icon: CheckCircle,
          color: colors.success,
          bg: '#E8F5E9',
          label: 'Approved',
        };
      case 'needs_revision':
        return {
          icon: AlertCircle,
          color: '#FF9800',
          bg: '#FFF3E0',
          label: 'Needs Revision',
        };
      default:
        return {
          icon: Clock,
          color: '#FFC107',
          bg: '#FFFDE7',
          label: 'Pending Review',
        };
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderDSRCard = (dsr: DSR) => {
    const badge = getStatusBadge(dsr.status);
    const StatusIcon = badge.icon;

    return (
      <TouchableOpacity
        key={dsr.id}
        style={styles.dsrCard}
        onPress={() => navigation.navigate('DSR', { date: dsr.date })}
        activeOpacity={0.7}
      >
        <View style={styles.dsrCardHeader}>
          <View style={styles.dsrDateContainer}>
            <FileText size={18} color={colors.text.secondary} />
            <Text style={styles.dsrDate}>{formatDate(dsr.date)}</Text>
          </View>
          <ChevronRight size={20} color={colors.text.tertiary} />
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          <StatusIcon size={14} color={badge.color} />
          <Text style={[styles.statusText, { color: badge.color }]}>
            {badge.label}
          </Text>
        </View>

        {dsr.managerComments && dsr.status === 'needs_revision' && (
          <View style={styles.commentsBox}>
            <Text style={styles.commentsLabel}>Manager's Comment:</Text>
            <Text style={styles.commentsText} numberOfLines={2}>
              {dsr.managerComments}
            </Text>
          </View>
        )}

        <View style={styles.dsrStats}>
          <View style={styles.dsrStatItem}>
            <Text style={styles.dsrStatValue}>{dsr.totalSheetsSold}</Text>
            <Text style={styles.dsrStatLabel}>Sheets</Text>
          </View>
          <View style={styles.dsrStatDivider} />
          <View style={styles.dsrStatItem}>
            <Text style={styles.dsrStatValue}>{dsr.totalVisits}</Text>
            <Text style={styles.dsrStatLabel}>Visits</Text>
          </View>
          <View style={styles.dsrStatDivider} />
          <View style={styles.dsrStatItem}>
            <Text style={styles.dsrStatValue}>₹{dsr.totalExpenses}</Text>
            <Text style={styles.dsrStatLabel}>Expenses</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>DSR Reports</Text>
        <Text style={styles.subtitle}>Daily Sales Reports</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'needs_review' && styles.tabActive]}
          onPress={() => setActiveTab('needs_review')}
        >
          <Text
            style={[styles.tabText, activeTab === 'needs_review' && styles.tabTextActive]}
          >
            Needs Review
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {dsrs.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FileText size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyTitle}>
                {activeTab === 'needs_review'
                  ? 'No Reports Need Revision'
                  : 'No Reports Yet'}
              </Text>
              <Text style={styles.emptyMessage}>
                {activeTab === 'needs_review'
                  ? 'All your DSRs are either approved or pending review'
                  : 'Your daily sales reports will appear here after 11 PM each day'}
              </Text>
            </View>
          ) : (
            dsrs.map(renderDSRCard)
          )}
        </ScrollView>
      )}
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
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.accent,
  },
  tabText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.accent,
    fontWeight: typography.fontWeight.bold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: spacing.md,
  },
  dsrCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  dsrCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dsrDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dsrDate: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: spacing.borderRadius.md,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
  },
  commentsBox: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
    padding: spacing.sm,
    borderRadius: spacing.borderRadius.sm,
    marginBottom: spacing.sm,
  },
  commentsLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: '#E65100',
    marginBottom: 4,
  },
  commentsText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    lineHeight: 18,
  },
  dsrStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  dsrStatItem: {
    alignItems: 'center',
  },
  dsrStatValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  dsrStatLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  dsrStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border.light,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyMessage: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
