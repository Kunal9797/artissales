import { useState, useEffect } from 'react';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, collection, query, where, orderBy, onSnapshot, FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

export interface AttendanceStatus {
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime: Date | null;
  checkOutTime: Date | null;
  checkInId: string | null;
  checkOutId: string | null;
}

export const useAttendance = () => {
  const [status, setStatus] = useState<AttendanceStatus>({
    hasCheckedIn: false,
    hasCheckedOut: false,
    checkInTime: null,
    checkOutTime: null,
    checkInId: null,
    checkOutId: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authInstance = getAuth();
    const user = authInstance.currentUser;

    if (!user) {
      setError('Not authenticated');
      setLoading(false);
      return;
    }

    // Get start of today (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const db = getFirestore();

    // Query attendance collection for today's records
    const attendanceRef = collection(db, 'attendance');
    const attendanceQuery = query(
      attendanceRef,
      where('userId', '==', user.uid),
      where('timestamp', '>=', today),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const newStatus: AttendanceStatus = {
          hasCheckedIn: false,
          hasCheckedOut: false,
          checkInTime: null,
          checkOutTime: null,
          checkInId: null,
          checkOutId: null,
        };

        snapshot.forEach((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => {
          const data = doc.data();
          const timestamp = data.timestamp?.toDate();

          if (data.type === 'check_in') {
            newStatus.hasCheckedIn = true;
            newStatus.checkInTime = timestamp;
            newStatus.checkInId = doc.id;
          } else if (data.type === 'check_out') {
            newStatus.hasCheckedOut = true;
            newStatus.checkOutTime = timestamp;
            newStatus.checkOutId = doc.id;
          }
        });

        setStatus(newStatus);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Attendance fetch error:', err);
        setError(err.message || 'Failed to fetch attendance');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { status, loading, error };
};
