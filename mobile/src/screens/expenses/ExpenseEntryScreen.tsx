/**
 * Expense Entry Screen
 * Allows sales reps to log daily expenses with multiple items
 * (e.g., 100 for travel + 500 for hotel in one report)
 */

import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { getAuth } from '@react-native-firebase/auth';
import { Car, UtensilsCrossed, Hotel, FileText, Camera, ChevronLeft, IndianRupee } from 'lucide-react-native';
import { api } from '../../services/api';
import { isOnline } from '../../services/network';
import { dataQueue } from '../../services/dataQueue';
import { uploadPhoto } from '../../services/storage';
import { CameraCapture } from '../../components/CameraCapture';
import { Card } from '../../components/ui';
import { SubmitExpenseRequest, ExpenseItem } from '../../types';
import { colors, spacing, typography, shadows, featureColors } from '../../theme';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { invalidateHomeStatsCache } from '../HomeScreen_v2';
import { trackExpenseSubmitted } from '../../services/analytics';
import { useToast } from '../../providers/ToastProvider';

interface ExpenseEntryScreenProps {
  navigation: any;
  route: {
    params?: {
      editActivityId?: string;
    };
  };
}

type ExpenseCategory = 'travel' | 'food' | 'accommodation' | 'other';

const CATEGORIES: { value: ExpenseCategory; label: string; icon: any; color: string }[] = [
  { value: 'travel', label: 'Travel', icon: Car, color: '#2196F3' },
  { value: 'food', label: 'Food', icon: UtensilsCrossed, color: '#FF9800' },
  { value: 'accommodation', label: 'Hotel', icon: Hotel, color: '#9C27B0' },
  { value: 'other', label: 'Other', icon: FileText, color: '#607D8B' },
];


