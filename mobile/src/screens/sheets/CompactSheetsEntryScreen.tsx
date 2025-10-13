import React, { useState, useEffect } from 'react';
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
import { Plus, X } from 'lucide-react-native';
import { api } from '../../services/api';
import { DetailedTargetProgressCard } from '../../components/DetailedTargetProgressCard';
import { colors, spacing, typography } from '../../theme';
import { TargetProgress } from '../../types';

interface CompactSheetsEntryScreenProps {
  navigation: any;
}

type CatalogType = 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis';

interface TodayEntry {
  catalog: CatalogType;
  sheetsCount: number;
}

export const CompactSheetsEntryScreen: React.FC<CompactSheetsEntryScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  // Target progress data
  const [targetProgress, setTargetProgress] = useState<TargetProgress[] | null>(null);
  const [loadingTargets, setLoadingTargets] = useState(true);

  // Quick add state
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogType | null>(null);
  const [sheetsInput, setSheetsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Today's entries
  const [todayEntries, setTodayEntries] = useState<TodayEntry[]>([]);

  // Fetch targets
  useEffect(() => {
    const fetchTargets = async () => {
      if (!user?.uid) return;

      try {
        setLoadingTargets(true);
        const month = new Date().toISOString().substring(0, 7);
        const response = await api.getTarget({ userId: user.uid, month });

        if (response.target && response.progress) {
          setTargetProgress(response.progress);
        }
      } catch (err) {
        console.error('Error loading targets:', err);
      } finally {
        setLoadingTargets(false);
      }
    };

    fetchTargets();
  }, [user?.uid]);

  // Get catalog buttons (from targets or all 4)
  const getCatalogButtons = (): CatalogType[] => {
    if (targetProgress && targetProgress.length > 0) {
      return targetProgress.map(p => p.catalog as CatalogType);
    }
    return ['Fine Decor', 'Artvio', 'Woodrica', 'Artis'];
  };

  const handleQuickAdd = async () => {
    if (!selectedCatalog) {
      Alert.alert('Error', 'Please select a catalog');
      return;
    }

    const count = parseInt(sheetsInput);
    if (!sheetsInput || isNaN(count) || count <= 0) {
      Alert.alert('Error', 'Please enter a valid number of sheets');
      return;
    }

    setSubmitting(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      await api.logSheetsSale({
        date: today,
        catalog: selectedCatalog,
        sheetsCount: count,
      });

      // Add to today's list (merge if catalog already exists)
      const existingIndex = todayEntries.findIndex(e => e.catalog === selectedCatalog);
      if (existingIndex >= 0) {
        // Update existing entry by adding to it
        const updated = [...todayEntries];
        updated[existingIndex] = {
          ...updated[existingIndex],
          sheetsCount: updated[existingIndex].sheetsCount + count,
        };
        setTodayEntries(updated);
      } else {
        // Add new entry
        setTodayEntries([...todayEntries, { catalog: selectedCatalog, sheetsCount: count }]);
      }

      // Reset form
      setSelectedCatalog(null);
      setSheetsInput('');

      // Refresh targets
      const month = new Date().toISOString().substring(0, 7);
      const response = await api.getTarget({ userId: user!.uid, month });
      if (response.progress) {
        setTargetProgress(response.progress);
      }

      // No alert - silent success
    } catch (error: any) {
      console.error('Error adding sheets:', error);
      Alert.alert('Error', error.message || 'Failed to log sheets');
    } finally {
      setSubmitting(false);
    }
  };

  const catalogButtons = getCatalogButtons();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Sheet Sales</Text>
        <Text style={styles.subtitle}>Today: {new Date().toLocaleDateString()}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          todayEntries.length > 0 && styles.contentWithFooter
        ]}
      >
        {/* Compact Target Progress */}
        {user?.uid && !loadingTargets && targetProgress && (
          <DetailedTargetProgressCard
            userId={user.uid}
            month={new Date().toISOString().substring(0, 7)}
            style={styles.targetCard}
          />
        )}

        {/* Quick Add Section */}
        <View style={styles.quickAddCard}>
          {/* Catalog Buttons */}
          <View style={styles.catalogButtons}>
            {catalogButtons.map((catalog) => (
              <TouchableOpacity
                key={catalog}
                style={[
                  styles.catalogButton,
                  selectedCatalog === catalog && styles.catalogButtonSelected,
                ]}
                onPress={() => setSelectedCatalog(catalog)}
              >
                <Text
                  style={[
                    styles.catalogButtonText,
                    selectedCatalog === catalog && styles.catalogButtonTextSelected,
                  ]}
                >
                  {catalog}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sheets Input + Add Button */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.sheetsInput}
              placeholder="Number of sheets"
              value={sheetsInput}
              onChangeText={setSheetsInput}
              keyboardType="numeric"
              editable={!submitting}
            />
            <TouchableOpacity
              style={[styles.addButton, submitting && styles.addButtonDisabled]}
              onPress={handleQuickAdd}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Plus size={20} color="#fff" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Section - Today's Entries + Submit */}
      {todayEntries.length > 0 && (
        <View style={styles.stickyFooter}>
          <View style={styles.todaySection}>
            <Text style={styles.todaySectionTitle}>Today's Entries ({todayEntries.length})</Text>
            <ScrollView style={styles.entriesScroll} showsVerticalScrollIndicator={false}>
              {todayEntries.map((entry, index) => (
                <View key={index} style={styles.entryRow}>
                  <Text style={styles.entryDot}>•</Text>
                  <Text style={styles.entryText}>
                    {entry.catalog}: {entry.sheetsCount.toLocaleString()} sheets
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => {
              Alert.alert('Success', 'Sales submitted for approval', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            }}
          >
            <Text style={styles.submitButtonText}>Send for Approval</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  backButton: {
    marginBottom: spacing.xs,
  },
  backButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
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
    marginTop: spacing.xs / 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  contentWithFooter: {
    paddingBottom: spacing.md, // Extra space for sticky footer
  },
  targetCard: {
    marginBottom: spacing.md,
  },
  quickAddCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.md,
  },
  catalogButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  catalogButton: {
    flex: 1,
    minWidth: '48%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.background,
    alignItems: 'center',
  },
  catalogButtonSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  catalogButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  catalogButtonTextSelected: {
    color: colors.primary,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sheetsInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.success,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  stickyFooter: {
    backgroundColor: colors.background,
    borderTopWidth: 2,
    borderTopColor: colors.border.default,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  todaySection: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: spacing.md,
  },
  todaySectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  entriesScroll: {
    maxHeight: 120, // Limit height for scrollability
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  entryDot: {
    fontSize: typography.fontSize.base,
    color: colors.accent,
    marginRight: spacing.sm,
  },
  entryText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
  },
  submitButton: {
    backgroundColor: colors.success, // Changed from colors.primary to success (green)
    borderRadius: spacing.borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: '#fff', // White text on green background
  },
});
