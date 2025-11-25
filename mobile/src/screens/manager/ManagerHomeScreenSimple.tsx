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
} from 'react-native';
import {
  Bell,
  Users,
  MapPin,
  TrendingUp,
  ChevronRight,
  Sunrise,
  Sun,
  Moon,
  BookOpen,
  X,
} from 'lucide-react-native';
import { api } from '../../services/api';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { Skeleton } from '../../patterns/Skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography, featureColors } from '../../theme';

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

// Bottom sheet types
type SheetType = 'visits' | 'sheets' | null;

export const ManagerHomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const bottomPadding = useBottomSafeArea(12);
  const queryClient = useQueryClient();
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

  // Prefetch Review tab data after dashboard loads
  useEffect(() => {
    if (!loading && dashboardData?.ok) {
      queryClient.prefetchQuery({
        queryKey: ['pendingItems'],
        queryFn: () => api.getPendingItems(),
        staleTime: 5 * 60 * 1000,
      });
    }
  }, [loading, dashboardData, queryClient]);

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
    <View style={styles.container}>
      {/* Header with Greeting */}
      <View style={styles.header}>
        {/* Artis Logo - Translucent watermark */}
        <View style={styles.logoWatermark}>
          <Image
            source={require('../../../assets/images/artislogo_blackbgrd.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Greeting content */}
        <View style={styles.headerContent}>
          <View style={styles.greetingRow}>
            <GreetingIcon size={20} color={colors.accent} />
            <Text style={styles.greetingText}>
              {greeting.text}, {userName.charAt(0).toUpperCase() + userName.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 60 + bottomPadding }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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
                  onPress={() => navigation?.navigate('TeamTab')}
                  activeOpacity={0.7}
                >
                  <View style={styles.kpiIconRow}>
                    <Users size={20} color={featureColors.attendance.primary} />
                    <Text style={styles.kpiLabel}>TEAM</Text>
                  </View>
                  <Text style={styles.kpiValue}>{teamSize}</Text>
                </TouchableOpacity>

                {/* Pending Approvals - Gold tint */}
                <TouchableOpacity
                  style={[styles.kpiCard, styles.pendingCard]}
                  onPress={() => navigation?.navigate('ReviewTab')}
                  activeOpacity={0.7}
                >
                  <View style={styles.kpiIconRow}>
                    <Bell size={20} color={colors.accent} />
                    <Text style={styles.kpiLabel}>PENDING</Text>
                  </View>
                  <Text style={styles.kpiValue}>{pendingTotal}</Text>
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
                    <Text style={styles.kpiLabel}>VISITS</Text>
                  </View>
                  <Text style={styles.kpiValue}>{todayVisits}</Text>
                </TouchableOpacity>

                {/* Today's Sheets - Orange tint */}
                <TouchableOpacity
                  style={[styles.kpiCard, styles.sheetsCard]}
                  onPress={() => setActiveSheet('sheets')}
                  activeOpacity={0.7}
                >
                  <View style={styles.kpiIconRow}>
                    <TrendingUp size={20} color={featureColors.sheets.primary} />
                    <Text style={styles.kpiLabel}>SHEETS</Text>
                  </View>
                  <Text style={styles.kpiValue}>{todaySheets}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

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
              <Text style={styles.documentsTitle}>Document Library</Text>
              <Text style={styles.documentsSubtitle}>Catalogs, price lists & resources</Text>
            </View>
            <ChevronRight size={20} color={colors.text.tertiary} />
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
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            {/* Drag handle */}
            <View style={styles.sheetHandle} />

            {/* Close button */}
            <TouchableOpacity
              style={styles.sheetCloseButton}
              onPress={() => setActiveSheet(null)}
            >
              <X size={20} color={colors.text.tertiary} />
            </TouchableOpacity>

            {/* Content */}
            {activeSheet === 'visits' && (
              <View style={styles.sheetContent}>
                <View style={[styles.sheetIconCircle, { backgroundColor: featureColors.visits.light }]}>
                  <MapPin size={24} color={featureColors.visits.primary} />
                </View>
                <Text style={styles.sheetTitle}>Today's Visits</Text>
                <Text style={styles.sheetValue}>{todayVisits}</Text>
                <Text style={styles.sheetDescription}>
                  {todayVisits === 0
                    ? 'No visits logged by your team today'
                    : todayVisits === 1
                    ? '1 visit logged by your team today'
                    : `${todayVisits} visits logged by your team today`}
                </Text>
                <TouchableOpacity
                  style={styles.sheetButton}
                  onPress={() => {
                    setActiveSheet(null);
                    navigation?.navigate('TeamTab');
                  }}
                >
                  <Text style={styles.sheetButtonText}>View Team Details</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeSheet === 'sheets' && (
              <View style={styles.sheetContent}>
                <View style={[styles.sheetIconCircle, { backgroundColor: featureColors.sheets.light }]}>
                  <TrendingUp size={24} color={featureColors.sheets.primary} />
                </View>
                <Text style={styles.sheetTitle}>Today's Sheets</Text>
                <Text style={styles.sheetValue}>{todaySheets}</Text>
                <Text style={styles.sheetDescription}>
                  {todaySheets === 0
                    ? 'No sheets recorded by your team today'
                    : todaySheets === 1
                    ? '1 sheet recorded by your team today'
                    : `${todaySheets} sheets recorded by your team today`}
                </Text>
                <TouchableOpacity
                  style={styles.sheetButton}
                  onPress={() => {
                    setActiveSheet(null);
                    navigation?.navigate('TeamTab');
                  }}
                >
                  <Text style={styles.sheetButtonText}>View Team Details</Text>
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
    padding: spacing.screenPadding,
  },

  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 52,
    paddingBottom: spacing.lg, // Increased to accommodate logo after removing subtitle
    borderBottomWidth: 2,
    borderBottomColor: colors.accent + '99', // Gold accent line at 60% opacity
    position: 'relative',
  },
  logoWatermark: {
    position: 'absolute',
    right: 16,
    top: 40,
    opacity: 0.12,
    zIndex: 0,
  },
  logoImage: {
    width: 72,
    height: 72,
  },
  headerContent: {
    zIndex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.inverse,
    flex: 1,
  },
  // KPI Section
  kpiSection: {
    marginBottom: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  skeletonCard: {
    flex: 1,
    height: 110,
  },

  // KPI Card base
  kpiCard: {
    flex: 1,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.xl,
    borderWidth: 1,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  kpiIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  kpiValue: {
    fontSize: 28,
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
    padding: spacing.md,
    borderWidth: 1,
    borderColor: featureColors.documents.primary + '26', // 15% opacity
  },
  documentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentsIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: featureColors.documents.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentsTextContainer: {
    flex: 1,
    marginLeft: spacing.sm + 4,
  },
  documentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  documentsSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 2,
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
});
