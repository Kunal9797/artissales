# Manager Dashboard Web Application - Design Document

**Last Updated**: 2025-01-11
**Status**: Planning → Implementation
**Branch**: `f/manager-dashboard-web`
**Owner**: Kunal Gupta (Artis Laminates)

---

## Executive Summary

Building a **modern web dashboard** for field sales managers to replace the planned iOS app. This strategic decision prioritizes faster development, better data visualization capabilities, and lower maintenance overhead.

### Strategic Rationale
- **Manager use case**: Primarily consume/analyze data (not create it)
- **Better UX**: Large screens ideal for charts, tables, and multi-tab workflows
- **Faster delivery**: One codebase vs. two mobile platforms (iOS + Android already exists)
- **Instant updates**: No app store approval delays
- **Future-proof**: Can add PWA wrapper later if mobile access needed

---

## Tech Stack Selection

### Core Framework: Next.js 15 (App Router)
**Version**: `15.1.x`

**Decision Rationale**:
- ✅ Industry-standard React framework (125k+ GitHub stars)
- ✅ Excellent Firebase integration patterns
- ✅ Server Components reduce bundle size
- ✅ Turbopack for 5-10x faster dev builds
- ✅ TypeScript-first (aligns with existing backend types)
- ✅ React Native dev familiarity (minimal learning curve)

**Alternatives Considered**:
- ❌ **Remix**: Smaller ecosystem, steeper learning curve
- ❌ **SvelteKit**: Different paradigm (Svelte vs React)
- ❌ **Vite + React SPA**: No SSR/SSG benefits, worse SEO

---

### UI Component Library: shadcn/ui + Tremor (Hybrid)

**Versions**:
- `shadcn/ui@latest` (copy-paste components)
- `@tremor/react@3.x`

**Decision Rationale**:

