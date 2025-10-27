/**
 * useTargetProgress Hook
 *
 * Fetches target progress with built-in caching to reduce API calls.
 * Multiple components can call this hook with the same userId+month
 * and only one API call will be made (within 5-min cache window).
 */

import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { targetCache } from '../services/targetCache';
import { TargetProgress, VisitProgress } from '../types';
import { logger } from '../utils/logger';

interface UseTargetProgressResult {
  progress: TargetProgress[] | null;
  visitProgress: VisitProgress[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTargetProgress(
  userId: string | undefined,
  month: string
): UseTargetProgressResult {
  const [progress, setProgress] = useState<TargetProgress[] | null>(null);
  const [visitProgress, setVisitProgress] = useState<VisitProgress[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTarget = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const cached = targetCache.get(userId, month);
      if (cached) {
        logger.info('[useTargetProgress] Using cached data');
        setProgress(cached.progress || null);
        setVisitProgress(cached.visitProgress || null);
        setLoading(false);
        return;
      }

      // Cache miss - fetch from API
      logger.info('[useTargetProgress] Cache miss - fetching from API');
      const response = await api.getTarget({ userId, month });

      // Cache the response
      targetCache.set(userId, month, response);

      setProgress(response.progress || null);
      setVisitProgress(response.visitProgress || null);
    } catch (err: any) {
      logger.error('[useTargetProgress] Error fetching target:', err);
      setError(err.message || 'Failed to load target');
      setProgress(null);
      setVisitProgress(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTarget();
  }, [userId, month]);

  return {
    progress,
    visitProgress,
    loading,
    error,
    refetch: fetchTarget,
  };
}
