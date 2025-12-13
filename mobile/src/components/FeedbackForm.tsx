/**
 * FeedbackForm - Modal for submitting user feedback/support requests
 *
 * Features:
 * - Text input for message
 * - Screenshot picker (max 5)
 * - Image preview with remove option
 * - Upload progress and submission handling
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  X,
  Camera,
  Send,
  Trash2,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { colors, spacing } from '../theme';
import { uploadPhotos } from '../services/storage';
import { api } from '../services/api';
import { logger } from '../utils/logger';

interface FeedbackFormProps {
  visible: boolean;
  onClose: () => void;
}

// Safe area bottom padding
const BOTTOM_SAFE_AREA_PADDING = Platform.OS === 'android' ? 48 : 34;
const MAX_SCREENSHOTS = 5;

export const FeedbackForm: React.FC<FeedbackFormProps> = ({ visible, onClose }) => {
  const [message, setMessage] = useState('');
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  const resetForm = () => {
    setMessage('');
    setScreenshots([]);
    setIsSubmitting(false);
    setUploadProgress('');
  };

  const handleClose = () => {
    if (isSubmitting) return; // Don't close while submitting
    resetForm();
    onClose();
  };

  const selectScreenshot = async () => {
    if (screenshots.length >= MAX_SCREENSHOTS) {
      Alert.alert('Limit Reached', `Maximum ${MAX_SCREENSHOTS} screenshots allowed`);
      return;
    }

    const buttons = [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
            return;
          }

          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });

          if (!result.canceled && result.assets[0]) {
            setScreenshots((prev) => [...prev, result.assets[0].uri]);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Photo library permission is needed.');
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
            allowsMultipleSelection: true,
            selectionLimit: MAX_SCREENSHOTS - screenshots.length,
          });

          if (!result.canceled && result.assets.length > 0) {
            const newUris = result.assets.map((asset) => asset.uri);
            setScreenshots((prev) => [...prev, ...newUris].slice(0, MAX_SCREENSHOTS));
          }
        },
      },
      { text: 'Cancel', style: 'cancel' as const },
    ];

    Alert.alert('Add Screenshot', undefined, buttons);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Message Required', 'Please describe your issue or feedback.');
      return;
    }

    setIsSubmitting(true);
    const startTime = Date.now();

    try {
      let screenshotUrls: string[] = [];

      // Upload screenshots if any
      if (screenshots.length > 0) {
        setUploadProgress(`Uploading ${screenshots.length} screenshot(s)...`);
        const uploadStart = Date.now();
        screenshotUrls = await uploadPhotos(screenshots, 'feedback');
        logger.debug('[FeedbackForm]', `Photo upload took ${Date.now() - uploadStart}ms`);
      }

      setUploadProgress('Submitting feedback...');

      // Get device info
      const deviceInfo = {
        platform: Platform.OS as 'ios' | 'android',
        osVersion: Platform.Version.toString(),
        appVersion: Constants.expoConfig?.version || '1.1.12',
      };

      // Submit feedback
      const apiStart = Date.now();
      await api.submitFeedback({
        message: message.trim(),
        screenshotUrls: screenshotUrls.length > 0 ? screenshotUrls : undefined,
        deviceInfo,
      });
      logger.debug('[FeedbackForm]', `API call took ${Date.now() - apiStart}ms`);
      logger.debug('[FeedbackForm]', `Total submit took ${Date.now() - startTime}ms`);

      // Close form and show success alert
      resetForm();
      onClose();
      Alert.alert('Feedback Sent', 'Thank you for your feedback!');
    } catch (error: any) {
      logger.error('[FeedbackForm] Submit error:', error);
      Alert.alert('Error', error.message || 'Failed to submit feedback. Please try again.');
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={handleClose} />

        {/* Form Content */}
        <View style={[styles.sheet, { paddingBottom: BOTTOM_SAFE_AREA_PADDING }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Need Help?</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              disabled={isSubmitting}
            >
              <X size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Message Input */}
            <Text style={styles.label}>Describe your issue or feedback</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind? Tell us about any bugs, suggestions, or questions..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={message}
              onChangeText={setMessage}
              editable={!isSubmitting}
              maxLength={5000}
            />
            <Text style={styles.charCount}>{message.length}/5000</Text>

            {/* Screenshots Section */}
            <View style={styles.screenshotsSection}>
              <Text style={styles.label}>Screenshots (optional)</Text>
              <Text style={styles.sublabel}>
                Add screenshots to help us understand the issue better
              </Text>

              <View style={styles.screenshotGrid}>
                {/* Existing screenshots */}
                {screenshots.map((uri, index) => (
                  <View key={index} style={styles.screenshotContainer}>
                    <Image source={{ uri }} style={styles.screenshotImage} />
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeScreenshot(index)}
                      disabled={isSubmitting}
                    >
                      <Trash2 size={14} color={colors.text.inverse} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add button */}
                {screenshots.length < MAX_SCREENSHOTS && (
                  <TouchableOpacity
                    style={styles.addScreenshotButton}
                    onPress={selectScreenshot}
                    disabled={isSubmitting}
                  >
                    <Camera size={24} color={colors.text.tertiary} />
                    <Text style={styles.addScreenshotText}>Add</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer with Submit Button */}
          <View style={styles.footer}>
            {uploadProgress ? (
              <View style={styles.progressContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.progressText}>{uploadProgress}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  !message.trim() && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!message.trim() || isSubmitting}
              >
                <Send size={20} color={colors.text.inverse} />
                <Text style={styles.submitButtonText}>Send Feedback</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
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
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sublabel: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text.primary,
    minHeight: 120,
  },
  charCount: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  screenshotsSection: {
    marginBottom: spacing.lg,
  },
  screenshotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  screenshotContainer: {
    width: 80,
    height: 80,
    borderRadius: spacing.borderRadius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addScreenshotButton: {
    width: 80,
    height: 80,
    borderRadius: spacing.borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  addScreenshotText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  progressText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: spacing.borderRadius.md,
  },
  submitButtonDisabled: {
    backgroundColor: colors.primaryLight,
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.inverse,
  },
});