**shadcn/ui for core UI**:
- ✅ Copy-paste approach = full code ownership
- ✅ Built on Radix UI (accessible) + Tailwind CSS
- ✅ Beautiful modern design out-of-the-box
- ✅ Easy to customize for Artis brand (#393735, #C9A961)
- ✅ No npm lock-in (modify components directly)

**Tremor for dashboard-specific components**:
- ✅ Pre-built chart components (line, bar, area, donut)
- ✅ KPI cards, metric cards, progress bars
- ✅ Uses Recharts under the hood (battle-tested)
- ✅ Same Tailwind CSS styling approach
- ✅ Dashboard-optimized design

**Alternatives Considered**:
- ❌ **Mantine**: Faster setup but less design control, harder to match brand
- ❌ **Ant Design**: Generic enterprise look, large bundle (500kb+)
- ❌ **Chakra UI**: Larger bundle, more opinionated

---

### Data Visualization: Recharts (via Tremor) + Nivo (optional)

**Versions**:
- `recharts@2.x` (included with Tremor)
- `@nivo/core@0.87.x` (optional, for advanced charts)

**Decision Rationale**:
- ✅ **Recharts**: Simple declarative API, great for 90% of dashboard needs
- ✅ **Tremor integration**: Pre-styled chart components
- ✅ **SVG-based**: Clean, scalable, responsive
- ✅ **TypeScript support**: Excellent type safety

**Chart Types Needed**:
- Line charts: Team performance over time
- Bar charts: Visits by rep, sheets by catalog
- Pie/Donut charts: Account type distribution, expense categories
- Area charts: Cumulative metrics
- Sparklines: Inline KPI trends

**Nivo (optional for Phase 2+)**:
- Advanced visualizations (sunburst, sankey, heatmaps)
- Better performance for large datasets (Canvas rendering)
- Beautiful animations

---

### Data Tables: TanStack Table v8

**Version**: `@tanstack/react-table@8.x`

**Decision Rationale**:
- ✅ **Headless & flexible**: Complete UI control
- ✅ **Powerful features**: Sorting, filtering, pagination, column resizing
- ✅ **TypeScript-first**: Excellent type safety
- ✅ **Lightweight**: 15kb gzipped vs 150kb+ for AG Grid
- ✅ **CSV export ready**: Easy integration with `react-csv`
- ✅ **Virtual scrolling**: Can add `@tanstack/react-virtual` for 1000+ rows

**Alternatives Considered**:
- ❌ **AG Grid**: Overkill, expensive enterprise features ($1000+/year)
- ❌ **react-data-grid**: Fewer features, less active development

---

### State Management & Data Fetching: TanStack Query v5

**Version**: `@tanstack/react-query@5.x`

**Decision Rationale**:
- ✅ **Perfect for Firebase**: Built-in real-time subscription support
- ✅ **Automatic caching**: Reduces Firestore reads (saves money!)
- ✅ **Optimistic updates**: Instant UI feedback
- ✅ **DevTools**: Visual query debugging and cache inspection
- ✅ **Server Components compatible**: Works with Next.js 15 App Router

**Firebase Integration Pattern**:
```typescript
// Real-time Firestore query with TanStack Query
function useTeamDSRs(managerId: string) {
  return useQuery({
    queryKey: ['dsrs', managerId],
    queryFn: () => {
      return new Promise((resolve) => {
        const q = query(
          collection(db, 'dsrReports'),
          where('status', '==', 'pending')
        )
        const unsubscribe = onSnapshot(q, (snapshot) => {
          resolve(snapshot.docs.map(doc => doc.data()))
        })
      })
    },
    refetchInterval: 30000, // Refetch every 30s
  })
}
```

**Alternatives Considered**:
- ❌ **SWR**: Less powerful caching, smaller ecosystem
- ❌ **Zustand alone**: Would need manual Firebase integration
- ❌ **Redux**: Too much boilerplate

---

### Styling: Tailwind CSS

**Version**: `tailwindcss@3.4.x`

**Decision Rationale**:
- ✅ **Perfect match**: Both shadcn/ui and Tremor built with Tailwind
- ✅ **Fast prototyping**: Utility-first approach
- ✅ **Easy theming**: Configure brand colors once
- ✅ **Small bundles**: PurgeCSS removes unused styles
- ✅ **Great DX**: IntelliSense autocomplete in VS Code

**Artis Brand Configuration**:
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#393735',      // Primary dark (StatusBar, headers)
          gold: '#C9A961',      // Primary gold (accents, CTAs)
          accent: '#D4AF37',    // Secondary gold
        },
        // Feature colors (match mobile app)
        attendance: '#10B981',  // Green
        visits: '#3B82F6',      // Blue
        sheets: '#8B5CF6',      // Purple
        expenses: '#F59E0B',    // Orange
      }
    }
  }
}
```

---

### Firebase Integration: Firebase SDK v11 (Modular API)

**Version**: `firebase@11.x`

**Decision Rationale**:
- ✅ **Modular API**: Tree-shaking reduces bundle size
- ✅ **Web SDK**: Native browser support
- ✅ **Real-time queries**: Firestore onSnapshot for live updates
- ✅ **Auth integration**: Firebase Auth Web SDK for SSR/client-side
- ✅ **Type safety**: Excellent TypeScript support

**Integration Points**:
1. **Direct Firestore queries**: Real-time data (DSRs, attendance, visits)
2. **Existing Cloud Functions**: Reuse backend logic (getTeamStats, reviewDSR)
3. **Same Auth**: Managers log in with phone/email
4. **Same Security Rules**: Role-based access (manager, zonal_head, etc.)

---

### Deployment: Vercel (Primary)

**Decision Rationale**:
- ✅ **Zero-config**: Next.js deployment out-of-the-box
- ✅ **Instant deployments**: Push to GitHub, auto-deploy
- ✅ **Edge functions**: Fast auth checks globally
- ✅ **Preview deployments**: Every PR gets unique URL
- ✅ **Generous free tier**: 100 GB bandwidth, unlimited sites

**Pricing**:
- **Free tier**: Perfect for internal dashboard (5-10 users)
- **Pro ($20/mo)**: If analytics or better performance needed

**Backup Option**: Firebase Hosting ($0.026/GB) if Vercel costs become prohibitive

---

## Project Structure

```
manager-dashboard/
├── app/                          # Next.js 15 App Router
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          # Login page (Firebase Auth)
│   │   └── layout.tsx            # Auth layout (no navbar)
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Dashboard shell (navbar + sidebar)
│   │   ├── page.tsx              # Home - KPIs & overview
│   │   ├── team/
│   │   │   ├── page.tsx          # Team list table
│   │   │   └── [userId]/
│   │   │       └── page.tsx      # User detail (charts, history)
│   │   ├── accounts/
│   │   │   ├── page.tsx          # Accounts list table
│   │   │   └── [accountId]/
│   │   │       └── page.tsx      # Account detail
│   │   ├── review/
│   │   │   ├── dsrs/
│   │   │   │   ├── page.tsx      # DSR approvals table
│   │   │   │   └── [dsrId]/
│   │   │   │       └── page.tsx  # DSR detail modal/page
│   │   │   └── expenses/
│   │   │       └── page.tsx      # Expense approvals table
│   │   └── reports/
│   │       └── page.tsx          # Analytics & CSV exports
│   └── api/                      # API routes (optional)
│       └── export/
│           ├── dsrs/
│           │   └── route.ts      # Server-side CSV export
│           └── visits/
│               └── route.ts      # Server-side CSV export
│
├── components/
│   ├── ui/                       # shadcn/ui components (copy-paste)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── select.tsx
│   │   ├── toast.tsx
│   │   └── ...
│   ├── charts/                   # Tremor chart wrappers
│   │   ├── visits-chart.tsx
│   │   ├── sheets-chart.tsx
│   │   ├── attendance-chart.tsx
│   │   └── kpi-card.tsx
│   ├── tables/                   # TanStack Table components
│   │   ├── dsr-table.tsx
│   │   ├── user-table.tsx
│   │   ├── expense-table.tsx
│   │   └── data-table.tsx        # Reusable base table component
│   └── layout/
│       ├── navbar.tsx            # Top navigation bar
│       ├── sidebar.tsx           # Side navigation menu
│       ├── mobile-nav.tsx        # Mobile hamburger menu
│       └── user-menu.tsx         # User profile dropdown
│
├── lib/
│   ├── firebase.ts               # Firebase config & initialization
│   ├── firestore.ts              # Firestore helper functions
│   ├── firebase-auth.ts          # Auth utilities
│   ├── api.ts                    # Cloud Functions callable wrappers
│   └── utils.ts                  # Shared utilities (cn, formatters)
│
├── hooks/
│   ├── use-auth.ts               # Authentication hook
│   ├── use-team-stats.ts         # TanStack Query hook for team stats
│   ├── use-dsr-list.ts           # TanStack Query hook for DSR list
│   ├── use-pending-approvals.ts  # Real-time pending approvals
│   └── ...
│
├── types/
│   └── index.ts                  # TypeScript types (mirror functions/src/types)
│
├── public/
│   ├── artis-logo.svg            # Artis brand logo
│   └── favicon.ico
│
├── docs/
│   ├── DESIGN.md                 # This file
│   └── IMPLEMENTATION.md         # Implementation tracking
│
├── tailwind.config.ts            # Tailwind + brand colors
├── next.config.js                # Next.js configuration
├── tsconfig.json                 # TypeScript configuration
├── components.json               # shadcn/ui configuration
├── .eslintrc.json                # ESLint rules
├── .env.local.example            # Firebase env vars template
└── package.json
```

---

## Feature Breakdown

### Phase 1: Foundation & Authentication (Week 1)

#### 1.1 Project Setup
- [x] Create Next.js 15 project with TypeScript
- [x] Install Tailwind CSS
- [x] Configure brand colors in Tailwind
- [ ] Install shadcn/ui CLI
- [ ] Install Tremor
- [ ] Install TanStack Query + Table
- [ ] Install Firebase SDK v11

#### 1.2 Authentication
- [ ] Set up Firebase Web SDK configuration
- [ ] Implement login page (phone/email + password)
- [ ] Create auth context/hooks with TanStack Query
- [ ] Implement protected route middleware
- [ ] Add logout functionality
- [ ] Handle auth state persistence (cookies for SSR)

#### 1.3 Layout & Navigation
- [ ] Build responsive navbar (Artis logo, user menu)
- [ ] Build sidebar navigation (Home, Team, Review, Reports)
- [ ] Implement mobile hamburger menu
- [ ] Add loading states
- [ ] Create dashboard layout wrapper

**Deliverables**: Working authentication + responsive shell

---

### Phase 2: Home Dashboard (Week 2)

#### 2.1 KPI Cards
- [ ] Total active reps card
- [ ] Today's attendance % card
- [ ] Pending DSRs count card
- [ ] Today's total visits card
- [ ] Today's sheets sold card
- [ ] This month's sheets sold card

#### 2.2 Charts & Visualizations
- [ ] Team performance line chart (visits over last 30 days)
- [ ] Sheets sold by catalog (bar chart: Fine Decor, Artvio, Woodrica, Artis)
- [ ] Attendance trend area chart (last 7 days)
- [ ] Account type distribution (pie chart: distributors, dealers, architects)

#### 2.3 Activity Feed
- [ ] Recent DSR submissions (last 10)
- [ ] Recent pending approvals
- [ ] Recent visits logged
- [ ] Quick action buttons (Approve DSR, View Team)

#### 2.4 Data Fetching
- [ ] Create `useTeamStats` hook with TanStack Query
- [ ] Create `useRecentActivity` hook
- [ ] Implement real-time updates for KPIs
- [ ] Add loading/error states

**Deliverables**: Fully functional home dashboard with real-time data

---

### Phase 3: Team Management (Week 3)

#### 3.1 Team List Page
- [ ] TanStack Table with sorting/filtering/pagination
- [ ] Columns: Name, Phone, Territory, Status, Last Check-in, Today's Visits
- [ ] Search by name/phone
- [ ] Filter by territory, status (active/inactive)
- [ ] Click row to view rep detail

#### 3.2 Rep Detail Page
- [ ] Rep profile card (name, phone, email, territory, reporting manager)
- [ ] Performance summary KPIs (this month: visits, sheets, DSRs submitted)
- [ ] Visits chart (last 30 days)
- [ ] Sheets sold chart by catalog (this month)
- [ ] Recent visits table (last 20)
- [ ] Recent DSRs table (last 10)
- [ ] Recent expenses table (last 10)

#### 3.3 Data Fetching
- [ ] Create `useTeamList` hook
- [ ] Create `useRepDetail(userId)` hook
- [ ] Create `useRepPerformance(userId)` hook
- [ ] Implement real-time updates

**Deliverables**: Team list + detailed rep performance pages

---

### Phase 4: Review & Approvals (Week 4)

#### 4.1 DSR Approvals Table
- [ ] TanStack Table with pending DSRs
- [ ] Columns: Rep Name, Date, Check-in, Check-out, Visits, Sheets, Expenses, Status
- [ ] Filter by status (pending, approved, needs_revision)
- [ ] Sort by date (newest first)
- [ ] Click row to view DSR detail

#### 4.2 DSR Detail Modal/Page
- [ ] DSR summary (rep, date, status)
- [ ] Attendance section (check-in/out times, GPS coordinates)
- [ ] Visits breakdown table (account, type, time, photos)
- [ ] Sheets sold breakdown table (catalog, quantity)
- [ ] Expenses breakdown table (category, amount, receipt)
- [ ] Manager actions: Approve / Request Revision / Reject
- [ ] Comment input for feedback

#### 4.3 Expense Approvals Table
- [ ] TanStack Table with pending expenses
- [ ] Columns: Rep Name, Date, Category, Amount, Receipt, Status
- [ ] Filter by status, category
- [ ] Sort by date, amount
- [ ] Approve/reject actions

#### 4.4 Data Fetching & Mutations
- [ ] Create `usePendingDSRs` hook (real-time)
- [ ] Create `useDSRDetail(dsrId)` hook
- [ ] Create `useReviewDSR` mutation (approve/reject)
- [ ] Create `usePendingExpenses` hook
- [ ] Create `useReviewExpense` mutation
- [ ] Optimistic updates for instant feedback

**Deliverables**: Full approval workflow for DSRs and expenses

---

### Phase 5: Reports & Export (Week 5)

#### 5.1 Reports Page
- [ ] Date range selector (this week, this month, last month, custom)
- [ ] Territory filter dropdown
- [ ] Rep filter dropdown

#### 5.2 Report Sections
- [ ] Attendance summary (total check-ins, avg hours, attendance %)
- [ ] Visits summary (total visits by type, by rep, by territory)
- [ ] Sheets sold summary (total by catalog, by rep, by territory)
- [ ] Expenses summary (total by category, by rep, pending approvals)

#### 5.3 CSV Export
- [ ] Export attendance (CSV download)
- [ ] Export visits (CSV download)
- [ ] Export sheets sold (CSV download)
- [ ] Export expenses (CSV download)
- [ ] Server-side export for large datasets (via API route)

#### 5.4 Charts
- [ ] Monthly trend comparison (visits, sheets, expenses)
- [ ] Rep performance ranking (top 10 by visits, sheets)
- [ ] Territory comparison (bar chart)

**Deliverables**: Full reporting & CSV export functionality

---

### Phase 6: Polish & Deploy (Week 6)

#### 6.1 UI/UX Polish
- [ ] Loading skeletons for all pages
- [ ] Error boundaries with fallback UI
- [ ] Empty states (no data, no results)
- [ ] Toast notifications (success, error)
- [ ] Responsive design testing (desktop, tablet, mobile)
- [ ] Accessibility audit (keyboard nav, screen readers)

#### 6.2 Performance Optimization
- [ ] Code splitting (dynamic imports for heavy pages)
- [ ] Image optimization (Next.js Image component)
- [ ] Lazy loading for tables/charts
- [ ] TanStack Query cache optimization

#### 6.3 Deployment
- [ ] Set up Vercel project
- [ ] Configure environment variables (Firebase config)
- [ ] Deploy staging environment
- [ ] Manager UAT (User Acceptance Testing)
- [ ] Deploy production environment
- [ ] Set up custom domain (if needed)

#### 6.4 Documentation
- [ ] User guide for managers (PDF/web page)
- [ ] Developer README (setup, architecture, deployment)
- [ ] API documentation (if custom endpoints added)

**Deliverables**: Production-ready manager dashboard

---

## Integration with Existing Firebase Backend

### 1. Reuse Firebase Types

**Strategy**: Mirror TypeScript types from `/functions/src/types/index.ts`

```typescript
// manager-dashboard/types/index.ts
export interface User {
  id: string
  name: string
  phone: string
  email?: string
  role: 'rep' | 'area_manager' | 'zonal_head' | 'national_head' | 'admin'
  isActive: boolean
  reportsToUserId?: string
  territory?: string
  createdAt: Date
  updatedAt: Date
}

