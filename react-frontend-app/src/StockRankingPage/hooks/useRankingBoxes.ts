// hooks/useRankingBoxes.ts
import { useState, useEffect } from 'react';
import { RankingBox, UserPageState } from '../types';
import { rankingBoxesApi } from '../services/rankingBoxes';
import { userPageStateApi } from '../services/userPageState';

export const useRankingBoxes = () => {
  const [rankingBoxes, setRankingBoxes] = useState<RankingBox[]>([]);
  const [pageState, setPageState] = useState<UserPageState>({
    column_count: 3,
    ranking_boxes_order: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [boxesResponse, pageStateResponse] = await Promise.all([
        rankingBoxesApi.getRankingBoxes(),
        userPageStateApi.getUserPageState()
      ]);

      setRankingBoxes(boxesResponse.data);
      setPageState(pageStateResponse.data);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReorderBoxes = async (newOrder: RankingBox[]) => {
    try {
      setRankingBoxes(newOrder);
      await userPageStateApi.updateUserPageState({
        ranking_boxes_order: newOrder.map(box => box.id)
      });
    } catch (err) {
      setError('Failed to update box order');
      console.error('Error updating box order:', err);
    }
  };

  const handleColumnCountChange = async (count: number) => {
    try {
      await userPageStateApi.updateUserPageState({
        column_count: count
      });
      setPageState(prev => ({ ...prev, column_count: count }));
    } catch (err) {
      setError('Failed to update column count');
      console.error('Error updating column count:', err);
    }
  };

  const handleRemoveBox = async (id: number) => {
    try {
      await rankingBoxesApi.deleteRankingBox(id);
      setRankingBoxes(prev => prev.filter(box => box.id !== id));
    } catch (err) {
      setError('Failed to delete box');
      console.error('Error deleting box:', err);
    }
  };

  return {
    rankingBoxes,
    pageState,
    isLoading,
    error,
    handleReorderBoxes,
    handleColumnCountChange,
    handleRemoveBox
  };
};