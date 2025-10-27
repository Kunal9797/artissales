/**
 * Target Cache - In-memory cache for target/progress data
 *
 * Reduces redundant API calls when multiple components need the same target data.
 * Cache has 5-minute TTL to balance freshness with performance.
 */

import { GetTargetResponse } from '../types';
import { logger } from '../utils/logger';

interface CacheEntry {
  data: GetTargetResponse;
  timestamp: number;
}

class TargetCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly TTL_MS = 5 * 60 * 1000; // 5 minutes

  private getCacheKey(userId: string, month: string): string {
    return `${userId}_${month}`;
  }

  get(userId: string, month: string): GetTargetResponse | null {
    const key = this.getCacheKey(userId, month);
    const entry = this.cache.get(key);

    if (!entry) return null;

    const age = Date.now() - entry.timestamp;
    if (age > this.TTL_MS) {
      this.cache.delete(key);
      logger.info(`[TargetCache] Expired: ${key}, age: ${age}ms`);
      return null;
    }

    logger.info(`[TargetCache] HIT: ${key}, age: ${age}ms`);
    return entry.data;
  }

  set(userId: string, month: string, data: GetTargetResponse): void {
    const key = this.getCacheKey(userId, month);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
    logger.info(`[TargetCache] SET: ${key}`);
  }

  invalidate(userId: string, month: string): void {
    const key = this.getCacheKey(userId, month);
    this.cache.delete(key);
    logger.info(`[TargetCache] INVALIDATE: ${key}`);
  }

  clear(): void {
    this.cache.clear();
    logger.info('[TargetCache] CLEAR: All entries removed');
  }
}

// Export singleton instance
export const targetCache = new TargetCache();
