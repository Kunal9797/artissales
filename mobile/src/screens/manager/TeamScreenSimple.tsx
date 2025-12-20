/**
 * TeamScreen - Simple Version
 * Built with inline styles to avoid StyleSheet.create issues
 */

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import { View, Text, TouchableOpacity, TextInput, RefreshControl, ScrollView, Alert, Linking } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { User, Search, Plus } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { api } from '../../services/api';
import { UserListItem } from '../../types';
import { Skeleton } from '../../patterns';
import { formatLastActive, getLastActiveColor, formatPhoneForDisplay } from '../../utils/formatTime';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { useTheme } from '../../theme';

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
  const { isDark, colors: themeColors } = useTheme();
  const bottomPadding = useBottomSafeArea(12);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Handle long-press on phone number
  const handlePhoneLongPress = useCallback((phone: string) => {
    if (!phone) return;
    const displayPhone = formatPhoneForDisplay(phone);
    Alert.alert(
      displayPhone,
      'What would you like to do?',
      [
        {
          text: 'Copy Number',
          onPress: async () => {
            await Clipboard.setStringAsync(phone.replace(/[^\d+]/g, ''));
          },
        },
        {
          text: 'Call',
          onPress: () => {
            const phoneNumber = phone.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
            Linking.openURL(`tel:${encodeURIComponent(phoneNumber)}`);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  }, []);

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

  // Get last active color with dark mode support
  const getThemedLastActiveColor = (isoString: string | null): string => {
    const baseColor = getLastActiveColor(isoString);
    if (!isDark) return baseColor;
    // Brighter colors for dark mode
    if (baseColor === '#2E7D32') return '#66BB6A'; // Brighter green
    if (baseColor === '#F57C00') return '#FFB74D'; // Brighter orange
    return '#AAAAAA'; // Brighter gray
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
              color: isManager ? themeColors.text.tertiary : themeColors.text.primary,
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
            backgroundColor: isManager ? (isDark ? themeColors.surfaceAlt : '#E0E0E0') : getRoleColor(item.role),
          }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: isManager ? themeColors.text.tertiary : '#FFFFFF' }}>
              {getRoleDisplay(item.role)}
            </Text>
          </View>
        </View>

        {/* Territory + Phone (long-press for options) + Last Active inline */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onLongPress={() => handlePhoneLongPress(item.phone)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 13, color: themeColors.text.tertiary }} numberOfLines={1}>
              {item.territory} • {formatPhoneForDisplay(item.phone)}
            </Text>
          </TouchableOpacity>
          {lastActiveText ? (
            <Text style={{
              fontSize: 12,
              fontWeight: '500',
              color: getThemedLastActiveColor(item.lastActiveAt),
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
            backgroundColor: isDark ? themeColors.surface : '#F9F9F9',
            borderRadius: 12,
            padding: 16,
            marginBottom: 8,
            borderWidth: 1,
            borderColor: themeColors.border.default,
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
          backgroundColor: themeColors.background,
          borderRadius: 12,
          padding: 16,
          marginBottom: 8,
          borderWidth: 1,
          borderColor: themeColors.border.default,
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
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      {/* Header - Compact single row design */}
      <View style={{
        backgroundColor: isDark ? themeColors.surface : '#393735',
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
          <Plus size={16} color={themeColors.accent} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: themeColors.accent }}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: themeColors.surface }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: themeColors.background,
          borderRadius: 8,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: themeColors.border.default,
        }}>
          <Search size={20} color={themeColors.text.tertiary} />
          <TextInput
            style={{
              flex: 1,
              paddingVertical: 12,
              paddingHorizontal: 8,
              fontSize: 16,
              color: themeColors.text.primary,
            }}
            placeholder="Search team members..."
            placeholderTextColor={themeColors.text.tertiary}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      {/* Status Filter Pills - horizontal scroll */}
      <View style={{ paddingBottom: 12, backgroundColor: themeColors.surface }}>
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
                  backgroundColor: isActive ? (isDark ? themeColors.accent : '#393735') : themeColors.background,
                  borderWidth: 1,
                  borderColor: isActive ? (isDark ? themeColors.accent : '#393735') : themeColors.border.default,
                }}
                onPress={() => setStatusFilter(filter.value as any)}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isActive ? (isDark ? themeColors.text.inverse : '#FFFFFF') : themeColors.text.secondary,
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
              <User size={48} color={themeColors.text.tertiary} />
              <Text style={{ fontSize: 16, color: themeColors.text.secondary, marginTop: 16 }}>
                {searchTerm ? 'No team members found' : 'No team members yet'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};
