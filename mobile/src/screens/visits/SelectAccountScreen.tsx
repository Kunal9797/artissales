import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
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
    navigation.navigate('LogVisit', { account });
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

  const renderAccount = ({ item }: { item: Account }) => {
    const showEditButton = canEditAccount(item);

    return (
      <View style={styles.accountCard}>
        <TouchableOpacity
          style={styles.accountCardContent}
          onPress={() => handleSelectAccount(item)}
        >
          <View style={styles.accountInfo}>
            <View style={styles.accountHeader}>
              <Text style={styles.accountName}>{item.name}</Text>
              <View
                style={[
                  styles.badge,
                  item.type === 'distributor'
                    ? styles.distributorBadge
                    : item.type === 'architect'
                    ? styles.architectBadge
                    : styles.dealerBadge,
                ]}
              >
                <Text style={styles.badgeText}>{item.type.toUpperCase()}</Text>
              </View>
            </View>

            {item.contactPerson && (
              <View style={styles.infoRow}>
                <User size={16} color={colors.text.secondary} />
                <Text style={styles.accountContact}>{item.contactPerson}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <MapPin size={16} color={colors.text.secondary} />
              <Text style={styles.accountLocation}>
                {item.city}, {item.state} - {item.pincode}
              </Text>
            </View>

            {item.lastVisitAt && (
              <Text style={styles.lastVisit}>
                Last visit: {item.lastVisitAt.toLocaleDateString()}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {showEditButton && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={(e) => handleEditAccount(item, e)}
          >
            <Edit2 size={18} color={colors.info} />
          </TouchableOpacity>
        )}
      </View>
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
        <FlatList
          data={filteredAccounts}
          renderItem={renderAccount}
          keyExtractor={(item) => item.id}
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
  },
  accountCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountCardContent: {
    flex: 1,
    padding: spacing.lg,
  },
  accountInfo: {
    flex: 1,
  },
  editButton: {
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border.default,
    minHeight: 80,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  accountName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
    marginRight: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.sm,
  },
  distributorBadge: {
    backgroundColor: '#E3F2FD',
  },
  dealerBadge: {
    backgroundColor: '#FFF3E0',
  },
  architectBadge: {
    backgroundColor: '#F3E5F5',
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  },
  accountContact: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  accountLocation: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  lastVisit: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
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
