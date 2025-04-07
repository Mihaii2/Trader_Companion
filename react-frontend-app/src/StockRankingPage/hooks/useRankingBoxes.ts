// hooks/useRankingBoxes.ts
import { useState, useEffect, useCallback } from 'react';
import { RankingBox, UserPageState } from '../types';
import { rankingBoxesApi } from '../services/rankingBoxes';
import { userPageStateApi } from '../services/userPageState';
import { orderRankingBoxes } from '../utils/orderRankingBoxes';

export const useRankingBoxes = () => {
  const [rankingBoxes, setRankingBoxes] = useState<RankingBox[]>([]);
  const [pageState, setPageState] = useState<UserPageState>({
    column_count: 3,
    ranking_boxes_order: [],
    updated_at: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [boxesResponse, pageStateResponse] = await Promise.all([
        rankingBoxesApi.getRankingBoxes(),
        userPageStateApi.getUserPageState()
      ]);

      const orderedBoxes = orderRankingBoxes(
        boxesResponse.data,
        pageStateResponse.data.ranking_boxes_order
      );

      setRankingBoxes(orderedBoxes);
      setPageState(pageStateResponse.data);
    } catch (err) {
      setError('Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleReorderBoxes = async (newOrder: RankingBox[]) => {
    try {
      setRankingBoxes(newOrder);
      const newOrderIds = newOrder.map(box => box.id);
      
      await userPageStateApi.updateUserPageState({
        ...pageState,
        ranking_boxes_order: newOrderIds
      });
      
      setPageState(prev => ({
        ...prev,
        ranking_boxes_order: newOrderIds
      }));
    } catch (err) {
      setError('Failed to update box order');
      console.error('Error updating box order:', err);
      fetchData(); // Revert to server state on error
    }
  };

  const handleColumnCountChange = async (count: number) => {
    try {
      await userPageStateApi.updateUserPageState({
        ...pageState,
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
      setPageState(prev => ({
        ...prev,
        ranking_boxes_order: prev.ranking_boxes_order.filter(boxId => boxId !== id)
      }));
    } catch (err) {
      setError('Failed to delete box');
      console.error('Error deleting box:', err);
    }
  };

  const handleUpdateStock = async (boxId: number, updatedBox: RankingBox) => {
    setRankingBoxes(prev => 
      prev.map(box => box.id === boxId ? updatedBox : box)
    );
  };

  const refreshBoxes = () => {
    fetchData();
  };

  return {
    rankingBoxes,
    pageState,
    isLoading,
    error,
    handleReorderBoxes,
    handleColumnCountChange,
    handleRemoveBox,
    handleUpdateStock,
    refreshBoxes
  };
};