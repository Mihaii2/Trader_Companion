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
    
    const avgDaysGains = filteredStats.reduce((sum, month) => 
      sum + (month.avgDaysGains * month.totalTrades), 0) / totalTrades;
    
    const avgDaysLoss = filteredStats.reduce((sum, month) => 
      sum + (month.avgDaysLoss * month.totalTrades), 0) / totalTrades;
    
    // Find overall largest gain and loss
    const largestGain = Math.max(...filteredStats.map(month => month.largestGain));
    const largestLoss = Math.min(...filteredStats.map(month => month.largestLoss));
    
    return {
      averageGain,
      averageLoss,
      winningPercentage,
      totalTrades,
      largestGain,
      largestLoss,
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
            <TableCell className="text-center py-1">{summaryStats.largestGain.toFixed(2)}%</TableCell>
            <TableCell className="text-center py-1">{summaryStats.largestLoss.toFixed(2)}%</TableCell>
            <TableCell className="text-center py-1">{summaryStats.avgDaysGains.toFixed(1)}</TableCell>
            <TableCell className="text-center py-1">{summaryStats.avgDaysLoss.toFixed(1)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};