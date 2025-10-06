import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

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
      <h1 className="text-2xl font-bold text-foreground">Stock Tickers Monitor</h1>
      
      {/* Automated Management Notice */}
      <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-800 dark:text-blue-200">
          <strong>Automated Ticker Management:</strong> Tickers are now added automatically when you create trades. 
          Inactive tickers without associated trades are automatically removed after 8 hours. Manual management is no longer necessary.
          <br /><br />
          <strong>Performance Note:</strong> Each ticker adds 0.5 seconds to the data fetching cycle due to yfinance rate limiting. 
          With 10 tickers, each updates every 5 seconds. With 20 tickers, each updates every 10 seconds. 
          Consider the number of active tickers based on your desired data refresh speed.
        </AlertDescription>
      </Alert>
      
      {/* Legacy Manual Controls (Optional) */}
      <Card className="bg-background border-muted">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            Manual Controls
          </CardTitle>
        </CardHeader>
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
          <CardTitle className="text-foreground">Currently Monitored Tickers</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tickers are automatically managed based on your trading activity
          </p>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-muted-foreground">Loading tickers...</p>}
          {!isLoading && tickers.length === 0 && (
            <p className="text-muted-foreground">
              No tickers are currently being monitored. They will be added automatically when you place trades.
            </p>
          )}
          {!isLoading && tickers.length > 0 && (
            <ul className="space-y-2">
              {tickers.map((ticker) => (
                <li
                  key={ticker.symbol}
                  className="flex justify-between items-center p-2 hover:bg-muted/50 rounded"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{ticker.symbol}</span>
                    <span className="text-xs text-muted-foreground">
                      Auto-managed • Removed after 8h if inactive
                    </span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveTicker(ticker.symbol)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove Now
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