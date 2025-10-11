import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, Timestamp } from '@react-native-firebase/firestore';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';

export const useAuth = () => {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authInstance = getAuth();
    const db = getFirestore();

    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      if (user) {
        try {
          console.log('[Auth] User logged in:', user.uid);
          console.log('[Auth] Phone number:', user.phoneNumber);

          // First, try to find user by Auth UID
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            console.log('[Auth] User document found by UID');
          } else {
            console.log('[Auth] User document not found by UID, checking by phone...');

            // Try to find user by phone number
            const usersCollection = collection(db, 'users');
            const usersSnapshot = await db.collection('users')
              .where('phone', '==', user.phoneNumber || '')
              .get();

            if (!usersSnapshot.empty) {
              // Found existing user by phone - update the document ID to match Auth UID
              const existingUserDoc = usersSnapshot.docs[0];
              const existingUserData = existingUserDoc.data();

              console.log('[Auth] Found existing user by phone:', existingUserDoc.id);
              console.log('[Auth] User role:', existingUserData.role);
              console.log('[Auth] Migrating to Auth UID:', user.uid);

              // Copy the user document to the correct UID
              await setDoc(userDocRef, {
                ...existingUserData,
                id: user.uid,
                updatedAt: Timestamp.now(),
              });

              // Optionally delete the old document (or keep it for history)
              // await existingUserDoc.ref.delete();

              console.log('[Auth] ✅ Migrated user document to Auth UID');
            } else {
              console.log('[Auth] No existing user found, creating new rep...');
              // Create user document on first login
              await setDoc(userDocRef, {
                id: user.uid,
                phone: user.phoneNumber || '',
                name: '', // Empty, will be set in profile
                email: '',
                role: 'rep', // Default role
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
              console.log('[Auth] ✅ Created new user document');
            }
          }
        } catch (error) {
          console.error('[Auth] ❌ Error handling user document:', error);
        }
      }

      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};
