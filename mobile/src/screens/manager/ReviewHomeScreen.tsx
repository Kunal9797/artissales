/**
 * ReviewHomeScreen - Manager Approval Dashboard
 *
 * Review and approve individual sheets and expenses from team members
 * Swipe right to approve, swipe left to reject
 */

import React, { useState, useCallback, useMemo, useRef, useEffect, memo, useTransition } from 'react';
import { logger } from '../../utils/logger';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  InteractionManager,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Image,
  Animated,
  StyleSheet,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import {
  Layers,
  IndianRupee,
  User as UserIcon,
  CheckCircle,
  XCircle,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { api } from '../../services/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useBottomSafeArea } from '../../hooks/useBottomSafeArea';
import { PendingItem, PendingItemType } from '../../types';
import { trackItemReviewed } from '../../services/analytics';

// Type filter options
type TypeFilter = 'all' | 'sheets' | 'expense';

// Format date for display (moved outside component to avoid recreation)
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
};

// Memoized item card component for better performance
interface ReviewItemCardProps {
  item: PendingItem;
  isProcessing: boolean;
  isExpanded: boolean;
  showUserName: boolean; // false when filtered to single user - show notes instead
  onToggleExpand: (id: string) => void;
  onApprove: (item: PendingItem) => void;
  onReject: (item: PendingItem) => void;
  onViewPhotos: (photos: string[]) => void;
  swipeableRef: (ref: Swipeable | null, id: string) => void;
  onSwipeOpen: (id: string) => void;
}

