// hooks/useTradeStats.ts
import { useState, useEffect, useMemo } from 'react';
import { MonthlyStats, YearlyStats, ExtendedFilters } from '../types';
import { Trade } from '@/TradeHistoryPage/types/Trade';
import { tradeAPI } from '../services/tradeAPI';
import { addMonths, format, parseISO, isAfter, differenceInDays } from 'date-fns';

// Type guard to check if a trade is exited with valid exit price and exit date
const isExitedTrade = (trade: Trade): trade is Trade & { Exit_Price: number, Exit_Date: string } => {
  return trade.Status === 'Exited' && trade.Exit_Price !== null && trade.Exit_Date !== null;
};

export const useTradeStats = (filters: ExtendedFilters) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(() => {
    const initialMonths = new Set<string>();
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const month = format(addMonths(now, -i), 'MMM yy');
      initialMonths.add(month);
    }
    return initialMonths;
  });

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
    return trades
      .filter(isExitedTrade)
      .filter(trade => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined) return true;
    
          switch (key) {
            case 'minEarningsQuality':
              return trade.Earnings_Quality >= value;
            case 'minFundamentalsQuality':
              return Number(trade.Fundamentals_Quality) >= value;
            case 'maxPriceTightness':
              return trade.Price_Tightness_1_Week_Before <= value;
            case 'maxNrBases':
              return trade.Nr_Bases <= value;
            default:
              if (typeof trade[key as keyof Trade] === 'boolean') {
                return trade[key as keyof Trade] === (value === 'true');
              }
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
        format(parseISO(trade.Exit_Date), 'MMM yy') === month
      );

      const gains = monthTrades.filter(t => t.Exit_Price > t.Entry_Price);
      const losses = monthTrades.filter(t => t.Exit_Price < t.Entry_Price);

      const totalGain = gains.reduce((acc, t) => acc + (t.Exit_Price - t.Entry_Price) / t.Entry_Price * 100, 0);
      const totalLoss = losses.reduce((acc, t) => acc + (t.Exit_Price - t.Entry_Price) / t.Entry_Price * 100, 0);

      const avgGain = gains.length ? totalGain / gains.length : 0;
      const avgLoss = losses.length ? totalLoss / losses.length : 0;

      const monthDate = parseISO(`01 ${month}`);
      const isInTrailingYear = isAfter(monthDate, lastYear);

      // Calculate days held using the difference between Exit_Date and Entry_Date
      const avgDaysGains = gains.length ? 
        gains.reduce((acc, t) => acc + differenceInDays(parseISO(t.Exit_Date), parseISO(t.Entry_Date)), 0) / gains.length : 0;

      const avgDaysLoss = losses.length ? 
        losses.reduce((acc, t) => acc + differenceInDays(parseISO(t.Exit_Date), parseISO(t.Entry_Date)), 0) / losses.length : 0;

      return {
        tradingMonth: month,
        averageGain: avgGain,
        averageLoss: avgLoss,
        winningPercentage: monthTrades.length ? (gains.length / monthTrades.length) * 100 : 0,
        totalTrades: monthTrades.length,
        largestGain: Math.max(...gains.map(t => (t.Exit_Price - t.Entry_Price) / t.Entry_Price * 100), 0),
        largestLoss: Math.min(...losses.map(t => (t.Exit_Price - t.Entry_Price) / t.Entry_Price * 100), 0),
        avgDaysGains,
        avgDaysLoss,
        isInTrailingYear,
        useInYearly: selectedMonths.has(month)
      };
    });
  }, [filteredTrades, selectedMonths]);

  const yearlyStats = useMemo((): YearlyStats => {
    const selectedTrades = filteredTrades.filter(trade => {
      const month = format(parseISO(trade.Exit_Date), 'MMM yy');
      return selectedMonths.has(month);
    });

    const gains = selectedTrades.filter(t => t.Exit_Price > t.Entry_Price);
    const losses = selectedTrades.filter(t => t.Exit_Price < t.Entry_Price);

    const totalGain = gains.reduce((acc, t) => acc + (t.Exit_Price - t.Entry_Price) / t.Entry_Price * 100, 0);
    const totalLoss = losses.reduce((acc, t) => acc + (t.Exit_Price - t.Entry_Price) / t.Entry_Price * 100, 0);

    const avgGain = gains.length ? totalGain / gains.length : 0;
    const avgLoss = losses.length ? totalLoss / losses.length : 0;

    return {
      winningPercentage: selectedTrades.length ? (gains.length / selectedTrades.length) * 100 : 0,
      averageGain: avgGain,
      averageLoss: avgLoss,
      winLossRatio: avgLoss !== 0 ? Math.abs(avgGain / avgLoss) : 0,
      expectedValuePerTrade: selectedTrades.length ? 
        (avgGain * (gains.length / selectedTrades.length)) + 
        (avgLoss * (losses.length / selectedTrades.length)) : 0
    };
  }, [filteredTrades, selectedMonths]);

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  };

  return { monthlyStats, yearlyStats, loading, toggleMonth };
};
