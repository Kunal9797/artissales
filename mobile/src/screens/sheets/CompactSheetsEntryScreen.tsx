import React, { useState, useEffect, Fragment } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { ChevronLeft, Layers } from 'lucide-react-native';
import { api } from '../../services/api';
import { isOnline } from '../../services/network';
import { dataQueue } from '../../services/dataQueue';
import { colors, spacing, typography, shadows, featureColors } from '../../theme';
import { useTargetProgress } from '../../hooks/useTargetProgress';
import { targetCache } from '../../services/targetCache';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { invalidateHomeStatsCache } from '../HomeScreen_v2';
import { trackSheetsLogged } from '../../services/analytics';
import { useToast } from '../../providers/ToastProvider';

// Catalog options with initials and colors
const CATALOGS = [
  { value: 'Fine Decor', label: 'Fine Decor', initials: 'FD', color: '#9C27B0' },
  { value: 'Artvio', label: 'Artvio', initials: 'A', color: '#2196F3' },
  { value: 'Woodrica', label: 'Woodrica', initials: 'W', color: '#4CAF50' },
  { value: 'Artis 1MM', label: 'Artis 1MM', initials: '1', color: '#FF9800' },
] as const;

interface CompactSheetsEntryScreenProps {
  navigation: any;
  route: {
    params?: {
      editActivityId?: string;
    };
  };
}

type CatalogType = 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis 1MM';

