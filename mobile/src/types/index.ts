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

// Individual expense item in a report
export interface ExpenseItem {
  amount: number; // In INR
  category: 'travel' | 'food' | 'accommodation' | 'other';
  categoryOther?: string; // Required when category is "other"
  description: string;
}

export interface SubmitExpenseRequest {
  date: string; // YYYY-MM-DD
  items: ExpenseItem[]; // Array of expense items
  receiptPhotos?: string[]; // Optional receipt photo URLs from Storage
  requestId?: string; // For idempotency
}

export interface LogSheetsSaleRequest {
  date: string; // YYYY-MM-DD
  catalog: 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis';
  sheetsCount: number;
  distributorId?: string;
  distributorName?: string;
  notes?: string;
}

// Manager API Types
export interface CreateUserByManagerRequest {
  phone: string; // 10-digit Indian mobile
  name: string;
  role: 'rep' | 'area_manager' | 'zonal_head' | 'national_head' | 'admin';
  territory: string;
}

export interface CreateUserByManagerResponse {
  ok: true;
  userId: string;
  message: string;
}

export interface ReviewDSRRequest {
  reportId: string;
  status: 'approved' | 'needs_revision';
  comments?: string;
}

export interface ReviewDSRResponse {
  ok: true;
  message: string;
}

// API Response Types
export interface ApiResponse {
  ok: boolean;
  [key: string]: any;
}
