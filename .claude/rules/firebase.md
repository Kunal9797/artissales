# Firebase API Guidelines

**Use modular API (v9+).** The old namespaced API is deprecated.

---

## The Pattern

```typescript
// 1. Import modular functions
import firestore, { doc, getDoc, setDoc, query, where, getDocs, collection } from '@react-native-firebase/firestore';

// 2. Get instance once
const db = firestore();

// 3. Pass instance as first parameter
const userRef = doc(db, 'users', userId);
const snap = await getDoc(userRef);
if (snap.exists()) { ... }  // exists() is a METHOD, not property
```

---

## Quick Reference

| Service | Get Instance | Example |
|---------|--------------|---------|
| Firestore | `firestore()` | `doc(db, 'users', id)` |
| Analytics | `getAnalytics()` | `logEvent(analytics, 'event', {})` |
| Crashlytics | `getCrashlytics()` | `recordError(crashlytics, error)` |
| Auth | `getAuth()` | `getIdToken(user)` |

---

## Common Operations

### Firestore
```typescript
// Read
const snap = await getDoc(doc(db, 'users', id));

// Write
await setDoc(doc(db, 'visits', id), data);

// Query
const q = query(collection(db, 'visits'), where('userId', '==', uid));
const results = await getDocs(q);
```

### Analytics
```typescript
import { getAnalytics, logEvent, setUserId } from '@react-native-firebase/analytics';
const analytics = getAnalytics();

await logEvent(analytics, 'screen_view', { firebase_screen: 'Home' });
await setUserId(analytics, id);
```

### Crashlytics
```typescript
import { getCrashlytics, recordError, log } from '@react-native-firebase/crashlytics';
const crashlytics = getCrashlytics();

recordError(crashlytics, new Error('...'));
log(crashlytics, 'message');
```

---

## What NOT to Do

```typescript
// WRONG - deprecated namespaced API
firestore().collection('users').doc(id).get()
analytics().logEvent('event', {})
crashlytics().recordError(error)
user.getIdToken()

// WRONG - exists is a method now, not property
if (doc.exists) { }  // OLD
if (doc.exists()) { }  // CORRECT
```

---

## Why This Matters

- Old API will be **removed** in next major version
- Modular API enables tree-shaking (smaller bundles)
- Prevents deprecation warnings
