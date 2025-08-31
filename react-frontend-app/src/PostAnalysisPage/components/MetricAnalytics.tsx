import React, { useMemo, useState } from 'react';
import { Trade } from '@/TradeHistoryPage/types/Trade';
import { Metric, TradeGrade } from '../types/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';

// Vibrant color palette for chart lines (works in both dark and light mode)
const vibrantColors = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e42', // orange
  '#a21caf', // purple
  '#ef4444', // red
  '#14b8a6', // teal
  '#eab308', // yellow
  '#6366f1', // indigo
];

const MetricAnalytics: React.FC<{
  trades: Trade[];
  metrics: Metric[];
  tradeGrades: TradeGrade[];
}> = ({ trades, metrics, tradeGrades }) => {
  // ✅ Configurable window size (default 50)
  const [trailingWindow, setTrailingWindow] = useState(50);

  const chartData = useMemo(() => {
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.Entry_Date).getTime() - new Date(b.Entry_Date).getTime()
    );

    const data: { [key: string]: any[] } = {};

    metrics.forEach(metric => {
      const metricData: any[] = [];

      for (let i = 0; i < sortedTrades.length; i++) {
        const windowStart = Math.max(0, i - (trailingWindow - 1));
        const windowTrades = sortedTrades.slice(windowStart, i + 1);

        const dataPoint: any = {
          tradeIndex: i + 1,
          ticker: sortedTrades[i].Ticker,
          date: sortedTrades[i].Entry_Date,
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
  }, [trades, metrics, tradeGrades, trailingWindow]);

  // Use vibrant palette for chart lines
  const colors = vibrantColors;

  if (metrics.length === 0) {
    return (
      <div className="bg-background rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center text-foreground">
          <BarChart3 className="mr-2" />
          Analytics
        </h2>
        <p className="text-muted-foreground">Create metrics and grade trades to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center text-foreground">
        <BarChart3 className="mr-2" />
        Analytics Dashboard
      </h2>

      {/* ✅ Simple control to tweak trailing window */}
      <div className="mb-6">
        <label className="text-sm font-medium text-foreground mr-2">
          Trailing Window (trades):
        </label>
        <input
          type="number"
          value={trailingWindow}
          onChange={e => setTrailingWindow(Math.max(1, Number(e.target.value)))}
          className="border border-input rounded-md px-2 py-1 w-20 text-center bg-background text-foreground"
        />
      </div>

      <div className="space-y-8">
        {metrics.map(metric => {
          const data = chartData[metric.id];
          if (!data || data.length === 0) return null;

          return (
            <div key={metric.id} className="border border-border rounded-lg p-4 bg-card">
              <h3 className="text-xl font-semibold mb-4 flex items-center text-foreground">
                <TrendingUp className="mr-2 w-5 h-5" />
                {metric.name} Trends (Trailing {trailingWindow} Trades)
              </h3>

              {metric.description && (
                <p className="text-muted-foreground mb-4 text-sm">{metric.description}</p>
              )}

              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                    <XAxis
                      dataKey="tradeIndex"
                      label={{ value: 'Trade Number', position: 'insideBottom', offset: -5 }}
                      stroke="hsl(var(--foreground))"
                      tick={{ fill: 'hsl(var(--foreground))' }}
                    />
                    <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} stroke="hsl(var(--foreground))" tick={{ fill: 'hsl(var(--foreground))' }} />
                    <Tooltip
                      labelFormatter={value => `Trade #${value}`}
                      formatter={(value: any, name: string) => [`${value} trades`, name]}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                    />
                    <Legend wrapperStyle={{ color: 'hsl(var(--foreground))' }} />
                    {metric.options.map((option, index) => (
                      <Line
                        key={option.id}
                        type="monotone"
                        dataKey={option.name}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5 }}
                        connectNulls={true}
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
