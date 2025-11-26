import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateAlertData } from '../types';

interface AlertFormProps {
  onSubmit: (data: CreateAlertData) => Promise<void>;
  isLoading?: boolean;
}

export const AlertForm: React.FC<AlertFormProps> = ({ onSubmit, isLoading }) => {
  const [ticker, setTicker] = useState('');
  const [alertPrice, setAlertPrice] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker.trim() || !alertPrice.trim()) {
      return;
    }

    const price = parseFloat(alertPrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price greater than 0');
      return;
    }

    try {
      await onSubmit({
        ticker: ticker.trim().toUpperCase(),
        alert_price: price,
      });
      setTicker('');
      setAlertPrice('');
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Alert</CardTitle>
        <CardDescription>Set a price alert for any ticker</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker Symbol</Label>
            <Input
              id="ticker"
              type="text"
              placeholder="e.g., AAPL"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              maxLength={10}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alertPrice">Alert Price ($)</Label>
            <Input
              id="alertPrice"
              type="number"
              step="0.01"
              placeholder="e.g., 150.00"
              value={alertPrice}
              onChange={(e) => setAlertPrice(e.target.value)}
              min="0.01"
              required
            />
          </div>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? 'Creating...' : 'Create Alert'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

