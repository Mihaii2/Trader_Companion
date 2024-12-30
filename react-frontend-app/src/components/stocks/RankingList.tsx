import React from 'react';
import { Stock } from '../../types/screenerCommander';
import { StockItem } from './StockItem';

interface RankingListProps {
  stocks: Stock[];
  onAddToPersonal: (ticker: string) => void;
  onBanStock: (ticker: string, duration: number) => void;
  lastUpdated?: Date;
}

export const RankingList: React.FC<RankingListProps> = ({
  stocks,
  onAddToPersonal,
  onBanStock,
  lastUpdated,
}) => {
  return (
    <div className="bg-white rounded-lg shadow">
      {lastUpdated && (
        <div className="p-4 border-b">
          <p className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </div>
      )}
      
      <div className="divide-y">
        {stocks.map((stock) => (
          <StockItem
            key={stock.ticker}
            stock={stock}
            onAddToPersonal={onAddToPersonal}
            onBanStock={onBanStock}
          />
        ))}
      </div>
    </div>
  );
};