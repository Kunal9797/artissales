# Manager Dashboard Implementation - Handoff Prompt

**Date**: October 16, 2025
**Project**: Artis Field Sales App
**Current State**: Sales Rep Dashboard 100% Complete, Manager Dashboard Needs Modernization

---

## 📋 Quick Context

You're continuing work on the Artis Field Sales App. The **sales rep dashboard is 100% complete** with modern design, bottom tab navigation, and full CRUD functionality. Now we need to **modernize the manager dashboard** with a similar tab-based approach.

---

## 🎯 Your Task

Implement a modern 5-tab manager dashboard following the detailed plan in `MANAGER_DASHBOARD_IMPLEMENTATION.md`. The work is divided into 4 phases (20-27 hours total).

**Start with Phase 1**: Redesign the 4 main tab screens.

---

## 📚 Essential Files to Read (In Order)

### 1. Context & Planning Documents
Read these first to understand the full picture:

1. **[MANAGER_DASHBOARD_IMPLEMENTATION.md](MANAGER_DASHBOARD_IMPLEMENTATION.md)** ⭐ PRIMARY SPEC
   - Complete implementation plan (4 phases)
   - Detailed screen specifications
   - API endpoints needed
   - Time estimates

2. **[COMPLETE_NAVIGATION_PLAN.md](COMPLETE_NAVIGATION_PLAN.md)**
   - Full app navigation structure
   - Sales rep tabs (complete) vs Manager tabs (to implement)
   - Navigation decisions made

3. **[SALES_REP_COMPLETE.md](SALES_REP_COMPLETE.md)**
   - What's already done (100% sales rep)
   - Patterns to follow
   - Technical implementation details

4. **[CURRENT_SESSION.md](CURRENT_SESSION.md)**
   - Session history
   - Recent decisions
   - Known issues

### 2. Design System & Patterns
Read these to understand code patterns:

5. **[mobile/docs/DS_V0.1_PLAN.md](mobile/docs/DS_V0.1_PLAN.md)**
   - Design system components (Card, Badge, KpiCard, Tabs, FiltersBar)
   - Usage patterns
   - Styling guidelines

6. **[mobile/src/theme/featureColors.ts](mobile/src/theme/featureColors.ts)**
   - Feature color palette
   - Color usage for categories (visits=blue, sheets=purple, expenses=orange, etc.)

### 3. Reference Screens (Already Modern)
Study these as implementation examples:

7. **[mobile/src/screens/HomeScreen_v2.tsx](mobile/src/screens/HomeScreen_v2.tsx)**
   - Modern sales rep home screen
   - Timeline implementation
   - Progress cards
   - Pull-to-refresh pattern

8. **[mobile/src/screens/StatsScreen.tsx](mobile/src/screens/StatsScreen.tsx)**
   - Month selector pattern
   - KPI cards layout
   - Pending items section (just added!)

9. **[mobile/src/screens/manager/AccountsListScreen.tsx](mobile/src/screens/manager/AccountsListScreen.tsx)**
   - Already modernized with DS v0.1
   - FlashList for performance
   - Search and filter patterns
   - **Use this as the pattern for all manager screens**

10. **[mobile/src/navigation/TabNavigator.tsx](mobile/src/navigation/TabNavigator.tsx)**
    - Sales rep tabs with 5-tab layout
    - FAB modal implementation (NOTE: Manager dashboard will NOT have FAB)
    - Tab styling and icons

### 4. Manager Screens (Need Modernization)
These need work - read to understand current state:

11. **[mobile/src/screens/manager/ManagerHomeScreen.tsx](mobile/src/screens/manager/ManagerHomeScreen.tsx)** ⚠️ PHASE 1
12. **[mobile/src/screens/manager/UserListScreen.tsx](mobile/src/screens/manager/UserListScreen.tsx)** ⚠️ PHASE 1
13. **[mobile/src/screens/manager/TeamTargetsScreen.tsx](mobile/src/screens/manager/TeamTargetsScreen.tsx)** ⚠️ PHASE 3
14. **[mobile/src/screens/manager/DSRApprovalListScreen.tsx](mobile/src/screens/manager/DSRApprovalListScreen.tsx)** ⚠️ PHASE 1

---

## 🎨 Design System Rules (Must Follow)

