/**
 * GPS Service - Prefetch and cache GPS location for visit logging
 *
 * Uses Balanced accuracy (~100m) for fast acquisition while still being
 * accurate enough for fraud detection. Supports prefetching to hide
 * GPS latency from user experience.
 */

import * as Location from 'expo-location';
import { logger } from '../utils/logger';

export interface GPSLocation {
  lat: number;
  lon: number;
  accuracyM: number;
  timestamp: number;
}

// Cache state
let cachedLocation: GPSLocation | null = null;
let fetchPromise: Promise<GPSLocation | null> | null = null;
let permissionStatus: 'granted' | 'denied' | 'unknown' = 'unknown';

// Constants
const DEFAULT_MAX_AGE_MS = 60000; // 60 seconds
const MAX_ACCEPTABLE_ACCURACY_M = 150; // 150 meters

export const gpsService = {
  /**
   * Start fetching GPS location (non-blocking).
   * Call this early (e.g., when user selects an account) to prefetch.
   */
  prefetch: async (): Promise<GPSLocation | null> => {
    // If already fetching, return existing promise
    if (fetchPromise) {
      logger.info('[GPS] Prefetch already in progress, reusing promise');
      return fetchPromise;
    }

    // If we have fresh cached data, return it
    if (cachedLocation && (Date.now() - cachedLocation.timestamp) < DEFAULT_MAX_AGE_MS) {
      logger.info('[GPS] Using fresh cached location');
      return cachedLocation;
    }

    logger.info('[GPS] Starting prefetch with Balanced accuracy');
    const startTime = Date.now();

    fetchPromise = (async () => {
      try {
        // Request permission if we haven't yet
        const { status } = await Location.requestForegroundPermissionsAsync();
        permissionStatus = status === 'granted' ? 'granted' : 'denied';

        if (status !== 'granted') {
          logger.warn('[GPS] Permission denied');
          fetchPromise = null;
          return null;
        }

        // Use Balanced accuracy for fast acquisition (~1-3s vs 5-20s for High)
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const elapsed = Date.now() - startTime;
        logger.info(`[GPS] Location acquired in ${elapsed}ms, accuracy: ${location.coords.accuracy}m`);

        cachedLocation = {
          lat: location.coords.latitude,
          lon: location.coords.longitude,
          accuracyM: location.coords.accuracy || 0,
          timestamp: Date.now(),
        };

        fetchPromise = null;
        return cachedLocation;
      } catch (error) {
        logger.error('[GPS] Failed to get location:', error);
        fetchPromise = null;
        return null;
      }
    })();

    return fetchPromise;
  },

  /**
   * Get GPS location - returns cached data if fresh, otherwise fetches.
   * @param maxAgeMs Maximum age of cached location in milliseconds
   */
  get: async (maxAgeMs = DEFAULT_MAX_AGE_MS): Promise<GPSLocation | null> => {
    // If we have fresh cached data, return it immediately
    if (cachedLocation && (Date.now() - cachedLocation.timestamp) < maxAgeMs) {
      logger.info('[GPS] Returning cached location');
      return cachedLocation;
    }

    // If fetch in progress, wait for it
    if (fetchPromise) {
      logger.info('[GPS] Waiting for in-flight fetch');
      return fetchPromise;
    }

    // Otherwise, start new fetch
    logger.info('[GPS] No cache, starting fresh fetch');
    return gpsService.prefetch();
  },

  /**
   * Check if we have a valid cached location
   */
  hasCachedLocation: (maxAgeMs = DEFAULT_MAX_AGE_MS): boolean => {
    return !!(cachedLocation && (Date.now() - cachedLocation.timestamp) < maxAgeMs);
  },

  /**
   * Check if GPS is currently being fetched
   */
  isFetching: (): boolean => {
    return fetchPromise !== null;
  },

  /**
   * Get permission status
   */
  getPermissionStatus: (): 'granted' | 'denied' | 'unknown' => {
    return permissionStatus;
  },

  /**
   * Check if location accuracy is acceptable for visit logging
   */
  isAccuracyAcceptable: (location: GPSLocation | null): boolean => {
    if (!location) return false;
    return location.accuracyM > 0 && location.accuracyM <= MAX_ACCEPTABLE_ACCURACY_M;
  },

  /**
   * Clear cached location (call after successful visit submission)
   */
  clear: (): void => {
    logger.info('[GPS] Cache cleared');
    cachedLocation = null;
  },

  /**
   * Get the cached location without triggering a fetch
   */
  getCached: (): GPSLocation | null => {
    return cachedLocation;
  },
};
