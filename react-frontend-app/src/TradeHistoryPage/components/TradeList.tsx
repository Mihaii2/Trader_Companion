// src/components/TradesList.tsx
import React, { useState, useMemo } from 'react';
import { Trade } from '../types/Trade';
import { TradeComponent } from './TradeComponent';  // Updated import

interface TradesListProps {
  trades: Trade[];
  onUpdate: (updatedTrade: Trade) => void;
  onDelete: (id: number) => void;
}

export const TradesList: React.FC<TradesListProps> = ({ trades, onUpdate, onDelete }) => {
  const [displayCount, setDisplayCount] = useState<number>(10);
  
  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      const dateA = new Date(a.Entry_Date);
      const dateB = new Date(b.Entry_Date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [trades]);

  const handleDisplayCountChange = (value: number) => {
    const newCount = Math.min(Math.max(1, value), trades.length);
    setDisplayCount(newCount);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4 bg-background p-4 rounded-lg border">
        <label className="text-sm font-medium text-foreground">
          Show latest trades:
        </label>
        <input
          type="range"
          min="1"
          max={trades.length}
          value={displayCount}
          onChange={(e) => handleDisplayCountChange(Number(e.target.value))}
          className="w-48"
        />
        <input
          type="number"
          value={displayCount}
          onChange={(e) => handleDisplayCountChange(Number(e.target.value))}
          className="w-20 px-2 py-1 border rounded bg-background text-foreground"
          min="1"
          max={trades.length}
        />
        <span className="text-sm text-muted-foreground">
          of {trades.length} trades
        </span>
      </div>

      <div className="space-y-4">
        {sortedTrades.slice(0, displayCount).map(trade => (
          <TradeComponent  // Updated component
            key={trade.ID}
            trade={trade}
            onUpdate={onUpdate}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};