import React, { useState } from 'react';
import { MonthlyStatistics } from './components/MonthlyStatistics';
import { YearlyStatistics } from './components/YearlyStatistics';
import { TradeFilterer } from './components/TradeFilterer';
import { useTradeStats } from './hooks/useTradeStats';
import { RiskPoolStats } from './components/RiskPoolStats';
import { TradeDistribution } from './components/TradeDistribution';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { addMonths, format } from 'date-fns';
import { PostAnalysisFilters } from './components/PostAnalysisFilters';
import type { MetricOptionFilters, ExtendedFilters } from './types';

export const TradingStatsPage: React.FC = () => {
  const [filters, setFilters] = useState<ExtendedFilters>({});
  const [metricFilters, setMetricFilters] = useState<MetricOptionFilters>({});
  const [startDate, setStartDate] = useState<string>(() => {
    const twelveMonthsAgo = addMonths(new Date(), -11);
    return format(twelveMonthsAgo, 'yyyy-MM');
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return format(new Date(), 'yyyy-MM');
  });
  const { monthlyStats, yearlyStats, loading, toggleMonth, filteredTrades, selectedMonths } = useTradeStats(
    filters,
    startDate,
    endDate,
    metricFilters
  );

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
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 my-2">
              <label htmlFor="start-date" className="text-sm font-medium">From:</label>
              <input
                id="start-date"
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label htmlFor="end-date" className="text-sm font-medium">To:</label>
              <input
                id="end-date"
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-40 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>
          <MonthlyStatistics 
            monthlyStats={monthlyStats} 
            onToggleMonth={toggleMonth}
          />
        </CardContent>
      </Card>

  <Card>
        <CardHeader>
          {/* Was "Yearly Statistics" before */}
          <CardTitle>Summary Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <YearlyStatistics yearlyStats={yearlyStats} />
        </CardContent>
      </Card>
      
      <TradeDistribution 
        filteredTrades={filteredTrades} 
        selectedMonths={selectedMonths}
      />

      <Card>
        <CardContent>
          <div className="space-y-6">
            <PostAnalysisFilters selected={metricFilters} onChange={setMetricFilters} />
            <div>
              <div className="text-sm font-medium mb-2">Trade History Filters</div>
              <TradeFilterer filters={filters} onFilterChange={setFilters} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};