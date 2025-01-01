// hooks/useRankingList.ts
import { useState, useEffect, useCallback } from 'react';
import { RankingListSuccessResponse } from '../types/rankingList';
import { rankingService } from '../services/rankingService';
import { RankingType } from '../types/rankingList';

export const useRankingList = (rankingType: RankingType) => {
  const [rankings, setRankings] = useState<RankingListSuccessResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rankingService.fetchRankingList(rankingType);
      setRankings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [rankingType]); // Memoize fetchRankings based on rankingType

  useEffect(() => {
    fetchRankings();
  }, [rankingType, fetchRankings]); // Now we can safely include fetchRankings in dependencies

  return { rankings, loading, error, refetch: fetchRankings };
};