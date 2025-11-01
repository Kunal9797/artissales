# Phase 2A Performance Optimization Plan

**Last Updated**: November 1, 2025
**Status**: Planning Phase
**Estimated Effort**: 15-22 hours
**Expected Impact**: 15-25% perceived performance improvement

---

## Executive Summary

Phase 2A focuses on **high-ROI, low-effort optimizations** to further improve app performance after the significant gains from Phase 1. These optimizations target unnecessary network requests and improve perceived performance through smarter caching strategies.

**Phase 1 Results (Baseline):**
- Home screen: 3s → 0.5-1s (70% faster)
- Form submissions: 10s wait → instant (100% faster)
- Network requests: 50% reduction

**Phase 2A Goals:**
- Reduce screen navigation overhead by 200-500ms
- Eliminate 50% of redundant network requests
- Improve manager dashboard responsiveness
- Maintain simplicity (no complex dependencies)

---

## Context: Performance Journey

### Phase 1 Optimizations (Completed)

1. ✅ **Parallelized HomeScreen queries** - 6 sequential queries → Promise.all()
2. ✅ **Background photo uploads** - Visit/expense edits no longer block UI
3. ✅ **Non-blocking receipt uploads** - Async upload for expense receipts
4. ✅ **Simple memory cache** - 5-minute cache for today's stats
5. ✅ **Skeleton loading states** - Added to Manager Home screen
6. ✅ **Fixed Manager Dashboard** - Parallel queries for getTeamStats Cloud Function

**Files Modified (Phase 1):**
- `mobile/src/screens/HomeScreen_v2.tsx`
- `mobile/src/screens/visits/LogVisitScreen.tsx`
- `mobile/src/screens/expenses/ExpenseEntryScreen.tsx`
- `mobile/src/services/uploadQueue.ts`
- `mobile/src/patterns/Skeleton.tsx`
- `mobile/src/screens/manager/ManagerHomeScreenSimple.tsx`
- `functions/src/api/managerStats.ts`

### Current Performance Baseline

**Sales Rep Dashboard:**
- Home screen load: 0.5-1s (cached: ~100ms)
- Visit logging: Instant submission with background upload
- Expense entry: Non-blocking photo uploads
- Navigation between screens: 200-500ms (includes refetch overhead)

**Manager Dashboard:**
- Home screen load: 0.5-1s (parallel queries)
- Team stats: 300-500ms
- DSR review: 400-600ms (includes filter API calls)
- Team list: 300-500ms

### Identified Bottlenecks for Phase 2A

1. **Excessive useFocusEffect** - 23 screens refetch data on every focus (navigation back to screen)
2. **Manager DSR filtering** - API call on every filter/search change
3. **Manager team list** - No caching, fetches fresh every time
4. **Redundant queries** - Same data fetched multiple times when navigating

---

## Phase 2A Optimizations (Detailed)

### Optimization 1: Reduce useFocusEffect Frequency ⭐⭐⭐⭐⭐

**Priority**: HIGHEST
**Effort**: 8-12 hours
**Impact**: High (50% reduction in network requests)
**Risk**: Low (safe to implement)

#### Problem

Currently, 23 screens use `useFocusEffect` which refetches data **every time** the user navigates back to the screen:

```tsx
// Current approach (excessive refetching):
useFocusEffect(
  useCallback(() => {
    loadData(); // Runs on EVERY screen focus
  }, [])
);
```

**Example scenario:**
1. User on Home screen → Loads data
2. User navigates to Log Visit
3. User navigates back to Home → **Refetches all data again** (unnecessary!)
4. Repeat 10x per session = 10x redundant fetches

#### Solution

Change to `useEffect` (mount only) + pull-to-refresh + cache invalidation after mutations:

```tsx
// New approach (smart refetching):
useEffect(() => {
  loadData(); // Only on mount
}, []);

const onRefresh = async () => {
  setRefreshing(true);
  await loadData(); // User can manually refresh
  setRefreshing(false);
};

// After mutations, invalidate cache:
const handleSaveVisit = async () => {
  await api.logVisit(...);
  invalidateHomeStatsCache(); // Force fresh load on next mount
  navigation.goBack();
};
```