export interface DSRReport {
  id: string
  userId: string
  date: string
  checkInAt?: Date
  checkOutAt?: Date
  totalVisits: number
  visitIds: string[]
  totalSheetsSold: number
  totalExpenses: number
  status: 'pending' | 'approved' | 'needs_revision'
  reviewedBy?: string
  reviewedAt?: Date
  managerComments?: string
  generatedAt: Date
}

// ... etc (mirror all types)
```

---

### 2. Call Existing Cloud Functions

**Strategy**: Use `httpsCallable` from Firebase Functions SDK

```typescript
// lib/api.ts
import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

// Callable functions
export const getTeamStats = httpsCallable<
  { managerId: string; startDate: string; endDate: string },
  TeamStatsResponse
>(functions, 'getTeamStats')

export const reviewDSR = httpsCallable<
  { dsrId: string; status: string; comments?: string },
  { success: boolean }
>(functions, 'reviewDSR')

export const reviewExpense = httpsCallable<
  { expenseId: string; status: string; comments?: string },
  { success: boolean }
>(functions, 'reviewExpense')

// Usage in hook
export function useTeamStats(managerId: string, startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['teamStats', managerId, startDate, endDate],
    queryFn: async () => {
      const result = await getTeamStats({ managerId, startDate, endDate })
      return result.data
    }
  })
}
```

---

### 3. Direct Firestore Queries (Real-time)

**Strategy**: Use Firestore `onSnapshot` for real-time updates

```typescript
// hooks/use-pending-dsrs.ts
import { useQuery } from '@tanstack/react-query'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export function usePendingDSRs(managerId: string) {
  return useQuery({
    queryKey: ['dsrs', 'pending', managerId],
    queryFn: () => {
      return new Promise((resolve) => {
        // Get all DSRs for reps reporting to this manager
        const q = query(
          collection(db, 'dsrReports'),
          where('status', '==', 'pending'),
          orderBy('date', 'desc')
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const dsrs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          resolve(dsrs)
        })
      })
    },
    staleTime: 0, // Always consider stale for real-time
  })
}
```

---

### 4. Security Rules Alignment

**Strategy**: Ensure managers have read access to team data

**Firestore Rules Addition**:
```javascript
// firestore.rules
match /dsrReports/{reportId} {
  allow read: if isAuthenticated() && (
    // Rep can read their own DSRs
    request.auth.uid == resource.data.userId ||
    // Manager can read DSRs from their team
    isManagerOf(resource.data.userId) ||
    // Admin can read all
    getUserRole() == 'admin'
  );
  allow update: if isManager() || getUserRole() == 'admin';
}

