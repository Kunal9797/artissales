import { useState, useEffect } from 'react';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, Timestamp } from '@react-native-firebase/firestore';

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

    // Listen to attendance
    const attendanceRef = collection(db, 'attendance');
    const attendanceQuery = query(
      attendanceRef,
      where('userId', '==', user.uid),
      where('timestamp', '>=', startOfDay),
      where('timestamp', '<=', endOfDay)
    );

    const unsubAttendance = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        if (!snapshot) return;

        let checkIn: any = null;
        let checkOut: any = null;

        snapshot.docs.forEach((doc) => {
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
        console.error('Attendance listener error:', error);
      }
    );

    // Listen to visits - use simple userId filter and check timestamp in client
    const visitsRef = collection(db, 'visits');
    const visitsQuery = query(visitsRef, where('userId', '==', user.uid));

    const unsubVisits = onSnapshot(
      visitsQuery,
      (snapshot) => {
        if (!snapshot) return;

        const byType: { [key: string]: number } = {};
        let todayCount = 0;

        const todayStart = Timestamp.fromDate(startOfDay);
        const todayEnd = Timestamp.fromDate(endOfDay);

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const visitTime = data.timestamp;

          // Filter to today's visits
          if (visitTime >= todayStart && visitTime <= todayEnd) {
            todayCount++;
            const type = data.accountType || 'other';
            byType[type] = (byType[type] || 0) + 1;
          }
        });

        setStats((prev) => ({
          ...prev,
          visits: { total: todayCount, byType },
        }));
      },
      (error) => {
        console.error('Visits listener error:', error);
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

        snapshot.docs.forEach((doc) => {
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
        console.error('Sheets sales listener error:', error);
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

        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const expenseTotal = data.totalAmount || 0;
          total += expenseTotal;

          // Aggregate by category from items
          if (data.items && Array.isArray(data.items)) {
            data.items.forEach((item: any) => {
              const category = item.category || 'other';
              byCategory[category] = (byCategory[category] || 0) + item.amount;
            });
          }
        });

        setStats((prev) => ({
          ...prev,
          expenses: { total, byCategory },
        }));
      },
      (error) => {
        console.error('Expenses listener error:', error);
      }
    );

    setLoading(false);

    return () => {
      unsubAttendance();
      unsubVisits();
      unsubSheets();
      unsubExpenses();
    };
  }, []);

  return { stats, loading };
};
