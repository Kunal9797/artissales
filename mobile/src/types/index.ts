// API Request Types
export interface CheckInRequest {
  lat: number;
  lon: number;
  accuracyM: number;
  deviceInfo?: {
    isMocked: boolean;
    battery: number;
    timezone: string;
  };
}

export interface CheckOutRequest {
  lat: number;
  lon: number;
  accuracyM: number;
  deviceInfo?: {
    isMocked: boolean;
    battery: number;
    timezone: string;
  };
}

export interface LogVisitRequest {
  accountId: string;
  purpose: 'sample_delivery' | 'follow_up' | 'complaint' | 'new_lead' | 'payment_collection' | 'other';
  notes?: string;
  photos: string[]; // REQUIRED - Storage URLs (min 1)
}

// API Response Types
export interface ApiResponse {
  ok: boolean;
  [key: string]: any;
}
