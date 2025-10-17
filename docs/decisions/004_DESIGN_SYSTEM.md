# 004: Design System v0.1 Approach

**Date**: October 15, 2025
**Status**: ✅ Implemented
**Deciders**: Design Team, Development Team

---

## Context

The app initially had 20+ screens with inconsistent UI:
- Custom spinners, progress bars, empty states in every screen
- Inconsistent spacing (mix of 8px, 10px, 12px, 15px, 16px, 20px)
- Inconsistent colors (hardcoded hex values scattered everywhere)
- Inconsistent typography (fontSize/fontWeight repeated in every file)
- No reusable components

### Problems
- **Slow development**: Every screen reinvented UI patterns
- **Inconsistent UX**: Users saw different patterns on different screens
- **Hard to maintain**: Changing a color meant finding all occurrences
- **No standards**: New developers had no guidance

---

## Decision

**Implement Design System v0.1 with:**
1. **Design tokens** (colors, spacing, typography, roles, states)
2. **Reusable UI components** (Spinner, Badge, ProgressBar, etc.)
3. **Pattern components** (EmptyState, ErrorState, Skeleton, KpiCard)
4. **Exemplar screen** (AccountsListScreen) showing best practices
5. **Phased rollout** (6 PRs over 2 weeks)

---

## Rationale

### 1. Token System = Single Source of Truth

**Before**:
```typescript
// Scattered everywhere
<View style={{backgroundColor: '#393735'}} />
<View style={{backgroundColor: '#39373'}} />  // Typo!
<View style={{backgroundColor: 'rgb(57, 55, 53)'}} />  // Same color, different format
```

**After**:
```typescript
import {colors} from '@/theme';
<View style={{backgroundColor: colors.brand.primary}} />
// One place to change, affects all screens
```

### 2. Component Library = Consistency

**Before**: Every screen had custom spinner
```typescript
<ActivityIndicator color="#C9A961" size="large" />  // Hardcoded
```

**After**: Reusable Spinner component
```typescript
<Spinner size="large" />  // Uses theme color automatically
```

### 3. Patterns = Faster Development

**Before**: Every screen implemented empty state differently
```typescript
{data.length === 0 && (
  <View style={{padding: 20, alignItems: 'center'}}>
    <Text style={{color: '#666'}}>No data</Text>
  </View>
)}
```

**After**: EmptyState component
```typescript
{data.length === 0 && <EmptyState message="No visits yet" />}
```

### 4. Phased Rollout = Low Risk

- PR1: Theme tokens
- PR2: Core components (Spinner, Badge, etc.)
- PR3: Pattern components (EmptyState, etc.)
- PR4: Exemplar screen (AccountsListScreen)
- PR5: FlashList performance
- PR6: Tenant theming

Each PR small, testable, reversible.

---

## Consequences

### Positive ✅

1. **Consistent UX**: All screens now look cohesive
2. **Faster development**: Reusable components save time
3. **Easier maintenance**: Change token, affects all screens
4. **Better performance**: Optimized components (FlashList, memoization)
5. **Scalable**: Easy to add new screens following patterns

### Negative ❌

1. **Migration effort**: 20+ screens to update
2. **Learning curve**: Team must learn new components
3. **Upfront time**: 2 weeks to implement v0.1
4. **Not 100% coverage**: Some screens still use old patterns (documented as tech debt)

### Risks & Mitigations

**Risk**: Design system too rigid, doesn't cover edge cases
- **Mitigation**: Keep `extra` styles prop for customization

**Risk**: Team doesn't adopt, reverts to old patterns
- **Mitigation**: Exemplar screen, documentation, code reviews

**Risk**: Performance regression from extra abstraction
- **Mitigation**: FlashList, memoization, performance testing

---

## Design Tokens

### Colors
```typescript
colors = {
  brand: {primary: '#393735', accent: '#C9A961'},
  text: {primary: '#1A1A1A', secondary: '#666666'},
  background: {primary: '#FFFFFF', surface: '#F8F8F8'},
  role: {success: '#10B981', warning: '#F59E0B', error: '#EF4444'},
  feature: {
    attendance: {primary: '#10B981', light: '#D1FAE5'},
    visits: {primary: '#3B82F6', light: '#DBEAFE'},
    sheetsSales: {primary: '#F59E0B', light: '#FEF3C7'},
    expenses: {primary: '#8B5CF6', light: '#EDE9FE'}
  }
};
```

### Spacing (8px Grid)
```typescript
spacing = {
  xxs: 4,   xs: 8,   sm: 12,  md: 16,
  lg: 24,   xl: 32,  xxl: 48,  xxxl: 64
};
```

### Typography
```typescript
typography = {
  h1: {fontSize: 28, fontWeight: '700', lineHeight: 34},
  h2: {fontSize: 24, fontWeight: '600', lineHeight: 30},
  body: {fontSize: 16, fontWeight: '400', lineHeight: 24},
  ...
};
```

