import React, { useState } from 'react';
import { MonthlyStatistics } from './components/MonthlyStatistics';
import { YearlyStatistics } from './components/YearlyStatistics';
import { TradeFilterer } from './components/TradeFilterer';
import { useTradeStats } from './hooks/useTradeStats';
import { Trade } from '@/TradeHistoryPage/types/Trade';
import { RiskPoolStats } from './components/RiskPoolStats';
import { TradeDistribution } from './components/TradeDistribution';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export const TradingStatsPage: React.FC = () => {
  const [filters, setFilters] = useState<Partial<Trade>>({});
  const { monthlyStats, yearlyStats, loading, toggleMonth, filteredTrades, selectedMonths } = useTradeStats(filters);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RiskPoolStats />
      
      <Card>
        <CardContent>
          <MonthlyStatistics 
            monthlyStats={monthlyStats} 
            onToggleMonth={toggleMonth}
          />
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
      {/* New Trade Distribution Component */}
      <TradeDistribution 
        filteredTrades={filteredTrades} 
        selectedMonths={selectedMonths}
      />


      <Card>
        <CardHeader>
          <CardTitle>Yearly Statistics Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <TradeFilterer filters={filters} onFilterChange={setFilters} />
        </CardContent>
      </Card>
    </div>
  );
};