function isManagerOf(repUserId) {
  let repData = get(/databases/$(database)/documents/users/$(repUserId)).data;
  return repData.reportsToUserId == request.auth.uid;
}
```

---

## UI/UX Design Guidelines

### Color Palette

**Primary Colors** (Artis Brand):
- Dark: `#393735` - Headers, text, StatusBar
- Gold: `#C9A961` - Primary CTAs, accents, highlights
- Gold Accent: `#D4AF37` - Hover states, secondary actions

**Feature Colors** (match mobile app):
- Attendance: `#10B981` (Green)
- Visits: `#3B82F6` (Blue)
- Sheets: `#8B5CF6` (Purple)
- Expenses: `#F59E0B` (Orange)

**Semantic Colors**:
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Orange)
- Error: `#EF4444` (Red)
- Info: `#3B82F6` (Blue)

---

### Typography

**Font Family**: System font stack (default Next.js)
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

**Text Hierarchy**:
- Page title: `text-3xl font-bold` (30px)
- Section title: `text-2xl font-semibold` (24px)
- Card title: `text-xl font-semibold` (20px)
- Body text: `text-base` (16px)
- Small text: `text-sm` (14px)
- Tiny text: `text-xs` (12px)

---

### Component Patterns

**KPI Card**:
```tsx
<Card>
  <CardHeader>
    <CardTitle className="text-sm font-medium">Total Visits Today</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-3xl font-bold text-brand-gold">142</div>
    <p className="text-xs text-muted-foreground">
      +12% from yesterday
    </p>
  </CardContent>
</Card>
```

