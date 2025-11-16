'use client';

/**
 * useAuth Hook
 *
 * Custom hook for managing authentication state using TanStack Query
 * Provides auth user, loading state, and auth mutations (sign in/out)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User as FirebaseUser } from 'firebase/auth';
import {
  signInWithEmail,
  signOut as firebaseSignOut,
  onAuthStateChange,
  getCurrentUser,
  getAuthErrorMessage,
} from '@/lib/firebase-auth';
import { getUserById, checkManagerAccess } from '@/lib/firestore';
import type { User } from '@/types';
import { useEffect } from 'react';

/**
 * Auth query key for caching
 */
export const AUTH_QUERY_KEY = ['auth', 'user'];

/**
 * Hook to get current authenticated user (Firebase Auth only)
 */
export function useAuth() {
  const queryClient = useQueryClient();

  // Query for current user state
  const {
    data: user,
    isLoading,
    error,
  } = useQuery<FirebaseUser | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      return getCurrentUser();
    },
    staleTime: Infinity, // User data doesn't go stale (updated via auth state listener)
    retry: false, // Don't retry auth checks
  });

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    });

    return () => unsubscribe();
  }, [queryClient]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
  };
}

/**
 * Hook to get current user profile from Firestore (includes role)
 */
export function useUserProfile() {
  const { user: authUser, isLoading: authLoading } = useAuth();

  return useQuery<User | null>({
    queryKey: ['user', 'profile', authUser?.uid],
    queryFn: async () => {
      if (!authUser?.uid) return null;
      return getUserById(authUser.uid);
    },
    enabled: !!authUser?.uid, // Only run query if user is authenticated
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Hook to check if current user has manager access
 */
export function useManagerAccess() {
  const { user: authUser } = useAuth();
  const { data: userProfile, isLoading, error } = useUserProfile();

  const hasAccess = userProfile ?
    userProfile.isActive &&
    ['area_manager', 'zonal_head', 'national_head', 'admin'].includes(userProfile.role)
    : false;

  return {
    hasAccess,
    isLoading: isLoading,
    role: userProfile?.role,
    userProfile,
    error,
  };
}

/**
 * Hook for sign in mutation
 */
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const userCredential = await signInWithEmail(email, password);
      return userCredential.user;
    },
    onSuccess: (user) => {
      // Update auth query cache
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
    onError: (error: any) => {
      console.error('Sign in error:', error);
      // Error is handled in the UI via mutation.error
    },
  });
}

/**
 * Hook for sign out mutation
 */
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await firebaseSignOut();
    },
    onSuccess: () => {
      // Clear auth query cache
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      // Optionally clear all queries on sign out
      queryClient.clear();
    },
    onError: (error: any) => {
      console.error('Sign out error:', error);
    },
  });
}

/**
 * Utility to get user-friendly auth error message
 */
export function useAuthErrorMessage(errorCode?: string): string {
  if (!errorCode) return '';
  return getAuthErrorMessage(errorCode);
}
