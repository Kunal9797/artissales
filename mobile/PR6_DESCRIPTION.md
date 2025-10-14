# PR6: Tenant Theme Provider (White-label Support)

**Title:** `feat(tenant): add TenantThemeProvider for white-label support (PR6)`

**Base Branch:** `main`
**Head Branch:** `feature/ds-v0.1`
**Commit:** 43c5b5e

---

## Summary
Added TenantThemeProvider system for runtime theme overrides, enabling white-label support without code changes. Dev-only toggle in Kitchen Sink for testing.

## Core Changes

### 1. Provider Component
**File:** `src/providers/TenantThemeProvider.tsx`
- Context-based theme system with `useTenantTheme()` hook
- `loadTenant(id)` - Load tenant config from JSON
- `resetToDefault()` - Return to brand theme
- Merged theme object with runtime overrides
- `isCustomTenant` flag for conditional features
- Type-safe with TypeScript
- Fallback to brand theme on load failure

### 2. Tenant Config
**File:** `tenants/dev.json`
- Sample dev tenant configuration
- Blue primary (#1565C0), yellow accent (#FFB300)
- Demonstrates role color overrides (success/warning/error/info/primary/accent)
- Spacing/radius/typography scale overrides

### 3. App Integration
**File:** `App.tsx`
- Wired TenantThemeProvider at root (wraps ToastProvider)
- Available throughout app via context
- Zero production impact (defaults to brand theme)

### 4. Dev Toggle
**File:** `src/screens/KitchenSinkScreen.tsx`
- "Tenant Theme" section in Kitchen Sink (dev-only)
- "Load Dev Tenant" button - Apply dev theme
- "Reset to Default" button - Return to brand theme
- Shows active tenant name and color overrides
- Visual preview of override values (Primary, Accent, Success)

## Supported Overrides

### Role Colors
```json
"roles": {
  "success": { "base": "#2E7D32", "bg": "#E8F5E9", "text": "#1B5E20", "border": "#4CAF50" },
  "warning": { "base": "#F57C00", "bg": "#FFF3E0", "text": "#E65100", "border": "#FF9800" },
  "error": { "base": "#D32F2F", "bg": "#FFEBEE", "text": "#C62828", "border": "#F44336" },
  "info": { "base": "#1976D2", "bg": "#E3F2FD", "text": "#0D47A1", "border": "#2196F3" },
  "primary": { "base": "#1565C0", "bg": "#1565C0", "text": "#FFFFFF", "border": "#1565C0" },
  "accent": { "base": "#FFB300", "bg": "#FFF8E1", "text": "#F57F17", "border": "#FFC107" }
}
```

### Spacing, Radius, Typography
```json
"spacingUnit": 8,
"radius": { "sm": 4, "md": 8, "lg": 12 },
"typeScale": { "xs": 12, "sm": 14, "base": 16 }
```

## Benefits
- ✅ White-label ready (no code changes needed)
- ✅ Runtime theme switching for multi-tenant apps
- ✅ Gradual rollout (dev-only flag)
- ✅ Zero production impact (defaults to brand theme)
- ✅ Type-safe with TypeScript
- ✅ Extensible architecture (future: logos, fonts, feature flags)

## Testing Checklist
- [ ] Kitchen Sink loads without errors
- [ ] "Load Dev Tenant" button switches to dev theme
- [ ] Components show new colors (badges, buttons, KPI cards)
- [ ] "Reset to Default" button restores brand theme
- [ ] Invalid tenant ID falls back to brand theme (console error logged)
- [ ] No runtime errors when TenantThemeProvider not used
- [ ] Production builds still use brand theme (no tenant override by default)

## Documentation

### Added
- **`docs/PR6_TENANT_THEMING.md`** - Complete guide including:
  - Architecture overview (JSON config, Provider, Integration points)
  - Supported overrides (roles, spacing, radius, typography)
  - Usage examples (load at launch, conditional features, per-component access)
  - Testing checklist
  - Production rollout plan (4 phases: Dev-only → API integration → Asset overrides → Feature flags)
  - Migration guide for existing screens
  - Limitations (v0.1)
  - Security considerations

### Updated
- **`docs/DS_V0.1_PLAN.md`** - Marked PR6 complete with full implementation details

## Production Rollout Plan

### Phase 1 (Current): Dev-only ✅
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

## Security Considerations
1. **Validate tenant configs:** Ensure JSON schema matches expected structure before applying
2. **Sanitize tenant IDs:** Prevent path traversal (e.g., `../../../secrets`)
3. **Rate limit API:** If fetching tenant configs from API
4. **No PII in configs:** Tenant configs should not contain user data

## Limitations (v0.1)
- **No component auto-update:** Components using `import { roles } from '../theme'` won't see tenant changes. Future: pass theme via context to all DS components.
- **JSON config only:** No remote fetch (yet).
- **Dev-only toggle:** No production UI for tenant switching.
- **Partial overrides not supported:** Must provide full role object (base/bg/text/border).

## Migration Guide (Existing Screens)

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

## Related PRs
- PR1: Roles & states tokens
- PR2: Spinner, Badge, Toast, ProgressBar
- PR3: Input components (Checkbox, Radio, Switch, Select, Tabs)
- PR4: Pattern components (FiltersBar, EmptyState, ErrorState, Skeleton, KpiCard)
- PR5: FlashList performance migration

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
