# Manager Dashboard Implementation Plan

**Date**: October 16, 2025
**Status**: Ready to Implement
**Approved**: YES

---

## 🎯 Executive Summary

Implementing manager dashboard with **5-tab bottom navigation** (NO FAB):
- Clean, direct access to all manager features
- Accounts gets its own prominent tab
- Consistent with sales rep navigation pattern
- All actions accessible via header buttons

---

## 📱 Manager Tab Structure - FINAL

### 5 Tabs (No FAB):
```
┌──────┬──────┬──────┬──────┬──────┐
│ Home │ Team │Accts │Review│  Me  │
│  🏠  │  👥  │  🏢  │  ✅  │  👤  │
└──────┴──────┴──────┴──────┴──────┘
```

| Tab | Name | Icon | Purpose |
|-----|------|------|---------|
| 1 | Home | 🏠 | Team dashboard, KPIs, alerts |
| 2 | Team | 👥 | Team members & management |
| 3 | Accounts | 🏢 | Customer accounts (dist/dealer/arch) |
| 4 | Review | ✅ | Approve DSRs & Expenses |
| 5 | Me | 👤 | Profile (shared with sales rep) |

---

## 📋 Detailed Tab Specifications

### Tab 1: 🏠 Home
**Screen**: `ManagerHomeScreen.tsx` (REDESIGN)

**Content**:
```
┌─────────────────────────────────┐
│ 🏠 Artis          Good morning  │
│                      [Name] 👤  │
├─────────────────────────────────┤
│ Today's Overview                │
│                                 │
│ ┌──────────┐ ┌──────────┐     │
│ │ 8/10     │ │   3      │     │ ← KPI Cards
│ │ Present  │ │ Pending  │     │
│ └──────────┘ └──────────┘     │
│                                 │
│ ┌──────────┐ ┌──────────┐     │
│ │   24     │ │ 1,250    │     │
│ │ Visits   │ │ Sheets   │     │
│ └──────────┘ └──────────┘     │
│                                 │
│ 🔔 Alerts (2)                   │
│ • Rahul hasn't checked in      │
│ • 2 expense reports need review│
│                                 │
│ 🏆 Top Performers Today         │
│ 1. Kunal - 5 visits             │
│ 2. Amit - 3 visits              │
│ 3. Rahul - 2 visits             │
│                                 │
│ 📚 Documents & Resources        │
│ • Product Catalogs              │
│ • Price Lists                   │
│ • Sales Reports                 │
│ [View All Documents >]          │
└─────────────────────────────────┘
```

**Design Elements**:
- Minimal greeting bar (dark brand color)
- 4 KPI cards in 2x2 grid
- Alert section with badges
- Top performers mini-leaderboard
- **Documents section** (Card with link to DocumentsScreen)
- Pull-to-refresh

**Actions**:
- Tap KPI card → Navigate to relevant tab
- Tap alert → Navigate to detail
- Tap performer → UserDetailScreen
- Pull to refresh all data

**Stack Screens Accessible**:
- `UserDetailScreen` - Individual rep performance

**Implementation**:
- Remove old menu cards completely
- Use KpiCard component (4 cards)
- Use Card for alerts section
- Use Card for top performers
- Feature colors for KPIs (attendance=green, visits=blue, sheets=purple)
- Real-time data fetching
- Loading skeleton states

---

### Tab 2: 👥 Team
**Screen**: `TeamScreen.tsx` (RENAME + REDESIGN `UserListScreen`)

**Content**:
```
┌─────────────────────────────────┐
│ Team                  [+ Add]   │ ← Header with Add button
├─────────────────────────────────┤
│ [Search team members...]        │
│ [All] [Present] [Absent]        │ ← Filter chips
│                                 │
│ 🟢 Kunal Gupta                  │
│    Sales Rep • Delhi            │
│    ✓ Checked in at 9:15 AM     │
│    3 visits • 250 sheets today  │
│    [View Details >]             │
├─────────────────────────────────┤
│ 🟢 Amit Kumar                   │
│    Sales Rep • Mumbai           │
│    ✓ Checked in at 9:00 AM     │
│    2 visits • 180 sheets today  │
│    [View Details >]             │
├─────────────────────────────────┤
│ ⚪ Rahul Sharma                 │
│    Sales Rep • Bangalore        │
│    ✗ Not checked in yet         │
│    [View Details >]             │
└─────────────────────────────────┘
```

