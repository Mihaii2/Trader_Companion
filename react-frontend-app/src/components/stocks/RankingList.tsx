// components/stocks/RankingList.tsx
import React from 'react';
import { useRankingList } from '../../hooks/useRankingList';
import { RankingItemComponent } from './RankingItemComponent';

export const RankingList: React.FC = () => {
  const { rankings, loading, error } = useRankingList();

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
      {rankings?.created_at && (
        <div className="p-4 border-b">
          <p className="text-sm text-gray-500">
            Stock Data Last Update: {new Date(rankings.created_at).toLocaleString()}
          </p>
        </div>
      )}
      
      <div className="divide-y">
        {rankings?.message?.map((item) => (
          <RankingItemComponent key={item.Symbol} rankingData={item} />
        ))}
      </div>
    </div>
  );
};