# Artis Field Sales App

Android-first, offline-capable field sales app for Artis Laminates.
- **Stack**: React Native (Expo SDK 54) + Firebase
- **Architecture**: Event-driven, offline-first, backend-first

---

## Critical Rules

### Firebase API (MUST READ)
**ALWAYS use modular API (v9+)** - see `.claude/rules/firebase.md`

```typescript
// CORRECT
const db = firestore();
const ref = doc(db, 'users', id);
const snap = await getDoc(ref);
if (snap.exists()) { ... }  // exists() is a METHOD

// WRONG - deprecated
firestore().collection('users').doc(id).get()
```

### Before Any Change
1. Read related files first
2. Check V1 scope (see below)
3. Plan approach before coding
4. Max 200 lines per change

---

## V1 Goals (In Scope)

1. Visit Logging (mandatory photo)
2. Daily Sheets Sales (4 catalogs)
3. Expense Reporting
4. DSR Auto-compile
5. Manager Dashboard
6. Target Management
7. Account Management
8. User Management
9. Document Library
10. Offline Support

**Deferred**: Attendance tracking (feature flag disabled), Lead routing, CSV/PDF export

---

## Key Commands

```bash
cd mobile && npm start              # Expo dev server
cd functions && npm run build       # Build Cloud Functions
firebase deploy --only functions    # Deploy functions
firebase emulators:start            # Local testing
cd mobile && node scripts/bump-version.js patch  # Version bump
```

---

## Project Structure

```
mobile/src/     # React Native app
functions/src/  # Cloud Functions
docs/           # All documentation (start with docs/README.md)
firestore.rules # Security rules
.claude/rules/  # Modular Claude instructions
```

---

## Where to Find Info

| Need | Location |
|------|----------|
| Current priorities | `docs/NEXT_SESSION_HANDOFF.md` |
| Firebase patterns | `.claude/rules/firebase.md` |
| Data schemas | `.claude/rules/architecture.md` |
| Security rules | `.claude/rules/security.md` |
| Development workflow | `.claude/rules/development.md` |
| All docs index | `docs/README.md` |
| Doc navigation | `docs/DOCUMENTATION_MAP.md` |

---

## Common Pitfalls

- No SQL joins (denormalize instead)
- No client-side secrets (use Cloud Functions)
- Normalize phone to E.164 (+91XXXXXXXXXX)
- Test Firestore rules before deploying
- **Never use deprecated Firebase API** (see rules/firebase.md)

---

## Adding Features

1. **Data model first** → update `.claude/rules/architecture.md`
2. **Security rules** → update `firestore.rules`
3. **Cloud Function** if background processing needed
4. **Mobile UI last**

---

## TODO.md Rules

When updating `docs/TODO.md`:
- **ALWAYS tell the user** what was added/changed
- Include task title and section

---

**Last Updated**: December 13, 2024
**AI Context Version**: 2.0 (Modular Rules)
