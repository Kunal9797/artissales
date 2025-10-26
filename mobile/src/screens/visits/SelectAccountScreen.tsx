import React, { useState, useMemo } from 'react';
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
import { Search, MapPin, User, Plus, Edit2 } from 'lucide-react-native';
import { getAuth } from '@react-native-firebase/auth';
import { useAccounts, Account } from '../../hooks/useAccounts';
import { colors, spacing, typography, shadows } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { Skeleton } from '../../patterns';

interface SelectAccountScreenProps {
  navigation: any;
}

type AccountTypeFilter = 'all' | 'distributor' | 'dealer' | 'architect' | 'contractor';

export const SelectAccountScreen: React.FC<SelectAccountScreenProps> = ({ navigation }) => {
  const { accounts, loading, error, refreshAccounts } = useAccounts();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<AccountTypeFilter>('all');

  // Filter accounts based on search query and type
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

    return filtered;
  }, [accounts, searchQuery, selectedType]);

  const handleSelectAccount = (account: Account) => {
    // Sanitize account data - convert Dates/Timestamps to ISO strings for navigation
    const sanitizedAccount = {
      ...account,
      lastVisitAt: account.lastVisitAt
        ? (account.lastVisitAt instanceof Date
          ? account.lastVisitAt.toISOString()
          : account.lastVisitAt.toDate?.()?.toISOString?.() || null)
        : null,
      createdAt: account.createdAt
        ? (account.createdAt instanceof Date
          ? account.createdAt.toISOString()
          : account.createdAt.toDate?.()?.toISOString?.() || null)
        : null,
      updatedAt: account.updatedAt
        ? (account.updatedAt instanceof Date
          ? account.updatedAt.toISOString()
          : account.updatedAt.toDate?.()?.toISOString?.() || null)
        : null,
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

    // Reps can only edit dealers/architects/contractors they created
    if (user.role === 'rep') {
      const isCorrectType = account.type === 'dealer' || account.type === 'architect' || account.type === 'contractor';
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
      case 'contractor':
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

    return (
      <TouchableOpacity
        style={styles.accountCard}
        onPress={() => handleSelectAccount(item)}
        activeOpacity={0.7}
      >
        {/* Name + Edit (Row 1) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={styles.accountName} numberOfLines={1}>
            {item.name}
          </Text>
          {showEditButton && (
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

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
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
            <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 }}>
              {filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'}
            </Text>
          </View>

          {/* Add Account Button - Sales reps can only create Dealer/Architect/Contractor */}
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
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#393735' }}>Add Account</Text>
          </TouchableOpacity>
        </View>
      </View>

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
              backgroundColor: selectedType === 'contractor' ? '#393735' : '#FFFFFF',
              borderWidth: 1,
              borderColor: selectedType === 'contractor' ? '#393735' : '#E0E0E0',
            }}
            onPress={() => setSelectedType('contractor')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: selectedType === 'contractor' ? '#FFFFFF' : '#666666',
            }}>
              Contractors
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
          estimatedItemSize={100}
          contentContainerStyle={styles.listContainer}
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
    paddingBottom: 120, // Extra padding for floating nav bar + safe area
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
});