const ReviewItemCard = memo(({
  item,
  isProcessing,
  isExpanded,
  showUserName,
  onToggleExpand,
  onApprove,
  onReject,
  onViewPhotos,
  swipeableRef,
  onSwipeOpen,
}: ReviewItemCardProps) => {
  const isSheets = item.type === 'sheets';
  const hasDetails = item.description || (item.receiptPhotos && item.receiptPhotos.length > 0);

  // Stable callbacks that don't depend on item/callbacks changing
  const handleApprove = useCallback(() => {
    onApprove(item);
  }, [item.id]); // Only recreate if item.id changes

  const handleReject = useCallback(() => {
    onReject(item);
  }, [item.id]); // Only recreate if item.id changes

  // Render right swipe action (Approve - Green) - simplified, no animation transform
  const renderRightActions = useCallback(() => (
    <View style={[cardStyles.swipeAction, cardStyles.swipeActionApprove]}>
      <TouchableOpacity style={cardStyles.swipeActionButton} onPress={handleApprove}>
        <CheckCircle size={24} color="#FFFFFF" />
        <Text style={cardStyles.swipeActionText}>Approve</Text>
      </TouchableOpacity>
    </View>
  ), [handleApprove]);

  // Render left swipe action (Reject - Red) - simplified, no animation transform
  const renderLeftActions = useCallback(() => (
    <View style={[cardStyles.swipeAction, cardStyles.swipeActionReject]}>
      <TouchableOpacity style={cardStyles.swipeActionButton} onPress={handleReject}>
        <XCircle size={24} color="#FFFFFF" />
        <Text style={cardStyles.swipeActionText}>Reject</Text>
      </TouchableOpacity>
    </View>
  ), [handleReject]);

  const handlePress = useCallback(() => {
    onToggleExpand(item.id);
  }, [item.id, onToggleExpand]);

  const handleSwipeOpen = useCallback(() => {
    onSwipeOpen(item.id);
  }, [item.id, onSwipeOpen]);

  const handleRef = useCallback((ref: Swipeable | null) => {
    swipeableRef(ref, item.id);
  }, [item.id, swipeableRef]);

  return (
    <View style={cardStyles.cardContainer}>
      <Swipeable
        ref={handleRef}
        renderRightActions={renderRightActions}
        renderLeftActions={renderLeftActions}
        rightThreshold={40}
        leftThreshold={40}
        overshootRight={false}
        overshootLeft={false}
        onSwipeableOpen={handleSwipeOpen}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          style={isProcessing ? cardStyles.cardContentProcessing : cardStyles.cardContent}
        >
          {/* Content container */}
          <View style={cardStyles.cardRow}>
            {/* Type Icon */}
            <View style={[cardStyles.iconContainer, isSheets ? cardStyles.iconContainerSheets : cardStyles.iconContainerExpense]}>
              {isSheets ? (
                <Layers size={22} color="#EF6C00" />
              ) : (
                <IndianRupee size={22} color="#6A1B9A" />
              )}
            </View>

            {/* Content */}
            <View style={cardStyles.contentContainer}>
              {/* Main row: Value + User/Notes */}
              <View style={cardStyles.mainRow}>
                <Text style={cardStyles.valueText}>
                  {isSheets ? `${item.sheetsCount} sheets` : `₹${item.amount?.toLocaleString('en-IN') || 0}`}
                </Text>
                {showUserName ? (
                  <Text style={cardStyles.userNameText} numberOfLines={1}>
                    {item.userName}
                  </Text>
                ) : item.description ? (
                  <Text style={cardStyles.notesPreviewText} numberOfLines={1}>
                    "{item.description}"
                  </Text>
                ) : null}
              </View>

              {/* Detail row: Category + Date */}
              <View style={cardStyles.detailRow}>
                <Text style={cardStyles.categoryText} numberOfLines={1}>
                  {isSheets ? item.catalog : item.category}
                  {!isSheets && item.receiptPhotos && item.receiptPhotos.length > 0 && (
                    <Text> • 📷</Text>
                  )}
                </Text>
                <Text style={cardStyles.dateText}>
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
            <View style={cardStyles.expandedSection}>
              {/* Notes/Description */}
              {item.description && (
                <Text style={cardStyles.descriptionText}>
                  {item.description}
                </Text>
              )}

              {/* Receipt photos (expenses only) */}
              {item.receiptPhotos && item.receiptPhotos.length > 0 && (
                <View style={cardStyles.photosContainer}>
                  {item.receiptPhotos.map((photo, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => onViewPhotos(item.receiptPhotos || [])}
                    >
                      <Image
                        source={{ uri: photo }}
                        style={cardStyles.photoThumbnail}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Empty state */}
              {!hasDetails && (
                <Text style={cardStyles.emptyDetailsText}>
                  No additional details
                </Text>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Swipeable>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if these specific props change
  // Compare item content that affects display, not just item.id
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.type === nextProps.item.type &&
    prevProps.item.sheetsCount === nextProps.item.sheetsCount &&
    prevProps.item.amount === nextProps.item.amount &&
    prevProps.item.catalog === nextProps.item.catalog &&
    prevProps.item.category === nextProps.item.category &&
    prevProps.item.userName === nextProps.item.userName &&
    prevProps.item.date === nextProps.item.date &&
    prevProps.item.description === nextProps.item.description &&
    prevProps.isProcessing === nextProps.isProcessing &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.showUserName === nextProps.showUserName
  );
});

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

  // Use transition for smooth tab switching - separates urgent (tab highlight) from non-urgent (list filter)
  const [isPending, startTransition] = useTransition();

  // State - split into visual state (immediate) and filter state (deferred)
  const [selectedTab, setSelectedTab] = useState<TypeFilter>('all'); // Visual tab highlight - updates immediately
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all'); // Actual filter - updates via transition
  const [userFilter, setUserFilter] = useState<string>('all'); // 'all' or specific userName
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Apply filter from navigation params when they change
  // Use InteractionManager to defer state update and avoid "setState during render" warning
  useEffect(() => {
    const filterUserName = route?.params?.filterUserName;
    if (filterUserName) {
      const task = InteractionManager.runAfterInteractions(() => {
        setUserFilter(filterUserName);
      });
      return () => task.cancel();
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

  // Calculate pending counts per user (client-side from existing data)
  const userPendingCounts = useMemo(() => {
    const counts: Record<string, { sheets: number; expenses: number }> = {};
    items.forEach((item: PendingItem) => {
      if (!counts[item.userId]) {
        counts[item.userId] = { sheets: 0, expenses: 0 };
      }
      if (item.type === 'sheets') {
        counts[item.userId].sheets += 1; // Count number of entries, not sheetsCount
      } else if (item.type === 'expense') {
        counts[item.userId].expenses += 1;
      }
    });
    return counts;
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
  const closeAllSwipeables = useCallback(() => {
    swipeableRefs.current.forEach((ref) => ref?.close());
  }, []);

  // Handle approve with optimistic update
  const handleApprove = useCallback(async (item: PendingItem) => {
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
  }, [closeAllSwipeables, queryClient]);

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
  const openRejectModal = useCallback((item: PendingItem) => {
    closeAllSwipeables();
    setRejectingItem(item);
    setRejectComment('');
    setRejectModalVisible(true);
  }, [closeAllSwipeables]);

  // Open photo viewer
  const openPhotoViewer = useCallback((photos: string[]) => {
    setViewingPhotos(photos);
    setCurrentPhotoIndex(0);
    setPhotoViewerVisible(true);
  }, []);

  // Stable callbacks for memoized item component
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const handleSwipeableRef = useCallback((ref: Swipeable | null, id: string) => {
    if (ref) {
      swipeableRefs.current.set(id, ref);
    }
  }, []);

  const handleSwipeOpen = useCallback((id: string) => {
    setExpandedId(null);
    swipeableRefs.current.forEach((ref, refId) => {
      if (refId !== id) ref?.close();
    });
  }, []);

  // Memoized renderItem using the memoized component
  const renderItem = useCallback(({ item }: { item: PendingItem }) => (
    <ReviewItemCard
      item={item}
      isProcessing={actionLoading === item.id}
      isExpanded={expandedId === item.id}
      showUserName={userFilter === 'all'}
      onToggleExpand={handleToggleExpand}
      onApprove={handleApprove}
      onReject={openRejectModal}
      onViewPhotos={openPhotoViewer}
      swipeableRef={handleSwipeableRef}
      onSwipeOpen={handleSwipeOpen}
    />
  ), [actionLoading, expandedId, userFilter, handleToggleExpand, handleApprove, openRejectModal, openPhotoViewer, handleSwipeableRef, handleSwipeOpen]);

  // Stable keyExtractor
  const keyExtractor = useCallback((item: PendingItem) => item.id, []);

  // Handle type filter change - visual tab updates immediately, list filter deferred via transition
  const handleTypeFilterChange = useCallback((newFilter: TypeFilter) => {
    // Immediate: update tab highlight
    setSelectedTab(newFilter);
    // Deferred: update list filter (non-blocking)
    startTransition(() => {
      setTypeFilter(newFilter);
    });
  }, []);

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
      {/* Header - matches TeamStatsScreen design */}
      <View style={{
        backgroundColor: '#393735',
        paddingTop: 52,
        paddingBottom: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <CheckCircle size={24} color="#C9A961" />
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' }}>
            Review
          </Text>
        </View>
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(201, 169, 97, 0.25)',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 8,
            gap: 6,
            maxWidth: 180,
          }}
          onPress={() => setUserFilterModalVisible(true)}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#C9A961', flexShrink: 1 }} numberOfLines={1}>
            {selectedUserName}
          </Text>
          <ChevronDown size={16} color="#C9A961" />
        </TouchableOpacity>
      </View>

      {/* Type Filter Toggle - color-coded pills */}
      <View style={{
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E8E8E8',
      }}>
        <View style={{
          flexDirection: 'row',
          backgroundColor: '#F0F0F0',
          borderRadius: 10,
          padding: 3,
        }}>
          {/* All */}
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 8,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectedTab === 'all' ? '#6B7280' : 'transparent',
            }}
            onPress={() => handleTypeFilterChange('all')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: selectedTab === 'all' ? '#FFFFFF' : '#888888',
            }}>
              All ({counts.total})
            </Text>
          </TouchableOpacity>

          {/* Sheets */}
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 8,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectedTab === 'sheets' ? '#C4784A' : 'transparent',
            }}
            onPress={() => handleTypeFilterChange('sheets')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: selectedTab === 'sheets' ? '#FFFFFF' : '#888888',
            }}>
              Sheets ({counts.sheets})
            </Text>
          </TouchableOpacity>

          {/* Expenses */}
          <TouchableOpacity
            style={{
              flex: 1,
              paddingVertical: 10,
              paddingHorizontal: 8,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selectedTab === 'expense' ? '#7C6B8E' : 'transparent',
            }}
            onPress={() => handleTypeFilterChange('expense')}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: selectedTab === 'expense' ? '#FFFFFF' : '#888888',
            }}>
              Expenses ({counts.expenses})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      {loading ? (
        renderLoading()
      ) : (
        <FlashList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{
            paddingTop: 12,
            paddingBottom: 60 + bottomPadding,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          extraData={`${typeFilter}-${userFilter}-${actionLoading}-${expandedId}`}
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
              contentContainerStyle={{ paddingBottom: 40 }}
              renderItem={({ item }) => {
                const pending = userPendingCounts[item.id];
                const isSelected = item.id === 'all' ? userFilter === 'all' : userFilter === item.name;
                return (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F0F0F0',
                      backgroundColor: isSelected ? '#E3F2FD' : '#FFFFFF',
                    }}
                    onPress={() => {
                      setUserFilter(item.id === 'all' ? 'all' : item.name);
                      setUserFilterModalVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        backgroundColor: '#F5F5F5',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {item.id === 'all' ? (
                          <UserIcon size={16} color="#666666" />
                        ) : (
                          <Text style={{ fontSize: 13, fontWeight: '600', color: '#666' }}>
                            {item.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: '500', color: '#1A1A1A', flex: 1 }} numberOfLines={1}>
                        {item.name}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {/* Pending badges */}
                      {item.id !== 'all' && pending && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {pending.sheets > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 }}>
                              <Layers size={12} color="#FF9800" />
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#FF9800' }}>{pending.sheets}</Text>
                            </View>
                          )}
                          {pending.expenses > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E5F5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 }}>
                              <IndianRupee size={12} color="#7B1FA2" />
                              <Text style={{ fontSize: 12, fontWeight: '600', color: '#7B1FA2' }}>{pending.expenses}</Text>
                            </View>
                          )}
                        </View>
                      )}
                      {isSelected && <CheckCircle size={20} color="#1976D2" />}
                    </View>
                  </TouchableOpacity>
                );
              }}
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

