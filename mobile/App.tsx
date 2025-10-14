import React from 'react';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppStatusBar } from './src/components/ui';
import { ErrorBoundary } from './src/providers/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <AppStatusBar />
      <RootNavigator />
    </ErrorBoundary>
  );
}
