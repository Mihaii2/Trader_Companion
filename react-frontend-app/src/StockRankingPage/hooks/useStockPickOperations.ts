// hooks/useStockPickOperations.ts
import { useState, useCallback } from 'react';
import type { StockPick, RankingBox } from '../types';
import { stockPicksApi } from '../services/stockPick';

interface UseStockOperationsProps {
  onUpdateBox?: (boxId: number, updatedBox: RankingBox) => void;
}

export const useStockOperations = ({ onUpdateBox }: UseStockOperationsProps = {}) => {
  const [error, setError] = useState<string | null>(null);

  const updateStockInBox = useCallback((box: RankingBox, updatedStock: StockPick): RankingBox => {
    return {
      ...box,
      stock_picks: box.stock_picks.map(stock => 
        stock.id === updatedStock.id ? updatedStock : stock
      )
    };
  }, []);

  const removeStockFromBox = useCallback((box: RankingBox, stockId: number): RankingBox => {
    return {
      ...box,
      stock_picks: box.stock_picks.filter(stock => stock.id !== stockId)
    };
  }, []);

  const handleStockUpdate = useCallback(async (boxId: number, updatedStock: StockPick, box: RankingBox) => {
    try {
      // First, make the API call to persist the changes
      await stockPicksApi.updateStockPick(updatedStock.id, updatedStock);
      
      // Then update the local state
      const updatedBox = updateStockInBox(box, updatedStock);
      onUpdateBox?.(boxId, updatedBox);
    } catch (err) {
      setError('Failed to update stock');
      console.error('Error updating stock:', err);
    }
  }, [updateStockInBox, onUpdateBox]);

  const handleRemoveStock = useCallback(async (boxId: number, stockId: number, box: RankingBox) => {
    try {
      await stockPicksApi.deleteStockPick(stockId);
      const updatedBox = removeStockFromBox(box, stockId);
      onUpdateBox?.(boxId, updatedBox);
    } catch (err) {
      setError('Failed to remove stock');
      console.error('Error removing stock:', err);
    }
  }, [removeStockFromBox, onUpdateBox]);

  const handleMoveStock = useCallback(async (
    stockId: number,
    fromBoxId: number,
    toBoxId: number,
    fromBox: RankingBox,
    toBox: RankingBox
  ) => {
    try {
      const stockToMove = fromBox.stock_picks.find(stock => stock.id === stockId);
      if (!stockToMove) return;

      // Update the stock's box assignment in the backend
      await stockPicksApi.updateStockPick(stockId, { ranking_box: toBoxId });

      // Update the source and destination boxes
      const updatedFromBox = removeStockFromBox(fromBox, stockId);
      const updatedToBox = {
        ...toBox,
        stock_picks: [...toBox.stock_picks, { ...stockToMove, ranking_box: toBoxId }]
      };

      // Notify parent components of the changes
      onUpdateBox?.(fromBoxId, updatedFromBox);
      onUpdateBox?.(toBoxId, updatedToBox);
    } catch (err) {
      setError('Failed to move stock');
      console.error('Error moving stock:', err);
    }
  }, [removeStockFromBox, onUpdateBox]);

  const calculateTotalScore = useCallback((stocks: StockPick[]): number => {
    return stocks.reduce((total, stock) => {
      const stockScore = stock.characteristics.reduce(
        (sum, char) => sum + char.score, 
        0
      );
      return total + stockScore;
    }, 0);
  }, []);

  const sortStocksByScore = useCallback((stocks: StockPick[]): StockPick[] => {
    return [...stocks].sort((a, b) => {
      const scoreA = a.characteristics.reduce((sum, char) => sum + char.score, 0);
      const scoreB = b.characteristics.reduce((sum, char) => sum + char.score, 0);
      return scoreB - scoreA;
    });
  }, []);

  return {
    error,
    handleStockUpdate,
    handleRemoveStock,
    handleMoveStock,
    calculateTotalScore,
    sortStocksByScore,
    updateStockInBox,
    removeStockFromBox
  };
};