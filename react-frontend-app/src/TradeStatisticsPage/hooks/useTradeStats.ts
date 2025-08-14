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
            // case 'minEarningsQuality':
            //   return trade.Earnings_Quality >= value;
            // case 'minFundamentalsQuality':
            //   return Number(trade.Fundamentals_Quality) >= value;
            case 'maxPriceTightness':
              return trade.Price_Tightness_1_Week_Before <= value;
            case 'maxNrBases':
              return trade.Nr_Bases <= value;
            case 'pctOff52WHigh':
              return trade.Pct_Off_52W_High <= value;
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
    
    // For compounding returns, use the expected growth rate formula
    const winRate = selectedTrades.length ? gains.length / selectedTrades.length : 0;
    const lossRate = selectedTrades.length ? losses.length / selectedTrades.length : 0;
    
    // Calculate expected growth rate (log mean)
    let expectedGrowthRate = 0;
    
    if (selectedTrades.length) {
      const winComponent = winRate * Math.log(1 + avgGain/100);
      const lossComponent = lossRate * Math.log(1 + avgLoss/100);
      expectedGrowthRate = winComponent + lossComponent;
    }
    
    // Expected growth per trade (with compounding effect)
    const expectedGrowthPerTrade = (Math.exp(expectedGrowthRate) - 1) * 100;
    
    // Position sizing calculations
    const positionSize125 = 0.125; // 12.5% position sizing
    const positionSize25 = 0.25;   // 25% position sizing
    
    // Calculate expected returns with different position sizing
    const expectedReturnOn10Trades_125 = (Math.exp(expectedGrowthRate * positionSize125 * 10) - 1) * 100;
    const expectedReturnOn50Trades_125 = (Math.exp(expectedGrowthRate * positionSize125 * 50) - 1) * 100;
    const expectedReturnOn10Trades_25 = (Math.exp(expectedGrowthRate * positionSize25 * 10) - 1) * 100;
    const expectedReturnOn50Trades_25 = (Math.exp(expectedGrowthRate * positionSize25 * 50) - 1) * 100;
    
    // Calculate average of largest gains/losses from each month (like in summary table)
    const months = Array.from({ length: 12 }, (_, i) => {
      return format(addMonths(new Date(), -i), 'MMM yy');
    }).reverse();

    const selectedMonthsData = months
      .filter(month => selectedMonths.has(month))
      .map(month => {
        const monthTrades = filteredTrades.filter(trade => 
          format(parseISO(trade.Exit_Date), 'MMM yy') === month
        );

        const gains = monthTrades.filter(t => t.Exit_Price > t.Entry_Price);
        const losses = monthTrades.filter(t => t.Exit_Price < t.Entry_Price);

        const largestGain = gains.length > 0 ? 
          Math.max(...gains.map(t => (t.Exit_Price - t.Entry_Price) / t.Entry_Price * 100)) : 0;
        const largestLoss = losses.length > 0 ? 
          Math.min(...losses.map(t => (t.Exit_Price - t.Entry_Price) / t.Entry_Price * 100)) : 0;

        return { largestGain, largestLoss };
      });

    const monthsWithGains = selectedMonthsData.filter(month => month.largestGain > 0);
    const monthsWithLosses = selectedMonthsData.filter(month => month.largestLoss < 0);

    const avgLargestGain = monthsWithGains.length > 0 
      ? monthsWithGains.reduce((sum, month) => sum + month.largestGain, 0) / monthsWithGains.length
      : 0;

    const avgLargestLoss = monthsWithLosses.length > 0 
      ? monthsWithLosses.reduce((sum, month) => sum + month.largestLoss, 0) / monthsWithLosses.length
      : 0;

    const avgLargestGainLossRatio = avgLargestLoss !== 0 ? Math.abs(avgLargestGain / avgLargestLoss) : 0;

    // Calculate average days held for gains and losses (like in summary table)
    const totalWinningTrades = selectedTrades.filter(t => t.Exit_Price > t.Entry_Price).length;
    const totalLosingTrades = selectedTrades.filter(t => t.Exit_Price <= t.Entry_Price).length;

    const avgDaysGains = totalWinningTrades > 0
      ? selectedMonthsData.reduce((sum, monthData, index) => {
          const month = months.filter(m => selectedMonths.has(m))[index];
          const monthTrades = filteredTrades.filter(trade => 
            format(parseISO(trade.Exit_Date), 'MMM yy') === month
          );
          const monthGains = monthTrades.filter(t => t.Exit_Price > t.Entry_Price);
          const monthAvgDaysGains = monthGains.length ? 
            monthGains.reduce((acc, t) => acc + differenceInDays(parseISO(t.Exit_Date), parseISO(t.Entry_Date)), 0) / monthGains.length : 0;
          return sum + (monthAvgDaysGains * monthGains.length);
        }, 0) / totalWinningTrades
      : 0;

    const avgDaysLoss = totalLosingTrades > 0
      ? selectedMonthsData.reduce((sum, monthData, index) => {
          const month = months.filter(m => selectedMonths.has(m))[index];
          const monthTrades = filteredTrades.filter(trade => 
            format(parseISO(trade.Exit_Date), 'MMM yy') === month
          );
          const monthLosses = monthTrades.filter(t => t.Exit_Price <= t.Entry_Price);
          const monthAvgDaysLoss = monthLosses.length ? 
            monthLosses.reduce((acc, t) => acc + differenceInDays(parseISO(t.Exit_Date), parseISO(t.Entry_Date)), 0) / monthLosses.length : 0;
          return sum + (monthAvgDaysLoss * monthLosses.length);
        }, 0) / totalLosingTrades
      : 0;

    const avgDaysRatio = avgDaysLoss !== 0 ? avgDaysGains / Math.abs(avgDaysLoss) : 0;
  
    return {
      winningPercentage: selectedTrades.length ? winRate * 100 : 0,
      averageGain: avgGain,
      averageLoss: avgLoss,
      winLossRatio: avgLoss !== 0 ? Math.abs(avgGain / avgLoss) : 0,
      expectedValuePerTrade: expectedGrowthPerTrade,
      expectedReturnOn10Trades_125: expectedReturnOn10Trades_125,
      expectedReturnOn50Trades_125: expectedReturnOn50Trades_125,
      expectedReturnOn10Trades_25: expectedReturnOn10Trades_25,
      expectedReturnOn50Trades_25: expectedReturnOn50Trades_25,
      avgLargestGain,
      avgLargestLoss,
      avgLargestGainLossRatio,
      avgDaysGains,
      avgDaysLoss,
      avgDaysRatio

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

  // Now also returning filteredTrades and selectedMonths for the distribution component
  return { 
    monthlyStats, 
    yearlyStats, 
    loading, 
    toggleMonth, 
    filteredTrades,
    selectedMonths 
  };
};