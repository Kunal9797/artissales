/**
 * TeamScreen - Simple Version
 * Built with inline styles to avoid StyleSheet.create issues
 */

import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import { View, Text, TouchableOpacity, TextInput, RefreshControl, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { User, Search, Plus } from 'lucide-react-native';
import { api } from '../../services/api';
import { UserListItem } from '../../types';
import { Skeleton } from '../../patterns';
import { formatLastActive, getLastActiveColor, formatPhoneForDisplay } from '../../utils/formatTime';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

// Phase 2A: Module-level cache with 30-minute TTL
const teamCache: {
  data?: UserListItem[];
  timestamp?: number;
} = {};

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const getCachedTeam = (): UserListItem[] | null => {
  const now = Date.now();
  if (
    teamCache.data &&
    teamCache.timestamp &&
    now - teamCache.timestamp < CACHE_TTL
  ) {
    return teamCache.data;
  }
  return null;
};

const setCachedTeam = (data: UserListItem[]) => {
  teamCache.data = data;
  teamCache.timestamp = Date.now();
};

export const invalidateTeamCache = () => {
  teamCache.data = undefined;
  teamCache.timestamp = undefined;
};

export const TeamScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const bottomPadding = useBottomSafeArea(12);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadUsers = async (forceRefresh = false) => {
    // Phase 2A: Check cache first
    if (!forceRefresh) {
      const cachedData = getCachedTeam();
      if (cachedData) {
        logger.log('[TeamScreen] Using cached team data');
        setUsers(cachedData);
        setFilteredUsers(cachedData);
        return;
      }
    }

    setLoading(true);
    try {
      const response = await api.getUsersList({});
      if (response.ok && response.users) {
        setUsers(response.users);
        setFilteredUsers(response.users);

        // Cache the data
        setCachedTeam(response.users);
      }
    } catch (error) {
      logger.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Check if user is a manager/admin (non-field role)
  const isManagerRole = (role: string): boolean => {
    return ['admin', 'national_head', 'zonal_head', 'area_manager'].includes(role);
  };

  // Sort priority: reps first, then managers at bottom
  const getRoleSortOrder = (role: string): number => {
    switch (role) {
      case 'rep': return 0;
      case 'area_manager': return 1;
      case 'zonal_head': return 2;
      case 'national_head': return 3;
      case 'admin': return 4;
      default: return 5;
    }
  };

  useEffect(() => {
    let filtered = users;

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(u => u.isActive);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(u => !u.isActive);
    }

    // Apply search filter
    if (searchTerm.trim().length > 0) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.phone.includes(term) ||
        u.territory.toLowerCase().includes(term)
      );
    }

    // Sort: reps first (alphabetically), then managers at bottom
    filtered = [...filtered].sort((a, b) => {
      const orderA = getRoleSortOrder(a.role);
      const orderB = getRoleSortOrder(b.role);
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });

    setFilteredUsers(filtered);
  }, [searchTerm, users, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers(true); // Force refresh, bypass cache
    setRefreshing(false);
  };

  const getRoleDisplay = (role: string): string => {
    const roleMap: Record<string, string> = {
      rep: 'Sales Rep',
      area_manager: 'Area Manager',
      zonal_head: 'Zonal Head',
      national_head: 'National Head',
      admin: 'Admin',
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role: string): string => {
    switch (role) {
      case 'rep': return '#1976D2'; // Blue
      case 'area_manager': return '#2E7D32'; // Green
      case 'zonal_head': return '#F57C00'; // Orange
      case 'national_head': return '#7B1FA2'; // Purple
      case 'admin': return '#424242'; // Gray
      default: return '#1A1A1A';
    }
  };

  const renderUser = ({ item }: { item: UserListItem }) => {
    const isManager = isManagerRole(item.role);
    const lastActiveText = formatLastActive(item.lastActiveAt);

    const cardContent = (
      <>
        {/* Name + Role Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isManager ? '#666666' : '#1A1A1A',
              flex: 1,
            }}
            numberOfLines={1}
          >
            {item.name || 'Unnamed User'}
          </Text>
          <View style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 4,
            backgroundColor: isManager ? '#E0E0E0' : getRoleColor(item.role),
          }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: isManager ? '#666666' : '#FFFFFF' }}>
              {getRoleDisplay(item.role)}
            </Text>
          </View>
        </View>

        {/* Territory + Phone + Last Active inline */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 13, color: '#999999', flex: 1 }} numberOfLines={1}>
            {item.territory} • {formatPhoneForDisplay(item.phone)}
          </Text>
          {lastActiveText ? (
            <Text style={{
              fontSize: 12,
              fontWeight: '500',
              color: getLastActiveColor(item.lastActiveAt),
              marginLeft: 8,
            }}>
              {lastActiveText}
            </Text>
          ) : null}
        </View>
      </>
    );

    // Managers/admins are not clickable
    if (isManager) {
      return (
        <View
          style={{
            backgroundColor: '#F9F9F9',
            borderRadius: 12,
            padding: 16,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: '#E8E8E8',
          }}
        >
          {cardContent}
        </View>
      );
    }

    // Sales reps are clickable
    return (
      <TouchableOpacity
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        }}
        onPress={() => navigation?.navigate('UserDetail', { userId: item.id })}
        activeOpacity={0.7}
      >
        {cardContent}
      </TouchableOpacity>
    );
  };

  // Filter options for pills
  const filterOptions = [
    { value: 'all', label: 'All', count: users.length },
    { value: 'active', label: 'Active', count: users.filter(u => u.isActive).length },
    { value: 'inactive', label: 'Inactive', count: users.filter(u => !u.isActive).length },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header - Compact single row design */}
      <View style={{
        backgroundColor: '#393735',
        paddingTop: 52,
        paddingBottom: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF', flex: 1 }}>
          Team
        </Text>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(201, 169, 97, 0.25)',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 8,
            gap: 6,
          }}
          onPress={() => navigation?.navigate('AddUser')}
        >
          <Plus size={16} color="#C9A961" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#C9A961' }}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        }}>
          <Search size={20} color="#999999" />
          <TextInput
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 8,
              fontSize: 16,
              color: '#1A1A1A',
            }}
            placeholder="Search team members..."
            placeholderTextColor="#999999"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {/* Status Filter Pills - horizontal scroll */}
      <View style={{ paddingBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {filterOptions.map((filter) => {
            const isActive = statusFilter === filter.value;
            return (
              <TouchableOpacity
                key={filter.value}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: isActive ? '#393735' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isActive ? '#393735' : '#E0E0E0',
                }}
                onPress={() => setStatusFilter(filter.value as any)}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isActive ? '#FFFFFF' : '#666666',
                }}>
                  {filter.label}{isActive ? ` (${filter.count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Team List */}
      {loading && users.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Skeleton rows={3} avatar />
          <Skeleton rows={3} avatar />
          <Skeleton rows={3} avatar />
        </View>
      ) : (
        <FlashList
          data={filteredUsers}
          renderItem={renderUser}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 + bottomPadding }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={{ padding: 40, alignItems: 'center' }}>
              <User size={48} color="#E0E0E0" />
              <Text style={{ fontSize: 16, color: '#666666', marginTop: 16 }}>
                {searchTerm ? 'No team members found' : 'No team members yet'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};
