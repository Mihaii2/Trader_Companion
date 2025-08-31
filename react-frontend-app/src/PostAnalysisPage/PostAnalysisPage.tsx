import React, { useEffect, useState, useCallback } from 'react';
import { APIError } from './types/types';
import TradeGrader from './components/TradeGrader';
import MetricManager from './components/MetricManager';
import MetricAnalytics from './components/MetricAnalytics';
import { gradeService, metricService, tradeService } from './services/postAnalysis';
import ErrorDisplay from './components/ErrorDisplay';
import LoadingSpinner from './components/LoadingSpinner';

const useAsync = <T,>(asyncFunction: () => Promise<T>, dependencies: React.DependencyList) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<APIError | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await asyncFunction();
      setData(result);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'An unknown error occurred',
        details: err
      });
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
};

// // Sample trades data
// const sampleTrades: Trade[] = [
//   {
//     ID: 1,
//     Ticker: "AAPL",
//     Status: "Closed",
//     Entry_Date: "2024-01-15",
//     Exit_Date: "2024-02-15",
//     Entry_Price: 150.00,
//     Exit_Price: 165.00,
//     Return: 10.0,
//     Pattern: "Cup with Handle",
//     Price_Tightness_1_Week_Before: 2.5,
//     Exit_Reason: "Target reached",
//     Market_Condition: "Uptrend",
//     Category: "Growth",
//     Nr_Bases: 2,
//     Has_Earnings_Acceleration: true,
//     IPO_Last_10_Years: false,
//     Is_BioTech: false,
//     Under_30M_Shares: false,
//     Case: JSON.stringify({}),
//     If_You_Could_Only_Make_10_Trades: true,
//     Pct_Off_52W_High: 5.2,
//     C: true,
//     A: true,
//     N: true,
//     S: true,
//     L: true,
//     I: true,
//     M: true
//   },
//   {
//     ID: 2,
//     Ticker: "NVDA",
//     Status: "Closed",
//     Entry_Date: "2024-02-01",
//     Exit_Date: "2024-03-01",
//     Entry_Price: 220.00,
//     Exit_Price: 198.00,
//     Return: -10.0,
//     Pattern: "Flat Base",
//     Price_Tightness_1_Week_Before: 1.8,
//     Exit_Reason: "Stop loss",
//     Market_Condition: "Sideways",
//     Category: "Growth",
//     Nr_Bases: 1,
//     Has_Earnings_Acceleration: false,
//     IPO_Last_10_Years: false,
//     Is_BioTech: false,
//     Under_30M_Shares: false,
//     Case: JSON.stringify({}),
//     If_You_Could_Only_Make_10_Trades: false,
//     Pct_Off_52W_High: 12.1,
//     C: false,
//     A: true,
//     N: false,
//     S: true,
//     L: false,
//     I: true,
//     M: false
//   }
// ];

const PostAnalysisPage: React.FC = () => {
  // Data fetching
  const { 
    data: trades, 
    loading: tradesLoading, 
    error: tradesError,
    refetch: refetchTrades 
  } = useAsync(() => tradeService.getTrades(), []);

  const { 
    data: metrics, 
    loading: metricsLoading, 
    error: metricsError,
    refetch: refetchMetrics 
  } = useAsync(() => metricService.getMetrics(), []);

  const { 
    data: tradeGrades, 
    loading: gradesLoading, 
    error: gradesError,
    refetch: refetchGrades 
  } = useAsync(() => gradeService.getGrades(), []);

  // Loading states
  const isLoading = tradesLoading || metricsLoading || gradesLoading;
  const hasError = tradesError || metricsError || gradesError;

  // Handle errors
  if (hasError) {
    return (
  <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
    <h1 className="text-4xl font-bold text-foreground mb-2">
              Trade Analysis Dashboard
            </h1>
          </header>

          <div className="space-y-4">
            {tradesError && (
              <ErrorDisplay 
                error={tradesError} 
                onRetry={refetchTrades}
              />
            )}
            {metricsError && (
              <ErrorDisplay 
                error={metricsError} 
                onRetry={refetchMetrics}
              />
            )}
            {gradesError && (
              <ErrorDisplay 
                error={gradesError} 
                onRetry={refetchGrades}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
      <h1 className="text-4xl font-bold text-foreground mb-2">
            Trade Analysis Dashboard
          </h1>
      <p className="text-lg text-muted-foreground">
            Analyze your trading patterns and improve your performance
          </p>
          
          {isLoading && (
            <div className="mt-4">
              <LoadingSpinner message="Loading dashboard data..." />
            </div>
          )}
        </header>

        {!isLoading && (
          <>
            <MetricAnalytics
              trades={trades || []}
              metrics={metrics || []}
              tradeGrades={tradeGrades || []}
            />

            <TradeGrader
              trades={trades || []}
              metrics={metrics || []}
              tradeGrades={tradeGrades || []}
            />

            <MetricManager 
              metrics={metrics || []}
              onRefetch={refetchMetrics}
            />
          </>
        )}
      </div>
    </div>
  );
};


export default PostAnalysisPage;