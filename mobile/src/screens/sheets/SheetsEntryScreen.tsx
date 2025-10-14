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
import { getAuth } from '@react-native-firebase/auth';
import { api } from '../../services/api';
import { useAccounts } from '../../hooks/useAccounts';
import { DetailedTargetProgressCard } from '../../components/DetailedTargetProgressCard';
import { colors, spacing, typography, shadows } from '../../theme';

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
  const authInstance = getAuth();
  const user = authInstance.currentUser;

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

      {/* Detailed Target Progress Section */}
      {user?.uid && (
        <View style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md }}>
          <DetailedTargetProgressCard
            userId={user.uid}
            month={new Date().toISOString().substring(0, 7)}
          />
        </View>
      )}

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
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingBottom: spacing.xl * 2,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
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
  section: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  sectionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  entriesList: {
    gap: spacing.sm,
  },
  entryCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.sm,
  },
  entryContent: {
    flex: 1,
  },
  entryCatalog: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  entryCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  addSection: {
    backgroundColor: colors.surface,
    marginTop: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.default,
  },
  addSectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  catalogButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  catalogButtonSelected: {
    borderWidth: 2,
  },
  catalogButtonAdded: {
    opacity: 0.6,
  },
  catalogButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
  },
  catalogButtonTextSelected: {
    color: '#fff',
  },
  countInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  addButton: {
    backgroundColor: colors.accent,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.accentDark,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#999',
  },
  addButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.primary,
  },
  divider: {
    height: spacing.sm,
    backgroundColor: colors.border.default,
    marginTop: spacing.xl,
  },
  distributorList: {
    gap: spacing.sm,
  },
  distributorButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
  },
  distributorButtonSelected: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  distributorButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  distributorButtonTextSelected: {
    color: '#fff',
  },
  distributorLocation: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    minHeight: 80,
  },
  submitButton: {
    backgroundColor: colors.success,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.successDark,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#999',
  },
  submitButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
  },
});
