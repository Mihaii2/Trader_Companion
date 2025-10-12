import React from 'react';
import { Eye, DollarSign, RefreshCw, Play, Trash2 } from 'lucide-react';
import { ServerStatus } from '../types';

interface Props {
  serverStatus: ServerStatus | null;
  executeTradeNow: (p: { ticker: string; lower_price_range: number; higher_price_range: number }) => void;
  deleteTrade: (id: string) => void;
  loading: boolean;
  riskAmount: number;
  setRiskAmount: React.Dispatch<React.SetStateAction<number>>;
  updateRisk: () => Promise<void> | void;
}

export const StatusTab: React.FC<Props> = ({ serverStatus, executeTradeNow, deleteTrade, loading, riskAmount, setRiskAmount, updateRisk }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {serverStatus && (
          <>
            <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-blue-800 dark:text-blue-200">Active Trades</h3>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{serverStatus.active_trades}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/50 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-green-800 dark:text-green-200">Available Risk</h3>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">${serverStatus.available_risk}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/50 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-semibold text-purple-800 dark:text-purple-200">Server Uptime</h3>
              </div>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{serverStatus.server_uptime}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-950/50 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <Play className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">Last Trade</h3>
              </div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">{serverStatus.last_trade_time || 'Never'}</p>
            </div>
          </>
        )}
      </div>

      {serverStatus && serverStatus.trades && serverStatus.trades.length > 0 && (
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-foreground">Active Trades Details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Trade ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Ticker</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Shares</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Price Range</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Sell Stops</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {serverStatus.trades.map(trade => (
                  <tr key={trade.trade_id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">{trade.trade_id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{trade.ticker}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">{trade.shares.toFixed(3)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">${trade.risk_amount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">${trade.lower_price_range.toFixed(2)} - ${trade.higher_price_range.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      <div className="space-y-1">
                        {trade.sell_stops.map((stop, i) => {
                          const isPercent = stop.percent_below_fill !== undefined && stop.percent_below_fill !== null;
                          return (
                            <div key={i} className="text-xs bg-muted px-2 py-1 rounded">
                              {isPercent ? (
                                <>{stop.percent_below_fill}% below fill ({stop.shares.toFixed(3)} sh)</>
                              ) : (
                                <>${(stop.price ?? 0).toFixed(2)} ({stop.shares.toFixed(3)} sh)</>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      <div className="flex items-center gap-2">
                        <button onClick={() => executeTradeNow({ ticker: trade.ticker, lower_price_range: trade.lower_price_range, higher_price_range: trade.higher_price_range })} disabled={loading} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm dark:bg-blue-700 dark:hover:bg-blue-800" title="Execute this trade immediately">
                          <Play className="w-3 h-3" />
                          Execute Now
                        </button>
                        <button onClick={() => deleteTrade(trade.trade_id)} disabled={loading} className="inline-flex items-center gap-1 px-3 py-1 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50 text-sm">
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-muted/50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Update Risk Amount</h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">New Risk Amount</label>
            <input type="number" value={riskAmount} onChange={(e) => setRiskAmount(parseFloat(e.target.value))} className="w-full p-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring" step="0.01" />
          </div>
          <button onClick={updateRisk} disabled={loading} className="bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            Update Risk
          </button>
        </div>
      </div>
    </div>
  );
};