**Design Elements**:
- Dark brand header with [+ Add] button (top-right)
- Search bar (real-time search)
- Filter chips using FiltersBar pattern
- FlashList for performance (AccountsListScreen pattern)
- Team member cards with:
  - Status indicator (🟢 present, ⚪ absent)
  - Name, role, territory
  - Attendance status
  - Today's activity summary
- Pull-to-refresh

**Actions**:
- [+ Add] button → `AddUserScreen`
- Search by name
- Filter by status (All/Present/Absent)
- Tap member → `UserDetailScreen`
- Pull to refresh

**Stack Screens Accessible**:
- `AddUserScreen` - Create new team member
- `UserDetailScreen` - Individual performance & details
- `SetTargetScreen` - Set monthly target (from UserDetail)

**Implementation**:
- Rename file: `UserListScreen.tsx` → `TeamScreen.tsx`
- Apply FlashList (follow AccountsListScreen pattern)
- Add search functionality (filter local data)
- Add FiltersBar with chips [All] [Present] [Absent]
- Use Badge for status (green=present, gray=absent)
- Real-time Firestore listener for attendance status
- Compact card design (not full-screen cards)

---

### Tab 3: 🏢 Accounts
**Screen**: `AccountsListScreen.tsx` (ALREADY MODERN! Just add to tabs)

**Content**:
```
┌─────────────────────────────────┐
│ Accounts              [+ Add]   │ ← Header with Add button
├─────────────────────────────────┤
│ [Search accounts...]            │
│ [All] [Distributors] [Dealers] [Architects] │
│                                 │
│ 🏭 ABC Distributors             │
│    Distributor • Delhi          │
│    Last visit: 2 days ago       │
│    5 visits this month          │
│    [View Details >]             │
├─────────────────────────────────┤
│ 🏪 XYZ Laminates                │
│    Dealer • Mumbai              │
│    Last visit: 5 days ago       │
│    3 visits this month          │
│    [View Details >]             │
├─────────────────────────────────┤
│ 🏗️ Design Studio Pvt Ltd       │
│    Architect • Bangalore        │
│    Last visit: 10 days ago      │
│    2 visits this month          │
│    [View Details >]             │
└─────────────────────────────────┘
```

**Design Elements**:
- Dark brand header with [+ Add] button
- Search bar (already implemented)
- Filter chips by type (already implemented)
- FlashList (already implemented)
- Account cards with:
  - Type icon (factory/store/building)
  - Name, type, location
  - Last visit date
  - Visit count this month
- Pull-to-refresh (already implemented)

**Actions**:
- [+ Add] button → `AddAccountScreen`
- Search by name
- Filter by type (Distributor/Dealer/Architect)
- Tap account → `AccountDetailScreen` (NEW!)
- Pull to refresh

**Stack Screens Accessible**:
- `AddAccountScreen` - Create new account
- `EditAccountScreen` - Edit existing account (from AccountDetail)
- `AccountDetailScreen` - **NEW SCREEN** (see details below)

**Implementation**:
- ✅ Screen already modern with DS v0.1
- ✅ FlashList already implemented
- ✅ Search already working
- ✅ Filters already working
- ➕ Add [+ Add] button to header
- ➕ Add visit count to cards
- ➕ Create new `AccountDetailScreen` (see below)

---

### 🆕 NEW SCREEN: AccountDetailScreen

**Purpose**: View complete account information including visit history

