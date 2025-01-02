// src/components/MainRankingList.tsx
import React, { useState, useEffect } from 'react';
import { RankingItem } from './RankingItem';
import type { StockPick } from '../types';

interface Props {
  allStocks: StockPick[];
  onStockUpdate?: (boxId: number, updatedStock: StockPick) => void;
  onRemoveStock?: (boxId: number, stockId: number) => void;
}

export const MainRankingList: React.FC<Props> = ({ 
  allStocks,
  onStockUpdate,
  onRemoveStock
}) => {
  const [sortedStocks, setSortedStocks] = useState<StockPick[]>([]);

  useEffect(() => {
    setSortedStocks([...allStocks].sort((a, b) => b.total_score - a.total_score));
  }, [allStocks]);

  const handleStockUpdate = (updatedStock: StockPick) => {
    // Update local state
    setSortedStocks(prev => {
      const newStocks = prev.map(stock => 
        stock.id === updatedStock.id ? updatedStock : stock
      );
      return [...newStocks].sort((a, b) => b.total_score - a.total_score);
    });

    // Propagate update to parent if callback provided
    if (onStockUpdate) {
      onStockUpdate(updatedStock.ranking_box, updatedStock);
    }
  };

  const handleRemoveStock = (stock: StockPick) => {
    // Update local state
    setSortedStocks(prev => prev.filter(s => s.id !== stock.id));

    // Propagate removal to parent if callback provided
    if (onRemoveStock) {
      onRemoveStock(stock.ranking_box, stock.id);
    }
  };

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">Overall Rankings</h2>
      <div className="space-y-4">
        {sortedStocks.map((stock) => (
          <RankingItem
            key={stock.id}
            stock={stock}
            onUpdate={handleStockUpdate}
            onRemove={() => handleRemoveStock(stock)}
          />
        ))}
      </div>
    </div>
  );
};