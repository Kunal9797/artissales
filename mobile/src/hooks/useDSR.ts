import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore, doc, onSnapshot } from '@react-native-firebase/firestore';

export interface SheetsSalesSummary {
  catalog: 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis 1MM';
  totalSheets: number;
}

export interface ExpenseSummary {
  category: string;
  totalAmount: number;
}

export interface DSRReport {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  checkInAt?: any; // Firestore Timestamp
  checkOutAt?: any;
  totalVisits: number;
  visitIds: string[];
  leadsContacted: number;
  leadIds: string[];
  sheetsSales: SheetsSalesSummary[];
  totalSheetsSold: number;
  expenses: ExpenseSummary[];
  totalExpenses: number;
  status: 'pending' | 'approved' | 'needs_revision';
  reviewedBy?: string;
  reviewedAt?: any;
  managerComments?: string;
  generatedAt: any;
}

export const useDSR = (date?: string) => {
  const [report, setReport] = useState<DSRReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authInstance = getAuth();
    const user = authInstance.currentUser;

    if (!user) {
      logger.log('[useDSR] No user logged in');
      setLoading(false);
      return;
    }

    const targetDate = date || new Date().toISOString().split('T')[0];
    const reportId = `${user.uid}_${targetDate}`;
    logger.log(`[useDSR] Listening for DSR: ${reportId}`);

    const db = getFirestore();
    const docRef = doc(db, 'dsrReports', reportId);

    const unsubscribe = onSnapshot(
      docRef,
      (doc) => {
        if (doc.exists()) {
          logger.log('[useDSR] DSR found:', doc.data());
          setReport(doc.data() as DSRReport);
        } else {
          logger.log('[useDSR] No DSR document found for this date');
          setReport(null);
        }
        setLoading(false);
      },
      (error) => {
        logger.error('[useDSR] DSR fetch error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [date]);

  return { report, loading };
};
