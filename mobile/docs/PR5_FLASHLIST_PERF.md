# PR5: FlashList Performance Migration

**Date:** Oct 14, 2025
**Screen:** AccountsListScreen (Manager Dashboard)
**Change:** FlatList → @shopify/flash-list with `estimatedItemSize=64`

---

## Before (FlatList)

### Configuration
```tsx
<FlatList
  data={filteredAccounts}
  renderItem={renderAccountCard}
  keyExtractor={keyExtractor}
  windowSize={8}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={15}
/>
```

### Observations
- Already optimized with memoized `renderItem` and `keyExtractor`
- FlatList performance props tuned (`windowSize`, `removeClippedSubviews`, etc.)
- Works well for moderate lists (< 100 items)
- Smooth scrolling on mid-range devices

---

## After (FlashList)

### Configuration
```tsx
<FlashList
  data={filteredAccounts}
  renderItem={renderAccountCard}
  keyExtractor={keyExtractor}
  estimatedItemSize={64}  // Account card height ≈ 64px
/>
```

### Implementation Notes
1. **Estimated Item Size:** 64px (48px icon + 16px padding)
2. **No Content Container Style Breaking:** Kept `contentContainerStyle` for padding
3. **Memoization Preserved:** Same memoized `renderItem` and `keyExtractor`
4. **No UX Changes:** FiltersBar, EmptyState, ErrorState, Skeleton patterns intact

### Expected Benefits
- **Better memory efficiency:** FlashList uses recycling (similar to RecyclerView)
- **Improved scroll performance:** Especially noticeable with 50+ accounts
- **Simpler API:** Less configuration needed (no `windowSize`, `maxToRenderPerBatch`, etc.)
- **Native feel:** Closer to platform-native list behavior

---

## Migration Pattern (Repeatable)

For other heavy lists in the app:
1. Install: `npm install @shopify/flash-list`
2. Replace: `import { FlatList } from 'react-native'` → `import { FlashList } from '@shopify/flash-list'`
3. Add: `estimatedItemSize` prop (measure typical item height)
4. Remove: FlashList doesn't need `windowSize`, `maxToRenderPerBatch`, etc.
5. Test: Verify EmptyState, LoadingState, ErrorState still work

---

## Testing Checklist

- [ ] List renders correctly with 1, 10, 50+ accounts
- [ ] Search filtering works (re-renders smoothly)
- [ ] Type filtering works (chips update list)
- [ ] Empty state shows when no results
- [ ] Error state shows on network failure
- [ ] Skeleton shows during loading
- [ ] Scroll performance smooth on mid-range device
- [ ] No console warnings about FlashList

---

## Rollback Plan

If FlashList causes issues:
```tsx
// Revert to FlatList
import { FlatList } from 'react-native';

<FlatList
  data={filteredAccounts}
  renderItem={renderAccountCard}
  keyExtractor={keyExtractor}
  windowSize={8}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
/>
```

---

## Related PRs
- PR3: Input components (Checkbox, Radio, Switch, Select, Tabs)
- PR4: Pattern components (FiltersBar, EmptyState, ErrorState, Skeleton, KpiCard)
- PR4: AccountsListScreen conversion to use patterns

**Next:** PR6 - TenantThemeProvider for white-label theming