**Data Table**:
- Sticky header
- Row hover states
- Alternating row backgrounds (subtle)
- Sort indicators
- Pagination controls at bottom

**Chart Card**:
- Card wrapper with title
- Chart legend below
- Loading skeleton while fetching
- Empty state if no data

---

## Performance Targets

### Load Times
- **First Contentful Paint (FCP)**: < 1.5s
- **Time to Interactive (TTI)**: < 3s
- **Largest Contentful Paint (LCP)**: < 2.5s

### Bundle Size
- **Total JS bundle**: < 400kb gzipped
- **Initial page load**: < 200kb gzipped
- **Code splitting**: Lazy load report/export pages

### Data Fetching
- **Firestore queries**: < 500ms
- **Cloud Functions**: < 1s
- **Real-time updates**: < 100ms latency

---

## Security Considerations

### Authentication
- ✅ Firebase Auth Web SDK with JWT tokens
- ✅ HTTP-only cookies for SSR auth state
- ✅ Protected routes via Next.js middleware
- ✅ Auto-logout on token expiration

### Authorization
- ✅ Firestore Security Rules enforce role-based access
- ✅ Client-side role checks for UI (server-side for data)
- ✅ Managers only see their team's data
- ✅ Admin role for full access

### Data Protection
- ✅ HTTPS only (enforced by Vercel)
- ✅ Environment variables for Firebase config
- ✅ No sensitive data in client-side code
- ✅ CSV exports include data sanitization

