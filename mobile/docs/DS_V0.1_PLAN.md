

# Artis Sales App — UI/UX System v0.1 (Track A + Track B Mix)

**Date:** Oct 14, 2025  
**Scope:** Android-first, Expo SDK 54 (RN 0.81). Keep the current custom DS (tokens + components). No heavy UI libs. Ship a thin **enterprise overlay** (wrappers + patterns) and a light **design pass** (roles/state/density tokens).  
**Important gate:** *Do not start this plan until the “SDK54 baseline & perf” PR (critical fixes) is merged and tested.*

---

## 0) Preconditions (Gate)
- ✅ `expo install --fix` applied; `expo doctor` clean (SDK 54 → RN 0.81.x).
- ✅ Firebase imports standardized (stick to **@react-native-firebase/** or the Web SDK consistently; avoid mixing in the same module).
- ✅ Root ErrorBoundary + one screen-level boundary added.
- ✅ Two heaviest lists tuned (keyExtractor/windowSize/etc.) and StatusBar centralized.

**Branch to use:** `feature/ds-v0.1`

---

## 1) Goals (v0.1)
- **Consistency:** unified state tokens (focus/pressed/disabled) + role tokens (success/warn/error/info) + density rules.
- **Reuse:** shared wrappers for Spinner/Badge/Toast/Select/etc.
- **Patterns:** Filters Bar, Empty/Error/Skeleton, KPI Card.
- **Perf:** repeatable list-perf recipe; optional FlashList on 1 heavy list.
- **White-label:** tenant theme provider (runtime) so brand swaps cleanly later.

**Definition of Done**
1) 3 exemplar screens use wrappers/patterns (1 rep flow, 1 manager list, 1 dashboard).  
2) Tokens include roles + states; centralized StatusBar used; Toast available.  
3) Heaviest list follows the perf recipe (optionally FlashList).  
4) Docs updated: Visual Direction 1-pager + component catalog + migration guide.

---

## 2) Files & Structure (additive; no breaking changes)

```
mobile/src/theme/
  roles.ts              // success/warn/error/info colors
  states.ts             // focus/pressed/disabled + overlays
  tokens.d.ts           // Type defs for tokens (colors, spacing, type, roles, states)
  index.ts              // re-export roles/states (keep existing exports)

mobile/src/providers/
  ToastProvider.tsx     // queue + portal + useToast()

mobile/src/ui/
  Spinner.tsx
  Badge.tsx
  Toast.tsx             // presentation; uses ToastProvider
  ProgressBar.tsx       // linear bar (keep your circular as-is)
  Checkbox.tsx
  Radio.tsx
  Switch.tsx
  Select.tsx            // modal-based; searchable optional
  Tabs.tsx              // segmented control style

mobile/src/patterns/
  FiltersBar/           // chips + “More filters” modal (uses Select)
    index.tsx
  EmptyState.tsx
  ErrorState.tsx
  Skeleton.tsx
  KpiCard.tsx

mobile/src/components/StatusBar.tsx  // centralized brand status bar

docs/
  VISUAL_DIRECTION.md
  COMPONENT_CATALOG.md
  MIGRATION_GUIDE.md
```

---

## 3) Tokens (Track B light — “mature” feel without redesign)

**Add:** `theme/roles.ts`
```ts
export const roles = {
  success: '#4CAF50',
  warning: '#FFC107',
  error:   '#F44336',
  info:    '#2196F3',
} as const;
```

**Add:** `theme/states.ts`
```ts
export const states = {
  focusRing: { width: 2, color: 'rgba(0,0,0,0.24)' },
  pressed:   { opacity: 0.92, scale: 0.98 },
  hover:     { opacity: 0.96 },
  disabled:  { opacity: 0.5 },
  overlay:   { scrim: 'rgba(0,0,0,0.32)' },
} as const;
```

**Add:** `theme/tokens.d.ts` to strongly type `colors`, `spacing`, `typography`, `shadows`, plus the new `roles` and `states`.  
**Rule:** Components never hard-code red/green/orange—read from `roles`. Press/disabled/outline visuals read from `states`.

---

## 4) Wrappers (Track A — standardize components)

### `ui/Spinner.tsx`
- Props: `size: 'sm'|'md'|'lg'` → 16/24/32; `tone?: 'primary'|'accent'|keyof typeof roles`.
- Wraps `ActivityIndicator`; uses theme colors.

### `ui/Badge.tsx`
- Props: `variant: 'neutral'|'success'|'warning'|'error'|'info'`, `size: 'sm'|'md'`, optional `icon`.
- Pill shape; background from `roles`.

### `providers/ToastProvider.tsx` + `ui/Toast.tsx`
- API: `useToast().show({ kind: 'success'|'error'|'info', text, duration? })`.
- Absolute portal near bottom; respects safe area; simple queue.

### `ui/ProgressBar.tsx`
- Props: `value (0..1)`, `trackColor`, `barColor`; 4px height default. (Keep your circular progress untouched.)

### `ui/Checkbox.tsx` / `ui/Radio.tsx` / `ui/Switch.tsx`
- 20–24dp, consistent focus ring from `states.focusRing`. Accessible roles/labels.

### `ui/Select.tsx`
- Modal list; supports search; props: `value`, `onChange`, `options`, `labelKey`, `valueKey`, `searchable?`.

### `ui/Tabs.tsx`
- Segmented control; props: `items: {key,label}[]`, `value`, `onChange`, optional `dense`.

---

## 5) Patterns (drop-ins)

### `patterns/FiltersBar`
- Horizontal quick chips + “More filters” (opens modal with one or more `Select`s).
- Emits `onApply(filters)`; save-view stub for later.

### `patterns/EmptyState.tsx`
- Props: `icon`, `title`, `subtitle`, `primaryAction?`.

### `patterns/ErrorState.tsx`
- Props: `message`, `retry?`.

### `patterns/Skeleton.tsx`
- Rect/text bars via animated opacity; props `rows`, `avatar?`, `card?`.

### `patterns/KpiCard.tsx`
- Props: `title`, `value`, `delta?: { value: number; positiveIsGood: boolean }`, optional `icon`.
- Delta auto-colors via `roles.success/error`.

---

## 6) StatusBar & Edge-to-Edge
Create `components/StatusBar.tsx` to unify:
- Android translucent status bar handling,
- background `#393735`, light content,
- safe area paddings for custom headers.

Replace ad-hoc StatusBar usages with this component.

---

## 7) List Performance Recipe
On 2–3 heavy lists:
- Add `keyExtractor`, `windowSize={8}`, `removeClippedSubviews`.
- Memo row (`React.memo`), memo handlers (`useCallback`), stabilize `extraData`.
- If fixed row height → `getItemLayout`.
- Optional: swap one list to **FlashList** (`estimatedItemSize`) and comment before/after timings.

---

## 8) White-label Readiness (runtime only in v0.1)
Add `TenantThemeProvider` (reads `/tenants/{id}/config`) and maps overrides into tokens: `colors`, `typography.fontFamily/scale`, `radius`, `spacingUnit`.  
No behavior change by default; dev flag to preview a sample tenant.

---

## 9) Docs to add/update
- `docs/VISUAL_DIRECTION.md` (1-pager): palette (primary/accent + roles), type scale (names → px/line height), spacing (8-pt), density rules, state tokens, icon sizes, chart rules (₹, %, axis).
- `docs/COMPONENT_CATALOG.md`: API + usage snippet for each wrapper/pattern.
- `docs/MIGRATION_GUIDE.md`: how to replace inline UI with `/ui/*` and patterns incrementally.

---

## 10) Rollout (small, safe PRs)

**PR1:** `feat(theme): roles & states tokens + types` ✅ **COMPLETE** (Oct 14, 2025)
Files: `theme/roles.ts`, `theme/states.ts`, `theme/tokens.d.ts`, `theme/index.ts`.
Bonus: Added Design Lab (dev-only) for live token editing + Kitchen Sink demonstrations.

### Theme Source of Truth
- **Design Lab**: Use to experiment with role colors, spacing, and typography in real-time (Kitchen Sink → Design Lab).
- **Preset**: Apply chosen colors from Design Lab to `src/theme/colorThemes.ts` (preset name: `brandTheme`).
- All components in PR2+ should reference `roles` tokens (bg/base/text/border) from the active preset.

**PR2:** `feat(ui): Spinner, Badge, Toast (provider+hook), ProgressBar`
Wire `ToastProvider` at app root; add `components/StatusBar.tsx`.
**Note:** Use role tokens (bg/base/text/border) from preset: `brandTheme`.

**PR3:** `feat(ui): Checkbox, Radio, Switch, Select, Tabs`  
Docs: begin `COMPONENT_CATALOG.md`.

**PR4:** `feat(patterns): FiltersBar, EmptyState, ErrorState, Skeleton, KpiCard`  
Convert one target screen to use 2–3 of these.

**PR5 (optional):** `perf(list): FlashList on <HeaviestScreen>`  
Comment with before/after timings.

**PR6:** `feat(tenant): TenantThemeProvider (runtime only)`  
Add sample `tenants/dev.json`; dev switch.

Each PR: screenshots + a tiny test plan (two Android versions).

---

## 11) Testing & A11y checklist
- **Devices:** Android 7/10/12/14.  
- **TalkBack:** meaningful labels; `accessibilityRole` on buttons/toggles.  
- **Contrast:** AA on primary surfaces and text.  
- **Hit targets:** ≥48dp.  
- **Perf:** long lists stutter-free on mid-range device.  
- **Failure paths:** ErrorState renders; Toast on API failures.

---

## 12) Risk & Rollback
- All changes are **additive**. Screens can continue using existing components.  
- If a wrapper causes drift, revert imports on that screen; tokens stay intact.  
- Tenant provider guarded by a flag; no default behavior change.

---

### Appendix A — Minimal examples

**Toast hook (shape)**
```tsx
// providers/ToastProvider.tsx
type Toast = { id: number; kind: 'success'|'error'|'info'; text: string; duration?: number };
const ToastCtx = React.createContext<{ show: (t: Omit<Toast,'id'>) => void }>({ show: () => {} });
export function ToastProvider({ children }: { children: React.ReactNode }) { /* queue + portal */ }
export const useToast = () => React.useContext(ToastCtx);
```

**Badge (shape)**
```tsx
// ui/Badge.tsx
export function Badge({ variant='neutral', children }: { variant?: 'neutral'|'success'|'warning'|'error'|'info'; children: React.ReactNode }) {
  const bg =
    variant==='success'? roles.success :
    variant==='warning'? roles.warning :
    variant==='error'  ? roles.error   :
    variant==='info'   ? roles.info    : '#ECECEC';
  return (
    <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: bg }}>
      <Text style={{ color: '#fff', fontWeight: '600' }}>{children}</Text>
    </View>
  );
}
```

---

## Owner & Timebox
- **Owner:** Kunal (with Claude Code support)  
- **Time:** ~5–7 dev days across the small PRs

**Acceptance:** When the six PRs are merged and 3 exemplar screens use wrappers/patterns with the visual direction applied, the UI layer is **v0.1 mature, consistent, and white-label-ready**.

---

### One-liner for Claude Code
> “Open `docs/DS_V0.1_PLAN.md` and implement **PR1** now (theme roles/states + types) on branch `feature/ds-v0.1`. Follow the file paths and constraints exactly. Stop after PR1 and show me the diff and a short test plan.”