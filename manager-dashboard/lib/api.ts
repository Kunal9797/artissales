/**
 * API Service Layer
 *
 * Wrapper for Firebase Cloud Functions HTTP endpoints
 * Mirrors the mobile app's API service for consistency
 *
 * NOTE: Backend uses `onRequest` (HTTP endpoints), not `onCall` (callable functions)
 */

import { getCurrentUserToken } from './firebase-auth';

const FUNCTIONS_BASE_URL = 'https://us-central1-artis-sales-dev.cloudfunctions.net';

/**
 * Generic HTTP POST wrapper with Firebase Auth token
 */
async function callApi<T, R>(
  endpoint: string,
  data: T
): Promise<R> {
  try {
    // Get Firebase Auth ID token
    const token = await getCurrentUserToken();

    const response = await fetch(`${FUNCTIONS_BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error (${response.status}):`, errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    return result as R;
  } catch (error: any) {
    console.error(`Error calling ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Team Statistics API
 * Get aggregated team stats for dashboard
 */
export interface GetTeamStatsRequest {
  date?: string; // YYYY-MM-DD (defaults to today)
  range?: 'today' | 'week' | 'month';
}

export interface GetTeamStatsResponse {
  ok: boolean;
  date: string;
  stats: {
    team: {
      total: number;
      present: number;
      absent: number;
      presentPercentage: number;
    };
    visits: {
      total: number;
      distributor: number;
      dealer: number;
      architect: number;
      OEM: number;
    };
    sheets: {
      total: number;
      byCatalog: {
        'Fine Decor': number;
        'Artvio': number;
        'Woodrica': number;
        'Artis 1MM': number;
      };
    };
    pending: {
      dsrs: number;
      expenses: number;
    };
  };
}

export const getTeamStats = (data: GetTeamStatsRequest) =>
  callApi<GetTeamStatsRequest, GetTeamStatsResponse>('getTeamStats', data);

/**
 * Users List API
 * Get list of all team members
 */
export interface GetUsersListRequest {}

export interface GetUsersListResponse {
  ok: boolean;
  users: Array<{
    id: string;
    name: string;
    phone: string;
    email?: string;
    role: string;
    territory?: string;
    isActive: boolean;
  }>;
}

export const getUsersList = (data: GetUsersListRequest) =>
  callApi<GetUsersListRequest, GetUsersListResponse>('getUsersList', data);

/**
 * User Stats API
 * Get detailed stats for a specific user
 */
export interface GetUserStatsRequest {
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface GetUserStatsResponse {
  ok: boolean;
  user: {
    id: string;
    name: string;
    phone: string;
    role: string;
    territory?: string;
  };
  stats: {
    attendance: {
      total: number;
      records: Array<{
        type: 'check_in' | 'check_out';
        timestamp: Date;
        geo: { latitude: number; longitude: number };
      }>;
    };
    visits: {
      total: number;
      byType: {
        distributor: number;
        dealer: number;
        architect: number;
        OEM: number;
      };
      records: Array<any>;
    };
    sheets: {
      total: number;
      byCatalog: {
        'Fine Decor': number;
        'Artvio': number;
        'Woodrica': number;
        'Artis 1MM': number;
      };
    };
    expenses: {
      total: number;
      byStatus: {
        pending: number;
        approved: number;
        rejected: number;
      };
      byCategory: {
        travel: number;
        food: number;
        accommodation: number;
        other: number;
      };
    };
  };
}

export const getUserStats = (data: GetUserStatsRequest) =>
  callApi<GetUserStatsRequest, GetUserStatsResponse>('getUserStats', data);

/**
 * DSR Review APIs
 */
export interface GetPendingDSRsRequest {
  status?: 'pending' | 'approved' | 'all';
}

export interface GetPendingDSRsResponse {
  ok: boolean;
  dsrs: Array<{
    id: string;
    userId: string;
    userName: string;
    date: string;
    checkInAt?: Date;
    checkOutAt?: Date;
    totalVisits: number;
    totalSheetsSold: number;
    totalExpenses: number;
    status: 'pending' | 'approved' | 'needs_revision';
    generatedAt: Date;
  }>;
}

export const getPendingDSRs = (data: GetPendingDSRsRequest) =>
  callApi<GetPendingDSRsRequest, GetPendingDSRsResponse>('getPendingDSRs', data);

export interface GetDSRDetailRequest {
  reportId: string;
}

export interface GetDSRDetailResponse {
  ok: boolean;
  dsr: {
    id: string;
    userId: string;
    userName: string;
    date: string;
    checkInAt?: Date;
    checkOutAt?: Date;
    totalVisits: number;
    visitIds: string[];
    sheetsSales: Array<{
      catalog: string;
      totalSheets: number;
    }>;
    totalSheetsSold: number;
    expenses: Array<{
      category: string;
      totalAmount: number;
    }>;
    totalExpenses: number;
    status: string;
    reviewedBy?: string;
    reviewedAt?: Date;
    managerComments?: string;
    generatedAt: Date;
  };
}

export const getDSRDetail = (data: GetDSRDetailRequest) =>
  callApi<GetDSRDetailRequest, GetDSRDetailResponse>('getDSRDetail', data);

export interface ReviewDSRRequest {
  reportId: string;
  status: 'approved' | 'needs_revision';
  comments?: string;
}

export interface ReviewDSRResponse {
  ok: boolean;
  message: string;
}

export const reviewDSR = (data: ReviewDSRRequest) =>
  callApi<ReviewDSRRequest, ReviewDSRResponse>('reviewDSR', data);

/**
 * Accounts APIs
 */
export interface GetAccountsListRequest {}

export interface GetAccountsListResponse {
  ok: boolean;
  accounts: Array<{
    id: string;
    name: string;
    type: 'distributor' | 'dealer' | 'architect' | 'OEM';
    phone: string;
    city: string;
    territory?: string;
    assignedRepUserId?: string;
    lastVisitAt?: Date;
  }>;
}

export const getAccountsList = (data: GetAccountsListRequest) =>
  callApi<GetAccountsListRequest, GetAccountsListResponse>('getAccountsList', data);

/**
 * Target Management APIs
 */
export interface SetTargetRequest {
  userId: string;
  month: string; // "2025-11"
  targetsByAccountType: {
    distributor: number;
    dealer: number;
    architect: number;
    OEM: number;
  };
  targetsByCatalog: {
    'Fine Decor': number;
    'Artvio': number;
    'Woodrica': number;
    'Artis 1MM': number;
  };
  autoRenew: boolean;
}

export interface SetTargetResponse {
  ok: boolean;
  message: string;
}

export const setTarget = (data: SetTargetRequest) =>
  callApi<SetTargetRequest, SetTargetResponse>('setTarget', data);

export interface GetTargetRequest {
  userId: string;
  month: string;
}

export interface GetTargetResponse {
  ok: boolean;
  target: {
    userId: string;
    month: string;
    targetsByAccountType: Record<string, number>;
    targetsByCatalog: Record<string, number>;
    autoRenew: boolean;
  } | null;
}

export const getTarget = (data: GetTargetRequest) =>
  callApi<GetTargetRequest, GetTargetResponse>('getTarget', data);
