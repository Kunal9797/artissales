import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2, Search, Plus, Phone, MapPin, Edit2 } from 'lucide-react-native';
import { api } from '../../services/api';
import { colors, spacing, typography } from '../../theme';
import { AccountType, AccountListItem } from '../../types';

type AccountsListScreenProps = NativeStackScreenProps<any, 'AccountsList'>;

export const AccountsListScreen: React.FC<AccountsListScreenProps> = ({ navigation }) => {
  const [accounts, setAccounts] = useState<AccountListItem[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<AccountType | 'all'>('all');

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    // Filter accounts locally
    let filtered = accounts;

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(a => a.type === selectedType);
    }

    // Filter by search term
    if (searchTerm.trim().length > 0) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(term) ||
        a.city.toLowerCase().includes(term) ||
        a.phone.includes(term)
      );
    }

    setFilteredAccounts(filtered);
  }, [accounts, searchTerm, selectedType]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const response = await api.getAccountsList({});
      if (response.ok) {
        setAccounts(response.accounts);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAccounts();
  };

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

  // ✅ Performance: Memoized render function with useCallback
  const renderAccountCard = useCallback(
    ({ item }: { item: AccountListItem }) => (
      <View style={styles.accountCard}>
        <View style={styles.accountCardContent}>
          <View style={[styles.accountIcon, { backgroundColor: `${getAccountTypeColor(item.type)}20` }]}>
            <Building2 size={24} color={getAccountTypeColor(item.type)} />
          </View>
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{item.name}</Text>
            <View style={styles.accountMeta}>
              <MapPin size={12} color={colors.text.tertiary} />
              <Text style={styles.accountMetaText}>
                {item.city}, {item.state}
              </Text>
            </View>
            <View style={styles.accountMeta}>
              <Phone size={12} color={colors.text.tertiary} />
              <Text style={styles.accountMetaText}>{item.phone || 'No phone'}</Text>
            </View>
          </View>
          <View style={[styles.accountTypeBadge, { backgroundColor: getAccountTypeColor(item.type) }]}>
            <Text style={styles.accountTypeBadgeText}>
              {getAccountTypeLabel(item.type)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => {
            navigation.navigate('EditAccount', {
              account: item,
              onAccountUpdated: () => loadAccounts(),
            });
          }}
        >
          <Edit2 size={18} color={colors.info} />
        </TouchableOpacity>
      </View>
    ),
    [navigation]
  );

  // ✅ Performance: Memoized key extractor
  const keyExtractor = useCallback((item: AccountListItem) => item.id, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddAccount')}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Manage Accounts</Text>
        <Text style={styles.subtitle}>
          {filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, city, or phone"
          placeholderTextColor={colors.text.secondary}
          value={searchTerm}
          onChangeText={setSearchTerm}
          autoCapitalize="none"
        />
      </View>

      {/* Type Filter Tabs */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            { value: 'all', label: 'All' },
            { value: 'distributor', label: 'Distributors' },
            { value: 'dealer', label: 'Dealers' },
            { value: 'architect', label: 'Architects' },
          ]}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedType === item.value && styles.filterChipActive,
              ]}
              onPress={() => setSelectedType(item.value as any)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedType === item.value && styles.filterChipTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Accounts List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading accounts...</Text>
        </View>
      ) : filteredAccounts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Building2 size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyText}>No accounts found</Text>
          <Text style={styles.emptySubtext}>
            {searchTerm || selectedType !== 'all'
              ? 'Try adjusting your filters'
              : 'Create your first account to get started'}
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('AddAccount')}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.emptyButtonText}>Add Account</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredAccounts}
          renderItem={renderAccountCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} />
          }
          // ✅ Performance: Optimizations for large lists
          windowSize={8} // Reduced from default 21 (render 8 items ahead/behind)
          removeClippedSubviews={true} // Remove offscreen items from native view hierarchy
          maxToRenderPerBatch={10} // Render 10 items per batch
          updateCellsBatchingPeriod={50} // Batch updates every 50ms
          initialNumToRender={15} // Render 15 items initially
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
    fontWeight: typography.fontWeight.semibold,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: spacing.screenPadding,
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
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.md,
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
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: spacing.screenPadding,
  },
  accountCard: {
    backgroundColor: '#fff',
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountCardContent: {
    flex: 1,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  editButton: {
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border.default,
  },
  accountCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  accountIcon: {
    width: 48,
    height: 48,
    borderRadius: spacing.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  accountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs / 2,
    marginTop: spacing.xs / 2,
  },
  accountMetaText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
  },
  accountTypeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: spacing.borderRadius.sm,
  },
  accountTypeBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
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
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    marginTop: spacing.lg,
  },
  emptyButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: '#fff',
  },
});
