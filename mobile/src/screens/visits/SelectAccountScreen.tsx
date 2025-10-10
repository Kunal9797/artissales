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
import { useAccounts, Account } from '../../hooks/useAccounts';

interface SelectAccountScreenProps {
  navigation: any;
}

type AccountTypeFilter = 'all' | 'distributor' | 'dealer' | 'architect';

export const SelectAccountScreen: React.FC<SelectAccountScreenProps> = ({ navigation }) => {
  const { accounts, loading, error } = useAccounts();
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

  const renderAccount = ({ item }: { item: Account }) => (
    <TouchableOpacity
      style={styles.accountCard}
      onPress={() => handleSelectAccount(item)}
    >
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
        <Text style={styles.accountContact}>👤 {item.contactPerson}</Text>
      )}

      <Text style={styles.accountLocation}>
        📍 {item.city}, {item.state} - {item.pincode}
      </Text>

      {item.lastVisitAt && (
        <Text style={styles.lastVisit}>
          Last visit: {item.lastVisitAt.toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
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
        <Text style={styles.title}>Select Account</Text>
        <Text style={styles.subtitle}>Choose a dealer or distributor to visit</Text>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, city, or type..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Bubbles */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterBubble, selectedType === 'all' && styles.filterBubbleActive]}
          onPress={() => setSelectedType('all')}
        >
          <Text style={[styles.filterText, selectedType === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBubble, selectedType === 'distributor' && styles.filterBubbleActive]}
          onPress={() => setSelectedType('distributor')}
        >
          <Text style={[styles.filterText, selectedType === 'distributor' && styles.filterTextActive]}>
            🏭 Distributors
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBubble, selectedType === 'dealer' && styles.filterBubbleActive]}
          onPress={() => setSelectedType('dealer')}
        >
          <Text style={[styles.filterText, selectedType === 'dealer' && styles.filterTextActive]}>
            🏪 Dealers
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterBubble, selectedType === 'architect' && styles.filterBubbleActive]}
          onPress={() => setSelectedType('architect')}
        >
          <Text style={[styles.filterText, selectedType === 'architect' && styles.filterTextActive]}>
            📐 Architects
          </Text>
        </TouchableOpacity>
      </View>

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
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    fontSize: 20,
    color: '#999',
    paddingHorizontal: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterBubble: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterBubbleActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  accountCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  accountName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  distributorBadge: {
    backgroundColor: '#e3f2fd',
  },
  dealerBadge: {
    backgroundColor: '#fff3e0',
  },
  architectBadge: {
    backgroundColor: '#f3e5f5',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
  },
  accountContact: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  accountLocation: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  lastVisit: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
