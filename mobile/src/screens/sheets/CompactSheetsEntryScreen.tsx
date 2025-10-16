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
import { Plus, X, ChevronLeft, FileText } from 'lucide-react-native';
import { api } from '../../services/api';
import { DetailedTargetProgressCard } from '../../components/DetailedTargetProgressCard';
import { colors, spacing, typography, shadows, featureColors } from '../../theme';
import { TargetProgress } from '../../types';

interface CompactSheetsEntryScreenProps {
  navigation: any;
  route: {
    params?: {
      editActivityId?: string;
    };
  };
}

type CatalogType = 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis';

interface TodayEntry {
  catalog: CatalogType;
  sheetsCount: number;
  id?: string; // For edit mode
}

export const CompactSheetsEntryScreen: React.FC<CompactSheetsEntryScreenProps> = ({ navigation, route }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  // Edit mode detection
  const editActivityId = route.params?.editActivityId;
  const isEditMode = !!editActivityId;

  // Target progress data
  const [targetProgress, setTargetProgress] = useState<TargetProgress[] | null>(null);
  const [loadingTargets, setLoadingTargets] = useState(true);

  // Quick add state
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogType | null>(null);
  const [sheetsInput, setSheetsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // Fetch existing sheet data in edit mode
  useEffect(() => {
    if (isEditMode && editActivityId && user?.uid) {
      const fetchExistingData = async () => {
        try {
          setSubmitting(true);
          const today = new Date().toISOString().split('T')[0];
          const response = await api.getSheetsSales({ userId: user.uid, date: today });

          // Find the specific entry to edit
          const entry = response.find((s: any) => s.id === editActivityId);
          if (entry) {
            setSelectedCatalog(entry.catalog);
            setSheetsInput(entry.sheetsCount.toString());
          }
        } catch (error) {
          console.error('Error fetching sheet data:', error);
          Alert.alert('Error', 'Failed to load sheet data');
        } finally {
          setSubmitting(false);
        }
      };
      fetchExistingData();
    }
  }, [isEditMode, editActivityId, user?.uid]);

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

      if (isEditMode && editActivityId) {
        // Update existing entry
        await api.updateSheetsSale({
          id: editActivityId,
          catalog: selectedCatalog,
          sheetsCount: count,
        });

        Alert.alert('Success', 'Sheet sale updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new entry
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
      }

      // No alert for new entries - silent success
    } catch (error: any) {
      console.error('Error saving sheets:', error);
      Alert.alert('Error', error.message || 'Failed to save sheets');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !editActivityId) return;

    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this sheet sale entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteSheetsSale({ id: editActivityId });
              Alert.alert('Success', 'Sheet sale deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error: any) {
              console.error('Error deleting sheet sale:', error);
              Alert.alert('Error', error.message || 'Failed to delete entry');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const catalogButtons = getCatalogButtons();

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <FileText size={24} color={colors.text.inverse} />
          <View>
            <Text style={styles.title}>{isEditMode ? 'Edit Sheet Sale' : 'Log Sheet Sales'}</Text>
            <Text style={styles.subtitle}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>
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

          {/* Delete Button (Edit Mode Only) */}
          {isEditMode && (
            <TouchableOpacity
              style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete Entry</Text>
              )}
            </TouchableOpacity>
          )}
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
  // Modern Header
  header: {
    backgroundColor: colors.primary,
    paddingTop: 52, // Status bar space
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  title: {
    fontSize: 19,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: colors.text.inverse,
    opacity: 0.8,
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
    backgroundColor: featureColors.sheets.primary,
    borderColor: featureColors.sheets.primary,
  },
  catalogButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
  },
  catalogButtonTextSelected: {
    color: colors.surface,
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
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: featureColors.sheets.primary,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  addButtonDisabled: {
    backgroundColor: colors.border.default,
    opacity: 0.6,
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
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
    backgroundColor: featureColors.sheets.primary,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 48,
    ...shadows.sm,
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
  },
});
