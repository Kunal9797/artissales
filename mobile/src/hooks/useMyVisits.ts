/**
 * useMyVisits Hook
 *
 * Fetches and caches the current user's visit history for account sorting.
 * Used by sales reps to sort accounts by "my recent visits" in SelectAccountScreen.
 *
 * Features:
 * - Queries Firestore for user's visits (last 100 visits)
 * - Caches in AsyncStorage for offline support
 * - Returns a map of accountId → lastVisitAt for efficient lookup
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import { getAuth } from '@react-native-firebase/auth';
import { logger } from '../utils/logger';

const CACHE_KEY = '@my_recent_visits';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface MyVisitRecord {
  accountId: string;
  accountName: string;
  timestamp: Date;
}

interface CachedData {
  visits: Array<{
    accountId: string;
    accountName: string;
    timestamp: string; // ISO string for serialization
  }>;
  cachedAt: number;
  userId: string;
}

export interface UseMyVisitsResult {
  /** Map of accountId → most recent visit timestamp (for sorting) */
  visitMap: Map<string, number>;
  /** Raw visit records */
  visits: MyVisitRecord[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh visits from Firestore */
  refresh: () => Promise<void>;
  /** Whether data is from cache (offline mode) */
  isFromCache: boolean;
}

export function useMyVisits(): UseMyVisitsResult {
  const [visits, setVisits] = useState<MyVisitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Get current user ID
  const auth = getAuth();
  const userId = auth.currentUser?.uid;

  // Load cached data
  const loadFromCache = useCallback(async (): Promise<MyVisitRecord[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const data: CachedData = JSON.parse(cached);

      // Check if cache is for current user
      if (data.userId !== userId) {
        logger.debug('useMyVisits', 'Cache is for different user, ignoring');
        return null;
      }

      // Check if cache is expired
      const now = Date.now();
      if (now - data.cachedAt > CACHE_TTL_MS) {
        logger.debug('useMyVisits', 'Cache expired');
        return null;
      }

      // Convert ISO strings back to Date objects
      return data.visits.map(v => ({
        accountId: v.accountId,
        accountName: v.accountName,
        timestamp: new Date(v.timestamp),
      }));
    } catch (err) {
      logger.warn('useMyVisits', 'Failed to load from cache:', err);
      return null;
    }
  }, [userId]);

  // Save to cache
  const saveToCache = useCallback(async (visitsData: MyVisitRecord[]) => {
    if (!userId) return;

    try {
      const cacheData: CachedData = {
        visits: visitsData.map(v => ({
          accountId: v.accountId,
          accountName: v.accountName,
          timestamp: v.timestamp.toISOString(),
        })),
        cachedAt: Date.now(),
        userId,
      };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      logger.debug('useMyVisits', `Cached ${visitsData.length} visits`);
    } catch (err) {
      logger.warn('useMyVisits', 'Failed to save to cache:', err);
    }
  }, [userId]);

  // Fetch visits from Firestore
  const fetchVisits = useCallback(async () => {
    if (!userId) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Query user's visits, ordered by timestamp (newest first), limit 100
      const snapshot = await firestore()
        .collection('visits')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();

      const visitsData: MyVisitRecord[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          accountId: data.accountId,
          accountName: data.accountName || 'Unknown',
          timestamp: data.timestamp?.toDate() || new Date(),
        };
      });

      setVisits(visitsData);
      setIsFromCache(false);

      // Cache the results
      await saveToCache(visitsData);

      logger.info('useMyVisits', `Fetched ${visitsData.length} visits for user`);
    } catch (err: any) {
      logger.error('useMyVisits', 'Failed to fetch visits:', err);

      // Try to load from cache on error (offline fallback)
      const cached = await loadFromCache();
      if (cached) {
        setVisits(cached);
        setIsFromCache(true);
        setError(null); // Clear error since we have cached data
        logger.info('useMyVisits', 'Using cached visits (offline mode)');
      } else {
        setError('Failed to load visits');
      }
    } finally {
      setLoading(false);
    }
  }, [userId, loadFromCache, saveToCache]);

  // Initial load - try cache first for instant display, then refresh from server
  useEffect(() => {
    const init = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      // Try to load from cache first for instant display
      const cached = await loadFromCache();
      if (cached) {
        setVisits(cached);
        setIsFromCache(true);
        setLoading(false);
        logger.debug('useMyVisits', 'Loaded from cache, will refresh in background');

        // Refresh in background (don't await)
        fetchVisits();
      } else {
        // No cache, fetch from server
        await fetchVisits();
      }
    };

    init();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build visit map for efficient lookup (accountId → timestamp in ms)
  const visitMap = useMemo(() => {
    const map = new Map<string, number>();

    // For each account, keep only the most recent visit timestamp
    visits.forEach(visit => {
      const existingTime = map.get(visit.accountId);
      const visitTime = visit.timestamp.getTime();

      if (!existingTime || visitTime > existingTime) {
        map.set(visit.accountId, visitTime);
      }
    });

    return map;
  }, [visits]);

  return {
    visitMap,
    visits,
    loading,
    error,
    refresh: fetchVisits,
    isFromCache,
  };
}

/**
 * Invalidate the visits cache
 * Call this after logging a new visit to ensure fresh data on next screen open
 */
export async function invalidateMyVisitsCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
    logger.debug('useMyVisits', 'Cache invalidated');
  } catch (err) {
    logger.warn('useMyVisits', 'Failed to invalidate cache:', err);
  }
}
