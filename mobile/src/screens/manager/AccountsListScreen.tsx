import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2, Search, Plus, Phone, MapPin, Edit2 } from 'lucide-react-native';
import { api } from '../../services/api';
import { colors, spacing, typography } from '../../theme';
import { AccountType, AccountListItem } from '../../types';
import { EmptyState, ErrorState, Skeleton, FiltersBar } from '../../patterns';
import type { Chip } from '../../patterns';

type AccountsListScreenProps = NativeStackScreenProps<any, 'AccountsList'>;

export const AccountsListScreen: React.FC<AccountsListScreenProps> = ({ navigation }) => {
  const [accounts, setAccounts] = useState<AccountListItem[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<AccountListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      setError(null);
      const response = await api.getAccountsList({});
      if (response.ok) {
        setAccounts(response.accounts);
      } else {
        setError('Failed to load accounts');
      }
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
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

  // Prepare filter chips
  const filterChips: Chip[] = [
    { label: 'All', value: 'all', active: selectedType === 'all' },
    { label: 'Distributors', value: 'distributor', active: selectedType === 'distributor' },
    { label: 'Dealers', value: 'dealer', active: selectedType === 'dealer' },
    { label: 'Architects', value: 'architect', active: selectedType === 'architect' },
    { label: 'Contractors', value: 'contractor', active: selectedType === 'contractor' },
  ];

  // Calculate KPIs
  const totalAccounts = accounts.length;
  const distributorCount = accounts.filter(a => a.type === 'distributor').length;
  const dealerCount = accounts.filter(a => a.type === 'dealer').length;
  const architectCount = accounts.filter(a => a.type === 'architect').length;
  const contractorCount = accounts.filter(a => a.type === 'contractor').length;

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

      {/* Stats Summary - Compact inline format */}
      {!loading && !error && accounts.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsScrollContent}
        >
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalAccounts}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{distributorCount}</Text>
              <Text style={styles.statLabel}>Distributors</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{dealerCount}</Text>
              <Text style={styles.statLabel}>Dealers</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{architectCount}</Text>
              <Text style={styles.statLabel}>Architects</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{contractorCount}</Text>
              <Text style={styles.statLabel}>Contractors</Text>
            </View>
          </View>
        </ScrollView>
      )}

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

      {/* Filter Chips */}
      <FiltersBar
        chips={filterChips}
        onChipToggle={(value) => setSelectedType(value as AccountType | 'all')}
      />

      {/* Content Area */}
      {loading ? (
        <View style={styles.content}>
          <Skeleton rows={3} avatar />
          <Skeleton rows={3} avatar />
          <Skeleton rows={3} avatar />
        </View>
      ) : error ? (
        <ErrorState message={error} retry={loadAccounts} />
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
        <FlatList
          data={filteredAccounts}
          renderItem={renderAccountCard}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          // ✅ Performance: Optimizations for large lists
          windowSize={8}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
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
  statsScrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.sm,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  statValue: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border.light,
    marginHorizontal: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: spacing.screenPadding,
    marginTop: spacing.sm,
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
  content: {
    flex: 1,
    padding: spacing.screenPadding,
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
});
