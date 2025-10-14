import React from 'react';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppStatusBar } from './src/components/ui';
import { ErrorBoundary } from './src/providers/ErrorBoundary';
import { ThemeRuntimeProvider } from './src/theme/runtime';
import { ToastProvider } from './src/providers/ToastProvider';

// DEV-ONLY: Wrap with ThemeRuntimeProvider for Design Lab
const isDev = __DEV__;

export default function App() {
  const AppContent = (
    <ErrorBoundary>
      <ToastProvider>
        <AppStatusBar />
        <RootNavigator />
      </ToastProvider>
    </ErrorBoundary>
  );

  // Only enable runtime theme system in dev builds
  if (isDev) {
    return <ThemeRuntimeProvider>{AppContent}</ThemeRuntimeProvider>;
  }

  return AppContent;
}
