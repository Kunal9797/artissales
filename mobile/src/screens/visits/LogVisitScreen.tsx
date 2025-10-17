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
  Image,
  Modal,
} from 'react-native';
import { Camera, MapPin, User, Building2, ChevronLeft, Phone, Clock } from 'lucide-react-native';
import { api } from '../../services/api';
import { uploadPhoto } from '../../services/storage';
import { Account } from '../../hooks/useAccounts';
import { CameraCapture } from '../../components/CameraCapture';
import { colors, featureColors } from '../../theme';

interface LogVisitScreenProps {
  navigation: any;
  route: {
    params: {
      account?: Account;
      editActivityId?: string;
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
  const { account, editActivityId } = route.params;
  const isEditMode = !!editActivityId;

  const [visitAccount, setVisitAccount] = useState<Account | null>(account || null);
  const [purpose, setPurpose] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Fetch existing visit data in edit mode
  useEffect(() => {
    if (isEditMode && editActivityId) {
      const fetchExistingData = async () => {
        try {
          setSubmitting(true);
          const visitResponse = await api.getVisit({ id: editActivityId });

          if (visitResponse) {
            // Fetch full account details to get city/state
            if (visitResponse.accountId) {
              try {
                const accountsResponse = await api.getAccountsList({});
                const fullAccount = accountsResponse.accounts?.find(
                  (acc: any) => acc.id === visitResponse.accountId
                );

                if (fullAccount) {
                  setVisitAccount(fullAccount);
                } else {
                  // Fallback to partial data if account not found
                  setVisitAccount({
                    id: visitResponse.accountId,
                    name: visitResponse.accountName || 'Unknown Account',
                    type: visitResponse.accountType || 'dealer',
                    address: '',
                    phone: '',
                    city: '',
                    state: '',
                  } as Account);
                }
              } catch (accountError) {
                console.error('Error fetching account details:', accountError);
                // Use partial data from visit
                setVisitAccount({
                  id: visitResponse.accountId,
                  name: visitResponse.accountName || 'Unknown Account',
                  type: visitResponse.accountType || 'dealer',
                  address: '',
                  phone: '',
                  city: '',
                  state: '',
                } as Account);
              }
            }

            setPurpose(visitResponse.purpose);
            setNotes(visitResponse.notes || '');
            if (visitResponse.photos && visitResponse.photos.length > 0) {
              setPhotoUri(visitResponse.photos[0]); // Use first photo
            }
          }
        } catch (error) {
          console.error('Error fetching visit data:', error);
          Alert.alert('Error', 'Failed to load visit data');
        } finally {
          setSubmitting(false);
        }
      };
      fetchExistingData();
    }
  }, [isEditMode, editActivityId]);

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
    if (!visitAccount) {
      Alert.alert('Error', 'No account selected');
      return;
    }

    if (!purpose) {
      Alert.alert('Error', 'Please select a visit purpose');
      return;
    }

    // TEMPORARY: Make photo optional for testing
    // if (!photoUri) {
    //   Alert.alert('Error', 'Please take a photo of the counter');
    //   return;
    // }

    setSubmitting(true);

    try {
      let photoUrl = '';

      // Upload photo if provided and it's a new local photo (not a URL)
      if (photoUri && !photoUri.startsWith('http')) {
        console.log('[LogVisit] Uploading photo...');
        setUploading(true);
        photoUrl = await uploadPhoto(photoUri, 'visits');
        setUploading(false);
        console.log('[LogVisit] Photo uploaded:', photoUrl);
      } else if (photoUri) {
        // Existing photo URL
        photoUrl = photoUri;
      }

      if (isEditMode && editActivityId) {
        // Update existing visit
        await api.updateVisit({
          id: editActivityId,
          purpose: purpose as any,
          notes: notes.trim() || undefined,
          photos: photoUri ? [photoUrl] : [],
        });

        Alert.alert('Success', 'Visit updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new visit
        await api.logVisit({
          accountId: visitAccount.id,
          purpose: purpose as any,
          notes: notes.trim() || undefined,
          photos: photoUri ? [photoUrl] : [],
        });

        Alert.alert('Success', 'Visit logged successfully!', [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('Home');
            },
          },
        ]);
      }
    } catch (error: any) {
      console.error('Visit logging error:', error);
      Alert.alert('Error', error.message || 'Failed to log visit');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditMode || !editActivityId) return;

    Alert.alert(
      'Delete Visit',
      'Are you sure you want to delete this visit log?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteVisit({ id: editActivityId });
              Alert.alert('Success', 'Visit deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (error: any) {
              console.error('Error deleting visit:', error);
              Alert.alert('Error', error.message || 'Failed to delete visit');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <View style={styles.container}>
        {/* Header - Match New Design */}
        <View style={{
          backgroundColor: '#393735',
          paddingHorizontal: 24,
          paddingTop: 52,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <MapPin size={24} color={featureColors.visits.primary} />
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF', flex: 1 }}>
              {isEditMode ? 'Edit Visit' : 'Log Visit'}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          {/* Compact Account Info */}
          {visitAccount && (
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#E0E0E0',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <View style={{
                  width: 36,
                  height: 36,
                  borderRadius: 6,
                  backgroundColor: featureColors.visits.light,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Building2 size={18} color={featureColors.visits.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 16, fontWeight: '600', color: '#1A1A1A', flex: 1 }}>
                      {visitAccount.name}
                    </Text>
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 4,
                      backgroundColor: visitAccount.type === 'distributor' ? '#E3F2FD' :
                                      visitAccount.type === 'architect' ? '#F3E5F5' : '#FFF3E0',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: '#666666' }}>
                        {visitAccount.type.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Info rows */}
                  <View style={{ gap: 4 }}>
                    {visitAccount.phone && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Phone size={12} color="#999999" />
                        <Text style={{ fontSize: 12, color: '#666666' }}>{visitAccount.phone}</Text>
                      </View>
                    )}
                    {(visitAccount.city || visitAccount.state) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MapPin size={12} color="#999999" />
                        <Text style={{ fontSize: 12, color: '#666666' }}>
                          {visitAccount.city}{visitAccount.state ? `, ${visitAccount.state}` : ''}
                        </Text>
                      </View>
                    )}
                    {visitAccount.lastVisitAt && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Clock size={12} color="#999999" />
                        <Text style={{ fontSize: 12, color: '#666666' }}>
                          Last visit: {visitAccount.lastVisitAt.toLocaleDateString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Compact Photo Section */}
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#E0E0E0',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
              Counter Photo (Optional)
            </Text>

            {photoUri ? (
              <View style={{ backgroundColor: '#F5F5F5', borderRadius: 8, overflow: 'hidden' }}>
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: 180, resizeMode: 'cover' }} />
                <View style={{ flexDirection: 'row', padding: 8, gap: 8, backgroundColor: '#FFFFFF' }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: featureColors.visits.primary,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                    onPress={() => setShowCamera(true)}
                  >
                    <Camera size={14} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600' }}>Retake</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: '#FFFFFF',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: '#E0E0E0',
                    }}
                    onPress={handleRemovePhoto}
                  >
                    <Text style={{ color: '#666666', fontSize: 13, fontWeight: '600' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={{
                  backgroundColor: featureColors.visits.light,
                  padding: 16,
                  borderRadius: 8,
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: featureColors.visits.primary,
                  borderStyle: 'dashed',
                  gap: 8,
                }}
                onPress={() => setShowCamera(true)}
              >
                <Camera size={32} color={featureColors.visits.primary} />
                <Text style={{ fontSize: 14, color: featureColors.visits.primary, fontWeight: '600' }}>
                  Take Photo
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Compact Visit Purpose */}
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#E0E0E0',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
              Visit Purpose *
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {VISIT_PURPOSES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 6,
                    borderWidth: 1.5,
                    borderColor: purpose === item.value ? featureColors.visits.primary : '#E0E0E0',
                    backgroundColor: purpose === item.value ? featureColors.visits.primary : '#FFFFFF',
                    minHeight: 36,
                    justifyContent: 'center',
                  }}
                  onPress={() => setPurpose(item.value)}
                >
                  <Text style={{
                    fontSize: 13,
                    color: purpose === item.value ? '#FFFFFF' : '#666666',
                    fontWeight: purpose === item.value ? '600' : '500',
                  }}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Compact Notes */}
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#E0E0E0',
          }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
              Notes (Optional)
            </Text>
            <TextInput
              style={{
                backgroundColor: '#F5F5F5',
                borderRadius: 6,
                padding: 10,
                fontSize: 14,
                color: '#1A1A1A',
                minHeight: 80,
                textAlignVertical: 'top',
              }}
              placeholder="Add any notes about this visit..."
              placeholderTextColor="#999999"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Upload Progress */}
          {uploading && (
            <View style={{
              backgroundColor: featureColors.visits.light,
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
            }}>
              <ActivityIndicator size="small" color={featureColors.visits.primary} />
              <Text style={{ fontSize: 14, color: featureColors.visits.primary, fontWeight: '500' }}>
                Uploading photo...
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={{
              backgroundColor: (!purpose || submitting) ? '#E0E0E0' : featureColors.visits.primary,
              borderRadius: 8,
              paddingVertical: 14,
              alignItems: 'center',
              marginBottom: isEditMode ? 12 : 0,
            }}
            onPress={handleSubmit}
            disabled={!purpose || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                {isEditMode ? 'Update Visit' : 'Log Visit'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Delete Button (Edit Mode Only) */}
          {isEditMode && (
            <TouchableOpacity
              style={{
                backgroundColor: deleting ? '#FFCDD2' : '#FF3B30',
                borderRadius: 8,
                paddingVertical: 14,
                alignItems: 'center',
              }}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Delete Visit</Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

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
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
});
