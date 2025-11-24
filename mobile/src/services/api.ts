import { getAuth } from '@react-native-firebase/auth';
import { logger } from '../utils/logger';

async function getAuthToken(): Promise<string | null> {
  const authInstance = getAuth();
  const user = authInstance.currentUser;
  if (!user) return null;
  // Call getIdToken as a method on the user object
  return await user.getIdToken();
}
import {
  CheckInRequest,
  CheckOutRequest,
  LogVisitRequest,
  SubmitExpenseRequest,
  LogSheetsSaleRequest,
  CreateUserByManagerRequest,
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

// Use environment variable for API base URL
// Set via .env file (see .env.example)
// Falls back to dev environment if not set, or prod in production builds
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (__DEV__
    ? 'https://us-central1-artis-sales-dev.cloudfunctions.net'
    : 'https://us-central1-artis-sales.cloudfunctions.net');

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
  logger.debug('API', `Calling ${endpoint} at ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    logger.debug('API', `Response status: ${response.status}`);
    logger.debug('API', `Response headers:`, response.headers);

    const responseText = await response.text();
    logger.debug('API', `Response text (first 200 chars):`, responseText.substring(0, 200));

    const responseData = JSON.parse(responseText);

    if (!response.ok) {
      // Redact PII before logging
      const sanitized = redactPII(responseData);
      logger.error(`[API] ${endpoint} error:`, JSON.stringify(sanitized));
      throw new ApiError(
        responseData.error || 'API request failed',
        response.status,
        responseData
      );
    }

    return responseData;
  } catch (error: any) {
    logger.error(`[API] ${endpoint} fetch error:`, error);
    logger.error(`[API] Error name: ${error.name}`);
    logger.error(`[API] Error message: ${error.message}`);
    throw error;
  }
}

/**
 * Redact PII fields from objects before logging
 * SECURITY: Prevents phone numbers, emails, addresses from appearing in logs
 */
function redactPII(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const copy = JSON.parse(JSON.stringify(obj));
  const piiFields = ['phone', 'email', 'address', 'birthdate', 'contactPerson'];

  const redactRecursive = (o: any) => {
    if (Array.isArray(o)) {
      o.forEach(item => redactRecursive(item));
    } else if (o && typeof o === 'object') {
      Object.keys(o).forEach(key => {
        if (piiFields.includes(key)) {
          o[key] = '[REDACTED]';
        } else if (typeof o[key] === 'object') {
          redactRecursive(o[key]);
        }
      });
    }
  };

  redactRecursive(copy);
  return copy;
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

  // Get, Update, Delete for Sheets Sales
  getSheetsSales: async (data: { userId: string; date: string }) => {
    return callFunction('getSheetsSales', data);
  },

  // Supports partial updates - only id is required, provide catalog and/or sheetsCount
  updateSheetsSale: async (data: { id: string; catalog?: string; sheetsCount?: number }) => {
    return callFunction('updateSheetsSale', data);
  },

  deleteSheetsSale: async (data: { id: string }) => {
    return callFunction('deleteSheetsSale', data);
  },

  // Get, Update, Delete for Visits
  getVisit: async (data: { id: string }) => {
    return callFunction('getVisit', data);
  },

  // Supports partial updates - only id is required, provide any fields to update
  updateVisit: async (data: { id: string; purpose?: string; notes?: string; photos?: string[] }) => {
    return callFunction('updateVisit', data);
  },

  deleteVisit: async (data: { id: string }) => {
    return callFunction('deleteVisit', data);
  },

  // Get, Update, Delete for Expenses
  getExpense: async (data: { id: string }) => {
    return callFunction('getExpense', data);
  },

  // Supports two modes:
  // 1. Full update: { id, date, items[], receiptPhotos? }
  // 2. Partial update: { id, amount?, category?, description? } - for inline edits
  updateExpense: async (data: {
    id: string;
    date?: string;
    items?: any[];
    receiptPhotos?: string[];
    amount?: number;
    category?: string;
    description?: string;
  }) => {
    return callFunction('updateExpense', data);
  },

  deleteExpense: async (data: { id: string }) => {
    return callFunction('deleteExpense', data);
  },

  updateProfile: async (data: { name?: string; email?: string; profilePhotoUrl?: string }) => {
    return callFunction('updateProfile', data);
  },

  // Manager APIs
  createUserByManager: async (data: CreateUserByManagerRequest) => {
    return callFunction('createUserByManager', data);
  },

  getTeamStats: async (data: { date?: string }) => {
    return callFunction('getTeamStats', data);
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

  getPendingExpenses: async (data: {}) => {
    return callFunction('getPendingExpenses', data);
  },

  // Account Management APIs
  createAccount: async (data: CreateAccountRequest) => {
    return callFunction('createAccount', data);
  },

  getAccountsList: async (data: GetAccountsListRequest) => {
    return callFunction('getAccountsList', data);
  },

  getAccountDetails: async (data: { accountId: string }) => {
    return callFunction('getAccountDetails', data);
  },

  updateAccount: async (data: UpdateAccountRequest) => {
    return callFunction('updateAccount', data);
  },

  deleteAccount: async (data: { accountId: string }) => {
    return callFunction('deleteAccount', data);
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
      logger.debug('API', 'Uploading document:', { name, fileName, fileType, uri: fileUri.substring(0, 50) + '...' });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // React Native's FormData automatically sets Content-Type with boundary
        },
        body: formData,
      });

      logger.debug('API', `Upload response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[API] Upload error response:', errorText);
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
      logger.error('[API] Upload exception:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Network error', 0, error);
    }
  },

  deleteDocument: async (data: DeleteDocumentRequest) => {
    return callFunction('deleteDocument', data);
  },
};
