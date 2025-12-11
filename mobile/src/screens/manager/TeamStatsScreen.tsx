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

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import {
  ArrowLeft,
  Users,
  MapPin,
  TrendingUp,
  Bell,
  Calendar,
  ChevronDown,
  ChevronRight,
  X,
  Check,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Skeleton } from '../../patterns/Skeleton';

// Manager type for filter
interface Manager {
  id: string;
  name: string;
  role: string;
}

type TimeRange = 'today' | 'week' | 'month' | 'custom';

// Format large numbers (1000+ becomes 1.0k, etc.)
const formatNumber = (num: number): string => {
  if (num >= 10000) return `${(num / 1000).toFixed(0)}k`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return num.toString();
};

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
      expenses: number;
    };
  };
}

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

export const TeamStatsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [selectedRange, setSelectedRange] = useState<TimeRange>('month');
  const [selectedManagerId, setSelectedManagerId] = useState<string | undefined>(undefined);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const isAdmin = user?.role === 'admin';

  // Fetch managers list for admin filter
  const { data: managersData } = useQuery({
    queryKey: ['managersList'],
    queryFn: async () => {
      const response = await api.getManagersList();
      return response.managers || [];
    },
    enabled: isAdmin, // Only fetch for admins
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const managers: Manager[] = managersData || [];

  // Get selected manager name for display
  const selectedManagerName = useMemo(() => {
    if (!selectedManagerId) return 'All Teams';
    const manager = managers.find(m => m.id === selectedManagerId);
    return manager?.name || 'All Teams';
  }, [selectedManagerId, managers]);

  // Get today's date
  const today = useMemo(() => new Date().toISOString().substring(0, 10), []);

  // Map UI range to API range
  const apiRange = selectedRange === 'custom' ? 'month' : selectedRange;

  // Fetch team stats
  const {
    data: statsData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<TeamStatsResponse>({
    queryKey: ['teamStats', today, apiRange, selectedManagerId],
    queryFn: async () => {
      const response = await api.getTeamStats({
        date: today,
        range: apiRange,
        filterByManagerId: selectedManagerId,
      });
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const stats = statsData?.stats;

  // Calculate pending total
  const pendingTotal = (stats?.pending?.sheets || 0) + (stats?.pending?.expenses || 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Performance</Text>
        {isAdmin ? (
          <TouchableOpacity
            style={styles.headerFilterChip}
            onPress={() => setFilterModalVisible(true)}
          >
            <Text style={styles.headerFilterText} numberOfLines={1}>
              {selectedManagerName}
            </Text>
            <ChevronDown size={14} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Time Range Toggle - Full Width */}
      <View style={styles.toggleContainer}>
        <View style={styles.toggleRow}>
          {(['today', 'week', 'month'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[styles.togglePill, selectedRange === range && styles.togglePillActive]}
              onPress={() => setSelectedRange(range)}
            >
              <Text style={[styles.toggleText, selectedRange === range && styles.toggleTextActive]}>
                {range === 'today' ? 'Today' : range === 'week' ? 'Week' : 'Month'}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.togglePill, styles.togglePillIcon, selectedRange === 'custom' && styles.togglePillActive]}
            onPress={() => setSelectedRange('custom')}
          >
            <Calendar size={18} color={selectedRange === 'custom' ? '#393735' : '#666'} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
      >
        {/* Team Activity - Clean card */}
        <View style={styles.teamCard}>
          <View style={styles.teamCardHeader}>
            <Users size={16} color="#666" />
            <Text style={styles.teamCardTitle}>TEAM</Text>
          </View>
          <View style={styles.teamCardBody}>
            {isLoading ? (
              <Skeleton width={80} height={48} />
            ) : (
              <>
                <Text style={styles.teamActiveNumber}>{stats?.team?.active || 0}</Text>
                <Text style={styles.teamActiveLabel}>of {stats?.team?.total || 0} active</Text>
              </>
            )}
          </View>
        </View>

        {/* Visits - Number Grid */}
        <NumberGridCard
          icon={<MapPin size={16} color="#2196F3" />}
          title="VISITS"
          total={stats?.visits?.total || 0}
          totalLabel="total"
          loading={isLoading}
          breakdowns={[
            { label: 'Distributor', value: stats?.visits?.distributor || 0, color: '#1976D2' },
            { label: 'Dealer', value: stats?.visits?.dealer || 0, color: '#388E3C' },
            { label: 'Architect', value: stats?.visits?.architect || 0, color: '#F57C00' },
            { label: 'OEM', value: stats?.visits?.OEM || 0, color: '#7B1FA2' },
          ]}
        />

        {/* Sheets - Number Grid */}
        <NumberGridCard
          icon={<TrendingUp size={16} color="#FF9800" />}
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

        {/* Pending Banner */}
        <TouchableOpacity style={styles.pendingBanner} onPress={() => navigation?.navigate('ReviewTab')}>
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
                    {stats?.pending?.sheets || 0} sheets, {stats?.pending?.expenses || 0} expenses
                  </Text>
                </>
              )}
            </View>
          </View>
          <ChevronRight size={20} color="#C9A961" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Manager Filter Modal (Admin only) */}
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
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Manager</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Options List */}
            <FlatList
              data={[{ id: '', name: 'All Teams', role: '' }, ...managers]}
              keyExtractor={(item) => item.id || 'all'}
              renderItem={({ item }) => {
                const isSelected = item.id === ''
                  ? !selectedManagerId
                  : selectedManagerId === item.id;
                return (
                  <TouchableOpacity
                    style={[
                      styles.modalOption,
                      isSelected && styles.modalOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedManagerId(item.id || undefined);
                      setFilterModalVisible(false);
                    }}
                  >
                    <View style={styles.modalOptionLeft}>
                      <View style={styles.modalOptionAvatar}>
                        <Users size={16} color="#666" />
                      </View>
                      <View>
                        <Text style={styles.modalOptionName}>{item.name}</Text>
                        {item.role && (
                          <Text style={styles.modalOptionRole}>
                            {item.role === 'area_manager' ? 'Area Manager' :
                             item.role === 'national_head' ? 'National Head' :
                             item.role}
                          </Text>
                        )}
                      </View>
                    </View>
                    {isSelected && <Check size={20} color="#2E7D32" />}
                  </TouchableOpacity>
                );
              }}
              style={styles.modalList}
            />
          </View>
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
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
    maxWidth: 120,
  },
  headerFilterText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', flexShrink: 1 },

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
    borderRadius: 8,
    padding: 4,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePillActive: { backgroundColor: '#FFFFFF' },
  togglePillIcon: { flex: 0, paddingHorizontal: 16 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#888' },
  toggleTextActive: { color: '#393735' },

  // Scroll
  scrollView: { flex: 1 },
  content: { padding: 16, gap: 14 },

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
    marginLeft: 'auto',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pendingBadgeText: {
    fontSize: 10,
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
});

export default TeamStatsScreen;
