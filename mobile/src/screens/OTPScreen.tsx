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

interface Props {
  confirmation: FirebaseAuthTypes.ConfirmationResult;
  onBack: () => void;
}

export const OTPScreen: React.FC<Props> = ({ confirmation, onBack }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

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

        <Text style={styles.title}>Enter Verification Code</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit code to your phone
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleVerifyCode}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify Code</Text>
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
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 48,
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    color: '#333',
    textAlign: 'center',
    letterSpacing: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendButtonText: {
    color: '#007AFF',
    fontSize: 14,
  },
});
