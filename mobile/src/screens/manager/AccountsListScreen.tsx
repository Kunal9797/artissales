import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2, Search, Plus, Edit2 } from 'lucide-react-native';
import { colors, spacing, typography } from '../../theme';
import { AccountType, AccountListItem } from '../../types';
import { EmptyState, ErrorState, Skeleton } from '../../patterns';
import { useAccounts, Account } from '../../hooks/useAccounts';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

type AccountsListScreenProps = NativeStackScreenProps<any, 'AccountsList'>;

export const AccountsListScreen: React.FC<AccountsListScreenProps> = ({ navigation }) => {
  const bottomPadding = useBottomSafeArea(12);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<AccountType | 'all'>('all');

  // Use the updated hook with pagination - pass type filter to server
  const {
    accounts,
    loading,
    loadingMore,
    error,
    isOffline,
    hasMore,
    refreshAccounts,
    loadMore,
  } = useAccounts({
    type: selectedType === 'all' ? undefined : selectedType,
    sortBy: 'name',
    sortDir: 'asc',
  });

  // Debounce search term (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Client-side search filter (Firestore doesn't support full-text search)
  const filteredAccounts = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return accounts;
    }
    const term = debouncedSearchTerm.toLowerCase();
    return accounts.filter(a =>
      a.name.toLowerCase().includes(term) ||
      a.city.toLowerCase().includes(term) ||
      (a.phone && a.phone.includes(term))
    );
  }, [accounts, debouncedSearchTerm]);

  const getAccountTypeColor = (type: AccountType): string => {
    switch (type) {
      case 'distributor':
        return colors.info;
      case 'dealer':
        return colors.warning;
      case 'architect':
        return '#9C27B0';
      default:
        return colors.text.tertiary;
    }
  };

  const getAccountTypeLabel = (type: AccountType): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  // Memoized render function
  const renderAccountCard = useCallback(
    ({ item }: { item: Account }) => (
      <TouchableOpacity
        style={styles.accountCard}
        onPress={() => {
          navigation.navigate('AccountDetail', {
            accountId: item.id,
          });
        }}
        activeOpacity={0.7}
      >
        {/* Name + Edit */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.accountName} numberOfLines={1}>
            {item.name}
          </Text>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate('EditAccount', {
                account: item,
                onAccountUpdated: refreshAccounts,
              });
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 4,
              backgroundColor: '#F5F5F5',
            }}
          >
            <Edit2 size={14} color="#666666" />
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#666666' }}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Badge + Meta inline */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <View style={[styles.accountTypeBadge, { backgroundColor: getAccountTypeColor(item.type) }]}>
            <Text style={styles.accountTypeBadgeText}>
              {getAccountTypeLabel(item.type)}
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
          <Text style={{ fontSize: 13, color: '#666666' }} numberOfLines={1}>
            {item.city}, {item.state.substring(0, 2).toUpperCase()}
          </Text>
          <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
          <Text style={{ fontSize: 13, color: '#666666' }}>
            {item.phone ? item.phone.substring(0, 13) + '...' : 'No phone'}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    [navigation, refreshAccounts]
  );

  // Memoized key extractor
  const keyExtractor = useCallback((item: Account) => item.id, []);

  // Footer component for loading more indicator
  const ListFooterComponent = useCallback(() => {
    if (loadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        </View>
      );
    }
    return null;
  }, [loadingMore]);

  // Prepare filter chips
  const filterChips = [
    { label: 'All', value: 'all', active: selectedType === 'all' },
    { label: 'Distributors', value: 'distributor', active: selectedType === 'distributor' },
    { label: 'Dealers', value: 'dealer', active: selectedType === 'dealer' },
    { label: 'Architects', value: 'architect', active: selectedType === 'architect' },
    { label: 'OEMs', value: 'OEM', active: selectedType === 'OEM' },
  ];

  return (
    <View style={styles.container}>
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
              Accounts
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 }}>
              {filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'}
              {hasMore && !debouncedSearchTerm ? '+' : ''}
              {isOffline ? ' (offline)' : ''}
            </Text>
          </View>

          {/* Add Account Button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#C9A961',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            onPress={() => navigation.navigate('AddAccount')}
          >
            <Plus size={18} color="#393735" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#393735' }}>Add</Text>
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
            placeholder="Search accounts..."
            placeholderTextColor="#999999"
            value={searchTerm}
            onChangeText={setSearchTerm}
            autoCapitalize="none"
          />
        </View>
      </View>

      {/* Type Filter Pills */}
      <View style={{ paddingBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {filterChips.map((chip) => (
            <TouchableOpacity
              key={chip.value}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: chip.active ? '#393735' : '#FFFFFF',
                borderWidth: 1,
                borderColor: chip.active ? '#393735' : '#E0E0E0',
              }}
              onPress={() => setSelectedType(chip.value as AccountType | 'all')}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                color: chip.active ? '#FFFFFF' : '#666666',
              }}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content Area */}
      {loading ? (
        <View style={styles.content}>
          <Skeleton rows={3} avatar />
          <Skeleton rows={3} avatar />
          <Skeleton rows={3} avatar />
        </View>
      ) : error ? (
        <ErrorState message={error} retry={refreshAccounts} />
      ) : filteredAccounts.length === 0 ? (
        <EmptyState
          icon={<Building2 size={48} color={colors.text.tertiary} />}
          title="No accounts found"
          subtitle={
            searchTerm || selectedType !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first account to get started'
          }
          primaryAction={{
            label: 'Add Account',
            onPress: () => navigation.navigate('AddAccount'),
          }}
        />
      ) : (
        <FlashList
          data={filteredAccounts}
          renderItem={renderAccountCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ ...styles.listContent, paddingBottom: 80 + bottomPadding }}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refreshAccounts}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={ListFooterComponent}
          estimatedItemSize={80}
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
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backButton: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
  },
  addButton: {
    backgroundColor: colors.accent,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  searchAndFiltersSection: {
    backgroundColor: colors.background,
    paddingBottom: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  filtersScroll: {
    marginTop: spacing.xs,
  },
  filtersScrollContent: {
    paddingHorizontal: spacing.screenPadding,
  },
  filterChip: {
    paddingHorizontal: spacing.lg,
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
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: typography.fontWeight.bold,
  },
  content: {
    flex: 1,
    padding: spacing.screenPadding,
  },
  listContent: {
    padding: 16,
  },
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  accountTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  accountTypeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
});
