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
          // Ensure user document exists in Firestore
          console.log('[Auth] Checking user document for:', user.uid);
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            console.log('[Auth] User document does not exist, creating...');
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
            console.log('[Auth] ✅ Created new user document successfully');
          } else {
            console.log('[Auth] User document already exists');
          }
        } catch (error) {
          console.error('[Auth] ❌ Error creating user document:', error);
        }
      }

      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};
