import React, { useEffect } from 'react';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppStatusBar } from './src/components/ui';
import { ErrorBoundary } from './src/providers/ErrorBoundary';
import { ThemeRuntimeProvider } from './src/theme/runtime';
import { ToastProvider } from './src/providers/ToastProvider';
import { TenantThemeProvider } from './src/providers/TenantThemeProvider';
import { SyncStatusIndicator } from './src/components/SyncStatusIndicator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Initialize Firebase (must be imported before any Firebase usage)
import './src/services/firebase';

// Initialize upload queue for background photo uploads
import { uploadQueue } from './src/services/uploadQueue';

// DEV-ONLY: Wrap with ThemeRuntimeProvider for Design Lab and TenantThemeProvider for white-label
const isDev = __DEV__;

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  // Initialize upload queue on app start
  useEffect(() => {
    uploadQueue.init();
  }, []);
  const AppContent = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <TenantThemeProvider>
            <ToastProvider>
              <AppStatusBar />
              <RootNavigator />
              <SyncStatusIndicator />
            </ToastProvider>
          </TenantThemeProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );

  // Only enable runtime theme system in dev builds
  if (isDev) {
    return <ThemeRuntimeProvider>{AppContent}</ThemeRuntimeProvider>;
  }

  return AppContent;
}