#### Screens to Modify

**Safe to change (lists/static content):**
1. `HomeScreen_v2.tsx` - Today's stats (already has cache)
2. `LogVisitScreen.tsx` - Visit list
3. `SheetsEntryScreen.tsx` - Sheets list
4. `ExpenseEntryScreen.tsx` - Expense list
5. `DocumentsScreen.tsx` - Document library
6. `AccountsListScreen.tsx` - Account list
7. `TeamScreenSimple.tsx` - Team member list
8. `ProfileScreen.tsx` - User profile

**Keep useFocusEffect (real-time data):**
1. `ManagerHomeScreenSimple.tsx` - Team attendance/stats
2. `ReviewHomeScreen.tsx` - Pending approvals (time-sensitive)
3. `UserDetailScreen.tsx` - Individual user stats

#### Implementation Steps

1. **Audit useFocusEffect usage** (2 hours)
   ```bash
   grep -r "useFocusEffect" mobile/src/screens/
   ```

2. **Create refactoring pattern** (1 hour)
   - Document standard approach
   - Create code snippet template

3. **Migrate safe screens** (4-6 hours)
   - Replace useFocusEffect with useEffect
   - Add pull-to-refresh
   - Test navigation behavior

4. **Add cache invalidation** (2-3 hours)
   - Update mutation functions (logVisit, submitExpense, etc.)
   - Call invalidateHomeStatsCache() after success
   - Test cache refresh after mutations

5. **Testing** (2 hours)
   - Navigate between screens multiple times
   - Verify no redundant network requests
   - Test pull-to-refresh on all modified screens
   - Verify cache invalidation works

#### Expected Results

- **Network requests**: 50% reduction (no refetch on navigation)
- **Navigation speed**: 200-500ms faster (no loading spinner flash)
- **Data freshness**: Maintained via pull-to-refresh + cache invalidation
- **User experience**: Smoother, no jarring reloads

#### Code Example

**Before:**
```tsx
// HomeScreen_v2.tsx (current)
useFocusEffect(
  useCallback(() => {
    Promise.all([
      fetchAttendance(),
      fetchTodayStats(),
      fetchNeedsRevisionCount(),
    ]);
  }, [fetchAttendance, fetchTodayStats, fetchNeedsRevisionCount])
);
```

**After:**
```tsx
// HomeScreen_v2.tsx (optimized)
useEffect(() => {
  // Load once on mount (will use cache if available)
  Promise.all([
    fetchAttendance(),
    fetchTodayStats(),
    fetchNeedsRevisionCount(),
  ]);
}, []); // Empty dependency array = mount only

// Add pull-to-refresh for manual updates
const onRefresh = async () => {
  setRefreshing(true);
  invalidateHomeStatsCache(); // Clear cache first
  await Promise.all([
    fetchAttendance(),
    fetchTodayStats(),
    fetchNeedsRevisionCount(),
  ]);
  setRefreshing(false);
};
```

---

### Optimization 2: Client-Side Filtering for DSR Review ⭐⭐⭐⭐⭐

**Priority**: HIGH
**Effort**: 4-6 hours
**Impact**: High (instant filter changes)
**Risk**: Low (DSR list size is manageable)

#### Problem

`ReviewHomeScreen.tsx` currently makes an API call every time the manager changes filters:

```tsx
// Current approach (API call on every filter change):
useEffect(() => {
  loadDSRs({ status: statusFilter }); // Network request
}, [statusFilter]);
```

**Example scenario:**
1. Manager opens DSR review → API call #1
2. Manager toggles "Pending" filter → API call #2
3. Manager toggles "Needs Revision" → API call #3
4. Manager searches for "John" → API call #4
5. **4 API calls for what should be client-side filtering!**

#### Solution

Load all DSRs once, filter in JavaScript:

```tsx
// New approach (client-side filtering):
const [allDSRs, setAllDSRs] = useState([]);

useEffect(() => {
  loadAllDSRs(); // Single API call on mount
}, []);

// Filter in memory (instant, no network)
const filteredDSRs = useMemo(() => {
  let filtered = allDSRs;

  // Status filter
  if (statusFilter !== 'all') {
    filtered = filtered.filter(d => d.status === statusFilter);
  }

  // Search filter
  if (searchTerm) {
    filtered = filtered.filter(d =>
      d.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.userId.includes(searchTerm)
    );
  }

  // Date filter
  if (dateFilter !== 'all') {
    filtered = filtered.filter(d => d.date === dateFilter);
  }

  return filtered;
}, [allDSRs, statusFilter, searchTerm, dateFilter]);
```

#### Implementation Steps

1. **Modify ReviewHomeScreen** (2-3 hours)
   - Change API call to load all DSRs
   - Add useMemo for filtering
   - Update filter UI to be instant

2. **Add pull-to-refresh** (1 hour)
   - Manual refresh for latest DSRs
   - Show loading indicator

3. **Handle large lists** (1 hour)
   - Test with 100+ DSRs
   - Add pagination if needed (unlikely)

4. **Testing** (1-2 hours)
   - Toggle all filters rapidly
   - Search for various terms
   - Verify correct results
   - Test with edge cases (empty list, all filtered out)

#### Expected Results

- **Filter changes**: 400-600ms → instant (0-50ms)
- **Network requests**: 75% reduction (only on mount + refresh)
- **User experience**: Snappy, responsive filtering
- **Data freshness**: Maintained via pull-to-refresh

#### Trade-offs

- **Initial load time**: Slightly longer (loads all DSRs upfront)
- **Memory usage**: Minimal (DSR list size is small, <100 items typically)
- **Staleness**: DSRs loaded once, updated on pull-to-refresh

---

### Optimization 3: Cache-First for Manager Team Screen ⭐⭐⭐⭐☆

**Priority**: MEDIUM
**Effort**: 3-4 hours
**Impact**: Medium (300-500ms faster for managers)
**Risk**: Low (team list changes infrequently)

#### Problem

`TeamScreenSimple.tsx` loads team list from API on every mount:

```tsx
// Current approach (always network):
useEffect(() => {
  loadUsers(); // Fresh API call every time
}, []);
```

**Team list characteristics:**
- Changes rarely (only when users added/removed)
- Managers view it frequently (checking team status)
- Same data shown repeatedly
- Perfect candidate for caching

#### Solution

Add simple in-memory cache with 10-minute TTL:

```tsx
// Module-level cache
const teamCache: {
  data?: User[];
  timestamp?: number;
} = {};

const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const loadUsers = async () => {
  // Check cache first
  const now = Date.now();
  if (teamCache.data && teamCache.timestamp && (now - teamCache.timestamp) < CACHE_TTL) {
    logger.log('[TeamScreen] Using cached team list');
    setUsers(teamCache.data);
    setLoading(false);
    return;
  }

  // Cache miss or expired - fetch fresh
  const response = await api.getUsersList({});
  teamCache.data = response.users;
  teamCache.timestamp = now;
  setUsers(response.users);
};

// Invalidate cache after creating/editing users
export const invalidateTeamCache = () => {
  teamCache.data = undefined;
  teamCache.timestamp = undefined;
};
```

#### Implementation Steps

1. **Add cache to TeamScreenSimple** (1-2 hours)
   - Create module-level cache
   - Update loadUsers to check cache
   - Export invalidation function

2. **Add cache invalidation** (1 hour)
   - Update createUser function
   - Update updateUser function
   - Update deleteUser function (if exists)

3. **Add pull-to-refresh** (30 min)
   - Invalidate cache on pull
   - Fetch fresh data

4. **Testing** (1 hour)
   - Navigate to team screen multiple times
   - Verify cache hits
   - Create new user, verify cache invalidated
   - Test cache expiration (wait 10 min)

#### Expected Results

- **First load**: 300-500ms (network)
- **Cached loads**: 50-100ms (instant from cache)
- **Cache hit rate**: ~80-90% (team changes rarely)
- **Network requests**: 80% reduction