---

## Testing Strategy

### Unit Tests (Jest + React Testing Library)
- [ ] Component tests (buttons, cards, forms)
- [ ] Hook tests (useAuth, useTeamStats)
- [ ] Utility function tests (formatters, validators)

### Integration Tests
- [ ] Authentication flow (login, logout, protected routes)
- [ ] Data fetching (TanStack Query hooks)
- [ ] Mutations (approve DSR, review expense)

### E2E Tests (Playwright - optional)
- [ ] Full user journey (login → view dashboard → approve DSR → logout)
- [ ] Critical paths (DSR approval, CSV export)

### Manual Testing
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Responsive design testing (desktop, tablet, mobile)
- [ ] Accessibility testing (keyboard nav, screen readers)
- [ ] Manager UAT (User Acceptance Testing)

---

## Deployment Strategy

### Environments

**Staging** (`staging.artis-dashboard.vercel.app`):
- Auto-deploy from `f/manager-dashboard-web` branch
- Connected to Firebase `artis-sales-dev` project
- Used for testing and UAT

**Production** (`dashboard.artis.com` or similar):
- Deploy from `main` branch
- Connected to Firebase `artis-sales-prod` project
- Requires manual promotion from staging

---

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy-dashboard.yml
name: Deploy Manager Dashboard

