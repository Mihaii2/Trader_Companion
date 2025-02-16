// TradeHistoryPage.tsx
import React, { useEffect, useState } from 'react';
import { Trade } from './types/Trade';
import { tradeAPI } from './services/tradeAPI';
import { TradesTable } from './components/TradesTable';
import { AddTradeComponent } from './components/AddTradeComponent';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";

export const TradeHistoryPage: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTrades();
  }, []);

  const loadTrades = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await tradeAPI.getTrades();
      setTrades(response.data);
    } catch (err) {
      setError('Failed to load trades. Please refresh the page.');
      console.error('Error loading trades:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTrade = async (newTrade: Trade): Promise<void> => {
    const response = await tradeAPI.addTrade(newTrade);
    // Update local state optimistically
    setTrades(prevTrades => [...prevTrades, response.data]);
  };

  const handleUpdateTrade = async (updatedTrade: Trade) => {
    try {
      const response = await tradeAPI.updateTrade(updatedTrade);
      // Update local state optimistically
      setTrades(prevTrades =>
        prevTrades.map(trade =>
          trade.ID === updatedTrade.ID ? response.data : trade
        )
      );
    } catch (err) {
      console.error('Error updating trade:', err);
      // Reload trades to ensure consistency
      loadTrades();
      throw err;
    }
  };

  const handleDeleteTrade = async (id: number) => {
    try {
      await tradeAPI.deleteTrade(id);
      // Update local state optimistically
      setTrades(prevTrades => prevTrades.filter(trade => trade.ID !== id));
    } catch (err) {
      console.error('Error deleting trade:', err);
      // Reload trades to ensure consistency
      loadTrades();
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-6 space-y-6">
      <div className="max-w-[95vw] mx-auto">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <div className="rounded-lg shadow bg-background">
            <TradesTable
              trades={trades}
              onUpdate={handleUpdateTrade}
              onDelete={handleDeleteTrade}
            />
          </div>
          
          <div className="bg-white rounded-lg shadow">
            <AddTradeComponent onAdd={handleAddTrade} />
          </div>
        </div>
      </div>
    </div>
  );
};