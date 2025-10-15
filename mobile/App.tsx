import React from 'react';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppStatusBar } from './src/components/ui';
import { ErrorBoundary } from './src/providers/ErrorBoundary';
import { ThemeRuntimeProvider } from './src/theme/runtime';
import { ToastProvider } from './src/providers/ToastProvider';
import { TenantThemeProvider } from './src/providers/TenantThemeProvider';

// Initialize Firebase (must be imported before any Firebase usage)
import './src/services/firebase';

// DEV-ONLY: Wrap with ThemeRuntimeProvider for Design Lab and TenantThemeProvider for white-label
const isDev = __DEV__;

export default function App() {
  const AppContent = (
    <ErrorBoundary>
      <TenantThemeProvider>
        <ToastProvider>
          <AppStatusBar />
          <RootNavigator />
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
