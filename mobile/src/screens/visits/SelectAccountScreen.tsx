import React, { useState, useMemo, useEffect } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Search, MapPin, User, Plus, Edit2, WifiOff, Clock, RefreshCw, CloudOff, Loader } from 'lucide-react-native';
import { getAuth } from '@react-native-firebase/auth';
import { useAccounts, Account } from '../../hooks/useAccounts';
import { useMyVisits } from '../../hooks/useMyVisits';
import { colors, spacing, typography, shadows } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { Skeleton } from '../../patterns';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

interface SelectAccountScreenProps {
  navigation: any;
}

type AccountTypeFilter = 'all' | 'distributor' | 'dealer' | 'architect' | 'OEM';

export const SelectAccountScreen: React.FC<SelectAccountScreenProps> = ({ navigation }) => {
  const { accounts, loading, syncing, error, isOffline, isStale, hasPendingCreations, refreshAccounts } = useAccounts();
  const { visitMap, loading: visitsLoading } = useMyVisits();
  const { user } = useAuth();

  // Safe area insets for bottom padding (accounts for Android nav bar)
  const bottomPadding = useBottomSafeArea(12);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AccountTypeFilter>('all');

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

    // Filter by type first
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

    // Sort: user-created accounts first, then by my recent visits, then alphabetical
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

    return filtered;
  }, [accounts, searchQuery, selectedType, currentUserId, visitMap]);

  const handleSelectAccount = (account: Account) => {
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
  };

  // Check if current user can edit this account
  const canEditAccount = (account: Account): boolean => {
    if (!user) {
      return false;
    }

    // The Firebase user object properties are getters, need to access differently
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser;
    const userId = currentUser?.uid;

    // Admin and National Head can edit any account
    if (user.role === 'admin' || user.role === 'national_head') {
      return true;
    }

    // Reps can only edit dealers/architects/OEMs they created
    if (user.role === 'rep') {
      const isCorrectType = account.type === 'dealer' || account.type === 'architect' || account.type === 'OEM';
      const isCreatedByUser = account.createdByUserId === userId;
      return isCorrectType && isCreatedByUser;
    }

    return false;
  };

  const handleEditAccount = (account: Account, event: any) => {
    event.stopPropagation(); // Prevent card click
    navigation.navigate('EditAccount', {
      account,
      onAccountUpdated: () => refreshAccounts?.(),
    });
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

  const getAccountTypeLabel = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const renderAccount = ({ item }: { item: Account }) => {
    const showEditButton = canEditAccount(item);
    const isPending = item._syncStatus === 'pending';
    const isFailed = item._syncStatus === 'failed';

    return (
      <TouchableOpacity
        style={[
          styles.accountCard,
          isPending && { borderLeftWidth: 3, borderLeftColor: '#C9A961' },
          isFailed && { borderLeftWidth: 3, borderLeftColor: '#DC3545' },
        ]}
        onPress={() => handleSelectAccount(item)}
        activeOpacity={0.7}
      >
        {/* Name + Edit (Row 1) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text style={styles.accountName} numberOfLines={1}>
              {item.name}
            </Text>
            {isPending && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3CD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <ActivityIndicator size={10} color="#856404" />
                <Text style={{ fontSize: 10, color: '#856404', fontWeight: '500' }}>Syncing</Text>
              </View>
            )}
            {isFailed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8D7DA', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <CloudOff size={10} color="#721C24" />
                <Text style={{ fontSize: 10, color: '#721C24', fontWeight: '500' }}>Failed</Text>
              </View>
            )}
          </View>
          {showEditButton && !isPending && !isFailed && (
            <TouchableOpacity
              onPress={(e) => handleEditAccount(item, e)}
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
          )}
        </View>

        {/* Badge + Location inline (Row 2) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: getAccountTypeColor(item.type) }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
              {getAccountTypeLabel(item.type)}
            </Text>
          </View>
          <Text style={{ fontSize: 13, color: '#666666' }}>•</Text>
          <Text style={{ fontSize: 13, color: '#666666' }} numberOfLines={1}>
            {item.city}, {item.state.substring(0, 2).toUpperCase()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{
          backgroundColor: '#393735',
          paddingHorizontal: 24,
          paddingTop: 52,
          paddingBottom: 16,
        }}>
          <Skeleton rows={1} />
        </View>
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

  return (
    <View style={styles.container}>
      {/* Header - Match Manager Design */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>
              Select Account
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)' }}>
                {filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'}
              </Text>
              {syncing && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <ActivityIndicator size="small" color="rgba(255, 255, 255, 0.7)" />
                  <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>Syncing...</Text>
                </View>
              )}
              {!syncing && isStale && (
                <TouchableOpacity
                  onPress={refreshAccounts}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                >
                  <RefreshCw size={12} color="rgba(255, 255, 255, 0.6)" />
                  <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>Tap to refresh</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Add Account Button - Sales reps can only create Dealer/Architect/OEM */}
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
            onPress={() => navigation.navigate('AddAccount', {
              onAccountCreated: (accountId: string) => {
                navigation.navigate('LogVisit', { accountId });
              }
            })}
          >
            <Plus size={18} color="#393735" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#393735' }}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offline Banner - Show when using cached data */}
      {isOffline && accounts.length > 0 && (
        <View style={styles.offlineBanner}>
          <WifiOff size={16} color="#856404" />
          <Text style={styles.offlineBannerText}>
            You're offline. Showing cached accounts.
          </Text>
        </View>
      )}

      {/* Search Bar - Match Manager Design */}
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
        </View>
      </View>

      {/* Filter Pills - Sales Rep Order (Distributors at end) */}
      <View style={{ paddingBottom: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: selectedType === 'all' ? '#393735' : '#FFFFFF',
              borderWidth: 1,
              borderColor: selectedType === 'all' ? '#393735' : '#E0E0E0',
            }}
            onPress={() => setSelectedType('all')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: selectedType === 'all' ? '#FFFFFF' : '#666666',
            }}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: selectedType === 'dealer' ? '#393735' : '#FFFFFF',
              borderWidth: 1,
              borderColor: selectedType === 'dealer' ? '#393735' : '#E0E0E0',
            }}
            onPress={() => setSelectedType('dealer')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: selectedType === 'dealer' ? '#FFFFFF' : '#666666',
            }}>
              Dealers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: selectedType === 'architect' ? '#393735' : '#FFFFFF',
              borderWidth: 1,
              borderColor: selectedType === 'architect' ? '#393735' : '#E0E0E0',
            }}
            onPress={() => setSelectedType('architect')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: selectedType === 'architect' ? '#FFFFFF' : '#666666',
            }}>
              Architects
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: selectedType === 'OEM' ? '#393735' : '#FFFFFF',
              borderWidth: 1,
              borderColor: selectedType === 'OEM' ? '#393735' : '#E0E0E0',
            }}
            onPress={() => setSelectedType('OEM')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: selectedType === 'OEM' ? '#FFFFFF' : '#666666',
            }}>
              OEMs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 16,
              backgroundColor: selectedType === 'distributor' ? '#393735' : '#FFFFFF',
              borderWidth: 1,
              borderColor: selectedType === 'distributor' ? '#393735' : '#E0E0E0',
            }}
            onPress={() => setSelectedType('distributor')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: selectedType === 'distributor' ? '#FFFFFF' : '#666666',
            }}>
              Distributors
            </Text>
          </TouchableOpacity>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  listContainer: {
    padding: spacing.lg,
    // paddingBottom set dynamically via useBottomSafeArea hook (80 + bottomPadding)
  },
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.sm,
    padding: spacing.lg,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3CD',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE69C',
  },
  offlineBannerText: {
    fontSize: 13,
    color: '#856404',
    fontWeight: '500',
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
