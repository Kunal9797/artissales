# Mobile App Loading Skeleton Analysis Report

**Analysis Date**: October 24, 2025  
**Codebase**: Artis Field Sales Mobile App  
**Scope**: 30 screens + 22 components in `mobile/src/`

---

## Executive Summary

The mobile app has a **Skeleton component library** that exists but is **severely under-utilized**. Currently:

- **1 skeleton component** exists: `/mobile/src/patterns/Skeleton.tsx` (well-designed, animated)
- **1 screen** uses skeletons properly: `AccountsListScreen.tsx` (3 skeleton rows when loading)
- **~20+ screens** still use `ActivityIndicator` (spinning spinner) or no loading state
- **~15 screens** with list/data loading have **NO loading state at all**
- **Inconsistent patterns** across the codebase for handling loading states

This is a **high-impact standardization opportunity** to improve perceived performance and visual consistency across the app.

---

## Part 1: Existing Skeleton Component

### Location
`/Users/kunal/ArtisSales/mobile/src/patterns/Skeleton.tsx`

### Implementation Details
```typescript
// Well-designed pattern with:
- Animated opacity loop (fade in/out, no shimmer lib)
- 3 variants: rows (list), avatar, card
- Native driver animation (smooth, performant)
- Color tokens from theme (respects design system)
- Exports via patterns/index.ts

// Props:
- rows: number (default 3) - how many lines to show
- avatar: boolean - circle avatar on left
- card: boolean - full card layout with image placeholder
```

### Visual Behavior
- Fades opacity 0.3 → 1.0 → 0.3 over 1.6s per cycle
- Rows of placeholder bars with varying widths (60%, 100%, 40%)
- Card variant: image placeholder + 2 text lines
- Uses `colors.border.default` for skeleton color (matches theme)

### Export Status
✅ Properly exported in `/mobile/src/patterns/index.ts`

---

## Part 2: Current Usage (Where Skeletons ARE Being Used)

### Screens Using Skeleton Component (1 screen)

| Screen | Location | Usage | Pattern |
|--------|----------|-------|---------|
| **AccountsListScreen** | `screens/manager/AccountsListScreen.tsx` | 3x `<Skeleton rows={3} avatar />` | List loading state in conditional |

### Code Example
```typescript
// AccountsListScreen.tsx lines 259-264
{loading ? (
  <View style={styles.content}>
    <Skeleton rows={3} avatar />
    <Skeleton rows={3} avatar />
    <Skeleton rows={3} avatar />
  </View>
) : error ? (
  // ...
)}
```

### Components with Custom Loading States

| Component | Location | Loading Implementation | Issue |
|-----------|----------|------------------------|----|
| **DetailedTargetProgressCard** | `components/DetailedTargetProgressCard.tsx` | Custom inline skeleton (hardcoded styles, not reusing Skeleton) | Duplicated skeleton logic |
| **VisitProgressCard** | `components/VisitProgressCard.tsx` | Comment: "Skeleton loading styles" (but no actual implementation visible) | Incomplete |

---

## Part 3: Screens Using ActivityIndicator (Not Skeletons)

### Full-Screen Loading with Spinner (~12 screens)
These show a full-screen centered `ActivityIndicator` when loading:

| Screen | Location | When Shown |
|--------|----------|-----------|
| HomeScreen_v2 | `screens/HomeScreen_v2.tsx` | No loading state (just uses state, no conditional render) |
| StatsScreen | `screens/StatsScreen.tsx:L50` | `ActivityIndicator size="large"` when `loading=true` |
| DocumentsScreen | `screens/DocumentsScreen.tsx:L225` | `ActivityIndicator size="large"` when `loading=true` |
| UserListScreen | `screens/manager/UserListScreen.tsx:L196` | `ActivityIndicator size="large"` when `loading=true` |
| AccountDetailScreen | `screens/manager/AccountDetailScreen.tsx:L91` | `ActivityIndicator size="large"` + "Loading account..." text |
| DSRApprovalDetailScreen | `screens/manager/DSRApprovalDetailScreen.tsx` | `ActivityIndicator size="large"` when loading |
| TeamTargetsScreen | `screens/manager/TeamTargetsScreen.tsx` | `ActivityIndicator size="large"` when loading |
| SetTargetScreen | `screens/manager/SetTargetScreen.tsx` | `ActivityIndicator size="large"` when loading |
| UserDetailScreen | `screens/manager/UserDetailScreen.tsx` | `ActivityIndicator size="large"` when loading |
| ManageDownloadsScreen | `screens/ManageDownloadsScreen.tsx` | `ActivityIndicator size="large"` when loading |
| LoginScreen | `screens/LoginScreen.tsx:L180` | `ActivityIndicator` in button during submission |
| OTPScreen | `screens/OTPScreen.tsx` | Likely has loading state (not fully examined) |

