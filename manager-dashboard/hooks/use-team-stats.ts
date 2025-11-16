'use client';

/**
 * useTeamStats Hook
 *
 * Fetch team statistics for the dashboard
 * Uses TanStack Query for caching and automatic refetching
 */

import { useQuery } from '@tanstack/react-query';
import { getTeamStats, GetTeamStatsRequest, GetTeamStatsResponse } from '@/lib/api';
import { format } from 'date-fns';
import { useAuth } from './use-auth';

/**
 * Hook to fetch team statistics
 *
 * @param date - Date string in YYYY-MM-DD format (defaults to today)
 * @param range - Time range: 'today' | 'week' | 'month'
 * @returns TanStack Query result with team stats
 */
export function useTeamStats(
  date?: string,
  range: 'today' | 'week' | 'month' = 'today'
) {
  const { isAuthenticated } = useAuth();

  // Default to today if no date provided
  const queryDate = date || format(new Date(), 'yyyy-MM-dd');

  return useQuery<GetTeamStatsResponse>({
    queryKey: ['teamStats', queryDate, range],
    queryFn: async () => {
      const result = await getTeamStats({ date: queryDate, range });
      return result;
    },
    enabled: isAuthenticated, // Only fetch when user is authenticated
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refetch every 2 minutes for live updates
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    retry: 2, // Retry failed requests twice
  });
}

/**
 * Hook to get just the stats object (without wrapper)
 *
 * @param date - Date string
 * @param range - Time range
 * @returns Stats object or undefined if loading/error
 */
export function useTeamStatsData(
  date?: string,
  range: 'today' | 'week' | 'month' = 'today'
) {
  const { data, isLoading, error } = useTeamStats(date, range);

  return {
    stats: data?.stats,
    isLoading,
    error,
  };
}
