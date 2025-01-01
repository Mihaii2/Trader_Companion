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
    <div className="bg-background rounded-lg shadow-sm p-4">
      <p className="text-muted-foreground">Loading rankings...</p>
    </div>
  );

  if (error) return (
    <div className="bg-background rounded-lg shadow-sm p-4">
      <p className="text-destructive">Error: {error}</p>
    </div>
  );

  return (
    <div className="bg-background rounded-lg shadow-sm">
      <div className="p-4 border-b border-border flex justify-between items-start">
        <button
          onClick={toggleRankingType}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Rank by: {rankingType === 'price' ? 'Price' : 'Screener Count'}
        </button>
        
        <div className="flex flex-col space-y-1 text-sm text-muted-foreground text-right">
          {rankings?.rankings_created_at && (
            <p>Current Ranking List Last Update: {new Date(rankings.rankings_created_at).toLocaleString()}</p>
          )}
          {rankings?.stock_data_created_at && (
            <p>Stock Data Last Update: {new Date(rankings.stock_data_created_at).toLocaleString()}</p>
          )}
        </div>
      </div>
      
      <div className="divide-y divide-border">
        {rankings?.message?.map((item) => (
          <RankingItemComponent key={item.Symbol} rankingData={item} />
        ))}
      </div>
    </div>
  );
};