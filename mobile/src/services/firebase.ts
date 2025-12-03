/**
 * Firebase Service - React Native Firebase
 *
 * This file provides Firebase initialization and helper functions.
 *
 * Note: React Native Firebase auto-initializes from google-services.json
 * and GoogleService-Info.plist, so no manual initializeApp() is needed.
 */

// React Native Firebase - Using modular API (v9+ style)
import { getApp } from '@react-native-firebase/app';
import { getAuth, getIdToken } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getStorage } from '@react-native-firebase/storage';
import {
  getAnalytics,
  setAnalyticsCollectionEnabled,
} from '@react-native-firebase/analytics';
import {
  getCrashlytics,
  setCrashlyticsCollectionEnabled,
} from '@react-native-firebase/crashlytics';

// Initialize services
const app = getApp();
const firestoreInstance = getFirestore(app);
const authInstance = getAuth(app);
const storageInstance = getStorage(app);

// Configure Firestore settings using instance method (not standalone function)
firestoreInstance.settings({
  cacheSizeBytes: -1, // -1 = unlimited cache
  persistence: true,
});

/**
 * Get Firestore instance
 */
export const getFirestoreInstance = () => firestoreInstance;

/**
 * Get Auth instance
 */
export const getAuthInstance = () => authInstance;

/**
 * Get Storage instance
 */
export const getStorageInstance = () => storageInstance;

/**
 * Get current user ID (convenience helper)
 */
export const getCurrentUserId = (): string | null => {
  return authInstance.currentUser?.uid || null;
};

/**
 * Get auth token for API calls
 */
export const getAuthToken = async (): Promise<string | null> => {
  const user = authInstance.currentUser;
  if (!user) return null;
  return await getIdToken(user);
};

// ============================================================================
// Analytics & Crashlytics (using modular API)
// ============================================================================

// Cached instances
const analyticsInstance = getAnalytics();
const crashlyticsInstance = getCrashlytics();

/**
 * Get Analytics instance
 */
export const getAnalyticsInstance = () => analyticsInstance;

/**
 * Get Crashlytics instance
 */
export const getCrashlyticsInstance = () => crashlyticsInstance;

/**
 * Enable/disable Crashlytics collection (useful for opt-out)
 */
export const setCrashlyticsEnabled = async (enabled: boolean): Promise<void> => {
  await setCrashlyticsCollectionEnabled(crashlyticsInstance, enabled);
};

/**
 * Enable/disable Analytics collection (useful for opt-out)
 */
export const setAnalyticsEnabled = async (enabled: boolean): Promise<void> => {
  await setAnalyticsCollectionEnabled(analyticsInstance, enabled);
};
