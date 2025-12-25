import React, { useState, useEffect, useRef } from 'react';
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
  Image,
  Modal,
  Linking,
  Keyboard,
} from 'react-native';
import { Camera, MapPin, Building2, ChevronLeft, Phone, FolderOpen, RefreshCw, UserPlus, AlertTriangle, Wallet, FileText, Check, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import { getAuth } from '@react-native-firebase/auth';
import { api } from '../../services/api';
// uploadPhoto imported dynamically via uploadQueue
import { Account } from '../../hooks/useAccounts';
import { CameraCapture } from '../../components/CameraCapture';
import { featureColors } from '../../theme';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { trackVisitLogged } from '../../services/analytics';
import { useToast } from '../../providers/ToastProvider';

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
  { value: 'folder_delivery', label: 'Folder Delivery', Icon: FolderOpen, color: '#1976D2' },
  { value: 'follow_up', label: 'Follow-up', Icon: RefreshCw, color: '#7B1FA2' },
  { value: 'new_lead', label: 'New Lead', Icon: UserPlus, color: '#388E3C' },
  { value: 'complaint', label: 'Complaint', Icon: AlertTriangle, color: '#F57C00' },
  { value: 'payment_collection', label: 'Payment', Icon: Wallet, color: '#00796B' },
  { value: 'other', label: 'Other', Icon: FileText, color: '#616161' },
];

