import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { colors, spacing, typography } from '../theme';
import { Logo } from '../components/ui';

interface Props {
  onCodeSent: (confirmation: FirebaseAuthTypes.ConfirmationResult) => void;
}

export const LoginScreen: React.FC<Props> = ({ onCodeSent }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const isPhoneValid = phoneNumber.replace(/\D/g, '').length === 10;

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If it's 10 digits, assume it's Indian number and add +91
    if (digits.length === 10) {
      return `+91${digits}`;
    }

    // If it already has country code, use as is
    if (digits.length > 10 && digits.startsWith('91')) {
      return `+${digits}`;
    }

    // Otherwise return with + prefix if not present
    return phone.startsWith('+') ? phone : `+${digits}`;
  };

  const handleSendCode = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      console.log('[Auth] Attempting to send code to:', formattedPhone);

      const authInstance = getAuth();
      const confirmation = await signInWithPhoneNumber(authInstance, formattedPhone);

      console.log('[Auth] Code sent successfully');
      onCodeSent(confirmation);
    } catch (error: any) {
      console.error('[Auth] Phone auth error:', error);

      let errorMessage = 'Failed to send verification code';

      if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please enter a valid 10-digit number.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoSection}>
          <Logo variant="full" size="large" style={styles.logo} />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.title}>Artis Sales Team</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              placeholderTextColor="rgba(0,0,0,0.4)"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              autoFocus
              editable={!loading}
            />
            <Text style={styles.hint}>
              Enter 10-digit number (e.g., 9876543210)
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              isPhoneValid && styles.buttonActive,
              loading && styles.buttonDisabled
            ]}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={isPhoneValid ? colors.primary : colors.text.inverse} />
            ) : (
              <Text style={[styles.buttonText, isPhoneValid && styles.buttonTextActive]}>
                Send Code
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary, // Brand Background #393735
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxl + spacing.xxl + spacing.xl,
  },
  logo: {
    width: 320,
    height: 140,
  },
  formSection: {
    width: '100%',
  },
  title: {
    ...typography.styles.h1,
    color: colors.text.inverse,
    marginBottom: spacing.sm,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 28,
    letterSpacing: 0.5,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.text.inverse,
    opacity: 0.8,
    marginBottom: spacing.xxl + spacing.xxl,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '400',
  },
  inputContainer: {
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  label: {
    ...typography.styles.label,
    color: colors.text.inverse,
    marginBottom: spacing.sm,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md + 2,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  hint: {
    ...typography.styles.caption,
    color: colors.text.inverse,
    opacity: 0.7,
    marginTop: spacing.sm,
    fontSize: 13,
  },
  button: {
    backgroundColor: 'transparent',
    borderRadius: spacing.borderRadius.full,
    paddingVertical: spacing.md + 4,
    paddingHorizontal: spacing.xl + spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderWidth: 2,
    borderColor: colors.accent,
    alignSelf: 'center',
    width: '85%',
  },
  buttonActive: {
    backgroundColor: colors.accent,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    ...typography.styles.button,
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextActive: {
    color: colors.primary,
  },
});