// Stable styles - extracted outside component to prevent recreation on every render
const cardStyles = StyleSheet.create({
  // Card styles
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    backgroundColor: '#FFFFFF',
  },
  cardContent: {
    backgroundColor: '#FFFFFF',
  },
  cardContentProcessing: {
    backgroundColor: '#FFFFFF',
    opacity: 0.5,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerSheets: {
    backgroundColor: '#FFF3E0',
  },
  iconContainerExpense: {
    backgroundColor: '#F3E5F5',
  },
  contentContainer: {
    flex: 1,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  userNameText: {
    fontSize: 13,
    color: '#666666',
  },
  notesPreviewText: {
    fontSize: 12,
    color: '#888888',
    fontStyle: 'italic',
    maxWidth: 140,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  categoryText: {
    fontSize: 13,
    color: '#999999',
  },
  dateText: {
    fontSize: 12,
    color: '#999999',
  },
  expandedSection: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  photosContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  photoThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
  },
  emptyDetailsText: {
    fontSize: 13,
    color: '#999999',
    fontStyle: 'italic',
  },
  // Swipe action styles
  swipeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeActionApprove: {
    backgroundColor: '#2E7D32',
  },
  swipeActionReject: {
    backgroundColor: '#EF5350',
  },
  swipeActionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
