# Complete App Navigation Plan

**Date**: October 16, 2025
**Status**: Planning - Finalizing entire navigation structure

---

## 📋 Overview

This document defines the **complete navigation structure** for both roles (Sales Rep + Manager) including:
- Tab bar structure
- FAB actions
- Stack screens accessible from tabs
- Screen hierarchy
- Navigation patterns

---

## 🎯 Navigation Philosophy

### Core Principles
1. **Role-Based**: Different tabs for Sales Reps vs Managers
2. **Consistent Pattern**: Both roles use 5-tab bottom navigation
3. **Quick Actions**: Center FAB for most common actions
4. **Maximum 2 Taps**: Any feature accessible in ≤2 taps
5. **Clear Hierarchy**: Logical grouping of related screens

### Tab Structure (Both Roles)
```
┌──────┬──────┬──────┬──────┬──────┐
│ Tab1 │ Tab2 │ FAB  │ Tab3 │ Tab4 │
│      │      │  +   │      │      │
└──────┴──────┴──────┴──────┴──────┘
```

---

## 👤 SALES REP NAVIGATION

### ✅ Current Implementation (Complete)

#### Bottom Tabs (5 tabs)
1. **Home** 🏠
2. **Stats** 📊
3. **Log** ➕ (FAB - center button)
4. **Docs** 📄
5. **Me** 👤

#### 1. Home Tab 🏠
**Screen**: `HomeScreen_v2.tsx`

**Content**:
- Greeting bar
- Attendance status card (horizontal compact)
- Target progress card (monthly sales)
- Visit progress card (monthly visits)
- Activity timeline with edit buttons
- Pending action items (if any)

**Actions**:
- Tap attendance card → `AttendanceScreen`
- Tap edit button on timeline → Edit screens (Sheets/Visit/Expense)
- Tap progress card "Log" button → Opens FAB modal

**Stack Screens Accessible**:
- `AttendanceScreen` - Check in/out with GPS

#### 2. Stats Tab 📊
**Screen**: `StatsScreen.tsx`

**Content**:
- Month selector (previous/next)
- Target progress card
- Visit progress card
- **Pending approvals section** (NEW)
  - Pending expense reports count
  - Unverified sheet sales count
- Monthly KPI cards:
  - Total visits
  - Total sheets sold
  - Total expenses
  - Days worked

**Actions**:
- Pull to refresh
- Month navigation
- Tap progress card "Log" → Opens FAB modal

**Stack Screens Accessible**: None (self-contained)

#### 3. Log (FAB) ➕
**Component**: FAB Modal in `TabNavigator.tsx`

**Actions** (Bottom Sheet):
1. 📊 **Log Sheet Sales** → `SheetsEntry` (CompactSheetsEntryScreen)
2. 📍 **Log Visit** → `SelectAccount` → `LogVisit`
3. 💰 **Report Expense** → `ExpenseEntry` (ExpenseEntryScreen)

**Stack Screens Accessible**:
- `SheetsEntry` (CompactSheetsEntryScreen)
  - Can edit/delete via route params
- `SelectAccount` → `LogVisit` (LogVisitScreen)
  - Can edit/delete via route params
- `ExpenseEntry` (ExpenseEntryScreen)
  - Can edit/delete via route params

#### 4. Docs Tab 📄
**Screen**: `DocumentsScreen.tsx`

**Content**:
- Offline documents section (top)
- All documents list (flat)
- Download indicators
- Cache management

**Actions**:
- Pull to refresh
- Download document for offline
- Open document in viewer
- Manage downloads

**Stack Screens Accessible**:
- `ManageDownloadsScreen` - Manage cached documents

#### 5. Me Tab 👤
**Screen**: `ProfileScreen.tsx`

**Content**:
- Profile photo (future)
- Name (editable)
- Email (editable)
- Phone (read-only)
- Role display
- Territory display
- Save button (when changed)
- Logout button

