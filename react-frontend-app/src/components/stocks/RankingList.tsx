// components/stocks/RankingList.tsx
import React, { useState } from 'react';
import { useRankingList } from '../../hooks/useRankingList';
import { RankingItemComponent } from './RankingItemComponent';
import { RankingType } from '../../types/rankingList';

export const RankingList: React.FC = () => {
  const [rankingType, setRankingType] = useState<RankingType>('price');
  const { rankings, loading, error } = useRankingList(rankingType);

  const toggleRankingType = () => {
    setRankingType(current => current === 'price' ? 'screeners' : 'price');
  };

  if (loading) return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-gray-500">Loading rankings...</p>
    </div>
  );

  if (error) return (
    <div className="bg-white rounded-lg shadow p-4">
      <p className="text-red-500">Error: {error}</p>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <button 
          onClick={toggleRankingType}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Rank by: {rankingType === 'price' ? 'Price' : 'Screener Count'}
        </button>
        
        {rankings?.created_at && (
          <p className="text-sm text-gray-500">
            Stock Data Last Update: {new Date(rankings.created_at).toLocaleString()}
          </p>
        )}
      </div>
      
      <div className="divide-y">
        {rankings?.message?.map((item) => (
          <RankingItemComponent key={item.Symbol} rankingData={item} />
        ))}
      </div>
    </div>
  );
};
