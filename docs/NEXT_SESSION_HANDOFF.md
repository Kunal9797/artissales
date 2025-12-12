# Next Session Handoff - December 2024

**Last Updated:** December 12, 2024
**Current Branch:** `areamanager`
**Status:** Stable, ready for next phase of improvements

---

## Quick Context

The app has two main user types:
1. **Sales Reps** - Field workers who log visits, sheets sales, expenses
2. **Managers** (Area Manager, National Head, Admin) - Oversee team performance

Recent work focused on the **Team Performance page** (TeamStatsScreen) for managers - adding expense breakdown, distributor picker, and fixing bugs.

---

## Priority Tasks for Next Session

### 1. 📊 Sales Rep StatsScreen Redesign
**Priority:** HIGH | **Effort:** ~2.5 hours

**Goal:** Remake the Sales Rep `StatsScreen` to match the modern design of `TeamStatsScreen`.

**What to add:**
- Activity Heatmap (GitHub-style grid showing visit counts per day)
- NumberGridCard layout (big total + 2x2 breakdown)
- Time range toggles (Today/Week/Month)
- Expense card with category breakdown (Travel/Food/Accommodation/Other)
- Dark header styling (#393735 background, gold accents)

**What NOT to add (rep shouldn't have):**
- Filter modal
- Edit user button
- Set Target button
- Team aggregation views

**Technical notes:**
- Keep using `getUserStats` API (faster than `getTeamStats`)
- `expenses.byCategory` already exists in API response
- Compute heatmap data client-side from `visits.records`

**Files to modify:**
- `mobile/src/screens/StatsScreen.tsx` - Full rewrite (~800-1000 lines)
- Copy components from `mobile/src/screens/manager/TeamStatsScreen.tsx`:
  - `ActivityHeatmap` (~280 lines)
  - `NumberGridCard` (~50 lines)
  - Helper functions (`formatNumber`, `formatRupee`, etc.)

**Plan file:** `/Users/kunal/.claude/plans/glowing-plotting-squid.md`

---

### 2. 🧭 Navigation Bar / Dock Optimization (Sales Rep View)
**Priority:** MEDIUM | **Effort:** TBD

**Goal:** Optimize the bottom navigation bar for sales reps.

**Current state:** Need to audit what tabs/buttons are shown and if they make sense for rep workflow.

**Considerations:**
- Quick access to most-used features (Log Visit, Log Sheets, Stats)
- Remove any manager-only features that might be visible
- Ensure consistent styling with dark header theme

---

### 3. 👔 Team Performance → Replace UserDetailScreen
**Priority:** MEDIUM | **Effort:** ~1 hour

**Goal:** Finish the screen consolidation by replacing `UserDetailScreen` with `TeamStatsScreen`.

**What's done:**
- ✅ Added expense breakdown to TeamStatsScreen
- ✅ Added distributor picker to edit modal
- ✅ Fixed null/undefined rendering bugs

**What's left:**
- Phase 2: Reroute navigation to TeamStatsScreen
  - Update `TeamScreenSimple.tsx` navigation
  - Update `UserListScreen.tsx` navigation
  - Add `preSelectedUserId` route param handling
- Phase 3: Delete UserDetailScreen.tsx (-1,653 lines)

**Files to modify:**
- `mobile/src/screens/manager/TeamScreenSimple.tsx`
- `mobile/src/screens/manager/UserListScreen.tsx`
- `mobile/src/navigation/RootNavigator.tsx`
- DELETE: `mobile/src/screens/manager/UserDetailScreen.tsx`

---

### 4. ⚡ Speed & Performance Optimization
**Priority:** MEDIUM | **Effort:** TBD

**Goal:** Review all screens and optimize loading times.

**Areas to audit:**
- Initial app load time (target: < 2s)
- Screen transition times
- API response times (Firestore queries)
- List rendering (FlatList virtualization)
- Image loading (compression, caching)

**Tools to use:**
- React Native Performance Monitor
- Firebase Performance Monitoring
- Flipper (React Native debugger)

**Common optimizations:**
- Add React Query caching (already using, verify stale times)
- Lazy load images with progressive loading
- Reduce re-renders with `useMemo`, `useCallback`
- Check for N+1 query patterns in Cloud Functions

---

### 5. 🔒 Permissions & Data Access Audit
**Priority:** HIGH | **Effort:** ~2 hours

**Goal:** Full review to verify proper data access for each role.

#### Sales Rep Should See:
- ✅ Their own visits, sheets, expenses, DSRs
- ✅ Accounts assigned to them (their territory)
- ✅ Their direct manager's info
- ✅ Admin contact info
- ❌ Other reps' data
- ❌ Other teams' data
- ❌ Manager-only screens/buttons

#### Manager Should See:
- ✅ All data for their direct reports (reps reporting to them)
- ✅ Aggregated team stats
- ✅ Pending approvals for their team
- ✅ Ability to edit their reps' profiles
- ❌ Data from other managers' teams (unless Admin)
- ❌ Ability to edit other managers' team members

#### Admin Should See:
- ✅ All data across all teams
- ✅ All users (reps and managers)
- ✅ System-wide aggregations

**Files to audit:**
- `mobile/src/screens/manager/TeamStatsScreen.tsx` - Filter logic
- `mobile/src/screens/manager/UserListScreen.tsx` - User fetching
- `functions/src/api/managerStats.ts` - Team stats filtering
- `functions/src/api/users.ts` - User list filtering
- `firestore.rules` - Security rules

**Test scenarios:**
1. Log in as rep → Verify can't see other reps
2. Log in as area_manager → Verify sees only direct reports
3. Log in as admin → Verify sees everyone
4. Try to access other user's data via API → Should be blocked

---

## Recent Bug Fixes (This Session)

### Fixed: "Text strings must be rendered within a <Text> component"
**File:** `mobile/src/screens/manager/TeamStatsScreen.tsx`

**Problem:** Error when viewing sales rep performance for users without expense/sheets data.

**Root cause:** Conditional rendering patterns like `{value && value > 0 && (...)}` where `value` could be `undefined`.

**Fix:** Changed to `{(value ?? 0) > 0 && (...)}` pattern:
```tsx
// Before (bug)
{stats?.pending?.sheets && stats.pending.sheets > 0 && (...)}

// After (fixed)
{!isLoading && (stats?.pending?.sheets ?? 0) > 0 && (...)}
```

**Lines fixed:** 1289, 1459

---

## Architecture Reference

### Key Files by Feature

**Sales Rep Screens:**
- `mobile/src/screens/StatsScreen.tsx` - Rep performance view (TO BE REDESIGNED)
- `mobile/src/screens/HomeScreen_v2.tsx` - Rep home/dashboard
- `mobile/src/screens/visits/` - Visit logging flow
- `mobile/src/screens/sheets/` - Sheets sales logging

**Manager Screens:**
- `mobile/src/screens/manager/TeamStatsScreen.tsx` - Team performance (2,700+ lines)
- `mobile/src/screens/manager/UserDetailScreen.tsx` - Individual rep detail (TO BE DEPRECATED)
- `mobile/src/screens/manager/ReviewTab.tsx` - Pending approvals

**APIs (Cloud Functions):**
- `functions/src/api/managerStats.ts` - `getTeamStats` for managers
- `functions/src/api/users.ts` - `getUserStats`, `getUsersList`, `createUserByManager`
- `functions/src/api/targets.ts` - Target management

**Navigation:**
- `mobile/src/navigation/RootNavigator.tsx` - Main router
- `mobile/src/navigation/ManagerTabNavigator.tsx` - Manager bottom tabs
- `mobile/src/navigation/RepTabNavigator.tsx` - Rep bottom tabs

---

## Design System Reference

**Brand Colors:**
- Primary (Dark): `#393735`
- Accent (Gold): `#C9A961`
- Background: `#F5F5F5`
- Card: `#FFFFFF`

**Heatmap Colors (GitHub-style):**
- Empty: `#EBEDF0`
- Low: `#C6E9C7`
- Medium: `#40C463`
- High: `#30A14E`
- Full: `#216E39`

---

## Commands Reference

```bash
# Mobile app
cd mobile
npx expo start --android

# Cloud Functions
cd functions
npm run build
firebase deploy --only functions

# Full deploy
firebase deploy
```

---

## Questions to Ask Before Starting

1. Should I focus on rep experience or manager experience first?
2. Any specific performance issues users have reported?
3. Any specific permission bugs discovered in testing?
4. Is there a priority order for the tasks above?

---

**Ready to continue!** Start with the StatsScreen redesign for the biggest visual impact, or the permissions audit for the biggest security impact.
