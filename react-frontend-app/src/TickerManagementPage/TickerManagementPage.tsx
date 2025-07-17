import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Ticker {
  symbol: string;
}

export const TickerManagementPage: React.FC = () => {
  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [newTicker, setNewTicker] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch tickers on component mount
  useEffect(() => {
    fetchTickers();
  }, []);

  const fetchTickers = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:5001/tickers');
      setTickers(response.data.tickers.map((symbol: string) => ({ symbol })));
      setError('');
    } catch (err) {
      setError('Failed to fetch tickers. Please try again.');
      console.error('Error fetching tickers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicker.trim()) {
      setError('Please enter a valid ticker symbol');
      return;
    }

    setIsLoading(true);
    try {
      await axios.post('http://localhost:5001/tickers', { symbol: newTicker.toUpperCase() });
      await fetchTickers();
      setNewTicker('');
      setError('');
    } catch (err) {
      setError('Failed to add ticker. It may already exist or be invalid.');
      console.error('Error fetching tickers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTicker = async (symbol: string) => {
    setIsLoading(true);
    try {
      await axios.delete(`http://localhost:5001/tickers/${symbol}`);
      await fetchTickers();
      setError('');
    } catch (err) {
      setError(`Failed to remove ticker ${symbol}.`);
      console.error(`Error removing ticker ${symbol}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-4">
      <h1 className="text-2xl font-bold text-foreground">Manage Stock Tickers</h1>
      
      {/* Add Ticker Form */}
      <Card className="bg-background border-muted">
        <CardContent className="pt-6">
          <form onSubmit={handleAddTicker} className="space-y-4">
            <div className="flex gap-4">
              <Input
                type="text"
                value={newTicker}
                onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                placeholder="Enter ticker symbol (e.g., AAPL)"
                className="bg-background text-foreground border-input focus:ring-ring"
              />
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted"
              >
                {isLoading ? 'Adding...' : 'Add Ticker'}
              </Button>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </form>
        </CardContent>
      </Card>

      {/* Ticker List */}
      <Card className="bg-background border-muted">
        <CardHeader>
          <CardTitle className="text-foreground">Monitored Tickers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading tickers...</p>}
          {!isLoading && tickers.length === 0 && (
            <p className="text-muted-foreground">No tickers being monitored.</p>
          )}
          {!isLoading && tickers.length > 0 && (
            <ul className="space-y-2">
              {tickers.map((ticker) => (
                <li
                  key={ticker.symbol}
                  className="flex justify-between items-center p-2 hover:bg-muted/50 rounded"
                >
                  <span className="font-medium text-foreground">{ticker.symbol}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveTicker(ticker.symbol)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};