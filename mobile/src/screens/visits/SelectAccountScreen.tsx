import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Search, X, MapPin, User, Plus, Edit2 } from 'lucide-react-native';
import { getAuth } from '@react-native-firebase/auth';
import { useAccounts, Account } from '../../hooks/useAccounts';
import { colors, spacing, typography, shadows } from '../../theme';
import { useAuth } from '../../hooks/useAuth';
import { FilterChips } from '../../components/FilterChips';

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
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading accounts...</Text>
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
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Select Account</Text>
          <Text style={styles.subtitle}>Choose a dealer or distributor to visit</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddAccount', {
            onAccountCreated: (accountId: string) => {
              navigation.navigate('LogVisit', { accountId });
            }
          })}
        >
          <Plus size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={colors.text.secondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, city, or type..."
          placeholderTextColor={colors.text.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <FilterChips selected={selectedType} onSelect={setSelectedType} />

      {filteredAccounts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {searchQuery ? 'No accounts found matching your search' : 'No accounts assigned to you'}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.resultsCount}>
            {filteredAccounts.length} account{filteredAccounts.length !== 1 ? 's' : ''}
          </Text>
          <FlatList
            data={filteredAccounts}
            renderItem={renderAccount}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
          />
        </>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    padding: spacing.lg,
    paddingTop: 60,
    paddingBottom: spacing.xl,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
    ...shadows.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: '#fff',
    opacity: 0.9,
    marginTop: spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    margin: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  filterScrollView: {
    marginBottom: spacing.lg,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
  },
  filterBubble: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  filterBubbleActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '500',
    marginLeft: 6,
  },
  filterTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  listContainer: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
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
