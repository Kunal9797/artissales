# API Contracts

**Last Updated**: October 17, 2025
**Base URL**: `https://us-central1-artis-sales.cloudfunctions.net/api`
**Authentication**: Firebase Auth JWT (Bearer token)

---

## Overview

The Artis Sales App backend provides RESTful APIs via Cloud Functions for Firebase. All endpoints require authentication unless otherwise noted.

### API Organization

| Module | Endpoints | Purpose |
|--------|-----------|---------|
| `accounts.ts` | 4 functions | Account management (CRUD) |
| `attendance.ts` | 2 functions | Check-in/out tracking |
| `documents.ts` | 4 functions | Document management & offline caching |
| `dsrReview.ts` | 2 functions | DSR approval workflow |
| `expenses.ts` | 7 functions | Expense reporting & approval |
| `managerStats.ts` | 1 function | Team statistics & reports |
| `profile.ts` | 1 function | User profile updates |
| `sheetsSales.ts` | 4 functions | Sheet sales tracking |
| `targets.ts` | 4 functions | Target setting & tracking |
| `users.ts` | 4 functions | User management |
| `visits.ts` | 4 functions | Visit logging |

**Total**: 37 endpoints across 11 modules (verified by code inspection Oct 17, 2025)

> **Note**: This documents actual exported functions in code, not planned endpoints.

---

## Authentication

All API requests must include a Firebase Auth JWT token:

```
Authorization: Bearer <firebase-jwt-token>
```

### Getting a Token (Mobile App)
```typescript
import auth from '@react-native-firebase/auth';

const token = await auth().currentUser?.getIdToken();
```

