/**
 * Data Queue Service
 * Manages offline queue for sheets and expenses submissions
 *
 * Architecture:
 * - Stores pending data submissions in AsyncStorage
 * - Processes queue automatically when online
 * - Retries failed submissions with exponential backoff
 * - Emits events for UI updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './api';
import { uploadPhoto } from './storage';
import { isOnline } from './network';
import { logger } from '../utils/logger';
import { targetCache } from './targetCache';
import { LogSheetsSaleRequest, SubmitExpenseRequest } from '../types';

// Callback for when sync completes (set by HomeScreen to avoid circular dependency)
let onSyncCompleteCallback: (() => void) | null = null;

export const setOnSyncComplete = (callback: () => void) => {
  onSyncCompleteCallback = callback;
};

// Optional: NetInfo for network detection
let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  logger.warn('[DataQueue] NetInfo not available - offline detection disabled');
}

const QUEUE_KEY = '@data_queue';
const MAX_RETRIES = 3;

export type DataQueueItemType = 'sheet' | 'expense';

export interface DataQueueItem {
  id: string;
  type: DataQueueItemType;
  data: LogSheetsSaleRequest | SubmitExpenseRequest;
  localPhotoUri?: string;  // For expenses with receipt photo
  uploadedPhotoUrl?: string;  // After photo upload
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
  createdAt: number;
  userId: string;  // For display purposes
}

type QueueListener = (queue: DataQueueItem[]) => void;

// Generate unique local ID
function generateLocalId(type: DataQueueItemType): string {
  return `local_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

class DataQueueService {
  private queue: DataQueueItem[] = [];
  private listeners: QueueListener[] = [];
  private isProcessing = false;
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;

    // Load queue from storage
    await this.loadQueue();
    this.isInitialized = true;

    // Start processing queue
    this.startProcessing();

    // Listen for network changes (if NetInfo is available)
    if (NetInfo) {
      NetInfo.addEventListener((state: any) => {
        if (state.isConnected) {
          logger.log('[DataQueue] Network connected, processing queue...');
          this.processQueue();
        }
      });
    }
  }

  /**
   * Add sheet sale to offline queue
   */
  async addSheet(data: LogSheetsSaleRequest, userId: string): Promise<string> {
    await this.init();

    const queueItem: DataQueueItem = {
      id: generateLocalId('sheet'),
      type: 'sheet',
      data,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
      userId,
    };

    this.queue.push(queueItem);
    await this.saveQueue();
    this.notifyListeners();

    logger.log(`[DataQueue] Added sheet to queue: ${queueItem.id}`);

    // Try to process immediately if online
    this.processQueue();

    return queueItem.id;
  }

  /**
   * Add expense to offline queue
   */
  async addExpense(
    data: SubmitExpenseRequest,
    userId: string,
    localPhotoUri?: string
  ): Promise<string> {
    await this.init();

    const queueItem: DataQueueItem = {
      id: generateLocalId('expense'),
      type: 'expense',
      data,
      localPhotoUri,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
      userId,
    };

    this.queue.push(queueItem);
    await this.saveQueue();
    this.notifyListeners();

    logger.log(`[DataQueue] Added expense to queue: ${queueItem.id}`);

    // Try to process immediately if online
    this.processQueue();

    return queueItem.id;
  }

  /**
   * Get all queue items
   */
  getQueue(): DataQueueItem[] {
    return [...this.queue];
  }

  /**
   * Get pending count (pending + syncing)
   */
  getPendingCount(): number {
    return this.queue.filter(
      item => item.status === 'pending' || item.status === 'syncing'
    ).length;
  }

  /**
   * Get failed count
   */
  getFailedCount(): number {
    return this.queue.filter(item => item.status === 'failed').length;
  }

  /**
   * Check if an item with given local ID exists and is pending sync
   */
  isPendingSync(localId: string): boolean {
    return this.queue.some(
      item => item.id === localId && (item.status === 'pending' || item.status === 'syncing')
    );
  }

  /**
   * Subscribe to queue changes
   */
  subscribe(listener: QueueListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Process the queue
   */
  private async processQueue() {
    if (this.isProcessing) return;

    // Check network status
    const online = await isOnline();
    if (!online) {
      logger.log('[DataQueue] Offline, skipping queue processing');
      return;
    }

    this.isProcessing = true;

    const pendingItems = this.queue.filter(item => item.status === 'pending');

    for (const item of pendingItems) {
      try {
        await this.processItem(item);
      } catch (error) {
        logger.error(`[DataQueue] Error processing item ${item.id}:`, error);
      }
    }

    this.isProcessing = false;

    // If there are still pending items, schedule retry
    if (this.getPendingCount() > 0) {
      setTimeout(() => this.processQueue(), 30000); // Retry in 30s
    }
  }

  /**
   * Process single queue item
   */
  private async processItem(item: DataQueueItem) {
    logger.log(`[DataQueue] Processing ${item.type}: ${item.id}`);

    // Update status to syncing
    item.status = 'syncing';
    await this.saveQueue();
    this.notifyListeners();

    try {
      if (item.type === 'sheet') {
        // Submit sheet sale
        await api.logSheetsSale(item.data as LogSheetsSaleRequest);
        logger.log(`[DataQueue] Sheet synced successfully: ${item.id}`);

        // Invalidate target cache
        const sheetData = item.data as LogSheetsSaleRequest;
        const month = sheetData.date.substring(0, 7); // YYYY-MM
        targetCache.invalidate(item.userId, month);

      } else if (item.type === 'expense') {
        const expenseData = item.data as SubmitExpenseRequest;

        // If there's a local photo that needs uploading
        if (item.localPhotoUri && !item.uploadedPhotoUrl) {
          logger.log(`[DataQueue] Uploading receipt photo for ${item.id}`);
          const photoUrl = await uploadPhoto(item.localPhotoUri, 'expenses');
          item.uploadedPhotoUrl = photoUrl;

          // Update expense data with uploaded photo URL
          expenseData.receiptPhotos = [photoUrl];
        }

        // Submit expense
        await api.submitExpense(expenseData);
        logger.log(`[DataQueue] Expense synced successfully: ${item.id}`);
      }

      // Success - remove from queue
      this.queue = this.queue.filter(i => i.id !== item.id);
      await this.saveQueue();
      this.notifyListeners();

      // Notify that sync completed (for cache invalidation)
      if (onSyncCompleteCallback) {
        onSyncCompleteCallback();
      }

    } catch (error) {
      logger.error(`[DataQueue] Error syncing ${item.type}:`, error);

      // Increment retry count
      item.retryCount++;

      if (item.retryCount >= MAX_RETRIES) {
        // Max retries reached - mark as failed
        item.status = 'failed';
        logger.error(`[DataQueue] Max retries reached for ${item.id}`);
      } else {
        // Reset to pending for retry
        item.status = 'pending';
      }

      await this.saveQueue();
      this.notifyListeners();
    }
  }

  /**
   * Retry a specific failed item
   */
  async retryItem(itemId: string) {
    const item = this.queue.find(i => i.id === itemId);
    if (item && item.status === 'failed') {
      item.status = 'pending';
      item.retryCount = 0;
      await this.saveQueue();
      this.notifyListeners();
      this.processQueue();
    }
  }

  /**
   * Retry all failed items
   */
  async retryAllFailed() {
    this.queue.forEach(item => {
      if (item.status === 'failed') {
        item.status = 'pending';
        item.retryCount = 0;
      }
    });
    await this.saveQueue();
    this.notifyListeners();
    this.processQueue();
  }

  /**
   * Remove a failed item from queue (user gives up)
   */
  async removeItem(itemId: string) {
    this.queue = this.queue.filter(i => i.id !== itemId);
    await this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Start automatic queue processing
   */
  private startProcessing() {
    // Process queue every 60 seconds
    setInterval(() => {
      this.processQueue();
    }, 60000);

    // Process immediately
    this.processQueue();
  }

  /**
   * Load queue from AsyncStorage
   */
  private async loadQueue() {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        logger.log(`[DataQueue] Loaded ${this.queue.length} items from storage`);
      }
    } catch (error) {
      logger.error('[DataQueue] Error loading queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to AsyncStorage
   */
  private async saveQueue() {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      logger.error('[DataQueue] Error saving queue:', error);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener([...this.queue]);
      } catch (error) {
        logger.error('[DataQueue] Error notifying listener:', error);
      }
    });
  }
}

// Singleton instance
export const dataQueue = new DataQueueService();