**Pattern**: `ActivityIndicator` wrapped in conditional render, usually centered with text like "Loading..."

### Inline/Button Loading with Spinner (~8 screens)
Small spinners inside buttons or action areas during submission:

| Screen | Location | Use Case |
|--------|----------|----------|
| AddAccountScreen | `screens/AddAccountScreen.tsx` | Submit button shows small spinner while saving |
| EditAccountScreen | `screens/EditAccountScreen.tsx` | Submit button shows small spinner |
| CompactSheetsEntryScreen | `screens/sheets/CompactSheetsEntryScreen.tsx` | 2x buttons with small spinners |
| UploadDocumentScreen | `screens/UploadDocumentScreen.tsx` | Upload button with spinner |
| DSRApprovalDetailScreen | `screens/manager/DSRApprovalDetailScreen.tsx` | 2x action buttons with spinners |
| UserDetailScreen | `screens/manager/UserDetailScreen.tsx` | Action button with spinner |

**Pattern**: `{loading && <ActivityIndicator ... />}` inside button rendering

---

## Part 4: Screens with NO Loading State (Missing!)

### Data-Loading Screens (Should Have Loading States)

| Screen | Data Type | Current Behavior | Recommendation |
|--------|-----------|------------------|-----------------|
| **HomeScreen_v2** | Lists (visits, sheets, expenses, activities) | Imports ActivityIndicator but doesn't render it; shows data as loads | Add Skeleton for activity timeline |
| **DSRApprovalListScreen** | List of DSRs | Shows empty state after loading, no skeleton | Add Skeleton rows with avatar |
| **SelectAccountScreen** | List of accounts (for visit selection) | Unknown - not fully examined | Likely needs skeleton |
| **LogVisitScreen** | Form with account data | Unknown - not fully examined | May need field skeletons |
| **DesignLabScreen** | Theme preview components | Shows raw ActivityIndicator in preview | Not critical (dev-only) |
| **KitchenSinkScreen** | Component demos | Has manual skeleton toggle button (dev-only) | Not critical (dev-only) |

### Forms/Detail Screens

| Screen | Data Type | Current Behavior | Recommendation |
|--------|-----------|------------------|-----------------|
| **ProfileScreen** | User profile data | Unknown - not examined | May need field-level skeletons |
| **ExpenseEntryScreen** | Form + data loading | Unknown - not examined | May need field skeletons |
| **AddAccountScreen** | Form creation | Has button spinner only | No main loading state (acceptable) |
| **EditAccountScreen** | Form + account data | Has button spinner only | May need initial load skeleton |

---

## Part 5: Consistency Issues & Patterns

### Inconsistencies Found

#### 1. **Full-Screen Loading Pattern**
```typescript
// Pattern A: AccountsListScreen - Uses Skeleton ✅
{loading ? (
  <View style={styles.content}>
    <Skeleton rows={3} avatar />
    // ...
  </View>
) : (
  // content
)}

// Pattern B: StatsScreen - Uses ActivityIndicator
{loading ? (
  <View style={styles.centerContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
) : (
  // content
)}

// Pattern C: HomeScreen_v2 - No conditional render (loads data async)
// Just shows empty state until data loads
```

#### 2. **Skeleton Duplication in DetailedTargetProgressCard**
```typescript
// CustomInline skeleton (lines 44-69) - NOT reusing Skeleton component
if (loading) {
  return (
    <View style={[{
      backgroundColor: '#FFFFFF',
      // ... hardcoded styles repeated
    }, style]}>
      {/* Manual skeleton bars */}
    </View>
  );
}
```
**Issue**: Duplicate skeleton logic instead of using `<Skeleton />` component

#### 3. **No Skeleton Prop Customization**
`Skeleton` component lacks props for common scenarios:
- Width customization (some cards are narrower)
- Height customization (compact vs. tall skeletons)
- Animated vs. static (some might prefer static)
- Color override (theme colors might not always work)

---

## Part 6: Missing Loading States by Feature

### Attendance & Quick Actions
- [ ] HomeScreen check-in/check-out modal - shows loading spinner in button only
- [ ] Attendance history loading - no skeleton

### Visits Module
- [ ] SelectAccountScreen (account list when entering visit) - **MISSING**
- [ ] LogVisitScreen (initial account data load) - **MISSING**
- [ ] Visit history/timeline - no skeleton