### Error Responses
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token"
}
```

---

## 1. Accounts API (`accounts.ts`)

### 1.1 Create Account
```http
POST /api/accounts
```

**Request Body**:
```json
{
  "name": "Sharma Laminates Trading Co",
  "type": "dealer",
  "territory": "Delhi NCR",
  "assignedRepUserId": "rep456",
  "parentDistributorId": "dist789",
  "contactPerson": "Mr. Rajesh Sharma",
  "phone": "9876543210",
  "email": "sharma@example.com",
  "birthdate": "1975-05-15",
  "address": "Shop 45, Lajpat Nagar Market",
  "city": "New Delhi",
  "state": "Delhi",
  "pincode": "110024"
}
```

**Response** (201 Created):
```json
{
  "ok": true,
  "accountId": "acc123xyz",
  "message": "Account created successfully"
}
```

**Permissions**: Managers only

---

### 1.2 Get Account Details
```http
GET /api/accounts/:accountId
```

**Response** (200 OK):
```json
{
  "ok": true,
  "account": {
    "id": "acc123xyz",
    "name": "Sharma Laminates Trading Co",
    "type": "dealer",
    "territory": "Delhi NCR",
    "assignedRepUserId": "rep456",
    "contactPerson": "Mr. Rajesh Sharma",
    "phone": "+919876543210",
    "city": "New Delhi",
    "state": "Delhi",
    "status": "active",
    "lastVisitAt": "2025-10-15T14:30:00Z",
    "createdAt": "2025-09-01T10:00:00Z"
  }
}
```

**Permissions**: Authenticated users (filtered by territory/assignment)

---

### 1.3 Get Accounts List
```http
GET /api/accounts?type=dealer&territory=Delhi%20NCR&limit=50
```

**Query Parameters**:
- `type` (optional): Filter by account type
- `territory` (optional): Filter by territory
- `assignedRepUserId` (optional): Filter by assigned rep
- `limit` (optional): Max results (default: 50)

**Response** (200 OK):
```json
{
  "ok": true,
  "accounts": [
    {
      "id": "acc123",
      "name": "Sharma Laminates",
      "type": "dealer",
      "territory": "Delhi NCR",
      "contactPerson": "Mr. Sharma",
      "phone": "+919876543210",
      "status": "active"
    }
  ],
  "count": 1
}
```

**Permissions**: Reps see their accounts, managers see team's accounts

---

### 1.4 Update Account
```http
PUT /api/accounts/:accountId
```

**Request Body** (partial update supported):
```json
{
  "contactPerson": "Mr. Rahul Sharma",
  "phone": "9876543211",
  "status": "inactive"
}
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Account updated successfully"
}
```

**Permissions**: Managers only

---

### 1.5 Delete Account
```http
DELETE /api/accounts/:accountId
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Account deleted successfully"
}
```

**Permissions**: Managers only (soft delete - sets status to inactive)

---

### 1.6 Get Account Hierarchy
```http
GET /api/accounts/:accountId/hierarchy
```

**Response** (200 OK):
```json
{
  "ok": true,
  "hierarchy": {
    "distributor": {
      "id": "dist789",
      "name": "Main Distributor"
    },
    "dealers": [
      {"id": "acc123", "name": "Sharma Laminates"},
      {"id": "acc456", "name": "Kumar Traders"}
    ],
    "architects": [
      {"id": "acc789", "name": "Design Studio"}
    ]
  }
}
```

**Permissions**: Authenticated users

---

### 1.7 Get Account Visit History
```http
GET /api/accounts/:accountId/visits?limit=20
```

**Response** (200 OK):
```json
{
  "ok": true,
  "visits": [
    {
      "id": "visit123",
      "timestamp": "2025-10-17T14:30:00Z",
      "purpose": "follow_up",
      "repName": "Rajesh Kumar",
      "notes": "Discussed new catalog"
    }
  ],
  "count": 1
}
```

**Permissions**: Authenticated users

---

## 2. Attendance API (`attendance.ts`)

### 2.1 Check In
```http
POST /api/attendance/check-in
```

**Request Body**:
```json
{
  "lat": 28.6139,
  "lon": 77.2090,
  "accuracyM": 15,
  "deviceInfo": {
    "isMocked": false,
    "battery": 85,
    "timezone": "Asia/Kolkata"
  }
}
```

**Response** (201 Created):
```json
{
  "ok": true,
  "id": "att123",
  "timestamp": "2025-10-17T09:00:00Z"
}
```

**Validation**:
- `accuracyM` must be ≤ 100 meters
- Cannot check in if already checked in today
- GPS coordinates required

**Permissions**: Reps only

---

### 2.2 Check Out
```http
POST /api/attendance/check-out
```

**Request Body**: Same as check-in

**Response** (201 Created):
```json
{
  "ok": true,
  "id": "att124",
  "timestamp": "2025-10-17T18:00:00Z"
}
```

**Validation**:
- Must have checked in first
- Cannot check out twice

**Permissions**: Reps only

---

### 2.3 Get Today's Attendance
```http
GET /api/attendance/today
```

**Response** (200 OK):
```json
{
  "ok": true,
  "attendance": {
    "checkIn": {
      "timestamp": "2025-10-17T09:00:00Z",
      "location": {"lat": 28.6139, "lon": 77.2090},
      "accuracyM": 15
    },
    "checkOut": {
      "timestamp": "2025-10-17T18:00:00Z",
      "location": {"lat": 28.6140, "lon": 77.2091},
      "accuracyM": 12
    }
  }
}
```

**Permissions**: Rep sees their own, managers see team's

---

## 3. Documents API (`documents.ts`)

### 3.1 Upload Document
```http
POST /api/documents/upload
```

**Request** (multipart/form-data):
```
file: <PDF file>
title: "Artis Catalog 2025"
category: "catalogs"
description: "Latest product catalog"
```

**Response** (201 Created):
```json
{
  "ok": true,
  "documentId": "doc123",
  "downloadUrl": "https://storage.googleapis.com/..."
}
```

**Permissions**: Managers and admins only

---

### 3.2 Get Documents List
```http
GET /api/documents?category=catalogs&limit=50
```

**Response** (200 OK):
```json
{
  "ok": true,
  "documents": [
    {
      "id": "doc123",
      "title": "Artis Catalog 2025",
      "category": "catalogs",
      "downloadUrl": "https://...",
      "sizeBytes": 5242880,
      "uploadedAt": "2025-10-01T10:00:00Z",
      "uploadedBy": "admin123"
    }
  ],
  "count": 1
}
```

**Permissions**: All authenticated users

---

### 3.3 Download Document
```http
GET /api/documents/:documentId/download
```

**Response**: Redirects to signed Cloud Storage URL (valid for 1 hour)

**Permissions**: All authenticated users

---

### 3.4 Delete Document
```http
DELETE /api/documents/:documentId
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Document deleted successfully"
}
```

**Permissions**: Managers and admins only

---

### 3.5 Mark Document as Downloaded (Offline Tracking)
```http
POST /api/documents/:documentId/mark-downloaded
```

**Request Body**:
```json
{
  "deviceId": "device123"
}
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Document marked as downloaded"
}
```

**Permissions**: All authenticated users

---

### 3.6 Get Downloaded Documents (Offline Cache)
```http
GET /api/documents/downloaded
```

**Response** (200 OK):
```json
{
  "ok": true,
  "documents": [
    {
      "id": "doc123",
      "title": "Artis Catalog 2025",
      "downloadedAt": "2025-10-15T10:00:00Z"
    }
  ]
}
```

**Permissions**: Rep sees their own downloads

---

## 4. DSR Review API (`dsrReview.ts`)

### 4.1 Get Pending DSRs
```http
GET /api/dsr/pending?limit=50
```

**Response** (200 OK):
```json
{
  "ok": true,
  "dsrs": [
    {
      "id": "rep456_2025-10-17",
      "userId": "rep456",
      "repName": "Rajesh Kumar",
      "date": "2025-10-17",
      "totalVisits": 5,
      "totalSheetsSold": 80,
      "totalExpenses": 700,
      "status": "pending",
      "generatedAt": "2025-10-17T23:00:00Z"
    }
  ],
  "count": 1
}
```

**Permissions**: Managers only (filtered by team)

---

### 4.2 Get DSR Details
```http
GET /api/dsr/:reportId
```

**Response** (200 OK):
```json
{
  "ok": true,
  "dsr": {
    "id": "rep456_2025-10-17",
    "userId": "rep456",
    "repName": "Rajesh Kumar",
    "date": "2025-10-17",
    "checkInAt": "2025-10-17T09:00:00Z",
    "checkOutAt": "2025-10-17T18:00:00Z",
    "visits": [
      {
        "id": "visit123",
        "accountName": "Sharma Laminates",
        "purpose": "follow_up",
        "timestamp": "2025-10-17T14:30:00Z"
      }
    ],
    "sheetsSales": [
      {"catalog": "Artis", "totalSheets": 50},
      {"catalog": "Artvio", "totalSheets": 30}
    ],
    "expenses": [
      {"category": "travel", "totalAmount": 500},
      {"category": "food", "totalAmount": 200}
    ],
    "status": "pending"
  }
}
```

**Permissions**: Rep sees their own, managers see team's

---

### 4.3 Review DSR
```http
POST /api/dsr/:reportId/review
```

**Request Body**:
```json
{
  "status": "approved",
  "comments": "Good work! Keep it up."
}
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "DSR reviewed successfully"
}
```

**Validation**:
- `status` must be "approved" or "needs_revision"
- `comments` optional but recommended

**Permissions**: Managers only

---

## 5. Expenses API (`expenses.ts`)

### 5.1 Create Expense Report
```http
POST /api/expenses
```

**Request Body**:
```json
{
  "date": "2025-10-17",
  "items": [
    {
      "amount": 500,
      "category": "travel",
      "description": "Auto rickshaw - Home to market"
    },
    {
      "amount": 200,
      "category": "food",
      "description": "Lunch with dealer"
    }
  ],
  "receiptPhotos": [
    "https://storage.googleapis.com/..."
  ]
}
```

**Response** (201 Created):
```json
{
  "ok": true,
  "expenseId": "exp123",
  "totalAmount": 700
}
```

**Permissions**: Reps only

---

### 5.2 Get Expense History
```http
GET /api/expenses?startDate=2025-10-01&endDate=2025-10-31
```

**Response** (200 OK):
```json
{
  "ok": true,
  "expenses": [
    {
      "id": "exp123",
      "date": "2025-10-17",
      "totalAmount": 700,
      "status": "pending",
      "createdAt": "2025-10-17T18:00:00Z"
    }
  ],
  "totalAmount": 700,
  "count": 1
}
```

**Permissions**: Rep sees their own, managers see team's

---

### 5.3 Get Expense Details
```http
GET /api/expenses/:expenseId
```

**Response** (200 OK):
```json
{
  "ok": true,
  "expense": {
    "id": "exp123",
    "userId": "rep456",
    "date": "2025-10-17",
    "items": [
      {
        "amount": 500,
        "category": "travel",
        "description": "Auto rickshaw"
      }
    ],
    "totalAmount": 700,
    "receiptPhotos": ["https://..."],
    "status": "pending"
  }
}
```

**Permissions**: Rep sees their own, managers see team's

---

### 5.4 Update Expense
```http
PUT /api/expenses/:expenseId
```

**Request Body** (before approval):
```json
{
  "items": [
    {
      "amount": 600,
      "category": "travel",
      "description": "Updated amount"
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Expense updated successfully"
}
```

**Validation**: Can only update if status is "pending"

**Permissions**: Rep can update their own, managers can review

---

### 5.5 Delete Expense
```http
DELETE /api/expenses/:expenseId
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Expense deleted successfully"
}
```

**Validation**: Can only delete if status is "pending"

**Permissions**: Rep can delete their own

---

## 6. Manager Stats API (`managerStats.ts`)

### 6.1 Get Team Stats
```http
GET /api/manager/team-stats?startDate=2025-10-01&endDate=2025-10-31
```

**Response** (200 OK):
```json
{
  "ok": true,
  "teamStats": {
    "totalReps": 10,
    "activeToday": 8,
    "totalVisits": 150,
    "totalSheetsSold": 5000,
    "totalExpenses": 25000,
    "targetProgress": {
      "sheetsTarget": 10000,
      "sheetsSold": 5000,
      "percentComplete": 50
    }
  }
}
```

**Permissions**: Managers only

---

### 6.2 Get User Stats
```http
GET /api/manager/user-stats/:userId?month=2025-10
```

**Response** (200 OK):
```json
{
  "ok": true,
  "userStats": {
    "userId": "rep456",
    "name": "Rajesh Kumar",
    "month": "2025-10",
    "attendance": {
      "daysPresent": 20,
      "daysTotal": 22
    },
    "visits": {
      "completed": 45,
      "target": 50,
      "percentComplete": 90
    },
    "sheetsSales": {
      "sold": 900,
      "target": 1000,
      "percentComplete": 90
    },
    "expenses": {
      "totalAmount": 15000,
      "status": {
        "approved": 12000,
        "pending": 3000
      }
    }
  }
}
```

**Permissions**: Managers only

---

### 6.3 Get Top Performers
```http
GET /api/manager/top-performers?month=2025-10&metric=sheetsSold&limit=5
```

**Query Parameters**:
- `month`: YYYY-MM
- `metric`: "sheetsSold" | "visits" | "attendance"
- `limit`: Number of top performers (default: 5)

**Response** (200 OK):
```json
{
  "ok": true,
  "topPerformers": [
    {
      "userId": "rep456",
      "name": "Rajesh Kumar",
      "value": 1200,
      "rank": 1
    },
    {
      "userId": "rep789",
      "name": "Priya Sharma",
      "value": 1100,
      "rank": 2
    }
  ]
}
```

**Note**: Currently returns sample data (backend calculation pending)

**Permissions**: Managers only

---

### 6.4 Get Team Activity Timeline
```http
GET /api/manager/activity-timeline?date=2025-10-17
```

**Response** (200 OK):
```json
{
  "ok": true,
  "activities": [
    {
      "timestamp": "2025-10-17T09:00:00Z",
      "type": "check_in",
      "userId": "rep456",
      "userName": "Rajesh Kumar"
    },
    {
      "timestamp": "2025-10-17T14:30:00Z",
      "type": "visit",
      "userId": "rep456",
      "userName": "Rajesh Kumar",
      "accountName": "Sharma Laminates"
    }
  ],
  "count": 2
}
```

**Permissions**: Managers only

---

## 7. Profile API (`profile.ts`)

### 7.1 Get My Profile
```http
GET /api/profile
```

**Response** (200 OK):
```json
{
  "ok": true,
  "profile": {
    "id": "rep456",
    "name": "Rajesh Kumar",
    "phone": "+919876543210",
    "email": "rajesh@artislaminates.com",
    "role": "rep",
    "territory": "Delhi NCR",
    "reportsToUserId": "mgr123",
    "managerName": "Amit Verma"
  }
}
```

**Permissions**: All authenticated users

---

### 7.2 Update My Profile
```http
PUT /api/profile
```

**Request Body** (partial update):
```json
{
  "name": "Rajesh Kumar Singh",
  "email": "rajesh.new@artislaminates.com"
}
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Profile updated successfully"
}
```

**Validation**: Cannot update role, territory, or reportsToUserId

**Permissions**: All authenticated users

---

## 8. Sheets Sales API (`sheetsSales.ts`)

### 8.1 Log Sheet Sale
```http
POST /api/sheets-sales
```

**Request Body**:
```json
{
  "date": "2025-10-17",
  "catalog": "Artis",
  "sheetsCount": 50,
  "notes": "Bulk order from Sharma Laminates",
  "distributorId": "acc789"
}
```

**Response** (201 Created):
```json
{
  "ok": true,
  "saleId": "sale123"
}
```

**Validation**:
- `catalog` must be one of: "Fine Decor", "Artvio", "Woodrica", "Artis"
- `sheetsCount` must be > 0

**Permissions**: Reps only

---

### 8.2 Get Sales History
```http
GET /api/sheets-sales?startDate=2025-10-01&endDate=2025-10-31
```

**Response** (200 OK):
```json
{
  "ok": true,
  "sales": [
    {
      "id": "sale123",
      "date": "2025-10-17",
      "catalog": "Artis",
      "sheetsCount": 50,
      "verified": false,
      "createdAt": "2025-10-17T15:00:00Z"
    }
  ],
  "totalSheets": 50,
  "count": 1
}
```

**Permissions**: Rep sees their own, managers see team's

---

### 8.3 Update Sale
```http
PUT /api/sheets-sales/:saleId
```

**Request Body**:
```json
{
  "sheetsCount": 55,
  "notes": "Updated count after verification"
}
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Sale updated successfully"
}
```

**Permissions**: Rep can update their own (before verification)

---

### 8.4 Delete Sale
```http
DELETE /api/sheets-sales/:saleId
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Sale deleted successfully"
}
```

**Permissions**: Rep can delete their own (before verification)

---

## 9. Targets API (`targets.ts`)

### 9.1 Set Target
```http
POST /api/targets
```

**Request Body**:
```json
{
  "userId": "rep456",
  "month": "2025-10",
  "sheetsTarget": 1000,
  "visitsTarget": 50
}
```

**Response** (201 Created):
```json
{
  "ok": true,
  "targetId": "rep456_2025-10",
  "message": "Target set successfully"
}
```

**Permissions**: Managers only

---

### 9.2 Get Target
```http
GET /api/targets/:userId/:month
```

**Response** (200 OK):
```json
{
  "ok": true,
  "target": {
    "id": "rep456_2025-10",
    "userId": "rep456",
    "month": "2025-10",
    "sheetsTarget": 1000,
    "visitsTarget": 50,
    "sheetsSold": 450,
    "visitsCompleted": 28,
    "percentComplete": {
      "sheets": 45,
      "visits": 56
    }
  }
}
```

**Permissions**: Rep sees their own, managers see team's

---

### 9.3 Get Team Targets
```http
GET /api/targets/team?month=2025-10
```

**Response** (200 OK):
```json
{
  "ok": true,
  "targets": [
    {
      "userId": "rep456",
      "name": "Rajesh Kumar",
      "sheetsTarget": 1000,
      "sheetsSold": 450,
      "visitsTarget": 50,
      "visitsCompleted": 28
    }
  ],
  "count": 1
}
```

**Permissions**: Managers only

---

### 9.4 Update Target
```http
PUT /api/targets/:userId/:month
```

**Request Body**:
```json
{
  "sheetsTarget": 1200,
  "visitsTarget": 60
}
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Target updated successfully"
}
```

**Permissions**: Managers only

---

### 9.5 Delete Target
```http
DELETE /api/targets/:userId/:month
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Target deleted successfully"
}
```

**Permissions**: Managers only

---

## 10. Users API (`users.ts`)

### 10.1 Create User (Manager)
```http
POST /api/users
```

**Request Body**:
```json
{
  "phone": "9876543210",
  "name": "New Rep Name",
  "role": "rep",
  "territory": "Mumbai West",
  "primaryDistributorId": "dist123"
}
```

**Response** (201 Created):
```json
{
  "ok": true,
  "userId": "newrep123",
  "message": "User created successfully. Default password sent via SMS."
}
```

**Permissions**: Managers only

---

### 10.2 Get Users List
```http
GET /api/users?role=rep&territory=Delhi%20NCR
```

**Response** (200 OK):
```json
{
  "ok": true,
  "users": [
    {
      "id": "rep456",
      "name": "Rajesh Kumar",
      "phone": "+919876543210",
      "role": "rep",
      "territory": "Delhi NCR",
      "isActive": true
    }
  ],
  "count": 1
}
```

**Permissions**: Managers see their team, admins see all

---

### 10.3 Update User
```http
PUT /api/users/:userId
```

**Request Body**:
```json
{
  "name": "Updated Name",
  "territory": "New Territory",
  "isActive": false
}
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "User updated successfully"
}
```

**Permissions**: Managers only

---

### 10.4 Delete User
```http
DELETE /api/users/:userId
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "User deactivated successfully"
}
```

**Note**: Soft delete (sets isActive = false)

**Permissions**: Managers only

---

## 11. Visits API (`visits.ts`)

### 11.1 Log Visit
```http
POST /api/visits
```

**Request Body**:
```json
{
  "accountId": "acc789",
  "purpose": "follow_up",
  "notes": "Discussed new Artvio catalog",
  "photos": [
    "https://storage.googleapis.com/artis-sales/visits/photo1.jpg"
  ]
}
```

**Response** (201 Created):
```json
{
  "ok": true,
  "visitId": "visit123",
  "timestamp": "2025-10-17T14:30:00Z"
}
```

**Validation**:
- `photos` array must have at least 1 photo URL
- `purpose` must be valid enum value

**Permissions**: Reps only

---

### 11.2 Get Visit History
```http
GET /api/visits?startDate=2025-10-01&endDate=2025-10-31&limit=50
```

**Response** (200 OK):
```json
{
  "ok": true,
  "visits": [
    {
      "id": "visit123",
      "accountName": "Sharma Laminates",
      "accountType": "dealer",
      "purpose": "follow_up",
      "timestamp": "2025-10-17T14:30:00Z",
      "photos": ["https://..."]
    }
  ],
  "count": 1
}
```

**Permissions**: Rep sees their own, managers see team's

---

### 11.3 Get Visit Details
```http
GET /api/visits/:visitId
```

**Response** (200 OK):
```json
{
  "ok": true,
  "visit": {
    "id": "visit123",
    "userId": "rep456",
    "repName": "Rajesh Kumar",
    "accountId": "acc789",
    "accountName": "Sharma Laminates",
    "accountType": "dealer",
    "timestamp": "2025-10-17T14:30:00Z",
    "purpose": "follow_up",
    "notes": "Discussed new catalog",
    "photos": ["https://storage.googleapis.com/..."]
  }
}
```

**Permissions**: Rep sees their own, managers see team's

---

### 11.4 Delete Visit
```http
DELETE /api/visits/:visitId
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Visit deleted successfully"
}
```

**Permissions**: Rep can delete their own visits

---

## Error Handling

All endpoints follow consistent error response format:

### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Invalid request parameters",
  "details": {
    "sheetsCount": "Must be greater than 0"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid authentication token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "requestId": "abc123xyz"
}
```

