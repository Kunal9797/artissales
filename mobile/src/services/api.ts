import { getAuth } from '@react-native-firebase/auth';
import { getIdToken } from '@react-native-firebase/auth';

async function getAuthToken(): Promise<string | null> {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  if (!user) return null;
  return await getIdToken(user);
}
import {
  CheckInRequest,
  CheckOutRequest,
  LogVisitRequest,
  SubmitExpenseRequest,
  LogSheetsSaleRequest,
  CreateUserByManagerRequest,
  ReviewDSRRequest,
  GetUsersListRequest,
  GetUserStatsRequest,
  CreateAccountRequest,
  GetAccountsListRequest,
  UpdateAccountRequest,
} from '../types';

const API_BASE_URL = 'https://us-central1-artis-sales-dev.cloudfunctions.net';

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function callFunction(endpoint: string, data: any): Promise<any> {
  const token = await getAuthToken();
  if (!token) {
    throw new ApiError('Not authenticated', 401);
  }

  console.log(`[API] Calling ${endpoint} with data:`, JSON.stringify(data));

  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const responseData = await response.json();
  console.log(`[API] ${endpoint} response (${response.status}):`, JSON.stringify(responseData));

  if (!response.ok) {
    console.error(`[API] ${endpoint} error:`, JSON.stringify(responseData));
    throw new ApiError(
      responseData.error || 'API request failed',
      response.status,
      responseData
    );
  }

  return responseData;
}

export const api = {
  checkIn: async (data: CheckInRequest) => {
    return callFunction('checkIn', data);
  },

  checkOut: async (data: CheckOutRequest) => {
    return callFunction('checkOut', data);
  },

  logVisit: async (data: LogVisitRequest) => {
    return callFunction('logVisit', data);
  },

  submitExpense: async (data: SubmitExpenseRequest) => {
    return callFunction('submitExpense', data);
  },

  logSheetsSale: async (data: LogSheetsSaleRequest) => {
    return callFunction('logSheetsSale', data);
  },

  updateProfile: async (data: { name?: string; email?: string }) => {
    return callFunction('updateProfile', data);
  },

  // Manager APIs
  createUserByManager: async (data: CreateUserByManagerRequest) => {
    return callFunction('createUserByManager', data);
  },

  getTeamStats: async (data: { date?: string }) => {
    return callFunction('getTeamStats', data);
  },

  reviewDSR: async (data: ReviewDSRRequest) => {
    return callFunction('reviewDSR', data);
  },

  getPendingDSRs: async (data: { date?: string }) => {
    return callFunction('getPendingDSRs', data);
  },

  getUsersList: async (data: GetUsersListRequest) => {
    return callFunction('getUsersList', data);
  },

  getUserStats: async (data: GetUserStatsRequest) => {
    return callFunction('getUserStats', data);
  },

  updateUser: async (data: { userId: string; phone?: string; territory?: string }) => {
    return callFunction('updateUser', data);
  },

  // Account Management APIs
  createAccount: async (data: CreateAccountRequest) => {
    return callFunction('createAccount', data);
  },

  getAccountsList: async (data: GetAccountsListRequest) => {
    return callFunction('getAccountsList', data);
  },

  updateAccount: async (data: UpdateAccountRequest) => {
    return callFunction('updateAccount', data);
  },

  // Helper: Get user by ID (from Firestore directly, not an API endpoint)
  getUser: async (userId: string) => {
    const token = await getAuthToken();
    if (!token) {
      throw new ApiError('Not authenticated', 401);
    }

    // For now, we'll fetch user data from getUserStats API
    // since it returns user info along with stats
    const today = new Date().toISOString().split('T')[0];
    const response = await callFunction('getUserStats', {
      userId,
      startDate: today,
      endDate: today,
    });

    return { user: response.user };
  },
};
