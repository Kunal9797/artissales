/**
 * ProfileSheet - Bottom sheet modal for profile info and logout
 *
 * Features:
 * - Slides up from bottom
 * - Shows user avatar, name, role, contact info
 * - Quick call buttons for manager/distributor
 * - Sign out button at bottom (safe from accidental taps)
 * - Dismisses on backdrop tap
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Switch,
} from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { getFirestore, doc, onSnapshot, getDoc } from '@react-native-firebase/firestore';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  PhoneCall,
  LogOut,
  ChevronRight,
  HelpCircle,
  Moon,
  Sun,
} from 'lucide-react-native';
import { colors, spacing, typography, useTheme } from '../theme';
import { getLocalProfilePhoto } from '../services/storage';
import { logger } from '../utils/logger';
import { FeedbackForm } from './FeedbackForm';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateHomeStatsCache } from '../screens/HomeScreen_v2';

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Safe area bottom padding for ProfileSheet
// NOTE: This component renders OUTSIDE SafeAreaProvider (in ProfileSheetProvider which is above SafeAreaProvider)
// So we cannot use useSafeAreaInsets() hook here. Using conservative defaults instead.
// Android 3-button nav: ~48px, Android gesture nav: ~0px, iOS home indicator: ~34px
// Using 48px to cover worst case (Android 3-button nav)
const BOTTOM_SAFE_AREA_PADDING = Platform.OS === 'android' ? 48 : 34;

export const ProfileSheet: React.FC<ProfileSheetProps> = ({ visible, onClose }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  const bottomPadding = BOTTOM_SAFE_AREA_PADDING;

  // Theme context for dark mode
  const { isDark, toggleTheme, colors: themeColors } = useTheme();

  // React Query client for cache management
  const queryClient = useQueryClient();

  // User data state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [territory, setTerritory] = useState('');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Quick call contacts
  const [managerInfo, setManagerInfo] = useState<{ name: string; phone: string } | null>(null);
  const [distributorInfo, setDistributorInfo] = useState<{ name: string; phone: string } | null>(null);

  // Feedback form
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  // Load local cached photo
  useEffect(() => {
    const loadLocalPhoto = async () => {
      const localUri = await getLocalProfilePhoto();
      if (localUri) {
        setLocalPhotoUri(localUri);
      }
    };
    loadLocalPhoto();
  }, []);

  // Subscribe to user data
  useEffect(() => {
    if (!user || !visible) return;

    const db = getFirestore();
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

          // Fetch manager info
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

          // Fetch distributor info
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
      },
      (error) => {
        logger.error('Profile sheet fetch error:', error);
      }
    );

    return () => unsubscribe();
  }, [user, visible]);

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
    Linking.openURL(phoneUrl).catch((err) => {
      logger.error('Failed to make call:', err);
      Alert.alert('Error', `Unable to make phone call. Please dial manually: ${phone}`);
    });
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
              onClose(); // Close sheet first

              // SECURITY: Clear all caches BEFORE logout to prevent data leakage
              queryClient.clear(); // Clear React Query cache (manager dashboard)
              invalidateHomeStatsCache(); // Clear custom stats cache (sales rep)

              await signOut(authInstance);
            } catch (error: any) {
              logger.error('Sign out error:', error);
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop - tap to dismiss */}
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Sheet Content */}
        <View style={[styles.sheet, { paddingBottom: bottomPadding, backgroundColor: themeColors.background }]}>
          {/* Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: themeColors.border.default }]} />
          </View>

          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {(localPhotoUri || profilePhotoUrl) ? (
                <Image
                  source={{ uri: (localPhotoUri || profilePhotoUrl) as string }}
                  style={[styles.avatar, { borderColor: themeColors.accent }]}
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.surface, borderColor: themeColors.border.default }]}>
                  <UserIcon size={32} color={themeColors.accent} />
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: themeColors.text.primary }]}>{name || 'User'}</Text>
              <Text style={[styles.roleTerritory, { color: themeColors.text.secondary }]}>
                {getRoleDisplay(role)} {territory ? `\u2022 ${territory}` : ''}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: themeColors.border.light }]} />

          {/* Contact Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Mail size={18} color={themeColors.text.tertiary} />
              <Text style={[styles.detailText, { color: themeColors.text.primary }]}>{email || 'No email set'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Phone size={18} color={themeColors.text.tertiary} />
              <Text style={[styles.detailText, { color: themeColors.text.primary }]}>{user?.phoneNumber || 'No phone'}</Text>
            </View>
          </View>

          {/* Quick Contacts */}
          {(managerInfo || distributorInfo) && (
            <>
              <View style={[styles.divider, { backgroundColor: themeColors.border.light }]} />
              <View style={styles.contactsSection}>
                {managerInfo && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => handleCall(managerInfo.phone, managerInfo.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.contactLeft}>
                      <View style={[styles.contactAvatar, { backgroundColor: themeColors.accent }]}>
                        <Text style={[styles.contactAvatarText, { color: themeColors.text.inverse }]}>
                          {managerInfo.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.contactName, { color: themeColors.text.primary }]}>{managerInfo.name}</Text>
                        <Text style={[styles.contactRole, { color: themeColors.text.tertiary }]}>Manager</Text>
                      </View>
                    </View>
                    <View style={[styles.callButton, { backgroundColor: themeColors.successLight }]}>
                      <PhoneCall size={18} color={themeColors.success} />
                    </View>
                  </TouchableOpacity>
                )}

                {distributorInfo && (
                  <TouchableOpacity
                    style={styles.contactRow}
                    onPress={() => handleCall(distributorInfo.phone, distributorInfo.name)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.contactLeft}>
                      <View style={[styles.contactAvatar, { backgroundColor: themeColors.surface }]}>
                        <Text style={[styles.contactAvatarText, { color: themeColors.text.secondary }]}>
                          {distributorInfo.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={[styles.contactName, { color: themeColors.text.primary }]}>{distributorInfo.name}</Text>
                        <Text style={[styles.contactRole, { color: themeColors.text.tertiary }]}>Distributor</Text>
                      </View>
                    </View>
                    <View style={[styles.callButton, { backgroundColor: themeColors.successLight }]}>
                      <PhoneCall size={18} color={themeColors.success} />
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* Need Help Section */}
          <View style={[styles.divider, { backgroundColor: themeColors.border.light }]} />
          <TouchableOpacity
            style={styles.helpRow}
            onPress={() => setShowFeedbackForm(true)}
            activeOpacity={0.7}
          >
            <View style={styles.helpLeft}>
              <View style={[styles.helpIconContainer, { backgroundColor: themeColors.infoLight }]}>
                <HelpCircle size={20} color={themeColors.info} />
              </View>
              <View>
                <Text style={[styles.helpTitle, { color: themeColors.text.primary }]}>Need Help?</Text>
                <Text style={[styles.helpSubtitle, { color: themeColors.text.tertiary }]}>Send feedback or report an issue</Text>
              </View>
            </View>
            <ChevronRight size={20} color={themeColors.text.tertiary} />
          </TouchableOpacity>

          {/* Dark Mode Toggle - Only shown for manager-level roles */}
          {['area_manager', 'zonal_head', 'national_head', 'admin'].includes(role) && (
            <>
              <View style={[styles.divider, { backgroundColor: themeColors.border.light }]} />
              <View style={styles.themeRow}>
                <View style={styles.themeLeft}>
                  <View style={[styles.themeIconContainer, { backgroundColor: isDark ? themeColors.accentLight : '#FFF3E0' }]}>
                    {isDark ? (
                      <Moon size={20} color={themeColors.accent} />
                    ) : (
                      <Sun size={20} color="#EF6C00" />
                    )}
                  </View>
                  <View>
                    <Text style={[styles.themeTitle, { color: themeColors.text.primary }]}>Dark Mode</Text>
                    <Text style={[styles.themeSubtitle, { color: themeColors.text.tertiary }]}>
                      {isDark ? 'Dark theme active' : 'Light theme active'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#E0E0E0', true: themeColors.accentLight }}
                  thumbColor={isDark ? themeColors.accent : '#FFFFFF'}
                  ios_backgroundColor="#E0E0E0"
                />
              </View>
            </>
          )}

          {/* Sign Out Button */}
          <View style={styles.signOutSection}>
            <TouchableOpacity
              style={[
                styles.signOutButton,
                {
                  // In dark mode: softer background but keep red text for clarity
                  backgroundColor: isDark ? themeColors.surfaceAlt : themeColors.errorLight,
                  borderColor: isDark ? '#994444' : themeColors.error,
                },
              ]}
              onPress={handleSignOut}
              disabled={signingOut}
              activeOpacity={0.7}
            >
              {signingOut ? (
                <ActivityIndicator size="small" color={isDark ? '#E57373' : themeColors.error} />
              ) : (
                <>
                  <LogOut size={20} color={isDark ? '#E57373' : themeColors.error} />
                  <Text style={[styles.signOutText, { color: isDark ? '#E57373' : themeColors.error }]}>Sign Out</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Feedback Form Modal */}
      <FeedbackForm
        visible={showFeedbackForm}
        onClose={() => setShowFeedbackForm(false)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    // Elevation for Android
    elevation: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  avatarContainer: {
    width: 64,
    height: 64,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  roleTerritory: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: spacing.sm,
  },
  detailsSection: {
    paddingVertical: spacing.xs,
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
  contactsSection: {
    paddingVertical: spacing.xs,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  contactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  contactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarAlt: {
    backgroundColor: colors.surface,
  },
  contactAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  contactAvatarTextAlt: {
    color: colors.text.secondary,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  contactRole: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signOutSection: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.errorLight,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  helpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  helpIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.infoLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  helpSubtitle: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  // Theme toggle styles
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  themeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  themeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
  },
  themeSubtitle: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
});
