import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { getAuth, signInWithPhoneNumber } from '@react-native-firebase/auth';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { colors, spacing, typography } from '../theme';
import { Logo } from '../components/ui';
import { logger } from '../utils/logger';

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
      logger.log('[Auth] Attempting to send code to:', formattedPhone);

      // iOS TEMPORARY WORKAROUND: Skip phone auth due to React Native Firebase bug
      // Issue: signInWithPhoneNumber crashes on iOS with Expo SDK 54 + RNFirebase 23.x
      // GitHub: https://github.com/invertase/react-native-firebase/issues/8535
      // TODO: Replace with Google Sign-In or configure APNs for production
      if (Platform.OS === 'ios') {
        logger.log('[Auth] iOS: Using mock confirmation (phone auth bug workaround)');

        const authInstance = getAuth();

        // Create a mock confirmation object that actually signs into Firebase
        const mockConfirmation = {
          verificationId: 'ios-mock-verification-id',
          confirm: async (code: string) => {
            logger.log('[Auth] iOS: Mock confirm called with code:', code);

            // Sign in anonymously to trigger Firebase auth state
            // This will create a real Firebase user that useAuth can detect
            const userCredential = await authInstance.signInAnonymously();
            logger.log('[Auth] iOS: Signed in anonymously, UID:', userCredential.user.uid);

            return userCredential;
          }
        } as FirebaseAuthTypes.ConfirmationResult;

        onCodeSent(mockConfirmation);
        setLoading(false);
        return;
      }

      // ANDROID: Normal phone auth flow (unchanged)
      const authInstance = getAuth();
      const confirmation = await signInWithPhoneNumber(authInstance, formattedPhone);

      logger.log('[Auth] Code sent successfully');
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
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                    placeholderTextColor={colors.text.tertiary}
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
                  activeOpacity={0.8}
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
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 160,
    height: 160,
  },
  formSection: {
    width: '100%',
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: colors.text.inverse,
    marginBottom: spacing.xs,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text.inverse,
    opacity: 0.75,
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.inverse,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 0,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 17,
    color: colors.text.primary,
  },
  hint: {
    fontSize: 13,
    color: colors.text.inverse,
    opacity: 0.6,
    marginTop: spacing.sm,
  },
  button: {
    backgroundColor: 'transparent',
    borderRadius: spacing.borderRadius.full,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 2,
    borderColor: colors.accent,
    marginTop: spacing.sm,
  },
  buttonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  buttonTextActive: {
    color: colors.primary,
  },
});
