/**
 * Expense Entry Screen
 * Allows sales reps to log daily expenses with multiple items
 * (e.g., 100 for travel + 500 for hotel in one report)
 */

import React, { useState, useEffect } from 'react';
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
import { Car, UtensilsCrossed, Hotel, FileText, Camera, ChevronLeft, IndianRupee } from 'lucide-react-native';
import { api } from '../../services/api';
import { uploadPhoto } from '../../services/storage';
import { CameraCapture } from '../../components/CameraCapture';
import { Card } from '../../components/ui';
import { SubmitExpenseRequest, ExpenseItem } from '../../types';
import { colors, spacing, typography, shadows, featureColors } from '../../theme';

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
  { value: 'accommodation', label: 'Accommodation', icon: Hotel, color: '#9C27B0' },
  { value: 'other', label: 'Other', icon: FileText, color: '#607D8B' },
];

// Temp item being edited
interface TempExpenseItem {
  category: ExpenseCategory;
  categoryOther: string;
  amount: string;
  description: string;
}

export const ExpenseEntryScreen: React.FC<ExpenseEntryScreenProps> = ({
  navigation,
  route,
}) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Edit mode detection
  const editActivityId = route.params?.editActivityId;
  const isEditMode = !!editActivityId;

  const [date, setDate] = useState(today);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [receiptPhotos, setReceiptPhotos] = useState<string[]>([]);
  const [receiptPhotoUrls, setReceiptPhotoUrls] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Current item being added/edited
  const [currentItem, setCurrentItem] = useState<TempExpenseItem>({
    category: 'travel',
    categoryOther: '',
    amount: '',
    description: '',
  });

  const [showCamera, setShowCamera] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingReceipts, setUploadingReceipts] = useState(false);

  // Fetch existing expense data in edit mode
  useEffect(() => {
    if (isEditMode && editActivityId) {
      const fetchExistingData = async () => {
        try {
          setSubmitting(true);
          const response = await api.getExpense({ id: editActivityId });

          if (response) {
            setDate(response.date);
            setItems(response.items || []);
            if (response.receiptPhotos && response.receiptPhotos.length > 0) {
              setReceiptPhotoUrls(response.receiptPhotos);
              setReceiptPhotos(response.receiptPhotos); // Use URLs as local paths for display
            }
          }
        } catch (error) {
          console.error('Error fetching expense data:', error);
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
    setReceiptPhotos([...receiptPhotos, uri]);

    // Upload photo to Firebase Storage
    try {
      setUploadingReceipts(true);
      const downloadUrl = await uploadPhoto(uri, 'expenses');
      setReceiptPhotoUrls([...receiptPhotoUrls, downloadUrl]);
      console.log('[Expense] Receipt uploaded:', downloadUrl);
    } catch (error) {
      console.error('[Expense] Error uploading receipt:', error);
      Alert.alert('Error', 'Failed to upload receipt photo. Please try again.');
      // Remove the local photo if upload failed
      setReceiptPhotos(receiptPhotos.filter(p => p !== uri));
    } finally {
      setUploadingReceipts(false);
    }
  };

  const handleRemoveReceipt = (index: number) => {
    setReceiptPhotos(receiptPhotos.filter((_, i) => i !== index));
    setReceiptPhotoUrls(receiptPhotoUrls.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    // Validation
    if (!currentItem.amount || currentItem.amount.trim() === '') {
      Alert.alert('Validation Error', 'Please enter an amount');
      return;
    }

    const amountNum = parseFloat(currentItem.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount greater than 0');
      return;
    }

    if (currentItem.category === 'other' && !currentItem.categoryOther.trim()) {
      Alert.alert('Validation Error', 'Please specify the category name for "Other"');
      return;
    }

    if (!currentItem.description || currentItem.description.trim() === '') {
      Alert.alert('Validation Error', 'Please enter a description');
      return;
    }

    // Add item to list
    const newItem: ExpenseItem = {
      amount: amountNum,
      category: currentItem.category,
      ...(currentItem.category === 'other' && { categoryOther: currentItem.categoryOther.trim() }),
      description: currentItem.description.trim(),
    };

    setItems([...items, newItem]);

    // Reset current item
    setCurrentItem({
      category: 'travel',
      categoryOther: '',
      amount: '',
      description: '',
    });

    Alert.alert('Success', 'Expense item added! Add more or submit.');
  };

  const handleRemoveItem = (index: number) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this expense item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setItems(items.filter((_, i) => i !== index)),
        },
      ]
    );
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.amount, 0);
  };

  const handleSubmit = async () => {
    // Validation
    if (items.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one expense item');
      return;
    }

    try {
      setSubmitting(true);

      if (isEditMode && editActivityId) {
        // Update existing expense
        const updateData = {
          id: editActivityId,
          date,
          items,
          ...(receiptPhotoUrls.length > 0 && { receiptPhotos: receiptPhotoUrls }),
        };

        console.log('[Expense] Updating expense report:', updateData);
        await api.updateExpense(updateData);

        Alert.alert('Success', 'Expense report updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new expense
        const expenseData: SubmitExpenseRequest = {
          date,
          items,
          ...(receiptPhotoUrls.length > 0 && { receiptPhotos: receiptPhotoUrls }),
        };

        console.log('[Expense] Submitting expense report:', expenseData);

        const response = await api.submitExpense(expenseData);

        if (response.ok) {
          Alert.alert(
            'Success',
            `Expense report submitted successfully!\nTotal: ₹${response.totalAmount}\nItems: ${response.itemCount}\n\nYour manager will review it.`,
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        } else {
          Alert.alert('Error', response.error || 'Failed to submit expense');
        }
      }
    } catch (error: any) {
      console.error('[Expense] Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to submit expense');
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
              console.error('Error deleting expense:', error);
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

      {/* Added Items List */}
      {items.length > 0 && (
        <View style={styles.field}>
          <Text style={styles.label}>Added Expenses ({items.length})</Text>
          {items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemCategoryRow}>
                  {(() => {
                    const cat = CATEGORIES.find(c => c.value === item.category);
                    const IconComponent = cat?.icon;
                    return IconComponent ? <IconComponent size={16} color={cat.color} /> : null;
                  })()}
                  <Text style={styles.itemCategory}>
                    {CATEGORIES.find(c => c.value === item.category)?.label}
                    {item.category === 'other' && item.categoryOther && ` - ${item.categoryOther}`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveItem(index)}>
                  <Text style={styles.removeItemButton}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.itemAmount}>₹{item.amount.toFixed(2)}</Text>
              <Text style={styles.itemDescription}>{item.description}</Text>
            </View>
          ))}
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalAmount}>₹{getTotalAmount().toFixed(2)}</Text>
          </View>
        </View>
      )}

      {/* Add New Item Section */}
      <View style={styles.addItemSection}>
        <Text style={styles.sectionTitle}>
          {items.length === 0 ? 'Add First Expense Item' : 'Add Another Item'}
        </Text>

        {/* Category Picker */}
        <View style={styles.field}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const IconComponent = cat.icon;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    currentItem.category === cat.value && styles.categoryButtonSelected,
                  ]}
                  onPress={() => setCurrentItem({ ...currentItem, category: cat.value })}
                >
                  <IconComponent
                    size={20}
                    color={currentItem.category === cat.value ? cat.color : colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.categoryButtonText,
                      currentItem.category === cat.value && styles.categoryButtonTextSelected,
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
        {currentItem.category === 'other' && (
          <View style={styles.field}>
            <Text style={styles.label}>Category Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Internet, Office supplies, etc."
              placeholderTextColor="#999"
              value={currentItem.categoryOther}
              onChangeText={(text) => setCurrentItem({ ...currentItem, categoryOther: text })}
            />
          </View>
        )}

        {/* Amount Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Amount (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter amount in INR"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            value={currentItem.amount}
            onChangeText={(text) => setCurrentItem({ ...currentItem, amount: text })}
          />
        </View>

        {/* Description Input */}
        <View style={styles.field}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Brief description of this expense"
            placeholderTextColor="#999"
            multiline
            numberOfLines={2}
            value={currentItem.description}
            onChangeText={(text) => setCurrentItem({ ...currentItem, description: text })}
          />
        </View>

        <TouchableOpacity
          style={styles.addItemButton}
          onPress={handleAddItem}
        >
          <Text style={styles.addItemButtonText}>+ Add This Item</Text>
        </TouchableOpacity>
      </View>

      {/* Receipt Photos (Optional) */}
      <View style={styles.field}>
        <Text style={styles.label}>Receipt Photos (Optional)</Text>
        {receiptPhotos.length > 0 && (
          <View style={styles.photosGrid}>
            {receiptPhotos.map((photo, index) => (
              <View key={index} style={styles.photoPreviewContainer}>
                <Image source={{ uri: photo }} style={styles.photoPreview} />
                {uploadingReceipts && index === receiptPhotos.length - 1 && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={() => handleRemoveReceipt(index)}
                >
                  <Text style={styles.removePhotoButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.addPhotoButton}
          onPress={() => setShowCamera(true)}
        >
          <Camera size={20} color={colors.primary} />
          <Text style={styles.addPhotoButtonText}>
            {receiptPhotos.length > 0 ? 'Add Another Receipt' : 'Add Receipt Photo'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          (submitting || uploadingReceipts || items.length === 0) && styles.submitButtonDisabled
        ]}
        onPress={handleSubmit}
        disabled={submitting || uploadingReceipts || items.length === 0}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>
            {isEditMode ? 'Update Report' : `Submit Report (${items.length} ${items.length === 1 ? 'item' : 'items'})`}
          </Text>
        )}
      </TouchableOpacity>

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
            <Text style={styles.deleteButtonText}>Delete Expense Report</Text>
          )}
        </TouchableOpacity>
      )}

      {!isEditMode && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
      </ScrollView>
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
    paddingBottom: spacing.xl * 2,
  },
  field: {
    marginBottom: spacing.md,
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
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
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
    borderWidth: 2,
    borderColor: featureColors.expenses.primary,
    borderStyle: 'dashed',
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: featureColors.expenses.primary,
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.sm,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    gap: spacing.xs / 2,
  },
  categoryButtonSelected: {
    borderColor: featureColors.expenses.primary,
    backgroundColor: featureColors.expenses.light,
  },
  categoryButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  categoryButtonTextSelected: {
    color: featureColors.expenses.primary,
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
  submitButton: {
    backgroundColor: featureColors.expenses.primary,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 48,
    ...shadows.sm,
  },
  submitButtonDisabled: {
    backgroundColor: colors.border.default,
    opacity: 0.6,
  },
  submitButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: spacing.borderRadius.lg,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.base,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 48,
    ...shadows.sm,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
});
