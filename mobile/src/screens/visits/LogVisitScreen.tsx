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
  Image,
  Modal,
} from 'react-native';
import { Camera, MapPin, User, Building2, ChevronLeft } from 'lucide-react-native';
import { api } from '../../services/api';
import { uploadPhoto } from '../../services/storage';
import { Account } from '../../hooks/useAccounts';
import { CameraCapture } from '../../components/CameraCapture';
import { Card } from '../../components/ui';
import { colors, spacing, typography, shadows, featureColors } from '../../theme';

interface LogVisitScreenProps {
  navigation: any;
  route: {
    params: {
      account?: Account;
      editActivityId?: string;
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
  const { account, editActivityId } = route.params;
  const isEditMode = !!editActivityId;

  const [visitAccount, setVisitAccount] = useState<Account | null>(account || null);
  const [purpose, setPurpose] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch existing visit data in edit mode
  useEffect(() => {
    if (isEditMode && editActivityId) {
      const fetchExistingData = async () => {
        try {
          setSubmitting(true);
          const visitResponse = await api.getVisit({ id: editActivityId });

          if (visitResponse) {
            // Fetch full account details to get city/state
            if (visitResponse.accountId) {
              try {
                const accountsResponse = await api.getAccountsList({});
                const fullAccount = accountsResponse.accounts?.find(
                  (acc: any) => acc.id === visitResponse.accountId
                );

                if (fullAccount) {
                  setVisitAccount(fullAccount);
                } else {
                  // Fallback to partial data if account not found
                  setVisitAccount({
                    id: visitResponse.accountId,
                    name: visitResponse.accountName || 'Unknown Account',
                    type: visitResponse.accountType || 'dealer',
                    address: '',
                    phone: '',
                    city: '',
                    state: '',
                  } as Account);
                }
              } catch (accountError) {
                console.error('Error fetching account details:', accountError);
                // Use partial data from visit
                setVisitAccount({
                  id: visitResponse.accountId,
                  name: visitResponse.accountName || 'Unknown Account',
                  type: visitResponse.accountType || 'dealer',
                  address: '',
                  phone: '',
                  city: '',
                  state: '',
                } as Account);
              }
            }

            setPurpose(visitResponse.purpose);
            setNotes(visitResponse.notes || '');
            if (visitResponse.photos && visitResponse.photos.length > 0) {
              setPhotoUri(visitResponse.photos[0]); // Use first photo
            }
          }
        } catch (error) {
          console.error('Error fetching visit data:', error);
          Alert.alert('Error', 'Failed to load visit data');
        } finally {
          setSubmitting(false);
        }
      };
      fetchExistingData();
    }
  }, [isEditMode, editActivityId]);

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
    if (!visitAccount) {
      Alert.alert('Error', 'No account selected');
      return;
    }

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

      // Upload photo if provided and it's a new local photo (not a URL)
      if (photoUri && !photoUri.startsWith('http')) {
        console.log('[LogVisit] Uploading photo...');
        setUploading(true);
        photoUrl = await uploadPhoto(photoUri, 'visits');
        setUploading(false);
        console.log('[LogVisit] Photo uploaded:', photoUrl);
      } else if (photoUri) {
        // Existing photo URL
        photoUrl = photoUri;
      }

      if (isEditMode && editActivityId) {
        // Update existing visit
        await api.updateVisit({
          id: editActivityId,
          purpose: purpose as any,
          notes: notes.trim() || undefined,
          photos: photoUri ? [photoUrl] : [],
        });

        Alert.alert('Success', 'Visit updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new visit
        await api.logVisit({
          accountId: visitAccount.id,
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
      }
    } catch (error: any) {
      console.error('Visit logging error:', error);
      Alert.alert('Error', error.message || 'Failed to log visit');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !editActivityId) return;

    Alert.alert(
      'Delete Visit',
      'Are you sure you want to delete this visit log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteVisit({ id: editActivityId });
              Alert.alert('Success', 'Visit deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error: any) {
              console.error('Error deleting visit:', error);
              Alert.alert('Error', error.message || 'Failed to delete visit');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
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
            <MapPin size={24} color={colors.text.inverse} />
            <Text style={styles.title}>{isEditMode ? 'Edit Visit' : 'Log Visit'}</Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* Account Info Card */}
          {visitAccount && (
            <Card elevation="md" style={styles.accountCard}>
              <View style={styles.accountHeader}>
                <View style={[styles.iconCircle, { backgroundColor: featureColors.visits.light }]}>
                  <Building2 size={20} color={featureColors.visits.primary} />
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{visitAccount.name}</Text>
                  <View style={[
                    styles.typeBadge,
                    visitAccount.type === 'distributor' ? styles.distributorBadge :
                    visitAccount.type === 'architect' ? styles.architectBadge :
                    styles.dealerBadge
                  ]}>
                    <Text style={styles.typeBadgeText}>{visitAccount.type.toUpperCase()}</Text>
                  </View>
                </View>
              </View>
              {visitAccount.contactPerson && (
                <View style={styles.detailRow}>
                  <User size={16} color={colors.text.secondary} />
                  <Text style={styles.accountDetail}>{visitAccount.contactPerson}</Text>
              </View>
            )}
            {(visitAccount.city || visitAccount.state) && (
              <View style={styles.detailRow}>
                <MapPin size={16} color={colors.text.secondary} />
                <Text style={styles.accountDetail}>{visitAccount.city}, {visitAccount.state}</Text>
              </View>
            )}
            </Card>
          )}

          {/* Photo Section */}
          <Card elevation="md" style={styles.section}>
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
                    <Camera size={16} color={colors.surface} />
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
                <Camera size={48} color={featureColors.visits.primary} />
                <Text style={styles.cameraButtonText}>Take Photo</Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Visit Purpose */}
          <Card elevation="md" style={styles.section}>
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
          </Card>

          {/* Notes */}
          <Card elevation="md" style={styles.section}>
            <Text style={styles.sectionLabel}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes about this visit..."
              placeholderTextColor={colors.text.tertiary}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Card>

          {/* Upload Progress */}
          {uploading && (
            <Card elevation="sm" style={styles.uploadingCard}>
              <ActivityIndicator size="small" color={featureColors.visits.primary} />
              <Text style={styles.uploadingText}>Uploading photo...</Text>
            </Card>
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
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditMode ? 'Update Visit' : 'Log Visit'}
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
                <Text style={styles.deleteButtonText}>Delete Visit</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.xl * 2,
  },
  // Account Card
  accountCard: {
    marginBottom: spacing.md,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
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
  // Sections
  section: {
    marginBottom: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  // Photo Section
  cameraButton: {
    backgroundColor: featureColors.visits.light,
    padding: spacing.xl,
    borderRadius: spacing.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: featureColors.visits.primary,
    borderStyle: 'dashed',
    gap: spacing.sm,
  },
  cameraButtonText: {
    fontSize: typography.fontSize.base,
    color: featureColors.visits.primary,
    fontWeight: typography.fontWeight.semiBold,
  },
  photoContainer: {
    backgroundColor: colors.background,
    borderRadius: spacing.borderRadius.md,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
    backgroundColor: colors.background,
  },
  photoActions: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: featureColors.visits.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  retakeButtonText: {
    color: colors.surface,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
  },
  removeButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  removeButtonText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
  },
  // Purpose Selection
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  purposeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border.default,
    backgroundColor: colors.surface,
    minHeight: 44, // Better touch target
  },
  purposeButtonSelected: {
    backgroundColor: featureColors.visits.primary,
    borderColor: featureColors.visits.primary,
  },
  purposeButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  purposeButtonTextSelected: {
    color: colors.surface,
    fontWeight: typography.fontWeight.semiBold,
  },
  // Notes Input
  notesInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    minHeight: 100,
  },
  // Upload Progress
  uploadingCard: {
    backgroundColor: featureColors.visits.light,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  uploadingText: {
    fontSize: typography.fontSize.sm,
    color: featureColors.visits.primary,
    fontWeight: typography.fontWeight.medium,
  },
  // Submit Button
  submitButton: {
    backgroundColor: featureColors.visits.primary,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    alignItems: 'center',
    minHeight: 48, // Better touch target
    ...shadows.sm,
  },
  submitButtonDisabled: {
    backgroundColor: colors.border.default,
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
  },
  deleteButton: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 48,
    ...shadows.sm,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
  },
});
