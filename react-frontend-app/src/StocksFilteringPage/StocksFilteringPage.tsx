import React from 'react';
import { StocksScreenerCommander } from './components/StocksScreenerCommander';
import { RankingList } from '@/StocksFilteringPage/components/RankingList';
import { PipelineStatus } from '@/StocksFilteringPage/components/PipelineStatus';

export const StocksRankingPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="space-y-8">
        <StocksScreenerCommander/>
      </div>
      <PipelineStatus pollingInterval={1500} />
      <RankingList />
    </div>
  );
};