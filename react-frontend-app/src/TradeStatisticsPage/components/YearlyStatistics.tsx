// components/YearlyStatistics.tsx
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Percent, Scale, DollarSign } from "lucide-react";

interface YearlyStatisticsProps {
  yearlyStats: {
    winningPercentage: number;
    averageGain: number;
    averageLoss: number;
    winLossRatio: number;
    expectedValuePerTrade: number;
  };
}

const StatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  valueColor 
}: { 
  label: string; 
  value: string; 
  icon: React.ElementType; 
  valueColor: string;
}) => (
  <Card className="bg-card">
    <CardContent className="py-1 px-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}:</span>
        <span className={`font-semibold ${valueColor}`}>{value}</span>
      </div>
      <Icon className={`w-4 h-4 ${valueColor}`} />
    </CardContent>
  </Card>
);

export const YearlyStatistics: React.FC<YearlyStatisticsProps> = ({ yearlyStats }) => {
  const stats = [
    {
      label: "Win Rate",
      value: `${yearlyStats.winningPercentage.toFixed(2)}%`,
      icon: Percent,
      valueColor: "text-blue-500"
    },
    {
      label: "Avg Gain",
      value: `${yearlyStats.averageGain.toFixed(2)}%`,
      icon: TrendingUp,
      valueColor: "text-green-500"
    },
    {
      label: "Avg Loss",
      value: `${yearlyStats.averageLoss.toFixed(2)}%`,
      icon: TrendingDown,
      valueColor: "text-red-500"
    },
    {
      label: "Win / Loss",
      value: yearlyStats.winLossRatio.toFixed(2),
      icon: Scale,
      valueColor: "text-yellow-500"
    },
    {
      label: "Expected Value Per Trade",
      value: `${yearlyStats.expectedValuePerTrade.toFixed(2)}%`,
      icon: DollarSign,
      valueColor: "text-purple-500"
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-1">
      {stats.map((stat, index) => (
        <div key={stat.label} className={index === 4 ? "col-span-2" : ""}>
          <StatCard {...stat} />
        </div>
      ))}
    </div>
  );
};

export default YearlyStatistics;