**Content**:
```
┌─────────────────────────────────┐
│ ← Account Details      [Edit]   │
├─────────────────────────────────┤
│ 🏭 ABC Distributors             │
│                                 │
│ Account Information             │
│ ┌─────────────────────────────┐ │
│ │ Type: Distributor           │ │
│ │ Contact: Rajesh Kumar       │ │
│ │ Phone: +91 98765 43210      │ │
│ │ Email: raj@abc.com          │ │
│ │ Address: 123 Main St        │ │
│ │ City: Delhi, Delhi          │ │
│ │ Pincode: 110001             │ │
│ │ Territory: North            │ │
│ │                             │ │
│ │ Created: Oct 1, 2025        │ │
│ │ Created By: Kunal Gupta     │ │ ← Shows who created
│ │ Assigned To: Amit Kumar     │ │
│ └─────────────────────────────┘ │
│                                 │
│ Visit History (5 visits)        │
│ ┌─────────────────────────────┐ │
│ │ Oct 16, 2025                │ │
│ │ By: Amit Kumar              │ │
│ │ Purpose: Follow-up          │ │
│ │ Notes: Discussed new...     │ │
│ │ [View Photo]                │ │
│ ├─────────────────────────────┤ │
│ │ Oct 14, 2025                │ │
│ │ By: Amit Kumar              │ │
│ │ Purpose: Sample delivery    │ │
│ │ Notes: Delivered 10...      │ │
│ │ [View Photo]                │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Design Elements**:
- Dark header with back button and [Edit] button
- Account info card (read-only):
  - All account details
  - **Created by** info (user name + date)
  - Assigned rep info
- Visit history section:
  - Timeline of all visits to this account
  - Each visit shows:
    - Date & time
    - Rep who visited
    - Purpose
    - Notes (truncated)
    - Photo thumbnail (if exists)
  - Most recent first
  - Paginated (load more)
- Pull-to-refresh

**Actions**:
- [Edit] button → `EditAccountScreen`
- Tap visit → Expand to see full notes
- Tap photo → View full-size image
- Pull to refresh visit history

**Implementation Details**:
```typescript
// File: mobile/src/screens/manager/AccountDetailScreen.tsx

interface AccountDetailScreenProps {
  route: {
    params: {
      accountId: string;
    };
  };
  navigation: any;
}

// Fetch:
// 1. Account data from accounts/{accountId}
// 2. Created by user name from users/{createdByUserId}
// 3. Visit history from visits collection where accountId == accountId
//    - Order by timestamp descending
//    - Fetch rep names from users collection
//    - Load 10 at a time (pagination)

// Display:
// - Account info card (Card component)
// - Visit history list (FlashList)
// - Each visit card uses feature color (visits.primary = blue)
```

---

### Tab 4: ✅ Review
**Screen**: `ReviewHomeScreen.tsx` (NEW)

**Content**:
```
┌─────────────────────────────────┐
│ Review                     (5)  │ ← Badge shows total pending
├─────────────────────────────────┤
│  DSR  | Expenses | Accounts     │ ← Tabs (using Tabs component)
│ ═════                           │
│                                 │
│ 📋 Kunal's DSR - Oct 16        │
│    3 visits, 250 sheets         │
│    [Review >]                   │
├─────────────────────────────────┤
│ 📋 Rahul's DSR - Oct 16        │
│    5 visits, 180 sheets         │
│    [Review >]                   │
├─────────────────────────────────┤
│ 📋 Amit's DSR - Oct 16         │
│    2 visits, 180 sheets         │
│    [Review >]                   │
└─────────────────────────────────┘

