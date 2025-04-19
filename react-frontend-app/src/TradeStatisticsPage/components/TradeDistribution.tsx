import React, { useState, useMemo } from 'react';
import { Trade } from '@/TradeHistoryPage/types/Trade';
import { Slider } from '@/components/ui/slider';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';

interface TradeDistributionProps {
  filteredTrades: Trade[];
  selectedMonths: Set<string>;
}

export const TradeDistribution: React.FC<TradeDistributionProps> = ({ 
  filteredTrades, 
  selectedMonths 
}) => {
  // Range sliders for distribution limits (in percentage)
  const [minRange, setMinRange] = useState(-30);
  const [maxRange, setMaxRange] = useState(90);
  
  // Constants for distribution configuration
  const INTERVAL_SIZE = 2; // 2% intervals
  const MAX_ALLOWED_RANGE = 300;
  const MIN_ALLOWED_RANGE = -100;
  
  interface Interval {
    range: string;
    label: string;
    count: number;
    percentage: number;
    start: number;
    end: number;
  }

  const distributionData = useMemo(() => {
    // Filter trades based on selected months
    const tradesInSelectedMonths = filteredTrades.filter(trade => {
      if (!trade.Exit_Date || trade.Status !== 'Exited' || trade.Exit_Price === null) return false;
      const month = format(parseISO(trade.Exit_Date), 'MMM yy');
      return selectedMonths.has(month);
    });
    
    // Calculate returns for each trade
    const returns = tradesInSelectedMonths.map(trade => {
      if (!trade.Exit_Price || !trade.Entry_Price) return 0;
      return ((trade.Exit_Price - trade.Entry_Price) / trade.Entry_Price) * 100;
    });
    
    // Create intervals from min to max range
    const intervals: Interval[] = [];
    
    // Calculate number of intervals
    const numIntervals = Math.ceil((maxRange - minRange) / INTERVAL_SIZE);
    
    // Initialize intervals
    for (let i = 0; i < numIntervals; i++) {
      const start = minRange + (i * INTERVAL_SIZE);
      const end = start + INTERVAL_SIZE;
      intervals.push({
        range: `${start}-${end}`,
        label: `${start}-${end}`,
        count: 0,
        percentage: 0,
        start,
        end
      });
    }
    
    // Count trades in each interval
    returns.forEach(returnValue => {
      if (returnValue < minRange || returnValue >= maxRange) return;
      
      // Find the correct interval
      const intervalIndex = Math.floor((returnValue - minRange) / INTERVAL_SIZE);
      if (intervalIndex >= 0 && intervalIndex < intervals.length) {
        intervals[intervalIndex].count++;
      }
    });
    
    // Calculate percentages
    if (returns.length > 0) {
      intervals.forEach(interval => {
        interval.percentage = (interval.count / returns.length) * 100;
      });
    }
    
    return {
      intervals,
      totalTrades: returns.length,
      maxCount: Math.max(...intervals.map(interval => interval.count), 1)
    };
  }, [filteredTrades, selectedMonths, minRange, maxRange]);
  
  // Custom tooltip for the bar chart
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: {
        range: string;
        count: number;
        percentage: number;
      };
    }>;
    label?: string;
  }
  
  const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded p-2 shadow-md">
          <p className="font-medium">{`${data.range}%`}</p>
          <p className="text-sm">{`${data.count} trades`}</p>
          <p className="text-sm">{`${data.percentage.toFixed(1)}% of total`}</p>
        </div>
      );
    }
    return null;
  };

  // Find the indices for the -2-0 and 0-2 ranges
  const zeroAreaIndices = useMemo(() => {
    const startIndex = distributionData.intervals.findIndex(
      interval => interval.start === -2 || (interval.start < -2 && interval.end > -2)
    );
    const endIndex = distributionData.intervals.findIndex(
      interval => interval.end > 2 && interval.start <= 2
    );
    return { startIndex, endIndex };
  }, [distributionData.intervals]);

  return (
    <Card className="bg-black text-white">
      <CardHeader>
        <CardTitle>Trade Return Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Range controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Minimum Range: {minRange}%</span>
                <span className="text-sm text-muted-foreground">Min: {MIN_ALLOWED_RANGE}%</span>
              </div>
              <Slider
                value={[minRange]}
                min={MIN_ALLOWED_RANGE}
                max={maxRange - INTERVAL_SIZE} // Don't allow min to overlap max
                step={INTERVAL_SIZE}
                onValueChange={(values) => setMinRange(values[0])}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Maximum Range: {maxRange}%</span>
                <span className="text-sm text-muted-foreground">Max: {MAX_ALLOWED_RANGE}%</span>
              </div>
              <Slider
                value={[maxRange]}
                min={minRange + INTERVAL_SIZE} // Don't allow max to overlap min
                max={MAX_ALLOWED_RANGE}
                step={INTERVAL_SIZE}
                onValueChange={(values) => setMaxRange(values[0])}
              />
            </div>
          </div>
          
          {/* Distribution visualization using Recharts */}
          <div className="border rounded-md p-4">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm">Total Trades in Range: {distributionData.totalTrades}</span>
              <span className="text-sm text-muted-foreground">Max Count: {distributionData.maxCount}</span>
            </div>
            
            {/* Recharts Bar Chart */}
            <div className="h-64 w-full">
              {distributionData.totalTrades > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={distributionData.intervals}
                    margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
                  >
                    <XAxis 
                      dataKey="label" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      tick={{ fontSize: 10 }}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    
                    {/* Reference area for -2 to 0 and 0 to 2 range */}
                    {zeroAreaIndices.startIndex !== -1 && zeroAreaIndices.endIndex !== -1 && (
                      <ReferenceArea 
                        x1={distributionData.intervals[zeroAreaIndices.startIndex].label} 
                        x2={distributionData.intervals[zeroAreaIndices.endIndex - 1].label}
                        fill="#0066FF" 
                        fillOpacity={0.2} 
                      />
                    )}
                    
                    <Bar 
                      dataKey="count" 
                      fill="#8884d8" 
                      minPointSize={2}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  No trades in the selected range
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};