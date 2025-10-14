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
} from 'react-native';
import { getAuth, signOut } from '@react-native-firebase/auth';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';
import { api } from '../../services/api';
import { LogOut } from 'lucide-react-native';
import { colors, spacing, typography, shadows } from '../../theme';

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
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Profile</Text>
      </View>

      <View style={styles.content}>
        {/* Name Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor={colors.text.secondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Email Field */}
        <View style={styles.field}>
          <Text style={styles.label}>Email (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={colors.text.secondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Phone (Read-only) */}
        <View style={styles.field}>
          <Text style={styles.label}>Phone Number</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.readOnlyText}>{user?.phoneNumber}</Text>
          </View>
          <Text style={styles.helpText}>Phone number cannot be changed</Text>
        </View>

        {/* Role Badge (Read-only) */}
        <View style={styles.field}>
          <Text style={styles.label}>Role</Text>
          <View style={[styles.badge, styles.roleBadge]}>
            <Text style={styles.badgeText}>{getRoleDisplay(role)}</Text>
          </View>
        </View>

        {/* Territory (Read-only) */}
        <View style={styles.field}>
          <Text style={styles.label}>Territory</Text>
          <View style={[styles.badge, styles.territoryBadge]}>
            <Text style={styles.badgeText}>{territory}</Text>
          </View>
          <Text style={styles.helpText}>Assigned by manager</Text>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[
            styles.saveButton,
            hasChanges && styles.saveButtonActive,
            (saving || !hasChanges) && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
          disabled={saving || !hasChanges}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[
              styles.saveButtonText,
              (saving || !hasChanges) && styles.saveButtonTextDisabled
            ]}>
              Save Changes
            </Text>
          )}
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={styles.signOutButton}
          onPress={handleSignOut}
        >
          <LogOut size={20} color={colors.error} />
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
  },
  content: {
    padding: spacing.lg,
  },
  field: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  readOnlyField: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.md,
  },
  readOnlyText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
  },
  helpText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.full,
  },
  roleBadge: {
    backgroundColor: colors.primary,
  },
  territoryBadge: {
    backgroundColor: '#2196F3',
  },
  badgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: '#fff',
  },
  saveButton: {
    backgroundColor: '#ccc',
    padding: spacing.lg,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 2,
    borderColor: '#999',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.successDark,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
    borderColor: '#999',
  },
  saveButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
  },
  saveButtonTextDisabled: {
    color: '#666',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.error,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  signOutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },
});
