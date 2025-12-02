import React, { useEffect } from 'react';

// ============================================================================
// STARTUP LOGGING - For debugging crash issues
// ============================================================================
console.log('[App] Starting imports...');

import { RootNavigator } from './src/navigation/RootNavigator';
console.log('[App] RootNavigator imported');

import { AppStatusBar } from './src/components/ui';
console.log('[App] AppStatusBar imported');

import { ErrorBoundary } from './src/providers/ErrorBoundary';
console.log('[App] ErrorBoundary imported');

import { ThemeRuntimeProvider } from './src/theme/runtime';
import { ToastProvider } from './src/providers/ToastProvider';
import { TenantThemeProvider } from './src/providers/TenantThemeProvider';
import { SyncStatusIndicator } from './src/components/SyncStatusIndicator';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
console.log('[App] Core imports complete');

// Initialize Firebase (must be imported before any Firebase usage)
import './src/services/firebase';
console.log('[App] Firebase initialized');

// Initialize upload queue for background photo uploads
import { uploadQueue } from './src/services/uploadQueue';
console.log('[App] UploadQueue imported - All imports complete');

// DEV-ONLY: Wrap with ThemeRuntimeProvider for Design Lab and TenantThemeProvider for white-label
const isDev = __DEV__;

// Create React Query client with persistence-friendly options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes - keep cached data longer for persistence
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Create AsyncStorage persister for React Query cache
// This allows cached data to survive app restarts for faster cold starts
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: '@artis_query_cache',
  throttleTime: 1000, // Throttle writes to storage to every 1 second
});

export default function App() {
  console.log('[App] App component rendering...');

  // Initialize upload queue on app start
  useEffect(() => {
    console.log('[App] useEffect - initializing upload queue');
    uploadQueue.init();
    console.log('[App] App fully initialized!');
  }, []);
  const AppContent = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{ persister: asyncStoragePersister }}
        >
          <TenantThemeProvider>
            <ToastProvider>
              <AppStatusBar />
              <RootNavigator />
              <SyncStatusIndicator />
            </ToastProvider>
          </TenantThemeProvider>
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );

  // Only enable runtime theme system in dev builds
  if (isDev) {
    return <ThemeRuntimeProvider>{AppContent}</ThemeRuntimeProvider>;
  }

  return AppContent;
}