**Actions**:
- Pull to refresh
- Edit name/email
- Save changes
- Logout

**Stack Screens Accessible**: None (self-contained)

### Sales Rep - Complete Screen List

**Tab Screens** (5):
1. ✅ HomeScreen_v2.tsx
2. ✅ StatsScreen.tsx
3. ✅ (FAB Modal)
4. ✅ DocumentsScreen.tsx
5. ✅ ProfileScreen.tsx

**Stack Screens** (6):
1. ✅ AttendanceScreen.tsx (from Home)
2. ✅ CompactSheetsEntryScreen.tsx (from FAB)
3. ✅ SelectAccountScreen.tsx (from FAB)
4. ✅ LogVisitScreen.tsx (from SelectAccount)
5. ✅ ExpenseEntryScreen.tsx (from FAB)
6. ✅ ManageDownloadsScreen.tsx (from Docs)

**Total**: 11 screens ✅ ALL COMPLETE

---

## 👔 MANAGER NAVIGATION

### 🎯 Proposed Implementation (Tab Style)

#### Bottom Tabs (5 tabs)
1. **Home** 🏠
2. **Team** 👥
3. **Actions** ➕ (FAB - center button)
4. **Review** ✅
5. **Me** 👤

### Detailed Tab Structure

#### 1. Home Tab 🏠
**Screen**: `ManagerHomeScreen.tsx` (REDESIGN)

**Content**:
- Greeting bar
- Quick stats cards (compact):
  - Team present today
  - Pending approvals count
  - Today's visits (team total)
  - Today's sales (team total)
- Today's alerts/highlights
- Top performers section (mini leaderboard)
- Quick action cards (flat list, not grid)

**Actions**:
- Tap stats card → Navigate to related tab
- Tap alert → Navigate to approval screen
- Tap performer → User detail screen
- Pull to refresh

**Stack Screens Accessible**:
- `UserDetailScreen` - Individual rep performance
- `SetTargetScreen` - Set monthly target for rep

**Design Changes Needed**:
- Redesign with DS v0.1 components
- Use KpiCard for stats
- Use Card for sections
- Apply feature colors
- Compact layout (not cluttered)
- Remove old menu cards (replaced by tabs)

#### 2. Team Tab 👥
**Screen**: `UserListScreen.tsx` (REDESIGN)

**Content**:
- Team member list (FlashList)
- Each card shows:
  - Name, role
  - Attendance status (checked in/out)
  - Today's activity count
  - Performance indicator
- Filter chips (All, Present, Absent)
- Search bar

**Actions**:
- Tap member → `UserDetailScreen`
- Filter by status
- Search by name
- Pull to refresh

**Stack Screens Accessible**:
- `UserDetailScreen` - Individual performance
- `SetTargetScreen` - Set target
- `AddUserScreen` - Add new user (from FAB)

**Design Changes Needed**:
- Apply FlashList (AccountsListScreen pattern)
- Use FiltersBar for status filter
- Use Badge for attendance status
- Feature colors (green=present, gray=absent)
- Modern card design

#### 3. Actions (FAB) ➕
**Component**: FAB Modal (NEW)

**Actions** (Bottom Sheet):
1. ➕ **Add User** → `AddUser`
2. 🎯 **Set Targets** → `TeamTargets`
3. 🏢 **Add Account** → `AddAccount`
4. 📊 **View Reports** → Quick reports modal

**Stack Screens Accessible**:
- `AddUserScreen` - Create new team member
- `TeamTargetsScreen` - View/set team targets
- `SetTargetScreen` - Set individual target (from Team Targets)
- `AddAccountScreen` - Create new customer account

#### 4. Review Tab ✅
**Screen**: `ReviewHomeScreen.tsx` (NEW - Dashboard)

**Content**:
- Pending approvals summary card
- Tabs for different review types:
  - **DSR** - Daily Sales Reports
  - **Expenses** - Expense approvals
  - **Accounts** - New account requests (future)