export const CompactSheetsEntryScreen: React.FC<CompactSheetsEntryScreenProps> = ({ navigation, route }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  const toast = useToast();

  // Safe area insets for bottom padding (accounts for Android nav bar)
  const bottomPadding = useBottomSafeArea(12);

  // Edit mode detection
  const editActivityId = route.params?.editActivityId;
  const isEditMode = !!editActivityId;

  // Get current month
  const month = new Date().toISOString().substring(0, 7); // YYYY-MM

  // Use cached target progress hook
  const { progress: targetProgress, loading: loadingTargets } = useTargetProgress(user?.uid, month);

  // Form state
  const [selectedCatalog, setSelectedCatalog] = useState<CatalogType | null>(null);
  const [sheetsInput, setSheetsInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Notes for manager
  const [managerNotes, setManagerNotes] = useState('');

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
          logger.error('Error fetching sheet data:', error);
          Alert.alert('Error', 'Failed to load sheet data');
        } finally {
          setSubmitting(false);
        }
      };
      fetchExistingData();
    }
  }, [isEditMode, editActivityId, user?.uid]);


  const handleSubmit = async () => {
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

      // Check network connectivity
      const online = await isOnline();

      if (isEditMode && editActivityId) {
        // Edit mode: Requires network (can't edit offline)
        if (!online) {
          Alert.alert('No Connection', 'Editing requires an internet connection. Please try again when online.');
          setSubmitting(false);
          return;
        }
        await api.updateSheetsSale({
          id: editActivityId,
          catalog: selectedCatalog,
          sheetsCount: count,
        });

        // Invalidate caches
        if (user?.uid) {
          targetCache.invalidate(user.uid, month);
        }
        invalidateHomeStatsCache();
      } else {
        // Create mode: Always use dataQueue for instant UX (works online & offline)
        // The dataQueue will sync immediately when online, HomeScreen refreshes via setOnSyncComplete callback
        const sheetData = {
          date: today,
          catalog: selectedCatalog,
          sheetsCount: count,
          notes: managerNotes || undefined,
        };

        await dataQueue.addSheet(sheetData, user?.uid || '');

        // Show toast and navigate immediately - no waiting for sync!
        toast.show({
          kind: online ? 'success' : 'offline',
          text: online ? 'Sheets logged!' : 'Saved offline',
          duration: 2000,
        });

        // Track analytics event (only for new entries)
        trackSheetsLogged({
          catalog: selectedCatalog,
          count: count,
        });
      }

      // Navigate back
      navigation.goBack();
    } catch (error: any) {
      logger.error('Error saving sheet sale:', error);
      Alert.alert('Error', error.message || 'Failed to save sheet sale');
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

              // Invalidate target cache since a sale was deleted
              if (user?.uid) {
                targetCache.invalidate(user.uid, month);
              }

              Alert.alert('Success', 'Sheet sale deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error: any) {
              logger.error('Error deleting sheet sale:', error);
              Alert.alert('Error', error.message || 'Failed to delete entry');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Compact Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Layers size={20} color={featureColors.sheets.primary} />
          <Text style={styles.title}>{isEditMode ? 'Edit Sale' : 'Log Sheets'}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + bottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Catalog Grid - 2x2 */}
          <View style={styles.catalogGrid}>
            {CATALOGS.map(({ value, label, initials, color }) => {
              const isSelected = selectedCatalog === value;
              const progress = targetProgress?.find(t => t.catalog === value);
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.catalogCard,
                    isSelected && { borderColor: color, borderWidth: 2.5 },
                  ]}
                  onPress={() => setSelectedCatalog(value as CatalogType)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.catalogBadge, { backgroundColor: color }]}>
                    <Text style={styles.catalogBadgeText}>{initials}</Text>
                  </View>
                  <Text style={[styles.catalogLabel, isSelected && { color }]}>{label}</Text>
                  {progress && (
                    <Text style={styles.catalogProgress}>{progress.achieved}/{progress.target}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Count Input */}
          <View style={styles.countSection}>
            <TextInput
              style={[
                styles.countInput,
                selectedCatalog && styles.countInputActive,
              ]}
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
              value={sheetsInput}
              onChangeText={setSheetsInput}
              keyboardType="numeric"
              editable={!submitting}
            />
            <Text style={styles.countLabel}>sheets</Text>
          </View>

          {/* Notes - simple single line */}
          <TextInput
            style={styles.notesInput}
            placeholder="Add note (optional)"
            placeholderTextColor={colors.text.tertiary}
            value={managerNotes}
            onChangeText={setManagerNotes}
          />
        </View>
      </ScrollView>

      {/* Sticky Footer - Submit/Delete Buttons */}
      <View style={[styles.stickyFooter, { paddingBottom: bottomPadding }]}>
        {isEditMode ? (
          // Edit Mode: Delete + Update buttons
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity
              style={[styles.deleteButton, deleting && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={deleting || submitting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, styles.submitButtonFlex, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || deleting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Create Mode: Submit button (full width)
          <TouchableOpacity
            style={[styles.submitButton, (!selectedCatalog || !sheetsInput || submitting) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!selectedCatalog || !sheetsInput || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {!selectedCatalog ? 'Select Catalog' : !sheetsInput ? 'Enter Count' : 'Log Sheets'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: spacing.screenPadding,
  },
  backButton: {
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.accent,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: '#fff',
  },
  headerSpacer: {
    width: 50,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 12,
  },

  // Form Card - White container on gray background
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },

  // Catalog Grid - 2x2
  catalogGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  catalogCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    padding: 14,
  },
  catalogBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  catalogBadgeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  catalogLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  catalogProgress: {
    fontSize: 12,
    color: colors.text.tertiary,
  },

  // Count Section
  countSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  countInput: {
    backgroundColor: '#F8F8F8',
    borderWidth: 3,
    borderColor: colors.border.default,
    borderRadius: 16,
    width: '100%',
    paddingVertical: 18,
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
  },
  countInputActive: {
    borderColor: featureColors.sheets.primary,
    borderWidth: 3,
  },
  countLabel: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 6,
  },

  // Notes Input
  notesInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text.primary,
  },

  // Footer
  stickyFooter: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButton: {
    backgroundColor: featureColors.sheets.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonFlex: {
    flex: 1,
  },
  buttonDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    flex: 0.35,
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: '#fff',
  },
});
