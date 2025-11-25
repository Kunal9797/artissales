/**
 * ReviewHomeScreen - Manager Approval Dashboard
 *
 * Review and approve individual sheets and expenses from team members
 * Swipe right to approve, swipe left to reject
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import {
  FileBarChart,
  IndianRupee,
  User as UserIcon,
  Clock,
  CheckCircle,
  XCircle,
  ChevronDown,
  X,
  ImageIcon,
  Search,
  Filter,
} from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { api } from '../../services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { PendingItem, PendingItemType } from '../../types';
import { trackItemReviewed } from '../../services/analytics';

// Type filter options
type TypeFilter = 'all' | 'sheets' | 'expense';

interface ReviewHomeScreenProps {
  navigation?: any;
  route?: {
    params?: {
      filterUserId?: string;
      filterUserName?: string;
    };
  };
}

export const ReviewHomeScreen: React.FC<ReviewHomeScreenProps> = ({ navigation, route }) => {
  const bottomPadding = useBottomSafeArea(12);
  const queryClient = useQueryClient();

  // State
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [userFilter, setUserFilter] = useState<string>('all'); // 'all' or specific userName
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Apply filter from navigation params when they change
  useEffect(() => {
    if (route?.params?.filterUserName) {
      setUserFilter(route.params.filterUserName);
    }
  }, [route?.params?.filterUserName]);

  // User filter modal
  const [userFilterModalVisible, setUserFilterModalVisible] = useState(false);

  // Reject modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingItem, setRejectingItem] = useState<PendingItem | null>(null);
  const [rejectComment, setRejectComment] = useState('');

  // Photo viewer state
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [viewingPhotos, setViewingPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Expanded card state
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Track open swipeable refs to close them
  const swipeableRefs = useRef<Map<string, Swipeable>>(new Map());

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
    staleTime: 5 * 60 * 1000, // 5 minutes - reduce API calls
  });

  const items = pendingData?.items || [];
  const counts = pendingData?.counts || { sheets: 0, expenses: 0, total: 0 };

  // Get unique users for filter
  const uniqueUsers = useMemo(() => {
    const userMap = new Map<string, string>();
    items.forEach((item: PendingItem) => {
      userMap.set(item.userId, item.userName);
    });
    return Array.from(userMap.entries()).map(([id, name]) => ({ id, name }));
  }, [items]);

  // Filter items by type and user
  const filteredItems = useMemo(() => {
    let filtered = items;
    if (typeFilter !== 'all') {
      filtered = filtered.filter((item: PendingItem) => item.type === typeFilter);
    }
    if (userFilter !== 'all') {
      filtered = filtered.filter((item: PendingItem) => item.userName === userFilter);
    }
    return filtered;
  }, [items, typeFilter, userFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Close all swipeables
  const closeAllSwipeables = () => {
    swipeableRefs.current.forEach((ref) => ref?.close());
  };

  // Handle approve with optimistic update
  const handleApprove = async (item: PendingItem) => {
    closeAllSwipeables();
    setExpandedId(null);
    setActionLoading(item.id);

    // Optimistic update - remove item immediately
    queryClient.setQueryData(['pendingItems'], (old: any) => {
      if (!old) return old;
      const itemType = item.type === 'sheets' ? 'sheets' : 'expenses';
      return {
        ...old,
        items: old.items.filter((i: PendingItem) => i.id !== item.id),
        counts: {
          ...old.counts,
          [itemType]: Math.max(0, old.counts[itemType] - 1),
          total: Math.max(0, old.counts.total - 1),
        },
      };
    });

    try {
      const response = await api.approveItem({
        itemId: item.id,
        type: item.type,
      });

      if (!response.ok) {
        // Revert on error - refetch
        queryClient.invalidateQueries({ queryKey: ['pendingItems'] });
        Alert.alert('Error', response.error || 'Failed to approve');
      } else {
        // Success - track analytics event
        const hoursPending = item.date
          ? Math.round((Date.now() - new Date(item.date).getTime()) / (1000 * 60 * 60))
          : 0;
        trackItemReviewed({
          approved: true,
          itemType: item.type === 'sheets' ? 'sheets' : 'expense',
          hoursPending,
        });
      }
      // Success - optimistic update already applied, invalidate caches
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
      queryClient.invalidateQueries({ queryKey: ['managerDashboard'] });
    } catch (error: any) {
      // Revert on error - refetch
      queryClient.invalidateQueries({ queryKey: ['pendingItems'] });
      logger.error('Approve error:', error);
      Alert.alert('Error', error.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  // Handle reject with optimistic update
  const handleReject = async () => {
    if (!rejectingItem) return;

    const item = rejectingItem;
    setActionLoading(item.id);

    // Optimistic update - remove item immediately
    queryClient.setQueryData(['pendingItems'], (old: any) => {
      if (!old) return old;
      const itemType = item.type === 'sheets' ? 'sheets' : 'expenses';
      return {
        ...old,
        items: old.items.filter((i: PendingItem) => i.id !== item.id),
        counts: {
          ...old.counts,
          [itemType]: Math.max(0, old.counts[itemType] - 1),
          total: Math.max(0, old.counts.total - 1),
        },
      };
    });

    // Close modal immediately for better UX
    setRejectModalVisible(false);
    setRejectingItem(null);
    setRejectComment('');

    try {
      const response = await api.rejectItem({
        itemId: item.id,
        type: item.type,
        comment: rejectComment.trim() || undefined,
      });

      if (!response.ok) {
        // Revert on error - refetch
        queryClient.invalidateQueries({ queryKey: ['pendingItems'] });
        Alert.alert('Error', response.error || 'Failed to reject');
      } else {
        // Success - track analytics event
        const hoursPending = item.date
          ? Math.round((Date.now() - new Date(item.date).getTime()) / (1000 * 60 * 60))
          : 0;
        trackItemReviewed({
          approved: false,
          itemType: item.type === 'sheets' ? 'sheets' : 'expense',
          hoursPending,
          reasonLength: rejectComment.trim().length,
        });
      }
      // Success - optimistic update already applied, invalidate caches
      queryClient.invalidateQueries({ queryKey: ['teamStats'] });
      queryClient.invalidateQueries({ queryKey: ['managerDashboard'] });
    } catch (error: any) {
      // Revert on error - refetch
      queryClient.invalidateQueries({ queryKey: ['pendingItems'] });
      logger.error('Reject error:', error);
      Alert.alert('Error', error.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  // Open reject modal
  const openRejectModal = (item: PendingItem) => {
    closeAllSwipeables();
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

  // Render right swipe action (Approve - Green)
  const renderRightActions = (item: PendingItem, progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [80, 0],
    });

    return (
      <Animated.View
        style={{
          width: 80,
          backgroundColor: '#2E7D32',
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ translateX }],
        }}
      >
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
          onPress={() => handleApprove(item)}
        >
          <CheckCircle size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
            Approve
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render left swipe action (Reject - Red)
  const renderLeftActions = (item: PendingItem, progress: Animated.AnimatedInterpolation<number>) => {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-80, 0],
    });

    return (
      <Animated.View
        style={{
          width: 80,
          backgroundColor: '#EF5350',
          justifyContent: 'center',
          alignItems: 'center',
          transform: [{ translateX }],
        }}
      >
        <TouchableOpacity
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}
          onPress={() => openRejectModal(item)}
        >
          <XCircle size={24} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 12, marginTop: 4, fontWeight: '600' }}>
            Reject
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Render compact item card
  const renderItem = ({ item }: { item: PendingItem }) => {
    const isProcessing = actionLoading === item.id;
    const isSheets = item.type === 'sheets';
    const isExpanded = expandedId === item.id;
    const hasDetails = item.description || (item.receiptPhotos && item.receiptPhotos.length > 0);

    return (
      <View
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 12,
          overflow: 'hidden',
          // Shadow
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.12,
          shadowRadius: 6,
          elevation: 3,
          backgroundColor: '#FFFFFF',
        }}
      >
        <Swipeable
          ref={(ref) => {
            if (ref) swipeableRefs.current.set(item.id, ref);
          }}
          renderRightActions={(progress) => renderRightActions(item, progress)}
          renderLeftActions={(progress) => renderLeftActions(item, progress)}
          rightThreshold={40}
          leftThreshold={40}
          overshootRight={false}
          overshootLeft={false}
          onSwipeableOpen={() => {
            // Close expanded card and other swipeables when one opens
            setExpandedId(null);
            swipeableRefs.current.forEach((ref, id) => {
              if (id !== item.id) ref?.close();
            });
          }}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setExpandedId(isExpanded ? null : item.id)}
            style={{
              backgroundColor: '#FFFFFF',
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            {/* Content container */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 12 }}>
              {/* Type Icon */}
              <View style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isSheets ? '#FFF3E0' : '#F3E5F5',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {isSheets ? (
                  <FileBarChart size={22} color="#EF6C00" />
                ) : (
                  <IndianRupee size={22} color="#6A1B9A" />
                )}
              </View>

              {/* Content */}
              <View style={{ flex: 1 }}>
                {/* Main row: Value + User */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1A1A1A' }}>
                    {isSheets ? `${item.sheetsCount} sheets` : `₹${item.amount?.toLocaleString('en-IN') || 0}`}
                  </Text>
                  <Text style={{ fontSize: 13, color: '#666666' }} numberOfLines={1}>
                    {item.userName}
                  </Text>
                </View>

                {/* Detail row: Category + Date */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ fontSize: 13, color: '#999999' }} numberOfLines={1}>
                    {isSheets ? item.catalog : item.category}
                    {!isSheets && item.receiptPhotos && item.receiptPhotos.length > 0 && (
                      <Text> • 📷</Text>
                    )}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#999999' }}>
                    {formatDate(item.date)}
                  </Text>
                </View>
              </View>

              {/* Loading indicator */}
              {isProcessing && (
                <ActivityIndicator size="small" color="#666666" />
              )}
            </View>

            {/* Expanded section */}
            {isExpanded && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                {/* Notes/Description */}
                {item.description && (
                  <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>
                    {item.description}
                  </Text>
                )}

                {/* Receipt photos (expenses only) */}
                {item.receiptPhotos && item.receiptPhotos.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                    {item.receiptPhotos.map((photo, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => openPhotoViewer(item.receiptPhotos || [])}
                      >
                        <Image
                          source={{ uri: photo }}
                          style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: '#F0F0F0' }}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Empty state */}
                {!hasDetails && (
                  <Text style={{ fontSize: 13, color: '#999999', fontStyle: 'italic' }}>
                    No additional details
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </Swipeable>
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

  // Render loading state
  const renderLoading = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
      <ActivityIndicator size="large" color="#393735" />
      <Text style={{ marginTop: 12, fontSize: 14, color: '#666666' }}>Loading...</Text>
    </View>
  );

  // Get selected user name for display
  const selectedUserName = userFilter === 'all' ? 'All Users' : userFilter;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {/* Header */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 24,
        paddingTop: 52,
        paddingBottom: 16,
      }}>
        <Text style={{ fontSize: 24, fontWeight: '600', color: '#FFFFFF' }}>
          Review
        </Text>
        <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.7)', marginTop: 4 }}>
          {counts.total} pending • Swipe to approve/reject
        </Text>
      </View>

      {/* Filters Row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        gap: 8,
      }}>
        {/* User Filter Button */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 12,
            paddingVertical: 6,
            backgroundColor: userFilter === 'all' ? '#F0F0F0' : '#E3F2FD',
            borderRadius: 16,
            borderWidth: 1,
            borderColor: userFilter === 'all' ? '#E0E0E0' : '#90CAF9',
          }}
          onPress={() => setUserFilterModalVisible(true)}
        >
          <UserIcon size={14} color={userFilter === 'all' ? '#666666' : '#1976D2'} />
          <Text style={{
            fontSize: 13,
            color: userFilter === 'all' ? '#666666' : '#1976D2',
            maxWidth: 80,
          }} numberOfLines={1}>
            {selectedUserName}
          </Text>
          <ChevronDown size={14} color={userFilter === 'all' ? '#666666' : '#1976D2'} />
        </TouchableOpacity>

        {/* Type Filter Chips */}
        <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
          {/* All */}
          <TouchableOpacity
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: typeFilter === 'all' ? '#393735' : '#F0F0F0',
            }}
            onPress={() => setTypeFilter('all')}
          >
            <Text style={{
              fontSize: 13,
              fontWeight: '500',
              color: typeFilter === 'all' ? '#FFFFFF' : '#666666',
            }}>
              All
            </Text>
          </TouchableOpacity>

          {/* Sheets */}
          <TouchableOpacity
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: typeFilter === 'sheets' ? '#EF6C00' : '#F0F0F0',
            }}
            onPress={() => setTypeFilter('sheets')}
          >
            <Text style={{
              fontSize: 13,
              fontWeight: '500',
              color: typeFilter === 'sheets' ? '#FFFFFF' : '#666666',
            }}>
              Sheets
            </Text>
          </TouchableOpacity>

          {/* Expenses */}
          <TouchableOpacity
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              backgroundColor: typeFilter === 'expense' ? '#6A1B9A' : '#F0F0F0',
            }}
            onPress={() => setTypeFilter('expense')}
          >
            <Text style={{
              fontSize: 13,
              fontWeight: '500',
              color: typeFilter === 'expense' ? '#FFFFFF' : '#666666',
            }}>
              Expenses
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading ? (
        renderLoading()
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 60 + bottomPadding,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      )}

      {/* User Filter Modal */}
      <Modal
        visible={userFilterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUserFilterModalVisible(false)}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
          activeOpacity={1}
          onPress={() => setUserFilterModalVisible(false)}
        >
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            maxHeight: '60%',
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: '#E0E0E0',
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A' }}>
                Filter by User
              </Text>
              <TouchableOpacity onPress={() => setUserFilterModalVisible(false)}>
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={[{ id: 'all', name: 'All Users' }, ...uniqueUsers]}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: '#F0F0F0',
                    backgroundColor: (item.id === 'all' ? userFilter === 'all' : userFilter === item.name) ? '#E3F2FD' : '#FFFFFF',
                  }}
                  onPress={() => {
                    setUserFilter(item.id === 'all' ? 'all' : item.name);
                    setUserFilterModalVisible(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                    <Text style={{ fontSize: 16, color: '#1A1A1A' }}>
                      {item.name}
                    </Text>
                  </View>
                  {(item.id === 'all' ? userFilter === 'all' : userFilter === item.name) && (
                    <CheckCircle size={20} color="#1976D2" />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

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

          {viewingPhotos[currentPhotoIndex] && (
            <Image
              source={{ uri: viewingPhotos[currentPhotoIndex] }}
              style={{ width: '90%', height: '70%' }}
              resizeMode="contain"
            />
          )}

          {viewingPhotos.length > 1 && (
            <>
              {currentPhotoIndex > 0 && (
                <TouchableOpacity
                  style={{ position: 'absolute', left: 10, top: '50%', padding: 10 }}
                  onPress={() => setCurrentPhotoIndex((i) => i - 1)}
                >
                  <ChevronDown size={32} color="#FFFFFF" style={{ transform: [{ rotate: '90deg' }] }} />
                </TouchableOpacity>
              )}
              {currentPhotoIndex < viewingPhotos.length - 1 && (
                <TouchableOpacity
                  style={{ position: 'absolute', right: 10, top: '50%', padding: 10 }}
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
