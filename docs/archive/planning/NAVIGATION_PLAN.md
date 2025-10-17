# ARCHIVED - SUPERSEDED

**Date Archived**: 2025-10-17
**Reason**: Superseded by [COMPLETE_NAVIGATION_PLAN.md](../planning/COMPLETE_NAVIGATION_PLAN.md) (Oct 16, 1 day newer)

---

# Artis Sales App - Navigation Structure Plan

**Date:** October 15, 2025
**Decision:** Bottom Tab Navigation + FAB (Option D)

---

## 📊 Feature Inventory

### Current Features (Implemented)

#### Sales Rep Features
- ✅ **Attendance** - Check in/out with GPS
- ✅ **Sheet Sales Logging** - Log daily laminate sheets sold by catalog
- ✅ **Visit Logging** - Log distributor/dealer/architect visits with photos
- ✅ **Expense Reporting** - Report daily expenses with receipts
- ✅ **DSR (Daily Sales Report)** - Auto-compiled daily report for manager review
- ✅ **Target Progress** - View monthly sales targets by catalog
- ✅ **Visit Progress** - View monthly visit targets by account type
- ✅ **Documents** - View/download product catalogs, price lists, resources
- ✅ **Profile** - View/edit profile, settings, logout

#### Manager Features (National Head/Admin)
- ✅ **Team Overview** - Dashboard of team performance
- ✅ **User Management** - View/add/edit sales reps
- ✅ **Account Management** - Manage distributors/dealers/architects
- ✅ **Set Targets** - Set sales & visit targets for reps
- ✅ **DSR Approval** - Review and approve daily sales reports
- ✅ **Team Targets** - View team-wide target progress
- ✅ **Expense Approval** - Approve/reject expense reports (implied)
- ✅ **Upload Documents** - Upload resources for team

### Future Features (Planned - V2+)

#### Sales Rep Features (Future)
- 🔮 **Leads Management** - View assigned leads, update status, follow-up
- 🔮 **Lead SLA Tracking** - See which leads need urgent attention (4-hour SLA)
- 🔮 **Route Planning** - Optimized visit routes (Google Maps integration)
- 🔮 **Quoting/Invoicing** - Generate quotes for customers
- 🔮 **Inventory Check** - Check product availability
- 🔮 **WhatsApp Integration** - Quick updates to customers
- 🔮 **Voice Notes** - Record visit notes instead of typing
- 🔮 **Offline Queue** - See pending sync items

#### Manager Features (Future)
- 🔮 **Advanced Analytics** - Charts, trends, forecasting
- 🔮 **Lead Distribution** - Assign leads to reps, reassign on SLA breach
- 🔮 **Performance Reviews** - Monthly/quarterly reports per rep
- 🔮 **Territory Management** - Manage pincode routing
- 🔮 **Sales Incentives** - Calculate commissions/bonuses
- 🔮 **Export Reports** - CSV/PDF exports for ERP integration
- 🔮 **Real-time Notifications** - Push alerts for critical events

---

## 🎯 Navigation Structure: Sales Rep View

### Bottom Tab Bar (5 Tabs)

```
┌─────┬──────┬──────┬──────┬─────┐
│ 🏠  │ 📊  │  ➕  │ 📋  │ 👤  │
│Home │Stats │ Log │Tasks │ Me  │
└─────┴──────┴──────┴──────┴─────┘
```

---

### Tab 1: 🏠 Home (Dashboard)

**Purpose:** Quick overview + status at a glance

**Content:**
```
┌─────────────────────────────────┐
│ Good morning, Kunal! 👋         │
│                                 │
│ ✅ Checked In                   │  ← Attendance Status
│    9:15 AM · Office · 12m       │     (KpiCard variant)
│    [Check Out →]                │
│                                 │
│ 📊 Today's Activity              │  ← Daily Summary
│    3 visits · 250 sheets        │     (KpiCard)
│    ₹420 expenses                │
│                                 │
│ 🔔 Action Items (2)             │  ← Pending Tasks
│    • Complete DSR for Oct 14    │     (Badge with count)
│    • Expense receipt needed     │
│                                 │
│ 📚 Quick Access                 │  ← Shortcuts
│    💼 Product Catalog           │
│    💲 Price Lists               │
└─────────────────────────────────┘
```

