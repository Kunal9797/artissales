import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { getFirestore, doc, onSnapshot, getDoc } from '@react-native-firebase/firestore';
import { api } from '../../services/api';
import { User as UserIcon, Mail, Phone, Camera, MapPin, Briefcase, PhoneCall, Edit, X } from 'lucide-react-native';
import { uploadProfilePhoto, deleteProfilePhoto, cacheProfilePhotoLocally, getLocalProfilePhoto } from '../../services/storage';
import { selectPhoto } from '../../utils/photoUtils';
import { colors, spacing, typography } from '../../theme';
import { Card } from '../../components/ui';
import { Skeleton } from '../../patterns';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  // Safe area insets for bottom padding (accounts for Android nav bar)
  const bottomPadding = useBottomSafeArea(12);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [territory, setTerritory] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Quick call contacts
  const [managerInfo, setManagerInfo] = useState<{ name: string; phone: string } | null>(null);
  const [distributorInfo, setDistributorInfo] = useState<{ name: string; phone: string } | null>(null);

  // Edit modal state (managers only)
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTerritory, setEditTerritory] = useState('');
  const [saving, setSaving] = useState(false);

  // Check if current user is a manager
  const isManager = ['area_manager', 'zonal_head', 'national_head', 'admin'].includes(role);

  // Sales Head contact (Shiv) - always available for sales reps
  const SALES_HEAD_CONTACT = {
    name: 'Shiv',
    phone: '+917043045045',
    title: 'Sales Head',
  };

  // Load local cached photo on mount
  useEffect(() => {
    const loadLocalPhoto = async () => {
      const localUri = await getLocalProfilePhoto();
      if (localUri) {
        setLocalPhotoUri(localUri);
        logger.debug('Profile', 'Loaded profile photo from local cache');
      }
    };
    loadLocalPhoto();
  }, []);

  useEffect(() => {
    if (!user) return;

    const db = getFirestore();

    // Fetch user profile from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data?.name || '');
          setEmail(data?.email || '');
          setRole(data?.role || 'rep');
          setTerritory(data?.territory || 'Not assigned');
          setProfilePhotoUrl(data?.profilePhotoUrl || null);

          // Fetch manager info if reportsToUserId exists
          if (data?.reportsToUserId) {
            try {
              const managerDocRef = doc(db, 'users', data.reportsToUserId);
              const managerDoc = await getDoc(managerDocRef);
              if (managerDoc.exists()) {
                const managerData = managerDoc.data();
                setManagerInfo({
                  name: managerData?.name || 'Manager',
                  phone: managerData?.phone || '',
                });
              }
            } catch (err) {
              logger.error('Failed to fetch manager info:', err);
            }
          }

          // Fetch assigned distributor info if exists
          if (data?.primaryDistributorId) {
            try {
              const distDocRef = doc(db, 'accounts', data.primaryDistributorId);
              const distDoc = await getDoc(distDocRef);
              if (distDoc.exists()) {
                const distData = distDoc.data();
                setDistributorInfo({
                  name: distData?.name || 'Distributor',
                  phone: distData?.phone || '',
                });
              }
            } catch (err) {
              logger.error('Failed to fetch distributor info:', err);
            }
          }
        }
        setLoading(false);
      },
      (error) => {
        logger.error('Profile fetch error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const getRoleDisplay = (roleValue: string): string => {
    const roleMap: { [key: string]: string } = {
      rep: 'Sales Representative',
      area_manager: 'Area Manager',
      zonal_head: 'Zonal Head',
      national_head: 'National Head',
      admin: 'Administrator',
    };
    return roleMap[roleValue] || roleValue;
  };

  const handleCall = (phone: string, contactName: string) => {
    if (!phone) {
      Alert.alert('No Phone Number', `No phone number available for ${contactName}`);
      return;
    }
    const phoneUrl = `tel:${phone}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device');
        }
      })
      .catch((err) => {
        logger.error('Failed to make call:', err);
        Alert.alert('Error', 'Failed to initiate call');
      });
  };

  const handleChangePhoto = async () => {
    const photoUri = await selectPhoto({
      title: 'Profile Photo',
      includeRemove: !!localPhotoUri || !!profilePhotoUrl,
      onRemove: handleRemovePhoto,
    });

    if (!photoUri) return;

    try {
      setUploadingPhoto(true);

      // Step 1: Cache locally first (instant)
      const localUri = await cacheProfilePhotoLocally(photoUri);
      setLocalPhotoUri(localUri);
      logger.debug('Profile', 'Profile photo cached locally, displaying immediately');

      // Step 2: Upload to cloud in background
      const downloadUrl = await uploadProfilePhoto(photoUri);
      await api.updateProfile({ profilePhotoUrl: downloadUrl });
      setProfilePhotoUrl(downloadUrl);

      Alert.alert('Success', 'Profile photo updated!');
    } catch (error: any) {
      logger.error('Profile photo upload error:', error);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setUploadingPhoto(true);
              await deleteProfilePhoto(); // Also deletes local cache
              await api.updateProfile({ profilePhotoUrl: '' });
              setProfilePhotoUrl(null);
              setLocalPhotoUri(null);
              Alert.alert('Success', 'Profile photo removed');
            } catch (error: any) {
              logger.error('Profile photo removal error:', error);
              Alert.alert('Error', 'Failed to remove photo');
            } finally {
              setUploadingPhoto(false);
            }
          },
        },
      ]
    );
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Profile data updates via onSnapshot listener, so just wait a moment
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

  // Edit profile handlers (managers only)
  const handleEditPress = () => {
    setEditName(name || '');
    setEditPhone(user?.phoneNumber || '');
    setEditTerritory(territory || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({
        name: editName.trim(),
        territory: editTerritory.trim(),
      });
      Alert.alert('Success', 'Profile updated');
      setShowEditModal(false);
    } catch (err: any) {
      logger.error('Profile update error:', err);
      Alert.alert('Error', err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            try {
              await signOut(authInstance);
              // Success - navigation will happen automatically via auth state listener
            } catch (error: any) {
              logger.error('Sign out error:', error);
              // Don't show alert during navigation/unmount - just log it
              // The error is rare and user will see they're still logged in
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{
          backgroundColor: '#393735',
          paddingHorizontal: 24,
          paddingTop: 52,
          paddingBottom: 20,
        }}>
          <Skeleton rows={1} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.screenPadding }}>
          <Skeleton card />
          <Skeleton card />
          <Skeleton rows={2} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Artis Logo - Branding (black bg version shows light peacock) */}
            <Image
              source={require('../../../assets/images/artislogo_blackbgrd.png')}
              style={{ width: 48, height: 48 }}
              resizeMode="contain"
            />
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>
              Profile
            </Text>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: signingOut ? '#E0E0E0' : '#C9A961',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            onPress={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? (
              <ActivityIndicator size="small" color="#393735" />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#393735' }}>Logout</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: 80 + bottomPadding }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Card */}
        <Card elevation="md" style={styles.profileCard}>
          {/* Top row: Photo + Name */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity
                style={[
                  styles.avatar,
                  (localPhotoUri || profilePhotoUrl) && styles.avatarWithPhoto
                ]}
                onPress={handleChangePhoto}
                disabled={uploadingPhoto}
                activeOpacity={0.7}
              >
                {(localPhotoUri || profilePhotoUrl) ? (
                  <Image
                    source={{ uri: (localPhotoUri || profilePhotoUrl) as string }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <UserIcon size={32} color="#C9A961" />
                )}
                {uploadingPhoto && (
                  <View style={styles.avatarLoading}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Camera badge overlay */}
              <View style={styles.cameraBadge}>
                <Camera size={12} color="#393735" />
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name || 'User'}</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Details list */}
          <View style={styles.detailRow}>
            <Mail size={18} color={colors.text.tertiary} />
            <Text style={styles.detailText}>{email || 'No email set'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Phone size={18} color={colors.text.tertiary} />
            <Text style={styles.detailText}>{user?.phoneNumber}</Text>
          </View>

          <View style={styles.detailRow}>
            <Briefcase size={18} color={colors.text.tertiary} />
            <Text style={styles.detailText}>{getRoleDisplay(role)}</Text>
          </View>

          <View style={styles.detailRow}>
            <MapPin size={18} color={colors.text.tertiary} />
            <Text style={styles.detailText}>{territory}</Text>
          </View>

          {/* Edit button for managers */}
          {isManager && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.editDetailsButton}
                onPress={handleEditPress}
                activeOpacity={0.7}
              >
                <Edit size={18} color="#666666" />
                <Text style={styles.editDetailsText}>Edit Details</Text>
              </TouchableOpacity>
            </>
          )}
        </Card>

        {/* Quick Contacts */}
        <Card elevation="sm" style={styles.contactsCard}>
          <Text style={styles.contactsTitle}>Contacts</Text>

          {/* Sales Head Contact - Always visible */}
          <View style={styles.contactItem}>
            <View style={styles.contactInfo}>
              <View style={styles.contactAvatar}>
                <Text style={styles.contactAvatarText}>
                  {SALES_HEAD_CONTACT.name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.contactDetails}>
                <Text style={styles.contactName}>{SALES_HEAD_CONTACT.name}</Text>
                <Text style={styles.contactRole}>{SALES_HEAD_CONTACT.title}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.contactCallButton}
              onPress={() => handleCall(SALES_HEAD_CONTACT.phone, SALES_HEAD_CONTACT.name)}
              activeOpacity={0.7}
            >
              <PhoneCall size={18} color="#4CAF50" />
            </TouchableOpacity>
          </View>

          {managerInfo && (
            <>
              <View style={styles.contactDivider} />
              <View style={styles.contactItem}>
                <View style={styles.contactInfo}>
                  <View style={[styles.contactAvatar, styles.contactAvatarSecondary]}>
                    <Text style={[styles.contactAvatarText, styles.contactAvatarTextSecondary]}>
                      {managerInfo.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactName}>{managerInfo.name}</Text>
                    <Text style={styles.contactRole}>Manager</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.contactCallButton}
                  onPress={() => handleCall(managerInfo.phone, managerInfo.name)}
                  activeOpacity={0.7}
                >
                  <PhoneCall size={18} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </>
          )}

          {distributorInfo && (
            <>
              <View style={styles.contactDivider} />
              <View style={styles.contactItem}>
                <View style={styles.contactInfo}>
                  <View style={[styles.contactAvatar, styles.contactAvatarSecondary]}>
                    <Text style={[styles.contactAvatarText, styles.contactAvatarTextSecondary]}>
                      {distributorInfo.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.contactDetails}>
                    <Text style={styles.contactName}>{distributorInfo.name}</Text>
                    <Text style={styles.contactRole}>Distributor</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.contactCallButton}
                  onPress={() => handleCall(distributorInfo.phone, distributorInfo.name)}
                  activeOpacity={0.7}
                >
                  <PhoneCall size={18} color="#4CAF50" />
                </TouchableOpacity>
              </View>
            </>
          )}
        </Card>

        {/* Sign Out button moved to header */}
      </ScrollView>

      {/* Edit Profile Modal (managers only) */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                editable={!saving}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={editPhone}
                editable={false}
                placeholder="Phone number"
              />
              <Text style={styles.inputHint}>Phone number cannot be changed</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Territory</Text>
              <TextInput
                style={styles.input}
                value={editTerritory}
                onChangeText={setEditTerritory}
                placeholder="Enter territory"
                editable={!saving}
              />
            </View>

            <View style={styles.editModalButtons}>
              <TouchableOpacity
                style={[styles.editModalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editModalButton, styles.saveButton]}
                onPress={handleSaveEdit}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  // Header
  header: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: 52, // Status bar space
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.3,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.screenPadding,
    // paddingBottom set dynamically via useBottomSafeArea hook (80 + bottomPadding)
  },
  // Compact Profile Card
  profileCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  avatarWithPhoto: {
    borderColor: '#C9A961',
    borderWidth: 2,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 32,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C9A961',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  detailText: {
    fontSize: 15,
    color: colors.text.primary,
  },
  // Contacts Card
  contactsCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  contactsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#393735',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarSecondary: {
    backgroundColor: '#E8E8E8',
  },
  contactAvatarText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  contactAvatarTextSecondary: {
    color: '#666666',
  },
  contactDetails: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text.primary,
    marginBottom: 2,
  },
  contactRole: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  contactCallButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactDivider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.xs,
  },
  // Sign Out Button
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.error,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    marginTop: spacing.md,
  },
  signOutButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.error,
  },
  // Edit Details Button (managers)
  editDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  editDetailsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666666',
  },
  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.xl,
    width: '85%',
    maxWidth: 400,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  editModalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
    backgroundColor: colors.background,
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: colors.text.tertiary,
  },
  inputHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs / 2,
  },
  editModalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  editModalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.secondary,
  },
  saveButton: {
    backgroundColor: '#C9A961',
  },
  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: '#FFFFFF',
  },
});
