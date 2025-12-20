/**
 * ManagerHomeScreen - Manager Dashboard
 *
 * Redesigned with:
 * - Feature-colored KPI cards (green, gold, blue, orange tints)
 * - Gold-accented pending banner
 * - Proper theme integration
 * - Lightweight getManagerDashboard API
 * - Review tab prefetching
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  Bell,
  Users,
  MapPin,
  Layers,
  ChevronRight,
  Sunrise,
  Sun,
  Moon,
  BookOpen,
  X,
  Clock,
} from 'lucide-react-native';
import { api } from '../../services/api';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { useProfileSheet } from '../../providers/ProfileSheetProvider';
import { Skeleton } from '../../patterns/Skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography, featureColors, useTheme } from '../../theme';

// Types for the new API response
interface ManagerDashboardResponse {
  ok: boolean;
  date: string;
  user: {
    name: string;
    role: string;
    teamSize: number;
  };
  summary: {
    pendingSheets: number;
    pendingExpenses: number;
    pendingTotal: number;
    todayVisits: number;
    todaySheets: number;
  };
}

// Visits summary response type
interface VisitsSummaryResponse {
  ok: boolean;
  date: string;
  totalCount: number;
  recentVisits: Array<{
    id: string;
    accountName: string;
    accountType: string;
    repName: string;
    timestamp: string;
  }>;
}

// Bottom sheet types
type SheetType = 'visits' | 'sheets' | null;

export const ManagerHomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const bottomPadding = useBottomSafeArea(12);
  const queryClient = useQueryClient();
  const { showProfileSheet } = useProfileSheet();
  const { isDark, colors: themeColors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);

  // Get today's date for dashboard stats
  const today = useMemo(() => new Date().toISOString().substring(0, 10), []);

  // Fetch dashboard data using new lightweight API
  const {
    data: dashboardData,
    isLoading: loading,
    refetch: refetchDashboard,
  } = useQuery<ManagerDashboardResponse>({
    queryKey: ['managerDashboard', today],
    queryFn: async () => {
      const response = await api.getManagerDashboard({ date: today });
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Prefetch Review tab data and visits summary after dashboard loads
  useEffect(() => {
    if (!loading && dashboardData?.ok) {
      // Prefetch pending items for Review tab
      queryClient.prefetchQuery({
        queryKey: ['pendingItems'],
        queryFn: () => api.getPendingItems(),
        staleTime: 5 * 60 * 1000,
      });

      // Prefetch visits summary for popup (background fetch, zero impact on initial load)
      queryClient.prefetchQuery({
        queryKey: ['todayVisitsSummary', today],
        queryFn: () => api.getTodayVisitsSummary({ date: today }),
        staleTime: 2 * 60 * 1000,
      });
    }
  }, [loading, dashboardData, queryClient, today]);

  // Fetch visits summary when popup opens (uses prefetched data if available)
  const {
    data: visitsSummary,
    isLoading: visitsSummaryLoading,
  } = useQuery<VisitsSummaryResponse>({
    queryKey: ['todayVisitsSummary', today],
    queryFn: () => api.getTodayVisitsSummary({ date: today }),
    staleTime: 2 * 60 * 1000,
    enabled: activeSheet === 'visits', // Only fetch if popup is open and not prefetched
  });

  // Helper to format relative time (e.g., "10m ago")
  const formatRelativeTime = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Helper to get account type badge color
  const getAccountTypeColor = (type: string): string => {
    switch (type) {
      case 'distributor': return '#1976D2';
      case 'dealer': return '#388E3C';
      case 'architect': return '#F57C00';
      case 'OEM': return '#7B1FA2';
      default: return '#666666';
    }
  };

  // Extract data from response
  const userName = dashboardData?.user?.name || 'Manager';
  const teamSize = dashboardData?.user?.teamSize || 0;
  const pendingTotal = dashboardData?.summary?.pendingTotal || 0;
  const todayVisits = dashboardData?.summary?.todayVisits || 0;
  const todaySheets = dashboardData?.summary?.todaySheets || 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good Morning', Icon: Sunrise };
    if (hour < 18) return { text: 'Good Afternoon', Icon: Sun };
    return { text: 'Good Evening', Icon: Moon };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refetchDashboard();
    // Also invalidate pending items cache so Review tab gets fresh data
    queryClient.invalidateQueries({ queryKey: ['pendingItems'] });
    setRefreshing(false);
  };

  const greeting = getGreeting();
  const GreetingIcon = greeting.Icon;

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header with Greeting */}
      <View style={[styles.header, { backgroundColor: isDark ? themeColors.surface : colors.primary }]}>
        {/* Time icon + Hi, Name */}
        <View style={styles.greetingRow}>
          <GreetingIcon size={20} color={themeColors.accent} />
          <Text style={[styles.greetingText, { color: '#FFFFFF' }]}>
            Hi, {userName ? userName.split(' ')[0].charAt(0).toUpperCase() + userName.split(' ')[0].slice(1) : 'Manager'}
          </Text>
        </View>

        {/* Artis Logo - Tappable, opens Profile Sheet */}
        <TouchableOpacity
          onPress={showProfileSheet}
          activeOpacity={0.7}
          style={styles.logoButton}
        >
          <Image
            source={require('../../../assets/images/artislogo_blackbgrd.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          {/* User initial badge */}
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>
              {userName ? userName.charAt(0).toUpperCase() : 'M'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 80 + bottomPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Section Header */}
        <Text style={[styles.sectionHeader, { color: themeColors.text.tertiary }]}>Today's Overview</Text>

        {/* KPI Cards - Feature Color Coded */}
        <View style={styles.kpiSection}>
          {loading ? (
            <>
              <View style={styles.kpiRow}>
                <Skeleton card style={styles.skeletonCard} />
                <Skeleton card style={styles.skeletonCard} />
              </View>
              <View style={styles.kpiRow}>
                <Skeleton card style={styles.skeletonCard} />
                <Skeleton card style={styles.skeletonCard} />
              </View>
            </>
          ) : (
            <>
              <View style={styles.kpiRow}>
                {/* Team Size - Green tint */}
                <TouchableOpacity
                  style={[styles.kpiCard, styles.teamCard]}
                  onPress={() => navigation?.navigate('UserList')}
                  activeOpacity={0.7}
                >
                  <View style={styles.kpiIconRow}>
                    <Users size={20} color={featureColors.attendance.primary} />
                    <Text style={[styles.kpiLabel, { color: themeColors.text.secondary }]}>TEAM</Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: themeColors.text.primary }]}>{teamSize}</Text>
                </TouchableOpacity>

                {/* Pending Approvals - Gold tint */}
                <TouchableOpacity
                  style={[styles.kpiCard, styles.pendingCard]}
                  onPress={() => navigation?.navigate('ReviewTab')}
                  activeOpacity={0.7}
                >
                  <View style={styles.kpiIconRow}>
                    <Bell size={20} color={themeColors.accent} />
                    <Text style={[styles.kpiLabel, { color: themeColors.text.secondary }]}>PENDING</Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: themeColors.text.primary }]}>{pendingTotal}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.kpiRow}>
                {/* Today's Visits - Blue tint */}
                <TouchableOpacity
                  style={[styles.kpiCard, styles.visitsCard]}
                  onPress={() => setActiveSheet('visits')}
                  activeOpacity={0.7}
                >
                  <View style={styles.kpiIconRow}>
                    <MapPin size={20} color={featureColors.visits.primary} />
                    <Text style={[styles.kpiLabel, { color: themeColors.text.secondary }]}>VISITS</Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: themeColors.text.primary }]}>{todayVisits}</Text>
                </TouchableOpacity>

                {/* Today's Sheets - Orange tint */}
                <TouchableOpacity
                  style={[styles.kpiCard, styles.sheetsCard]}
                  onPress={() => setActiveSheet('sheets')}
                  activeOpacity={0.7}
                >
                  <View style={styles.kpiIconRow}>
                    <Layers size={20} color={featureColors.sheets.primary} />
                    <Text style={[styles.kpiLabel, { color: themeColors.text.secondary }]}>SHEETS</Text>
                  </View>
                  <Text style={[styles.kpiValue, { color: themeColors.text.primary }]}>{todaySheets}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        {/* Section Header */}
        <Text style={[styles.sectionHeader, { color: themeColors.text.tertiary }]}>Quick Access</Text>

        {/* Document Library Card */}
        <TouchableOpacity
          style={styles.documentsCard}
          onPress={() => navigation?.navigate('Documents')}
          activeOpacity={0.7}
        >
          <View style={styles.documentsHeader}>
            <View style={styles.documentsIconCircle}>
              <BookOpen size={20} color={featureColors.documents.primary} />
            </View>
            <View style={styles.documentsTextContainer}>
              <Text style={[styles.documentsTitle, { color: themeColors.text.primary }]}>Document Library</Text>
              <Text style={[styles.documentsSubtitle, { color: themeColors.text.secondary }]}>Catalogs, price lists & resources</Text>
            </View>
            <ChevronRight size={20} color={themeColors.text.tertiary} />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={activeSheet !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveSheet(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setActiveSheet(null)}>
          <Pressable style={[styles.bottomSheet, { backgroundColor: themeColors.background }]} onPress={(e) => e.stopPropagation()}>
            {/* Drag handle */}
            <View style={[styles.sheetHandle, { backgroundColor: themeColors.border.default }]} />

            {/* Close button */}
            <TouchableOpacity
              style={styles.sheetCloseButton}
              onPress={() => setActiveSheet(null)}
            >
              <X size={20} color={themeColors.text.tertiary} />
            </TouchableOpacity>

            {/* Content */}
            {activeSheet === 'visits' && (
              <View style={styles.sheetContent}>
                <View style={[styles.sheetIconCircle, { backgroundColor: featureColors.visits.light }]}>
                  <MapPin size={24} color={featureColors.visits.primary} />
                </View>
                <Text style={[styles.sheetTitle, { color: themeColors.text.primary }]}>Today's Visits</Text>
                <Text style={[styles.sheetValue, { color: themeColors.text.primary }]}>{todayVisits}</Text>

                {/* Recent visits list */}
                {visitsSummaryLoading ? (
                  <ActivityIndicator size="small" color={featureColors.visits.primary} style={{ marginVertical: spacing.md }} />
                ) : visitsSummary?.recentVisits && visitsSummary.recentVisits.length > 0 ? (
                  <View style={[styles.recentVisitsList, { backgroundColor: themeColors.surface, borderColor: themeColors.border.default }]}>
                    <Text style={[styles.recentVisitsHeader, { color: themeColors.text.tertiary, backgroundColor: themeColors.background, borderBottomColor: themeColors.border.default }]}>Recent Activity</Text>
                    {visitsSummary.recentVisits.map((visit, index) => (
                      <View key={visit.id} style={[
                        styles.recentVisitItem,
                        { backgroundColor: themeColors.surface, borderBottomColor: themeColors.border.default },
                        index === visitsSummary.recentVisits.length - 1 && { borderBottomWidth: 0 }
                      ]}>
                        <View style={styles.recentVisitContent}>
                          <View style={styles.recentVisitRow}>
                            <Text style={[styles.recentVisitAccount, { color: themeColors.text.primary }]} numberOfLines={1}>
                              {visit.accountName}
                            </Text>
                            <View style={[styles.accountTypeBadge, { backgroundColor: getAccountTypeColor(visit.accountType) }]}>
                              <Text style={styles.accountTypeBadgeText}>
                                {visit.accountType.charAt(0).toUpperCase() + visit.accountType.slice(1)}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.recentVisitMeta}>
                            <Text style={[styles.recentVisitRep, { color: themeColors.text.secondary }]}>by {visit.repName}</Text>
                            <View style={styles.recentVisitTimeRow}>
                              <Clock size={12} color={themeColors.text.tertiary} />
                              <Text style={[styles.recentVisitTime, { color: themeColors.text.tertiary }]}>{formatRelativeTime(visit.timestamp)}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.sheetDescription, { color: themeColors.text.secondary }]}>
                    {todayVisits === 0
                      ? 'No visits logged by your team today'
                      : 'Loading recent visits...'}
                  </Text>
                )}

                <TouchableOpacity
                  style={[styles.sheetButton, { backgroundColor: isDark ? themeColors.accent : colors.primary }]}
                  onPress={() => {
                    setActiveSheet(null);
                    navigation?.navigate('AccountsList');
                  }}
                >
                  <Text style={styles.sheetButtonText}>View All Accounts</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeSheet === 'sheets' && (
              <View style={styles.sheetContent}>
                <View style={[styles.sheetIconCircle, { backgroundColor: featureColors.sheets.light }]}>
                  <Layers size={24} color={featureColors.sheets.primary} />
                </View>
                <Text style={[styles.sheetTitle, { color: themeColors.text.primary }]}>Today's Sheets</Text>
                <Text style={[styles.sheetValue, { color: themeColors.text.primary }]}>{todaySheets}</Text>
                <Text style={[styles.sheetDescription, { color: themeColors.text.secondary }]}>
                  {todaySheets === 0
                    ? 'No sheets recorded by your team today'
                    : todaySheets === 1
                    ? '1 sheet recorded by your team today'
                    : `${todaySheets} sheets recorded by your team today`}
                </Text>
                <TouchableOpacity
                  style={[styles.sheetButton, { backgroundColor: isDark ? themeColors.accent : colors.primary }]}
                  onPress={() => {
                    setActiveSheet(null);
                    navigation?.navigate('StatsTab');
                  }}
                >
                  <Text style={styles.sheetButtonText}>View Stats</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.lg,
  },

  // Section Header
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },

  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 48,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoButton: {
    zIndex: 10,
    shadowColor: '#C9A961',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  userBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  userBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
  headerContent: {
    zIndex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  // KPI Section
  kpiSection: {
    marginBottom: spacing.xl,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  skeletonCard: {
    flex: 1,
    height: 130,
  },

  // KPI Card base
  kpiCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.xl,
    borderWidth: 1,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  kpiIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  kpiValue: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
  },

  // Feature-colored cards
  teamCard: {
    backgroundColor: featureColors.attendance.primary + '14', // 8% opacity
    borderColor: featureColors.attendance.primary + '26', // 15% opacity
  },
  pendingCard: {
    backgroundColor: colors.accent + '14',
    borderColor: colors.accent + '26',
  },
  visitsCard: {
    backgroundColor: featureColors.visits.primary + '14',
    borderColor: featureColors.visits.primary + '26',
  },
  sheetsCard: {
    backgroundColor: featureColors.sheets.primary + '14',
    borderColor: featureColors.sheets.primary + '26',
  },

  // Documents Card
  documentsCard: {
    backgroundColor: featureColors.documents.primary + '14', // 8% opacity like KPI cards
    borderRadius: spacing.borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: featureColors.documents.primary + '26', // 15% opacity
  },
  documentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentsIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: featureColors.documents.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentsTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  documentsTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
  },
  documentsSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },

  // Bottom Sheet Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: spacing.borderRadius.xl,
    borderTopRightRadius: spacing.borderRadius.xl,
    paddingTop: spacing.sm,
    paddingBottom: 40,
    paddingHorizontal: spacing.screenPadding,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetCloseButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.sm,
  },
  sheetContent: {
    alignItems: 'center',
    paddingTop: spacing.md,
  },
  sheetIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sheetValue: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  sheetDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  sheetButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    borderRadius: spacing.borderRadius.lg,
  },
  sheetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
  },

  // Recent visits list styles
  recentVisitsList: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  recentVisitsHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  recentVisitItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.surface,
  },
  recentVisitContent: {
    gap: 4,
  },
  recentVisitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  recentVisitAccount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  accountTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  accountTypeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  recentVisitMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentVisitRep: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  recentVisitTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentVisitTime: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
});