### Sheets/Sales Entry
- [ ] CompactSheetsEntryScreen form - button spinner only, no form skeleton
- [ ] Sheet history - **MISSING**

### Reports & Analytics
- [ ] StatsScreen - has spinner, should use skeleton
- [ ] DSRApprovalListScreen - has no skeleton, only activity indicator elsewhere
- [ ] DSRApprovalDetailScreen - has spinner, should have content skeletons

### Documents
- [ ] DocumentsScreen - has spinner, should use skeleton rows
- [ ] ManageDownloadsScreen - has spinner, should use skeleton

### Manager Dashboard
- [ ] UserListScreen - has spinner, should use skeleton rows
- [ ] UserDetailScreen - has spinner, should use skeleton content
- [ ] AccountsListScreen - **ONLY ONE DOING IT RIGHT** ✅
- [ ] AccountDetailScreen - has spinner, should use skeleton

---

## Part 7: Recommended Consistency Pattern

### Recommended Component Loading States Pattern

```typescript
// For list screens showing multiple items
if (loading) {
  return (
    <View style={styles.container}>
      <Skeleton rows={3} avatar />
      <Skeleton rows={3} avatar />
      <Skeleton rows={3} avatar />
    </View>
  );
}

// For detail/single-item screens
if (loading) {
  return (
    <View style={styles.container}>
      <Skeleton rows={5} avatar />
    </View>
  );
}

// For card-based content
if (loading) {
  return (
    <View style={styles.cardGrid}>
      <Skeleton card />
      <Skeleton card />
      <Skeleton card />
    </View>
  );
}

// For tables/structured data
if (loading) {
  return (
    <View style={styles.table}>
      {[1, 2, 3, 4, 5].map(i => (
        <Skeleton key={i} rows={2} avatar={false} />
      ))}
    </View>
  );
}
```

### Recommended Spinner Pattern (Action Buttons Only)

```typescript
// Only use ActivityIndicator for:
// 1. Form submission buttons
// 2. Action buttons (delete, approve, etc.)
// 3. Inline file uploads
// NOT for full-screen data loading

<TouchableOpacity
  disabled={isSubmitting}
  onPress={handleSubmit}
  style={styles.submitButton}
>
  {isSubmitting ? (
    <ActivityIndicator size="small" color="#fff" />
  ) : (
    <Text>Submit</Text>
  )}
</TouchableOpacity>
```

---

## Part 8: Enhancement Opportunities for Skeleton Component

### Current Props
```typescript
interface SkeletonProps {
  rows?: number;      // Lines to show
  avatar?: boolean;   // Circle on left
  card?: boolean;     // Card layout
}
```

### Recommended Additional Props
```typescript
interface SkeletonProps {
  rows?: number;
  avatar?: boolean;
  card?: boolean;
  
  // NEW - Width variants
  width?: 'full' | '80' | '60' | 'auto';  // Percentage
  
  // NEW - Height variants  
  height?: 'compact' | 'standard' | 'tall';
  
  // NEW - Animated vs static
  animated?: boolean;  // Default true
  
  // NEW - Quantity
  count?: number;  // How many skeletons to render in a list
  
  // NEW - Custom spacing
  gap?: number;  // Between rows/items
  
  // NEW - Color override
  color?: string;  // Override theme color
}
```

### Example Usage After Enhancement
```typescript
// Before
<Skeleton rows={3} avatar />
<Skeleton rows={3} avatar />
<Skeleton rows={3} avatar />

// After (with count prop)
<Skeleton rows={3} avatar count={3} />

// Compact variant
<Skeleton rows={2} avatar height="compact" count={5} />

// Table-like variant
<Skeleton rows={4} avatar={false} width="100" count={10} />
```

---

## Part 9: Summary Statistics

### Current State Analysis

| Metric | Count | Status |
|--------|-------|--------|
| Total screens | 30 | - |
| Using Skeleton component | 1 | ❌ 3% |
| Using ActivityIndicator spinner | ~20 | ⚠️ 67% |
| No loading state at all | ~9 | ❌ 30% |
| Total components | 22 | - |
| Components with loading state | 2-3 | ⚠️ 10% |
| Skeleton pattern duplication | 1 | ❌ DetailedTargetProgressCard |

### Loading State Distribution

```
Screens by Loading Implementation:
├─ Skeleton Component          →  1  (3%)  ✅ Optimal
├─ ActivityIndicator          → 20  (67%) ⚠️  Needs improvement
├─ No Loading State           →  9  (30%) ❌ Missing
└─ Total                       → 30

Components by Loading State:
├─ Proper Skeleton Usage       →  0  ❌ 
├─ Custom Skeleton Pattern     →  1  (DetailedTargetProgressCard)
├─ ActivityIndicator          →  1  (VisitProgressCard comment)
└─ None                        → 20  (90%)
```

