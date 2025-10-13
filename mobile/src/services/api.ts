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
  SetTargetRequest,
  GetTargetRequest,
  GetUserTargetsRequest,
  StopAutoRenewRequest,
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

  const url = `${API_BASE_URL}/${endpoint}`;
  console.log(`[API] Calling ${endpoint}`);
  console.log(`[API] URL: ${url}`);
  console.log(`[API] Data:`, JSON.stringify(data, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    console.log(`[API] ${endpoint} response status: ${response.status}`);

    const responseData = await response.json();
    console.log(`[API] ${endpoint} response data:`, JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error(`[API] ${endpoint} error:`, JSON.stringify(responseData));
      throw new ApiError(
        responseData.error || 'API request failed',
        response.status,
        responseData
      );
    }

    return responseData;
  } catch (error: any) {
    console.error(`[API] ${endpoint} fetch error:`, error);
    console.error(`[API] Error name: ${error.name}`);
    console.error(`[API] Error message: ${error.message}`);
    throw error;
  }
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

  // Target Management APIs
  setTarget: async (data: SetTargetRequest) => {
    return callFunction('setTarget', data);
  },

  getTarget: async (data: GetTargetRequest) => {
    return callFunction('getTarget', data);
  },

  getUserTargets: async (data: GetUserTargetsRequest) => {
    return callFunction('getUserTargets', data);
  },

  stopAutoRenew: async (data: StopAutoRenewRequest) => {
    return callFunction('stopAutoRenew', data);
  },
};
