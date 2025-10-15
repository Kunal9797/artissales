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
  DeleteDocumentRequest,
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

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();

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

  // Document Library APIs
  getDocuments: async () => {
    const token = await getAuthToken();
    if (!token) {
      throw new ApiError('Not authenticated', 401);
    }

    const url = `${API_BASE_URL}/getDocuments`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(errorData.error || 'Request failed', response.status, errorData);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('Network error', 0, error);
    }
  },

  uploadDocument: async (name: string, description: string | undefined, fileUri: string, fileName: string, fileType: string) => {
    const token = await getAuthToken();
    if (!token) {
      throw new ApiError('Not authenticated', 401);
    }

    const url = `${API_BASE_URL}/uploadDocument`;

    // Create FormData with proper React Native format
    const formData = new FormData();
    formData.append('name', name);
    if (description) {
      formData.append('description', description);
    }

    // Add file with explicit type casting for React Native
    // React Native FormData requires specific format for file objects
    const file: any = {
      uri: fileUri,
      name: fileName,
      type: fileType || 'application/octet-stream',
    };

    formData.append('file', file);

    try {
      console.log('[API] Uploading document:', { name, fileName, fileType, uri: fileUri.substring(0, 50) + '...' });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // React Native's FormData automatically sets Content-Type with boundary
        },
        body: formData,
      });

      console.log('[API] Upload response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[API] Upload error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }
        throw new ApiError(errorData.error || 'Upload failed', response.status, errorData);
      }

      return await response.json();
    } catch (error) {
      console.error('[API] Upload exception:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Network error', 0, error);
    }
  },

  deleteDocument: async (data: DeleteDocumentRequest) => {
    return callFunction('deleteDocument', data);
  },
};
