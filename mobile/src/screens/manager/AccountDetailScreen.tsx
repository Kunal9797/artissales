/**
 * AccountDetailScreen - View account details and visit history
 * Built with inline styles to avoid StyleSheet.create issues
 */

import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logger';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Building2, Phone, MapPin, Edit, Calendar, User, Camera } from 'lucide-react-native';
import { api } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Skeleton } from '../../patterns';
import { spacing } from '../../theme';
import { PhotoViewer } from '../../components/PhotoViewer';

type Props = NativeStackScreenProps<RootStackParamList, 'AccountDetail'>;

interface AccountData {
  id: string;
  name: string;
  type: string;
  phone?: string;
  city: string;
  state: string;
  pincode?: string;
  createdBy?: string;
}

interface Visit {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  purpose: string;
  notes?: string;
  photos?: string[];
}

export const AccountDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { accountId } = route.params;
  const [account, setAccount] = useState<AccountData | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Photo viewer state
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([]);

  const openPhotoViewer = (photos: string[]) => {
    setViewingPhotos(photos);
    setPhotoViewerVisible(true);
  };

  const loadData = async () => {
    try {
      // Get account details from real API
      const response = await api.getAccountDetails({ accountId });

      if (response.ok) {
        setAccount(response.account);
        setVisits(response.visits || []);
      } else {
        logger.error('API returned not ok:', response);
        setAccount(null);
        setVisits([]);
      }
    } catch (error) {
      logger.error('Error loading account details:', error);
      // On error, set null to show "Account not found" message
      setAccount(null);
      setVisits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accountId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'distributor': return '#2E7D32';
      case 'dealer': return '#1976D2';
      case 'architect': return '#7B1FA2';
      default: return '#666666';
    }
  };

  const getTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <View style={{
          backgroundColor: '#393735',
          paddingHorizontal: 24,
          paddingTop: 52,
          paddingBottom: 16,
        }}>
          <Skeleton rows={1} />
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }}>
          <Skeleton card />
          <Skeleton card />
          <Skeleton rows={3} />
        </ScrollView>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 16, color: '#EF5350' }}>Account not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#C9A961',
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
            }}
            onPress={() => {
              navigation.navigate('EditAccount', {
                account,
                onAccountUpdated: loadData,
              });
            }}
          >
            <Edit size={18} color="#393735" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#393735' }}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Account Info */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: `${getTypeColor(account.type)}40`,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Building2 size={28} color={getTypeColor(account.type)} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 }}>
              {account.name}
            </Text>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: getTypeColor(account.type),
              borderRadius: 12,
              alignSelf: 'flex-start',
            }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF' }}>
                {getTypeLabel(account.type)}
              </Text>
            </View>
          </View>
        </View>

        {/* Contact Info */}
        <View style={{ marginTop: 16, gap: 8 }}>
          {account.phone && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Phone size={14} color="rgba(255, 255, 255, 0.7)" />
              <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)' }}>{account.phone}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MapPin size={14} color="rgba(255, 255, 255, 0.7)" />
            <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.9)' }}>
              {account.city}, {account.state}
              {account.pincode && ` - ${account.pincode}`}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Visit History */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 16 }}>
            Visit History ({visits.length})
          </Text>

          {visits.length === 0 ? (
            <View style={{
              backgroundColor: '#F8F8F8',
              padding: 32,
              borderRadius: 8,
              alignItems: 'center',
            }}>
              <Calendar size={48} color="#E0E0E0" />
              <Text style={{ fontSize: 14, color: '#666666', marginTop: 12 }}>
                No visits recorded yet
              </Text>
            </View>
          ) : (
            visits.map((visit, index) => (
              <View
                key={visit.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: '#E0E0E0',
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <User size={16} color="#666666" />
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>
                      {visit.userName || 'Unknown'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#999999' }}>
                    {new Date(visit.timestamp).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                </View>

                <View style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: '#E3F2FD',
                  borderRadius: 12,
                  alignSelf: 'flex-start',
                  marginBottom: 8,
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#1976D2' }}>
                    {visit.purpose}
                  </Text>
                </View>

                {visit.notes && (
                  <Text style={{ fontSize: 14, color: '#666666', marginTop: 4 }}>
                    {visit.notes}
                  </Text>
                )}

                {/* Photo indicator - tap to view photos */}
                {visit.photos && visit.photos.length > 0 && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      marginTop: 12,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: '#F5F5F5',
                      borderRadius: 8,
                      alignSelf: 'flex-start',
                    }}
                    onPress={() => openPhotoViewer(visit.photos!)}
                  >
                    <Camera size={16} color="#666666" />
                    <Text style={{ fontSize: 13, color: '#666666', fontWeight: '500' }}>
                      {visit.photos.length} {visit.photos.length === 1 ? 'Photo' : 'Photos'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Photo Viewer Modal */}
      <PhotoViewer
        visible={photoViewerVisible}
        photos={viewingPhotos}
        onClose={() => setPhotoViewerVisible(false)}
      />
    </View>
  );
};
