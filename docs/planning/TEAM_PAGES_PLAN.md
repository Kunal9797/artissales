# Team Management Pages - Implementation Plan

**Created**: 2025-01-11
**Status**: Ready to implement
**Estimated Time**: 1-2 weeks

---

## Quick Summary

Build 5 interconnected Team pages matching mobile app functionality using Tremor components for clean design.

---

## Pages Overview

### 1. Team List (`/team`)
- Tremor Table with columns: Name, Role, Phone, Territory, Status, Created
- Search (name/phone/territory) + Filter pills (All/Active/Inactive)
- "Add User" button → navigate to add page
- Row click → User Detail page
- **API**: `getUsersList()` (cached 5 min)

### 2. User Detail (`/team/[userId]`)
- Breadcrumb + header (name, role, territory)
- Date range selector (Today/Week/Month/Custom)
- 4 stat cards in 2x2 grid:
  - **Attendance**: Days present/total, percentage, calendar heatmap
  - **Visits**: Total + breakdown by type (Dist/Dealer/Arch/Contr), progress bars if targets
  - **Sheet Sales**: Total + by catalog, progress bars with targets, color-coded achievement
  - **Expenses**: Total amount, status breakdown (Pending/Approved/Rejected), category breakdown
- Actions: "Set Target", "Edit Details" buttons
- **APIs**: `getUserStats({ userId, startDate, endDate })`, `getTarget({ userId, month })`

### 3. Add User (`/team/add`)
- Form fields: Phone*, Name*, Role*, Territory*, Primary Distributor (optional for reps)
- Validation: Real-time with inline error messages
- Role selector: Grid of buttons (permissions-based)
- "Create User" + "Cancel" buttons
- **API**: `createUserByManager({ phone, name, role, territory, primaryDistributorId? })`

### 4. Set Target (`/team/[userId]/targets`)
- Month selector (current month default)
- Sheet targets: 4 inputs (Fine Decor, Artvio, Woodrica, Artis 1MM)
- Visit targets: 3 inputs (Dealer, Architect, Contractor)
- Auto-renew toggle + info callout
- "Stop Auto-Renew" button if previously enabled
- **APIs**: `getTarget({ userId, month })`, `setTarget({ userId, month, targets, autoRenew })`

### 5. Team Targets Overview (`/team/targets`) - OPTIONAL
- Month selector + filter tabs (All/With Targets/Without Targets)
- Grid of cards showing each user's target progress
- Progress bars color-coded (green ≥80%, yellow ≥50%, red <50%)
- "Set Target" button for users without targets
- **API**: `getUserTargets({ month })`

---

## Design System

**Components**: Tremor (Table, Card, Badge, ProgressBar, Select, Switch)
**Colors**: Brand gold (#C9A961), dark (#393735), status colors (green/yellow/red)
**Typography**: 28px titles, 20px sections, 14px body, 12px captions
**Layout**: Max-width 1280px, responsive grid

**Role Badge Colors**:
- Sales Rep: Blue (#1976D2)
- Area Manager: Green (#2E7D32)
- Zonal Head: Orange (#F57C00)
- National Head: Purple (#7B1FA2)
- Admin: Gray (#424242)

---

## Implementation Phases

**Phase 1** (1-2 days): Team List + search/filter
**Phase 2** (2-3 days): User Detail with 4 stat cards
**Phase 3** (1-2 days): Add User form
**Phase 4** (1-2 days): Set Target page
**Phase 5** (1 day): Team Targets overview
**Phase 6** (1 day): Polish + testing

---

## Shared Components to Build

1. **RoleBadge** - `<Badge color={roleColor}>{roleName}</Badge>`
2. **StatusBadge** - `<Badge color="green|red">Active|Inactive</Badge>`
3. **ProgressBarWithTarget** - Progress bar + "X/Y (Z%)" label
4. **DateRangePicker** - Tremor DateRangePicker or custom

---

## API Calls (All exist in lib/api.ts)

- `getUsersList()` → Team list
- `getUserStats({ userId, startDate, endDate })` → User detail stats
- `createUserByManager({ phone, name, role, territory, primaryDistorId? })` → Add user
- `updateUser({ userId, phone?, territory? })` → Edit user
- `getTarget({ userId, month })` → Load target
- `setTarget({ userId, month, targets, autoRenew })` → Save target
- `getUserTargets({ month })` → Team targets overview

---

## Next Actions

1. Create `app/(dashboard)/team/page.tsx` - Team List
2. Create shared badge components
3. Build Tremor Table with search/filter
4. Add navigation to user detail
5. Test with real data

**First file to create**: [manager-dashboard/app/(dashboard)/team/page.tsx](manager-dashboard/app/(dashboard)/team/page.tsx)
