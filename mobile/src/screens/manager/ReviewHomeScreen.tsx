/**
 * ReviewHomeScreen - Manager Approval Dashboard
 *
 * Review and approve individual sheets and expenses from team members
 * Similar UX to sales rep activity logs with approve/reject actions
 */

import React, { useState, useCallback, useMemo } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  FileBarChart,
  IndianRupee,
  User as UserIcon,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  ChevronDown,
  X,
  ImageIcon,
} from 'lucide-react-native';
import { api } from '../../services/api';
import { Skeleton } from '../../patterns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { PendingItem, PendingItemType } from '../../types';

// Type filter options
type TypeFilter = 'all' | 'sheets' | 'expense';

export const ReviewHomeScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const bottomPadding = useBottomSafeArea(12);
  const queryClient = useQueryClient();

  // State
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // itemId being processed

  // Reject modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<PendingItem | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  // Photo viewer state
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Fetch pending items
  const {
    data: pendingData,
    isLoading: loading,
    refetch,
  } = useQuery({
    queryKey: ['pendingItems'],
    queryFn: async () => {
      const response = await api.getPendingItems();
      if (response.ok) {
        return {
          items: response.items || [],
          counts: response.counts || { sheets: 0, expenses: 0, total: 0 },
        };
      }
      return { items: [], counts: { sheets: 0, expenses: 0, total: 0 } };
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  const items = pendingData?.items || [];
  const counts = pendingData?.counts || { sheets: 0, expenses: 0, total: 0 };

  // Filter items by type
  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return items;
    return items.filter((item: PendingItem) => item.type === typeFilter);
  }, [items, typeFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Handle approve
  const handleApprove = async (item: PendingItem) => {
    setActionLoading(item.id);
    try {
      const response = await api.approveItem({
        itemId: item.id,
        type: item.type,
      });

      if (response.ok) {
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ['pendingItems'] });
        queryClient.invalidateQueries({ queryKey: ['teamStats'] });
      } else {
        Alert.alert('Error', response.error || 'Failed to approve');
      }
    } catch (error: any) {
      logger.error('Approve error:', error);
      Alert.alert('Error', error.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject (with optional comment)
  const handleReject = async () => {
    if (!rejectingItem) return;

    setActionLoading(rejectingItem.id);
    try {
      const response = await api.rejectItem({
        itemId: rejectingItem.id,
        type: rejectingItem.type,
        comment: rejectComment.trim() || undefined,
      });

      if (response.ok) {
        // Invalidate and refetch
        queryClient.invalidateQueries({ queryKey: ['pendingItems'] });
        queryClient.invalidateQueries({ queryKey: ['teamStats'] });
        setRejectModalVisible(false);
        setRejectingItem(null);
        setRejectComment('');
      } else {
        Alert.alert('Error', response.error || 'Failed to reject');
      }
    } catch (error: any) {
      logger.error('Reject error:', error);
      Alert.alert('Error', error.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  // Open reject modal
  const openRejectModal = (item: PendingItem) => {
    setRejectingItem(item);
    setRejectComment('');
    setRejectModalVisible(true);
  };

  // Open photo viewer
  const openPhotoViewer = (photos: string[]) => {
    setViewingPhotos(photos);
    setCurrentPhotoIndex(0);
    setPhotoViewerVisible(true);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Render item card
  const renderItem = ({ item }: { item: PendingItem }) => {
    const isProcessing = actionLoading === item.id;
    const isSheets = item.type === 'sheets';

    return (
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E0E0E0',
          borderRadius: 8,
          padding: 16,
          marginBottom: 12,
          opacity: isProcessing ? 0.6 : 1,
        }}
      >
        {/* Header Row: User + Date */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#F0F0F0',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <UserIcon size={16} color="#666666" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1A1A1A' }} numberOfLines={1}>
                {item.userName}
              </Text>
            </View>
          </View>

          {/* Date */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={14} color="#999999" />
            <Text style={{ fontSize: 13, color: '#666666' }}>
              {formatDate(item.date)}
            </Text>
          </View>
        </View>

        {/* Content Row: Type icon + Details */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          {/* Type Icon */}
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: isSheets ? '#F3E5F5' : '#FFF3E0',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isSheets ? (
              <FileBarChart size={20} color="#7B1FA2" />
            ) : (
              <IndianRupee size={20} color="#E65100" />
            )}
          </View>

          {/* Details */}
          <View style={{ flex: 1 }}>
            {isSheets ? (
              <>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>
                  {item.sheetsCount} sheets
                </Text>
                <Text style={{ fontSize: 14, color: '#666666' }}>
                  {item.catalog}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>
                  ₹{item.amount?.toLocaleString('en-IN') || 0}
                </Text>
                <Text style={{ fontSize: 14, color: '#666666' }}>
                  {item.category} • {item.description || 'No description'}
                </Text>
              </>
            )}
          </View>

          {/* Receipt photos indicator */}
          {!isSheets && item.receiptPhotos && item.receiptPhotos.length > 0 && (
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor: '#F0F0F0',
                borderRadius: 4,
              }}
              onPress={() => openPhotoViewer(item.receiptPhotos!)}
            >
              <ImageIcon size={14} color="#666666" />
              <Text style={{ fontSize: 12, color: '#666666' }}>
                {item.receiptPhotos.length}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {/* Reject Button */}
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              backgroundColor: '#FFEBEE',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#FFCDD2',
            }}
            onPress={() => openRejectModal(item)}
            disabled={isProcessing}
          >
            <XCircle size={18} color="#EF5350" />
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#EF5350' }}>
              Reject
            </Text>
          </TouchableOpacity>

          {/* Approve Button */}
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              paddingVertical: 10,
              backgroundColor: '#E8F5E9',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#C8E6C9',
            }}
            onPress={() => handleApprove(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#2E7D32" />
            ) : (
              <>
                <CheckCircle size={18} color="#2E7D32" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#2E7D32' }}>
                  Approve
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={{ alignItems: 'center', paddingVertical: 60 }}>
      <CheckCircle size={48} color="#C8E6C9" />
      <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginTop: 16 }}>
        All caught up!
      </Text>
      <Text style={{ fontSize: 14, color: '#666666', marginTop: 4, textAlign: 'center' }}>
        No pending items to review
      </Text>
    </View>
  );

  // Render skeleton loading
  const renderSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} card style={{ height: 140, marginBottom: 12 }} />
      ))}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 16,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>
              Review
            </Text>
            <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 }}>
              {counts.total} pending items
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={{
        flexDirection: 'row',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
      }}>
        {/* All */}
        <TouchableOpacity
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: typeFilter === 'all' ? '#393735' : '#F0F0F0',
          }}
          onPress={() => setTypeFilter('all')}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: typeFilter === 'all' ? '#FFFFFF' : '#666666',
          }}>
            All ({counts.total})
          </Text>
        </TouchableOpacity>

        {/* Sheets */}
        <TouchableOpacity
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: typeFilter === 'sheets' ? '#7B1FA2' : '#F0F0F0',
          }}
          onPress={() => setTypeFilter('sheets')}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: typeFilter === 'sheets' ? '#FFFFFF' : '#666666',
          }}>
            Sheets ({counts.sheets})
          </Text>
        </TouchableOpacity>

        {/* Expenses */}
        <TouchableOpacity
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: typeFilter === 'expense' ? '#E65100' : '#F0F0F0',
          }}
          onPress={() => setTypeFilter('expense')}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: typeFilter === 'expense' ? '#FFFFFF' : '#666666',
          }}>
            Expenses ({counts.expenses})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        renderSkeleton()
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 60 + bottomPadding,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Reject Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 24,
            width: '100%',
            maxWidth: 400,
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 8 }}>
              Reject {rejectingItem?.type === 'sheets' ? 'Sheet Sale' : 'Expense'}?
            </Text>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 16 }}>
              {rejectingItem?.userName} • {rejectingItem?.type === 'sheets'
                ? `${rejectingItem?.sheetsCount} sheets (${rejectingItem?.catalog})`
                : `₹${rejectingItem?.amount?.toLocaleString('en-IN')} (${rejectingItem?.category})`
              }
            </Text>

            {/* Comment input */}
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#E0E0E0',
                borderRadius: 8,
                padding: 12,
                fontSize: 14,
                minHeight: 80,
                textAlignVertical: 'top',
                marginBottom: 16,
              }}
              placeholder="Add a comment (optional)"
              placeholderTextColor="#999999"
              value={rejectComment}
              onChangeText={setRejectComment}
              multiline
            />

            {/* Buttons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#F0F0F0',
                  alignItems: 'center',
                }}
                onPress={() => {
                  setRejectModalVisible(false);
                  setRejectingItem(null);
                  setRejectComment('');
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#666666' }}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 8,
                  backgroundColor: '#EF5350',
                  alignItems: 'center',
                }}
                onPress={handleReject}
                disabled={actionLoading !== null}
              >
                {actionLoading === rejectingItem?.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                    Reject
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        visible={photoViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoViewerVisible(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Close button */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 10,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => setPhotoViewerVisible(false)}
          >
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Photo counter */}
          {viewingPhotos.length > 1 && (
            <View style={{
              position: 'absolute',
              top: 50,
              left: 20,
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: 12,
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14 }}>
                {currentPhotoIndex + 1} of {viewingPhotos.length}
              </Text>
            </View>
          )}

          {/* Photo */}
          {viewingPhotos[currentPhotoIndex] && (
            <Image
              source={{ uri: viewingPhotos[currentPhotoIndex] }}
              style={{ width: '90%', height: '70%' }}
              resizeMode="contain"
            />
          )}

          {/* Navigation arrows */}
          {viewingPhotos.length > 1 && (
            <>
              {currentPhotoIndex > 0 && (
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    padding: 10,
                  }}
                  onPress={() => setCurrentPhotoIndex((i) => i - 1)}
                >
                  <ChevronDown size={32} color="#FFFFFF" style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
              )}
              {currentPhotoIndex < viewingPhotos.length - 1 && (
                <TouchableOpacity
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    padding: 10,
                  }}
                  onPress={() => setCurrentPhotoIndex((i) => i + 1)}
                >
                  <ChevronDown size={32} color="#FFFFFF" style={{ transform: [{ rotate: '-90deg' }] }} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};
