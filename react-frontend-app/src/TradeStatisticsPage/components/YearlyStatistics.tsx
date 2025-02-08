// components/YearlyStatistics.tsx
import React from 'react';

interface YearlyStatisticsProps {
  yearlyStats: {
    winningPercentage: number;
    averageGain: number;
    averageLoss: number;
    winLossRatio: number;
    expectedValuePerTrade: number;
  };
}

export const YearlyStatistics: React.FC<YearlyStatisticsProps> = ({ yearlyStats }) => {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-white text-sm">Winning Percentage</div>
          <div className="text-blue-400 text-xl font-bold">
            {yearlyStats.winningPercentage.toFixed(2)}%
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-white text-sm">Average Gain</div>
          <div className="text-green-400 text-xl font-bold">
            {yearlyStats.averageGain.toFixed(2)}%
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-white text-sm">Average Loss</div>
          <div className="text-red-400 text-xl font-bold">
            {yearlyStats.averageLoss.toFixed(2)}%
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded">
          <div className="text-white text-sm">Win/Loss Ratio</div>
          <div className="text-yellow-400 text-xl font-bold">
            {yearlyStats.winLossRatio.toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded col-span-2">
          <div className="text-white text-sm">Expected Value per Trade</div>
          <div className="text-purple-400 text-xl font-bold">
            {yearlyStats.expectedValuePerTrade.toFixed(2)}%
          </div>
        </div>
      </div>
    </div>
  );
};