#### Trade-offs

- **Staleness**: User might see 10-minute-old team list (acceptable)
- **Manual refresh**: User can pull-to-refresh for latest
- **Cache invalidation**: Must remember to invalidate after user mutations

---

## Expected Results Summary

### Performance Improvements

| Metric | Before Phase 2A | After Phase 2A | Improvement |
|--------|-----------------|----------------|-------------|
| **Screen navigation (list screens)** | 200-500ms | 50-100ms | 60-80% faster |
| **DSR filter changes** | 400-600ms | 0-50ms | 90%+ faster |
| **Manager team list (cached)** | 300-500ms | 50-100ms | 70-80% faster |
| **Network requests (overall)** | Baseline | -50% | 50% reduction |
| **User-perceived performance** | Baseline | +15-25% | Noticeable improvement |

### User Experience Improvements

- ✅ **Smoother navigation** - No loading flash when returning to screens
- ✅ **Instant filtering** - Manager DSR filters apply immediately
- ✅ **Faster manager dashboard** - Team list loads instantly (cached)
- ✅ **Lower data usage** - 50% fewer network requests
- ✅ **Better offline UX** - Cached data available offline

### ROI Analysis

**Total Effort**: 15-22 hours
**Development Cost** (at $30-40/hour): $450-880

**Benefits**:
- Improved user satisfaction
- Lower server costs (fewer API calls)
- Better perceived app quality
- Foundation for future optimizations

**ROI**: ⭐⭐⭐⭐⭐ Excellent (high impact, low cost)

---

## Implementation Checklist

### Week 1: Phase 2A Implementation

**Day 1-2: Optimization 1 - Reduce useFocusEffect**
- [ ] Audit all useFocusEffect usage
- [ ] Document safe-to-change vs keep-as-is screens
- [ ] Create refactoring code template
- [ ] Migrate HomeScreen_v2.tsx
- [ ] Migrate LogVisitScreen.tsx
- [ ] Migrate SheetsEntryScreen.tsx
- [ ] Migrate ExpenseEntryScreen.tsx

**Day 3: Optimization 1 - Cache Invalidation**
- [ ] Add invalidateHomeStatsCache() to logVisit
- [ ] Add invalidateHomeStatsCache() to submitExpense
- [ ] Add invalidateHomeStatsCache() to logSheetsSale
- [ ] Test cache invalidation flow

**Day 4: Optimization 2 - Client-Side Filtering**
- [ ] Modify ReviewHomeScreen loadDSRs function
- [ ] Add useMemo for status filter
- [ ] Add useMemo for search filter
- [ ] Add useMemo for date filter
- [ ] Add pull-to-refresh
- [ ] Test filter performance

**Day 5: Optimization 3 - Team Screen Cache**
- [ ] Add cache to TeamScreenSimple
- [ ] Export invalidateTeamCache function
- [ ] Add cache invalidation to createUser
- [ ] Add cache invalidation to updateUser
- [ ] Test cache hits/misses

**End of Week: Testing & Validation**
- [ ] Performance testing (measure load times)
- [ ] Network request auditing (verify 50% reduction)
- [ ] User acceptance testing
- [ ] Document actual performance gains

---

## Files to Modify

### Sales Rep Dashboard

1. **mobile/src/screens/HomeScreen_v2.tsx**
   - Lines 367-376: Change useFocusEffect to useEffect
   - Add onRefresh handler for pull-to-refresh
   - Export invalidateHomeStatsCache (already exists)

2. **mobile/src/screens/visits/LogVisitScreen.tsx**
   - Remove useFocusEffect (if exists)
   - Add cache invalidation after successful save
   - Import invalidateHomeStatsCache

3. **mobile/src/screens/sheets/SheetsEntryScreen.tsx**
   - Remove useFocusEffect (if exists)
   - Add cache invalidation after successful save

4. **mobile/src/screens/expenses/ExpenseEntryScreen.tsx**
   - Remove useFocusEffect (if exists)
   - Add cache invalidation after successful save

