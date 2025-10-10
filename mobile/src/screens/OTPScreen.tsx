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
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
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
      Alert.alert(
        'Error',
        error.message || 'Invalid verification code. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Logo variant="full" style={{ width: 280, height: 120, alignSelf: 'center' }} />

        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to your phone
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor="#999"
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
        >
          {loading ? (
            <ActivityIndicator color={isCodeValid ? colors.primary : '#fff'} />
          ) : (
            <Text style={[styles.buttonText, isCodeValid && styles.buttonTextActive]}>
              Verify Code
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendButton} onPress={onBack}>
          <Text style={styles.resendButtonText}>Didn't receive code? Try again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary, // Dark brand background
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: spacing.xl,
  },
  backButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.accent, // Gold
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: '#ccc',
    marginBottom: spacing.xl * 2,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.lg,
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
    textAlign: 'center',
    letterSpacing: 12,
  },
  button: {
    backgroundColor: 'transparent',
    borderRadius: spacing.borderRadius.full, // Pill shape
    borderWidth: 2,
    borderColor: colors.accent,
    padding: spacing.lg,
    alignItems: 'center',
    alignSelf: 'center',
    width: '85%',
  },
  buttonActive: {
    backgroundColor: colors.accent, // Gold when valid
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  buttonTextActive: {
    color: colors.primary, // Dark text on gold background
  },
  resendButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  resendButtonText: {
    color: colors.accent,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
});