---

## Component Library

### UI Components (8)
1. **Spinner** - Loading indicator
2. **Badge** - Status badges
3. **Toast** - Notifications
4. **ProgressBar** - Linear progress
5. **Checkbox** - Form checkbox
6. **Radio** - Form radio button
7. **Switch** - Toggle switch
8. **Select** - Dropdown picker
9. **Tabs** - Tab navigation

### Pattern Components (5)
1. **EmptyState** - No data states
2. **ErrorState** - Error states
3. **Skeleton** - Loading placeholders
4. **KpiCard** - Key metric cards
5. **FiltersBar** - Filter controls

---

## Rollout Plan (6 PRs)

### PR1: Theme Tokens
- Create `mobile/src/theme/` directory
- Add colors, spacing, typography files
- **Impact**: Foundation, no UI changes yet

### PR2: Core UI Components
- Implement 9 core components
- **Impact**: Reusable building blocks

### PR3: Pattern Components
- Implement 5 pattern components
- **Impact**: Screen-level patterns

### PR4: Exemplar Screen (AccountsListScreen)
- Apply DS to one screen completely
- **Impact**: Reference for other screens

### PR5: FlashList Performance
- Replace FlatList with FlashList
- **Impact**: 60% faster rendering

### PR6: Tenant Theming
- Add TenantThemeProvider for white-label
- **Impact**: Future multi-tenant support

---

## Alternatives Considered

### Alternative 1: Third-Party UI Library (React Native Paper, NativeBase)
- **Pros**: Pre-built components, theming, community
- **Cons**: Learning curve, customization limits, bundle size
- **Why rejected**: Want full control, custom brand aesthetic

### Alternative 2: Styled Components / Emotion
- **Pros**: CSS-in-JS, dynamic styling
- **Cons**: Performance overhead, React Native compatibility issues
- **Why rejected**: StyleSheet faster, React Native native solution

### Alternative 3: Tailwind CSS (NativeWind)
- **Pros**: Utility-first, rapid development
- **Cons**: Large class strings, not standard React Native
- **Why rejected**: Team prefers React Native StyleSheet patterns

### Alternative 4: No Design System (Keep Current)
- **Pros**: No upfront investment
- **Cons**: Technical debt grows, inconsistency worsens
- **Why rejected**: Unsustainable, hurts product quality

---

## Files Created

### Theme
- `mobile/src/theme/colors.ts`
- `mobile/src/theme/featureColors.ts`
- `mobile/src/theme/spacing.ts`
- `mobile/src/theme/typography.ts`
- `mobile/src/theme/roles.ts`
- `mobile/src/theme/states.ts`
- `mobile/src/theme/shadows.ts`
- `mobile/src/theme/runtime.tsx`

### Components
- `mobile/src/components/ui/Spinner.tsx`
- `mobile/src/components/ui/Badge.tsx`
- `mobile/src/components/ui/Toast.tsx`
- ... (9 total)

### Patterns
- `mobile/src/components/patterns/EmptyState.tsx`
- `mobile/src/components/patterns/ErrorState.tsx`
- `mobile/src/components/patterns/Skeleton.tsx`
- ... (5 total)

---

## Adoption Status

### Fully Migrated (85%)
- HomeScreen_v2
- StatsScreen
- AccountsListScreen (exemplar)
- Most manager screens

### Partially Migrated (10%)
- Some screens use tokens but not components

### Not Migrated (5%)
- Legacy screens (low priority)
- Complex custom UI screens

---

## References

- **Design Docs**: [docs/design/DESIGN_SYSTEM.md](../design/DESIGN_SYSTEM.md)
- **Component Catalog**: [docs/design/COMPONENT_CATALOG.md](../design/COMPONENT_CATALOG.md)
- **Visual Direction**: [docs/design/VISUAL_DIRECTION.md](../design/VISUAL_DIRECTION.md)
- **PR Releases**: [docs/releases/](../releases/)

---

## Lessons Learned

1. **Start small**: v0.1 focused on essentials, not perfection
2. **Exemplar matters**: One perfect screen guides others
3. **Document everything**: Component catalog is heavily used
4. **Phased rollout works**: Small PRs easier to review and test
5. **Performance**: Design system can improve performance (FlashList, memoization)

---

## Future Enhancements (v0.2)

- **Dark mode** support (color scheme switching)
- **Accessibility** improvements (screen readers, contrast)
- **Animations** library (consistent transitions)
- **Form components** (Input, TextArea, DatePicker)
- **Complex patterns** (DataTable, Charts)
- **Mobile-specific** (SwipeActions, PullToRefresh)

---

**Last Updated**: October 17, 2025
**Status**: v0.1 complete and adopted. v0.2 planning phase.
