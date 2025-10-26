import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { User, Search, ChevronRight, Filter } from 'lucide-react-native';
import { api } from '../../services/api';
import { colors, spacing, typography } from '../../theme';
import { UserListItem } from '../../types';
import { Skeleton } from '../../patterns';

type UserListScreenProps = NativeStackScreenProps<any, 'UserList'>;

export const UserListScreen: React.FC<UserListScreenProps> = ({ navigation }) => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    // Filter users locally
    let filtered = users;

    if (selectedRole !== 'all') {
      filtered = filtered.filter(u => u.role === selectedRole);
    }

    if (searchTerm.trim().length > 0) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(term) ||
        u.phone.includes(term) ||
        u.territory.toLowerCase().includes(term)
      );
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, selectedRole]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await api.getUsersList({});
      if (response.ok && response.users) {
        setUsers(response.users);
      }
    } catch (error: any) {
      logger.error('[UserList] Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
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
    const colorMap: Record<string, string> = {
      rep: '#2196F3',
      area_manager: '#4CAF50',
      zonal_head: '#FF9800',
      national_head: '#9C27B0',
      admin: '#F44336',
    };
    return colorMap[role] || '#757575';
  };

  // ✅ Performance: Memoized render function with useCallback
  const renderUserCard = useCallback(
    ({ item }: { item: UserListItem }) => (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.navigate('UserDetail', { userId: item.id })}
      >
        <View style={styles.userCardLeft}>
          <View style={[styles.userIcon, { backgroundColor: `${getRoleColor(item.role)}20` }]}>
            <User size={24} color={getRoleColor(item.role)} />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userTerritory}>{item.territory}</Text>
            <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
              <Text style={styles.roleBadgeText}>{getRoleDisplay(item.role)}</Text>
            </View>
          </View>
        </View>
        <ChevronRight size={20} color={colors.text.tertiary} />
      </TouchableOpacity>
    ),
    [navigation]
  );

  // ✅ Performance: Memoized key extractor
  const keyExtractor = useCallback((item: UserListItem) => item.id, []);

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
        <Text style={styles.title}>Team Members</Text>
        <Text style={styles.subtitle}>{filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone, or territory"
          placeholderTextColor={colors.text.secondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
        />
      </View>

      {/* Role Filter */}
      <View style={styles.filterContainer}>
        <Filter size={16} color={colors.text.secondary} />
        <Text style={styles.filterLabel}>Role:</Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { value: 'all', label: 'All' },
            { value: 'rep', label: 'Sales Reps' },
            { value: 'area_manager', label: 'Area Managers' },
            { value: 'zonal_head', label: 'Zonal Heads' },
          ]}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedRole === item.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedRole(item.value)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedRole === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* User List */}
      {loading && filteredUsers.length === 0 ? (
        <View style={styles.content}>
          <Skeleton rows={3} avatar />
          <Skeleton rows={3} avatar />
          <Skeleton rows={3} avatar />
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <User size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyText}>No users found</Text>
          <Text style={styles.emptySubtext}>
            {searchTerm || selectedRole !== 'all'
              ? 'Try adjusting your filters'
              : 'No team members available'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredUsers}
          renderItem={renderUserCard}
          keyExtractor={keyExtractor}
          estimatedItemSize={80}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadUsers} colors={[colors.accent]} />
          }
        />
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
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    marginRight: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: spacing.lg,
  },
  userCard: {
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
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  userIcon: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 4,
  },
  userTerritory: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.borderRadius.sm,
  },
  roleBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
