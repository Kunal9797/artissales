# Mobile App Navigation Architecture

**Last Updated**: October 17, 2025
**Pattern**: Tab Navigation + Stack Navigation
**Library**: React Navigation v6

---

## Navigation Structure

### Sales Rep Navigation (5 Tabs)

```
┌─────────────────────────────────────────────────────────┐
│ [🏠] [📊] [➕] [📄] [👤]  ← Bottom Tabs (Always Visible) │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tab Content (Home/Stats/Docs/Me)                     │
│                                                         │
│  OR                                                     │
│                                                         │
│  Stack Screens (Attendance/Visits/Sheets/Expenses)    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Bottom Tabs**:
1. **🏠 Home** - Dashboard with timeline, quick actions
2. **📊 Stats** - Performance metrics, target progress
3. **➕ Log** - Quick actions menu (FAB button style)
4. **📄 Docs** - Document library with offline caching
5. **👤 Me** - Profile and settings

**Log Button** (Center):
- Opens bottom sheet with quick actions
- 4 options: Log Sheets, Log Visit, Report Expense, Attendance

**Stack Screens** (Full-screen overlays):
- Attendance Screen (Check-in/out)
- Compact Sheets Entry Screen
- Select Account Screen → Log Visit Screen
- Expense Entry Screen
- Manage Downloads Screen

---

### Manager Navigation (5 Tabs)

```
┌─────────────────────────────────────────────────────────┐
│ [🏠] [👥] [➕] [✅] [👤]  ← Bottom Tabs (Always Visible) │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tab Content (Home/Team/Accounts/Review/Me)           │
│                                                         │
│  OR                                                     │
│                                                         │
│  Stack Screens (User Detail/Add User/Set Target/etc)  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Bottom Tabs**:
1. **🏠 Home** - Dashboard with KPIs, alerts, top performers
2. **👥 Team** - Team member list with filters
3. **🏢 Accounts** - Account management (CRUD)
4. **✅ Review** - DSR approval workflow
5. **👤 Me** - Profile and settings

**Stack Screens**:
- User Detail Screen → Edit User
- Add User Screen
- Set Target Screen
- Team Targets Screen
- Account Detail Screen
- Add/Edit Account Screens
- DSR Approval Detail Screen

---

## Navigation Implementation

### Root Navigator

```typescript
// mobile/src/navigation/RootNavigator.tsx

const RootNavigator = () => {
  const user = useAuth();

  if (!user) {
    return <AuthStack />;  // Login screens
  }

  // Role-based routing
  if (user.role === 'rep') {
    return <TabNavigator />;  // Sales rep tabs
  } else {
    return <ManagerTabNavigator />;  // Manager tabs
  }
};
```

**Decision**: Single root navigator with role-based routing
**Alternative Considered**: Separate navigators per role
**Why This**: Simpler architecture, shared screens (Profile, Settings)

---

### Sales Rep Tab Navigator

```typescript
// mobile/src/navigation/TabNavigator.tsx

<Tab.Navigator>
  {/* Tab Screens */}
  <Tab.Screen name="Home" component={HomeScreen_v2} />
  <Tab.Screen name="Stats" component={StatsScreen} />
  <Tab.Screen name="Log" component={LogButton} />  {/* Opens modal */}
  <Tab.Screen name="Docs" component={DocumentsScreen} />
  <Tab.Screen name="Me" component={ProfileScreen} />

  {/* Stack Screens (full-screen overlays) */}
  <Tab.Screen
    name="Attendance"
    component={AttendanceScreen}
    options={{tabBarButton: () => null}}  {/* Hide from tabs */}
  />
  <Tab.Screen name="CompactSheetsEntry" ... />
  <Tab.Screen name="SelectAccount" ... />
  <Tab.Screen name="LogVisit" ... />
  <Tab.Screen name="ExpenseEntry" ... />
  <Tab.Screen name="ManageDownloads" ... />
</Tab.Navigator>
```

---

### Manager Tab Navigator

```typescript
// mobile/src/navigation/ManagerTabNavigator.tsx

<Tab.Navigator>
  {/* Tab Screens */}
  <Tab.Screen name="ManagerHome" component={ManagerHomeScreenSimple} />
  <Tab.Screen name="Team" component={TeamScreenSimple} />
  <Tab.Screen name="Accounts" component={AccountsListScreen} />
  <Tab.Screen name="Review" component={ReviewHomeScreen} />
  <Tab.Screen name="Me" component={ProfileScreen} />

  {/* Stack Screens */}
  <Tab.Screen name="UserDetail" ... />
  <Tab.Screen name="AddUser" ... />
  <Tab.Screen name="SetTarget" ... />
  <Tab.Screen name="TeamTargets" ... />
  <Tab.Screen name="AccountDetail" ... />
  <Tab.Screen name="AddAccount" ... />
  <Tab.Screen name="EditAccount" ... />
  <Tab.Screen name="DSRApprovalDetail" ... />
</Tab.Navigator>
```

---

## Navigation Patterns

### 1. Tab-to-Stack Navigation

