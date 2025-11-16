import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, FirebaseFirestoreTypes, Timestamp } from '@react-native-firebase/firestore';

// FEATURE FLAG: Set to false to disable attendance tracking
const ATTENDANCE_FEATURE_ENABLED = false;

export interface TodayStats {
  checkInAt?: any;
  checkOutAt?: any;
  visits: {
    total: number;
    byType: { [key: string]: number };
  };
  sheetsSales: {
    total: number;
    byCatalog: { [key: string]: number };
  };
  expenses: {
    total: number;
    byCategory: { [key: string]: number };
  };
}

export const useTodayStats = () => {
  const [stats, setStats] = useState<TodayStats>({
    visits: { total: 0, byType: {} },
    sheetsSales: { total: 0, byCatalog: {} },
    expenses: { total: 0, byCategory: {} },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authInstance = getAuth();
    const user = authInstance.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    const db = getFirestore();
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(`${today}T00:00:00`);
    const endOfDay = new Date(`${today}T23:59:59`);

    // Listen to attendance (DISABLED if feature flag is false)
    let unsubAttendance: (() => void) | undefined;

    if (ATTENDANCE_FEATURE_ENABLED) {
      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = query(
        attendanceRef,
        where('userId', '==', user.uid),
        where('timestamp', '>=', startOfDay),
        where('timestamp', '<=', endOfDay)
      );

      unsubAttendance = onSnapshot(
        attendanceQuery,
        (snapshot) => {
          if (!snapshot) return;

          let checkIn: any = null;
          let checkOut: any = null;

          snapshot.docs.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
            const data = doc.data();
            if (data.type === 'check_in' && !checkIn) {
              checkIn = data.timestamp;
            } else if (data.type === 'check_out') {
              checkOut = data.timestamp;
            }
          });

          setStats((prev) => ({ ...prev, checkInAt: checkIn, checkOutAt: checkOut }));
        },
        (error) => {
          logger.error('Attendance listener error:', error);
        }
      );
    } else {
      // If attendance is disabled, set to null immediately
      setStats((prev) => ({ ...prev, checkInAt: null, checkOutAt: null }));
    }

    // Listen to visits - filter by userId and today's timestamp (PERFORMANCE FIX)
    const visitsRef = collection(db, 'visits');
    const visitsQuery = query(
      visitsRef,
      where('userId', '==', user.uid),
      where('timestamp', '>=', startOfDay),
      where('timestamp', '<=', endOfDay)
    );

    const unsubVisits = onSnapshot(
      visitsQuery,
      (snapshot) => {
        if (!snapshot) return;

        const byType: { [key: string]: number } = {};
        let todayCount = 0;

        // No need for client-side timestamp filtering anymore - query handles it
        snapshot.docs.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          todayCount++;
          const type = data.accountType || 'other';
          byType[type] = (byType[type] || 0) + 1;
        });

        setStats((prev) => ({
          ...prev,
          visits: { total: todayCount, byType },
        }));
      },
      (error) => {
        logger.error('Visits listener error:', error);
      }
    );

    // Listen to sheets sales
    const sheetsSalesRef = collection(db, 'sheetsSales');
    const sheetsSalesQuery = query(
      sheetsSalesRef,
      where('userId', '==', user.uid),
      where('date', '==', today)
    );

    const unsubSheets = onSnapshot(
      sheetsSalesQuery,
      (snapshot) => {
        if (!snapshot) return;

        let total = 0;
        const byCatalog: { [key: string]: number } = {};

        snapshot.docs.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          const catalog = data.catalog;
          const count = data.sheetsCount || 0;
          byCatalog[catalog] = (byCatalog[catalog] || 0) + count;
          total += count;
        });

        setStats((prev) => ({
          ...prev,
          sheetsSales: { total, byCatalog },
        }));
      },
      (error) => {
        logger.error('Sheets sales listener error:', error);
      }
    );

    // Listen to expenses
    const expensesRef = collection(db, 'expenses');
    const expensesQuery = query(
      expensesRef,
      where('userId', '==', user.uid),
      where('date', '==', today)
    );

    const unsubExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        if (!snapshot) return;

        let total = 0;
        const byCategory: { [key: string]: number } = {};

        snapshot.docs.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();

          // Calculate total from items array (expenses don't have totalAmount field)
          if (data.items && Array.isArray(data.items)) {
            data.items.forEach((item: any) => {
              const itemAmount = item.amount || 0;
              total += itemAmount;

              // Aggregate by category
              const category = item.category || 'other';
              byCategory[category] = (byCategory[category] || 0) + itemAmount;
            });
          }
        });

        setStats((prev) => ({
          ...prev,
          expenses: { total, byCategory },
        }));
      },
      (error) => {
        logger.error('Expenses listener error:', error);
      }
    );

    setLoading(false);

    return () => {
      if (unsubAttendance) unsubAttendance();
      unsubVisits();
      unsubSheets();
      unsubExpenses();
    };
  }, []);

  return { stats, loading };
};