### Components to Use
```typescript
// From mobile/src/components/ui/
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { KpiCard } from '../patterns/KpiCard';
import { Tabs } from '../components/ui/Tabs';
import { FiltersBar } from '../components/ui/FiltersBar';

// Card elevations
<Card elevation="md">  // For main content cards
<Card elevation="sm">  // For nested cards
```

### Feature Colors
```typescript
import { featureColors } from '../theme/featureColors';

// Use these colors:
featureColors.attendance.primary  // #2E7D32 (deep green)
featureColors.visits.primary      // #1976D2 (blue)
featureColors.sheets.primary      // #7B1FA2 (purple)
featureColors.expenses.primary    // #E65100 (orange)
featureColors.dsr.primary         // #0277BD (cyan)
featureColors.documents.primary   // #546E7A (blue-gray)
```

### Lists: Use FlashList
```typescript
import { FlashList } from '@shopify/flash-list';

// Pattern from AccountsListScreen
<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={80}
  ListEmptyComponent={<EmptyState />}
  onRefresh={onRefresh}
  refreshing={refreshing}
/>
```

### Pull-to-Refresh (Required on all screens)
```typescript
const [refreshing, setRefreshing] = useState(false);

const onRefresh = useCallback(async () => {
  setRefreshing(true);
  await fetchData();
  setRefreshing(false);
}, []);
```

---

## 🏗️ Implementation Plan

### Phase 1: Core Tab Screens (START HERE) ⭐
**Time**: 8-12 hours

#### 1. Create ManagerTabNavigator (2-3 hours)
**File**: `mobile/src/navigation/ManagerTabNavigator.tsx`

**Structure**:
```typescript
// 5 tabs (NO FAB - different from sales rep):
// Home | Team | Accounts | Review | Me

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Users, Building2, CheckCircle, UserCircle } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export function ManagerTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary.main,
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="ManagerHome"
        component={ManagerHomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Team"
        component={TeamScreen}  // Renamed from UserListScreen
        options={{
          tabBarLabel: 'Team',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsListScreen}  // Already modern
        options={{
          tabBarLabel: 'Accounts',
          tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Review"
        component={ReviewHomeScreen}  // New screen
        options={{
          tabBarLabel: 'Review',
          tabBarIcon: ({ color, size }) => <CheckCircle size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}  // Shared with sales rep
        options={{
          tabBarLabel: 'Me',
          tabBarIcon: ({ color, size }) => <UserCircle size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}
```

**Update RootNavigator.tsx**:
```typescript
// In mobile/src/navigation/RootNavigator.tsx
import { ManagerTabNavigator } from './ManagerTabNavigator';

// In RootNavigator function:
if (user?.role === 'area_manager' || user?.role === 'zonal_head') {
  return <ManagerTabNavigator />;
}
```

#### 2. Redesign ManagerHomeScreen (3-4 hours)
**File**: `mobile/src/screens/manager/ManagerHomeScreen.tsx`

**Spec**: See MANAGER_DASHBOARD_IMPLEMENTATION.md Section 4.1

**Key Sections**:
- KPI Cards (4 cards: team present, pending approvals, visits, sheets)
- Alerts section (SLA breaches, attendance anomalies)
- Top Performers (top 3 reps by visits or sheets)
- Documents & Resources (links to DocumentsScreen)

**Pattern**: Follow HomeScreen_v2.tsx structure but with manager-specific data

**API Calls Needed**:
```typescript
// 1. Team stats for today
const teamStats = await api.getTeamStatsToday();

// 2. Pending approvals count
const pendingCount = await api.getPendingApprovalsCount();

// 3. Alerts (SLA breaches, anomalies)
const alerts = await api.getManagerAlerts();

// 4. Top performers (this month)
const topPerformers = await api.getTopPerformers(currentMonth);
```

#### 3. Redesign TeamScreen (Rename from UserListScreen) (2-3 hours)
**File**: Rename `mobile/src/screens/manager/UserListScreen.tsx` → `TeamScreen.tsx`

**Spec**: See MANAGER_DASHBOARD_IMPLEMENTATION.md Section 4.2

**Key Features**:
- FlashList with team members
- Status badges (Present, Absent, Not Checked In)
- Today's activity preview (visits count, sheets count)
- Search by name
- Filter by status (All, Present, Absent)
- Pull-to-refresh

