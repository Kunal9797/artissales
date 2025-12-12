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
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';
import { Logo } from '../components/ui/Logo';

interface Props {
  confirmation: FirebaseAuthTypes.ConfirmationResult;
  onBack: () => void;
}

export const OTPScreen: React.FC<Props> = ({ confirmation, onBack }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const isCodeValid = code.length === 6;

  const handleVerifyCode = async () => {
    if (!code.trim() || code.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await confirmation.confirm(code);
      // Auth state change will be handled by useAuth hook
    } catch (error: any) {
      console.error('OTP verification error:', error);

      // Handle specific Firebase error codes with user-friendly messages
      let errorMessage = 'Verification failed. Please try again.';

      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Incorrect code. Please check and try again.';
      } else if (error.code === 'auth/session-expired') {
        errorMessage = 'Code expired. Please request a new code.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      }

      Alert.alert('Verification Failed', errorMessage);
      setCode(''); // Clear the input for retry
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
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={32} color={colors.accent} />
            </TouchableOpacity>

            <View style={styles.content}>
              <View style={styles.logoSection}>
                <Logo variant="full" style={styles.logo} />
              </View>

              <Text style={styles.title}>Enter Verification Code</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit code to your phone
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor={colors.text.tertiary}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  isCodeValid && styles.buttonActive,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleVerifyCode}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={isCodeValid ? colors.primary : colors.text.inverse} />
                ) : (
                  <Text style={[styles.buttonText, isCodeValid && styles.buttonTextActive]}>
                    Verify Code
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendButton} onPress={onBack} activeOpacity={0.7}>
                <Text style={styles.resendButtonText}>Didn't receive code? Try again</Text>
              </TouchableOpacity>
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
  backButton: {
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingLeft: spacing.md,
    paddingBottom: spacing.sm,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logo: {
    width: 160,
    height: 160,
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
  input: {
    backgroundColor: colors.background,
    borderWidth: 0,
    borderRadius: spacing.borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: 32,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 16,
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
  resendButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  resendButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '500',
  },
});