**Features:**
- Attendance status (big, prominent)
- Today's activity summary
- Pending action items (badges with counts)
- Quick links to frequently used documents

**Future Additions:**
- 🔮 Urgent leads (SLA expiring soon)
- 🔮 Offline sync status

---

### Tab 2: 📊 Stats (Progress Tracking)

**Purpose:** View targets, progress, performance

**Content:**
```
┌─────────────────────────────────┐
│ Stats                   Oct ▼   │  ← Month selector
│                                 │
│ 🎯 Sales Targets                │
│ ┌──────────────────────────┐   │
│ │ Woodrica    ████████ 87% │   │  ← TargetProgressCard
│ │ 1,280 / 1,500 sheets     │   │     (enhanced with
│ │                          │   │      ProgressBar from DS)
│ │ Fine Decor  ████░░░░ 42% │   │
│ │ 520 / 1,200 sheets       │   │
│ └──────────────────────────┘   │
│                                 │
│ 🏢 Visit Targets                │
│ ┌──────────────────────────┐   │
│ │ Distributors ████░░ 60%  │   │  ← VisitProgressCard
│ │ 3 / 5 visits             │   │     (enhanced)
│ │                          │   │
│ │ Dealers      ██████ 80%  │   │
│ │ 4 / 5 visits             │   │
│ └──────────────────────────┘   │
│                                 │
│ 📈 This Month                   │
│ [Charts/graphs - future]        │
└─────────────────────────────────┘
```

**Features:**
- Monthly sales target progress (all catalogs)
- Monthly visit target progress (all account types)
- Month selector (dropdown)
- Historical performance charts (future)

**Future Additions:**
- 🔮 Performance trends (charts)
- 🔮 Comparison with team average
- 🔮 Achievement badges

---

### Tab 3: ➕ Log (FAB - Quick Actions)

**Purpose:** Fast logging of daily activities

**Interaction:** Tap center ➕ button → Bottom sheet menu appears

**Bottom Sheet Menu:**
```
┌─────────────────────────────────┐
│ Quick Log                    ×  │
├─────────────────────────────────┤
│                                 │
│  📊  Log Sheet Sales            │  → SheetsEntryScreen
│       Record daily sales        │
│                                 │
│  📸  Log Visit                  │  → SelectAccountScreen
│       Log client visit          │
│                                 │
│  💰  Report Expense             │  → ExpenseEntryScreen
│       Add expense with receipt  │
│                                 │
│  ⏰  Attendance                 │  → AttendanceScreen
│       Check In/Out              │     (quick access)
│                                 │
└─────────────────────────────────┘
```

**Actions:**
1. **Log Sheet Sales** → SheetsEntryScreen
   - Select catalog (tabs: Woodrica, Fine Decor, Artvio, Artis)
   - Enter count
   - Optional notes
   - Toast success message

2. **Log Visit** → SelectAccountScreen → LogVisitScreen
   - Select account (distributor/dealer/architect)
   - Select purpose (dropdown)
   - Take photo (required)
   - Add notes
   - Submit → Toast success

3. **Report Expense** → ExpenseEntryScreen
   - Select category (travel/food/accommodation/other)
   - Enter amount (₹)
   - Add description
   - Attach receipt photo (optional)
   - Submit → Toast success

4. **Attendance** → AttendanceScreen
   - Quick check in/out
   - GPS stamp
   - View today's hours

**Future Additions:**
- 🔮 **Update Lead** (quick status update)
- 🔮 **Voice Note** (record instead of type)

---

### Tab 4: 📋 Tasks (To-Dos & Resources)

**Purpose:** Pending items, documents, reports

