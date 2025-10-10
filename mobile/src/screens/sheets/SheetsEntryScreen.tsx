import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';
import { useAccounts } from '../../hooks/useAccounts';

interface SheetsEntryScreenProps {
  navigation: any;
}

type CatalogType = 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis';

interface CatalogEntry {
  catalog: CatalogType;
  sheetsCount: number;
  color: string;
}

const CATALOGS: { value: CatalogType; label: string; color: string }[] = [
  { value: 'Fine Decor', label: 'Fine Decor', color: '#2196F3' },
  { value: 'Artvio', label: 'Artvio', color: '#4CAF50' },
  { value: 'Woodrica', label: 'Woodrica', color: '#FF9800' },
  { value: 'Artis', label: 'Artis', color: '#9C27B0' },
];

export const SheetsEntryScreen: React.FC<SheetsEntryScreenProps> = ({ navigation }) => {
  const { accounts } = useAccounts();
  const distributors = accounts.filter(acc => acc.type === 'distributor');

  // Multiple catalog entries
  const [entries, setEntries] = useState<CatalogEntry[]>([]);

  // Current entry being added
  const [currentCatalog, setCurrentCatalog] = useState<CatalogType | null>(null);
  const [currentCount, setCurrentCount] = useState('');

  // Common fields
  const [selectedDistributor, setSelectedDistributor] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAddEntry = () => {
    if (!currentCatalog) {
      Alert.alert('Error', 'Please select a catalog');
      return;
    }

    const count = parseInt(currentCount);
    if (!currentCount || isNaN(count) || count <= 0) {
      Alert.alert('Error', 'Please enter a valid sheets count');
      return;
    }

    // Check if catalog already exists
    const existingIndex = entries.findIndex(e => e.catalog === currentCatalog);
    if (existingIndex >= 0) {
      // Update existing entry
      const updated = [...entries];
      updated[existingIndex] = {
        catalog: currentCatalog,
        sheetsCount: count,
        color: CATALOGS.find(c => c.value === currentCatalog)!.color,
      };
      setEntries(updated);
    } else {
      // Add new entry
      setEntries([
        ...entries,
        {
          catalog: currentCatalog,
          sheetsCount: count,
          color: CATALOGS.find(c => c.value === currentCatalog)!.color,
        },
      ]);
    }

    // Reset current entry
    setCurrentCatalog(null);
    setCurrentCount('');
  };

  const handleRemoveEntry = (catalog: CatalogType) => {
    setEntries(entries.filter(e => e.catalog !== catalog));
  };

  const handleSubmitAll = async () => {
    if (entries.length === 0) {
      Alert.alert('Error', 'Please add at least one catalog entry');
      return;
    }

    setSubmitting(true);

    try {
      const distributor = distributors.find(d => d.id === selectedDistributor);
      const today = new Date().toISOString().split('T')[0];

      // Submit all entries in parallel
      await Promise.all(
        entries.map(entry =>
          api.logSheetsSale({
            date: today,
            catalog: entry.catalog,
            sheetsCount: entry.sheetsCount,
            distributorId: distributor?.id,
            distributorName: distributor?.name,
            notes: notes.trim() || undefined,
          })
        )
      );

      Alert.alert(
        'Success',
        `${entries.length} sheet sale${entries.length > 1 ? 's' : ''} logged successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Sheets sale logging error:', error);
      Alert.alert('Error', error.message || 'Failed to log sheet sales');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Sheet Sales</Text>
        <Text style={styles.subtitle}>Today: {new Date().toLocaleDateString()}</Text>
      </View>

      {/* Added Entries List */}
      {entries.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Added Catalogs ({entries.length})</Text>
          <View style={styles.entriesList}>
            {entries.map((entry) => (
              <View
                key={entry.catalog}
                style={[styles.entryCard, { borderLeftColor: entry.color }]}
              >
                <View style={styles.entryContent}>
                  <Text style={styles.entryCatalog}>{entry.catalog}</Text>
                  <Text style={styles.entryCount}>{entry.sheetsCount} sheets</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveEntry(entry.catalog)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Add New Entry Section */}
      <View style={styles.addSection}>
        <Text style={styles.addSectionTitle}>
          {entries.length > 0 ? 'Add Another Catalog' : 'Add Catalog'}
        </Text>

        {/* Catalog Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Select Catalog *</Text>
          <View style={styles.catalogGrid}>
            {CATALOGS.map((item) => {
              const alreadyAdded = entries.some(e => e.catalog === item.value);
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.catalogButton,
                    currentCatalog === item.value && {
                      ...styles.catalogButtonSelected,
                      backgroundColor: item.color,
                      borderColor: item.color,
                    },
                    alreadyAdded && styles.catalogButtonAdded,
                  ]}
                  onPress={() => setCurrentCatalog(item.value)}
                >
                  <Text
                    style={[
                      styles.catalogButtonText,
                      currentCatalog === item.value && styles.catalogButtonTextSelected,
                    ]}
                  >
                    {item.label}
                    {alreadyAdded && ' ✓'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sheets Count */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Number of Sheets *</Text>
          <TextInput
            style={styles.countInput}
            placeholder="Enter number of sheets sold"
            value={currentCount}
            onChangeText={setCurrentCount}
            keyboardType="numeric"
          />
        </View>

        {/* Add Button */}
        <TouchableOpacity
          style={[
            styles.addButton,
            (!currentCatalog || !currentCount) && styles.addButtonDisabled,
          ]}
          onPress={handleAddEntry}
          disabled={!currentCatalog || !currentCount}
        >
          <Text style={styles.addButtonText}>
            {entries.some(e => e.catalog === currentCatalog) ? '↻ Update Entry' : '+ Add to List'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Distributor Selection (Optional) */}
      {entries.length > 0 && (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Distributor (Optional)</Text>
            <Text style={styles.helpText}>
              Same distributor will be applied to all entries
            </Text>
            <View style={styles.distributorList}>
              <TouchableOpacity
                style={[
                  styles.distributorButton,
                  !selectedDistributor && styles.distributorButtonSelected,
                ]}
                onPress={() => setSelectedDistributor(null)}
              >
                <Text
                  style={[
                    styles.distributorButtonText,
                    !selectedDistributor && styles.distributorButtonTextSelected,
                  ]}
                >
                  No Distributor
                </Text>
              </TouchableOpacity>
              {distributors.map((dist) => (
                <TouchableOpacity
                  key={dist.id}
                  style={[
                    styles.distributorButton,
                    selectedDistributor === dist.id && styles.distributorButtonSelected,
                  ]}
                  onPress={() => setSelectedDistributor(dist.id)}
                >
                  <Text
                    style={[
                      styles.distributorButtonText,
                      selectedDistributor === dist.id && styles.distributorButtonTextSelected,
                    ]}
                  >
                    {dist.name}
                  </Text>
                  <Text style={styles.distributorLocation}>
                    {dist.city}, {dist.state}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes about these sales..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Submit All Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (entries.length === 0 || submitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmitAll}
            disabled={entries.length === 0 || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                Submit All ({entries.length} catalog{entries.length > 1 ? 's' : ''})
              </Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4CAF50',
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
  section: {
    marginHorizontal: 16,
    marginTop: 20,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  entriesList: {
    gap: 8,
  },
  entryCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  entryContent: {
    flex: 1,
  },
  entryCatalog: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  entryCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  addSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  catalogButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  catalogButtonSelected: {
    borderWidth: 2,
  },
  catalogButtonAdded: {
    opacity: 0.6,
  },
  catalogButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  catalogButtonTextSelected: {
    color: '#fff',
  },
  countInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#2196F3',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  divider: {
    height: 8,
    backgroundColor: '#e0e0e0',
    marginTop: 24,
  },
  distributorList: {
    gap: 8,
  },
  distributorButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  distributorButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  distributorButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  distributorButtonTextSelected: {
    color: '#fff',
  },
  distributorLocation: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