- List of pending items
- Quick approve/reject actions

**Actions**:
- Switch between review types (tabs)
- Tap item → Detail screen
- Quick actions (approve/reject)
- Pull to refresh

**Stack Screens Accessible**:
- `DSRApprovalListScreen` - All DSR pending
- `DSRApprovalDetailScreen` - Review specific DSR
- `ExpenseApprovalListScreen` - All expense pending (NEW)
- `ExpenseApprovalDetailScreen` - Review specific expense (NEW)
- `AccountsListScreen` - All accounts (already modern)

**Design Changes Needed**:
- Create new ReviewHomeScreen with tabs
- Use Tabs component for review types
- Use Badge for counts
- Feature colors (DSR=cyan, Expenses=orange)
- Quick action buttons

#### 5. Me Tab 👤
**Screen**: `ProfileScreen.tsx` (SHARED with Sales Rep)

**Content**: Same as sales rep
- Profile photo (future)
- Name (editable)
- Email (editable)
- Phone (read-only)
- Role display (shows "Area Manager" etc)
- Territory display
- Save button
- Logout button

**Actions**: Same as sales rep
- Pull to refresh
- Edit profile
- Save changes
- Logout

**Stack Screens Accessible**: None (self-contained)

### Manager - Complete Screen List

**Tab Screens** (5):
1. ⏳ ManagerHomeScreen.tsx (REDESIGN)
2. ⏳ UserListScreen.tsx → TeamScreen (RENAME + REDESIGN)
3. ⏳ (FAB Modal - NEW)
4. ⏳ ReviewHomeScreen.tsx (NEW)
5. ✅ ProfileScreen.tsx (SHARED)

**Stack Screens** (11):
1. ⏳ UserDetailScreen.tsx (REDESIGN)
2. ⏳ AddUserScreen.tsx (REDESIGN)
3. ⏳ SetTargetScreen.tsx (REDESIGN)
4. ⏳ TeamTargetsScreen.tsx (REDESIGN)
5. ✅ AccountsListScreen.tsx (ALREADY MODERN)
6. ⏳ AddAccountScreen.tsx (LIGHT REDESIGN)
7. ⏳ EditAccountScreen.tsx (LIGHT REDESIGN)
8. ⏳ DSRApprovalListScreen.tsx (REDESIGN)
9. ⏳ DSRApprovalDetailScreen.tsx (REDESIGN)
10. ❓ ExpenseApprovalListScreen.tsx (NEW - optional)
11. ❓ ExpenseApprovalDetailScreen.tsx (NEW - optional)

**Total**: 16 screens (5 tab + 11 stack)

---

## 🔀 Navigation Patterns

### Tab Navigation
```typescript
// TabNavigator wraps all tab screens
TabNavigator (5 tabs)
  ├── Tab 1: Home
  ├── Tab 2: Stats / Team
  ├── Tab 3: FAB Modal
  ├── Tab 4: Docs / Review
  └── Tab 5: Me
```

### Stack Navigation
```typescript
// RootNavigator wraps TabNavigator + stack screens
RootNavigator
  ├── TabNavigator (default)
  └── Stack Screens
      ├── Attendance
      ├── Log screens (Sheets, Visit, Expense)
      ├── User management (Add, Detail, SetTarget)
      ├── Account management (Add, Edit)
      ├── Approval screens (DSR, Expense)
      └── Settings screens (future)
```

### Role-Based Routing
```typescript
// In RootNavigator.tsx
if (user.role === 'rep') {
  return <TabNavigator type="sales" />
} else if (user.role === 'area_manager' || 'zonal_head' || 'national_head') {
  return <TabNavigator type="manager" />
}
```

---

## 📊 Navigation Options Analysis

### Option A: Shared TabNavigator ✅ RECOMMENDED
**Approach**: One TabNavigator component that adapts based on role

