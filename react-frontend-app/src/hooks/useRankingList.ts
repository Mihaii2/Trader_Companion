import { useState, useEffect } from 'react';
import { RankingListSuccessResponse } from '../types/backendResponses';
import { rankingService } from '../services/rankingService';

export const useRankingList = () => {
  const [rankings, setRankings] = useState<RankingListSuccessResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const data = await rankingService.fetchRankingList();
      setRankings(data); // data is already type checked to be RankingListSuccessResponse
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  return { rankings, loading, error, refetch: fetchRankings };
};