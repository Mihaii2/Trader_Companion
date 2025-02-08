import React, { useState } from 'react';
import { MonthlyStatistics } from './components/MonthlyStatistics';
import { YearlyStatistics } from './components/YearlyStatistics';
import { TradeFilterer } from './components/TradeFilterer';
import { useTradeStats } from './hooks/useTradeStats';
import { Trade } from './types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const TradingStatsPage: React.FC = () => {
  const [filters, setFilters] = useState<Partial<Trade>>({});
  const { monthlyStats, yearlyStats, loading } = useTradeStats(filters);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Trading Statistics</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <TradeFilterer filters={filters} onFilterChange={setFilters} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yearly Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <YearlyStatistics yearlyStats={yearlyStats} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlyStatistics monthlyStats={monthlyStats} />
        </CardContent>
      </Card>
    </div>
  );
};
