import React, { useEffect } from 'react';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppStatusBar } from './src/components/ui';
import { ErrorBoundary } from './src/providers/ErrorBoundary';
import { ThemeRuntimeProvider } from './src/theme/runtime';
import { ToastProvider } from './src/providers/ToastProvider';
import { TenantThemeProvider } from './src/providers/TenantThemeProvider';
import { SyncStatusIndicator } from './src/components/SyncStatusIndicator';

// Initialize Firebase (must be imported before any Firebase usage)
import './src/services/firebase';

// Initialize upload queue for background photo uploads
import { uploadQueue } from './src/services/uploadQueue';

// DEV-ONLY: Wrap with ThemeRuntimeProvider for Design Lab and TenantThemeProvider for white-label
const isDev = __DEV__;

export default function App() {
  // Initialize upload queue on app start
  useEffect(() => {
    uploadQueue.init();
  }, []);
  const AppContent = (
    <ErrorBoundary>
      <TenantThemeProvider>
        <ToastProvider>
          <AppStatusBar />
          <RootNavigator />
          <SyncStatusIndicator />
        </ToastProvider>
      </TenantThemeProvider>
    </ErrorBoundary>
  );

  // Only enable runtime theme system in dev builds
  if (isDev) {
    return <ThemeRuntimeProvider>{AppContent}</ThemeRuntimeProvider>;
  }

  return AppContent;
}
