# Development Guidelines

## Core Philosophy

1. **Backend-First Architecture** - Get data models, Firebase structure, and Cloud Functions right before rushing to features
2. **Event-Driven Design** - All state changes emit domain events; side effects handled by listeners/triggers
3. **Offline-First** - All writes must work offline and sync reliably
4. **Boring Technology** - Proven, stable tech stack (Firebase + Expo); no experimental libraries
5. **Context Preservation** - Maintain clear documentation so future AI agents can understand and extend easily

---

## Code Quality Standards

- **Plan before code** - Always outline approach, affected files, and trade-offs before implementation
- **Test-driven for services** - Write tests for business logic before implementation
- **Small, focused changes** - Max 200 lines per change unless explicitly needed
- **Schema safety** - All database changes documented with migration notes
- **Security checklist** - Input validation, auth checks, Firestore rules, PII handling reviewed before merging
- **Firebase Modular API** - Always use modular Firebase API (v9+) - see `.claude/rules/firebase.md`

---

## When Making Changes

1. **Always read related files first** - Understand current implementation
2. **Propose a plan** - List files to change, functions to add/modify, risks
3. **Respect the event-driven pattern** - Mutations emit events, side effects via triggers
4. **Maintain type safety** - Update TypeScript types in `/types` directories
5. **Test Firestore rules** - Use Firebase emulator suite before deploying
6. **Keep functions small** - One function = one responsibility
7. **Document trade-offs** - If choosing between approaches, explain why

---

## When Adding Features

1. **Check V1 scope** - If not in V1 goals, discuss first
2. **Data model first** - Design Firestore collections/fields before coding
3. **Security rules** - Update Firestore rules for new collections
4. **Cloud Function if needed** - Background processing via functions, not mobile app
5. **Mobile UI last** - Backend → Types → Hooks → UI components

---

## Questions to Ask Before Implementation

1. Does this change require a Firestore schema update? → Document it
2. Does this add a new API endpoint? → Define contract first
3. Does this need background processing? → Use Cloud Function + events
4. Does this affect security? → Update Firestore rules
5. Does this work offline? → Test with Firestore offline mode
6. Is this idempotent? → Important for retries

---

## Tech Stack (V1)

### Mobile
- **Framework**: React Native + Expo SDK 54 (managed workflow)
- **Firebase**: `@react-native-firebase/*` packages
- **Location**: expo-location
- **Media**: expo-camera, expo-av, expo-image-manipulator

### Backend
- **Database**: Firebase Firestore (NoSQL, offline-first)
- **Functions**: Cloud Functions for Firebase (Node.js/TypeScript)
- **Auth**: Firebase Auth (phone + JWT)
- **Scheduling**: Cloud Scheduler for cron jobs
- **Analytics**: Firebase Analytics + Custom events
- **Monitoring**: Firebase Crashlytics + Cloud Functions logs

---

## V1 Goals (In Scope)

1. Visit Logging (mandatory photo of counter)
2. Daily Sheets Sales (Fine Decor, Artvio, Woodrica, Artis 1MM)
3. Expense Reporting (with receipts)
4. DSR Auto-compile (daily, manager approval)
5. Manager Dashboard (stats, reports, team oversight)
6. Target Management (monthly sales targets)
7. Account Management (distributors, dealers, architects)
8. User Management (add/edit sales reps and managers)
9. Document Library (offline access)
10. Offline Support (queue locally, sync when online)

### Deferred (V1.1/V2)
- Attendance Tracking (GPS check-in/out) - disabled via feature flag
- Lead Routing (webhook → auto-assign → 4-hour SLA)
- CSV/PDF Export

### Non-Goals (V1)
- Payroll/salary
- Sales incentive calculation
- Continuous GPS tracking
- Route optimization
- Quoting/invoicing
- ERP integration
- Full-text search

---

## Key Commands

```bash
# Mobile development
cd mobile && npm start          # Start Expo dev server

# Cloud Functions
cd functions && npm run build   # Build functions
firebase deploy --only functions # Deploy functions

# Local testing
firebase emulators:start        # Start local Firebase

# Version bump
cd mobile && node scripts/bump-version.js patch  # Bump version
```

---

## TODO.md Rules

When adding, updating, or completing tasks in `docs/TODO.md`:
- **ALWAYS explicitly tell the user** what was added/changed
- Never silently add tasks - user must be informed every time
- Include the task title and which section it was added to
