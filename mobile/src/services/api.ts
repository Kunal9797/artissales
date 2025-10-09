import { getAuthToken } from './firebase';
import { CheckInRequest, CheckOutRequest, LogVisitRequest } from '../types';

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
};