Tap "Expenses" tab:
┌─────────────────────────────────┐
│ Review                     (2)  │
├─────────────────────────────────┤
│  DSR  | Expenses | Accounts     │
│        ═════════                │
│                                 │
│ 💰 Kunal - Travel Expense      │
│    ₹2,500 • Oct 16             │
│    [Review >]                   │
├─────────────────────────────────┤
│ 💰 Rahul - Client Meeting      │
│    ₹1,800 • Oct 15             │
│    [Review >]                   │
└─────────────────────────────────┘
```

**Design Elements**:
- Dark header with pending count badge
- Tabs component for switching (DSR | Expenses | Accounts)
- List of pending items (changes based on active tab)
- Pull-to-refresh

**Tab 1: DSR**
- List of pending DSRs
- Shows: Rep name, date, summary stats
- Tap → `DSRApprovalDetailScreen`

**Tab 2: Expenses**
- List of pending expense reports
- Shows: Rep name, total amount, date
- Tap → `ApprovalDetailScreen` (unified, shows expense)

**Tab 3: Accounts** (Future)
- List of new accounts pending approval
- Future feature

**Actions**:
- Switch between tabs
- Tap item → Detail screen for approval
- Pull to refresh

**Stack Screens Accessible**:
- `DSRApprovalDetailScreen` - Review & approve/reject DSR
- `ApprovalDetailScreen` - Unified screen for expense approval

**Implementation**:
- Create new ReviewHomeScreen component
- Use Tabs component from DS v0.1
- Fetch pending counts for badge
- FlashList for each tab's content
- Feature colors (DSR=cyan, Expenses=orange)

---

### Tab 5: 👤 Me
**Screen**: `ProfileScreen.tsx` (SHARED - already complete)

**Content**: Same as sales rep
- Profile picture (future)
- Name (editable)
- Email (editable)
- Phone (read-only)
- Role: Shows "Area Manager" / "Zonal Head" / "National Head"
- Territory
- Save button (when changed)
- Logout button

**No changes needed** - Already complete and working!

---

## 🗂️ Complete Screen List

### Tab Screens (5)
1. ⏳ `ManagerHomeScreen.tsx` - REDESIGN
2. ⏳ `TeamScreen.tsx` - RENAME + REDESIGN (was UserListScreen)
3. ✅ `AccountsListScreen.tsx` - Already modern (add [+ Add] button)
4. ⏳ `ReviewHomeScreen.tsx` - NEW
5. ✅ `ProfileScreen.tsx` - Already complete

### Stack Screens (12)
1. ⏳ `UserDetailScreen.tsx` - REDESIGN
2. ⏳ `AddUserScreen.tsx` - REDESIGN
3. ⏳ `SetTargetScreen.tsx` - REDESIGN
4. ⏳ `TeamTargetsScreen.tsx` - REDESIGN (accessible from UserDetail)
5. ✅ `AccountsListScreen.tsx` - Already modern
6. ⏳ `AddAccountScreen.tsx` - LIGHT REDESIGN (add to header button)
7. ⏳ `EditAccountScreen.tsx` - LIGHT REDESIGN
8. 🆕 `AccountDetailScreen.tsx` - **NEW** (account info + visit history)
9. ⏳ `DSRApprovalDetailScreen.tsx` - REDESIGN
10. ⏳ `ApprovalDetailScreen.tsx` - NEW (unified DSR/Expense approval)
11. ⏳ `ExpenseApprovalListScreen.tsx` - Optional (if separate from Review)
12. ⏳ `ExpenseApprovalDetailScreen.tsx` - Optional (if separate)

**Total**: 17 screens (5 tab + 12 stack)

---

## 🚀 Implementation Phases

### Phase 1: Core Tab Screens (8-10 hours)

#### 1.1 ManagerHomeScreen Redesign (2-3 hours)
**Files**: `mobile/src/screens/manager/ManagerHomeScreen.tsx`

**Tasks**:
- ✅ Remove old menu cards
- ➕ Add greeting bar (minimal, like sales rep)
- ➕ Add 4 KPI cards (2x2 grid):
  - Team present/total
  - Pending approvals count
  - Today's team visits
  - Today's team sheets
- ➕ Add alerts section (Card component)
- ➕ Add top performers section (Card component)
- ➕ Apply DS v0.1 components
- ➕ Add pull-to-refresh
- ➕ Add navigation to details

**API Calls**:
- Fetch team attendance status
- Fetch pending approval counts
- Fetch today's team activity
- Fetch top performers (sort by visit count)

#### 1.2 TeamScreen Redesign (2-3 hours)
**Files**:
- Rename: `UserListScreen.tsx` → `TeamScreen.tsx`
- Update: `RootNavigator.tsx` imports

**Tasks**:
- ➕ Add [+ Add] button to header
- ➕ Add search functionality
- ➕ Add filter chips (All/Present/Absent)
- ➕ Apply FlashList (AccountsListScreen pattern)
- ➕ Add status indicators (🟢/⚪)
- ➕ Add today's activity summary to cards
- ➕ Apply DS v0.1 components
- ➕ Add pull-to-refresh

**API Calls**:
- Real-time listener for users collection
- Fetch attendance status for today
- Fetch today's activity per user

#### 1.3 AccountsListScreen Updates (30 min)
**Files**: `mobile/src/screens/manager/AccountsListScreen.tsx`

**Tasks**:
- ➕ Add [+ Add] button to header
- ➕ Add visit count to account cards
- ➕ Add navigation to AccountDetailScreen
- ✅ Already has FlashList, search, filters

#### 1.4 ReviewHomeScreen Creation (2-3 hours)
**Files**: `mobile/src/screens/manager/ReviewHomeScreen.tsx` (NEW)

**Tasks**:
- ➕ Create new screen
- ➕ Add Tabs component (DSR | Expenses | Accounts)
- ➕ Add pending count badge in header
- ➕ Fetch pending DSRs
- ➕ Fetch pending expenses
- ➕ Create list views for each tab
- ➕ Add navigation to detail screens
- ➕ Apply DS v0.1 components
- ➕ Add pull-to-refresh

**API Calls**:
- Fetch DSRs where status='pending'
- Fetch expenses where status='pending'
- Count pending items for badge

#### 1.5 Update TabNavigator (1 hour)
**Files**: `mobile/src/navigation/TabNavigator.tsx`

**Tasks**:
- ➕ Add role detection logic
- ➕ Create manager tab configuration
- ➕ Wire up manager screens to tabs
- ➕ Remove FAB for managers
- ➕ Test navigation switching

---

### Phase 2: New Screens (4-6 hours)

#### 2.1 AccountDetailScreen Creation (2-3 hours)
**Files**: `mobile/src/screens/manager/AccountDetailScreen.tsx` (NEW)

**Tasks**:
- ➕ Create new screen
- ➕ Fetch account data
- ➕ Fetch created by user info
- ➕ Fetch visit history
- ➕ Display account info card
- ➕ Display visit history list (FlashList)
- ➕ Add [Edit] button → EditAccountScreen
- ➕ Add photo viewer for visit photos
- ➕ Apply DS v0.1 components
- ➕ Add pull-to-refresh
- ➕ Add pagination (load 10 visits at a time)

**API Calls**:
```typescript
// Fetch account
const accountDoc = await firestore()
  .collection('accounts')
  .doc(accountId)
  .get();

