# Firebase API Usage Standards

**Last Updated**: October 14, 2025
**Firebase SDK**: @react-native-firebase/* v23.4.0

---

## ✅ Chosen Approach: React Native Firebase (Modular API)

This project uses **@react-native-firebase/* packages** with the **modular API style** for all Firebase operations.

### Why @react-native-firebase/*?
- ✅ Native Android/iOS modules (better performance than web SDK)
- ✅ Offline persistence built-in
- ✅ Better integration with React Native navigation lifecycle
- ✅ Smaller bundle size (no web polyfills needed)
- ✅ Direct access to native Firebase features (FCM, Crashlytics, etc.)

### Why Modular API?
- ✅ Tree-shakeable imports (smaller bundle)
- ✅ Future-proof (namespaced API is deprecated)
- ✅ Matches Firebase Web SDK v9+ patterns
- ✅ Better TypeScript support

---

## 📚 Modular API Patterns

### Firestore (Database)

#### ✅ CORRECT - Modular API (Use This)

```typescript
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp
} from '@react-native-firebase/firestore';

// Get Firestore instance
const db = getFirestore();

// Read a single document
const userDocRef = doc(db, 'users', userId);
const userDoc = await getDoc(userDocRef);
if (userDoc.exists()) {
  const userData = userDoc.data();
  console.log('User:', userData);
}

// Write a document
const newDocRef = doc(db, 'visits', visitId);
await setDoc(newDocRef, {
  userId,
  timestamp: Timestamp.now(),
  notes: 'Sample visit'
});

// Query collection
const usersCollection = collection(db, 'users');
const q = query(
  usersCollection,
  where('role', '==', 'rep'),
  orderBy('createdAt', 'desc'),
  limit(10)
);
const snapshot = await getDocs(q);
snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});

// Update document
const docRef = doc(db, 'users', userId);
await updateDoc(docRef, {
  name: 'Updated Name',
  updatedAt: Timestamp.now()
});

// Delete document
await deleteDoc(docRef);
```

#### ❌ WRONG - Deprecated Namespaced API (Never Use)

```typescript
// ❌ DO NOT USE - This is deprecated!
import firestore from '@react-native-firebase/firestore';

const userDoc = await firestore()
  .collection('users')
  .doc(userId)
  .get();

if (userDoc.exists) {  // ⚠️ Note: exists is a property, not a method!
  const data = userDoc.data();
}

// ❌ DO NOT USE
const snapshot = await firestore()
  .collection('users')
  .where('role', '==', 'rep')
  .get();
```

---

### Authentication

#### ✅ CORRECT - Modular API

```typescript
import {
  getAuth,
  signInWithPhoneNumber,
  onAuthStateChanged,
  signOut
} from '@react-native-firebase/auth';

// Get Auth instance
const auth = getAuth();

// Phone authentication
const confirmation = await signInWithPhoneNumber(auth, phoneNumber);
await confirmation.confirm(code);

// Listen to auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('User logged in:', user.uid);
  } else {
    console.log('User logged out');
  }
});

// Sign out
await signOut(auth);
```

#### ❌ WRONG - Deprecated

```typescript
// ❌ DO NOT USE
import auth from '@react-native-firebase/auth';
const confirmation = await auth().signInWithPhoneNumber(phoneNumber);
```

---

### Storage (File Uploads)

#### ✅ CORRECT - Modular API

```typescript
import {
  getStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL
} from '@react-native-firebase/storage';

// Get Storage instance
const storage = getStorage();

// Upload file
const fileRef = ref(storage, `visits/${userId}/${Date.now()}.jpg`);
await uploadBytes(fileRef, fileBlob);
const downloadURL = await getDownloadURL(fileRef);

// Upload base64 string
await uploadString(fileRef, base64String, 'base64');
```

#### ❌ WRONG - Deprecated

```typescript
// ❌ DO NOT USE
import storage from '@react-native-firebase/storage';
const fileRef = storage().ref(`visits/${userId}/${Date.now()}.jpg`);
await fileRef.putFile(filePath);
```

---

## 🔍 Key Differences (Modular vs Deprecated)

| Feature | Deprecated (❌) | Modular (✅) |
|---------|----------------|--------------|
| **Import** | `import firestore from '@react-native-firebase/firestore'` | `import { getFirestore, ... } from '@react-native-firebase/firestore'` |
| **Instance** | `firestore()` | `getFirestore()` |
| **Collection** | `.collection('users')` | `collection(db, 'users')` |
| **Document** | `.doc(id)` | `doc(db, 'users', id)` |
| **Query** | `.where(...).orderBy(...)` | `query(collection, where(...), orderBy(...))` |
| **Get doc** | `await docRef.get()` | `await getDoc(docRef)` |
| **Get collection** | `await collectionRef.get()` | `await getDocs(query)` |
| **Exists check** | `snapshot.exists` (property) | `snapshot.exists()` (method) |
| **Set doc** | `await docRef.set(data)` | `await setDoc(docRef, data)` |
| **Update doc** | `await docRef.update(data)` | `await updateDoc(docRef, data)` |

---

## 📂 Codebase Audit Results

### ✅ Migrated Files
- [x] `/mobile/src/hooks/useAuth.ts` - Query by phone using modular API
- [x] All other files already use modular API

### ⚠️ Files with Mixed Patterns
- None detected

### 🚫 Files with Deprecated API
- None remaining

---

## 🛠️ Migration Checklist

When adding new Firebase code, ensure:

- [ ] Import specific functions from `@react-native-firebase/firestore` (not default import)
- [ ] Get Firestore instance: `const db = getFirestore()`
- [ ] Use `doc(db, collectionName, docId)` instead of `.collection().doc()`
- [ ] Use `getDoc(docRef)` instead of `docRef.get()`
- [ ] Use `exists()` method, not `exists` property
- [ ] Use `getDocs(query)` for collection queries
- [ ] Import `query`, `where`, `orderBy`, `limit` as needed
- [ ] Use `Timestamp.now()` for timestamps (imported from firestore)

---

## 📖 References

- [React Native Firebase v6+ Modular API](https://rnfirebase.io/)
- [Firebase Web SDK v9 Migration Guide](https://firebase.google.com/docs/web/modular-upgrade)
- [Firestore Modular API Reference](https://firebase.google.com/docs/reference/js/firestore_)

---

## 🧪 Testing Firebase Locally

```bash
# Start Firebase emulators (requires firebase-tools)
firebase emulators:start

# Connect app to emulators (in code)
import { connectFirestoreEmulator } from '@react-native-firebase/firestore';
const db = getFirestore();
connectFirestoreEmulator(db, 'localhost', 8080);
```

---

**Last Audit**: October 14, 2025
**Status**: ✅ All files migrated to modular API
