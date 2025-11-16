/**
 * Firebase Authentication Utilities
 *
 * This file provides helper functions for Firebase Authentication
 * using the modular Firebase SDK (v11+).
 *
 * Key features:
 * - Email/password sign in
 * - Phone number sign in (for future use)
 * - Sign out
 * - Get current user
 * - Auth state observer
 */

import {
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  ConfirmationResult,
  User,
  UserCredential,
  ApplicationVerifier,
} from 'firebase/auth';
import { getFirebaseAuth } from './firebase';

/**
 * Sign in with email and password
 *
 * @param email - User's email address
 * @param password - User's password
 * @returns Promise<UserCredential>
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  try {
    const auth = getFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Sign in successful:', userCredential.user.email);
    return userCredential;
  } catch (error: any) {
    console.error('❌ Sign in error:', error.code, error.message);
    throw error;
  }
}

/**
 * Sign out the current user
 *
 * @returns Promise<void>
 */
export async function signOut(): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await firebaseSignOut(auth);
    console.log('✅ Sign out successful');
  } catch (error: any) {
    console.error('❌ Sign out error:', error.code, error.message);
    throw error;
  }
}

/**
 * Get the currently signed-in user
 *
 * @returns User | null
 */
export function getCurrentUser(): User | null {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}

/**
 * Subscribe to auth state changes
 *
 * @param callback - Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the current user's ID token (JWT)
 * Waits for auth state to be ready if user is null
 *
 * @returns Promise<string> - ID token
 */
export async function getCurrentUserToken(): Promise<string> {
  const auth = getFirebaseAuth();

  // Wait for auth state to be ready (max 5 seconds)
  let user = auth.currentUser;
  if (!user) {
    user = await new Promise<User | null>((resolve) => {
      const timeout = setTimeout(() => resolve(null), 5000);
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(u);
      });
    });
  }

  if (!user) {
    throw new Error('No user is currently signed in');
  }

  try {
    const token = await user.getIdToken();
    return token;
  } catch (error) {
    console.error('❌ Error getting user token:', error);
    throw error;
  }
}

/**
 * Check if a user is currently signed in
 *
 * @returns boolean
 */
export function isSignedIn(): boolean {
  return getCurrentUser() !== null;
}

/**
 * Get user email safely
 *
 * @returns string | null
 */
export function getCurrentUserEmail(): string | null {
  return getCurrentUser()?.email || null;
}

/**
 * Get user UID safely
 *
 * @returns string | null
 */
export function getCurrentUserUid(): string | null {
  return getCurrentUser()?.uid || null;
}

/**
 * Set up reCAPTCHA verifier for phone auth
 *
 * @param containerId - ID of the div element where reCAPTCHA will be rendered
 * @returns RecaptchaVerifier instance
 */
export function setupRecaptcha(containerId: string): RecaptchaVerifier {
  const auth = getFirebaseAuth();

  return new RecaptchaVerifier(auth, containerId, {
    size: 'normal',
    callback: () => {
      console.log('✅ reCAPTCHA verified');
    },
    'expired-callback': () => {
      console.log('❌ reCAPTCHA expired, please try again');
    },
  });
}

/**
 * Send OTP to phone number
 *
 * @param phoneNumber - Phone number in E.164 format (+91XXXXXXXXXX)
 * @param recaptchaVerifier - RecaptchaVerifier instance
 * @returns Promise<ConfirmationResult> - Use this to verify OTP
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  recaptchaVerifier: ApplicationVerifier
): Promise<ConfirmationResult> {
  try {
    const auth = getFirebaseAuth();
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
    console.log('✅ OTP sent successfully to:', phoneNumber);
    return confirmationResult;
  } catch (error: any) {
    console.error('❌ Error sending OTP:', error.code, error.message);
    throw error;
  }
}

/**
 * Verify OTP and complete sign in
 *
 * @param confirmationResult - Result from sendPhoneOtp
 * @param otp - 6-digit OTP code
 * @returns Promise<UserCredential>
 */
export async function verifyPhoneOtp(
  confirmationResult: ConfirmationResult,
  otp: string
): Promise<UserCredential> {
  try {
    const userCredential = await confirmationResult.confirm(otp);
    console.log('✅ Phone sign in successful:', userCredential.user.phoneNumber);
    return userCredential;
  } catch (error: any) {
    console.error('❌ Error verifying OTP:', error.code, error.message);
    throw error;
  }
}

/**
 * Format auth error messages for user display
 *
 * @param errorCode - Firebase auth error code
 * @returns User-friendly error message
 */
export function getAuthErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email';
    case 'auth/invalid-phone-number':
      return 'Invalid phone number format. Use +91XXXXXXXXXX';
    case 'auth/invalid-verification-code':
      return 'Invalid OTP code. Please check and try again';
    case 'auth/code-expired':
      return 'OTP has expired. Please request a new code';
    case 'auth/missing-phone-number':
      return 'Please enter a phone number';
    default:
      return 'An error occurred during authentication. Please try again';
  }
}
