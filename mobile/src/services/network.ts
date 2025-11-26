/**
 * Network Utility Service
 * Provides network connectivity detection for offline support
 */

import { logger } from '../utils/logger';

// Optional: NetInfo for network detection (requires native rebuild)
let NetInfo: any = null;
try {
  NetInfo = require('@react-native-community/netinfo').default;
} catch (e) {
  logger.warn('[Network] NetInfo not available - using fallback detection');
}

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

/**
 * Check if the device is currently online
 * Returns true if connected, false if offline
 */
export async function isOnline(): Promise<boolean> {
  if (NetInfo) {
    try {
      const state = await NetInfo.fetch();
      // Check both isConnected and isInternetReachable for reliable detection
      // isInternetReachable can be null during initial check, so we treat null as "maybe connected"
      return state.isConnected === true && state.isInternetReachable !== false;
    } catch (error) {
      logger.warn('[Network] NetInfo fetch failed, assuming online:', error);
      return true; // Assume online if we can't determine
    }
  }

  // Fallback: assume online if NetInfo is not available
  return true;
}

/**
 * Get detailed network state
 */
export async function getNetworkState(): Promise<NetworkState> {
  if (NetInfo) {
    try {
      const state = await NetInfo.fetch();
      return {
        isConnected: state.isConnected === true,
        isInternetReachable: state.isInternetReachable,
      };
    } catch (error) {
      logger.warn('[Network] NetInfo fetch failed:', error);
      return { isConnected: true, isInternetReachable: null };
    }
  }

  return { isConnected: true, isInternetReachable: null };
}

/**
 * Subscribe to network state changes
 * Returns unsubscribe function
 */
export function subscribeToNetworkChanges(
  callback: (state: NetworkState) => void
): () => void {
  if (NetInfo) {
    return NetInfo.addEventListener((state: any) => {
      callback({
        isConnected: state.isConnected === true,
        isInternetReachable: state.isInternetReachable,
      });
    });
  }

  // Return no-op unsubscribe if NetInfo not available
  return () => {};
}

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: any): boolean {
  if (!error) return false;

  const message = error.message?.toLowerCase() || '';
  const name = error.name?.toLowerCase() || '';

  return (
    message.includes('network request failed') ||
    message.includes('network error') ||
    message.includes('failed to fetch') ||
    message.includes('no internet') ||
    message.includes('internet connection') ||
    message.includes('could not connect') ||
    name === 'typeerror' && message.includes('network') ||
    error.code === 'NETWORK_ERROR'
  );
}

/**
 * User-friendly offline message
 */
export const OFFLINE_MESSAGE = "You're offline. Your data will be saved when you're back online.";
export const OFFLINE_SUBMIT_MESSAGE = "You're offline. Please check your connection and try again.";
export const OFFLINE_LOAD_MESSAGE = "Unable to load data. Please check your internet connection.";
