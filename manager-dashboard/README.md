# Artis Manager Dashboard

Modern web dashboard for field sales managers to track team performance, approve DSRs, and generate reports.

## 🚀 Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router + TypeScript)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + [Tremor](https://www.tremor.so/)
- **Data Tables**: [TanStack Table v8](https://tanstack.com/table/latest)
- **State Management**: [TanStack Query v5](https://tanstack.com/query/latest)
- **Charts**: [Recharts](https://recharts.org/)
- **Backend**: [Firebase](https://firebase.google.com/) (Firestore, Auth, Functions)
- **Deployment**: [Vercel](https://vercel.com/)

## 📋 Prerequisites

- Node.js 20.x or higher
- npm or yarn
- Firebase project (development + production)
- Vercel account (for deployment)

## 🛠️ Setup Instructions

### 1. Clone & Install

```bash
# Navigate to project directory
cd manager-dashboard

# Install dependencies
npm install
```

### 2. Configure Firebase

1. Create a Firebase Web app in your Firebase project console
2. Copy `.env.local.example` to `.env.local`
3. Fill in your Firebase credentials:

```bash
cp .env.local.example .env.local
# Edit .env.local with your Firebase config
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production

```bash
npm run build
npm run start
```

## 📁 Project Structure

```
manager-dashboard/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication routes
│   ├── (dashboard)/         # Protected dashboard routes
│   ├── api/                 # API routes
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   └── globals.css          # Global styles + Tailwind config
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── charts/              # Chart components (Tremor + Recharts)
│   ├── tables/              # Table components (TanStack Table)
│   └── layout/              # Layout components (navbar, sidebar)
├── lib/
│   ├── firebase.ts          # Firebase initialization
│   ├── firebase-auth.ts     # Auth utilities
│   └── utils.ts             # Utility functions
├── hooks/                   # Custom React hooks (TanStack Query)
├── types/                   # TypeScript type definitions
├── public/                  # Static assets
└── docs/                    # Documentation
```

## 🎨 Brand Colors

The dashboard uses Artis brand colors defined in `app/globals.css`:

- **Primary Dark**: `#393735` - Headers, text
- **Primary Gold**: `#C9A961` - CTAs, accents
- **Gold Accent**: `#D4AF37` - Hover states

**Feature Colors**:
- **Attendance**: `#10B981` (Green)
- **Visits**: `#3B82F6` (Blue)
- **Sheets**: `#8B5CF6` (Purple)
- **Expenses**: `#F59E0B` (Orange)

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| next | 15.x | React framework |
| react | 19.x | UI library |
| typescript | 5.x | Type safety |
| tailwindcss | 4.x | Utility-first CSS |
| firebase | 11.x | Backend services |
| @tanstack/react-query | 5.x | Data fetching & caching |
| @tanstack/react-table | 8.x | Powerful data tables |
| @tremor/react | 3.x | Dashboard components |
| recharts | 2.x | Chart library |
| date-fns | 4.x | Date utilities |

## 🔐 Environment Variables

Required environment variables (see `.env.local.example`):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## 🚢 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
# Or use Vercel CLI
vercel
```

### Firebase Hosting (Alternative)

```bash
npm run build
firebase deploy --only hosting
```

## 📝 Development Workflow

### Adding a New Page

1. Create route in `app/(dashboard)/`
2. Define data fetching hook in `hooks/`
3. Create table/chart components in `components/`
4. Use TanStack Query for real-time data

### Adding a New Component

1. If UI primitive, copy from [shadcn/ui](https://ui.shadcn.com/)
2. If chart, create in `components/charts/` using Tremor
3. If table, create in `components/tables/` using TanStack Table

### Adding a New API Route

1. Create in `app/api/`
2. Use Firebase Admin SDK for server-side operations
3. Return JSON responses

## 🧪 Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build (ensures no errors)
npm run build
```

## 📊 Features

### Phase 1 (Current)
- ✅ Project setup & configuration
- ✅ Firebase integration
- ✅ Brand colors & styling
- 🔄 Authentication (in progress)
- 🔄 Layout & navigation (in progress)

### Phase 2 (Planned)
- Home dashboard with KPIs
- Team performance charts
- Recent activity feed

### Phase 3 (Planned)
- Team list with data table
- Rep detail pages
- Performance analytics

### Phase 4 (Planned)
- DSR approvals workflow
- Expense approvals
- Review comments

### Phase 5 (Planned)
- Reports & analytics
- CSV exports
- Date range filtering

### Phase 6 (Planned)
- UI/UX polish
- Performance optimization
- Production deployment

## 📚 Documentation

- **Design Doc**: [/docs/planning/MANAGER_DASHBOARD_WEB_DESIGN.md](../docs/planning/MANAGER_DASHBOARD_WEB_DESIGN.md)
- **Implementation Tracker**: [/docs/implementation/MANAGER_DASHBOARD_WEB_IMPLEMENTATION.md](../docs/implementation/MANAGER_DASHBOARD_WEB_IMPLEMENTATION.md)
- **Project Overview**: [/CLAUDE.md](../CLAUDE.md)

## 🤝 Contributing

This is an internal project for Artis Laminates. For questions or support, contact the development team.

## 📄 License

Proprietary - Artis Laminates © 2025

---

**Built with ❤️ for Artis Laminates field sales team**
