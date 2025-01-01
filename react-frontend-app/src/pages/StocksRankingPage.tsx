import React from 'react';
import { StocksScreenerCommander } from '../components/stocks/StocksScreenerCommander';
import { RankingList } from '@/components/stocks/RankingList';
import { PipelineStatus } from '@/components/stocks/PipelineStatus';

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