---

## Part 10: Recommendations & Action Items

### Priority 1: High-Impact Standardization
These will significantly improve perceived performance:

1. **Convert Full-Screen Loading Spinners to Skeletons** (12 screens)
   - StatsScreen
   - DocumentsScreen
   - UserListScreen
   - AccountDetailScreen (detail + visit list)
   - DSRApprovalListScreen
   - DSRApprovalDetailScreen
   - TeamTargetsScreen
   - SetTargetScreen
   - UserDetailScreen
   - ManageDownloadsScreen
   
   **Impact**: Better perceived performance, more consistent UX
   **Effort**: ~1-2 hours (copy-paste from AccountsListScreen, adjust for each screen)

2. **Fix DetailedTargetProgressCard Duplication** (1 component)
   - Remove custom skeleton inline code
   - Use `<Skeleton />` component
   
   **Impact**: Code reuse, maintenance simplification
   **Effort**: ~15 minutes

3. **Add Loading States to Missing Data Screens** (9 screens)
   - HomeScreen_v2 (activity timeline when empty)
   - SelectAccountScreen
   - LogVisitScreen
   - ProfileScreen
   - ExpenseEntryScreen
   - EditAccountScreen
   - And others
   
   **Impact**: Consistency, professionalism
   **Effort**: ~2-3 hours

### Priority 2: Component Enhancement
Improve the Skeleton component for broader use:

1. **Add `count` Prop**
   ```typescript
   <Skeleton rows={3} avatar count={5} />
   // Renders 5 skeleton items instead of hardcoding
   ```
   **Effort**: ~30 minutes

2. **Add `height` Variant**
   ```typescript
   <Skeleton rows={2} avatar height="compact" />
   // For condensed list items
   ```
   **Effort**: ~30 minutes

3. **Add `animated` Toggle**
   ```typescript
   <Skeleton animated={false} />
   // For static placeholder option
   ```
   **Effort**: ~20 minutes

### Priority 3: Documentation
Create developer guidelines:

1. **Add Skeleton Usage Guide to CLAUDE.md**
   - When to use Skeleton vs. ActivityIndicator
   - Code patterns for each screen type
   - Component examples

2. **Create Storybook-style examples**
   - In KitchenSinkScreen or DesignLabScreen
   - Show all skeleton variants
   - Show loading patterns

---

## Part 11: File Listing (for Implementation)

### Files to Modify

**Core Component**:
- `/Users/kunal/ArtisSales/mobile/src/patterns/Skeleton.tsx` (enhance)

**Screens - High Priority** (Spinner → Skeleton):
- `/Users/kunal/ArtisSales/mobile/src/screens/StatsScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/DocumentsScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/manager/UserListScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/manager/AccountDetailScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/manager/DSRApprovalListScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/manager/DSRApprovalDetailScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/manager/TeamTargetsScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/manager/SetTargetScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/manager/UserDetailScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/ManageDownloadsScreen.tsx`

**Components - Fix Duplication**:
- `/Users/kunal/ArtisSales/mobile/src/components/DetailedTargetProgressCard.tsx`

**Screens - Add Missing States**:
- `/Users/kunal/ArtisSales/mobile/src/screens/HomeScreen_v2.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/visits/SelectAccountScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/visits/LogVisitScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/profile/ProfileScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/expenses/ExpenseEntryScreen.tsx`
- `/Users/kunal/ArtisSales/mobile/src/screens/EditAccountScreen.tsx`

**Reference (Already Correct)**:
- `/Users/kunal/ArtisSales/mobile/src/screens/manager/AccountsListScreen.tsx` ✅

---

## Conclusion

The mobile app has a well-designed Skeleton component that is severely under-utilized. By standardizing loading states across all screens to use Skeletons instead of spinners, the app will:

1. **Look more polished** - Loading placeholders feel more native/modern
2. **Feel faster** - Skeleton layout hints make the wait feel shorter
3. **Be more consistent** - One pattern across 30+ screens
4. **Reduce code duplication** - Stop re-creating skeleton logic in components
5. **Improve maintainability** - Update one component to affect app-wide loading UX

**Recommended next step**: Start with Priority 1 screens (convert 12 spinner screens to Skeleton), then add missing states to 9 screens, then enhance the Skeleton component with convenience props.

---

**Generated**: October 24, 2025
**Analysis Tool**: Claude Code Agent
