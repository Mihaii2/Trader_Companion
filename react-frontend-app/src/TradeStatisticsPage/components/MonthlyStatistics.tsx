import React, { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from '@/components/ui/checkbox';
import { MonthlyStats } from '../types';

interface MonthlyStatisticsProps {
  monthlyStats: MonthlyStats[];
  onToggleMonth: (month: string) => void;
}

export const MonthlyStatistics: React.FC<MonthlyStatisticsProps> = ({ 
  monthlyStats,
  onToggleMonth
}) => {
  const summaryStats = useMemo(() => {
    const filteredStats = monthlyStats.filter(month => month.useInYearly);
    const totalTrades = filteredStats.reduce((sum, month) => sum + month.totalTrades, 0);
    
    const totalWinningTrades = filteredStats.reduce((sum, month) => 
      sum + Math.round((month.winningPercentage / 100) * month.totalTrades), 0);
    
    const totalLosingTrades = totalTrades - totalWinningTrades;
    
    const averageGain = totalWinningTrades
      ? filteredStats.reduce((sum, month) => sum + (month.averageGain * Math.round((month.winningPercentage / 100) * month.totalTrades)), 0) / totalWinningTrades
      : 0;
    
    const averageLoss = totalLosingTrades
      ? filteredStats.reduce((sum, month) => sum + (month.averageLoss * (month.totalTrades - Math.round((month.winningPercentage / 100) * month.totalTrades))), 0) / totalLosingTrades
      : 0;
    
    
    const winningPercentage = filteredStats.reduce((sum, month) => 
      sum + (month.winningPercentage * month.totalTrades), 0) / totalTrades;
    
    const avgDaysGains = totalWinningTrades > 0
      ? filteredStats.reduce((sum, month) => {
          const winningTrades = Math.round((month.winningPercentage / 100) * month.totalTrades);
          return sum + (month.avgDaysGains * winningTrades);
        }, 0) / totalWinningTrades
      : 0;

    
    const avgDaysLoss = totalLosingTrades > 0
      ? filteredStats.reduce((sum, month) => {
          const losingTrades = month.totalTrades - Math.round((month.winningPercentage / 100) * month.totalTrades);
          return sum + (month.avgDaysLoss * losingTrades);
        }, 0) / totalLosingTrades
      : 0;


    
    // Calculate average largest gain and loss - only include months with valid values
    const monthsWithGains = filteredStats.filter(month => 
      month.largestGain !== null && month.largestGain !== undefined && month.largestGain !== 0
    );
    const monthsWithLosses = filteredStats.filter(month => 
      month.largestLoss !== null && month.largestLoss !== undefined && month.largestLoss !== 0
    );
    
    const avgOfLargestGains = monthsWithGains.length > 0 
      ? monthsWithGains.reduce((sum, month) => sum + month.largestGain, 0) / monthsWithGains.length
      : 0;
    
    const avgOfLargestLosses = monthsWithLosses.length > 0 
      ? monthsWithLosses.reduce((sum, month) => sum + month.largestLoss, 0) / monthsWithLosses.length
      : 0;
    
    return {
      averageGain,
      averageLoss,
      winningPercentage,
      totalTrades,
      avgOfLargestGains,
      avgOfLargestLosses,
      avgDaysGains,
      avgDaysLoss
    };
  }, [monthlyStats]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12 text-center">Use In Statistics</TableHead>
            <TableHead className="text-center">Trading Month</TableHead>
            <TableHead className="text-center">Average GAIN</TableHead>
            <TableHead className="text-center">Average LOSS</TableHead>
            <TableHead className="text-center">WINNING %</TableHead>
            <TableHead className="text-center">TOTAL TRADES</TableHead>
            <TableHead className="text-center">LG GAIN</TableHead>
            <TableHead className="text-center">LG LOSS</TableHead>
            <TableHead className="text-center">Avg Days Gains Held</TableHead>
            <TableHead className="text-center">Avg Days Loss Held</TableHead>
            <TableHead className="text-center">Adj. Risk:Reward Ratio</TableHead>
            <TableHead className="text-center">Expected Growth/Trade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {monthlyStats.map((month) => (
            <TableRow 
              key={month.tradingMonth}
              className={month.isInTrailingYear ? 'bg-muted/50' : ''}
            >
              <TableCell className="py-0">
                <Checkbox
                  checked={month.useInYearly}
                  onCheckedChange={() => onToggleMonth(month.tradingMonth)}
                  className="mt-1"
                />
              </TableCell>
              <TableCell className="py-1">{month.tradingMonth}</TableCell>
              <TableCell className="text-center py-1">{month.averageGain.toFixed(2)}%</TableCell>
              <TableCell className="text-center py-1">{month.averageLoss.toFixed(2)}%</TableCell>
              <TableCell className="text-center py-1">{month.winningPercentage.toFixed(2)}%</TableCell>
              <TableCell className="text-center py-1">{month.totalTrades}</TableCell>
              <TableCell className="text-center py-1">{month.largestGain.toFixed(2)}%</TableCell>
              <TableCell className="text-center py-1">{month.largestLoss.toFixed(2)}%</TableCell>
              <TableCell className="text-center py-1">{month.avgDaysGains.toFixed(1)}</TableCell>
              <TableCell className="text-center py-1">{month.avgDaysLoss.toFixed(1)}</TableCell>
              <TableCell className="text-center py-1">
              {(() => {
                const winRate = month.winningPercentage / 100;
                const lossRate = 1 - winRate;

                if (winRate === 0 && month.averageLoss !== 0) {
                  return "0:1";
                }

                if (lossRate === 0 && month.averageGain !== 0) {
                  return "∞:1";
                }

                if (month.totalTrades === 0) {
                  return "N/A";
                }

                // Risk-reward ratio adjusted by win rate
                // Formula: (Win Rate * Avg Gain) / (Loss Rate * |Avg Loss|)
                // The Holy Grail
                const adjustedRatio = (winRate * month.averageGain) / (lossRate * Math.abs(month.averageLoss));
                
                return `${adjustedRatio.toFixed(2)}:1`;
              })()}
            </TableCell>
            <TableCell className="text-center py-1">
              {(() => {
                const winRate = month.winningPercentage / 100;
                const lossRate = 1 - winRate;

                if (month.totalTrades === 0) {
                  return "N/A";
                }

                const logGrowthRate = winRate * Math.log(1 + month.averageGain/100) + 
                                    lossRate * Math.log(1 + month.averageLoss/100);
                const geometricExpectancy = (Math.exp(logGrowthRate) - 1) * 100;
                
                return `${geometricExpectancy.toFixed(2)}%`;
              })()}
            </TableCell>
            </TableRow>
          ))}
          
          {/* Summary Row */}
          <TableRow className="bg-muted">
            <TableCell className="py-1"></TableCell>
            <TableCell className="py-1">Summary</TableCell>
            <TableCell className="text-center py-1">{summaryStats.averageGain.toFixed(2)}%</TableCell>
            <TableCell className="text-center py-1">{summaryStats.averageLoss.toFixed(2)}%</TableCell>
            <TableCell className="text-center py-1">{summaryStats.winningPercentage.toFixed(2)}%</TableCell>
            <TableCell className="text-center py-1">{summaryStats.totalTrades}</TableCell>
            <TableCell className="text-center py-1">{summaryStats.avgOfLargestGains.toFixed(2)}%</TableCell>
            <TableCell className="text-center py-1">{summaryStats.avgOfLargestLosses.toFixed(2)}%</TableCell>
            <TableCell className="text-center py-1">{summaryStats.avgDaysGains.toFixed(1)}</TableCell>
            <TableCell className="text-center py-1">{summaryStats.avgDaysLoss.toFixed(1)}</TableCell>
            <TableCell className="text-center py-1">
              {(() => {
                const winRate = summaryStats.winningPercentage / 100;
                const lossRate = 1 - winRate;

                if (winRate === 0 && summaryStats.averageLoss !== 0) {
                  return "0:1";
                }

                if (lossRate === 0 && summaryStats.averageGain !== 0) {
                  return "∞:1";
                }

                if (summaryStats.totalTrades === 0) {
                  return "N/A";
                }

                const adjustedRatio = (winRate * summaryStats.averageGain) / (lossRate * Math.abs(summaryStats.averageLoss));
                
                return `${adjustedRatio.toFixed(2)}:1`;
              })()}
            </TableCell>
            <TableCell className="text-center py-1">
              {(() => {
                const winRate = summaryStats.winningPercentage / 100;
                const lossRate = 1 - winRate;

                if (summaryStats.totalTrades === 0) {
                  return "N/A";
                }

                const logGrowthRate = winRate * Math.log(1 + summaryStats.averageGain/100) + 
                                    lossRate * Math.log(1 + summaryStats.averageLoss/100);
                const geometricExpectancy = (Math.exp(logGrowthRate) - 1) * 100;
                
                return `${geometricExpectancy.toFixed(2)}%`;
              })()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};