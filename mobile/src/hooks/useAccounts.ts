import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import { isOnline, isNetworkError, OFFLINE_LOAD_MESSAGE } from '../services/network';
import { logger } from '../utils/logger';

const ACCOUNTS_CACHE_KEY = '@cached_accounts';

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
  lastVisitAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to serialize accounts for caching (convert Date to ISO string)
const serializeAccounts = (accounts: Account[]): string => {
  return JSON.stringify(accounts.map(account => ({
    ...account,
    lastVisitAt: account.lastVisitAt?.toISOString(),
    createdAt: account.createdAt?.toISOString(),
    updatedAt: account.updatedAt?.toISOString(),
  })));
};

// Helper to deserialize accounts from cache (convert ISO string to Date)
const deserializeAccounts = (json: string): Account[] => {
  const accounts = JSON.parse(json);
  return accounts.map((account: any) => ({
    ...account,
    lastVisitAt: account.lastVisitAt ? new Date(account.lastVisitAt) : undefined,
    createdAt: account.createdAt ? new Date(account.createdAt) : new Date(),
    updatedAt: account.updatedAt ? new Date(account.updatedAt) : new Date(),
  }));
};

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshAccounts = () => {
    setRefreshTrigger(prev => prev + 1);
  };

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
  const saveAccountsToCache = async (accounts: Account[]) => {
    try {
      await AsyncStorage.setItem(ACCOUNTS_CACHE_KEY, serializeAccounts(accounts));
    } catch (err) {
      logger.warn('[useAccounts] Error caching accounts:', err);
    }
  };

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        setLoading(true);
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
            setError(null); // Clear error since we have cached data
          } else {
            setError(OFFLINE_LOAD_MESSAGE);
            setIsOffline(true);
          }
          setLoading(false);
          return;
        }

        // We're online - fetch from API
        const response = await api.getAccountsList({});

        // Convert ISO strings back to Date objects (handle missing dates)
        const accountsWithDates = response.accounts.map((account: any) => ({
          ...account,
          lastVisitAt: account.lastVisitAt ? new Date(account.lastVisitAt) : undefined,
          createdAt: account.createdAt ? new Date(account.createdAt) : new Date(),
          updatedAt: account.updatedAt ? new Date(account.updatedAt) : new Date(),
        }));

        setAccounts(accountsWithDates);
        setLoading(false);
        setError(null);
        setIsOffline(false);

        // Cache the accounts for offline use
        await saveAccountsToCache(accountsWithDates);
      } catch (err: any) {
        console.error('Accounts fetch error:', err);

        // Check if it's a network error
        if (isNetworkError(err)) {
          // Try to load from cache
          const cachedAccounts = await loadCachedAccounts();
          if (cachedAccounts && cachedAccounts.length > 0) {
            setAccounts(cachedAccounts);
            setIsOffline(true);
            setError(null); // Clear error since we have cached data
          } else {
            setError(OFFLINE_LOAD_MESSAGE);
            setIsOffline(true);
          }
        } else {
          setError(err.message || 'Failed to fetch accounts');
        }
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [refreshTrigger]);

  return { accounts, loading, error, isOffline, refreshAccounts };
};
