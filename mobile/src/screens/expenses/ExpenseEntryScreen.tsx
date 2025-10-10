/**
 * Expense Entry Screen
 * Allows sales reps to log daily expenses with multiple items
 * (e.g., 100 for travel + 500 for hotel in one report)
 */

import React, { useState } from 'react';
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
import { Car, UtensilsCrossed, Hotel, FileText, Camera } from 'lucide-react-native';
import { api } from '../../services/api';
import { uploadPhoto } from '../../services/storage';
import { CameraCapture } from '../../components/CameraCapture';
import { SubmitExpenseRequest, ExpenseItem } from '../../types';
import { colors, spacing, typography, shadows } from '../../theme';

interface ExpenseEntryScreenProps {
  navigation: any;
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
}) => {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const [date, setDate] = useState(today);
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [receiptPhotos, setReceiptPhotos] = useState<string[]>([]);
  const [receiptPhotoUrls, setReceiptPhotoUrls] = useState<string[]>([]);

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
    } catch (error: any) {
      console.error('[Expense] Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to submit expense');
    } finally {
      setSubmitting(false);
    }
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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Expenses</Text>
        <Text style={styles.headerSubtitle}>
          Add multiple expense items in one report
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>

      {/* Date Field */}
      <View style={styles.field}>
        <Text style={styles.label}>Date</Text>
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>{date}</Text>
          <Text style={styles.dateNote}>(Today)</Text>
        </View>
      </View>

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
            Submit Report ({items.length} {items.length === 1 ? 'item' : 'items'})
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelButton}
        onPress={() => navigation.goBack()}
        disabled={submitting}
      >
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: '#fff',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
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
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
    backgroundColor: '#E3F2FD',
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text.primary,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  addItemSection: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    gap: spacing.xs,
  },
  categoryButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  categoryButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  categoryButtonTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  addItemButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: 10,
  },
  addItemButtonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: '600',
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
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addPhotoButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.primary,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.lg,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
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
});