**Pros**:
- ✅ Single component to maintain
- ✅ Consistent navigation pattern
- ✅ Easy to add new roles (admin, etc)
- ✅ Shared code (Me tab is identical)

**Cons**:
- ⚠️ More complex conditional logic
- ⚠️ Need to handle different screens per tab

**Implementation**:
```typescript
// TabNavigator.tsx
export const TabNavigator = ({ userRole }: { userRole: string }) => {
  const isSalesRep = userRole === 'rep';
  const isManager = ['area_manager', 'zonal_head', 'national_head'].includes(userRole);

  return (
    <Tab.Navigator>
      <Tab.Screen name="HomeTab" component={isSalesRep ? HomeScreen_v2 : ManagerHomeScreen} />
      <Tab.Screen name="Tab2" component={isSalesRep ? StatsScreen : TeamScreen} />
      {/* FAB */}
      <Tab.Screen name="Tab4" component={isSalesRep ? DocumentsScreen : ReviewHomeScreen} />
      <Tab.Screen name="MeTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
```

### Option B: Separate TabNavigators
**Approach**: SalesRepTabNavigator + ManagerTabNavigator (separate components)

**Pros**:
- ✅ Clean separation of concerns
- ✅ Easier to understand each role's navigation
- ✅ Less conditional logic

**Cons**:
- ⚠️ Code duplication (Me tab, FAB structure, styling)
- ⚠️ Two components to maintain
- ⚠️ Changes need to be applied twice

### Option C: Config-Driven Navigation
**Approach**: Define navigation structure in config, render dynamically

**Pros**:
- ✅ Very flexible
- ✅ Easy to add new roles
- ✅ Navigation defined in one place

**Cons**:
- ⚠️ More complex to implement
- ⚠️ Harder to debug
- ⚠️ Over-engineering for 2 roles

---

## ✅ Recommended Approach

**Use Option A: Shared TabNavigator with role props**

**Reasoning**:
1. Only 2 roles (sales rep + manager)
2. 80% of navigation logic is identical
3. Me tab is literally the same
4. FAB pattern is the same (just different actions)
5. Easier to maintain one component
6. Can extract role-specific config to make it cleaner

**Implementation Strategy**:
```typescript
// 1. Create role configs
const SALES_REP_TABS = {
  tab1: { name: 'Home', icon: Home, component: HomeScreen_v2 },
  tab2: { name: 'Stats', icon: BarChart2, component: StatsScreen },
  tab4: { name: 'Docs', icon: Folder, component: DocumentsScreen },
  fabActions: [/* sales rep FAB actions */],
};

const MANAGER_TABS = {
  tab1: { name: 'Home', icon: Home, component: ManagerHomeScreen },
  tab2: { name: 'Team', icon: Users, component: TeamScreen },
  tab4: { name: 'Review', icon: CheckSquare, component: ReviewHomeScreen },
  fabActions: [/* manager FAB actions */],
};

// 2. TabNavigator uses config
export const TabNavigator = ({ userRole }) => {
  const config = userRole === 'rep' ? SALES_REP_TABS : MANAGER_TABS;
  // Render tabs from config
};
```

---

## 🎨 Design Consistency

### Common Elements (Both Roles)
- **Tab bar style**: Same dark brand color (`#393735`)
- **FAB style**: Same accent color (`#D4A944`)
- **Tab icons**: Same size (24px), Lucide icons
- **Tab labels**: Same typography
- **Me tab**: Identical screen

### Role-Specific Elements
**Sales Rep**:
- Feature colors on Home timeline
- Progress cards (sales-focused)
- Document-heavy (catalogs, price lists)

**Manager**:
- Team-focused colors (team presence, performance)
- Approval-focused (DSR, expenses)
- People-heavy (user cards, performance)

---

## 🚀 Implementation Plan