**Pattern**: Follow AccountsListScreen.tsx pattern exactly

#### 4. Create ReviewHomeScreen (2-3 hours)
**File**: `mobile/src/screens/manager/ReviewHomeScreen.tsx` (NEW)

**Spec**: See MANAGER_DASHBOARD_IMPLEMENTATION.md Section 4.4

**Structure**: Tabs component with 3 sections:
- DSRs (list of pending DSRs)
- Expenses (pending expense reports)
- Sheets (unverified sheet sales)

**Pattern**:
```typescript
import { Tabs } from '../components/ui/Tabs';

const tabs = [
  { key: 'dsrs', label: 'DSRs', count: pendingDsrCount },
  { key: 'expenses', label: 'Expenses', count: pendingExpenseCount },
  { key: 'sheets', label: 'Sheets', count: unverifiedSheetCount },
];

<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>

{activeTab === 'dsrs' && <DSRList />}
{activeTab === 'expenses' && <ExpensesList />}
{activeTab === 'sheets' && <SheetsList />}
```

---

### Phase 2: New Detail Screens (After Phase 1)
**Time**: 5-7 hours

See MANAGER_DASHBOARD_IMPLEMENTATION.md Section 5 for:
- AccountDetailScreen (show account info + visit history + creator)
- ApprovalDetailScreen (unified detail screen for DSR/expense/sheet approvals)

---

### Phase 3: Modernize Stack Screens (After Phase 2)
**Time**: 5-6 hours

See MANAGER_DASHBOARD_IMPLEMENTATION.md Section 6 for:
- UserDetailScreen
- AddUserScreen
- TeamTargetsScreen
- SetTargetScreen
- (DSRApprovalDetailScreen → replaced by ApprovalDetailScreen)

---

### Phase 4: Integration & Testing (After Phase 3)
**Time**: 2-3 hours

See MANAGER_DASHBOARD_IMPLEMENTATION.md Section 7 for:
- Navigation flow testing
- Pull-to-refresh verification
- Loading states
- Error handling
- Empty states

---

## 🚦 Starting Point

### Immediate First Steps:

1. **Read the 4 planning docs** (MANAGER_DASHBOARD_IMPLEMENTATION.md, COMPLETE_NAVIGATION_PLAN.md, SALES_REP_COMPLETE.md, CURRENT_SESSION.md)

2. **Study reference screens** (AccountsListScreen.tsx, HomeScreen_v2.tsx, TabNavigator.tsx)

3. **Create ManagerTabNavigator.tsx** (copy TabNavigator.tsx as starting point, remove FAB, change tabs)

4. **Update RootNavigator.tsx** to use ManagerTabNavigator for manager roles

5. **Redesign ManagerHomeScreen.tsx** following HomeScreen_v2.tsx pattern

6. **Test the tabs** - ensure navigation works, screens render

7. **Continue with TeamScreen** and **ReviewHomeScreen**

---

## ✅ Success Criteria

### Phase 1 Complete When:
- [ ] ManagerTabNavigator created with 5 tabs (no FAB)
- [ ] RootNavigator routes manager roles to new tabs
- [ ] ManagerHomeScreen shows KPI cards, alerts, top performers, documents
- [ ] TeamScreen (renamed from UserListScreen) uses FlashList, search, filter
- [ ] ReviewHomeScreen has 3 tabs (DSRs, Expenses, Sheets) with counts
- [ ] All screens use DS v0.1 components (Card, Badge, KpiCard, Tabs)
- [ ] All screens have pull-to-refresh
- [ ] Feature colors applied consistently
- [ ] No errors when navigating between tabs

---

## 🎨 Visual Reference

### Manager Tab Structure (Final Design)
```
┌──────────────────────────────────────┐
│  Manager Dashboard                   │
├──────────────────────────────────────┤
│                                      │
│  [Screen Content Here]               │
│                                      │
├──────────────────────────────────────┤
│ ┌──────┬──────┬──────┬──────┬──────┐│
│ │ Home │ Team │Accts │Review│  Me  ││
│ │  🏠  │  👥  │  🏢  │  ✅  │  👤  ││
│ └──────┴──────┴──────┴──────┴──────┘│
└──────────────────────────────────────┘
```

