import React, { useMemo } from 'react';
import { Trade } from '@/TradeHistoryPage/types/Trade';
import { Metric, TradeGrade } from '../types/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';

const MetricAnalytics: React.FC<{
  trades: Trade[];
  metrics: Metric[];
  tradeGrades: TradeGrade[];
}> = ({ trades, metrics, tradeGrades }) => {
  const chartData = useMemo(() => {
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.Entry_Date).getTime() - new Date(b.Entry_Date).getTime()
    );

    const data: { [key: string]: any[] } = {};

    metrics.forEach(metric => {
      const metricData: any[] = [];
      
      for (let i = 0; i < sortedTrades.length; i++) {
        const windowStart = Math.max(0, i - 19);
        const windowTrades = sortedTrades.slice(windowStart, i + 1);
        
        const dataPoint: any = {
          tradeIndex: i + 1,
          ticker: sortedTrades[i].Ticker,
          date: sortedTrades[i].Entry_Date
        };

        metric.options.forEach(option => {
          const count = windowTrades.reduce((acc, trade) => {
            const grade = tradeGrades.find(
              g => g.tradeId === trade.ID && parseInt(g.metricId) === metric.id
            );
            return acc + (grade?.selectedOptionId === option.id.toString() ? 1 : 0);
          }, 0);
          
          dataPoint[option.name] = count;
        });

        metricData.push(dataPoint);
      }
      
      data[metric.id] = metricData;
    });

    return data;
  }, [trades, metrics, tradeGrades]);

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  if (metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <BarChart3 className="mr-2" />
          Analytics
        </h2>
        <p className="text-gray-600">Create metrics and grade trades to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center">
        <BarChart3 className="mr-2" />
        Analytics Dashboard
      </h2>
      
      <div className="space-y-8">
        {metrics.map(metric => {
          const data = chartData[metric.id];
          if (!data || data.length === 0) return null;

          return (
            <div key={metric.id} className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <TrendingUp className="mr-2 w-5 h-5" />
                {metric.name} Trends (Trailing 20 Trades)
              </h3>
              
              {metric.description && (
                <p className="text-gray-600 mb-4 text-sm">{metric.description}</p>
              )}
              
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="tradeIndex"
                      label={{ value: 'Trade Number', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip 
                      labelFormatter={(value) => `Trade #${value}`}
                      formatter={(value: any, name: string, props: any) => [
                        `${value} trades`,
                        name
                      ]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                    />
                    <Legend />
                    {metric.options.map((option, index) => (
                      <Line
                        key={option.id}
                        type="monotone"
                        dataKey={option.name}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};



export default MetricAnalytics;