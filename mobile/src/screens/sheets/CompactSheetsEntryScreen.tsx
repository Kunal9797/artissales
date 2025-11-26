import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { ChevronLeft, FileText } from 'lucide-react-native';
import { api } from '../../services/api';
import { isOnline, OFFLINE_SUBMIT_MESSAGE } from '../../services/network';
import { DetailedTargetProgressCard } from '../../components/DetailedTargetProgressCard';
import { colors, spacing, typography, shadows, featureColors } from '../../theme';
import { useTargetProgress } from '../../hooks/useTargetProgress';
import { targetCache } from '../../services/targetCache';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { invalidateHomeStatsCache } from '../HomeScreen_v2';
import { trackSheetsLogged } from '../../services/analytics';

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

  // Always show all 4 catalog options
  const getCatalogButtons = (): CatalogType[] => {
    return ['Fine Decor', 'Artvio', 'Woodrica', 'Artis 1MM'];
  };

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

    // Check network connectivity before submitting
    const online = await isOnline();
    if (!online) {
      Alert.alert('No Connection', OFFLINE_SUBMIT_MESSAGE);
      return;
    }

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      if (isEditMode && editActivityId) {
        // Edit mode: Update existing entry
        await api.updateSheetsSale({
          id: editActivityId,
          catalog: selectedCatalog,
          sheetsCount: count,
        });
      } else {
        // Create mode: Save new entry directly
        await api.logSheetsSale({
          date: today,
          catalog: selectedCatalog,
          sheetsCount: count,
          notes: managerNotes || undefined,
        });

        // Track analytics event (only for new entries)
        trackSheetsLogged({
          catalog: selectedCatalog,
          count: count,
        });
      }

      // Invalidate caches
      if (user?.uid) {
        targetCache.invalidate(user.uid, month);
      }
      invalidateHomeStatsCache();

      // Navigate back (toast shown implicitly by quick return)
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

  const catalogButtons = getCatalogButtons();

  return (
    <View style={styles.container}>
      {/* Header - Match New Design */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <FileText size={24} color={featureColors.sheets.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>
              {isEditMode ? 'Edit Sheet Sale' : 'Log Sheet Sales'}
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 }}>
              {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 80 + bottomPadding, // Dynamic padding for nav bar + safe area
        }}
      >
        {/* Compact Target Progress */}
        {user?.uid && !loadingTargets && targetProgress && (
          <DetailedTargetProgressCard
            userId={user.uid}
            month={new Date().toISOString().substring(0, 7)}
            style={styles.targetCard}
          />
        )}

        {/* Compact Entry Form */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
            Select Catalog
          </Text>

          {/* Catalog Buttons */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {catalogButtons.map((catalog) => (
              <TouchableOpacity
                key={catalog}
                style={{
                  flex: 1,
                  minWidth: '48%',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: selectedCatalog === catalog ? featureColors.sheets.primary : '#E0E0E0',
                  backgroundColor: selectedCatalog === catalog ? featureColors.sheets.primary : '#FFFFFF',
                  alignItems: 'center',
                }}
                onPress={() => setSelectedCatalog(catalog)}
              >
                <Text style={{
                  fontSize: 13,
                  fontWeight: selectedCatalog === catalog ? '600' : '500',
                  color: selectedCatalog === catalog ? '#FFFFFF' : '#666666',
                }}>
                  {catalog}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sheets Input */}
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
            Number of Sheets
          </Text>
          <TextInput
            style={{
              backgroundColor: '#F5F5F5',
              borderWidth: 1,
              borderColor: '#E0E0E0',
              borderRadius: 6,
              padding: 12,
              fontSize: 18,
              fontWeight: '600',
              color: '#1A1A1A',
            }}
            placeholder="Enter count"
            placeholderTextColor="#999999"
            value={sheetsInput}
            onChangeText={setSheetsInput}
            keyboardType="numeric"
            editable={!submitting}
          />
        </View>

        {/* Optional Notes for Manager */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
            Notes for Manager (Optional)
          </Text>
          <TextInput
            style={{
              backgroundColor: '#F5F5F5',
              borderRadius: 6,
              padding: 10,
              fontSize: 14,
              color: '#1A1A1A',
              minHeight: 70,
              textAlignVertical: 'top',
            }}
            placeholder="Add any notes for your manager..."
            placeholderTextColor="#999999"
            value={managerNotes}
            onChangeText={setManagerNotes}
            multiline
            numberOfLines={3}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  targetCard: {
    marginBottom: 16,
  },
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
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...shadows.sm,
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
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
  },
  deleteButton: {
    flex: 0.35,
    backgroundColor: colors.error,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  deleteButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
  },
});
