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
  Image,
  Modal,
} from 'react-native';
import { Camera, MapPin, User, Building2 } from 'lucide-react-native';
import { api } from '../../services/api';
import { uploadPhoto } from '../../services/storage';
import { Account } from '../../hooks/useAccounts';
import { CameraCapture } from '../../components/CameraCapture';
import { colors, spacing, typography, shadows } from '../../theme';

interface LogVisitScreenProps {
  navigation: any;
  route: {
    params: {
      account: Account;
    };
  };
}

const VISIT_PURPOSES = [
  { value: 'sample_delivery', label: 'Sample Delivery' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'new_lead', label: 'New Lead' },
  { value: 'payment_collection', label: 'Payment Collection' },
  { value: 'other', label: 'Other' },
];

export const LogVisitScreen: React.FC<LogVisitScreenProps> = ({ navigation, route }) => {
  const { account } = route.params;

  const [purpose, setPurpose] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoTaken = (uri: string) => {
    setPhotoUri(uri);
    setShowCamera(false);
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setPhotoUri(null),
        },
      ]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!purpose) {
      Alert.alert('Error', 'Please select a visit purpose');
      return;
    }

    // TEMPORARY: Make photo optional for testing
    // if (!photoUri) {
    //   Alert.alert('Error', 'Please take a photo of the counter');
    //   return;
    // }

    setSubmitting(true);

    try {
      let photoUrl = '';

      // Upload photo if provided
      if (photoUri) {
        console.log('[LogVisit] Uploading photo...');
        setUploading(true);
        photoUrl = await uploadPhoto(photoUri, 'visits');
        setUploading(false);
        console.log('[LogVisit] Photo uploaded:', photoUrl);
      }

      // Submit visit with photo URL (or empty array if no photo)
      await api.logVisit({
        accountId: account.id,
        purpose: purpose as any,
        notes: notes.trim() || undefined,
        photos: photoUri ? [photoUrl] : [],
      });

      Alert.alert('Success', 'Visit logged successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Home');
          },
        },
      ]);
    } catch (error: any) {
      console.error('Visit logging error:', error);
      Alert.alert('Error', error.message || 'Failed to log visit');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Log Visit</Text>
        </View>

        {/* Account Info */}
        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <Building2 size={20} color={colors.accent} />
            <Text style={styles.accountName}>{account.name}</Text>
          </View>
          <View style={[
            styles.typeBadge,
            account.type === 'distributor' ? styles.distributorBadge :
            account.type === 'architect' ? styles.architectBadge :
            styles.dealerBadge
          ]}>
            <Text style={styles.typeBadgeText}>{account.type.toUpperCase()}</Text>
          </View>
          {account.contactPerson && (
            <View style={styles.detailRow}>
              <User size={16} color={colors.text.secondary} />
              <Text style={styles.accountDetail}>{account.contactPerson}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <MapPin size={16} color={colors.text.secondary} />
            <Text style={styles.accountDetail}>{account.city}, {account.state}</Text>
          </View>
        </View>

        {/* Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Counter Photo *</Text>
          <Text style={styles.helpText}>
            Take a photo of the counter or storefront to verify your visit
          </Text>

          {photoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => setShowCamera(true)}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={handleRemovePhoto}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setShowCamera(true)}
            >
              <Camera size={48} color={colors.accent} />
              <Text style={styles.cameraButtonText}>Take Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Visit Purpose */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Visit Purpose *</Text>
          <View style={styles.purposeGrid}>
            {VISIT_PURPOSES.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.purposeButton,
                  purpose === item.value && styles.purposeButtonSelected,
                ]}
                onPress={() => setPurpose(item.value)}
              >
                <Text
                  style={[
                    styles.purposeButtonText,
                    purpose === item.value && styles.purposeButtonTextSelected,
                  ]}
                >
                  {item.label}
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
            placeholder="Add any notes about this visit..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Upload Progress */}
        {uploading && (
          <View style={styles.uploadingCard}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.uploadingText}>Uploading photo...</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!purpose || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!purpose || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[
              styles.submitButtonText,
              (!purpose || submitting) && styles.submitButtonTextDisabled
            ]}>
              Log Visit
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        onRequestClose={() => setShowCamera(false)}
      >
        <CameraCapture
          onPhotoTaken={handlePhotoTaken}
          onCancel={() => setShowCamera(false)}
        />
      </Modal>
    </>
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
    fontWeight: typography.fontWeight.semibold,
    color: colors.accent,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
  },
  accountCard: {
    backgroundColor: colors.surface,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
    ...shadows.sm,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  accountName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
  },
  distributorBadge: {
    backgroundColor: '#E3F2FD',
  },
  dealerBadge: {
    backgroundColor: '#FFF3E0',
  },
  architectBadge: {
    backgroundColor: '#F3E5F5',
  },
  typeBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.secondary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  accountDetail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  cameraButton: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: spacing.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  cameraButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.accent,
    fontWeight: typography.fontWeight.semibold,
  },
  photoContainer: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  photoPreview: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  photoActions: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: colors.accent,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: colors.primary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  removeButton: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  removeButtonText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  purposeButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.surface,
  },
  purposeButtonSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  purposeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  purposeButtonTextSelected: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  notesInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    minHeight: 100,
  },
  uploadingCard: {
    backgroundColor: colors.accentLight,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  uploadingText: {
    fontSize: typography.fontSize.sm,
    color: colors.accentDark,
    fontWeight: typography.fontWeight.medium,
  },
  submitButton: {
    backgroundColor: colors.success,
    marginHorizontal: spacing.lg,
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
  submitButtonTextDisabled: {
    color: '#666',
  },
});
