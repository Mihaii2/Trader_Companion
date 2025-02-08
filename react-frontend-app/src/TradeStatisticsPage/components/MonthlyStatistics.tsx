// components/MonthlyStatistics.tsx
import React from 'react';
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
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12 text-center">Use In Yearly</TableHead>
            <TableHead className="text-center">Trading Month</TableHead>
            <TableHead className="text-center">Average GAIN</TableHead>
            <TableHead className="text-center">Average LOSS</TableHead>
            <TableHead className="text-center">WINNING %</TableHead>
            <TableHead className="text-center">TOTAL TRADES</TableHead>
            <TableHead className="text-center">LG GAIN</TableHead>
            <TableHead className="text-center">LG LOSS</TableHead>
            <TableHead className="text-center">Avg Days Gains</TableHead>
            <TableHead className="text-center">Avg Days Loss</TableHead>
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
        </TableBody>
      </Table>
    </div>
  );
};