5. **mobile/src/screens/DocumentsScreen.tsx**
   - Change useFocusEffect to useEffect (if applicable)
   - Relies on document cache service (already optimized)

### Manager Dashboard

6. **mobile/src/screens/manager/ReviewHomeScreen.tsx**
   - Modify loadDSRs to load all upfront
   - Add useMemo for client-side filtering
   - Add pull-to-refresh

7. **mobile/src/screens/manager/TeamScreenSimple.tsx**
   - Add module-level cache (lines 15-40)
   - Modify loadUsers to check cache first
   - Export invalidateTeamCache function

8. **mobile/src/screens/manager/CreateUserScreen.tsx** (if exists)
   - Import invalidateTeamCache
   - Call after successful user creation

---

## Testing Checklist

### Performance Testing

- [ ] **Measure HomeScreen load time**
  - First load: Should be 0.5-1s
  - Cached load: Should be 50-100ms
  - Navigation back: Should use cache (instant)

- [ ] **Measure DSR filter toggle**
  - Before: 400-600ms per filter change
  - After: <50ms (instant)

- [ ] **Measure team list load**
  - First load: 300-500ms
  - Cached load: 50-100ms

- [ ] **Count network requests**
  - Navigate Home → Visit → Home → Visit → Home
  - Before: 10+ requests
  - After: 5 requests (50% reduction)

### Functional Testing

- [ ] **Pull-to-refresh works on all screens**
  - HomeScreen
  - Visit list
  - Sheets list
  - Expense list
  - DSR review
  - Team list

- [ ] **Cache invalidation works**
  - Log visit → Home screen updates
  - Submit expense → Home screen updates
  - Log sheets → Home screen updates
  - Create user → Team list updates

- [ ] **Filters work correctly**
  - DSR status filter (pending, approved, needs_revision)
  - DSR search (by name, by user ID)
  - DSR date filter

- [ ] **Edge cases**
  - Empty lists (no data)
  - Large lists (100+ items)
  - Offline mode (cached data available)
  - Cache expiration (data refetches after TTL)

### User Experience Testing

- [ ] **No loading flash on navigation**
- [ ] **Instant filter changes**
- [ ] **Smooth transitions**
- [ ] **Clear loading states**
- [ ] **Pull-to-refresh visual feedback**

---

## Phase 2B Options (Future Consideration)

After completing Phase 2A, consider these additional optimizations:

### Option 1: Selective Firestore Cache-First (15-20 hours)

**Good for:**
- DocumentsScreen (catalog PDFs rarely change)
- AccountsListScreen (accounts change infrequently)

**Skip for:**
- Stats screens (need fresh data)
- Attendance (real-time)
- Approvals (time-sensitive)

### Option 2: FlashList Migration Audit (10-15 hours)

**Identify screens with FlatList >50 items:**
- Already done: AccountsListScreen (PR5)
- Check: Visit lists, Expense lists, DSR lists

**Only migrate if performance issues exist**

### Option 3: Optimistic Updates (25-35 hours)

**Instant UI updates for:**
- Log visit (add to list immediately)
- Log sheets (add to stats immediately)
- Approve DSR (update status immediately)

**Requires careful error handling and rollback logic**

---

## Phase 1 Summary (For Reference)

### What Was Completed

1. **Parallelized HomeScreen Queries**
   - File: `mobile/src/screens/HomeScreen_v2.tsx`
   - Change: Wrapped 6 sequential queries in Promise.all()
   - Impact: 1.5-3s → 0.5-1s (60-70% faster)

2. **Background Photo Uploads**
   - Files: `LogVisitScreen.tsx`, `uploadQueue.ts`
   - Change: Edit mode uses background upload queue
   - Impact: 2-10s wait → instant (100% faster)

3. **Non-Blocking Receipt Uploads**
   - File: `ExpenseEntryScreen.tsx`
   - Change: Async receipt photo uploads
   - Impact: No more UI freezing

