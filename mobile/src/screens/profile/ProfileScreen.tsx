import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import { api } from '../../services/api';
import { LogOut, User as UserIcon, Mail, Phone, MapPin, Briefcase } from 'lucide-react-native';
import { colors, spacing, typography, featureColors } from '../../theme';
import { Card, Badge } from '../../components/ui';

interface ProfileScreenProps {
  navigation: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [territory, setTerritory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Track original values to detect changes
  const [originalName, setOriginalName] = useState('');
  const [originalEmail, setOriginalEmail] = useState('');

  useEffect(() => {
    if (!user) return;

    const db = getFirestore();

    // Fetch user profile from Firestore
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const userName = data?.name || '';
          const userEmail = data?.email || '';
          setName(userName);
          setEmail(userEmail);
          setOriginalName(userName);
          setOriginalEmail(userEmail);
          setRole(data?.role || 'rep');
          setTerritory(data?.territory || 'Not assigned');
        }
        setLoading(false);
      },
      (error) => {
        console.error('Profile fetch error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Check if there are changes
  const hasChanges = name !== originalName || email !== originalEmail;

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

  const handleSave = async () => {
    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters');
      return;
    }

    if (email && email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        Alert.alert('Error', 'Invalid email format');
        return;
      }
    }

    setSaving(true);

    try {
      await api.updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
      });

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Profile data updates via onSnapshot listener, so just wait a moment
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  }, []);

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
            try {
              await signOut(authInstance);
              // Success - navigation will happen automatically via auth state listener
            } catch (error: any) {
              console.error('Sign out error:', error);
              // Don't show alert during navigation/unmount - just log it
              // The error is rare and user will see they're still logged in
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading profile...</Text>
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
              backgroundColor: '#C9A961',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            onPress={handleSignOut}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#393735' }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* Profile Info Card */}
        <Card elevation="md" style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <UserIcon size={48} color={colors.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name || 'User'}</Text>
              <Badge variant="neutral">{getRoleDisplay(role)}</Badge>
            </View>
          </View>
        </Card>

        {/* Editable Fields Card */}
        <Card elevation="sm" style={styles.card}>
          <Text style={styles.cardTitle}>Personal Information</Text>

          {/* Name Field */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <UserIcon size={16} color={colors.text.secondary} />
              <Text style={styles.label}>Full Name</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={colors.text.tertiary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Email Field */}
          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Mail size={16} color={colors.text.secondary} />
              <Text style={styles.label}>Email</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter your email (optional)"
              placeholderTextColor={colors.text.tertiary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Save Button */}
          {hasChanges && (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          )}
        </Card>

        {/* Account Details Card */}
        <Card elevation="sm" style={styles.card}>
          <Text style={styles.cardTitle}>Account Details</Text>

          {/* Phone (Read-only) */}
          <View style={styles.infoRow}>
            <Phone size={20} color={colors.text.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Phone Number</Text>
              <Text style={styles.infoValue}>{user?.phoneNumber}</Text>
            </View>
          </View>

          {/* Territory */}
          <View style={styles.infoRow}>
            <MapPin size={20} color={colors.text.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Territory</Text>
              <Text style={styles.infoValue}>{territory}</Text>
            </View>
          </View>

          {/* Role */}
          <View style={styles.infoRow}>
            <Briefcase size={20} color={colors.text.secondary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Role</Text>
              <Text style={styles.infoValue}>{getRoleDisplay(role)}</Text>
            </View>
          </View>
        </Card>

        {/* Sign Out button moved to header */}
      </ScrollView>
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
    paddingBottom: 100, // Extra padding for tab bar
  },
  // Profile Card
  profileCard: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  profileInfo: {
    flex: 1,
    gap: spacing.sm,
  },
  profileName: {
    ...typography.styles.h2,
    color: colors.text.primary,
  },
  // Cards
  card: {
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  // Form Fields
  field: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  // Info Rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginBottom: spacing.xs / 2,
  },
  infoValue: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  // Save Button
  saveButton: {
    backgroundColor: colors.success,
    padding: spacing.md,
    borderRadius: spacing.borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  saveButtonDisabled: {
    backgroundColor: colors.text.tertiary,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
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
});
