import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    setSortedStocks(prev => {
      const newStocks = prev.map(stock =>
        stock.id === updatedStock.id ? updatedStock : stock
      );
      return [...newStocks].sort((a, b) => b.total_score - a.total_score);
    });
    
    if (onStockUpdate) {
      onStockUpdate(updatedStock.ranking_box, updatedStock);
    }
  };

  const handleRemoveStock = (stock: StockPick) => {
    setSortedStocks(prev => prev.filter(s => s.id !== stock.id));
    
    if (onRemoveStock) {
      onRemoveStock(stock.ranking_box, stock.id);
    }
  };

  return (
    <Card className="w-full rounded-sm bg-background border-border h-full">
      <CardHeader className="px-3 py-2 border-b border-border">
        <CardTitle className="text-lg font-medium text-foreground">Overall Ranking</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {sortedStocks.map((stock) => (
            <div key={stock.id} className="px-2 py-1 hover:bg-muted/50 transition-colors">
              <RankingItem
                stock={stock}
                onUpdate={handleStockUpdate}
                onRemove={() => handleRemoveStock(stock)}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default MainRankingList;