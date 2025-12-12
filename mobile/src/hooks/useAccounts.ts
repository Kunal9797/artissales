import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { isOnline, isNetworkError, OFFLINE_LOAD_MESSAGE } from '../services/network';
import { logger } from '../utils/logger';
import { AccountType } from '../types';

const ACCOUNTS_CACHE_KEY = '@cached_accounts';
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
}

export interface UseAccountsOptions {
  type?: AccountType;
  createdBy?: 'mine' | 'all';  // Filter by creator
  sortBy?: 'name' | 'lastVisitAt';
  sortDir?: 'asc' | 'desc';
}

export interface UseAccountsReturn {
  accounts: Account[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  isOffline: boolean;
  hasMore: boolean;
  refreshAccounts: () => void;
  loadMore: () => void;
}

// Helper to serialize accounts for caching
const serializeAccounts = (accounts: Account[]): string => {
  return JSON.stringify(accounts);
};

// Helper to deserialize accounts from cache
const deserializeAccounts = (json: string): Account[] => {
  return JSON.parse(json);
};

export const useAccounts = (options: UseAccountsOptions = {}): UseAccountsReturn => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Track pagination cursor
  const cursorRef = useRef<string | undefined>(undefined);

  // Track options to detect changes
  const prevOptionsRef = useRef<UseAccountsOptions>(options);

  // Load cached accounts from storage
  const loadCachedAccounts = async (): Promise<Account[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(ACCOUNTS_CACHE_KEY);
      if (cached) {
        return deserializeAccounts(cached);
      }
    } catch (err) {
      logger.warn('[useAccounts] Error loading cached accounts:', err);
    }
    return null;
  };

  // Save accounts to cache
  const saveAccountsToCache = async (accountsToCache: Account[]) => {
    try {
      await AsyncStorage.setItem(ACCOUNTS_CACHE_KEY, serializeAccounts(accountsToCache));
    } catch (err) {
      logger.warn('[useAccounts] Error caching accounts:', err);
    }
  };

  // Main fetch function
  const fetchAccounts = useCallback(async (isRefresh = false, isLoadMore = false) => {
    try {
      // Set appropriate loading state
      if (isRefresh) {
        setLoading(true);
        cursorRef.current = undefined;
      } else if (isLoadMore) {
        if (!hasMore || loadingMore) return;
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      setError(null);
      setIsOffline(false);

      // Check if we're online
      const online = await isOnline();

      if (!online) {
        // We're offline - try to load from cache
        logger.log('[useAccounts] Offline, loading from cache');
        const cachedAccounts = await loadCachedAccounts();
        if (cachedAccounts && cachedAccounts.length > 0) {
          setAccounts(cachedAccounts);
          setIsOffline(true);
          setHasMore(false);
          setError(null);
        } else {
          setError(OFFLINE_LOAD_MESSAGE);
          setIsOffline(true);
        }
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      // We're online - fetch from API
      const response = await api.getAccountsList({
        type: options.type,
        createdBy: options.createdBy,
        limit: PAGE_SIZE,
        startAfter: isLoadMore ? cursorRef.current : undefined,
        sortBy: options.sortBy || 'name',
        sortDir: options.sortDir || 'asc',
      });

      if (response.ok) {
        const newAccounts = response.accounts as Account[];

        if (isLoadMore) {
          // Append to existing accounts
          setAccounts(prev => [...prev, ...newAccounts]);
        } else {
          // Replace accounts
          setAccounts(newAccounts);
          // Cache first page for offline use
          await saveAccountsToCache(newAccounts);
        }

        // Update pagination state
        setHasMore(response.pagination?.hasMore ?? false);
        cursorRef.current = response.pagination?.nextCursor;
      } else {
        setError('Failed to load accounts');
      }
    } catch (err: any) {
      logger.error('[useAccounts] Error fetching accounts:', err);

      // Check if it's a network error
      if (isNetworkError(err)) {
        // Try to load from cache
        if (!isLoadMore) {
          const cachedAccounts = await loadCachedAccounts();
          if (cachedAccounts && cachedAccounts.length > 0) {
            setAccounts(cachedAccounts);
            setIsOffline(true);
            setHasMore(false);
            setError(null);
          } else {
            setError(OFFLINE_LOAD_MESSAGE);
            setIsOffline(true);
          }
        }
      } else {
        setError(err.message || 'Failed to fetch accounts');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [options.type, options.createdBy, options.sortBy, options.sortDir, hasMore, loadingMore]);

  // Initial fetch and refetch when options change
  useEffect(() => {
    const optionsChanged =
      prevOptionsRef.current.type !== options.type ||
      prevOptionsRef.current.createdBy !== options.createdBy ||
      prevOptionsRef.current.sortBy !== options.sortBy ||
      prevOptionsRef.current.sortDir !== options.sortDir;

    if (optionsChanged) {
      prevOptionsRef.current = options;
      // Reset state when options change
      setAccounts([]);
      setHasMore(true);
      cursorRef.current = undefined;
    }

    fetchAccounts(true);
  }, [options.type, options.createdBy, options.sortBy, options.sortDir]);

  // Refresh function (pull-to-refresh)
  const refreshAccounts = useCallback(() => {
    setAccounts([]);
    setHasMore(true);
    cursorRef.current = undefined;
    fetchAccounts(true);
  }, [fetchAccounts]);

  // Load more function (infinite scroll)
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchAccounts(false, true);
    }
  }, [fetchAccounts, loadingMore, hasMore, loading]);

  return {
    accounts,
    loading,
    loadingMore,
    error,
    isOffline,
    hasMore,
    refreshAccounts,
    loadMore,
  };
};
