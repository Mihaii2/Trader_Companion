// src/components/MainRankingList.tsx
import React from 'react';
import { RankingItem } from './RankingItem';
import type { StockPick } from '../types';

interface Props {
  allStocks: StockPick[];
}

export const MainRankingList: React.FC<Props> = ({ allStocks }) => {
  const sortedStocks = [...allStocks].sort((a, b) => b.total_score - a.total_score);

  return (
    <div className="w-full bg-white rounded-lg shadow-md p-6 mb-8">
      <h2 className="text-2xl font-bold mb-4">Overall Rankings</h2>
      <div className="space-y-4">
        {sortedStocks.map((stock) => (
          <RankingItem
            key={stock.id}
            stock={stock}
          />
        ))}
      </div>
    </div>
  );
};