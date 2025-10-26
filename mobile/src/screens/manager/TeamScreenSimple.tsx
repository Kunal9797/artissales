/**
import { logger } from '../../utils/logger';
 * TeamScreen - Simple Version
 * Built with inline styles to avoid StyleSheet.create issues
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { User, Search, Phone, MapPin, CheckCircle, XCircle } from 'lucide-react-native';
import { api } from '../../services/api';
import { UserListItem } from '../../types';
import { Skeleton } from '../../patterns';

export const TeamScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.getUsersList({});
      if (response.ok && response.users) {
        setUsers(response.users);
        setFilteredUsers(response.users);
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

    setFilteredUsers(filtered);
  }, [searchTerm, users, statusFilter]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
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

  const renderUser = ({ item }: { item: UserListItem }) => (
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
      {/* Name + Role Badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: '#1A1A1A',
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
          backgroundColor: getRoleColor(item.role),
        }}>
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
            {getRoleDisplay(item.role)}
          </Text>
        </View>
      </View>

      {/* Territory + Phone inline */}
      <Text style={{ fontSize: 13, color: '#666666' }}>
        {item.territory} • {item.phone}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>
              Team
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 }}>
              {filteredUsers.length} members
            </Text>
          </View>

          {/* Add User Button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#C9A961',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
            }}
            onPress={() => navigation?.navigate('AddUser')}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#393735' }}>+</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#393735' }}>Add User</Text>
          </TouchableOpacity>
        </View>
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

      {/* Status Filter Pills - Matching Review and Accounts style */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[
            { value: 'all', label: 'All', count: users.length },
            { value: 'active', label: 'Active', count: users.filter(u => u.isActive).length },
            { value: 'inactive', label: 'Inactive', count: users.filter(u => !u.isActive).length },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: statusFilter === filter.value ? '#393735' : '#FFFFFF',
                borderWidth: 1,
                borderColor: statusFilter === filter.value ? '#393735' : '#E0E0E0',
              }}
              onPress={() => setStatusFilter(filter.value as any)}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: statusFilter === filter.value ? '#FFFFFF' : '#666666',
              }}>
                {filter.label} ({filter.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
          estimatedItemSize={80}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
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