**Content:**
```
┌─────────────────────────────────┐
│ Tasks                           │
│                                 │
│ ⚠️ Pending (2)                  │  ← Badge shows count
│ ┌──────────────────────────┐   │
│ │ 📝 Complete DSR          │   │  → DSRScreen
│ │    For Oct 14            │   │
│ │                          │   │
│ │ 📸 Expense Receipt       │   │  → ExpenseEntryScreen
│ │    Upload for ₹420 exp  │   │     (edit mode)
│ └──────────────────────────┘   │
│                                 │
│ 📄 Documents & Resources        │
│ ┌──────────────────────────┐   │
│ │ 📘 Product Catalog       │   │  → DocumentLibraryScreen
│ │ 💲 Price Lists           │   │
│ │ 📊 Sales Kit             │   │
│ │ 📥 Manage Downloads      │   │
│ └──────────────────────────┘   │
│                                 │
│ 📊 Reports                      │
│ ┌──────────────────────────┐   │
│ │ 📋 DSR History           │   │  → DSR list view
│ │ 💰 Expense History       │   │  → Expense list
│ │ 📸 Visit History         │   │  → Visit list
│ └──────────────────────────┘   │
└─────────────────────────────────┘
```

**Sections:**

**1. Pending Items** (Top priority)
- DSR not completed → Badge (1)
- Expenses missing receipts → Badge (1)
- Leads needing follow-up (future) → Badge (N)
- Auto-sorted by urgency

**2. Documents & Resources**
- Product Catalogs (downloadable PDFs)
- Price Lists
- Sales Kits
- Manage Downloads (offline access)

**3. Reports & History**
- DSR history (past reports)
- Expense history (submitted expenses)
- Visit history (logged visits)
- Sheet sales history (logged sales)

**Future Additions:**
- 🔮 **Leads** - Assigned leads with SLA countdown
- 🔮 **Routes** - Planned visit routes
- 🔮 **Notifications** - All app notifications

---

### Tab 5: 👤 Me (Profile & Settings)

**Purpose:** User profile, settings, account management

**Content:**
```
┌─────────────────────────────────┐
│ Me                              │
│                                 │
│     👤 Kunal Gupta              │  ← User avatar
│     Sales Representative        │     (future: photo)
│     +91 98765 43210             │
│     kunal@artislaminates.com    │
│                                 │
│ ⚙️ Settings                     │
│ ┌──────────────────────────┐   │
│ │ 🔔 Notifications         │   │  → Notification settings
│ │ 🌙 Dark Mode (future)    │   │
│ │ 📍 Location Settings     │   │
│ │ 💾 Storage & Cache       │   │
│ └──────────────────────────┘   │
│                                 │
│ 📊 My Performance               │
│ ┌──────────────────────────┐   │
│ │ 🏆 Achievements          │   │  → Badges, milestones
│ │ 📈 Monthly Stats         │   │  → Detailed breakdown
│ │ 🎯 Target History        │   │  → Past targets
│ └──────────────────────────┘   │
│                                 │
│ ℹ️ About                        │
│ ┌──────────────────────────┐   │
│ │ 📖 Help & Support        │   │
│ │ 🐛 Report Issue          │   │
│ │ 📄 Privacy Policy        │   │
│ │ ℹ️ App Version: 1.0.0    │   │
│ └──────────────────────────┘   │
│                                 │
│ 🚪 Logout                       │  ← Destructive action
└─────────────────────────────────┘
```

**Sections:**

**1. Profile Info**
- Avatar (photo - future)
- Name, role, phone, email
- Edit profile button (future)

**2. Settings**
- Notification preferences
- Dark mode toggle (future)
- Location settings
- Storage & cache management

**3. My Performance**
- Achievements/badges (gamification - future)
- Monthly stats breakdown
- Target history

**4. About & Support**
- Help & FAQ
- Report issue/bug
- Privacy policy
- App version

**5. Logout**
- Sign out (with confirmation)

---

## 🎯 Navigation Structure: Manager/National Head View

### Bottom Tab Bar (5 Tabs)

```
┌─────┬──────┬──────┬──────┬─────┐
│ 🏠  │ 👥  │  ➕  │ ✅  │ 👤  │
│Home │Team │Action│Review│ Me  │
└─────┴──────┴──────┴──────┴─────┘
```

**Different from Rep View:**
- Tab 2: Team (instead of Stats) - view team performance
- Tab 3: Action (instead of Log) - manager quick actions
- Tab 4: Review (instead of Tasks) - approvals & reviews

---

### Tab 1: 🏠 Home (Manager Dashboard)

**Purpose:** Team overview + critical alerts