// Fetch created by user name
const createdByDoc = await firestore()
  .collection('users')
  .doc(accountDoc.data().createdByUserId)
  .get();

// Fetch visit history
const visitsQuery = firestore()
  .collection('visits')
  .where('accountId', '==', accountId)
  .orderBy('timestamp', 'desc')
  .limit(10);

// For each visit, fetch rep name
const repDoc = await firestore()
  .collection('users')
  .doc(visit.userId)
  .get();
```

**Design**:
- Account info Card (elevation="md")
- Visit history section title
- Visit cards (compact, blue theme)
- Each visit shows:
  - Date badge
  - Rep name with avatar placeholder
  - Purpose badge
  - Notes (truncated to 2 lines)
  - Photo thumbnail
- Load more button at bottom

#### 2.2 ApprovalDetailScreen Updates (2-3 hours)
**Files**: `mobile/src/screens/manager/ApprovalDetailScreen.tsx` (NEW or update DSRApprovalDetailScreen)

**Tasks**:
- ➕ Create unified approval screen
- ➕ Detect type (DSR or Expense)
- ➕ Fetch appropriate data
- ➕ Display in appropriate format
- ➕ Add approve/reject buttons
- ➕ Add comment field for rejection
- ➕ Apply DS v0.1 components

**OR** - Keep separate:
- Update DSRApprovalDetailScreen with DS v0.1
- Create ExpenseApprovalDetailScreen

---

### Phase 3: Stack Screen Redesigns (6-8 hours)

#### 3.1 UserDetailScreen Redesign (1-2 hours)
- Apply DS v0.1 components
- Better data visualization
- Add charts for performance trends
- Add [Set Target] button

#### 3.2 AddUserScreen Redesign (1 hour)
- Apply DS v0.1 form components
- Better validation feedback
- Modern styling

#### 3.3 SetTargetScreen Redesign (1 hour)
- Apply DS v0.1 components
- Better input UI with progress preview

#### 3.4 TeamTargetsScreen Redesign (1 hour)
- Apply DS v0.1 components
- Better team overview
- Add charts

#### 3.5 DSRApprovalDetailScreen Redesign (1-2 hours)
- Apply DS v0.1 components
- Better layout for approval actions
- Quick approve/reject buttons
- Comment section for feedback

#### 3.6 Minor Updates (1-2 hours)
- AddAccountScreen - light styling updates
- EditAccountScreen - light styling updates

---

### Phase 4: Integration & Testing (2-3 hours)

#### 4.1 TabNavigator Integration
- Wire all screens to TabNavigator
- Test navigation between tabs
- Test stack navigation from each tab
- Verify role-based routing

#### 4.2 Testing
- Test as manager role
- Test all navigation flows
- Test all CRUD operations
- Test pull-to-refresh on all screens
- Test search and filters

#### 4.3 Polish
- Fix any layout issues
- Adjust spacing/colors
- Test on device
- Performance testing

---

## ⏱️ Time Estimate

| Phase | Tasks | Hours |
|-------|-------|-------|
| Phase 1 | Core Tab Screens | 8-10 hours |
| Phase 2 | New Screens (AccountDetail, etc) | 4-6 hours |
| Phase 3 | Stack Screen Redesigns | 6-8 hours |
| Phase 4 | Integration & Testing | 2-3 hours |
| **Total** | **All Manager Dashboard** | **20-27 hours** |

---

## 🎨 Design System Usage

### Components to Use
- ✅ Card (elevation="md" for main cards)
- ✅ Badge (for status, counts)
- ✅ KpiCard (for stats on Home)
- ✅ Tabs (for Review screen)
- ✅ FiltersBar (for Team, Accounts)
- ✅ FlashList (for all lists)

### Feature Colors
- 🟢 Attendance: `#2E7D32` (team presence)
- 🔵 Visits: `#1976D2` (visit history)
- 🟣 Sheets: `#7B1FA2` (sales metrics)
- 🟠 Expenses: `#E65100` (expense approvals)
- 🔷 DSR: `#0277BD` (DSR approvals)
- ⚫ Documents: `#546E7A` (accounts)

