import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// Initialize Firestore settings
firestore().settings({
  persistence: true, // Enable offline persistence
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});

export { auth, firestore, storage };

// Helper to get current user ID
export const getCurrentUserId = (): string | null => {
  return auth().currentUser?.uid || null;
};

// Helper to get auth token for API calls
export const getAuthToken = async (): Promise<string | null> => {
  const user = auth().currentUser;
  if (!user) return null;
  return await user.getIdToken();
};