**Content:**
```
┌─────────────────────────────────┐
│ Dashboard                Oct ▼  │
│                                 │
│ 📊 Team Performance             │
│ ┌────┬────┬────┬────┐          │
│ │ 12 │ 87%│ 45 │ 23 │          │  ← KpiCards (4-up grid)
│ │Reps│Tgt │Vis │Pend│          │
│ └────┴────┴────┴────┘          │
│                                 │
│ 🔔 Alerts (3)                   │
│ ┌──────────────────────────┐   │
│ │ ⚠️ 2 DSRs pending review │   │
│ │ ⚠️ 1 SLA breach (leads)  │   │  ← Future
│ │ ⚠️ 5 expenses pending    │   │
│ └──────────────────────────┘   │
│                                 │
│ 🏆 Top Performers               │
│ ┌──────────────────────────┐   │
│ │ 👤 Raj Kumar    125% 🥇  │   │
│ │ 👤 Priya Singh  110% 🥈  │   │
│ │ 👤 Amit Patel   105% 🥉  │   │
│ └──────────────────────────┘   │
│                                 │
│ 📈 Trends (last 7 days)         │
│ [Charts - sales, visits, etc.]  │
└─────────────────────────────────┘
```

**Features:**
- Team KPI summary (4 cards: Reps count, Target %, Visits, Pending items)
- Critical alerts (DSRs pending, SLA breaches, expenses)
- Top performers (leaderboard)
- Weekly trends (charts)

---

### Tab 2: 👥 Team (Team Management)

**Purpose:** View and manage sales team

**Content:**
```
┌─────────────────────────────────┐
│ Team                    +Add    │  ← Add new user
│                                 │
│ [Filter: All Reps ▼]  🔍       │  ← FiltersBar + Search
│                                 │
│ ┌──────────────────────────┐   │
│ │ 👤 Raj Kumar             │   │  ← User card
│ │    Delhi NCR · Active    │   │     (FlashList)
│ │    Target: 125% ✅       │   │
│ │    Last active: 2h ago   │   │
│ └──────────────────────────┘   │
│                                 │
│ ┌──────────────────────────┐   │
│ │ 👤 Priya Singh           │   │
│ │    Mumbai · Active       │   │
│ │    Target: 110% ✅       │   │
│ │    Last active: 10m ago  │   │
│ └──────────────────────────┘   │
│                                 │
│ ┌──────────────────────────┐   │
│ │ 👤 Amit Patel            │   │
│ │    Bangalore · Active    │   │
│ │    Target: 85% ⚠️        │   │
│ │    Last active: 5h ago   │   │
│ └──────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**Features:**
- User list (FlashList for performance)
- FiltersBar (Active/Inactive, Territory, Performance)
- Search by name
- User detail → Tap card (UserDetailScreen)
  - Set targets (sales + visits)
  - View individual performance
  - View DSR history
  - Contact (call/message)

**Related Screens:**
- AddUserScreen (tap +Add)
- UserDetailScreen (tap user card)
- SetTargetScreen (from user detail)
- TeamTargetsScreen (view all targets)

---

### Tab 3: ➕ Action (Manager Quick Actions)

**Purpose:** Fast access to manager operations

**Bottom Sheet Menu:**
```
┌─────────────────────────────────┐
│ Quick Actions                ×  │
├─────────────────────────────────┤
│                                 │
│  👤  Add Team Member            │  → AddUserScreen
│       Create new user account   │
│                                 │
│  🎯  Set Target                 │  → SetTargetScreen
│       Set sales/visit targets   │
│                                 │
│  🏢  Add Account                │  → AddAccountScreen
│       Add distributor/dealer    │
│                                 │
│  📄  Upload Document            │  → UploadDocumentScreen
│       Share resource with team  │
│                                 │
│  📊  Export Report              │  → Export options
│       CSV/PDF export (future)   │
│                                 │
└─────────────────────────────────┘
```

**Actions:**
1. **Add Team Member** → AddUserScreen
2. **Set Target** → SetTargetScreen
3. **Add Account** → AddAccountScreen
4. **Upload Document** → UploadDocumentScreen
5. **Export Report** (future) → CSV/PDF generation

---

### Tab 4: ✅ Review (Approvals & Reviews)

**Purpose:** Approve DSRs, expenses, manage accounts

**Content:**
```
┌─────────────────────────────────┐
│ Review                          │
│                                 │
│ 📋 DSR Approvals (2)            │  ← Badge with count
│ ┌──────────────────────────┐   │
│ │ 👤 Raj Kumar             │   │  → DSRApprovalDetailScreen
│ │    Oct 14 · Pending      │   │
│ │    3 visits, 250 sheets  │   │
│ └──────────────────────────┘   │
│                                 │
│ 💰 Expense Approvals (5)        │  ← Badge with count
│ ┌──────────────────────────┐   │
│ │ 👤 Priya Singh           │   │  → Expense approval
│ │    ₹420 · Travel         │   │     (future screen)
│ │    Receipt attached ✅   │   │
│ └──────────────────────────┘   │
│                                 │
│ 🏢 Accounts                     │
│ ┌──────────────────────────┐   │
│ │ 📋 View All Accounts     │   │  → AccountsListScreen
│ │    125 total accounts    │   │     (already uses DS v0.1!)
│ └──────────────────────────┘   │
│                                 │
│ 📊 Reports                      │
│ ┌──────────────────────────┐   │
│ │ 📈 Team Performance      │   │  → Team reports
│ │ 📊 Sales Analytics       │   │
│ │ 💰 Expense Summary       │   │
│ └──────────────────────────┘   │
└─────────────────────────────────┘
```

**Sections:**

**1. DSR Approvals**
- Pending DSRs from team
- Badge shows count
- Tap → DSRApprovalDetailScreen
  - View full DSR
  - Approve/Reject/Request revision
  - Add comments

**2. Expense Approvals** (Future enhancement)
- Pending expense reports
- Badge shows count
- Tap → ExpenseApprovalScreen
  - View expense details
  - View receipt photo
  - Approve/Reject
  - Add comments

**3. Accounts Management**
- View all accounts (AccountsListScreen - already using DS v0.1!)
- Filter by type (distributor/dealer/architect)
- Search by name
- Edit/Delete accounts

**4. Reports**
- Team performance reports
- Sales analytics
- Expense summaries
- Export options (future)

---

### Tab 5: 👤 Me (Profile & Settings)

**Same as Rep view** - Profile, settings, logout

---

## 🎨 Visual Hierarchy & Design Decisions

### Tab Bar Styling
```typescript
// Design System tokens to use
backgroundColor: colors.surface         // #F8F8F8
borderTopColor: colors.border.default   // #E0E0E0
borderTopWidth: 1

