/**
 * Accounts Cache Service
 * Provides offline-first caching for accounts with instant loading
 *
 * Architecture:
 * - Stores accounts in AsyncStorage with user ID scoping
 * - Provides instant access to cached accounts (< 100ms)
 * - Syncs with server in background
 * - Tracks pending local creations
 * - Merges local + server data seamlessly
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth } from '@react-native-firebase/auth';
import { api } from './api';
import { isOnline } from './network';
import { logger } from '../utils/logger';
import { Account } from '../hooks/useAccounts';

// Optional: NetInfo for network detection
let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  logger.warn('[AccountsCache] NetInfo not available');
}

// Storage keys
const CACHE_KEY = '@accounts_cache_v2';
const METADATA_KEY = '@accounts_cache_metadata';
const PENDING_KEY = '@accounts_pending_creations';

// Cache staleness threshold (30 minutes)
const STALE_THRESHOLD_MS = 30 * 60 * 1000;

// Sync interval when app is active (5 minutes)
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

export interface CachedAccount extends Account {
  _localId?: string;           // Temporary ID before server assigns real ID
  _syncStatus: 'synced' | 'pending' | 'failed';
  _createdLocally: boolean;    // True if created offline
  _localCreatedAt?: number;    // Local timestamp for sorting
  _syncError?: string;         // Error message if sync failed
}

interface CacheMetadata {
  userId: string;
  lastSyncedAt: number | null;
  version: number;
}

interface PendingCreation {
  localId: string;
  accountData: CreateAccountData;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  createdAt: number;
  error?: string;
}

interface CreateAccountData {
  name: string;
  type: 'distributor' | 'dealer' | 'architect' | 'OEM';
  contactPerson?: string;
  phone: string;  // Required - 10 digits
  email?: string;
  birthdate?: string;
  city: string;
  state: string;
  pincode: string;
  address?: string;
  parentDistributorId?: string;
}

type CacheListener = (accounts: CachedAccount[]) => void;

class AccountsCacheService {
  private cache: Map<string, CachedAccount> = new Map();
  private pendingCreations: Map<string, PendingCreation> = new Map();
  private metadata: CacheMetadata | null = null;
  private listeners: Set<CacheListener> = new Set();
  private isInitialized = false;
  private isSyncing = false;
  private syncIntervalId: NodeJS.Timeout | null = null;

  /**
   * Initialize the cache for the current user
   * Call this on app start or user login
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    const auth = getAuth();
    const userId = auth.currentUser?.uid;

    if (!userId) {
      logger.warn('[AccountsCache] No user logged in, skipping init');
      return;
    }

    try {
      // Load metadata first to check if cache belongs to current user
      const metadataJson = await AsyncStorage.getItem(METADATA_KEY);
      if (metadataJson) {
        this.metadata = JSON.parse(metadataJson);

        // If cache belongs to different user, clear it
        if (this.metadata?.userId !== userId) {
          logger.log('[AccountsCache] User changed, clearing cache');
          await this.clearCache();
          this.metadata = { userId, lastSyncedAt: null, version: 1 };
        }
      } else {
        this.metadata = { userId, lastSyncedAt: null, version: 1 };
      }

      // Load cached accounts
      const cacheJson = await AsyncStorage.getItem(CACHE_KEY);
      if (cacheJson) {
        const accounts: CachedAccount[] = JSON.parse(cacheJson);
        accounts.forEach(acc => this.cache.set(acc.id, acc));
        logger.log(`[AccountsCache] Loaded ${accounts.length} accounts from cache`);
      }

      // Load pending creations
      const pendingJson = await AsyncStorage.getItem(PENDING_KEY);
      if (pendingJson) {
        const pending: PendingCreation[] = JSON.parse(pendingJson);
        pending.forEach(p => this.pendingCreations.set(p.localId, p));
        logger.log(`[AccountsCache] Loaded ${pending.length} pending creations`);
      }

      this.isInitialized = true;

      // Set up network listener for auto-sync
      if (NetInfo) {
        NetInfo.addEventListener((state: any) => {
          if (state.isConnected && this.hasPendingCreations()) {
            logger.log('[AccountsCache] Network connected, syncing pending creations...');
            this.syncPendingCreations();
          }
        });
      }

      // Start periodic sync
      this.startPeriodicSync();

    } catch (err) {
      logger.error('[AccountsCache] Error initializing:', err);
      // Reset on error
      this.cache.clear();
      this.pendingCreations.clear();
      this.metadata = { userId, lastSyncedAt: null, version: 1 };
    }
  }

  /**
   * Get all cached accounts (instant, from memory)
   * Includes both synced and pending local accounts
   */
  getAccounts(): CachedAccount[] {
    const accounts = Array.from(this.cache.values());

    // Add pending creations as CachedAccounts
    for (const pending of this.pendingCreations.values()) {
      // Check if already in cache (might have synced)
      if (!this.cache.has(pending.localId)) {
        const auth = getAuth();
        const userId = auth.currentUser?.uid || '';

        accounts.push({
          id: pending.localId,
          ...pending.accountData,
          territory: '',
          assignedRepUserId: userId,
          createdByUserId: userId,
          status: 'active',
          _localId: pending.localId,
          _syncStatus: pending.status === 'failed' ? 'failed' : 'pending',
          _createdLocally: true,
          _localCreatedAt: pending.createdAt,
          _syncError: pending.error,
        });
      }
    }

    // Sort: pending first (by localCreatedAt desc), then synced (by name)
    return accounts.sort((a, b) => {
      // Pending/failed accounts first
      if (a._syncStatus !== 'synced' && b._syncStatus === 'synced') return -1;
      if (a._syncStatus === 'synced' && b._syncStatus !== 'synced') return 1;

      // Among pending, sort by creation time (newest first)
      if (a._syncStatus !== 'synced' && b._syncStatus !== 'synced') {
        return (b._localCreatedAt || 0) - (a._localCreatedAt || 0);
      }

      // Among synced, sort by name
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get account by ID (works for both synced and pending)
   */
  getAccountById(id: string): CachedAccount | null {
    // Check main cache first
    if (this.cache.has(id)) {
      return this.cache.get(id)!;
    }

    // Check pending creations
    const pending = this.pendingCreations.get(id);
    if (pending) {
      const auth = getAuth();
      const userId = auth.currentUser?.uid || '';

      return {
        id: pending.localId,
        ...pending.accountData,
        territory: '',
        assignedRepUserId: userId,
        createdByUserId: userId,
        status: 'active',
        _localId: pending.localId,
        _syncStatus: pending.status === 'failed' ? 'failed' : 'pending',
        _createdLocally: true,
        _localCreatedAt: pending.createdAt,
      };
    }

    return null;
  }

  /**
   * Add account locally (instant, for offline-first creation)
   * Returns a local ID that can be used immediately
   */
  addAccountLocally(accountData: CreateAccountData): string {
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const pending: PendingCreation = {
      localId,
      accountData,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
    };

    this.pendingCreations.set(localId, pending);
    this.savePendingCreations();
    this.notifyListeners();

    logger.log(`[AccountsCache] Added local account: ${localId} (${accountData.name})`);

    // Try to sync immediately
    this.syncPendingCreations();

    return localId;
  }

  /**
   * Sync with server (fetches latest accounts)
   * Returns true if sync was successful
   */
  async syncWithServer(): Promise<boolean> {
    if (this.isSyncing) {
      logger.log('[AccountsCache] Already syncing, skipping');
      return false;
    }

    const online = await isOnline();
    if (!online) {
      logger.log('[AccountsCache] Offline, skipping sync');
      return false;
    }

    this.isSyncing = true;

    try {
      logger.log('[AccountsCache] Starting server sync...');

      // First sync pending creations
      await this.syncPendingCreations();

      // Then fetch all accounts from server
      const response = await api.getAccountsList({
        limit: 500,  // Get all accounts in one request
        sortBy: 'name',
        sortDir: 'asc',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch accounts from server');
      }

      const serverAccounts = response.accounts as Account[];

      // Update cache with server data
      const newCache = new Map<string, CachedAccount>();
      for (const acc of serverAccounts) {
        newCache.set(acc.id, {
          ...acc,
          _syncStatus: 'synced',
          _createdLocally: false,
        });
      }

      this.cache = newCache;

      // Update metadata
      this.metadata = {
        ...this.metadata!,
        lastSyncedAt: Date.now(),
      };

      // Persist to storage
      await this.saveCache();
      await this.saveMetadata();

      logger.log(`[AccountsCache] Synced ${serverAccounts.length} accounts from server`);

      this.notifyListeners();
      return true;

    } catch (err) {
      logger.error('[AccountsCache] Sync error:', err);
      return false;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync pending local creations to server
   */
  async syncPendingCreations(): Promise<void> {
    const online = await isOnline();
    if (!online) return;

    const pending = Array.from(this.pendingCreations.values())
      .filter(p => p.status === 'pending');

    if (pending.length === 0) return;

    logger.log(`[AccountsCache] Syncing ${pending.length} pending creations...`);

    for (const item of pending) {
      try {
        // Update status to syncing
        item.status = 'syncing';
        this.pendingCreations.set(item.localId, item);
        this.notifyListeners();

        // Call API to create account
        const response = await api.createAccount(item.accountData);

        if (response.ok) {
          logger.log(`[AccountsCache] Created account on server: ${item.localId} -> ${response.accountId}`);

          // Remove from pending
          this.pendingCreations.delete(item.localId);

          // Add to cache with server ID
          // Note: The full account will be fetched on next sync
          // For now, we'll let the next syncWithServer() pick it up

        } else {
          throw new Error(response.error || 'Failed to create account');
        }

      } catch (err: any) {
        logger.error(`[AccountsCache] Failed to sync ${item.localId}:`, err);

        item.retryCount++;
        item.error = err.message;

        if (item.retryCount >= 3) {
          item.status = 'failed';
        } else {
          item.status = 'pending';
        }

        this.pendingCreations.set(item.localId, item);
      }
    }

    await this.savePendingCreations();
    this.notifyListeners();
  }

  /**
   * Retry a failed creation
   */
  async retryFailed(localId: string): Promise<void> {
    const pending = this.pendingCreations.get(localId);
    if (pending && pending.status === 'failed') {
      pending.status = 'pending';
      pending.retryCount = 0;
      pending.error = undefined;
      this.pendingCreations.set(localId, pending);
      await this.savePendingCreations();
      this.notifyListeners();

      // Try to sync
      this.syncPendingCreations();
    }
  }

  /**
   * Remove a failed creation from the queue
   */
  async removeFailed(localId: string): Promise<void> {
    if (this.pendingCreations.has(localId)) {
      this.pendingCreations.delete(localId);
      await this.savePendingCreations();
      this.notifyListeners();
    }
  }

  /**
   * Subscribe to cache updates
   */
  subscribe(listener: CacheListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Check if cache is stale (needs refresh)
   */
  isStale(): boolean {
    if (!this.metadata?.lastSyncedAt) return true;
    return Date.now() - this.metadata.lastSyncedAt > STALE_THRESHOLD_MS;
  }

  /**
   * Check if there are pending creations
   */
  hasPendingCreations(): boolean {
    return Array.from(this.pendingCreations.values())
      .some(p => p.status === 'pending' || p.status === 'syncing');
  }

  /**
   * Get count of failed creations
   */
  getFailedCount(): number {
    return Array.from(this.pendingCreations.values())
      .filter(p => p.status === 'failed').length;
  }

  /**
   * Get last sync time
   */
  getLastSyncedAt(): number | null {
    return this.metadata?.lastSyncedAt || null;
  }

  /**
   * Clear cache (on logout)
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    this.pendingCreations.clear();
    this.metadata = null;
    this.isInitialized = false;

    await AsyncStorage.multiRemove([CACHE_KEY, METADATA_KEY, PENDING_KEY]);

    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }

    logger.log('[AccountsCache] Cache cleared');
  }

  // Private methods

  private async saveCache(): Promise<void> {
    const accounts = Array.from(this.cache.values());
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(accounts));
  }

  private async saveMetadata(): Promise<void> {
    if (this.metadata) {
      await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(this.metadata));
    }
  }

  private async savePendingCreations(): Promise<void> {
    const pending = Array.from(this.pendingCreations.values());
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  }

  private notifyListeners(): void {
    const accounts = this.getAccounts();
    this.listeners.forEach(listener => {
      try {
        listener(accounts);
      } catch (err) {
        logger.error('[AccountsCache] Error in listener:', err);
      }
    });
  }

  private startPeriodicSync(): void {
    // Clear any existing interval
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
    }

    // Sync every 5 minutes
    this.syncIntervalId = setInterval(() => {
      if (this.isStale()) {
        logger.log('[AccountsCache] Cache stale, syncing...');
        this.syncWithServer();
      }
    }, SYNC_INTERVAL_MS);
  }
}

// Export singleton instance
export const accountsCache = new AccountsCacheService();
