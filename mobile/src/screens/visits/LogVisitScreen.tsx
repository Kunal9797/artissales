import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { api } from '../../services/api';
import { uploadPhoto } from '../../services/storage';
import { Account } from '../../hooks/useAccounts';
import { CameraCapture } from '../../components/CameraCapture';

interface LogVisitScreenProps {
  navigation: any;
  route: {
    params: {
      account: Account;
    };
  };
}

const VISIT_PURPOSES = [
  { value: 'sample_delivery', label: 'Sample Delivery' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'new_lead', label: 'New Lead' },
  { value: 'payment_collection', label: 'Payment Collection' },
  { value: 'other', label: 'Other' },
];

export const LogVisitScreen: React.FC<LogVisitScreenProps> = ({ navigation, route }) => {
  const { account } = route.params;

  const [purpose, setPurpose] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoTaken = (uri: string) => {
    setPhotoUri(uri);
    setShowCamera(false);
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setPhotoUri(null),
        },
      ]
    );
  };

  const handleSubmit = async () => {
    // Validation
    if (!purpose) {
      Alert.alert('Error', 'Please select a visit purpose');
      return;
    }

    if (!photoUri) {
      Alert.alert('Error', 'Please take a photo of the counter');
      return;
    }

    setSubmitting(true);

    try {
      // Upload photo to Firebase Storage
      console.log('[LogVisit] Uploading photo...');
      setUploading(true);
      const photoUrl = await uploadPhoto(photoUri, 'visits');
      setUploading(false);
      console.log('[LogVisit] Photo uploaded:', photoUrl);

      // Submit visit with photo URL
      await api.logVisit({
        accountId: account.id,
        purpose: purpose as any,
        notes: notes.trim() || undefined,
        photos: [photoUrl],
      });

      Alert.alert('Success', 'Visit logged successfully!', [
        {
          text: 'OK',
          onPress: () => {
            navigation.navigate('Home');
          },
        },
      ]);
    } catch (error: any) {
      console.error('Visit logging error:', error);
      Alert.alert('Error', error.message || 'Failed to log visit');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Log Visit</Text>
        </View>

        {/* Account Info */}
        <View style={styles.accountCard}>
          <Text style={styles.accountName}>{account.name}</Text>
          <Text style={styles.accountType}>
            {account.type === 'distributor'
              ? '🏭 Distributor'
              : account.type === 'architect'
              ? '📐 Architect'
              : '🏪 Dealer'}
          </Text>
          {account.contactPerson && (
            <Text style={styles.accountDetail}>👤 {account.contactPerson}</Text>
          )}
          <Text style={styles.accountDetail}>
            📍 {account.city}, {account.state}
          </Text>
        </View>

        {/* Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Counter Photo *</Text>
          <Text style={styles.helpText}>
            Take a photo of the counter or storefront to verify your visit
          </Text>

          {photoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <View style={styles.photoActions}>
                <TouchableOpacity
                  style={styles.retakeButton}
                  onPress={() => setShowCamera(true)}
                >
                  <Text style={styles.retakeButtonText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={handleRemovePhoto}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => setShowCamera(true)}
            >
              <Text style={styles.cameraButtonIcon}>📷</Text>
              <Text style={styles.cameraButtonText}>Take Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Visit Purpose */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Visit Purpose *</Text>
          <View style={styles.purposeGrid}>
            {VISIT_PURPOSES.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.purposeButton,
                  purpose === item.value && styles.purposeButtonSelected,
                ]}
                onPress={() => setPurpose(item.value)}
              >
                <Text
                  style={[
                    styles.purposeButtonText,
                    purpose === item.value && styles.purposeButtonTextSelected,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any notes about this visit..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Upload Progress */}
        {uploading && (
          <View style={styles.uploadingCard}>
            <ActivityIndicator size="small" color="#2196F3" />
            <Text style={styles.uploadingText}>Uploading photo...</Text>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!purpose || !photoUri || submitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!purpose || !photoUri || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Log Visit</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        onRequestClose={() => setShowCamera(false)}
      >
        <CameraCapture
          onPhotoTaken={handlePhotoTaken}
          onCancel={() => setShowCamera(false)}
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4CAF50',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  accountCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  accountName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  accountType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  accountDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  cameraButton: {
    backgroundColor: '#2196F3',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1976D2',
    borderStyle: 'dashed',
  },
  cameraButtonIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  cameraButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  photoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  photoPreview: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  photoActions: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  retakeButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  removeButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  removeButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  purposeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  purposeButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  purposeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  purposeButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
  },
  uploadingCard: {
    backgroundColor: '#E3F2FD',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});