// Active tab
activeColor: colors.primary             // #393735 (brand dark)
activeTintColor: colors.accent          // #D4A944 (gold)

// Inactive tab
inactiveColor: colors.text.tertiary     // #999999

// Badge (for notification counts)
badgeBackgroundColor: roles.error.base  // Red
badgeTextColor: colors.text.inverse     // White
```

### FAB (Floating Action Button) Styling
```typescript
// FAB button
size: 56                                 // 56x56dp (standard Android FAB)
backgroundColor: colors.accent           // #D4A944 (gold)
iconColor: colors.primary                // #393735 (dark)
elevation: shadows.lg                    // Large shadow

// Position
bottom: 16                               // 16dp from tab bar
centerX: true                            // Centered horizontally

// Press state
onPress: {
  scale: 0.95,
  opacity: 0.9,
}
```

### Bottom Sheet (FAB Menu) Styling
```typescript
// Sheet container
backgroundColor: colors.surface          // #F8F8F8
borderTopLeftRadius: spacing.borderRadius.xl  // 16px
borderTopRightRadius: spacing.borderRadius.xl // 16px

// Menu items
itemHeight: 64                           // 64dp touch target
itemPadding: spacing.md                  // 16px

// Icons
iconSize: 24                             // 24dp
iconBackgroundColor: colors.accent + '20' // Gold with 20% opacity
iconColor: colors.accent                 // Gold

// Press state (from states.ts)
opacity: states.pressed.opacity          // 0.92
scale: states.pressed.scale              // 0.98
```

---

## 🔄 Navigation Flows

### Rep: Logging a Sheet Sale
```
Home Tab → Tap FAB (➕) → Tap "Log Sheet Sales"
  → SheetsEntryScreen
  → Select catalog (tabs)
  → Enter count
  → Submit
  → Toast: "250 sheets logged ✅"
  → Return to Home (FAB menu auto-closes)
