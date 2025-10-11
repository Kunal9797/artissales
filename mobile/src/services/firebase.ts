/**
 * Firebase Service - Modular API (v22+)
 *
 * This file provides Firebase initialization and helper functions
 * using the new modular API to avoid deprecation warnings.
 */

import { getAuth, getIdToken } from '@react-native-firebase/auth';
import { getFirestore, initializeFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';
import { getApp } from '@react-native-firebase/app';

// Initialize Firestore with offline persistence settings
const app = getApp();
initializeFirestore(app, {
  cacheSizeBytes: -1, // -1 means unlimited cache (same as CACHE_SIZE_UNLIMITED)
});

/**
 * Get Firestore instance
 */
export const getFirestoreInstance = () => getFirestore();

/**
 * Get Auth instance
 */
export const getAuthInstance = () => getAuth();

/**
 * Get Storage instance
 */
export const getStorageInstance = () => getStorage();

/**
 * Get current user ID (convenience helper)
 */
export const getCurrentUserId = (): string | null => {
  const authInstance = getAuth();
  return authInstance.currentUser?.uid || null;
};

/**
 * Get auth token for API calls
 */
export const getAuthToken = async (): Promise<string | null> => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  if (!user) return null;
  return await getIdToken(user);
};
