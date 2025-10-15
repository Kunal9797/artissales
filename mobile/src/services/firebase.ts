/**
 * Firebase Service - React Native Firebase
 *
 * This file provides Firebase initialization and helper functions.
 *
 * Note: React Native Firebase auto-initializes from google-services.json
 * and GoogleService-Info.plist, so no manual initializeApp() is needed.
 */

import app from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Configure Firestore settings (must be called before any Firestore usage)
firestore().settings({
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
  persistence: true,
});

/**
 * Get Firestore instance
 */
export const getFirestoreInstance = () => firestore();

/**
 * Get Auth instance
 */
export const getAuthInstance = () => auth();

/**
 * Get Storage instance
 */
export const getStorageInstance = () => storage();

/**
 * Get current user ID (convenience helper)
 */
export const getCurrentUserId = (): string | null => {
  return auth().currentUser?.uid || null;
};

/**
 * Get auth token for API calls
 */
export const getAuthToken = async (): Promise<string | null> => {
  const user = auth().currentUser;
  if (!user) return null;
  return await user.getIdToken();
};
