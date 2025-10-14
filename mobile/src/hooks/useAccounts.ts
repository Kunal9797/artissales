import { useState, useEffect } from 'react';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection, query, where, orderBy, onSnapshot, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface Account {
  id: string;
  name: string;
  type: 'distributor' | 'dealer' | 'architect';
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city: string;
  state: string;
  pincode: string;
  territory: string;
  assignedRepUserId: string;
  parentDistributorId?: string;
  createdByUserId: string;
  status: 'active' | 'inactive';
  lastVisitAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const useAccounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshAccounts = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  useEffect(() => {
    const authInstance = getAuth();
    const user = authInstance.currentUser;
    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    const db = getFirestore();

    // Subscribe to accounts assigned to current user
    const accountsRef = collection(db, 'accounts');
    const q = query(
      accountsRef,
      where('assignedRepUserId', '==', user.uid),
      where('status', '==', 'active'),
      orderBy('name', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const accountsData: Account[] = [];

        snapshot.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          accountsData.push({
            id: doc.id,
            name: data.name,
            type: data.type,
            contactPerson: data.contactPerson,
            phone: data.phone,
            email: data.email,
            address: data.address,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            territory: data.territory,
            assignedRepUserId: data.assignedRepUserId,
            parentDistributorId: data.parentDistributorId,
            createdByUserId: data.createdByUserId,
            status: data.status,
            lastVisitAt: data.lastVisitAt?.toDate(),
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          });
        });

        setAccounts(accountsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Accounts fetch error:', err);
        setError(err.message || 'Failed to fetch accounts');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [refreshTrigger]);

  return { accounts, loading, error, refreshAccounts };
};
