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
  const [category, setCategory] = useState<ExpenseCategory | null>(null);
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

    if (!category) {
      Alert.alert('Error', 'Please select a category');
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
      {/* Header */}
      <View style={styles.headerNew}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
          <Text style={styles.headerBackText}>Cancel</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <IndianRupee size={20} color={featureColors.expenses.primary} />
          <Text style={styles.headerTitleNew}>{isEditMode ? 'Edit Expense' : 'Log Expense'}</Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 100 + bottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form Card */}
        <View style={styles.formCard}>
          {/* Category Grid - 2x2 */}
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const IconComponent = cat.icon;
              const isSelected = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryCard,
                    isSelected && { borderColor: cat.color, borderWidth: 2.5 },
                  ]}
                  onPress={() => setCategory(cat.value)}
                >
                  <View style={[styles.categoryBadge, { backgroundColor: cat.color }]}>
                    <IconComponent size={20} color="#fff" />
                  </View>
                  <Text style={[styles.categoryLabel, isSelected && { color: cat.color }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Other Category Name (required when "other" selected) */}
          {category === 'other' && (
            <TextInput
              style={[styles.otherInput, !categoryOther.trim() && styles.otherInputRequired]}
              placeholder="Enter category name *"
              placeholderTextColor={colors.text.tertiary}
              value={categoryOther}
              onChangeText={setCategoryOther}
            />
          )}

          {/* Amount Input */}
          <View style={styles.amountSection}>
            <TextInput
              style={[
                styles.amountInput,
                category && styles.amountInputActive,
                amountError && styles.amountInputError,
              ]}
              placeholder="0"
              placeholderTextColor={colors.text.tertiary}
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
            <Text style={styles.amountLabel}>rupees</Text>
          </View>

          {/* Note + Receipt row */}
          <View style={styles.bottomRow}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add note (optional)"
              placeholderTextColor={colors.text.tertiary}
              value={description}
              onChangeText={setDescription}
            />
            {receiptPhoto ? (
              <TouchableOpacity style={styles.receiptPreview} onPress={handleRemoveReceipt}>
                <Image source={{ uri: receiptPhoto }} style={styles.receiptImage} />
                {uploadingReceipt && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                <View style={styles.receiptRemove}>
                  <Text style={styles.receiptRemoveText}>✕</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.receiptBtn} onPress={() => setShowCamera(true)}>
                <Camera size={20} color={featureColors.expenses.primary} />
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
              (!category || !amount || !!amountError || submitting || uploadingReceipt || (category === 'other' && !categoryOther.trim())) && styles.buttonDisabled
            ]}
            onPress={handleSubmit}
            disabled={!category || !amount || !!amountError || submitting || uploadingReceipt || (category === 'other' && !categoryOther.trim())}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {!category ? 'Select Category' : category === 'other' && !categoryOther.trim() ? 'Enter Category Name' : !amount ? 'Enter Amount' : uploadingReceipt ? 'Uploading...' : 'Log Expense'}
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
    backgroundColor: '#F5F5F5',
  },
  // New Header - matches Sheets screen
  headerNew: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: spacing.screenPadding,
  },
  headerBackBtn: {
    paddingVertical: 4,
  },
  headerBackText: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    color: colors.accent,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitleNew: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: '#fff',
  },
  headerDesignBtn: {
    paddingVertical: 4,
  },
  headerDesignText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.accent,
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

  // Category Grid - 2x2 like Sheets
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    padding: 14,
  },
  categoryBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },

  // Other category input
  otherInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text.primary,
    marginTop: -12,
    marginBottom: 20,
  },
  otherInputRequired: {
    borderColor: featureColors.expenses.primary,
  },

  // Amount Section
  amountSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amountInput: {
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
  amountInputActive: {
    borderColor: featureColors.expenses.primary,
  },
  amountInputError: {
    borderColor: colors.error,
  },
  amountLabel: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 6,
  },

  // Bottom row - Note + Receipt
  bottomRow: {
    flexDirection: 'row',
    gap: 10,
  },
  noteInput: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text.primary,
  },
  receiptBtn: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: featureColors.expenses.primary,
  },
  receiptPreview: {
    width: 50,
    height: 50,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  receiptRemove: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(255,59,48,0.9)',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptRemoveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
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
