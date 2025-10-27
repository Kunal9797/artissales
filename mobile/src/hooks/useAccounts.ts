import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface Account {
  id: string;
  name: string;
  type: 'distributor' | 'dealer' | 'architect' | 'contractor';
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
    const fetchAccounts = async () => {
      try {
        setLoading(true);
        // Use API endpoint which handles visibility rules on backend
        const response = await api.getAccountsList({});

        // Convert ISO strings back to Date objects (handle missing dates)
        const accountsWithDates = response.accounts.map((account: any) => ({
          ...account,
          lastVisitAt: account.lastVisitAt ? new Date(account.lastVisitAt) : undefined,
          createdAt: account.createdAt ? new Date(account.createdAt) : new Date(),
          updatedAt: account.updatedAt ? new Date(account.updatedAt) : new Date(),
        }));

        setAccounts(accountsWithDates);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        console.error('Accounts fetch error:', err);
        setError(err.message || 'Failed to fetch accounts');
        setLoading(false);
      }
    };

    fetchAccounts();
  }, [refreshTrigger]);

  return { accounts, loading, error, refreshAccounts };
};
