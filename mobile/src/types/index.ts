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
  purpose: 'sample_delivery' | 'follow_up' | 'complaint' | 'new_lead' | 'payment_collection' | 'site_visit' | 'other';
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
  catalog: 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis 1MM';
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
  primaryDistributorId?: string; // Optional distributor assignment
}

export interface CreateUserByManagerResponse {
  ok: true;
  userId: string;
  message: string;
}

// Account Management Types
export type AccountType = 'distributor' | 'dealer' | 'architect' | 'contractor';

export interface CreateAccountRequest {
  name: string;
  type: AccountType;
  contactPerson?: string;
  phone: string; // 10 digits
  email?: string;
  birthdate?: string; // YYYY-MM-DD (for dealers and architects)
  address?: string;
  city: string;
  state: string;
  pincode: string; // 6 digits
  parentDistributorId?: string;
}

export interface CreateAccountResponse {
  ok: true;
  accountId: string;
  message: string;
}

export interface GetAccountsListRequest {
  type?: AccountType;
}

export interface AccountListItem {
  id: string;
  name: string;
  type: AccountType;
  contactPerson?: string;
  phone: string;
  email?: string;
  birthdate?: string; // YYYY-MM-DD
  address?: string;
  city: string;
  state: string;
  pincode: string;
  territory: string;
  assignedRepUserId: string;
  parentDistributorId?: string;
  createdByUserId: string;
  lastVisitAt?: string;
}

export interface GetAccountsListResponse {
  ok: true;
  accounts: AccountListItem[];
}

export interface UpdateAccountRequest {
  accountId: string;
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  birthdate?: string; // YYYY-MM-DD
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  parentDistributorId?: string;
}

export interface UpdateAccountResponse {
  ok: true;
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

export interface GetPendingDSRsRequest {
  date?: string; // YYYY-MM-DD (optional)
  status?: 'pending' | 'approved' | 'needs_revision' | 'all'; // Optional status filter
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
        contractor: number;
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
    };
  };
}

// Target Types
export interface TargetsByCatalog {
  'Fine Decor'?: number;
  'Artvio'?: number;
  'Woodrica'?: number;
  'Artis 1MM'?: number;
}

export interface TargetsByAccountType {
  dealer?: number;
  architect?: number;
  contractor?: number;
}

export interface Target {
  id: string;
  userId: string;
  month: string; // YYYY-MM
  targetsByCatalog: TargetsByCatalog;
  targetsByAccountType?: TargetsByAccountType;
  autoRenew: boolean;
  sourceTargetId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TargetProgress {
  catalog: string;
  target: number;
  achieved: number;
  percentage: number;
}

export interface VisitProgress {
  accountType: 'dealer' | 'architect' | 'contractor';
  target: number;
  achieved: number;
  percentage: number;
}

// Target API Types
export interface SetTargetRequest {
  userId: string;
  month: string;
  targetsByCatalog: TargetsByCatalog;
  targetsByAccountType?: TargetsByAccountType;
  autoRenew: boolean;
  updateFutureMonths?: boolean;
}

export interface SetTargetResponse {
  ok: true;
  targetId: string;
  message: string;
}

export interface GetTargetRequest {
  userId: string;
  month: string;
}

export interface GetTargetResponse {
  ok: true;
  target: Target | null;
  progress?: TargetProgress[];
  visitProgress?: VisitProgress[];
}

export interface GetUserTargetsRequest {
  month: string;
}

export interface UserTargetSummary {
  userId: string;
  userName: string;
  territory: string;
  target: Target | null;
  progress: TargetProgress[];
  totalAchieved: number;
  totalTarget: number;
  overallPercentage: number;
}

export interface GetUserTargetsResponse {
  ok: true;
  targets: UserTargetSummary[];
}

export interface StopAutoRenewRequest {
  userId: string;
  month: string;
}

export interface StopAutoRenewResponse {
  ok: true;
  message: string;
}

// ============================================================================
// DOCUMENT LIBRARY TYPES
// ============================================================================

export type DocumentFileType = 'pdf' | 'image';

export interface Document {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  fileType: DocumentFileType;
  fileSizeBytes: number;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: string; // ISO timestamp string
}

export interface UploadDocumentRequest {
  name: string;
  description?: string;
  file: any; // File object (handled by FormData)
}

export interface UploadDocumentResponse {
  ok: true;
  documentId: string;
  fileUrl: string;
}

export interface GetDocumentsResponse {
  ok: true;
  documents: Document[];
}

export interface DeleteDocumentRequest {
  documentId: string;
}

export interface DeleteDocumentResponse {
  ok: true;
  message: string;
}

// ============================================================================
// INCENTIVE SCHEME TYPES
// ============================================================================

export type CatalogType = 'Fine Decor' | 'Artvio' | 'Woodrica' | 'Artis 1MM';

/**
 * Display name mapper for catalogs
 * Maps old database keys to new display names
 */
export function getCatalogDisplayName(catalog: string): string {
  if (catalog === 'Artis') return 'Artis 1MM';
  return catalog;
}

export interface IncentiveScheme {
  id: string;
  name: string;
  description: string;
  userIds: string[];
  territory?: string;
  type: 'sheets';
  catalog?: CatalogType;
  targetSheets: number;
  rewardAmount: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncentiveResult {
  id: string;
  schemeId: string;
  schemeName: string;
  userId: string;
  userName: string;
  actualSheets: number;
  targetSheets: number;
  qualified: boolean;
  rewardAmount: number;
  periodStart: string;
  periodEnd: string;
  calculatedAt: string;
}

export interface CreateIncentiveSchemeRequest {
  name: string;
  description: string;
  userIds: string[];
  territory?: string;
  catalog?: CatalogType;
  targetSheets: number;
  rewardAmount: number;
  startDate: string;
  endDate: string;
}

export interface CreateIncentiveSchemeResponse {
  ok: true;
  schemeId: string;
}

export interface ActiveSchemeWithProgress extends IncentiveScheme {
  currentSheets: number;
  progressPercent: number;
}

export interface GetActiveSchemesResponse {
  ok: true;
  schemes: ActiveSchemeWithProgress[];
}

export interface GetIncentiveResultsResponse {
  ok: true;
  results: IncentiveResult[];
  totalEarned: number;
}

// API Response Types
export interface ApiResponse {
  ok: boolean;
  [key: string]: any;
}
