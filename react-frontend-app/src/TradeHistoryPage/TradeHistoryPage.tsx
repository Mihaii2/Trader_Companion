// TradeHistoryPage.tsx
import React, { useEffect, useState } from 'react';
import { Trade } from './types/Trade';
import { tradeAPI } from './services/tradeAPI';
import { TradesList } from './components/TradeList';
import { AddTradeComponent } from './components/AddTradeComponent';

export const TradeHistoryPage: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);

  useEffect(() => {
    loadTrades();
  }, []);

  const loadTrades = async () => {
    try {
      const response = await tradeAPI.getTrades();
      setTrades(response.data);
    } catch (error) {
      console.error('Error loading trades:', error);
    }
  };

  const handleAddTrade = async (newTrade: Omit<Trade, 'ID'>) => {
    try {
      await tradeAPI.addTrade(newTrade);
      loadTrades();
    } catch (error) {
      console.error('Error adding trade:', error);
    }
  };

  const handleUpdateTrade = async (updatedTrade: Trade) => {
    try {
      await tradeAPI.updateTrade(updatedTrade);
      loadTrades();
    } catch (error) {
      console.error('Error updating trade:', error);
    }
  };

  const handleDeleteTrade = async (id: number) => {
    try {
      await tradeAPI.deleteTrade(id);
      loadTrades();
    } catch (error) {
      console.error('Error deleting trade:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">Trades List</h2>
          <TradesList
            trades={trades}
            onUpdate={handleUpdateTrade}
            onDelete={handleDeleteTrade}
          />
        </div>
        
        <div>
          <AddTradeComponent onAdd={handleAddTrade} />
        </div>
      </div>
    </div>
  );
};