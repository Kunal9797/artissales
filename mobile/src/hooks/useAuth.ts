import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { logger } from '../utils/logger';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc, deleteDoc, query, where, getDocs, Timestamp } from '@react-native-firebase/firestore';
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { setAnalyticsUser, clearAnalyticsUser, trackEvent, UserProperties } from '../services/analytics';

export interface UserWithRole extends FirebaseAuthTypes.User {
  role?: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>('');

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
            setUserName(userDoc.data()?.name || '');

            // Safety check: Clean up any duplicate docs with same phone
            // This handles cases where migration delete failed previously
            const phoneNumber = authUser.phoneNumber;
            if (phoneNumber) {
              const usersCollection = collection(db, 'users');
              const q = query(usersCollection, where('phone', '==', phoneNumber));
              const duplicateCheck = await getDocs(q);

              if (duplicateCheck.size > 1) {
                logger.warn('[Auth] Found duplicate docs for phone:', phoneNumber, '- cleaning up');
                for (const dupDoc of duplicateCheck.docs) {
                  if (dupDoc.id !== authUser.uid) {
                    try {
                      await deleteDoc(dupDoc.ref);
                      logger.log('[Auth] ✅ Cleaned up duplicate doc:', dupDoc.id);
                    } catch (err) {
                      logger.error('[Auth] Failed to clean duplicate:', dupDoc.id, err);
                    }
                  }
                }
              }
            }
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
              const oldDocId = existingUserDoc.id;

              logger.log('[Auth] Found existing user by phone:', oldDocId);
              logger.log('[Auth] User role:', existingUserData.role);
              logger.log('[Auth] Migrating to Auth UID:', authUser.uid);

              userRole = existingUserData.role || 'rep';
              setUserName(existingUserData.name || '');

              // Copy the user document to the correct UID with migration metadata
              await setDoc(userDocRef, {
                ...existingUserData,
                id: authUser.uid,
                migratedFrom: oldDocId,
                migratedAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              });
              logger.log('[Auth] Created new user document with Auth UID');

              // Delete the old document to prevent duplicates
              try {
                await deleteDoc(existingUserDoc.ref);
                logger.log('[Auth] ✅ Deleted old user document:', oldDocId);
              } catch (deleteError) {
                // Log but don't fail - the migration succeeded even if cleanup didn't
                logger.error('[Auth] ⚠️ Failed to delete old document (migration still successful):', oldDocId, deleteError);
              }

              logger.log('[Auth] ✅ Migration complete:', oldDocId, '->', authUser.uid);
            } else {
              // SECURITY: User not pre-created by manager - REJECT login
              logger.error('[Auth] ❌ Unauthorized login attempt:', authUser.phoneNumber);
              logger.error('[Auth] User document does not exist in Firestore');

              // Show user-friendly error message
              Alert.alert(
                'Account Not Found',
                'Your phone number is not registered in the system. Only managers (National Head or Admin) can create new accounts. Please contact your manager.',
                [{ text: 'OK' }]
              );

              // Force logout to prevent unauthorized access
              await authInstance.signOut();
              setUser(null);
              setLoading(false);
              return; // Stop processing - don't create user document
            }
          }

          // Attach role to user object
          const userWithRole: UserWithRole = {
            ...authUser,
            role: userRole,
          };

          logger.log('[Auth] Setting user with role:', userRole);
          setUser(userWithRole);

          // Set analytics user identity
          const userProperties: UserProperties = {
            role: userRole as UserProperties['role'],
            territory: userDoc.exists() ? userDoc.data()?.territory : undefined,
            reportsToUserId: userDoc.exists() ? userDoc.data()?.reportsToUserId : undefined,
          };
          setAnalyticsUser(authUser.uid, userProperties);
          trackEvent('login_completed', { method: 'phone' });
        } catch (error) {
          logger.error('useAuth', error);
          setUser(authUser as UserWithRole);
        }
      } else {
        // User logged out - clear analytics identity and user state
        clearAnalyticsUser();
        trackEvent('logout');
        setUser(null);
        setUserName('');
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, loading, userName };
};
