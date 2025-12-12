/**
 * AccountDetailScreen - View account details and visit history
 * Optimized with pagination and lazy photo loading
 */

import React, { useState, useEffect, useCallback } from 'react';
import { logger } from '../../utils/logger';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, Building2, Phone, MapPin, Edit, Calendar, User, Camera, ChevronDown } from 'lucide-react-native';
import { api } from '../../services/api';
import { RootStackParamList } from '../../navigation/RootNavigator';
import { Skeleton } from '../../patterns';
import { spacing } from '../../theme';
import { PhotoViewer } from '../../components/PhotoViewer';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';

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
  photoCount?: number; // New: just the count, not the URLs
}

const VISITS_PER_PAGE = 10;

export const AccountDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const bottomPadding = useBottomSafeArea(12);
  const { accountId } = route.params;
  const [account, setAccount] = useState<AccountData | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state
  const [hasMore, setHasMore] = useState(false);
  const [lastVisitId, setLastVisitId] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  // Photo viewer state
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState<string | null>(null); // visitId being loaded

  // Lazy load photos when user taps
  const handlePhotoTap = useCallback(async (visitId: string, photoCount: number) => {
    if (photoCount === 0) return;

    setLoadingPhotos(visitId);
    try {
      const response = await api.getVisitPhotos({ visitId });
      if (response.ok && response.photos?.length > 0) {
        setViewingPhotos(response.photos);
        setPhotoViewerVisible(true);
      }
    } catch (error) {
      logger.error('Error loading photos:', error);
    } finally {
      setLoadingPhotos(null);
    }
  }, []);

  const loadData = async (isRefresh = false) => {
    try {
      const response = await api.getAccountDetails({
        accountId,
        limit: VISITS_PER_PAGE,
      });

      if (response.ok) {
        setAccount(response.account);
        setVisits(response.visits || []);
        setHasMore(response.hasMore || false);
        setLastVisitId(response.lastVisitId);
      } else {
        logger.error('API returned not ok:', response);
        setAccount(null);
        setVisits([]);
      }
    } catch (error) {
      logger.error('Error loading account details:', error);
      setAccount(null);
      setVisits([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMoreVisits = async () => {
    if (!hasMore || loadingMore || !lastVisitId) return;

    setLoadingMore(true);
    try {
      const response = await api.getAccountDetails({
        accountId,
        limit: VISITS_PER_PAGE,
        startAfter: lastVisitId,
      });

      if (response.ok) {
        setVisits(prev => [...prev, ...(response.visits || [])]);
        setHasMore(response.hasMore || false);
        setLastVisitId(response.lastVisitId);
      }
    } catch (error) {
      logger.error('Error loading more visits:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accountId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(true);
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
                onAccountUpdated: () => loadData(),
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
        contentContainerStyle={{ padding: 24, paddingBottom: 80 + bottomPadding }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Visit History */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 16 }}>
            Visit History {visits.length > 0 && `(${visits.length}${hasMore ? '+' : ''})`}
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
            <>
              {visits.map((visit) => (
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

                  {/* Photo indicator - tap to lazy load and view photos */}
                  {visit.photoCount !== undefined && visit.photoCount > 0 && (
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
                      onPress={() => handlePhotoTap(visit.id, visit.photoCount!)}
                      disabled={loadingPhotos === visit.id}
                    >
                      {loadingPhotos === visit.id ? (
                        <ActivityIndicator size="small" color="#666666" />
                      ) : (
                        <Camera size={16} color="#666666" />
                      )}
                      <Text style={{ fontSize: 13, color: '#666666', fontWeight: '500' }}>
                        {loadingPhotos === visit.id
                          ? 'Loading...'
                          : `${visit.photoCount} ${visit.photoCount === 1 ? 'Photo' : 'Photos'}`}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    paddingVertical: 14,
                    paddingHorizontal: 24,
                    backgroundColor: '#F5F5F5',
                    borderRadius: 8,
                    marginTop: 4,
                  }}
                  onPress={loadMoreVisits}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#666666" />
                  ) : (
                    <>
                      <ChevronDown size={18} color="#666666" />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: '#666666' }}>
                        Load More Visits
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </>
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
