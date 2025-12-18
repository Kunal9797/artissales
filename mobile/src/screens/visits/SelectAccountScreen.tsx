import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect } from '@react-navigation/native';
import { Search, Plus, Info, WifiOff, RefreshCw, CloudOff } from 'lucide-react-native';
import { getAuth } from '@react-native-firebase/auth';
import { useAccounts, Account } from '../../hooks/useAccounts';
import { useMyVisits } from '../../hooks/useMyVisits';
import { colors, spacing, typography } from '../../theme';
import { Skeleton } from '../../patterns';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

interface FilterByUserVisits {
  userId: string;
  userName: string;
  visitData: Record<string, { count: number; lastVisit: string }>;
}

interface SelectAccountScreenProps {
  navigation?: any;
  route?: {
    params?: {
      mode?: 'select' | 'manage';  // 'select' for LogVisit flow, 'manage' for AccountDetail flow
      filterByUserVisits?: FilterByUserVisits;
    };
  };
}

type AccountTypeFilter = 'all' | 'distributor' | 'dealer' | 'architect' | 'OEM';

export const SelectAccountScreen: React.FC<SelectAccountScreenProps> = ({ navigation, route }) => {
  // Mode determines behavior: 'select' goes to LogVisit, 'manage' goes to AccountDetail
  const mode = route?.params?.mode || 'select';
  const filterByUserVisits = route?.params?.filterByUserVisits;
  const { accounts, loading, syncing, error, isOffline, isStale, hasPendingCreations, refreshAccounts } = useAccounts();
  const { visitMap, loading: visitsLoading } = useMyVisits();

  // Safe area insets for bottom padding (accounts for Android nav bar)
  const bottomPadding = useBottomSafeArea(12);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AccountTypeFilter>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh accounts when screen comes into focus (e.g., after adding a new account)
  useFocusEffect(
    useCallback(() => {
      // Refresh accounts data when screen gains focus
      refreshAccounts?.();
    }, [refreshAccounts])
  );

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshAccounts?.();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshAccounts]);

  // Get current user ID for sorting (use getAuth().currentUser for reliable uid access)
  const authInstance = getAuth();
  const currentUserId = authInstance.currentUser?.uid;

  // Debug: Log user ID and accounts on mount
  useEffect(() => {
    if (accounts.length > 0) {
      const userCreatedCount = accounts.filter(a => a.createdByUserId === currentUserId).length;
      logger.info(`[SelectAccount] Current user ID: ${currentUserId}`);
      logger.info(`[SelectAccount] Total accounts: ${accounts.length}, User created: ${userCreatedCount}`);
      // Log first 3 accounts to see createdByUserId values
      accounts.slice(0, 3).forEach((a, i) => {
        logger.info(`[SelectAccount] Account ${i}: ${a.name}, createdBy: ${a.createdByUserId}, isUserCreated: ${a.createdByUserId === currentUserId}`);
      });
    }
  }, [accounts, currentUserId]);

  // Filter accounts based on search query and type, sort by user-created first, then my recent visits
  const filteredAccounts = useMemo(() => {
    let filtered = accounts;

    // Filter by user visits if specified (from manager viewing rep's accounts)
    if (filterByUserVisits) {
      const visitedIds = Object.keys(filterByUserVisits.visitData);
      filtered = filtered.filter((account) => visitedIds.includes(account.id));
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter((account) => account.type === selectedType);
    }

    // Then filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (account) =>
          account.name.toLowerCase().includes(query) ||
          account.city.toLowerCase().includes(query) ||
          account.contactPerson?.toLowerCase().includes(query) ||
          account.type.toLowerCase().includes(query)
      );
    }

    // Sort based on context
    if (filterByUserVisits) {
      // When viewing user's visited accounts: sort by visit count (highest first)
      filtered = [...filtered].sort((a, b) => {
        const aCount = filterByUserVisits.visitData[a.id]?.count || 0;
        const bCount = filterByUserVisits.visitData[b.id]?.count || 0;
        if (aCount !== bCount) {
          return bCount - aCount; // Highest visit count first
        }
        return a.name.localeCompare(b.name);
      });
    } else {
      // Default sorting: user-created accounts first, then by my recent visits, then alphabetical
      filtered = [...filtered].sort((a, b) => {
        const aIsUserCreated = a.createdByUserId === currentUserId;
        const bIsUserCreated = b.createdByUserId === currentUserId;

        // Priority 1: User-created accounts come first
        if (aIsUserCreated && !bIsUserCreated) return -1;
        if (!aIsUserCreated && bIsUserCreated) return 1;

        // Priority 2: Accounts I visited recently (from visitMap - my own visits)
        const aMyVisit = visitMap.get(a.id) || 0;
        const bMyVisit = visitMap.get(b.id) || 0;

        // If both have visits or both don't, compare visit times
        if (aMyVisit !== bMyVisit) {
          // Most recent visit first (higher timestamp = more recent)
          return bMyVisit - aMyVisit;
        }

        // Priority 3: Alphabetical for accounts with same visit status
        return a.name.localeCompare(b.name);
      });
    }

    return filtered;
  }, [accounts, searchQuery, selectedType, currentUserId, visitMap, filterByUserVisits]);

  const handleSelectAccount = (account: Account) => {
    if (mode === 'manage') {
      // Manager mode - go to AccountDetail
      // Pass account object for instant display while visits load
      navigation.navigate('AccountDetail', { accountId: account.id, account });
    } else {
      // Select mode - go to LogVisit
      // Helper function to safely convert date to ISO string
      const safeToISOString = (date: any): string | null => {
        if (!date) return null;
        try {
          if (date instanceof Date) {
            // Check if date is valid
            if (isNaN(date.getTime())) return null;
            return date.toISOString();
          }
          if (date.toDate && typeof date.toDate === 'function') {
            const d = date.toDate();
            if (isNaN(d.getTime())) return null;
            return d.toISOString();
          }
          return null;
        } catch (error) {
          console.error('Error converting date to ISO string:', error);
          return null;
        }
      };

      // Sanitize account data - convert Dates/Timestamps to ISO strings for navigation
      const sanitizedAccount = {
        ...account,
        lastVisitAt: safeToISOString(account.lastVisitAt),
        createdAt: safeToISOString(account.createdAt),
        updatedAt: safeToISOString(account.updatedAt),
      };
      navigation.navigate('LogVisit', { account: sanitizedAccount });
    }
  };

  const getAccountTypeColor = (type: string): string => {
    switch (type) {
      case 'distributor':
        return '#1976D2'; // Blue
      case 'dealer':
        return '#388E3C'; // Green
      case 'architect':
        return '#F57C00'; // Orange
      case 'OEM':
        return '#7B1FA2'; // Purple
      default:
        return '#666666';
    }
  };

  const renderAccount = ({ item }: { item: Account }) => {
    const isPending = item._syncStatus === 'pending';
    const isFailed = item._syncStatus === 'failed';

    return (
      <TouchableOpacity
        style={[
          styles.accountCard,
          isPending && styles.accountCardPending,
          isFailed && styles.accountCardFailed,
        ]}
        onPress={() => handleSelectAccount(item)}
        activeOpacity={0.7}
      >
        {/* Compact single-row layout */}
        <View style={styles.accountCardContent}>
          {/* Type badge - left side indicator */}
          <View style={[styles.typeBadge, { backgroundColor: getAccountTypeColor(item.type) }]}>
            <Text style={styles.typeBadgeText}>
              {item.type === 'distributor' ? 'D' : item.type === 'dealer' ? 'DL' : item.type === 'architect' ? 'A' : 'O'}
            </Text>
          </View>

          {/* Main content - name and location */}
          <View style={styles.accountInfo}>
            <View style={styles.accountNameRow}>
              <Text style={styles.accountName} numberOfLines={1}>
                {item.name}
              </Text>
              {isPending && (
                <View style={styles.syncBadge}>
                  <ActivityIndicator size={8} color="#856404" />
                </View>
              )}
              {isFailed && (
                <View style={styles.failedBadge}>
                  <CloudOff size={10} color="#DC3545" />
                </View>
              )}
            </View>
            <Text style={styles.accountLocation} numberOfLines={1}>
              {item.city}, {item.state.substring(0, 2).toUpperCase()}
            </Text>
            {/* Visit badge - manager viewing rep's accounts (with count) */}
            {filterByUserVisits?.visitData[item.id] && (
              <View style={styles.visitBadge}>
                <Text style={styles.visitBadgeText}>
                  {filterByUserVisits.visitData[item.id].count} visits
                  {filterByUserVisits.visitData[item.id].lastVisit && (
                    ` • Last: ${new Date(filterByUserVisits.visitData[item.id].lastVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                  )}
                </Text>
              </View>
            )}
            {/* Visit badge - sales rep's own last visit (from visitMap) */}
            {!filterByUserVisits && visitMap.get(item.id) && (
              <View style={styles.visitBadge}>
                <Text style={styles.visitBadgeText}>
                  Last visit: {new Date(visitMap.get(item.id)!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </Text>
              </View>
            )}
          </View>

          {/* Info button - view account details */}
          {!isPending && !isFailed && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate('AccountDetail', { accountId: item.id, account: item });
              }}
              style={styles.infoButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Info size={18} color={colors.primary} />
            </TouchableOpacity>
          )}

          {/* Chevron indicator */}
          <View style={styles.chevronContainer}>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Real header - no skeleton needed here */}
        <View style={{
          backgroundColor: '#393735',
          paddingTop: 52,
          paddingBottom: 14,
          paddingHorizontal: 16,
        }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }}>
            {filterByUserVisits
              ? `${filterByUserVisits.userName}'s Accounts`
              : (mode === 'manage' ? 'Accounts' : 'Select Account')}
          </Text>
        </View>
        {/* Skeleton for content */}
        <View style={{ padding: spacing.lg }}>
          <Skeleton rows={3} avatar />
          <Skeleton rows={3} avatar />
          <Skeleton rows={3} avatar />
        </View>
      </View>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <WifiOff size={48} color={colors.text.tertiary} style={{ marginBottom: 16 }} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={refreshAccounts}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Filter options for pills
  const filterOptions: { label: string; value: AccountTypeFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Dealers', value: 'dealer' },
    { label: 'Architects', value: 'architect' },
    { label: 'OEMs', value: 'OEM' },
    { label: 'Distributors', value: 'distributor' },
  ];

  return (
    <View style={styles.container}>
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
          {filterByUserVisits
            ? `${filterByUserVisits.userName}'s Accounts`
            : (mode === 'manage' ? 'Accounts' : 'Select Account')}
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
          onPress={() => {
            if (mode === 'manage') {
              navigation.navigate('AddAccount');
            } else {
              navigation.navigate('AddAccount', {
                onAccountCreated: (accountId: string) => {
                  navigation.navigate('LogVisit', { accountId });
                }
              });
            }
          }}
        >
          <Plus size={16} color="#C9A961" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#C9A961' }}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar with sync indicator */}
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
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {syncing && (
            <ActivityIndicator size="small" color="#999999" />
          )}
          {!syncing && isStale && !isOffline && (
            <TouchableOpacity onPress={refreshAccounts} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <RefreshCw size={18} color="#999999" />
            </TouchableOpacity>
          )}
          {!syncing && isOffline && (
            <WifiOff size={18} color="#856404" />
          )}
        </View>
      </View>

      {/* Filter Pills - horizontal scroll */}
      <View style={{ paddingBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {filterOptions.map((option) => {
            const isActive = selectedType === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 16,
                  backgroundColor: isActive ? '#393735' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: isActive ? '#393735' : '#E0E0E0',
                }}
                onPress={() => setSelectedType(option.value)}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isActive ? '#FFFFFF' : '#666666',
                }}>
                  {option.label}{isActive ? ` (${filteredAccounts.length})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {filteredAccounts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No accounts found matching your search' : 'No accounts assigned to you'}
          </Text>
        </View>
      ) : (
        <FlashList
          data={filteredAccounts}
          renderItem={renderAccount}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 80 + bottomPadding }]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#C9A961']}
              tintColor="#C9A961"
              title="Pull to refresh"
              titleColor="#999999"
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  // Compact account card - modern list item style
  accountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
  },
  accountCardPending: {
    borderLeftWidth: 3,
    borderLeftColor: '#C9A961',
  },
  accountCardFailed: {
    borderLeftWidth: 3,
    borderLeftColor: '#DC3545',
  },
  accountCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
  },
  // Type badge - compact circle indicator
  typeBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Account info section
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
  },
  accountLocation: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  // Sync status badges
  syncBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFF3CD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  failedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Visit badge for filtered view
  visitBadge: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  visitBadgeText: {
    fontSize: 11,
    color: '#2196F3',
    fontWeight: '500',
  },
  // Info button
  infoButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  // Chevron
  chevronContainer: {
    width: 20,
    alignItems: 'center',
  },
  chevron: {
    fontSize: 22,
    color: '#CCC',
    fontWeight: '300',
  },
  // Other styles
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: spacing.xl * 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl * 2,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
