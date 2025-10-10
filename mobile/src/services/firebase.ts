import auth, { getAuth } from '@react-native-firebase/auth';
import firestore, { getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED } from '@react-native-firebase/firestore';
import storage, { getStorage } from '@react-native-firebase/storage';

// Initialize Firestore with settings
initializeFirestore(getFirestore().app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

// Export singleton instances
export { auth, firestore, storage };

// Helper to get Firestore instance
export const getFirestoreInstance = () => getFirestore();

// Helper to get Auth instance
export const getAuthInstance = () => getAuth();

// Helper to get Storage instance
export const getStorageInstance = () => getStorage();

// Helper to get current user ID
export const getCurrentUserId = (): string | null => {
  const authInstance = getAuth();
  return authInstance.currentUser?.uid || null;
};

// Helper to get auth token for API calls
export const getAuthToken = async (): Promise<string | null> => {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  if (!user) return null;

  // Import getIdToken dynamically to use modular API
  const { getIdToken } = await import('@react-native-firebase/auth');
  return await getIdToken(user);
};