4. **Memory Cache for Today's Stats**
   - File: `HomeScreen_v2.tsx`
   - Change: 5-minute cache for stats
   - Impact: 50% fewer requests on repeated visits

5. **Manager Dashboard Optimization**
   - File: `functions/src/api/managerStats.ts`
   - Change: Parallel Firestore queries (5 queries → Promise.all)
   - Impact: 1200ms → 300ms (75% faster)

6. **Skeleton Loading States**
   - File: `patterns/Skeleton.tsx`
   - Change: Added style prop support
   - Impact: Better perceived performance

---

## Decision Matrix

| Optimization | Effort | Impact | Risk | Priority | Recommend |
|--------------|--------|--------|------|----------|-----------|
| **Reduce useFocusEffect** | 8-12h | High | Low | P0 | ✅ DO NOW |
| **Client-side filtering** | 4-6h | High | Low | P0 | ✅ DO NOW |
| **Team screen cache** | 3-4h | Medium | Low | P1 | ✅ DO NOW |
| Firestore cache-first | 15-20h | Medium | Low | P2 | ⚠️ LATER |
| FlashList audit | 10-15h | Low-Med | Low | P3 | ⚠️ IF NEEDED |
| Optimistic updates | 25-35h | High | Med | P3 | ⏳ PHASE 3 |
| React Query | 40-60h | Low | Med | P4 | ❌ SKIP |

---

## Notes & Considerations

### Cache Strategy Summary

| Screen | Cache Type | TTL | Invalidation |
|--------|-----------|-----|--------------|
| HomeScreen | Memory | 5 min | After visit/sheet/expense submit |
| TeamScreen | Memory | 10 min | After user create/edit/delete |
| DSRs | Client-side | Session | Pull-to-refresh |
| Documents | Service | 30 min | Manual or on upload |

### When to Invalidate Cache

**Invalidate immediately:**
- After creating/editing/deleting records
- On pull-to-refresh
- On explicit user action (tap "Refresh" button)

**Don't invalidate:**
- On screen navigation
- On app background/foreground
- On network reconnect (cache might still be fresh)

### Common Pitfalls to Avoid

1. **Over-caching** - Don't cache time-sensitive data (attendance, approvals)
2. **Under-invalidating** - Always invalidate after mutations
3. **Stale data UX** - Show pull-to-refresh hint if data feels old
4. **Memory leaks** - Use module-level cache (not growing indefinitely)
5. **Offline edge cases** - Test offline scenarios thoroughly

---

## Success Criteria

Phase 2A is considered successful if:

- ✅ **Performance**: Screen navigation 200-500ms faster
- ✅ **Network**: 50% reduction in redundant requests
- ✅ **UX**: No loading flash on navigation
- ✅ **Manager**: DSR filters apply instantly
- ✅ **Stability**: No new bugs introduced
- ✅ **Maintainability**: Code remains simple and understandable

---

## Questions & Answers

### Q: Will this break offline mode?
**A**: No. Cached data will be available offline. Pull-to-refresh will gracefully fail and show cached data.

### Q: What if user has slow network?
**A**: Phase 2A helps! Fewer network requests = faster experience on slow networks.

### Q: How do we measure success?
**A**: Use React Native Performance Monitor or add custom logging to measure load times.

### Q: What about Phase 2B?
**A**: Only proceed if Phase 2A doesn't meet performance goals. Avoid over-optimization.

### Q: Can we skip some optimizations?
**A**: Yes. Priority order: #1 (useFocusEffect) > #2 (filtering) > #3 (team cache)

---

## Related Documentation

- [Phase 1 Implementation](./PHASE_1_PERFORMANCE_COMPLETE.md) - (If exists)
- [Performance Optimization Overview](../development/PERFORMANCE_GUIDE.md) - (If exists)
- [Document Management Scripts](../development/DOCUMENT_MANAGEMENT_SCRIPTS.md)
- [Firebase Usage Guidelines](../development/FIREBASE_USAGE.md)

---

**Last Updated**: November 1, 2025
**Author**: AI Development Agent
**Status**: Ready for Implementation
**Estimated Completion**: 1-2 weeks