### Phase 1: Create Manager Tab Screens (NEW)
1. **ManagerHomeScreen redesign** (2-3 hours)
   - Remove old menu cards
   - Add KPI cards
   - Add alerts section
   - Add top performers
   - Apply DS v0.1

2. **TeamScreen** (rename UserListScreen) (2-3 hours)
   - Apply FlashList
   - Add filters
   - Add search
   - Modern card design
   - Apply DS v0.1

3. **ReviewHomeScreen** (NEW) (2-3 hours)
   - Create tabs for DSR/Expenses
   - List pending items
   - Quick actions
   - Apply DS v0.1

### Phase 2: Update Stack Screens (REDESIGN)
1. **UserDetailScreen** (1-2 hours)
   - Apply DS v0.1
   - Better data visualization
   - Charts/graphs

2. **AddUserScreen** (1 hour)
   - Apply DS v0.1
   - Form styling

3. **SetTargetScreen** (1 hour)
   - Apply DS v0.1
   - Better input UI

4. **TeamTargetsScreen** (1-2 hours)
   - Apply DS v0.1
   - Better overview

5. **DSRApprovalListScreen** (1-2 hours)
   - Apply FlashList
   - Filters
   - DS v0.1

6. **DSRApprovalDetailScreen** (1-2 hours)
   - Better layout
   - Quick approve/reject
   - DS v0.1

### Phase 3: Integrate with TabNavigator (1-2 hours)
1. Update TabNavigator to handle both roles
2. Create role config objects
3. Test navigation for both roles
4. Add FAB actions for manager

### Phase 4: Testing & Polish (2-3 hours)
1. Test all navigation flows
2. Test role switching
3. Polish animations
4. Fix any bugs

**Total Estimate**: 15-20 hours

---

## 📝 Open Questions

### Decision Points
1. **Expense Approvals**: Create separate screens or integrate into DSRApprovalDetailScreen?
   - **Option A**: Separate ExpenseApprovalListScreen + DetailScreen
   - **Option B**: Unified ApprovalDetailScreen that shows DSR or Expense based on type
   - **Recommendation**: Option B (unified, cleaner)

2. **Review Tab Structure**: Tabs or Sections?
   - **Option A**: Tabs component (DSR | Expenses | Accounts)
   - **Option B**: Segmented control (iOS style)
   - **Option C**: Filter chips (like FiltersBar)
   - **Recommendation**: Option A (Tabs - most native)

3. **Manager FAB Actions**: What actions?
   - Current list: Add User, Set Targets, Add Account, View Reports
   - **Question**: Any other frequent actions needed?

4. **Team Screen Name**: Keep "UserListScreen" or rename?
   - **Options**: TeamScreen, TeamMembersScreen, MyTeamScreen
   - **Recommendation**: TeamScreen (simple, clear)

---

## 🎯 Success Criteria

### Navigation Goals
- ✅ Any feature accessible in ≤2 taps
- ✅ Clear visual hierarchy
- ✅ Consistent patterns between roles
- ✅ Smooth transitions
- ✅ No dead ends (can always go back)

### User Experience Goals
- ✅ Sales reps know where to find everything
- ✅ Managers can approve items quickly
- ✅ Navigation feels native and familiar
- ✅ Tab badges show pending counts
- ✅ FAB actions are most common tasks

---

## 📚 Related Documents

- [SALES_REP_COMPLETE.md](SALES_REP_COMPLETE.md) - Sales rep implementation (complete)
- [CURRENT_SESSION.md](CURRENT_SESSION.md) - Current session state
- [NAVIGATION_PLAN.md](NAVIGATION_PLAN.md) - Original navigation plan
- [MANAGER_DASHBOARD_PLAN.md](MANAGER_DASHBOARD_PLAN.md) - Manager features

---

**Last Updated**: October 16, 2025
**Status**: Planning Complete - Ready for Manager Implementation
**Approved By**: Pending user review
**Next**: Review and approve, then implement Phase 1
