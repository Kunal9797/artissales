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

// User List & Stats Types
export interface GetUsersListRequest {
  role?: 'rep' | 'area_manager' | 'zonal_head' | 'national_head' | 'admin';
  territory?: string;
  searchTerm?: string;
}

export interface UserListItem {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  territory: string;
  isActive: boolean;
  createdAt: string;
}

export interface GetUsersListResponse {
  ok: true;
  users: UserListItem[];
  count: number;
}

export interface GetUserStatsRequest {
  userId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface GetUserStatsResponse {
  ok: true;
  user: {
    id: string;
    name: string;
    role: string;
    territory: string;
    phone: string;
  };
  stats: {
    attendance: {
      total: number;
      records: Array<{
        id: string;
        type: string;
        timestamp: string;
        geo: { lat: number; lng: number } | null;
      }>;
    };
    visits: {
      total: number;
      byType: {
        distributor: number;
        dealer: number;
        architect: number;
      };
      records: Array<{
        id: string;
        accountName: string;
        accountType: string;
        purpose: string;
        timestamp: string;
      }>;
    };
    sheets: {
      total: number;
      byCatalog: {
        'Fine Decor': number;
        Artvio: number;
        Woodrica: number;
        Artis: number;
      };
    };
    expenses: {
      total: number;
      byStatus: {
        pending: number;
        approved: number;
        rejected: number;
      };
    };
  };
}

// API Response Types
export interface ApiResponse {
  ok: boolean;
  [key: string]: any;
}