---

## Rate Limiting

**Current**: No rate limiting enforced

**Future**: Consider implementing rate limiting:
- 100 requests/minute per user
- 1000 requests/hour per user
- Exponential backoff on repeated errors

---

## Idempotency

Some endpoints support idempotency via `requestId`:

```json
{
  "requestId": "unique-client-generated-id",
  ...otherFields
}
```

If the same `requestId` is sent twice, the second request returns the original response without creating a duplicate resource.

**Supported Endpoints**:
- POST /api/attendance/check-in
- POST /api/attendance/check-out
- POST /api/visits
- POST /api/sheets-sales
- POST /api/expenses

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters**:
- `limit`: Max results per page (default: 50, max: 100)
- `offset`: Number of results to skip
- `cursor`: Continuation token (future implementation)

**Example**:
```http
GET /api/visits?limit=20&offset=40
```

---

## Testing

**Postman Collection**: Create from this documentation
**Base URL (Dev)**: `https://us-central1-artis-sales-dev.cloudfunctions.net/api`
**Base URL (Prod)**: `https://us-central1-artis-sales.cloudfunctions.net/api`

---

**Related Documentation**:
- [Firestore Schema](FIRESTORE_SCHEMA.md) - Database structure
- [Security](SECURITY.md) - Authentication & authorization
- [Data Flow](DATA_FLOW.md) - How data moves through the system
