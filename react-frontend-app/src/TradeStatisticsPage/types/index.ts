// types/index.ts
import { Trade } from '@/TradeHistoryPage/types/Trade';

export interface MonthlyStats {
  tradingMonth: string;
  averageGain: number;
  averageLoss: number;
  winningPercentage: number;
  totalTrades: number;
  largestGain: number;
  largestLoss: number;
  avgDaysGains: number;
  avgDaysLoss: number;
  isInTrailingYear: boolean;
  useInYearly: boolean;
}

export interface YearlyStats {
  winningPercentage: number;
  averageGain: number;
  averageLoss: number;
  winLossRatio: number;
  expectedValuePerTrade: number;
}

export interface ExtendedFilters extends Partial<Trade> {
  minEarningsQuality?: number;
  minFundamentalsQuality?: number;
  maxPriceTightness?: number;
  minNrBases?: number;
}