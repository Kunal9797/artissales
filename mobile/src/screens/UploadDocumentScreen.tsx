import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { FileText, Upload } from 'lucide-react-native';
import { api } from '../services/api';
import { colors, spacing, typography } from '../theme';

type UploadDocumentScreenProps = NativeStackScreenProps<any, 'UploadDocument'>;

export const UploadDocumentScreen: React.FC<UploadDocumentScreenProps> = ({ navigation, route }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);

  const { onUploadSuccess } = route.params || {};

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled === false && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
          size: file.size || 0,
        });

        // Auto-fill name if empty
        if (!name && file.name) {
          const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
          setName(fileName);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleUpload = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a document name');
      return;
    }

    if (!selectedFile) {
      Alert.alert('Error', 'Please select a file to upload');
      return;
    }

    // Validate file size (max 30MB - Cloud Functions has 32MB limit)
    if (selectedFile.size > 30 * 1024 * 1024) {
      Alert.alert('Error', 'File size must be less than 30MB');
      return;
    }

    try {
      setUploading(true);

      const response = await api.uploadDocument(
        name.trim(),
        description.trim() || undefined,
        selectedFile.fileCopyUri || selectedFile.uri,
        selectedFile.name,
        selectedFile.type
      );

      if (response.ok) {
        Alert.alert('Success', 'Document uploaded successfully', [
          {
            text: 'OK',
            onPress: () => {
              if (onUploadSuccess) {
                onUploadSuccess();
              }
              navigation.goBack();
            },
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to upload document');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      Alert.alert('Error', err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} disabled={uploading}>
          <Text style={styles.backButton}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Upload Document</Text>
        <Text style={styles.subtitle}>Add catalogs, brochures, or resources</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* File Picker */}
        <TouchableOpacity
          style={[styles.filePickerButton, selectedFile && styles.filePickerButtonSelected]}
          onPress={handlePickDocument}
          disabled={uploading}
        >
          <FileText size={32} color={selectedFile ? colors.success : colors.text.tertiary} />
          <Text style={[styles.filePickerText, selectedFile && styles.filePickerTextSelected]}>
            {selectedFile ? selectedFile.name : 'Tap to select file'}
          </Text>
          {selectedFile && (
            <Text style={styles.fileSizeText}>
              {formatFileSize(selectedFile.size)} • {selectedFile.type?.includes('pdf') ? 'PDF' : 'Image'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Document Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Document Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Fine Decor Catalog 2025"
            value={name}
            onChangeText={setName}
            editable={!uploading}
            maxLength={100}
          />
        </View>

        {/* Description (Optional) */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add a brief description..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            editable={!uploading}
            maxLength={500}
          />
        </View>

        {/* Upload Guidelines */}
        <View style={styles.guidelines}>
          <Text style={styles.guidelinesTitle}>Upload Guidelines:</Text>
          <Text style={styles.guidelineItem}>• Maximum file size: 30 MB</Text>
          <Text style={styles.guidelineItem}>• Supported formats: PDF, JPG, PNG</Text>
          <Text style={styles.guidelineItem}>• All team members can view uploaded documents</Text>
        </View>
      </ScrollView>

      {/* Upload Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading || !name.trim() || !selectedFile}
        >
          {uploading ? (
            <>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: spacing.sm }} />
              <Text style={styles.uploadButtonText}>Uploading...</Text>
            </>
          ) : (
            <>
              <Upload size={20} color="#fff" style={{ marginRight: spacing.sm }} />
              <Text style={styles.uploadButtonText}>Upload Document</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
  },
  backButton: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.accent,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: '#fff',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    flex: 1,
    padding: spacing.screenPadding,
  },
  filePickerButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border.default,
    borderStyle: 'dashed',
    borderRadius: spacing.borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  filePickerButtonSelected: {
    borderColor: colors.success,
    borderStyle: 'solid',
    backgroundColor: '#E8F5E9',
  },
  filePickerText: {
    fontSize: typography.fontSize.base,
    color: colors.text.tertiary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  filePickerTextSelected: {
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semiBold,
  },
  fileSizeText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: spacing.borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.fontSize.base,
    color: colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.sm,
  },
  guidelines: {
    backgroundColor: colors.surface,
    borderRadius: spacing.borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  guidelinesTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  guidelineItem: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },
  footer: {
    padding: spacing.screenPadding,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.borderRadius.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: '#fff',
  },
});
