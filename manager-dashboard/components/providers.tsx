'use client';

/**
 * Providers Component
 *
 * Wraps the app with necessary providers (TanStack Query)
 * Must be a client component for React context
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient in component state to avoid sharing between requests
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Default options for all queries
            staleTime: 60 * 1000, // Data stays fresh for 1 minute
            retry: 1, // Retry failed requests once
            refetchOnWindowFocus: false, // Don't refetch on window focus (can be annoying in dev)
          },
          mutations: {
            // Default options for all mutations
            retry: 0, // Don't retry mutations
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query DevTools - only shows in development */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
