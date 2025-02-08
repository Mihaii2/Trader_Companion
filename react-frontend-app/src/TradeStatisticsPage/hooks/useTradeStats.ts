// hooks/useTradeStats.ts
import { useState, useEffect, useMemo } from 'react';
import { Trade, MonthlyStats, YearlyStats, ExtendedFilters } from '../types';
import { tradeAPI } from '../services/tradeAPI';
import { addMonths, format, parseISO, isAfter } from 'date-fns';

export const useTradeStats = (filters: ExtendedFilters) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await tradeAPI.getTrades();
        setTrades(response.data);
      } catch (error) {
        console.error('Error fetching trades:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTrades();
  }, []);

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      return Object.entries(filters).every(([key, value]) => {
        if (value === undefined) return true;
  
        // Handle minimum/maximum value filters
        switch (key) {
          case 'minEarningsQuality':
            return trade.Earnings_Quality >= value;
          case 'minFundamentalsQuality':
            return Number(trade.Fundamentals_Quality) >= value;
          case 'maxPriceTightness':
            return trade.Price_Tightness_1_Week_Before <= value;
          case 'minNrBases':
            return trade.Nr_Bases >= value;
          default:
            // For boolean fields, explicitly compare as boolean
            if (typeof trade[key as keyof Trade] === 'boolean') {
              return trade[key as keyof Trade] === (value === 'true');
            }
            // For other fields, use regular comparison
            return trade[key as keyof Trade] === value;
        }
      });
    });
  }, [trades, filters]);
  

  const monthlyStats = useMemo((): MonthlyStats[] => {
    const lastYear = addMonths(new Date(), -12);
    const months = Array.from({ length: 12 }, (_, i) => {
      return format(addMonths(new Date(), -i), 'MMM yy');
    }).reverse();

    return months.map(month => {
      const monthTrades = filteredTrades.filter(trade => 
        format(parseISO(trade.Entry_Date), 'MMM yy') === month
      );

      const gains = monthTrades.filter(t => (t.Exit_Price || 0) > t.Entry_Price);
      const losses = monthTrades.filter(t => (t.Exit_Price || 0) < t.Entry_Price);

      const avgGain = gains.length ? 
        gains.reduce((acc, t) => acc + ((t.Exit_Price || 0) - t.Entry_Price) / t.Entry_Price * 100, 0) / gains.length : 0;

      const avgLoss = losses.length ? 
        losses.reduce((acc, t) => acc + ((t.Exit_Price || 0) - t.Entry_Price) / t.Entry_Price * 100, 0) / losses.length : 0;

      const monthDate = parseISO(`01 ${month}`);
      const isInTrailingYear = isAfter(monthDate, lastYear);

      return {
        tradingMonth: month,
        averageGain: avgGain,
        averageLoss: avgLoss,
        winningPercentage: monthTrades.length ? (gains.length / monthTrades.length) * 100 : 0,
        totalTrades: monthTrades.length,
        largestGain: Math.max(...gains.map(t => ((t.Exit_Price || 0) - t.Entry_Price) / t.Entry_Price * 100), 0),
        largestLoss: Math.min(...losses.map(t => ((t.Exit_Price || 0) - t.Entry_Price) / t.Entry_Price * 100), 0),
        avgDaysGains: gains.length ? gains.reduce((acc, t) => acc + (t.Days_In_Pattern_Before_Entry || 0), 0) / gains.length : 0,
        avgDaysLoss: losses.length ? losses.reduce((acc, t) => acc + (t.Days_In_Pattern_Before_Entry || 0), 0) / losses.length : 0,
        isInTrailingYear
      };
    });
  }, [filteredTrades]);

  const yearlyStats = useMemo((): YearlyStats => {
    const yearlyTrades = filteredTrades.filter(trade => {
      const tradeDate = parseISO(trade.Entry_Date);
      return isAfter(tradeDate, addMonths(new Date(), -12));
    });

    const gains = yearlyTrades.filter(t => (t.Exit_Price || 0) > t.Entry_Price);
    const losses = yearlyTrades.filter(t => (t.Exit_Price || 0) < t.Entry_Price);

    const avgGain = gains.length ? 
      gains.reduce((acc, t) => acc + ((t.Exit_Price || 0) - t.Entry_Price) / t.Entry_Price * 100, 0) / gains.length : 0;

    const avgLoss = losses.length ? 
      losses.reduce((acc, t) => acc + ((t.Exit_Price || 0) - t.Entry_Price) / t.Entry_Price * 100, 0) / losses.length : 0;

    return {
      winningPercentage: yearlyTrades.length ? (gains.length / yearlyTrades.length) * 100 : 0,
      averageGain: avgGain,
      averageLoss: avgLoss,
      winLossRatio: avgLoss !== 0 ? Math.abs(avgGain / avgLoss) : 0,
      expectedValuePerTrade: (avgGain * (gains.length / yearlyTrades.length)) + 
        (avgLoss * (losses.length / yearlyTrades.length))
    };
  }, [filteredTrades]);

  return { monthlyStats, yearlyStats, loading };
};