export const LogVisitScreen: React.FC<LogVisitScreenProps> = ({ navigation, route }) => {
  const { account, editActivityId } = route.params;
  const isEditMode = !!editActivityId;
  const toast = useToast();
  const authInstance = getAuth();
  const currentUser = authInstance.currentUser;

  // Safe area insets for bottom padding (accounts for Android nav bar)
  const bottomPadding = useBottomSafeArea(12);
  const scrollViewRef = useRef<ScrollView>(null);

  const [visitAccount, setVisitAccount] = useState<Account | null>(account || null);
  const [purpose, setPurpose] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Prevent duplicate submissions - tracks if form was already successfully submitted
  const hasSubmittedRef = useRef(false);

  // GPS verification state
  const [gpsStatus, setGpsStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [gpsData, setGpsData] = useState<{ lat: number; lon: number; accuracyM: number } | null>(null);

  // Start GPS capture on mount (background, non-blocking)
  useEffect(() => {
    if (isEditMode) {
      // Skip GPS for edit mode - we already have verification
      setGpsStatus('success');
      return;
    }

    let isMounted = true;
    const GPS_TIMEOUT = 8000; // 8 seconds for fresh GPS
    const MAX_ACCURACY = 200; // Accept if accuracy <= 200 meters
    const MAX_AGE = 5 * 60 * 1000; // Accept cached position if < 5 min old
    const startTime = Date.now();

    const captureGPS = async () => {
      try {
        logger.info('[GPS] Starting capture...');

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          logger.info(`[GPS] Permission denied (${Date.now() - startTime}ms)`);
          if (isMounted) setGpsStatus('failed');
          return;
        }

        // STEP 1: Try last known position first (instant)
        const lastKnown = await Location.getLastKnownPositionAsync();
        const lastKnownElapsed = Date.now() - startTime;

        if (lastKnown) {
          const age = Date.now() - lastKnown.timestamp;
          const accuracy = lastKnown.coords.accuracy || 999;

          if (age < MAX_AGE && accuracy <= MAX_ACCURACY) {
            logger.info(`[GPS] ✓ Using cached position (${lastKnownElapsed}ms) - age: ${(age/1000).toFixed(0)}s, accuracy: ±${accuracy.toFixed(0)}m`);
            if (isMounted) {
              setGpsData({
                lat: lastKnown.coords.latitude,
                lon: lastKnown.coords.longitude,
                accuracyM: accuracy,
              });
              setGpsStatus('success');
            }
            return;
          }
          logger.info(`[GPS] Cached position too old (${(age/1000).toFixed(0)}s) or inaccurate (±${accuracy.toFixed(0)}m), getting fresh...`);
        } else {
          logger.info('[GPS] No cached position, getting fresh...');
        }

        // STEP 2: Get fresh position with timeout
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), GPS_TIMEOUT);
        });

        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const result = await Promise.race([locationPromise, timeoutPromise]);
        const elapsed = Date.now() - startTime;

        if (!isMounted) return;

        if (!result) {
          logger.info(`[GPS] Timed out after ${elapsed}ms`);
          setGpsStatus('failed');
          return;
        }

        const accuracy = result.coords.accuracy || 999;
        if (accuracy > MAX_ACCURACY) {
          logger.info(`[GPS] Accuracy too low: ${accuracy}m (max: ${MAX_ACCURACY}m) - took ${elapsed}ms`);
          setGpsStatus('failed');
          return;
        }

        logger.info(`[GPS] ✓ Fresh position in ${elapsed}ms - accuracy: ±${accuracy.toFixed(0)}m`);
        setGpsData({
          lat: result.coords.latitude,
          lon: result.coords.longitude,
          accuracyM: accuracy,
        });
        setGpsStatus('success');
      } catch (error) {
        logger.error('[GPS] Error:', error);
        if (isMounted) setGpsStatus('failed');
      }
    };

    captureGPS();

    return () => {
      isMounted = false;
    };
  }, [isEditMode]);

  // Fetch existing visit data in edit mode (PARALLEL LOADING OPTIMIZATION)
  useEffect(() => {
    if (isEditMode && editActivityId) {
      const fetchExistingData = async () => {
        try {
          setSubmitting(true);

          // STEP 1: Fetch visit data first (fastest)
          const visitResponse = await api.getVisit({ id: editActivityId });

          if (!visitResponse) {
            throw new Error('Visit not found');
          }

          // STEP 2: Immediately render text fields (purpose, notes)
          setPurpose(visitResponse.purpose);
          setNotes(visitResponse.notes || '');
          setSubmitting(false); // Allow user to start editing immediately

          // STEP 3: Parallel loading - Account details & Photo (non-blocking)
          const accountId = visitResponse.accountId;
          const photoUrl = visitResponse.photos?.[0];

          // Load account and photo in parallel
          Promise.allSettled([
            accountId
              ? api.getAccountDetails({ accountId }).then((accountResponse) => {
                  if (accountResponse.ok && accountResponse.account) {
                    setVisitAccount(accountResponse.account);
                  } else {
                    // Fallback to partial data
                    setVisitAccount({
                      id: accountId,
                      name: visitResponse.accountName || 'Unknown Account',
                      type: visitResponse.accountType || 'dealer',
                      address: '',
                      phone: '',
                      city: '',
                      state: '',
                    } as Account);
                  }
                })
              : Promise.resolve(),

            photoUrl
              ? Promise.resolve().then(() => {
                  setPhotoUri(photoUrl);
                })
              : Promise.resolve(),
          ]).catch((err) => {
            logger.error('Error loading account/photo:', err);
            // Non-critical - user can still edit purpose/notes
          });
        } catch (error) {
          logger.error('Error fetching visit data:', error);
          Alert.alert('Error', 'Failed to load visit data');
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
    // Prevent duplicate submissions (user navigated back and resubmitted)
    if (hasSubmittedRef.current) {
      logger.warn('[LogVisit] Blocked duplicate submission attempt');
      return;
    }

    // Validation
    if (!visitAccount) {
      Alert.alert('Error', 'No account selected');
      return;
    }

    if (!purpose) {
      Alert.alert('Error', 'Please select a visit purpose');
      return;
    }

    // Require either GPS success OR photo
    if (gpsStatus !== 'success' && !photoUri) {
      Alert.alert('Error', 'Please wait for GPS or take a photo');
      return;
    }

    setSubmitting(true);

    try {
      if (isEditMode && editActivityId) {
        // EDIT MODE: Use background upload for new photos
        if (photoUri && !photoUri.startsWith('http')) {
          // New photo - queue for background upload
          const { uploadQueue } = await import('../../services/uploadQueue');

          logger.log('[LogVisit] 🚀 Edit mode: Queueing photo for background upload');

          await uploadQueue.addToQueue({
            type: 'visit-update',
            photoUri,
            folder: 'visits',
            metadata: {
              visitId: editActivityId,
              purpose: purpose as any,
              notes: notes.trim() || undefined,
            },
          });

          // Show toast and navigate immediately - photo uploads in background
          toast.show({ kind: 'success', text: 'Visit updated!', duration: 2000 });
          navigation.goBack();
        } else {
          // Photo already uploaded or no photo change - update immediately
          await api.updateVisit({
            id: editActivityId,
            purpose: purpose as any,
            notes: notes.trim() || undefined,
            photos: photoUri ? [photoUri] : [],
          });

          // Show toast and navigate immediately
          toast.show({ kind: 'success', text: 'Visit updated!', duration: 2000 });
          navigation.goBack();
        }
      } else {
        // NEW VISIT: Optimistic update with background upload
        // GPS was captured on mount - use it if available
        logger.log(`[LogVisit] GPS status: ${gpsStatus}, data: ${gpsData ? `${gpsData.lat},${gpsData.lon}` : 'none'}`);

        // Generate unique requestId for idempotency (prevents duplicate visits on network retry)
        const requestId = `${visitAccount.id}_${currentUser?.uid}_${Date.now()}`;

        const { uploadQueue } = await import('../../services/uploadQueue');

        if (photoUri && !photoUri.startsWith('http')) {
          // Queue photo for background upload
          logger.log('[LogVisit] 🚀 Optimistic: Queueing photo for background upload');

          await uploadQueue.addToQueue({
            type: 'visit',
            photoUri,
            folder: 'visits',
            metadata: {
              accountId: visitAccount.id,
              purpose: purpose as any,
              notes: notes.trim() || undefined,
              geo: gpsData || undefined,
              requestId, // For idempotency - prevents duplicates on retry
            },
          });

          // Track analytics event
          trackVisitLogged({
            accountType: visitAccount.type,
            hasPhoto: true,
            purpose: purpose,
          });

          // Mark as submitted to prevent duplicate submissions
          hasSubmittedRef.current = true;

          // Reset form state before navigating (prevents resubmit if user navigates back)
          setPurpose('');
          setNotes('');
          setPhotoUri(null);

          // Show toast and navigate immediately - photo uploads in background!
          toast.show({ kind: 'success', text: 'Visit logged!', duration: 2000 });
          navigation.navigate('Home');
        } else {
          // No new photo - but still use uploadQueue for consistency (instant UX)
          // This queues a visit without photo, uploadQueue handles the API call in background
          const { uploadQueue } = await import('../../services/uploadQueue');

          await uploadQueue.addToQueue({
            type: 'visit',
            photoUri: null, // No photo
            folder: 'visits',
            metadata: {
              accountId: visitAccount.id,
              purpose: purpose as any,
              notes: notes.trim() || undefined,
              geo: gpsData || undefined,
              existingPhotoUrl: photoUri?.startsWith('http') ? photoUri : undefined,
              requestId, // For idempotency - prevents duplicates on retry
            },
          });

          // Track analytics event
          trackVisitLogged({
            accountType: visitAccount.type,
            hasPhoto: !!photoUri,
            purpose: purpose,
          });

          // Mark as submitted to prevent duplicate submissions
          hasSubmittedRef.current = true;

          // Reset form state before navigating (prevents resubmit if user navigates back)
          setPurpose('');
          setNotes('');
          setPhotoUri(null);

          // Show toast and navigate immediately
          toast.show({ kind: 'success', text: 'Visit logged!', duration: 2000 });
          navigation.navigate('Home');
        }
      }
    } catch (error: any) {
      logger.error('Visit logging error:', error);
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
              logger.error('Error deleting visit:', error);
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
        {/* Header - Match Expense/Sheets Design */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackBtn}>
            <Text style={styles.headerBackText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <MapPin size={20} color={featureColors.visits.primary} />
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit Visit' : 'Log Visit'}</Text>
          </View>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: 140 + bottomPadding }]}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >
          {/* Account Info - Compact header card with call button */}
          {visitAccount && (
            <View style={styles.accountCard}>
              <View style={styles.accountIcon}>
                <Building2 size={18} color={featureColors.visits.primary} />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName} numberOfLines={1}>{visitAccount.name}</Text>
                <Text style={styles.accountMeta} numberOfLines={1}>
                  {visitAccount.type.charAt(0).toUpperCase() + visitAccount.type.slice(1)}
                  {visitAccount.city ? ` • ${visitAccount.city}` : ''}
                </Text>
              </View>
              {/* Quick Call Button */}
              {visitAccount.phone && (
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => Linking.openURL(`tel:${visitAccount.phone}`)}
                  activeOpacity={0.7}
                >
                  <Phone size={18} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Main Form - Single unified card */}
          <View style={styles.formCard}>
            {/* Verification Section - GPS or Photo required */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Verification</Text>
                <Text style={styles.requiredBadge}>One Required</Text>
              </View>

              <View style={styles.verificationGrid}>
                {/* GPS Card */}
                <View style={[
                  styles.verificationCard,
                  gpsStatus === 'success' && styles.verificationCardSuccess,
                  gpsStatus === 'failed' && styles.verificationCardFailed,
                ]}>
                  <View style={[
                    styles.verificationIconContainer,
                    gpsStatus === 'success' && { backgroundColor: '#4CAF50' },
                    gpsStatus === 'failed' && { backgroundColor: '#9E9E9E' },
                    gpsStatus === 'loading' && { backgroundColor: featureColors.visits.primary },
                  ]}>
                    {gpsStatus === 'loading' ? (
                      <ActivityIndicator size={16} color="#FFFFFF" />
                    ) : gpsStatus === 'success' ? (
                      <Check size={16} color="#FFFFFF" />
                    ) : (
                      <X size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.verificationContent}>
                    <Text style={styles.verificationTitle}>GPS Location</Text>
                    <Text style={[
                      styles.verificationStatus,
                      gpsStatus === 'success' && { color: '#4CAF50' },
                      gpsStatus === 'failed' && { color: '#9E9E9E' },
                    ]}>
                      {gpsStatus === 'loading' ? 'Locating...' :
                       gpsStatus === 'success' ? 'Captured' :
                       'Unavailable'}
                    </Text>
                  </View>
                </View>

                {/* Photo Card */}
                <TouchableOpacity
                  style={[
                    styles.verificationCard,
                    photoUri && styles.verificationCardSuccess,
                  ]}
                  onPress={() => setShowCamera(true)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.verificationIconContainer,
                    photoUri ? { backgroundColor: '#4CAF50' } : { backgroundColor: '#9E9E9E' },
                  ]}>
                    {photoUri ? (
                      <Check size={16} color="#FFFFFF" />
                    ) : (
                      <Camera size={16} color="#FFFFFF" />
                    )}
                  </View>
                  <View style={styles.verificationContent}>
                    <Text style={styles.verificationTitle}>Photo</Text>
                    <Text style={[
                      styles.verificationStatus,
                      photoUri && { color: '#4CAF50' },
                    ]}>
                      {photoUri ? 'Captured' : 'Tap to take'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Photo Preview (if taken) */}
              {photoUri && (
                <View style={styles.photoPreviewCompact}>
                  <Image source={{ uri: photoUri }} style={styles.photoImageCompact} />
                  <View style={styles.photoActionsCompact}>
                    <TouchableOpacity
                      style={styles.photoActionBtnCompact}
                      onPress={() => setShowCamera(true)}
                    >
                      <Camera size={14} color={featureColors.visits.primary} />
                      <Text style={styles.photoActionTextCompact}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.photoActionBtnCompact}
                      onPress={handleRemovePhoto}
                    >
                      <X size={14} color="#999" />
                      <Text style={[styles.photoActionTextCompact, { color: '#999' }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Visit Purpose - 2 column grid */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Purpose</Text>
              <View style={styles.purposeGrid}>
                {VISIT_PURPOSES.map((item) => {
                  const isSelected = purpose === item.value;
                  const IconComponent = item.Icon;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.purposeCard,
                        isSelected && styles.purposeCardSelected,
                      ]}
                      onPress={() => setPurpose(item.value)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.purposeIconContainer, { backgroundColor: isSelected ? item.color : '#F0F0F0' }]}>
                        <IconComponent size={16} color={isSelected ? '#FFFFFF' : item.color} />
                      </View>
                      <Text style={[
                        styles.purposeCardText,
                        isSelected && styles.purposeCardTextSelected,
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Notes */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabelOptional}>Notes <Text style={styles.optionalText}>(optional)</Text></Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add notes..."
                placeholderTextColor="#AAA"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={2}
                onFocus={() => {
                  // Scroll to show notes field above keyboard
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                  setTimeout(() => {
                    scrollViewRef.current?.scrollToEnd({ animated: true });
                  }, 350);
                }}
              />
            </View>
          </View>

          {/* Extra padding to ensure notes is visible above keyboard */}
          <View style={{ height: 200 }} />

          {/* Upload Progress */}
          {uploading && (
            <View style={styles.uploadingBanner}>
              <ActivityIndicator size="small" color={featureColors.visits.primary} />
              <Text style={styles.uploadingText}>Uploading photo...</Text>
            </View>
          )}
        </ScrollView>

        {/* Fixed Bottom Button */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(bottomPadding, 16) }]}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!purpose || (gpsStatus !== 'success' && !photoUri) || submitting) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!purpose || (gpsStatus !== 'success' && !photoUri) || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isEditMode ? 'Update Visit' : 'Log Visit'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Delete Button (Edit Mode Only) */}
          {isEditMode && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#DC3545" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
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
    backgroundColor: '#F5F5F5',
  },
  // Header - Match Expense/Sheets style
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#393735',
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  headerBackBtn: {
    paddingVertical: 4,
  },
  headerBackText: {
    fontSize: 16,
    fontWeight: '500',
    color: featureColors.visits.primary,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },

  // Account Card - Compact header
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  accountIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: featureColors.visits.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
    minWidth: 0,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  accountMeta: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Form Card - Unified container
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  formSection: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionLabelOptional: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  optionalText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#999',
    textTransform: 'none',
    letterSpacing: 0,
  },
  requiredBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#DC3545',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
  },

  // Photo Section
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: featureColors.visits.light,
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 14,
    borderWidth: 1.5,
    borderColor: featureColors.visits.primary,
    borderStyle: 'dashed',
  },
  photoButtonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: featureColors.visits.primary,
  },
  photoButtonContent: {
    flex: 1,
  },
  photoButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  photoButtonHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  photoPreview: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  photoImage: {
    width: '100%',
    height: 160,
    resizeMode: 'cover',
  },
  photoActions: {
    flexDirection: 'row',
    padding: 8,
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 6,
    backgroundColor: featureColors.visits.light,
  },
  photoActionBtnSecondary: {
    backgroundColor: '#F0F0F0',
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: featureColors.visits.primary,
  },
  photoActionTextSecondary: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },

  // Verification Grid - GPS and Photo cards
  verificationGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  verificationCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8F8F8',
    gap: 10,
  },
  verificationCardSuccess: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1.5,
    borderColor: '#4CAF50',
  },
  verificationCardFailed: {
    backgroundColor: '#F5F5F5',
  },
  verificationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verificationContent: {
    flex: 1,
  },
  verificationTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  verificationStatus: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },

  // Compact photo preview (when photo is taken)
  photoPreviewCompact: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  photoImageCompact: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  photoActionsCompact: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
    gap: 16,
    backgroundColor: '#FAFAFA',
  },
  photoActionBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  photoActionTextCompact: {
    fontSize: 12,
    fontWeight: '500',
    color: featureColors.visits.primary,
  },

  // Purpose Grid - 2 column layout
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  purposeCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8F8F8',
    gap: 10,
  },
  purposeCardSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  purposeIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  purposeCardText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
    flex: 1,
  },
  purposeCardTextSelected: {
    color: '#1A1A1A',
    fontWeight: '600',
  },

  // Notes
  notesInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Upload Banner
  uploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: featureColors.visits.light,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 10,
  },
  uploadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: featureColors.visits.primary,
  },

  // Bottom Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    flexDirection: 'row',
    gap: 12,
  },
  submitButton: {
    flex: 1,
    backgroundColor: featureColors.visits.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#DC3545',
  },
});
