import { useState, useEffect, useCallback, useRef } from 'react';
import { getAuth } from '@react-native-firebase/auth';
import { accountsCache, CachedAccount } from '../services/accountsCache';
import { getNetworkState } from '../services/network';
import { logger } from '../utils/logger';
import { AccountType } from '../types';

const PAGE_SIZE = 50;

export interface Account {
  id: string;
  name: string;
  type: 'distributor' | 'dealer' | 'architect' | 'OEM';
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city: string;
  state: string;
  pincode: string;
  territory: string;
  assignedRepUserId: string;
  parentDistributorId?: string;
  createdByUserId: string;
  status: 'active' | 'inactive';
  lastVisitAt?: string;
  createdAt?: string;
  updatedAt?: string;
  // Local sync status (for offline-first)
  _syncStatus?: 'synced' | 'pending' | 'failed';
  _createdLocally?: boolean;
  _localCreatedAt?: number;
  _syncError?: string;
}

export interface UseAccountsOptions {
  type?: AccountType;
  createdBy?: 'mine' | 'all';  // Filter by creator
  sortBy?: 'name' | 'lastVisitAt';
  sortDir?: 'asc' | 'desc';
}

export interface UseAccountsReturn {
  accounts: Account[];
  loading: boolean;          // True during initial cache load
  syncing: boolean;          // True during background server sync
  loadingMore: boolean;      // True during pagination load
  error: string | null;
  isOffline: boolean;
  isStale: boolean;          // True if cache > 30 min old
  hasPendingCreations: boolean;
  hasMore: boolean;
  refreshAccounts: () => Promise<void>;
  loadMore: () => void;
}

export const useAccounts = (options: UseAccountsOptions = {}): UseAccountsReturn => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [hasPendingCreations, setHasPendingCreations] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Track options to detect changes
  const prevOptionsRef = useRef<UseAccountsOptions>(options);

  // Apply filters to accounts
  const applyFilters = useCallback((allAccounts: CachedAccount[]): Account[] => {
    let filtered = allAccounts;

    // Filter by type
    if (options.type) {
      filtered = filtered.filter(acc => acc.type === options.type);
    }

    // Filter by creator
    if (options.createdBy === 'mine') {
      const auth = getAuth();
      const userId = auth.currentUser?.uid;
      filtered = filtered.filter(acc =>
        acc.createdByUserId === userId || acc._createdLocally
      );
    }

    // Sort
    const sortBy = options.sortBy || 'name';
    const sortDir = options.sortDir || 'asc';
    const multiplier = sortDir === 'asc' ? 1 : -1;

    filtered = [...filtered].sort((a, b) => {
      // Pending accounts always first
      if (a._syncStatus !== 'synced' && b._syncStatus === 'synced') return -1;
      if (a._syncStatus === 'synced' && b._syncStatus !== 'synced') return 1;

      if (sortBy === 'lastVisitAt') {
        const aTime = a.lastVisitAt ? new Date(a.lastVisitAt).getTime() : 0;
        const bTime = b.lastVisitAt ? new Date(b.lastVisitAt).getTime() : 0;
        return (bTime - aTime) * multiplier;
      }

      return a.name.localeCompare(b.name) * multiplier;
    });

    return filtered;
  }, [options.type, options.createdBy, options.sortBy, options.sortDir]);

  // Initialize cache and load accounts
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize cache (loads from AsyncStorage)
        await accountsCache.init();

        // Get cached accounts immediately (instant!)
        const cachedAccounts = accountsCache.getAccounts();
        setAccounts(applyFilters(cachedAccounts));
        setIsStale(accountsCache.isStale());
        setHasPendingCreations(accountsCache.hasPendingCreations());
        setLoading(false);

        logger.log(`[useAccounts] Loaded ${cachedAccounts.length} accounts from cache`);

        // Subscribe to cache updates
        unsubscribe = accountsCache.subscribe((updatedAccounts) => {
          setAccounts(applyFilters(updatedAccounts));
          setHasPendingCreations(accountsCache.hasPendingCreations());
          setIsStale(accountsCache.isStale());
        });

        // Sync with server in background (non-blocking)
        syncInBackground();

      } catch (err: any) {
        logger.error('[useAccounts] Init error:', err);
        setError(err.message || 'Failed to load accounts');
        setLoading(false);
      }
    };

    init();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [applyFilters]);

  // Re-apply filters when options change
  useEffect(() => {
    const optionsChanged =
      prevOptionsRef.current.type !== options.type ||
      prevOptionsRef.current.createdBy !== options.createdBy ||
      prevOptionsRef.current.sortBy !== options.sortBy ||
      prevOptionsRef.current.sortDir !== options.sortDir;

    if (optionsChanged) {
      prevOptionsRef.current = options;
      // Re-apply filters to cached accounts
      const cachedAccounts = accountsCache.getAccounts();
      setAccounts(applyFilters(cachedAccounts));
    }
  }, [options.type, options.createdBy, options.sortBy, options.sortDir, applyFilters]);

  // Background sync with server
  const syncInBackground = useCallback(async () => {
    setSyncing(true);

    try {
      const success = await accountsCache.syncWithServer();

      if (success) {
        setIsStale(false);
        setError(null);
        setIsOffline(false);
      } else {
        // Only set offline if actually no network connection
        const networkState = await getNetworkState();
        setIsOffline(!networkState.isConnected);
      }
    } catch (err: any) {
      logger.error('[useAccounts] Sync error:', err);
      // Check actual network state before flagging as offline
      const networkState = await getNetworkState();
      setIsOffline(!networkState.isConnected);
    } finally {
      setSyncing(false);
    }
  }, []);

  // Refresh function (pull-to-refresh)
  const refreshAccounts = useCallback(async () => {
    await syncInBackground();
  }, [syncInBackground]);

  // Load more function (pagination - not needed with cache-first, but kept for compatibility)
  const loadMore = useCallback(() => {
    // With cache-first pattern, all accounts are loaded at once
    // This is a no-op but kept for API compatibility
    logger.log('[useAccounts] loadMore called (no-op in cache-first mode)');
  }, []);

  return {
    accounts,
    loading,
    syncing,
    loadingMore,
    error,
    isOffline,
    isStale,
    hasPendingCreations,
    hasMore,
    refreshAccounts,
    loadMore,
  };
};

// Re-export types and cache service for convenience
export type { CachedAccount } from '../services/accountsCache';
export { accountsCache } from '../services/accountsCache';