```

**Tap count:** 4 taps (FAB + menu item + catalog + submit)

### Rep: Checking Progress
```
Stats Tab (1 tap)
  → See all targets immediately
  → Tap month selector to change month (optional)
```

**Tap count:** 1 tap

### Manager: Approving DSR
```
Review Tab (1 tap)
  → See pending DSRs (badge shows count)
  → Tap DSR card
  → DSRApprovalDetailScreen
  → Review data
  → Tap "Approve" → Confirmation → Done
```

**Tap count:** 3 taps (tab + card + approve)

### Manager: Adding Team Member
```
Team Tab → Tap "+Add" button
  → AddUserScreen
  → Fill form
  → Submit
  → Toast: "User added ✅"
  → Return to Team list
```

**Tap count:** 3 taps (tab + add + submit)

---

## 📏 Screen Real Estate

### Tab Bar Height
- **Android Standard:** 56dp
- **With safe area:** 56dp + bottom inset (varies by device)
- **Badge:** 18dp circle, positioned top-right of icon

### FAB Size & Position
- **Size:** 56x56dp (standard Android)
- **Position:** Centered horizontally, 16dp above tab bar
- **Overlap:** FAB overlaps content by ~40dp (need padding at bottom of scrollable content)

### Bottom Sheet Height
- **Max height:** 70% of screen height
- **Min height:** Auto (based on content, usually ~300dp for 4-5 menu items)
- **Dimmed overlay:** 50% black (colors.overlay)

---

## 🚀 Implementation Priority

### Phase 1: Core Tab Structure (3-4 days)
1. Set up React Navigation with bottom tabs
2. Create 5 tab screens (Home, Stats/Team, Log/Action, Tasks/Review, Me)
3. Implement FAB button (no menu yet)
4. Migrate existing screens to tabs (move HomeScreen content to Home tab)

### Phase 2: FAB Menu (1 day)
1. Create bottom sheet component (or use library: `@gorhom/bottom-sheet`)
2. Implement FAB menu for Reps (4 items)
3. Implement FAB menu for Managers (5 items)
4. Add haptic feedback on FAB tap

### Phase 3: Screen Conversions (2-3 days)
1. Convert Home tab content (use KpiCard, Skeleton, Badge)
2. Convert Stats tab (enhance TargetProgressCard, VisitProgressCard)
3. Convert Tasks/Review tab (use EmptyState, ErrorState, FiltersBar)
4. Ensure all screens use DS v0.1 components

### Phase 4: Manager-Specific Features (1-2 days)
1. Create ManagerHomeScreen (Team KPIs, Alerts, Top Performers)
2. Enhance TeamScreen (user cards, filters)
3. Create Review tab (DSR approvals, accounts)
4. Add manager-specific quick actions

---

## ✅ Decision Checklist

Before implementing, confirm:

- [x] Bottom Tab + FAB navigation (Option D) ✅
- [ ] **Rep tabs:** Home, Stats, Log (FAB), Tasks, Me
- [ ] **Manager tabs:** Home, Team, Action (FAB), Review, Me
- [ ] **FAB menu style:** Bottom sheet (not radial menu)
- [ ] **Tab bar styling:** Use design tokens from theme
- [ ] **Badge counts:** Show on Tasks/Review tabs
- [ ] **Icon selection:** Use Lucide icons (already in use)

---

## 📝 Open Questions

1. **Tab icons:** Should we use filled or outline style? (Recommend: Outline inactive, filled active)
2. **Tab labels:** Always show or hide on scroll? (Recommend: Always show for clarity)
3. **FAB animation:** Should it hide on scroll down, show on scroll up? (Recommend: Always visible)
4. **Role detection:** Switch tabs on role change or separate apps? (Current: Switch screen on role)
5. **Badge max count:** Show actual number or "9+" for 10+? (Recommend: Show actual for < 10, "9+" for 10+)

---

**Next Steps:**
1. Review this plan with Kunal
2. Make any adjustments based on feedback
3. Lock in tab structure
4. Move to Decision 2 (Color Strategy)
5. Start implementation (Phase 1)

---

**Last Updated:** October 15, 2025
