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

type CatalogType = 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis 1MM';

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

  // Notes for manager
  const [managerNotes, setManagerNotes] = useState('');

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
        logger.error('Error loading targets:', err);
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

    if (isEditMode && editActivityId) {
      // Edit mode: Save immediately to backend
      setSubmitting(true);
      try {
        await api.updateSheetsSale({
          id: editActivityId,
          catalog: selectedCatalog,
          sheetsCount: count,
        });

        Alert.alert('Success', 'Sheet sale updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } catch (error: any) {
        logger.error('Error updating sheet sale:', error);
        Alert.alert('Error', error.message || 'Failed to update sheet sale');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Add mode: Just add to local state (don't save to backend yet)
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
          paddingBottom: 120, // Extra padding for floating nav bar + safe area
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

          {/* Sheets Input + Add Button */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: '#F5F5F5',
                borderWidth: 1,
                borderColor: '#E0E0E0',
                borderRadius: 6,
                padding: 12,
                fontSize: 16,
                fontWeight: '600',
                color: '#1A1A1A',
              }}
              placeholder="Number of sheets"
              placeholderTextColor="#999999"
              value={sheetsInput}
              onChangeText={setSheetsInput}
              keyboardType="numeric"
              editable={!submitting}
            />
            <TouchableOpacity
              style={{
                width: 48,
                height: 48,
                backgroundColor: submitting ? '#E0E0E0' : featureColors.sheets.primary,
                borderRadius: 6,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={handleQuickAdd}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>

          {/* Delete Button (Edit Mode Only) */}
          {isEditMode && (
            <TouchableOpacity
              style={{
                backgroundColor: deleting ? '#FFCDD2' : '#FF3B30',
                borderRadius: 6,
                paddingVertical: 12,
                alignItems: 'center',
                marginTop: 12,
              }}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>Delete Entry</Text>
              )}
            </TouchableOpacity>
          )}
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
            onPress={async () => {
              try {
                const today = new Date().toISOString().split('T')[0];

                // Save all entries to backend
                for (const entry of todayEntries) {
                  await api.logSheetsSale({
                    date: today,
                    catalog: entry.catalog,
                    sheetsCount: entry.sheetsCount,
                    notes: managerNotes || undefined,
                  });
                }

                Alert.alert('Success', 'Sales submitted for approval', [
                  { text: 'OK', onPress: () => navigation.goBack() }
                ]);
              } catch (error: any) {
                logger.error('Error submitting sales:', error);
                Alert.alert('Error', error.message || 'Failed to submit sales');
              }
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
  scrollView: {
    flex: 1,
  },
  targetCard: {
    marginBottom: 16,
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