export const ExpenseEntryScreen: React.FC<ExpenseEntryScreenProps> = ({
  navigation,
  route,
}) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const toast = useToast();

  // Safe area insets for bottom padding (accounts for Android nav bar)
  const bottomPadding = useBottomSafeArea(12);

  // Edit mode detection
  const editActivityId = route.params?.editActivityId;
  const isEditMode = !!editActivityId;

  const [date, setDate] = useState(today);
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Single expense form
  const [category, setCategory] = useState<ExpenseCategory>('travel');
  const [categoryOther, setCategoryOther] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const [showCamera, setShowCamera] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [amountError, setAmountError] = useState<string>('');

  // Fetch existing expense data in edit mode
  useEffect(() => {
    if (isEditMode && editActivityId) {
      const fetchExistingData = async () => {
        try {
          setSubmitting(true);
          const response = await api.getExpense({ id: editActivityId });

          if (response) {
            setDate(response.date);
            // Load first item's data
            if (response.items && response.items.length > 0) {
              const item = response.items[0];
              setCategory(item.category);
              setCategoryOther(item.categoryOther || '');
              setAmount(item.amount.toString());
              setDescription(item.description || '');
            }
            if (response.receiptPhotos && response.receiptPhotos.length > 0) {
              setReceiptPhotoUrl(response.receiptPhotos[0]);
              setReceiptPhoto(response.receiptPhotos[0]);
            }
          }
        } catch (error) {
          logger.error('Error fetching expense data:', error);
          Alert.alert('Error', 'Failed to load expense data');
        } finally {
          setSubmitting(false);
        }
      };
      fetchExistingData();
    }
  }, [isEditMode, editActivityId]);

  const handlePhotoTaken = async (uri: string) => {
    setShowCamera(false);
    setReceiptPhoto(uri);

    // Upload photo to Firebase Storage in background
    setUploadingReceipt(true);
    uploadPhoto(uri, 'expenses')
      .then((downloadUrl) => {
        setReceiptPhotoUrl(downloadUrl);
        logger.log('[Expense] Receipt uploaded:', downloadUrl);
        setUploadingReceipt(false);
      })
      .catch((error) => {
        logger.error('[Expense] Error uploading receipt:', error);
        Alert.alert('Error', 'Failed to upload receipt photo. Please try again.');
        setReceiptPhoto(null);
        setUploadingReceipt(false);
      });
  };

  const handleRemoveReceipt = () => {
    setReceiptPhoto(null);
    setReceiptPhotoUrl(null);
  };

  const handleSubmit = async () => {
    // Validation
    if (!amount || amount.trim() === '') {
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (category === 'other' && !categoryOther.trim()) {
      Alert.alert('Error', 'Please specify the category name');
      return;
    }

    // Check network connectivity
    const online = await isOnline();

    // Check if photo is still uploading (only relevant when online)
    if (online && receiptPhoto && !receiptPhotoUrl && uploadingReceipt) {
      Alert.alert('Please Wait', 'Receipt photo is still uploading...');
      return;
    }

    setSubmitting(true);
    try {
      // Build single expense item
      const expenseItem: ExpenseItem = {
        amount: amountNum,
        category,
        ...(category === 'other' && { categoryOther: categoryOther.trim() }),
        description: description.trim() || '',
      };

      if (isEditMode && editActivityId) {
        // Edit mode: Requires network (can't edit offline)
        if (!online) {
          Alert.alert('No Connection', 'Editing requires an internet connection. Please try again when online.');
          setSubmitting(false);
          return;
        }
        await api.updateExpense({
          id: editActivityId,
          date,
          items: [expenseItem],
          ...(receiptPhotoUrl && { receiptPhotos: [receiptPhotoUrl] }),
        });

        // Invalidate home screen cache
        invalidateHomeStatsCache();
      } else {
        // Create mode: Always use dataQueue for instant UX (works online & offline)
        // The dataQueue will sync immediately when online, HomeScreen refreshes via setOnSyncComplete callback
        const expenseData: SubmitExpenseRequest = {
          date,
          items: [expenseItem],
          // Only include photo URL if we have it (online upload completed)
          ...(receiptPhotoUrl && { receiptPhotos: [receiptPhotoUrl] }),
        };

        // Pass local photo URI if we have a photo but no uploaded URL (for offline upload later)
        const localPhotoUri = receiptPhoto && !receiptPhotoUrl ? receiptPhoto : undefined;
        const authInstance = getAuth();
        const userId = authInstance.currentUser?.uid || '';

        await dataQueue.addExpense(expenseData, userId, localPhotoUri);

        // Show toast and navigate immediately - no waiting for sync!
        toast.show({
          kind: online ? 'success' : 'offline',
          text: online ? 'Expense saved!' : 'Saved offline',
          duration: 2000,
        });

        // Track analytics event (only for new expenses)
        trackExpenseSubmitted({
          category: category,
          amount: amountNum,
          hasReceipt: !!receiptPhoto,
        });
      }

      // Navigate back immediately
      navigation.goBack();
    } catch (error: any) {
      logger.error('[Expense] Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !editActivityId) return;

    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense report?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteExpense({ id: editActivityId });
              Alert.alert('Success', 'Expense report deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error: any) {
              logger.error('Error deleting expense:', error);
              Alert.alert('Error', error.message || 'Failed to delete expense');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (showCamera) {
    return (
      <CameraCapture
        onPhotoTaken={handlePhotoTaken}
        onCancel={() => setShowCamera(false)}
      />
    );
  }

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
          <IndianRupee size={24} color={featureColors.expenses.primary} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>
              {isEditMode ? 'Edit Expenses' : 'Report Expenses'}
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 2 }}>
              {date}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + bottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >

      {/* Single Expense Form */}
      <View style={styles.addItemSection}>
        {/* Category Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGridContainer}>
            {CATEGORIES.map((cat) => {
              const IconComponent = cat.icon;
              const isSelected = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryPill,
                    isSelected && { ...styles.categoryPillSelected, borderColor: cat.color, backgroundColor: `${cat.color}15` },
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <IconComponent
                    size={20}
                    color={isSelected ? cat.color : colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.categoryPillText,
                      isSelected && { ...styles.categoryPillTextSelected, color: cat.color },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category Other Input (shown when "other" selected) */}
        {category === 'other' && (
          <View style={styles.field}>
            <Text style={styles.label}>Category Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Internet, Office supplies"
              placeholderTextColor="#999"
              value={categoryOther}
              onChangeText={setCategoryOther}
            />
          </View>
        )}

        {/* Amount Input */}
        <View style={styles.fieldCompact}>
          <Text style={styles.label}>Amount (₹)</Text>
          <TextInput
            style={[styles.input, amountError && styles.inputError]}
            placeholder="Enter amount"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(text) => {
              setAmount(text);
              if (text.trim() === '') {
                setAmountError('');
              } else {
                const isValidNumber = /^\d+\.?\d*$/.test(text.trim());
                const numValue = parseFloat(text);
                if (!isValidNumber || isNaN(numValue) || numValue <= 0) {
                  setAmountError('Enter a valid amount');
                } else {
                  setAmountError('');
                }
              }
            }}
          />
          {amountError && <Text style={styles.errorText}>{amountError}</Text>}
        </View>

        {/* Description Input (Optional) */}
        <View style={styles.fieldCompact}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Brief description"
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Receipt Photo (Optional) */}
        <View style={styles.fieldCompact}>
          <Text style={styles.label}>Receipt (Optional)</Text>
          {receiptPhoto ? (
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: receiptPhoto }} style={styles.photoPreview} />
              {uploadingReceipt && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
              <TouchableOpacity style={styles.removePhotoButton} onPress={handleRemoveReceipt}>
                <Text style={styles.removePhotoButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addPhotoButton} onPress={() => setShowCamera(true)}>
              <Camera size={20} color={featureColors.expenses.primary} />
              <Text style={styles.addPhotoButtonText}>Add Receipt Photo</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.stickyFooter, { paddingBottom: bottomPadding }]}>
        {isEditMode ? (
          // Edit Mode: Delete + Update buttons
          <View style={styles.footerButtonRow}>
            <TouchableOpacity
              style={[styles.deleteButtonCompact, deleting && styles.buttonDisabled]}
              onPress={handleDelete}
              disabled={deleting || submitting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButtonCompact, styles.submitButtonFlex, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || deleting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Create Mode: Submit button
          <TouchableOpacity
            style={[
              styles.submitButtonCompact,
              (!amount || !!amountError || submitting || uploadingReceipt) && styles.buttonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!amount || !!amountError || submitting || uploadingReceipt}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {!amount ? 'Enter Amount' : uploadingReceipt ? 'Uploading...' : 'Log Expense'}
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
  headerTitle: {
    fontSize: 19,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.inverse,
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    // paddingBottom is set dynamically via inline style (100 + bottomPadding)
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldCompact: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  dateContainer: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    fontWeight: '500',
    marginRight: 8,
  },
  dateNote: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  itemsSummaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: featureColors.expenses.light,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: featureColors.expenses.primary,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryBadgeText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: featureColors.expenses.primary,
  },
  expandCollapseText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  itemCategory: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  removeItemButton: {
    fontSize: typography.fontSize.lg,
    color: colors.error,
    fontWeight: 'bold',
  },
  itemAmount: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: featureColors.expenses.light,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    marginTop: spacing.xs,
  },
  totalLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  totalAmount: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: featureColors.expenses.primary,
  },
  addItemSection: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.sm,
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: featureColors.expenses.primary,
  },
  categoryGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.md,
  },
  categoryPill: {
    width: '46%', // Reduced from 48% to account for gap + borders in production builds
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  categoryPillSelected: {
    borderWidth: 2,
  },
  categoryPillText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  categoryPillTextSelected: {
    fontWeight: typography.fontWeight.semiBold,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  inputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs / 2,
    marginLeft: spacing.xs / 2,
  },
  textArea: {
    minHeight: 50,
    textAlignVertical: 'top',
  },
  addItemButton: {
    backgroundColor: featureColors.expenses.primary,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    minHeight: 48,
    ...shadows.sm,
  },
  addItemButtonSuccess: {
    backgroundColor: '#4CAF50',
  },
  addItemButtonDisabled: {
    backgroundColor: colors.border.default,
    opacity: 0.6,
  },
  addItemButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
  },
  photoPreviewContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: spacing.borderRadius.lg,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 59, 48, 0.9)',
    width: 24,
    height: 24,
    borderRadius: spacing.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removePhotoButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: 'bold',
  },
  addPhotoButton: {
    backgroundColor: featureColors.expenses.light,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: featureColors.expenses.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addPhotoButtonText: {
    fontSize: typography.fontSize.base,
    color: featureColors.expenses.primary,
    fontWeight: typography.fontWeight.medium,
  },
  // Sticky Footer Styles
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // paddingBottom is set dynamically via useBottomSafeArea hook (inline style)
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  footerButtonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  submitButtonCompact: {
    backgroundColor: featureColors.expenses.primary,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.sm + 2,
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
    backgroundColor: colors.border.default,
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  cancelButtonCompact: {
    flex: 0.4,
    backgroundColor: 'transparent',
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
    minHeight: 48,
  },
  cancelButtonCompactText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
  },
  deleteButtonCompact: {
    flex: 0.35,
    backgroundColor: colors.error,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    ...shadows.sm,
  },
  deleteButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
});
