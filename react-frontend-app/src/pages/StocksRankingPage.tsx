import React from 'react';
import { StocksScreenerCommander } from '../components/stocks/StocksScreenerCommander';
import { ThemeToggle } from "../components/ThemeToggle";
import { RankingList } from '@/components/stocks/RankingList';

export const StocksRankingPage: React.FC = () => {

  // const handleAddToPersonal = (ticker: string) => {
  //   // Implementation for adding to personal list
  //   console.log('Adding to personal:', ticker);
  // };

  // const handleBanStock = (ticker: string, duration: number) => {
  //   // Implementation for banning stock
  //   console.log('Banning stock:', ticker, 'for', duration, 'days');
  // };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <ThemeToggle />
      <div className="space-y-8">
        <StocksScreenerCommander/>
        
        
      </div>
      <RankingList />
    </div>
  );
};