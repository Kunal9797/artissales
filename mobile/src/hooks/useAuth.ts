import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, query, where, getDocs, Timestamp } from '@react-native-firebase/firestore';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

export interface UserWithRole extends FirebaseAuthTypes.User {
  role?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authInstance = getAuth();
    const db = getFirestore();

    const unsubscribe = onAuthStateChanged(authInstance, async (authUser) => {
      if (authUser) {
        try {
          logger.log('[Auth] User logged in:', authUser.uid);
          logger.log('[Auth] Phone number:', authUser.phoneNumber);

          // First, try to find user by Auth UID
          const userDocRef = doc(db, 'users', authUser.uid);
          const userDoc = await getDoc(userDocRef);

          let userRole = 'rep'; // Default

          if (userDoc.exists()) {
            logger.log('[Auth] User document found by UID');
            userRole = userDoc.data()?.role || 'rep';
          } else {
            logger.log('[Auth] User document not found by UID, checking by phone...');

            // Try to find user by phone number (using modular API)
            const usersCollection = collection(db, 'users');
            const q = query(usersCollection, where('phone', '==', authUser.phoneNumber || ''));
            const usersSnapshot = await getDocs(q);

            if (usersSnapshot.size > 0) {
              // Found existing user by phone - update the document ID to match Auth UID
              const existingUserDoc = usersSnapshot.docs[0];
              const existingUserData = existingUserDoc.data();

              logger.log('[Auth] Found existing user by phone:', existingUserDoc.id);
              logger.log('[Auth] User role:', existingUserData.role);
              logger.log('[Auth] Migrating to Auth UID:', authUser.uid);

              userRole = existingUserData.role || 'rep';

              // Copy the user document to the correct UID
              await setDoc(userDocRef, {
                ...existingUserData,
                id: authUser.uid,
                updatedAt: Timestamp.now(),
              });

              // Optionally delete the old document (or keep it for history)
              // await existingUserDoc.ref.delete();

              logger.log('[Auth] ✅ Migrated user document to Auth UID');
            } else {
              logger.log('[Auth] No existing user found, creating new rep...');
              // Create user document on first login
              await setDoc(userDocRef, {
                id: authUser.uid,
                phone: authUser.phoneNumber || '',
                name: '', // Empty, will be set in profile
                email: '',
                role: 'rep', // Default role
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
              logger.log('[Auth] ✅ Created new user document');
            }
          }

          // Attach role to user object
          const userWithRole: UserWithRole = {
            ...authUser,
            role: userRole,
          };

          logger.log('[Auth] Setting user with role:', userRole);
          setUser(userWithRole);
        } catch (error) {
          logger.error('[Auth] ❌ Error handling user document:', error);
          setUser(authUser as UserWithRole);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};