### ManagerHomeScreen Layout
```
┌─────────────────────────────────┐
│ 👋 Good Morning, Kunal          │ ← Greeting
│ Area Manager • Delhi NCR        │
├─────────────────────────────────┤
│ 📊 Today's Overview             │
│                                 │
│ ┌─────────┐ ┌─────────┐        │
│ │15/20    │ │    3    │        │ ← KPI Cards
│ │Present  │ │Pending  │        │
│ └─────────┘ └─────────┘        │
│ ┌─────────┐ ┌─────────┐        │
│ │   42    │ │  180   │         │
│ │Visits   │ │Sheets  │         │
│ └─────────┘ └─────────┘        │
│                                 │
│ ⚠️ Alerts                       │
│ • 2 SLA breaches today          │ ← Alerts
│ • 3 reps not checked in         │
│                                 │
│ 🏆 Top Performers (Oct)         │
│ 1. Rahul Kumar - 45 visits      │ ← Top 3
│ 2. Priya Singh - 38 visits      │
│ 3. Amit Sharma - 35 visits      │
│                                 │
│ 📚 Documents & Resources        │ ← NEW
│ • Product Catalogs              │
│ • Price Lists                   │
│ • Sales Reports                 │
│ [View All Documents >]          │
└─────────────────────────────────┘
```

---

## 🛠️ Technical Notes

### API Endpoints
Most endpoints already exist. You may need to create:
- `getTeamStatsToday()` - aggregate team attendance/activity
- `getManagerAlerts()` - fetch SLA breaches, anomalies
- `getTopPerformers(month)` - top reps by visits or sheets

Check `mobile/src/services/api.ts` for existing patterns.

### Firebase Queries
Use Firestore modular API (see CLAUDE.md for guidelines):
```typescript
import firestore, { query, collection, where, getDocs, orderBy } from '@react-native-firebase/firestore';

const db = firestore();
const q = query(
  collection(db, 'attendance'),
  where('date', '==', todayString),
  orderBy('timestamp', 'desc')
);
const snapshot = await getDocs(q);
```

### Performance
- Use FlashList for all lists (not FlatList)
- Add `estimatedItemSize` prop
- Implement pull-to-refresh on all screens
- Use `useCallback` for `renderItem` and `keyExtractor`

### Styling
- Follow 8px spacing grid (`spacing.xs`, `spacing.sm`, `spacing.md`, `spacing.lg`)
- Use theme tokens (`colors.text.primary`, `typography.fontSize.base`)
- Consistent card elevations (`elevation="md"` for main, `elevation="sm"` for nested)

---

## 📞 Questions to Ask User (If Needed)

1. **API Endpoints**: If team stats or alerts endpoints don't exist, ask whether to create mock data first or implement Cloud Functions
2. **Empty States**: What should screens show when there's no data? (Confirm pattern)
3. **Error Handling**: Preferred error message style? (Toast, alert, inline card?)
4. **Navigation**: Any specific transitions or animations wanted?

---

## 📦 Deliverables (Phase 1)

At end of Phase 1, you should have:
1. ✅ ManagerTabNavigator.tsx (5 tabs, no FAB)
2. ✅ Updated RootNavigator.tsx (routes to manager tabs)
3. ✅ Modernized ManagerHomeScreen.tsx (KPIs, alerts, top performers, documents)
4. ✅ Renamed TeamScreen.tsx (FlashList, search, filter, modern design)
5. ✅ New ReviewHomeScreen.tsx (3 tabs for DSRs/expenses/sheets)
6. ✅ All screens using DS v0.1 components
7. ✅ Pull-to-refresh working
8. ✅ Feature colors applied
9. ✅ Updated CURRENT_SESSION.md with progress

---

## 🎯 Your Mission

**Transform the manager dashboard from an old card-based menu into a modern, tab-based interface that matches the polish of the sales rep dashboard.**

Follow the sales rep patterns, use the same components, maintain consistency, and create a delightful manager experience.

**Start with Phase 1, focus on quality over speed, and ask questions when unclear.**

Good luck! 🚀

---

**Last Updated**: October 16, 2025
**Created By**: Claude (for handoff to new agent)
**Next Agent**: Start with Phase 1, read all docs, study reference screens, then implement ManagerTabNavigator
