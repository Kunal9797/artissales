/**
 * Firebase Configuration (Web SDK v11 - Modular API)
 *
 * This file initializes Firebase services for the manager dashboard.
 * Uses environment variables for configuration.
 *
 * Services initialized:
 * - Firebase App
 * - Firestore (database)
 * - Auth (authentication)
 * - Functions (callable Cloud Functions)
 * - Storage (file uploads - optional for future use)
 *
 * NOTE: This must be imported in client components only ('use client')
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getFunctions, Functions } from 'firebase/functions';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration from environment variables
// These MUST have NEXT_PUBLIC_ prefix to be available in the browser
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase lazily (only when accessed)
function initializeFirebase() {
  // Validate configuration
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

  if (missingKeys.length > 0) {
    const error = `Missing Firebase configuration: ${missingKeys.map(k => `NEXT_PUBLIC_FIREBASE_${k.toUpperCase().replace(/([A-Z])/g, '_$1')}`).join(', ')}`;
    console.error('❌', error);
    console.error('Please check your .env.local file');
    throw new Error(error);
  }

  // Check if Firebase is already initialized (important for hot reloading in dev)
  if (!getApps().length) {
    const app = initializeApp(firebaseConfig);
    console.log('✅ Firebase initialized successfully');
    return app;
  } else {
    console.log('✅ Firebase already initialized, reusing existing instance');
    return getApps()[0];
  }
}

// Lazy getters for Firebase services
let _app: FirebaseApp | undefined;
let _db: Firestore | undefined;
let _auth: Auth | undefined;
let _functions: Functions | undefined;
let _storage: FirebaseStorage | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = initializeFirebase();
  }
  return _app;
}

export function getDb(): Firestore {
  if (!_db) {
    _db = getFirestore(getFirebaseApp());
  }
  return _db;
}

export function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getFirebaseApp());
  }
  return _auth;
}

export function getFirebaseFunctions(): Functions {
  if (!_functions) {
    _functions = getFunctions(getFirebaseApp());
    // Set Firebase Functions region if needed (default: us-central1)
    // If your functions are in a different region, uncomment and update:
    // _functions = getFunctions(getFirebaseApp(), 'asia-south1');
  }
  return _functions;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!_storage) {
    _storage = getStorage(getFirebaseApp());
  }
  return _storage;
}

// Export convenience aliases
export const app = getFirebaseApp;
export const db = getDb;
export const auth = getFirebaseAuth;
export const functions = getFirebaseFunctions;
export const storage = getFirebaseStorage;

// Default export
export default getFirebaseApp;