```typescript
// From Home Tab → Attendance Screen
navigation.navigate('Attendance');

// From Accounts Tab → Account Detail
navigation.navigate('AccountDetail', {accountId: 'acc123'});
```

### 2. Stack-to-Stack Navigation

```typescript
// From SelectAccount → LogVisit
navigation.navigate('LogVisit', {account: selectedAccount});

// Back to previous stack screen
navigation.goBack();
```

### 3. Deep Linking (Future)

```
artis://visit/log?accountId=acc123
artis://dsr/review?reportId=rep456_2025-10-17
```

---

## Screen Hierarchy

### Sales Rep Screens (11 Total)

**Tab Screens** (5):
1. HomeScreen_v2 - Dashboard
2. StatsScreen - Performance metrics
3. DocumentsScreen - Document library
4. ProfileScreen - User profile
5. LogButton - Quick actions menu (modal)

**Stack Screens** (6):
1. AttendanceScreen - Check-in/out
2. CompactSheetsEntryScreen - Log sheets
3. SelectAccountScreen - Choose account
4. LogVisitScreen - Log visit with photo
5. ExpenseEntryScreen - Report expense
6. ManageDownloadsScreen - Manage cached docs

---

### Manager Screens (16 Total)

**Tab Screens** (5):
1. ManagerHomeScreenSimple - Dashboard
2. TeamScreenSimple - Team list
3. AccountsListScreen - Account management
4. ReviewHomeScreen - DSR approval
5. ProfileScreen - User profile

**Stack Screens** (11):
1. UserDetailScreen - Individual performance
2. AddUserScreen - Create team member
3. SetTargetScreen - Set monthly targets
4. TeamTargetsScreen - Team target overview
5. AccountDetailScreen - Account details
6. AddAccountScreen - Create account
7. EditAccountScreen - Edit account
8. DSRApprovalDetailScreen - Review DSR
9. (Future) ExpenseApprovalListScreen
10. (Future) ExpenseApprovalDetailScreen

---

## Navigation State Management

### Persistent State

**Tab State**: Preserved when switching tabs
```typescript
// User switches: Home → Stats → Home
// Home screen maintains scroll position, data
```

**Stack State**: Cleared on back navigation
```typescript
// User: Accounts → AccountDetail → Back
// AccountDetail unmounts, state cleared
```

### Passing Parameters

```typescript
// Navigate with params
navigation.navigate('AccountDetail', {
  accountId: 'acc123',
  accountName: 'Sharma Laminates'
});

// Receive params
const {accountId, accountName} = route.params;
```

---

## Navigation Guards

### Auth Guard

```typescript
// RootNavigator checks authentication
if (!user) {
  return <AuthStack />;  // Force login
}
```

### Role Guard

```typescript
// Role-based routing
if (user.role === 'rep') {
  return <TabNavigator />;
} else {
  return <ManagerTabNavigator />;
}
```

---

## Screen Transitions

### Default Transitions
- **Tab Switch**: Fade (instant feel)
- **Stack Push**: Slide from right (iOS-style)
- **Modal**: Slide from bottom

### Custom Transitions

```typescript
// Log button modal
<Tab.Screen
  name="Log"
  options={{
    presentation: 'transparentModal',
    animation: 'fade'
  }}
/>
```

---

## Navigation Performance

### Optimizations
- **Lazy Loading**: Screens load on first access
- **Memoization**: Tab screens memoized (React.memo)
- **State Persistence**: Tab state preserved (no re-renders)

### Performance Metrics
- Tab switch: < 16ms (60 FPS)
- Stack push: < 100ms
- Modal open: < 50ms

---

## Design Decisions

### Why Bottom Tabs?
- **✅ Standard pattern**: Familiar to users
- **✅ One-tap access**: Quick switching
- **✅ Always visible**: No hidden navigation
- **✅ Context awareness**: See current location

**Alternative Considered**: Drawer navigation
**Why Rejected**: Extra tap needed, hides context

### Why Center Log Button?
- **✅ Prominent**: Most-used action
- **✅ Consistent**: Always accessible
- **✅ Visual hierarchy**: Stands out

**Alternative Considered**: Floating FAB
**Why Rejected**: Confusing placement, blocks content

### Why "Simple" Screen Variants?
- **Issue**: StyleSheet module initialization errors on some manager screens
- **Solution**: Created "Simple" versions with inline styles
- **Files**: ManagerHomeScreenSimple.tsx, TeamScreenSimple.tsx
- **Trade-off**: Slightly less optimized, but functional
- **Future**: Investigate root cause, consolidate

---

## Accessibility

### Screen Readers
- All tabs have descriptive labels
- Navigation announces screen changes

### Keyboard Navigation (Future)
- Tab key to switch tabs
- Enter to activate

---

## Related Documentation

- **[/docs/decisions/002_NAVIGATION_PATTERN.md](../decisions/002_NAVIGATION_PATTERN.md)** - Why we chose this pattern
- **[/docs/features/SALES_REP_FEATURES.md](../features/SALES_REP_FEATURES.md)** - Sales rep screens
- **[/docs/features/MANAGER_FEATURES.md](../features/MANAGER_FEATURES.md)** - Manager screens

---

**Last Updated**: October 17, 2025