---

## 📊 Key Features

### Manager-Specific Features
1. **Team Monitoring**
   - Real-time attendance status
   - Today's activity per rep
   - Top performers leaderboard

2. **Approvals**
   - DSR approval workflow
   - Expense approval workflow
   - Unified approval interface

3. **Account Management**
   - View all customer accounts
   - See visit history per account
   - Track account creation & ownership
   - See who visited when

4. **User Management**
   - Add/edit team members
   - Set monthly targets
   - View individual performance

5. **Insights**
   - Team performance metrics
   - Alerts for issues (no check-in, etc)
   - Quick action items

---

## ✅ Success Criteria

### Functionality
- ✅ All manager features accessible in ≤2 taps
- ✅ Can approve/reject items quickly
- ✅ Can monitor team in real-time
- ✅ Can view complete account history
- ✅ Can manage users and targets

### Design
- ✅ All screens use DS v0.1 components
- ✅ Consistent feature colors
- ✅ Modern, clean layouts
- ✅ Pull-to-refresh everywhere
- ✅ Loading states with skeletons

### Performance
- ✅ FlashList on all long lists
- ✅ Real-time updates where needed
- ✅ Fast navigation (no lag)
- ✅ Smooth scrolling

---

## 📝 Notes

### Account Detail - Visit History
- Shows complete visit timeline for an account
- Managers can see which rep visited when
- Helps track account engagement
- Can identify accounts that need attention (no recent visits)
- Each visit shows photo proof (counter photo)

### No FAB Approach
- Cleaner navigation
- All features directly accessible
- Standard mobile pattern (action buttons in headers)
- Less cognitive load (don't need to remember FAB actions)

### Shared Components
- ProfileScreen is identical for both roles
- Same theme system
- Same navigation pattern (5 tabs)
- Consistent user experience

---

**Last Updated**: October 16, 2025
**Status**: Ready to implement
**Next**: Start with Phase 1 - Core Tab Screens
