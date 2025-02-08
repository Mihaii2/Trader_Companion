// components/MonthlyStatistics.tsx
import React from 'react';

interface MonthlyStatisticsProps {
  monthlyStats: {
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
  }[];
}

export const MonthlyStatistics: React.FC<MonthlyStatisticsProps> = ({ monthlyStats }) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-800 text-white">
            <th className="p-2 text-left">Trading Month</th>
            <th className="p-2 text-right">Average GAIN</th>
            <th className="p-2 text-right">Average LOSS</th>
            <th className="p-2 text-right">WINNING %</th>
            <th className="p-2 text-right">TOTAL TRADES</th>
            <th className="p-2 text-right">LG GAIN</th>
            <th className="p-2 text-right">LG LOSS</th>
            <th className="p-2 text-right">Avg Days Gains</th>
            <th className="p-2 text-right">Avg Days Loss</th>
          </tr>
        </thead>
        <tbody>
          {monthlyStats.map((month) => (
            <tr 
              key={month.tradingMonth}
              className={`border-b ${month.isInTrailingYear ? 'bg-blue-50' : ''}`}
            >
              <td className="p-2">{month.tradingMonth}</td>
              <td className="p-2 text-right">{month.averageGain.toFixed(2)}%</td>
              <td className="p-2 text-right">{month.averageLoss.toFixed(2)}%</td>
              <td className="p-2 text-right">{month.winningPercentage.toFixed(2)}%</td>
              <td className="p-2 text-right">{month.totalTrades}</td>
              <td className="p-2 text-right">{month.largestGain.toFixed(2)}%</td>
              <td className="p-2 text-right">{month.largestLoss.toFixed(2)}%</td>
              <td className="p-2 text-right">{month.avgDaysGains.toFixed(1)}</td>
              <td className="p-2 text-right">{month.avgDaysLoss.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

