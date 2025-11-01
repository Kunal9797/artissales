import { logger } from '../utils/logger';
/**
 * Upload Queue Service
 * Manages background photo uploads with offline support
 *
 * Architecture:
 * - Stores pending uploads in AsyncStorage
 * - Processes queue automatically when online
 * - Retries failed uploads with exponential backoff
 * - Emits events for UI updates
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadPhoto } from './storage';
import { api } from './api';

// Optional: NetInfo for network detection (requires native rebuild)
let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  logger.warn('[UploadQueue] NetInfo not available - offline detection disabled');
}

const QUEUE_KEY = '@upload_queue';
const MAX_RETRIES = 3;

export interface QueueItem {
  id: string;
  type: 'visit' | 'visit-update' | 'expense';
  photoUri: string;
  folder: 'visits' | 'expenses';
  metadata: any; // Visit or expense data
  retryCount: number;
  createdAt: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
}

type QueueListener = (queue: QueueItem[]) => void;

class UploadQueueService {
  private queue: QueueItem[] = [];
  private listeners: QueueListener[] = [];
  private isProcessing = false;

  async init() {
    // Load queue from storage
    await this.loadQueue();

    // Start processing queue
    this.startProcessing();

    // Listen for network changes (if NetInfo is available)
    if (NetInfo) {
      NetInfo.addEventListener((state: any) => {
        if (state.isConnected) {
          logger.log('[UploadQueue] Network connected, processing queue...');
          this.processQueue();
        }
      });
    }
  }

  /**
   * Add item to upload queue
   */
  async addToQueue(item: Omit<QueueItem, 'id' | 'retryCount' | 'createdAt' | 'status'>): Promise<string> {
    const queueItem: QueueItem = {
      ...item,
      id: `${item.type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      retryCount: 0,
      createdAt: Date.now(),
      status: 'pending',
    };

    this.queue.push(queueItem);
    await this.saveQueue();
    this.notifyListeners();

    // Start processing immediately if online
    this.processQueue();

    return queueItem.id;
  }

  /**
   * Get all queue items
   */
  getQueue(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Get pending count
   */
  getPendingCount(): number {
    return this.queue.filter(item => item.status === 'pending' || item.status === 'uploading').length;
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
   * Process upload queue
   */
  private async processQueue() {
    if (this.isProcessing) return;

    // Check network status if NetInfo is available
    if (NetInfo) {
      try {
        const netInfo = await NetInfo.fetch();
        if (!netInfo.isConnected) {
          logger.log('[UploadQueue] Offline, skipping queue processing');
          return;
        }
      } catch (error) {
        logger.warn('[UploadQueue] NetInfo fetch failed, proceeding anyway');
      }
    }

    this.isProcessing = true;

    const pendingItems = this.queue.filter(item => item.status === 'pending');

    for (const item of pendingItems) {
      try {
        await this.processItem(item);
      } catch (error) {
        logger.error(`[UploadQueue] Error processing item ${item.id}:`, error);
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
  private async processItem(item: QueueItem) {
    logger.log(`[UploadQueue] Processing ${item.type} upload: ${item.id}`);

    // Update status to uploading
    item.status = 'uploading';
    await this.saveQueue();
    this.notifyListeners();

    try {
      // Step 1: Upload photo to Firebase Storage
      const photoUrl = await uploadPhoto(item.photoUri, item.folder);
      logger.log(`[UploadQueue] Photo uploaded: ${photoUrl}`);

      // Step 2: Submit to API with uploaded photo URL
      if (item.type === 'visit') {
        await api.logVisit({
          ...item.metadata,
          photos: [photoUrl],
        });
      } else if (item.type === 'visit-update') {
        await api.updateVisit({
          id: item.metadata.visitId,
          purpose: item.metadata.purpose,
          notes: item.metadata.notes,
          photos: [photoUrl],
        });
      } else if (item.type === 'expense') {
        await api.submitExpense({
          ...item.metadata,
          receiptPhotos: [photoUrl],
        });
      }

      // Success - remove from queue
      logger.log(`[UploadQueue] ✅ ${item.type} submitted successfully`);
      this.queue = this.queue.filter(i => i.id !== item.id);
      await this.saveQueue();
      this.notifyListeners();

    } catch (error) {
      logger.error(`[UploadQueue] ❌ Error uploading ${item.type}:`, error);

      // Increment retry count
      item.retryCount++;

      if (item.retryCount >= MAX_RETRIES) {
        // Max retries reached - mark as failed
        item.status = 'failed';
        logger.error(`[UploadQueue] Max retries reached for ${item.id}`);
      } else {
        // Reset to pending for retry
        item.status = 'pending';
      }

      await this.saveQueue();
      this.notifyListeners();
    }
  }

  /**
   * Start automatic queue processing
   */
  private startProcessing() {
    // Process queue every minute
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
        logger.log(`[UploadQueue] Loaded ${this.queue.length} items from storage`);
      }
    } catch (error) {
      logger.error('[UploadQueue] Error loading queue:', error);
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
      logger.error('[UploadQueue] Error saving queue:', error);
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
        logger.error('[UploadQueue] Error notifying listener:', error);
      }
    });
  }

  /**
   * Clear completed and failed items (for manual cleanup)
   */
  async clearCompleted() {
    this.queue = this.queue.filter(item =>
      item.status === 'pending' || item.status === 'uploading'
    );
    await this.saveQueue();
    this.notifyListeners();
  }

  /**
   * Retry failed items
   */
  async retryFailed() {
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
}

// Singleton instance
export const uploadQueue = new UploadQueueService();
