import React from 'react';
import { StocksScreenerCommander } from '../components/stocks/StocksScreenerCommander';
import { ThemeToggle } from "../components/theme-toggle";

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
      <h1 className="text-3xl font-bold mb-8">Stocks Screener</h1>
      <ThemeToggle />
      <div className="space-y-8">
        <StocksScreenerCommander/>
        
        {/* <RankingList
          stocks={stocks}
          onAddToPersonal={handleAddToPersonal}
          onBanStock={handleBanStock}
          lastUpdated={stocks[0]?.lastUpdated}
        /> */}
      </div>
    </div>
  );
};