# PR5: FlashList Performance Migration

**Title:** `perf(list): migrate AccountsListScreen to FlashList (PR5)`

**Base Branch:** `main`
**Head Branch:** `feature/ds-v0.1`
**Commit:** f587ac8

---

## Summary
Migrated AccountsListScreen from FlatList to @shopify/flash-list for better performance on large account lists.

## Changes
- ✅ Replaced `FlatList` with `FlashList` from @shopify/flash-list
- ✅ Set `estimatedItemSize=64` (account card height ≈ 48px icon + 16px padding)
- ✅ Removed redundant perf props (windowSize, maxToRenderPerBatch, etc.)
- ✅ Kept all memoization (renderItem, keyExtractor)
- ✅ **No UX changes:** FiltersBar, Empty/Error/Skeleton patterns intact

## Benefits
- Better memory efficiency via cell recycling (similar to RecyclerView)
- Improved scroll performance for 50+ accounts
- Simpler API, less configuration needed
- Native-like list behavior

## Files Changed
- `src/screens/manager/AccountsListScreen.tsx` - FlatList → FlashList
- `package.json` - Added @shopify/flash-list dependency
- `docs/PR5_FLASHLIST_PERF.md` - Before/after comparison, migration pattern, testing checklist

## Testing Checklist
- [ ] List renders correctly with 1, 10, 50+ accounts
- [ ] Search filtering works (re-renders smoothly)
- [ ] Type filtering works (chips update list)
- [ ] Empty state shows when no results
- [ ] Error state shows on network failure
- [ ] Skeleton shows during loading
- [ ] Scroll performance smooth on mid-range device
- [ ] No console warnings about FlashList

## Documentation
See [docs/PR5_FLASHLIST_PERF.md](docs/PR5_FLASHLIST_PERF.md) for:
- Before/after configuration comparison
- Migration pattern for other lists
- Rollback plan

## Related PRs
- PR3: Input components (Checkbox, Radio, Switch, Select, Tabs)
- PR4: Pattern components (FiltersBar, EmptyState, ErrorState, Skeleton, KpiCard)
- PR4: AccountsListScreen conversion to use patterns

## Next
PR6 - TenantThemeProvider for white-label theming

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
