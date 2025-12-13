/**
 * HomeScreen (Sales Rep Dashboard) - Redesigned with DS v0.1
 *
 * Changes from original:
 * - Uses KpiCard pattern for status/stats
 * - Uses Badge for attendance status
 * - Uses featureColors for visual distinction
 * - Reduced from 10+ cards to 5-6 essential items
 * - Added Skeleton loading states
 * - Improved visual hierarchy
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { logger } from '../utils/logger';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { FlashList, ListRenderItemInfo } from '@shopify/flash-list';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, getDoc, query, collection, where, getDocs, orderBy, limit, startAfter } from '@react-native-firebase/firestore';
import { Card, Badge } from '../components/ui';
import { KpiCard } from '../patterns/KpiCard';
import { ActivityItem, Activity } from '../components/ActivityItem';
import { PhotoViewer } from '../components/PhotoViewer';
import { CameraCapture } from '../components/CameraCapture';
import { colors, spacing, typography, featureColors, shadows } from '../theme';
import { api } from '../services/api';
import { getGreeting } from '../utils/greeting';
import { useBottomSafeArea } from '../hooks/useBottomSafeArea';
import { useProfileSheet } from '../providers/ProfileSheetProvider';
import {
  MapPin,
  IndianRupee,
  Layers,
  ChevronRight,
  CheckCircle,
  Check,
  Clock,
  Bell,
  Sun,
  Edit2,
  Moon,
  Sunrise,
  Lock,
  Camera,
  X,
  ChevronLeft,
  CloudUpload,
  RefreshCw,
} from 'lucide-react-native';
import { dataQueue, DataQueueItem, setOnSyncComplete } from '../services/dataQueue';
import { uploadPhoto } from '../services/storage';

// FEATURE FLAG: Set to false to disable attendance tracking
const ATTENDANCE_FEATURE_ENABLED = false;

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STATS_CACHE_KEY = '@artis_home_stats_cache';

// In-memory cache for immediate access (also persisted to AsyncStorage)
const statsCache: {
  data?: any;
  timestamp?: number;
  userId?: string;
  date?: string;
} = {};

const getCachedStats = (userId: string, date: string) => {
  const now = Date.now();
  if (
    statsCache.data &&
    statsCache.userId === userId &&
    statsCache.date === date &&
    statsCache.timestamp &&
    now - statsCache.timestamp < CACHE_TTL
  ) {
    return statsCache.data;
  }
  return null;
};

const setCachedStats = (userId: string, date: string, data: any) => {
  statsCache.data = data;
  statsCache.userId = userId;
  statsCache.date = date;
  statsCache.timestamp = Date.now();

  // Persist to AsyncStorage for faster cold starts
  persistCacheToStorage(userId, date, data).catch(err =>
    logger.error('Failed to persist cache:', err)
  );
};

export const invalidateHomeStatsCache = () => {
  statsCache.data = undefined;
  statsCache.timestamp = undefined;
  // Also clear persisted cache
  AsyncStorage.removeItem(STATS_CACHE_KEY).catch(() => {});
};

// Persist cache to AsyncStorage for faster app restarts
const persistCacheToStorage = async (userId: string, date: string, data: any) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
      userId,
      date,
    };
    await AsyncStorage.setItem(STATS_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    logger.error('Error persisting cache:', error);
  }
};

// Load cache from AsyncStorage (for cold starts)
const loadCacheFromStorage = async (userId: string, date: string): Promise<any | null> => {
  try {
    const cached = await AsyncStorage.getItem(STATS_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);
    const now = Date.now();

    // Validate cache: same user, same date, not expired
    if (
      parsed.userId === userId &&
      parsed.date === date &&
      parsed.timestamp &&
      now - parsed.timestamp < CACHE_TTL
    ) {
      // Also populate in-memory cache
      statsCache.data = parsed.data;
      statsCache.userId = parsed.userId;
      statsCache.date = parsed.date;
      statsCache.timestamp = parsed.timestamp;
      return parsed.data;
    }

    return null;
  } catch (error) {
    logger.error('Error loading cache from storage:', error);
    return null;
  }
};

interface HomeScreenProps {
  navigation: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;

  // Safe area insets for bottom padding (accounts for Android nav bar)
  const bottomPadding = useBottomSafeArea(12);

  // Profile sheet
  const { showProfileSheet } = useProfileSheet();

  const [userName, setUserName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<{
    isCheckedIn: boolean;
    hasCheckedOut: boolean;
    checkInTime: string | null;
    checkOutTime: string | null;
    location: string | null;
  }>({
    isCheckedIn: false,
    hasCheckedOut: false,
    checkInTime: null,
    checkOutTime: null,
    location: null,
  });
  const [todayStats, setTodayStats] = useState({
    visits: 0,
    sheets: 0,
    expenses: 0,
  });
  const [pendingItems, setPendingItems] = useState<Array<{ id: number; text: string; screen: string }>>([]);
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);

  // Pending sync queue items (offline submissions)
  const [pendingSyncQueue, setPendingSyncQueue] = useState<DataQueueItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination state for activity feed
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Activity filter state
  const [activityFilter, setActivityFilter] = useState<'all' | 'visit' | 'sheets' | 'expense'>('all');

  // Activity action sheet state
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [deletingActivity, setDeletingActivity] = useState(false);
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null);

  // Inline editing state
  const [editingField, setEditingField] = useState<'count' | 'catalog' | 'amount' | 'category' | 'notes' | null>(null);
  const [isEditMode, setIsEditMode] = useState(false); // For sheets/expenses expanded edit mode
  const [editValue, setEditValue] = useState<string>(''); // For count/amount
  const [editDetail, setEditDetail] = useState<string>(''); // For catalog/category (pending, not saved until Done)
  const [savingEdit, setSavingEdit] = useState(false);

  // Receipt photo state for expenses
  const [showReceiptCamera, setShowReceiptCamera] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Close modal and reset all edit states
  const closeActivityModal = () => {
    setSelectedActivity(null);
    setIsEditMode(false);
    setEditingField(null);
    setEditValue('');
    setEditDetail('');
  };

  // Updated toast state
  const [showUpdatedToast, setShowUpdatedToast] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // Fetch attendance data
  const fetchAttendance = useCallback(async () => {
    if (!user?.uid || !ATTENDANCE_FEATURE_ENABLED) return;

    try {
      const firestore = getFirestore();

      // Get start of today (00:00:00)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Query attendance for today using timestamp field (not date)
      const attendanceQuery = query(
        collection(firestore, 'attendance'),
        where('userId', '==', user.uid),
        where('timestamp', '>=', today)
      );

      const snapshot = await getDocs(attendanceQuery);

      if (!snapshot.empty) {
        // Sort manually to get latest
        const docs = snapshot.docs.sort((a: any, b: any) => {
          const aTime = a.data().timestamp?.toMillis() || 0;
          const bTime = b.data().timestamp?.toMillis() || 0;
          return bTime - aTime;
        });

        const latestAttendance = docs[0].data();
        const isCheckedIn = latestAttendance.type === 'check_in';
        const hasCheckedOut = latestAttendance.type === 'check_out';
        const time = latestAttendance.timestamp?.toDate();

        // Find check-in time if we have a check-out (to show worked duration)
        let checkInTime = null;
        if (hasCheckedOut) {
          const checkInDoc = docs.find((d: any) => d.data().type === 'check_in');
          if (checkInDoc) {
            const checkInTimestamp = checkInDoc.data().timestamp?.toDate();
            checkInTime = checkInTimestamp ? checkInTimestamp.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
          }
        } else if (isCheckedIn) {
          checkInTime = time ? time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;
        }

        setAttendanceStatus({
          isCheckedIn,
          hasCheckedOut,
          checkInTime,
          checkOutTime: hasCheckedOut && time ? time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null,
          location: 'Location',
        });
      } else {
        // Reset to not checked in if no records found
        setAttendanceStatus({
          isCheckedIn: false,
          hasCheckedOut: false,
          checkInTime: null,
          checkOutTime: null,
          location: null,
        });
      }
    } catch (error) {
      logger.error('Error fetching attendance:', error);
    }
  }, [user?.uid]);

  // Refs for pagination (to avoid dependency issues)
  const lastVisibleVisitRef = React.useRef<any>(null);
  const lastVisibleSheetRef = React.useRef<any>(null);
  const lastVisibleExpenseRef = React.useRef<any>(null);

  // Fetch activity feed (last 30 items, paginated)
  const fetchActivities = useCallback(async (loadMore: boolean = false) => {
    if (!user?.uid) return;

    try {
      const firestore = getFirestore();

      // Fetch visits - ordered by timestamp, limit 30
      let visitsQuery = query(
        collection(firestore, 'visits'),
        where('userId', '==', user.uid),
        orderBy('timestamp', 'desc'),
        limit(30)
      );
      if (loadMore && lastVisibleVisitRef.current) {
        visitsQuery = query(
          collection(firestore, 'visits'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          startAfter(lastVisibleVisitRef.current),
          limit(30)
        );
      }
      const visitsSnapshot = await getDocs(visitsQuery);

      // Fetch sheets - ordered by createdAt, limit 30
      let sheetsQuery = query(
        collection(firestore, 'sheetsSales'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(30)
      );
      if (loadMore && lastVisibleSheetRef.current) {
        sheetsQuery = query(
          collection(firestore, 'sheetsSales'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisibleSheetRef.current),
          limit(30)
        );
      }
      const sheetsSnapshot = await getDocs(sheetsQuery);

      // Fetch expenses - ordered by createdAt, limit 30
      let expensesQuery = query(
        collection(firestore, 'expenses'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(30)
      );
      if (loadMore && lastVisibleExpenseRef.current) {
        expensesQuery = query(
          collection(firestore, 'expenses'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisibleExpenseRef.current),
          limit(30)
        );
      }
      const expensesSnapshot = await getDocs(expensesQuery);

      // Calculate today's stats (for KPI cards - still shows today's counts)
      const todayString = new Date().toISOString().substring(0, 10);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let todayVisits = 0;
      let totalSheets = 0;
      let totalExpenses = 0;

      // Count today's items from the fetched results
      visitsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        const visitTime = data.timestamp?.toDate();
        if (visitTime && visitTime >= today) {
          todayVisits++;
        }
      });

      sheetsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.date === todayString) {
          totalSheets += data.sheetsCount || 0;
        }
      });

      expensesSnapshot.forEach((doc: any) => {
        const data = doc.data();
        if (data.date === todayString && data.items && Array.isArray(data.items)) {
          data.items.forEach((item: any) => {
            totalExpenses += item.amount || 0;
          });
        }
      });

      setTodayStats({
        visits: todayVisits,
        sheets: totalSheets,
        expenses: totalExpenses,
      });

      // Build activity timeline using the Activity type from ActivityItem component
      const activities: Activity[] = [];

      // NOTE: Attendance tracking is disabled for V1 (ATTENDANCE_FEATURE_ENABLED = false)
      // No attendance activities are added to the feed

      // Add visits (no detail on card, but store notes/purpose/photos for action sheet)
      visitsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'visit',
          time: data.timestamp?.toDate() || new Date(),
          description: data.accountName || 'Client visit',
          value: data.accountName || 'Client',
          notes: data.notes || undefined,
          purpose: data.purpose ? data.purpose.replace(/_/g, ' ') : undefined,
          photos: data.photos || [], // Store photos for viewing in action sheet
        });
      });

      // Add sheets sales (just number + catalog, no "sheets" text)
      sheetsSnapshot.forEach((doc: any) => {
        const data = doc.data();
        activities.push({
          id: doc.id,
          type: 'sheets',
          time: data.createdAt?.toDate() || new Date(),
          description: `${data.sheetsCount} - ${data.catalog}`,
          value: String(data.sheetsCount),
          detail: data.catalog,
          notes: data.notes || undefined,
          status: data.verified ? 'verified' : 'pending',
        });
      });

      // Add expenses
      expensesSnapshot.forEach((doc: any) => {
        const data = doc.data();
        // Calculate total amount from items array
        const totalAmount = data.items && Array.isArray(data.items)
          ? data.items.reduce((sum: number, item: any) => sum + (item.amount || 0), 0)
          : 0;

        // Get primary category from first item (capitalize first letter)
        let categoryLabel = 'Expense';
        if (data.items && data.items.length > 0) {
          const firstItem = data.items[0];
          if (firstItem.category === 'other' && firstItem.categoryOther) {
            categoryLabel = firstItem.categoryOther;
          } else {
            // Capitalize first letter (travel → Travel, food → Food)
            categoryLabel = firstItem.category.charAt(0).toUpperCase() + firstItem.category.slice(1);
          }
        }

        // Get description from first item if available
        const expenseNotes = data.items && data.items.length > 0 && data.items[0].description
          ? data.items[0].description
          : undefined;

        activities.push({
          id: doc.id,
          type: 'expense',
          time: data.createdAt?.toDate() || new Date(),
          description: `${totalAmount} - ${categoryLabel}`,
          value: String(totalAmount),
          detail: categoryLabel,
          notes: expenseNotes,
          status: data.status || 'pending', // 'pending' | 'verified' | 'rejected'
          photos: data.receiptPhotos || [], // Receipt photos for expenses
        });
      });

      // Sort by time (most recent first)
      activities.sort((a, b) => b.time.getTime() - a.time.getTime());

      // Update activities (append if loadMore, replace if initial)
      if (loadMore) {
        setTodayActivities(prev => [...prev, ...activities]);
      } else {
        setTodayActivities(activities);

        // Cache the data for faster cold starts (only for initial load, not pagination)
        const cacheData = {
          activities: activities.map(a => ({
            ...a,
            time: a.time.toISOString(), // Serialize Date for storage
          })),
          stats: { visits: todayVisits, sheets: totalSheets, expenses: totalExpenses },
        };
        setCachedStats(user.uid, todayString, cacheData);
      }

      // Store last visible documents for pagination (using refs to avoid re-renders)
      if (visitsSnapshot.docs.length > 0) {
        lastVisibleVisitRef.current = visitsSnapshot.docs[visitsSnapshot.docs.length - 1];
      }
      if (sheetsSnapshot.docs.length > 0) {
        lastVisibleSheetRef.current = sheetsSnapshot.docs[sheetsSnapshot.docs.length - 1];
      }
      if (expensesSnapshot.docs.length > 0) {
        lastVisibleExpenseRef.current = expensesSnapshot.docs[expensesSnapshot.docs.length - 1];
      }

      // Check if there's more data (if all collections returned < 30, we're done)
      const hasMoreData = visitsSnapshot.docs.length === 30 ||
                          sheetsSnapshot.docs.length === 30 ||
                          expensesSnapshot.docs.length === 30;
      setHasMore(hasMoreData);

    } catch (error) {
      logger.error('Error fetching activities:', error);
    }
  }, [user?.uid]); // Only depend on user.uid - refs don't need to be in deps

  // Load more activities for pagination
  const loadMoreActivities = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await fetchActivities(true);
    setLoadingMore(false);
  }, [hasMore, loadingMore, fetchActivities]);

  // Refresh function for pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Reset pagination refs
    lastVisibleVisitRef.current = null;
    lastVisibleSheetRef.current = null;
    lastVisibleExpenseRef.current = null;
    setHasMore(true);
    // Fetch fresh data
    await Promise.all([fetchAttendance(), fetchActivities(false)]);
    setRefreshing(false);

    // Show "Updated" toast with current time
    const now = new Date();
    setLastUpdatedTime(now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    setShowUpdatedToast(true);
    setTimeout(() => setShowUpdatedToast(false), 2000);
  }, [fetchAttendance, fetchActivities]);

  useEffect(() => {
    const loadUserData = async () => {
      if (user?.uid) {
        try {
          const firestore = getFirestore();
          const userDocRef = doc(firestore, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUserName(userData?.name || 'User');

            // Managers are routed via RootNavigator based on role
            // No need to manually redirect here
          }
        } catch (error) {
          logger.error('Error loading user data:', error);
          setUserName('User');
        } finally {
          setLoading(false);
        }
      }
    };

    loadUserData();
  }, [user?.uid, navigation]);

  // Fetch data on mount - try cache first for instant display, then refresh in background
  useEffect(() => {
    if (!user?.uid) return;

    const todayString = new Date().toISOString().substring(0, 10);

    const loadData = async () => {
      // First, try to load from persisted cache for instant display
      const cachedData = await loadCacheFromStorage(user.uid, todayString);

      if (cachedData) {
        // Instantly show cached data
        const restoredActivities = cachedData.activities.map((a: any) => ({
          ...a,
          time: new Date(a.time), // Deserialize Date from ISO string
        }));
        setTodayActivities(restoredActivities);
        setTodayStats(cachedData.stats);
        setLoading(false);
        logger.info('[HomeScreen] Loaded data from cache - instant display');
      }

      // Then fetch fresh data in background (will update UI + cache)
      Promise.all([
        fetchAttendance(),
        fetchActivities(false),
      ]);
    };

    loadData();
  }, [user?.uid, fetchAttendance, fetchActivities]);

  // Subscribe to offline data queue for pending sync items
  useEffect(() => {
    // Initialize the queue
    dataQueue.init();

    // Set callback for when items sync successfully (invalidates cache)
    setOnSyncComplete(() => {
      invalidateHomeStatsCache();
      // Refresh activities to show the newly synced items from server
      fetchActivities(false);
    });

    // Subscribe to queue changes
    const unsubscribe = dataQueue.subscribe((queue) => {
      setPendingSyncQueue(queue);
    });

    // Initial load
    setPendingSyncQueue(dataQueue.getQueue());

    return unsubscribe;
  }, [fetchActivities]);


  // Helper function to get date/time display with "Today" indicator
  const getActivityTimeDisplay = (date: Date): { primary: string; secondary: string; isToday: boolean } => {
    const now = new Date();
    const activityDate = new Date(date);

    // Check if it's today
    const isToday = activityDate.toDateString() === now.toDateString();

    if (isToday) {
      // For today: show relative time as primary, no secondary
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      let relativeTime = 'Just now';
      if (diffMins >= 1 && diffMins < 60) relativeTime = `${diffMins}m ago`;
      else if (diffHours >= 1 && diffHours < 24) relativeTime = `${diffHours}h ago`;

      return { primary: relativeTime, secondary: '', isToday: true };
    } else {
      // For older: show date as primary, time as secondary
      const dateStr = activityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const timeStr = activityDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return { primary: dateStr, secondary: timeStr, isToday: false };
    }
  };

  // Helper to calculate working duration
  const getWorkingDuration = (): string | null => {
    if (!attendanceStatus.isCheckedIn || !attendanceStatus.checkInTime) return null;

    try {
      const now = new Date();
      const timeStr = attendanceStatus.checkInTime;

      // Parse time string like "9:15 AM" or "2:30 PM"
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;

      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const period = match[3].toUpperCase();

      // Convert to 24-hour format
      let checkInHour = hours;
      if (period === 'PM' && hours !== 12) {
        checkInHour = hours + 12;
      } else if (period === 'AM' && hours === 12) {
        checkInHour = 0;
      }

      const checkIn = new Date();
      checkIn.setHours(checkInHour, minutes, 0, 0);

      const diffMs = now.getTime() - checkIn.getTime();
      if (diffMs < 0) return '0m'; // Future time

      const totalMins = Math.floor(diffMs / 60000);
      const hrs = Math.floor(totalMins / 60);
      const mins = totalMins % 60;

      if (hrs === 0) return `${mins}m`;
      return `${hrs}h ${mins}m`;
    } catch (error) {
      logger.error('Error calculating duration:', error);
      return null;
    }
  };

  const greeting = getGreeting();

  // Memoize pending sync activities conversion (avoid recalculating on every render)
  const pendingSyncActivities = useMemo((): Activity[] => {
    return pendingSyncQueue.map(item => {
      if (item.type === 'sheet') {
        const sheetData = item.data as import('../types').LogSheetsSaleRequest;
        return {
          id: item.id,
          type: 'sheets' as const,
          time: new Date(item.createdAt),
          description: `${sheetData.sheetsCount} - ${sheetData.catalog}`,
          value: String(sheetData.sheetsCount),
          detail: sheetData.catalog,
          notes: sheetData.notes,
          syncStatus: item.status as 'pending' | 'syncing' | 'failed',
        };
      } else {
        const expenseData = item.data as import('../types').SubmitExpenseRequest;
        const firstItem = expenseData.items[0];
        const totalAmount = expenseData.items.reduce((sum, i) => sum + i.amount, 0);
        const categoryLabel = firstItem.category === 'other' && firstItem.categoryOther
          ? firstItem.categoryOther
          : firstItem.category.charAt(0).toUpperCase() + firstItem.category.slice(1);

        return {
          id: item.id,
          type: 'expense' as const,
          time: new Date(item.createdAt),
          description: `${totalAmount} - ${categoryLabel}`,
          value: String(totalAmount),
          detail: categoryLabel,
          notes: firstItem.description,
          syncStatus: item.status as 'pending' | 'syncing' | 'failed',
        };
      }
    });
  }, [pendingSyncQueue]);

  // Memoize combined and sorted activities
  const allActivities = useMemo(() => {
    return [...todayActivities, ...pendingSyncActivities]
      .sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [todayActivities, pendingSyncActivities]);

  // Memoize filtered activities based on filter selection
  const filteredActivities = useMemo(() => {
    return activityFilter === 'all'
      ? allActivities
      : allActivities.filter(a => a.type === activityFilter);
  }, [allActivities, activityFilter]);

  // Memoize today/older activity split
  const { todayItems, olderItems } = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return {
      todayItems: filteredActivities.filter(a => a.time >= todayStart),
      olderItems: filteredActivities.filter(a => a.time < todayStart),
    };
  }, [filteredActivities]);

  // Memoized handler for activity item press (defined before renderListItem that uses it)
  const handleActivityItemPress = useCallback((activity: Activity) => {
    setSelectedActivity(activity);
  }, []);

  // Type for FlashList items - can be activity, separator, empty state, or load more
  type ListItem =
    | { type: 'empty_today'; id: string }
    | { type: 'activity'; data: Activity; id: string }
    | { type: 'separator'; id: string }
    | { type: 'no_results'; id: string }
    | { type: 'load_more'; id: string };

  // Build flat list data for FlashList with separators
  const listData = useMemo((): ListItem[] => {
    const items: ListItem[] = [];

    // Empty state when no activities at all
    if (allActivities.length === 0) {
      return items; // Return empty - empty state handled in ListEmptyComponent
    }

    // No activities today message (when we have older but not today)
    if (todayItems.length === 0 && olderItems.length > 0) {
      items.push({ type: 'empty_today', id: 'empty_today' });
    }

    // Today's activities
    todayItems.forEach(activity => {
      items.push({ type: 'activity', data: activity, id: activity.id });
    });

    // "Earlier" separator (only when there are older items)
    if (olderItems.length > 0) {
      items.push({ type: 'separator', id: 'earlier_separator' });
    }

    // Older activities
    olderItems.forEach(activity => {
      items.push({ type: 'activity', data: activity, id: activity.id });
    });

    // Empty state for filtered results (filter active but no matches)
    if (filteredActivities.length === 0 && allActivities.length > 0) {
      items.push({ type: 'no_results', id: 'no_results' });
    }

    // Load more button
    if (hasMore && todayActivities.length > 0) {
      items.push({ type: 'load_more', id: 'load_more' });
    }

    return items;
  }, [allActivities, todayItems, olderItems, filteredActivities, hasMore, todayActivities.length]);

  // FlashList renderItem callback
  const renderListItem = useCallback(({ item }: ListRenderItemInfo<ListItem>) => {
    switch (item.type) {
      case 'empty_today':
        return (
          <View style={{
            backgroundColor: 'rgba(0, 0, 0, 0.03)',
            borderRadius: 12,
            paddingVertical: 20,
            paddingHorizontal: 16,
            marginBottom: 8,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border.light,
            borderStyle: 'dashed',
          }}>
            <Text style={{ fontSize: 14, color: colors.text.tertiary, textAlign: 'center' }}>
              No activities logged today
            </Text>
          </View>
        );

      case 'activity':
        return (
          <ActivityItem
            activity={item.data}
            onPress={handleActivityItemPress}
          />
        );

      case 'separator':
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 12 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border.light }} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: colors.text.tertiary, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Earlier
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border.light }} />
          </View>
        );

      case 'no_results':
        return (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: colors.text.tertiary }}>No {activityFilter} activities found</Text>
          </View>
        );

      case 'load_more':
        return (
          <TouchableOpacity
            style={{
              marginTop: spacing.md,
              padding: spacing.md,
              backgroundColor: colors.surface,
              borderRadius: spacing.borderRadius.md,
              borderWidth: 1,
              borderColor: colors.border.light,
              alignItems: 'center',
            }}
            onPress={loadMoreActivities}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={{ fontSize: 14, fontWeight: '600', color: colors.primary }}>
                Load More
              </Text>
            )}
          </TouchableOpacity>
        );

      default:
        return null;
    }
  }, [handleActivityItemPress, activityFilter, loadMoreActivities, loadingMore]);

  // Key extractor for FlashList
  const keyExtractor = useCallback((item: ListItem) => item.id, []);

  // Delete activity handler
  const handleDeleteActivity = async (activity: typeof todayActivities[0]) => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingActivity(true);
            try {
              if (activity.type === 'visit') {
                await api.deleteVisit({ id: activity.id });
              } else if (activity.type === 'sheets') {
                await api.deleteSheetsSale({ id: activity.id });
              } else if (activity.type === 'expense') {
                await api.deleteExpense({ id: activity.id });
              }

              // Remove from local state immediately
              setTodayActivities(prev => prev.filter(a => a.id !== activity.id));
              setSelectedActivity(null);

              // Invalidate cache and refresh stats
              invalidateHomeStatsCache();
            } catch (error: any) {
              logger.error('Error deleting activity:', error);
              Alert.alert('Error', error.message || 'Failed to delete');
            } finally {
              setDeletingActivity(false);
            }
          },
        },
      ]
    );
  };

  // Options for catalog and category pickers
  const CATALOG_OPTIONS = ['Fine Decor', 'Artvio', 'Woodrica', 'Artis 1MM'];
  const CATEGORY_OPTIONS = ['travel', 'food', 'accommodation', 'other'];

  // Direct save handlers for catalog/category (avoid stale state issues)
  const handleCatalogChange = async (catalog: string) => {
    if (!selectedActivity || savingEdit) return;
    setSavingEdit(true);
    try {
      await api.updateSheetsSale({ id: selectedActivity.id, catalog });
      setTodayActivities(prev => prev.map(a =>
        a.id === selectedActivity.id ? { ...a, detail: catalog, description: `${a.value} - ${catalog}` } : a
      ));
      setSelectedActivity(prev => prev ? { ...prev, detail: catalog, description: `${prev.value} - ${catalog}` } : null);
      invalidateHomeStatsCache();
    } catch (error: any) {
      logger.error('Error updating catalog:', error);
      Alert.alert('Error', error.message || 'Failed to update catalog');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCategoryChange = async (category: string) => {
    if (!selectedActivity || savingEdit) return;
    setSavingEdit(true);
    try {
      await api.updateExpense({ id: selectedActivity.id, category });
      const displayCategory = category.charAt(0).toUpperCase() + category.slice(1);
      setTodayActivities(prev => prev.map(a =>
        a.id === selectedActivity.id ? { ...a, detail: displayCategory, description: `${a.value} - ${displayCategory}` } : a
      ));
      setSelectedActivity(prev => prev ? { ...prev, detail: displayCategory, description: `${prev.value} - ${displayCategory}` } : null);
      invalidateHomeStatsCache();
    } catch (error: any) {
      logger.error('Error updating category:', error);
      Alert.alert('Error', error.message || 'Failed to update category');
    } finally {
      setSavingEdit(false);
    }
  };

  // Handle receipt photo capture for expenses
  const handleReceiptPhotoTaken = async (uri: string) => {
    if (!selectedActivity || selectedActivity.type !== 'expense') return;

    setShowReceiptCamera(false);
    setUploadingReceipt(true);

    try {
      // Upload photo to Firebase Storage
      const downloadUrl = await uploadPhoto(uri, 'expenses');
      logger.log('[HomeScreen] Receipt uploaded:', downloadUrl);

      // Update the expense with the new receipt photo
      await api.updateExpense({
        id: selectedActivity.id,
        receiptPhotos: [downloadUrl],
      });

      // Update local state
      setTodayActivities(prev => prev.map(a =>
        a.id === selectedActivity.id ? { ...a, photos: [downloadUrl] } : a
      ));
      setSelectedActivity(prev => prev ? { ...prev, photos: [downloadUrl] } : null);

      invalidateHomeStatsCache();
    } catch (error: any) {
      logger.error('[HomeScreen] Error uploading receipt:', error);
      Alert.alert('Error', 'Failed to upload receipt photo. Please try again.');
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Inline edit save handler
  const handleInlineSave = async () => {
    if (!selectedActivity || !editingField || savingEdit) return;

    setSavingEdit(true);
    try {
      if (selectedActivity.type === 'sheets') {
        if (editingField === 'count') {
          const newCount = parseInt(editValue, 10);
          if (isNaN(newCount) || newCount <= 0) {
            Alert.alert('Invalid', 'Please enter a valid number');
            setSavingEdit(false);
            return;
          }
          await api.updateSheetsSale({ id: selectedActivity.id, sheetsCount: newCount });
          // Update local state
          setTodayActivities(prev => prev.map(a =>
            a.id === selectedActivity.id ? { ...a, value: String(newCount), description: `${newCount} - ${a.detail}` } : a
          ));
          setSelectedActivity(prev => prev ? { ...prev, value: String(newCount), description: `${newCount} - ${prev.detail}` } : null);
        } else if (editingField === 'catalog') {
          await api.updateSheetsSale({ id: selectedActivity.id, catalog: editValue });
          // Update local state
          setTodayActivities(prev => prev.map(a =>
            a.id === selectedActivity.id ? { ...a, detail: editValue, description: `${a.value} - ${editValue}` } : a
          ));
          setSelectedActivity(prev => prev ? { ...prev, detail: editValue, description: `${prev.value} - ${editValue}` } : null);
        }
      } else if (selectedActivity.type === 'expense') {
        if (editingField === 'amount') {
          const newAmount = parseInt(editValue, 10);
          if (isNaN(newAmount) || newAmount <= 0) {
            Alert.alert('Invalid', 'Please enter a valid amount');
            setSavingEdit(false);
            return;
          }
          await api.updateExpense({ id: selectedActivity.id, amount: newAmount });
          // Update local state
          setTodayActivities(prev => prev.map(a =>
            a.id === selectedActivity.id ? { ...a, value: String(newAmount), description: `${newAmount} - ${a.detail}` } : a
          ));
          setSelectedActivity(prev => prev ? { ...prev, value: String(newAmount), description: `${newAmount} - ${prev.detail}` } : null);
        } else if (editingField === 'category') {
          await api.updateExpense({ id: selectedActivity.id, category: editValue });
          // Update local state - capitalize first letter for display
          const displayCategory = editValue.charAt(0).toUpperCase() + editValue.slice(1);
          setTodayActivities(prev => prev.map(a =>
            a.id === selectedActivity.id ? { ...a, detail: displayCategory, description: `${a.value} - ${displayCategory}` } : a
          ));
          setSelectedActivity(prev => prev ? { ...prev, detail: displayCategory, description: `${prev.value} - ${displayCategory}` } : null);
        }
      } else if (selectedActivity.type === 'visit') {
        if (editingField === 'notes') {
          await api.updateVisit({ id: selectedActivity.id, notes: editValue });
          // Update local state
          setTodayActivities(prev => prev.map(a =>
            a.id === selectedActivity.id ? { ...a, notes: editValue } : a
          ));
          setSelectedActivity(prev => prev ? { ...prev, notes: editValue } : null);
        }
      }
      setEditingField(null);
      setEditValue('');

      // Invalidate cache and show feedback
      invalidateHomeStatsCache();
    } catch (error: any) {
      logger.error('Error saving edit:', error);
      Alert.alert('Error', error.message || 'Failed to save changes');
    } finally {
      setSavingEdit(false);
    }
  };

  // Cancel inline edit
  const cancelInlineEdit = useCallback(() => {
    setEditingField(null);
    setEditValue('');
  }, []);

  return (
    <View style={styles.container}>
      {/* Minimal Header */}
      <View style={{
        backgroundColor: '#393735',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Time icon + Welcome, Name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {greeting.icon === 'sunrise' && <Sunrise size={22} color="#C9A961" />}
          {greeting.icon === 'sun' && <Sun size={22} color="#C9A961" />}
          {greeting.icon === 'moon' && <Moon size={22} color="#C9A961" />}
          <Text style={{ fontSize: 22, fontWeight: '600', color: '#FFFFFF' }}>
            Hi, {userName ? userName.split(' ')[0].charAt(0).toUpperCase() + userName.split(' ')[0].slice(1) : 'User'}
          </Text>
        </View>

        {/* Artis Logo - Tappable, opens Profile Sheet */}
        <TouchableOpacity
          onPress={showProfileSheet}
          activeOpacity={0.7}
          style={{
            // Glow container
            shadowColor: '#C9A961',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Image
            source={require('../../assets/images/artislogo_blackbgrd.png')}
            style={{ width: 52, height: 52 }}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Updated Toast */}
      {showUpdatedToast && (
        <View style={{
          position: 'absolute',
          top: 130,
          left: 0,
          right: 0,
          alignItems: 'center',
          zIndex: 100,
        }}>
          <View style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '500' }}>
              Updated {lastUpdatedTime}
            </Text>
          </View>
        </View>
      )}

      <FlashList
        data={listData}
        renderItem={renderListItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingHorizontal: spacing.screenPadding, paddingBottom: 60 + bottomPadding }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={{ paddingTop: spacing.screenPadding }}>
            {/* Attendance Status Card - Compact Design (DISABLED via feature flag) */}
            {ATTENDANCE_FEATURE_ENABLED && (
              <Card elevation="md" style={styles.attendanceCard}>
                {attendanceStatus.isCheckedIn ? (
                // State 1: Currently checked in - Show working duration and Check Out button
                <>
                  <View style={styles.attendanceRow}>
                    <View style={styles.statusInfo}>
                      <Text style={styles.statusLabel}>Working for</Text>
                      <Text style={styles.statusValue}>{getWorkingDuration()}</Text>
                      <Text style={styles.checkInText}>
                        Checked in at {attendanceStatus.checkInTime}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.checkOutButton}
                      onPress={() => setShowAttendanceModal(true)}
                    >
                      <Text style={styles.checkOutButtonText}>Check Out</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : attendanceStatus.hasCheckedOut ? (
                // State 2: Already checked out - Show completion message with Check In Again button
                <>
                  <View style={styles.attendanceRow}>
                    <View style={styles.statusInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <CheckCircle size={20} color={featureColors.attendance.primary} strokeWidth={2.5} />
                        <Text style={styles.statusLabel}>Day Complete</Text>
                      </View>
                      <Text style={styles.notCheckedInText}>
                        Checked out at {attendanceStatus.checkOutTime}
                      </Text>
                      {attendanceStatus.checkInTime && (
                        <Text style={styles.checkInText}>
                          Started at {attendanceStatus.checkInTime}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.checkInAgainButton}
                      onPress={() => setShowAttendanceModal(true)}
                    >
                      <Text style={styles.checkInAgainButtonText}>Check In Again</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                // State 3: Not checked in yet - Show Check In button
                <>
                  <View style={styles.attendanceRow}>
                    <View style={styles.statusInfo}>
                      <Text style={styles.statusLabel}>Attendance</Text>
                      <Text style={styles.notCheckedInText}>Not checked in</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.checkInButton}
                      onPress={() => setShowAttendanceModal(true)}
                    >
                      <Text style={styles.checkInButtonText}>Check In</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              </Card>
            )}

            {/* KPI Cards - Today's Stats (Tappable as filters) */}
            <View style={styles.kpiSection}>
              <Text style={styles.sectionTitle}>Today's Activity</Text>
              <View style={styles.kpiRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActivityFilter(activityFilter === 'visit' ? 'all' : 'visit')}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: activityFilter === 'visit' ? featureColors.visits.primary : 'transparent',
                  }}
                >
                  <KpiCard
                    title="Visits"
                    value={todayStats.visits.toString()}
                    icon={<MapPin size={20} color={featureColors.visits.primary} />}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActivityFilter(activityFilter === 'sheets' ? 'all' : 'sheets')}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: activityFilter === 'sheets' ? featureColors.sheets.primary : 'transparent',
                  }}
                >
                  <KpiCard
                    title="Sheets"
                    value={todayStats.sheets.toString()}
                    icon={<Layers size={20} color={featureColors.sheets.primary} />}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setActivityFilter(activityFilter === 'expense' ? 'all' : 'expense')}
                  style={{
                    flex: 1,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: activityFilter === 'expense' ? featureColors.expenses.primary : 'transparent',
                  }}
                >
                  <KpiCard
                    title="Expenses"
                    value={todayStats.expenses.toString()}
                    icon={<IndianRupee size={20} color={featureColors.expenses.primary} />}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Pending Action Items - shown in header since it's not part of activity list */}
            {pendingItems.length > 0 && (
              <Card elevation="md" style={styles.pendingCard}>
                <View style={styles.pendingHeader}>
                  <Bell size={20} color={colors.warning} />
                  <Text style={styles.pendingTitle}>Action Items</Text>
                  <Badge variant="warning">{pendingItems.length}</Badge>
                </View>
                {pendingItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.pendingItem}
                    onPress={() => navigation.navigate(item.screen)}
                  >
                    <Text style={styles.pendingItemText}>• {item.text}</Text>
                    <ChevronRight size={16} color={colors.text.tertiary} />
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </View>
        }
        ListEmptyComponent={
          <Card elevation="sm" style={styles.timelineCard}>
            <View style={styles.emptyTimeline}>
              <Clock size={20} color={colors.text.tertiary} />
              <Text style={styles.emptyTimelineText}>
                Your activities will appear here as you log visits, sheets, and expenses
              </Text>
            </View>
          </Card>
        }
      />

      {/* Attendance Check-In/Out Modal */}
      <Modal
        visible={showAttendanceModal}
        transparent
        animationType="slide"
        onRequestClose={() => !attendanceLoading && setShowAttendanceModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
          }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>
              {attendanceStatus.isCheckedIn ? 'Check Out' : 'Check In'}
            </Text>
            <Text style={{ fontSize: 14, color: '#666666', marginBottom: 24 }}>
              {attendanceStatus.isCheckedIn
                ? `You've been working for ${getWorkingDuration() || 'today'}`
                : 'Start your work day'}
            </Text>

            <View style={{ backgroundColor: '#F8F8F8', padding: 16, borderRadius: 12, marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <MapPin size={18} color="#666666" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>Location</Text>
              </View>
              <Text style={{ fontSize: 14, color: '#666666' }}>
                {attendanceStatus.location || 'Getting location...'}
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
                <Clock size={18} color="#666666" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A' }}>Time</Text>
              </View>
              <Text style={{ fontSize: 14, color: '#666666' }}>
                {new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: attendanceLoading ? '#E0E0E0' : '#F8F8F8',
                  alignItems: 'center'
                }}
                onPress={() => setShowAttendanceModal(false)}
                disabled={attendanceLoading}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: attendanceLoading ? '#999999' : '#666666' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 14,
                  borderRadius: 12,
                  backgroundColor: attendanceLoading
                    ? (attendanceStatus.isCheckedIn ? '#EF5350' : '#2E7D32') + '99' // Add transparency when loading
                    : (attendanceStatus.isCheckedIn ? '#EF5350' : '#2E7D32'),
                  alignItems: 'center',
                  opacity: attendanceLoading ? 0.7 : 1,
                }}
                onPress={async () => {
                  try {
                    setAttendanceLoading(true);

                    // Get location
                    const { requestForegroundPermissionsAsync, getCurrentPositionAsync } = await import('expo-location');
                    const { status } = await requestForegroundPermissionsAsync();

                    if (status !== 'granted') {
                      Alert.alert('Permission Denied', 'Location permission is required');
                      setAttendanceLoading(false);
                      return;
                    }

                    const location = await getCurrentPositionAsync({ accuracy: 5 });

                    // Call API (backend expects lat/lon not latitude/longitude)
                    const response = attendanceStatus.isCheckedIn
                      ? await api.checkOut({
                          lat: location.coords.latitude,
                          lon: location.coords.longitude,
                          accuracyM: Math.round(location.coords.accuracy || 0),
                        })
                      : await api.checkIn({
                          lat: location.coords.latitude,
                          lon: location.coords.longitude,
                          accuracyM: Math.round(location.coords.accuracy || 0),
                        });

                    if (response.ok) {
                      Alert.alert('Success', attendanceStatus.isCheckedIn ? 'Checked out successfully' : 'Checked in successfully');
                      fetchAttendance();
                    }

                    setShowAttendanceModal(false);
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to process attendance');
                  } finally {
                    setAttendanceLoading(false);
                  }
                }}
                disabled={attendanceLoading}
              >
                {attendanceLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                    {attendanceStatus.isCheckedIn ? 'Check Out' : 'Check In'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Activity Action Sheet Modal */}
      <Modal
        visible={!!selectedActivity}
        transparent
        animationType="slide"
        onRequestClose={closeActivityModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}>
            {/* Backdrop - tapping here closes the modal */}
            <TouchableOpacity
              style={{ flex: 1 }}
              activeOpacity={1}
              onPress={closeActivityModal}
            />
            {/* Content - tapping here dismisses keyboard but does NOT close the modal */}
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderTopLeftRadius: 20,
                  borderTopRightRadius: 20,
                  padding: 20,
                  paddingBottom: bottomPadding,
                }}
              >
            {selectedActivity && (() => {
              const now = new Date();
              // Visits editable within 48 hours, sheets/expenses editable if pending
              const hoursSinceActivity = (now.getTime() - selectedActivity.time.getTime()) / (1000 * 60 * 60);
              const canEdit = selectedActivity.type === 'visit'
                ? hoursSinceActivity <= 48
                : (selectedActivity.type === 'sheets' || selectedActivity.type === 'expense')
                  ? selectedActivity.status === 'pending'
                  : false;

              const getStatusText = () => {
                if (selectedActivity.type === 'visit') return null;
                const status = selectedActivity.status || 'pending';
                const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
                  pending: { label: 'Pending Review', color: '#F9A825', bg: '#FFF8E1' },
                  verified: { label: 'Verified', color: '#2E7D32', bg: '#E8F5E9' },
                  approved: { label: 'Approved', color: '#2E7D32', bg: '#E8F5E9' },
                  rejected: { label: 'Rejected', color: '#C62828', bg: '#FFEBEE' },
                };
                return statusConfig[status] || statusConfig.pending;
              };

              const statusInfo = getStatusText();

              // Check if sheets/expenses is in edit mode
              const isSheetsOrExpense = selectedActivity.type === 'sheets' || selectedActivity.type === 'expense';
              const showEditPanel = isSheetsOrExpense && isEditMode && canEdit;

              // Get the current detail for category pre-selection
              const getCurrentDetail = () => {
                if (editDetail) return editDetail;
                return selectedActivity.detail || '';
              };

              return (
                <>
                  {/* Header - Title + Status */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: colors.text.primary }}>
                        {selectedActivity.type === 'expense' ? `₹${selectedActivity.value}` : selectedActivity.value || selectedActivity.description}
                      </Text>
                      {selectedActivity.detail && !showEditPanel && (
                        <Text style={{ fontSize: 15, color: colors.text.secondary, marginTop: 4 }}>
                          {selectedActivity.detail}
                        </Text>
                      )}
                    </View>
                    {statusInfo && (
                      <View style={{
                        backgroundColor: statusInfo.bg,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 16,
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: statusInfo.color }}>
                          {statusInfo.label}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Edit Panel - Expanded for sheets/expenses when in edit mode */}
                  {showEditPanel && (
                    <>
                      {/* Amount Input */}
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 8, textTransform: 'uppercase', fontWeight: '600' }}>
                          {selectedActivity.type === 'sheets' ? 'Sheet Count' : 'Amount'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          {selectedActivity.type === 'expense' && (
                            <Text style={{ fontSize: 24, fontWeight: '600', color: colors.text.primary, marginRight: 8 }}>₹</Text>
                          )}
                          <TextInput
                            style={{
                              flex: 1,
                              fontSize: 24,
                              fontWeight: '600',
                              color: colors.text.primary,
                              backgroundColor: '#F5F5F5',
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingVertical: 14,
                            }}
                            value={editValue || selectedActivity.value || ''}
                            onChangeText={setEditValue}
                            keyboardType="numeric"
                            placeholder={selectedActivity.type === 'sheets' ? 'Enter count' : 'Enter amount'}
                          />
                        </View>
                      </View>

                      {/* Category Selection */}
                      <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 8, textTransform: 'uppercase', fontWeight: '600' }}>
                          {selectedActivity.type === 'sheets' ? 'Catalog' : 'Category'}
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                          {(selectedActivity.type === 'sheets' ? CATALOG_OPTIONS : CATEGORY_OPTIONS).map((option) => {
                            const displayOption = selectedActivity.type === 'expense'
                              ? option.charAt(0).toUpperCase() + option.slice(1)
                              : option;
                            const currentDetail = getCurrentDetail();
                            // For expenses: check if current detail matches option, OR if it's a custom "other" category
                            // (custom categories won't match any standard option, so "Other" should be selected)
                            const standardCategories = ['travel', 'food', 'accommodation', 'other'];
                            const isCustomOther = selectedActivity.type === 'expense' &&
                              !standardCategories.includes(currentDetail.toLowerCase()) &&
                              option.toLowerCase() === 'other';
                            const isSelected = selectedActivity.type === 'sheets'
                              ? currentDetail === option
                              : currentDetail.toLowerCase() === option.toLowerCase() || isCustomOther;
                            const featureColor = selectedActivity.type === 'sheets'
                              ? featureColors.sheets.primary
                              : featureColors.expenses.primary;

                            return (
                              <TouchableOpacity
                                key={option}
                                style={{
                                  paddingHorizontal: 16,
                                  paddingVertical: 10,
                                  borderRadius: 20,
                                  backgroundColor: isSelected ? featureColor : '#F5F5F5',
                                  borderWidth: isSelected ? 0 : 1,
                                  borderColor: '#E0E0E0',
                                }}
                                onPress={() => setEditDetail(option)}
                                disabled={savingEdit}
                              >
                                <Text style={{
                                  fontSize: 14,
                                  fontWeight: '600',
                                  color: isSelected ? '#FFFFFF' : colors.text.secondary,
                                }}>
                                  {displayOption}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>

                      {/* Receipt Photo - Only in edit mode for expenses */}
                      {selectedActivity.type === 'expense' && (
                        <View style={{ marginBottom: 16 }}>
                          <Text style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 8, textTransform: 'uppercase', fontWeight: '600' }}>Receipt</Text>
                          {selectedActivity.photos && selectedActivity.photos.length > 0 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <TouchableOpacity onPress={() => setViewingPhotoIndex(0)}>
                                <Image
                                  source={{ uri: selectedActivity.photos[0] }}
                                  style={{ width: 60, height: 60, borderRadius: 8 }}
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => setShowReceiptCamera(true)}
                                disabled={uploadingReceipt}
                                style={{ flex: 1 }}
                              >
                                {uploadingReceipt ? (
                                  <ActivityIndicator size="small" color={featureColors.expenses.primary} />
                                ) : (
                                  <Text style={{ fontSize: 14, color: featureColors.expenses.primary, fontWeight: '500' }}>
                                    Change Receipt
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              onPress={() => setShowReceiptCamera(true)}
                              disabled={uploadingReceipt}
                              style={{
                                backgroundColor: '#F5F5F5',
                                borderRadius: 12,
                                padding: 16,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                              }}
                            >
                              {uploadingReceipt ? (
                                <ActivityIndicator size="small" color={featureColors.expenses.primary} />
                              ) : (
                                <>
                                  <Camera size={20} color={featureColors.expenses.primary} />
                                  <Text style={{ fontSize: 14, color: featureColors.expenses.primary, fontWeight: '500' }}>
                                    Add Receipt Photo
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </>
                  )}

                  {/* Time - always visible */}
                  {!showEditPanel && (
                    <Text style={{ fontSize: 13, color: colors.text.tertiary, marginBottom: 16 }}>
                      {selectedActivity.time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {selectedActivity.time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </Text>
                  )}

                  {/* Bottom Buttons */}
                  {showEditPanel ? (
                    /* Edit Mode: Done & Cancel at bottom */
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={async () => {
                          setSavingEdit(true);
                          try {
                            const newValue = editValue ? parseInt(editValue, 10) : null;
                            const valueChanged = newValue && !isNaN(newValue) && newValue > 0 && String(newValue) !== selectedActivity.value;
                            const currentDetailValue = getCurrentDetail();
                            const detailChanged = editDetail && editDetail !== selectedActivity.detail &&
                              (selectedActivity.type === 'sheets' || editDetail.toLowerCase() !== (selectedActivity.detail || '').toLowerCase());

                            if (selectedActivity.type === 'sheets') {
                              if (valueChanged || detailChanged) {
                                await api.updateSheetsSale({
                                  id: selectedActivity.id,
                                  ...(valueChanged && { sheetsCount: newValue }),
                                  ...(detailChanged && { catalog: editDetail }),
                                });
                                const updatedValue = valueChanged ? String(newValue) : selectedActivity.value;
                                const updatedDetail = detailChanged ? editDetail : selectedActivity.detail;
                                setTodayActivities(prev => prev.map(a =>
                                  a.id === selectedActivity.id ? { ...a, value: updatedValue, detail: updatedDetail, description: `${updatedValue} - ${updatedDetail}` } : a
                                ));
                                setSelectedActivity(prev => prev ? { ...prev, value: updatedValue, detail: updatedDetail, description: `${updatedValue} - ${updatedDetail}` } : null);
                                invalidateHomeStatsCache();
                              }
                            } else {
                              if (valueChanged || detailChanged) {
                                await api.updateExpense({
                                  id: selectedActivity.id,
                                  ...(valueChanged && { amount: newValue }),
                                  ...(detailChanged && { category: editDetail.toLowerCase() }),
                                });
                                const updatedValue = valueChanged ? String(newValue) : selectedActivity.value;
                                const updatedDetail = detailChanged ? (editDetail.charAt(0).toUpperCase() + editDetail.slice(1).toLowerCase()) : selectedActivity.detail;
                                setTodayActivities(prev => prev.map(a =>
                                  a.id === selectedActivity.id ? { ...a, value: updatedValue, detail: updatedDetail, description: `${updatedValue} - ${updatedDetail}` } : a
                                ));
                                setSelectedActivity(prev => prev ? { ...prev, value: updatedValue, detail: updatedDetail, description: `${updatedValue} - ${updatedDetail}` } : null);
                                invalidateHomeStatsCache();
                              }
                            }
                            closeActivityModal();
                          } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to save');
                          } finally {
                            setSavingEdit(false);
                          }
                        }}
                        disabled={savingEdit}
                        style={[
                          {
                            flex: 1,
                            backgroundColor: selectedActivity.type === 'sheets' ? featureColors.sheets.primary : featureColors.expenses.primary,
                            paddingVertical: 14,
                            borderRadius: 12,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 6,
                          },
                          // Dim if no changes made
                          (!editValue || editValue === selectedActivity.value) &&
                          (!editDetail || editDetail === selectedActivity.detail) &&
                          { opacity: 0.5 }
                        ]}
                      >
                        {savingEdit ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <>
                            <Check size={18} color="#FFFFFF" />
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Done</Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 24,
                          borderRadius: 12,
                          backgroundColor: '#F5F5F5',
                        }}
                        onPress={() => {
                          setIsEditMode(false);
                          setEditValue('');
                          setEditDetail('');
                        }}
                        disabled={savingEdit}
                      >
                        <Text style={{ fontSize: 15, fontWeight: '600', color: colors.text.secondary }}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    /* Default View: Edit & Delete buttons */
                    canEdit && isSheetsOrExpense && (
                      <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            backgroundColor: selectedActivity.type === 'sheets' ? featureColors.sheets.primary : featureColors.expenses.primary,
                            paddingVertical: 14,
                            borderRadius: 12,
                            alignItems: 'center',
                            flexDirection: 'row',
                            justifyContent: 'center',
                            gap: 6,
                          }}
                          onPress={() => {
                            setIsEditMode(true);
                            setEditValue(selectedActivity.value || '');
                            setEditDetail(selectedActivity.detail || '');
                          }}
                          disabled={deletingActivity}
                        >
                          <Edit2 size={18} color="#FFFFFF" />
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{
                            paddingVertical: 14,
                            paddingHorizontal: 20,
                            borderRadius: 12,
                            backgroundColor: '#FFEBEE',
                          }}
                          onPress={() => handleDeleteActivity(selectedActivity)}
                          disabled={deletingActivity}
                        >
                          {deletingActivity ? (
                            <ActivityIndicator size="small" color="#C62828" />
                          ) : (
                            <Text style={{ fontSize: 15, fontWeight: '600', color: '#C62828' }}>Delete</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    )
                  )}

                  {/* Purpose (for visits) */}
                  {selectedActivity.type === 'visit' && selectedActivity.purpose && (
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary, textTransform: 'uppercase', marginBottom: 2 }}>Purpose</Text>
                      <Text style={{ fontSize: 14, color: colors.text.secondary }}>{selectedActivity.purpose}</Text>
                    </View>
                  )}

                  {/* Notes - Editable for visits */}
                  {selectedActivity.type === 'visit' && canEdit ? (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary, textTransform: 'uppercase', marginBottom: 2 }}>Notes</Text>
                      {editingField === 'notes' ? (
                        <View style={{ gap: 8 }}>
                          <TextInput
                            style={{
                              fontSize: 14,
                              color: colors.text.primary,
                              borderWidth: 1,
                              borderColor: featureColors.visits.primary,
                              borderRadius: 8,
                              padding: 10,
                              minHeight: 60,
                              textAlignVertical: 'top',
                            }}
                            value={editValue}
                            onChangeText={setEditValue}
                            multiline
                            autoFocus
                            placeholder="Add notes..."
                          />
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={handleInlineSave} disabled={savingEdit}>
                              {savingEdit ? (
                                <ActivityIndicator size="small" color={featureColors.visits.primary} />
                              ) : (
                                <Text style={{ color: featureColors.visits.primary, fontWeight: '600' }}>Save</Text>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={cancelInlineEdit}>
                              <Text style={{ color: colors.text.tertiary }}>Cancel</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => { setEditingField('notes'); setEditValue(selectedActivity.notes || ''); }}>
                          <Text style={{ fontSize: 14, color: selectedActivity.notes ? colors.text.secondary : colors.text.tertiary }}>
                            {selectedActivity.notes || 'Tap to add notes'} <Edit2 size={12} color={colors.text.tertiary} />
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : selectedActivity.notes ? (
                    <View style={{ marginBottom: 12 }}>
                      <Text style={{ fontSize: 12, color: colors.text.tertiary, textTransform: 'uppercase', marginBottom: 2 }}>Notes</Text>
                      <Text style={{ fontSize: 14, color: colors.text.secondary }}>{selectedActivity.notes}</Text>
                    </View>
                  ) : null}

                  {/* Photos section for visits */}
                  {selectedActivity.type === 'visit' && selectedActivity.photos && selectedActivity.photos.length > 0 && (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: featureColors.visits.light,
                        paddingVertical: 12,
                        paddingHorizontal: 14,
                        borderRadius: 10,
                        marginBottom: 12,
                        gap: 8,
                      }}
                      onPress={() => setViewingPhotoIndex(0)}
                    >
                      <Camera size={20} color={featureColors.visits.primary} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: featureColors.visits.primary }}>
                        View {selectedActivity.photos.length} Photo{selectedActivity.photos.length > 1 ? 's' : ''}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Visits: Actions */}
                  {selectedActivity.type === 'visit' && canEdit && (
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          backgroundColor: featureColors.visits.primary,
                          paddingVertical: 14,
                          borderRadius: 12,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                        onPress={() => {
                          closeActivityModal();
                          navigation.navigate('LogVisit', { editActivityId: selectedActivity.id });
                        }}
                        disabled={deletingActivity}
                      >
                        <Edit2 size={18} color="#FFFFFF" />
                        <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>Edit Visit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          paddingVertical: 14,
                          paddingHorizontal: 20,
                          borderRadius: 12,
                          backgroundColor: '#FFEBEE',
                        }}
                        onPress={() => handleDeleteActivity(selectedActivity)}
                        disabled={deletingActivity}
                      >
                        {deletingActivity ? (
                          <ActivityIndicator size="small" color="#C62828" />
                        ) : (
                          <Text style={{ fontSize: 15, fontWeight: '600', color: '#C62828' }}>Delete</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              );
            })()}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Photo Viewing Modal */}
      <Modal
        visible={viewingPhotoIndex !== null && selectedActivity?.photos && selectedActivity.photos.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingPhotoIndex(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 50,
            paddingBottom: 16,
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              Photo {(viewingPhotoIndex ?? 0) + 1} of {selectedActivity?.photos?.length ?? 0}
            </Text>
            <TouchableOpacity
              onPress={() => setViewingPhotoIndex(null)}
              style={{ padding: 8 }}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Photo */}
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
            {selectedActivity?.photos && viewingPhotoIndex !== null && (
              <Image
                source={{ uri: selectedActivity.photos[viewingPhotoIndex] }}
                style={{ width: '100%', height: '80%', borderRadius: 8 }}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Navigation buttons (if multiple photos) */}
          {selectedActivity?.photos && selectedActivity.photos.length > 1 && (
            <View style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              paddingBottom: 40,
              gap: 40,
            }}>
              <TouchableOpacity
                onPress={() => setViewingPhotoIndex(Math.max(0, (viewingPhotoIndex ?? 0) - 1))}
                disabled={viewingPhotoIndex === 0}
                style={{
                  opacity: viewingPhotoIndex === 0 ? 0.3 : 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 24,
                  padding: 12,
                }}
              >
                <ChevronLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setViewingPhotoIndex(Math.min((selectedActivity?.photos?.length ?? 1) - 1, (viewingPhotoIndex ?? 0) + 1))}
                disabled={viewingPhotoIndex === (selectedActivity?.photos?.length ?? 1) - 1}
                style={{
                  opacity: viewingPhotoIndex === (selectedActivity?.photos?.length ?? 1) - 1 ? 0.3 : 1,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: 24,
                  padding: 12,
                }}
              >
                <ChevronRight size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>

      {/* Receipt Camera Modal for Expenses */}
      {showReceiptCamera && (
        <Modal
          visible={showReceiptCamera}
          animationType="slide"
          onRequestClose={() => setShowReceiptCamera(false)}
        >
          <CameraCapture
            onPhotoTaken={handleReceiptPhotoTaken}
            onCancel={() => setShowReceiptCamera(false)}
          />
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Minimal Greeting Bar
  greetingBar: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: 52, // Status bar space
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  greetingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greetingText: {
    fontSize: 19,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.inverse,
    letterSpacing: 0.3,
  },
  // Attendance Status Card - Compact Design
  attendanceCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  attendanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: featureColors.attendance.primary,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  checkInText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  notCheckedInText: {
    fontSize: 15,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
  },
  // Check Out button
  checkOutButton: {
    backgroundColor: '#FFEBEE',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
  },
  checkOutButtonText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: '#C62828',
  },
  // Check In button
  checkInButton: {
    backgroundColor: featureColors.attendance.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.borderRadius.md,
  },
  checkInButtonText: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.surface,
  },
  // Completed badge (for checked out state)
  completedBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: featureColors.attendance.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadgeText: {
    fontSize: 24,
    color: featureColors.attendance.primary,
  },
  // Check In Again button (smaller, secondary style)
  checkInAgainButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: featureColors.attendance.primary,
  },
  checkInAgainButtonText: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semiBold,
    color: featureColors.attendance.primary,
  },

  // KPI Section
  kpiSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Activity Timeline with connecting lines
  timelineContainer: {
    marginBottom: spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm, // Add spacing between timeline cards
  },
  timelineLine: {
    alignItems: 'center',
    width: 24,
    position: 'relative',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    marginTop: 34, // 16px (card padding) + 18px (half of 36px icon) = 34px to center with icon
    zIndex: 2,
  },
  timelineConnector: {
    position: 'absolute',
    width: 2,
    top: 46, // 34px (dot position) + 12px (dot height) = 46px - start right after dot
    bottom: -(spacing.sm + 34 + 6), // Extend through gap to next dot center: -(8px gap + 34px next dot position + 6px to dot center)
    left: 11, // Center the 2px line in 24px width: (24-2)/2 = 11px
    backgroundColor: colors.border.light,
  },
  activityCard: {
    padding: spacing.md,
    flex: 1,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  activityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: spacing.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    ...typography.styles.body,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontWeight: typography.fontWeight.medium,
  },
  editButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
  },
  timelineCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  emptyTimeline: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyTimelineText: {
    ...typography.styles.body,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Pending Items Card
  pendingCard: {
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  pendingTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    flex: 1,
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  pendingItemText: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
  },

  // Quick Actions
  quickActionsSection: {
    marginBottom: spacing.md,
  },
  quickActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: spacing.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  quickActionText: {
    ...typography.styles.body,
    color: colors.text.primary,
    flex: 1,
    fontWeight: typography.fontWeight.medium,
  },

  // Dev button
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accent + '20',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: spacing.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    marginTop: spacing.md,
  },
  devButtonText: {
    ...typography.styles.button,
    color: colors.accent,
    fontSize: typography.fontSize.sm,
  },

  // DSR Reports Button
  dsrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: spacing.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  dsrButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  dsrButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  dsrBadgeContainer: {
    marginLeft: spacing.xs,
  },
});