on:
  push:
    branches: [f/manager-dashboard-web, main]
    paths:
      - 'manager-dashboard/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - name: Install dependencies
        run: cd manager-dashboard && npm ci
      - name: Type check
        run: cd manager-dashboard && npm run type-check
      - name: Lint
        run: cd manager-dashboard && npm run lint
      - name: Build
        run: cd manager-dashboard && npm run build
      - name: Deploy to Vercel
        uses: vercel/actions@v2
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
```

---

## Monitoring & Analytics

### Performance Monitoring
- **Vercel Analytics**: Page load times, Web Vitals
- **Firebase Performance Monitoring**: API latency, errors

### Error Tracking
- **Vercel Logs**: Server-side errors, API errors
- **Sentry (optional)**: Client-side error tracking

### Usage Analytics
- **Firebase Analytics**: Page views, user actions
- **Custom events**: DSR approvals, CSV exports, login/logout

---

## Known Limitations & Trade-offs

### 1. Firebase Auth SSR Complexity
**Issue**: Firebase Auth designed for client-side, SSR requires cookie management
**Solution**: Use client-side auth only (acceptable for internal dashboard)
**Future**: Implement `next-firebase-auth-edge` if SSR needed

### 2. Real-time Update Performance
**Issue**: Too many Firestore listeners can slow down app
**Solution**: Use TanStack Query `staleTime` to limit subscriptions
**Optimization**: Aggregate data in Cloud Functions for heavy queries

### 3. CSV Export for Large Datasets
**Issue**: Browser may crash exporting 10,000+ rows
**Solution**: Implement server-side export via API route
**Alternative**: Paginated export (download in chunks)

### 4. Mobile Web Experience
**Issue**: Some charts/tables less usable on mobile
**Solution**: Responsive design with mobile-optimized views
**Future**: Consider PWA wrapper for native-like experience

---

## Success Criteria

### Functional Requirements
- ✅ Managers can log in securely
- ✅ Managers can view team performance (visits, sheets, attendance)
- ✅ Managers can approve/reject DSRs with comments
- ✅ Managers can approve/reject expenses with comments
- ✅ Managers can export data to CSV
- ✅ Real-time updates for pending approvals

### Non-Functional Requirements
- ✅ Page load < 3s on 4G connection
- ✅ Works on desktop, tablet, mobile web
- ✅ 99.9% uptime (Vercel SLA)
- ✅ Accessible (WCAG 2.1 Level AA)
- ✅ < $50/month hosting cost (Vercel free tier sufficient)

### User Satisfaction
- ✅ Manager feedback score > 4/5
- ✅ Faster than previous manual process (Excel/WhatsApp)
- ✅ 90%+ manager adoption within 1 month

---

## Future Enhancements (Post-V1)

### Phase 2 (Q2 2025)
- [ ] Advanced analytics (trends, forecasting)
- [ ] Custom report builder (drag-and-drop)
- [ ] PDF export for reports
- [ ] Push notifications (web push API)
- [ ] Dark mode toggle

### Phase 3 (Q3 2025)
- [ ] Mobile app wrapper (PWA or Capacitor)
- [ ] Multi-language support (Hindi, regional)
- [ ] Advanced charts (heatmaps, sankey, sunburst)
- [ ] Bulk actions (approve multiple DSRs)
- [ ] Team chat/comments feature

### Long-term Ideas
- [ ] AI-powered insights (anomaly detection, predictions)
- [ ] ERP integration (SAP, Oracle)
- [ ] WhatsApp integration for approvals
- [ ] Video call integration for virtual visits
- [ ] Offline support (service worker + IndexedDB)

---

## Questions & Decisions Log

### 2025-01-11: Web vs iOS Decision
**Question**: Should we build iOS app or web dashboard?
**Decision**: Web dashboard
**Rationale**: Managers primarily consume data (not create), better suited for large screens, faster to build, easier to maintain

### 2025-01-11: Framework Selection
**Question**: Next.js vs Remix vs SvelteKit?
**Decision**: Next.js 15 (App Router)
**Rationale**: Best-in-class React framework, excellent Firebase integration, minimal learning curve for React Native dev

### 2025-01-11: UI Library Selection
**Question**: shadcn/ui vs Mantine vs Ant Design?
**Decision**: shadcn/ui + Tremor (hybrid)
**Rationale**: Full design control for Artis brand, copy-paste ownership, Tremor for dashboard-specific components

### 2025-01-11: State Management Selection
**Question**: TanStack Query vs SWR vs Redux?
**Decision**: TanStack Query v5
**Rationale**: Perfect for Firebase real-time queries, automatic caching, DevTools, Server Components compatible

---

## Resources & References

### Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tremor Dashboard Components](https://www.tremor.so/)
- [TanStack Query v5](https://tanstack.com/query/latest)
- [TanStack Table v8](https://tanstack.com/table/latest)
- [Firebase Web SDK](https://firebase.google.com/docs/web/setup)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Tutorials
- [Next.js 15 + Firebase Auth](https://www.youtube.com/watch?v=...)
- [shadcn/ui + Next.js Setup](https://ui.shadcn.com/docs/installation/next)
- [TanStack Query + Firestore Real-time](https://tkdodo.eu/blog/using-web-sockets-with-react-query)

### Design Inspiration
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Linear Dashboard](https://linear.app/)
- [Tremor Example Dashboards](https://demo.tremor.so/)

---

**End of Design Document**

*This document will be updated throughout implementation to reflect actual decisions, findings, and architectural changes.*
