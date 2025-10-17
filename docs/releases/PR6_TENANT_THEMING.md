# PR6: Tenant Theme Provider (White-label Ready)

**Date:** Oct 14, 2025
**Goal:** Runtime theme override system for white-label support
**Status:** Development-only (no production behavior change)

---

## Overview

`TenantThemeProvider` enables runtime theme customization by loading tenant-specific overrides from JSON configs. This allows the app to be white-labeled for different clients without code changes.

**Key Design Principle:** Default to brand theme, opt-in to tenant overrides.

---

## Architecture

### 1. Tenant Config (JSON)

**Location:** `/tenants/{tenantId}.json`

```json
{
  "tenantId": "dev",
  "name": "Dev Tenant (Demo)",
  "description": "Sample tenant configuration",
  "overrides": {
    "roles": {
      "primary": { "base": "#1565C0", "bg": "#1565C0", "text": "#FFFFFF", "border": "#1565C0" },
      "accent": { "base": "#FFB300", "bg": "#FFF8E1", "text": "#F57F17", "border": "#FFC107" }
    },
    "spacingUnit": 8,
    "radius": { "sm": 4, "md": 8, "lg": 12 },
    "typeScale": { "xs": 12, "sm": 14, "base": 16 }
  }
}
```

### 2. Provider Component

**File:** `src/providers/TenantThemeProvider.tsx`

**API:**
```tsx
const { theme, loadTenant, resetToDefault, isCustomTenant } = useTenantTheme();

// Load tenant
await loadTenant('dev');

// Reset to brand theme
resetToDefault();

// Check if custom theme active
if (isCustomTenant) { /* ... */ }
```

**Features:**
- Merges tenant overrides with brand defaults
- Fallback to brand theme on load failure
- Type-safe with TypeScript
- Context-based (no prop drilling)

### 3. Integration Points

**App Root:** [App.tsx:15](../App.tsx#L15)
```tsx
<TenantThemeProvider>
  <ToastProvider>
    <AppStatusBar />
    <RootNavigator />
  </ToastProvider>
</TenantThemeProvider>
```

**Dev Toggle:** [KitchenSinkScreen.tsx:144](../src/screens/KitchenSinkScreen.tsx#L144)
- "Load Dev Tenant" button (Kitchen Sink → Tenant Theme section)
- Shows active tenant name and color overrides
- Reset button to return to brand theme

---

## Supported Overrides

### Role Colors
```typescript
roles: {
  success: { base, bg, text, border },
  warning: { base, bg, text, border },
  error: { base, bg, text, border },
  info: { base, bg, text, border },
  primary: { base, bg, text, border },
  accent: { base, bg, text, border }
}
```

### Spacing
```typescript
spacingUnit: 8  // Base unit; multipliers derive xs/sm/md/lg/xl
```

### Border Radius
```typescript
radius: {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999
}
```

### Typography Scale
```typescript
typeScale: {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30
}
```

---

## Usage Examples

### Load Tenant at App Launch
```tsx
// In a future ProductionTenantLoader component
useEffect(() => {
  const tenantId = await fetchTenantIdFromAPI();
  loadTenant(tenantId);
}, []);
```

### Conditional Tenant Features
```tsx
const { isCustomTenant, theme } = useTenantTheme();

if (isCustomTenant) {
  // Show tenant-specific branding
  return <Logo uri={theme.tenantLogoUrl} />;
}
```

### Per-Component Theme Access
```tsx
const { theme } = useTenantTheme();

<Button style={{ backgroundColor: theme.roles.primary.base }}>
  Submit
</Button>
```

---

## Testing Checklist

- [ ] Kitchen Sink loads without errors
- [ ] "Load Dev Tenant" button switches to dev theme
- [ ] Components show new colors (badges, buttons, KPI cards)
- [ ] "Reset to Default" button restores brand theme
- [ ] Invalid tenant ID falls back to brand theme (console error logged)
- [ ] No runtime errors when TenantThemeProvider not used
- [ ] Production builds still use brand theme (no tenant override by default)

---

## Production Rollout Plan

### Phase 1 (Current): Dev-only
- Tenant toggle in Kitchen Sink (dev builds only)
- No production behavior change
- Validates architecture

### Phase 2: API Integration
- Add API endpoint to fetch tenant config
- Load tenant ID from user profile
- Cache tenant config locally

### Phase 3: Asset Overrides
- Logo URLs in tenant config
- Custom splash screens
- Font family overrides

### Phase 4: Per-Tenant Features
- Feature flags in tenant config
- Conditional modules (e.g., payment gateways)
- Localization overrides

---

## Migration Guide (Existing Screens)

If a screen hardcodes colors, migrate to tenant-aware tokens:

### Before (Hardcoded)
```tsx
<View style={{ backgroundColor: '#393735' }}>
  <Text style={{ color: '#D4A944' }}>Hello</Text>
</View>
```

### After (Tenant-aware)
```tsx
const { theme } = useTenantTheme();

<View style={{ backgroundColor: theme.roles.primary.base }}>
  <Text style={{ color: theme.roles.accent.base }}>Hello</Text>
</View>
```

**Note:** Most components already use `roles` from `theme/roles.ts`. For full tenant support, they would need to read from `useTenantTheme().theme.roles` instead.

---

## Limitations (v0.1)

- **No component auto-update:** Components using `import { roles } from '../theme'` won't see tenant changes. Future: pass theme via context to all DS components.
- **JSON config only:** No remote fetch (yet).
- **Dev-only toggle:** No production UI for tenant switching.
- **Partial overrides not supported:** Must provide full role object (base/bg/text/border).

---

## Security Considerations

1. **Validate tenant configs:** Ensure JSON schema matches expected structure before applying
2. **Sanitize tenant IDs:** Prevent path traversal (e.g., `../../../secrets`)
3. **Rate limit API:** If fetching tenant configs from API
4. **No PII in configs:** Tenant configs should not contain user data

---

## Related PRs

- PR1: Roles & states tokens
- PR2: Spinner, Badge, Toast, ProgressBar
- PR3: Input components (Checkbox, Radio, Switch, Select, Tabs)
- PR4: Pattern components (FiltersBar, EmptyState, ErrorState, Skeleton, KpiCard)
- PR5: FlashList performance migration

**Next Steps:** Open separate PRs for PR5 (FlashList) and PR6 (TenantThemeProvider) on GitHub.
