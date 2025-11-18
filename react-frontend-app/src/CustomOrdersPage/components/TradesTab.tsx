import React, { useEffect, useMemo } from 'react';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { NewTrade, NewTradeStop } from '../types';

interface Props {
  newTrade: NewTrade;
  setNewTrade: React.Dispatch<React.SetStateAction<NewTrade>>;
  clearSavedTrade: () => void;
  addTrade: () => Promise<void> | void;
  loading: boolean;
  flashTrade: boolean;
  triggerFlash: (key: string) => void;
  subtleFlashClass: string;
  computeMidPrice: (l: number, u: number) => number | null;
  addSellStop: () => void;
  removeSellStop: (i: number) => void;
  updateSellStop: (index: number, field: 'price' | 'position_pct' | 'percent_below_fill' | '__ui_mode', value: number | string) => void;
  autoCalcEnabled: boolean;
  setAutoCalcEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  autoCalcReady: boolean;
  currentEquity: number | null;
}

export const TradesTab: React.FC<Props> = ({
  newTrade,
  setNewTrade,
  clearSavedTrade,
  addTrade,
  loading,
  flashTrade,
  triggerFlash,
  subtleFlashClass,
  computeMidPrice,
  addSellStop,
  removeSellStop,
  updateSellStop,
  autoCalcEnabled,
  setAutoCalcEnabled,
  autoCalcReady,
  currentEquity
}) => {
  // Calculate risk from shares when in manual mode
  const calculatedRisk = useMemo(() => {
    if (autoCalcEnabled) return null;
    
    const entry = computeMidPrice(newTrade.lower_price_range, newTrade.higher_price_range);
    if (entry == null || !isFinite(newTrade.shares) || newTrade.shares <= 0 || newTrade.sell_stops.length === 0) {
      return null;
    }

    let weightedDrop = 0;
    for (const stop of newTrade.sell_stops) {
      const pct = Number(stop.position_pct) || 0;
      if (pct <= 0) continue;
      
      let stopPrice: number | null = null;
      const mode = (stop.__ui_mode ?? (stop.percent_below_fill != null ? 'percent' : 'price')) as 'price' | 'percent';
      if (mode === 'percent') {
        stopPrice = entry * (1 - (Number(stop.percent_below_fill) || 0) / 100);
      } else {
        stopPrice = Number(stop.price);
      }
      
      if (!stopPrice || !isFinite(stopPrice)) continue;
      const drop = entry - stopPrice;
      if (drop <= 0) continue;
      weightedDrop += pct * drop;
    }

    if (weightedDrop <= 0) {
      return null;
    }

    const riskAmount = newTrade.shares * weightedDrop;
    if (!isFinite(riskAmount) || riskAmount <= 0) {
      return null;
    }

    const roundedRiskAmount = Math.round(riskAmount * 100) / 100;
    let riskPercent: number | null = null;
    if (currentEquity != null && currentEquity > 0) {
      riskPercent = Math.round(((roundedRiskAmount / currentEquity) * 100) * 100) / 100;
    }

    return { riskAmount: roundedRiskAmount, riskPercent };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCalcEnabled, newTrade.shares, newTrade.lower_price_range, newTrade.higher_price_range, JSON.stringify(newTrade.sell_stops), currentEquity, computeMidPrice]);

  // Auto-update risk when in manual mode and calculation is ready
  useEffect(() => {
    if (!autoCalcEnabled && calculatedRisk?.riskAmount != null) {
      setNewTrade(prev => ({
        ...prev,
        risk_amount: calculatedRisk.riskAmount!,
        risk_percent_of_equity: calculatedRisk.riskPercent ?? prev.risk_percent_of_equity
      }));
    }
  }, [autoCalcEnabled, calculatedRisk?.riskAmount, calculatedRisk?.riskPercent]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-semibold">Add New Trade</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { clearSavedTrade(); triggerFlash('trade'); }}
              className={`text-xs px-3 py-1.5 rounded-md border border-input hover:bg-muted/60 transition-shadow relative duration-200 ${flashTrade ? subtleFlashClass : ''}`}
            >
              Reset Trade
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Ticker</label>
            <input
              type="text"
              value={newTrade.ticker}
              onChange={(e) => setNewTrade(prev => ({ ...prev, ticker: e.target.value }))}
              className="w-full p-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Lower Price Range</label>
            <input type="number" value={newTrade.lower_price_range} onChange={(e) => setNewTrade(prev => ({ ...prev, lower_price_range: parseFloat(e.target.value) }))} className="w-full p-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring" step="0.01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Higher Price Range</label>
            <input type="number" value={newTrade.higher_price_range} onChange={(e) => setNewTrade(prev => ({ ...prev, higher_price_range: parseFloat(e.target.value) }))} className="w-full p-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring" step="0.01" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Risk Amount ($)
              {!autoCalcEnabled && calculatedRisk?.riskAmount != null && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">(calculated)</span>
              )}
            </label>
            <input
              type="number"
              value={newTrade.risk_amount}
              onChange={(e) => {
                const dollars = parseFloat(e.target.value) || 0;
                let pct = newTrade.risk_percent_of_equity ?? 0;
                if (currentEquity != null && currentEquity > 0) {
                  pct = Math.round(((dollars / currentEquity) * 100) * 100) / 100;
                }
                setNewTrade(prev => ({ ...prev, risk_amount: dollars, risk_percent_of_equity: pct }));
              }}
              readOnly={!autoCalcEnabled && calculatedRisk?.riskAmount != null}
              className={`w-full p-3 border border-input ${!autoCalcEnabled && calculatedRisk?.riskAmount != null ? 'bg-muted' : 'bg-background'} text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring`}
              step="0.01"
              min={0}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Risk % of Equity
              {!autoCalcEnabled && calculatedRisk?.riskPercent != null && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">(calculated)</span>
              )}
            </label>
            <input
              type="number"
              value={newTrade.risk_percent_of_equity ?? 0}
              onChange={(e) => {
                const pct = parseFloat(e.target.value) || 0;
                let dollars = newTrade.risk_amount;
                if (currentEquity != null && currentEquity > 0 && pct > 0) {
                  dollars = Math.round((currentEquity * pct / 100) * 100) / 100;
                }
                setNewTrade(prev => ({ ...prev, risk_percent_of_equity: pct, risk_amount: dollars }));
              }}
              readOnly={!autoCalcEnabled && calculatedRisk?.riskPercent != null}
              className={`w-full p-3 border border-input ${!autoCalcEnabled && calculatedRisk?.riskPercent != null ? 'bg-muted' : 'bg-background'} text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring`}
              step="0.01"
              min={0}
              max={100}
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-foreground mb-2">Sell Stops</label>
          <div className="space-y-2">
            <button onClick={addSellStop} className="w-full p-2 border-2 border-dashed border-border rounded-lg hover:border-border/80 text-muted-foreground hover:text-foreground">
              + Add Sell Stop
            </button>
            {newTrade.sell_stops.map((stop: NewTradeStop, index: number) => {
              const mode = (stop.__ui_mode || (stop.percent_below_fill != null ? 'percent' : 'price')) as 'price' | 'percent';
              const entry = computeMidPrice(newTrade.lower_price_range, newTrade.higher_price_range);
              let effectiveStop: number | null = null;
              if (entry != null) {
                effectiveStop = mode === 'percent'
                  ? entry * (1 - (Number(stop.percent_below_fill) || 0) / 100)
                  : Number(stop.price) || null;
              }
              return (
                <div key={index} className="flex items-start gap-2 flex-wrap md:flex-nowrap">
                  <div className="w-32">
                    <label className="block text-xs text-muted-foreground mb-1">Mode</label>
                    <select value={mode} onChange={(e) => updateSellStop(index, '__ui_mode', e.target.value)} className="w-full p-2 border border-input bg-background text-foreground rounded-lg text-xs">
                      <option value="price">Fixed Price</option>
                      <option value="percent">% Below Fill</option>
                    </select>
                  </div>
                  {mode === 'price' ? (
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs text-muted-foreground mb-1">Stop Price</label>
                      <input type="number" value={stop.price ?? 0} onChange={(e) => updateSellStop(index, 'price', parseFloat(e.target.value))} className="w-full p-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring" placeholder="Price" step="0.01" />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-[140px]">
                      <label className="block text-xs text-muted-foreground mb-1">% Below Fill</label>
                      <input type="number" value={stop.percent_below_fill ?? 1} onChange={(e) => updateSellStop(index, 'percent_below_fill', parseFloat(e.target.value))} className="w-full p-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring" placeholder="Percent" step="0.1" min="0.1" />
                    </div>
                  )}
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-xs text-muted-foreground mb-1">Sell % of Position</label>
                    <input type="number" value={stop.position_pct ?? 0} onChange={(e) => updateSellStop(index, 'position_pct', parseFloat(e.target.value) || 0)} className="w-full p-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring" placeholder="e.g. 0.33" step="0.01" min="0" max="1" />
                  </div>
                  {entry != null && effectiveStop != null && (
                    <div className="flex items-center text-xs text-muted-foreground mt-6">
                      Risk drop: ${(entry - effectiveStop).toFixed(2)}
                    </div>
                  )}
                  <button onClick={() => removeSellStop(index)} className="p-2 text-destructive hover:bg-destructive/10 rounded mt-5" disabled={newTrade.sell_stops.length === 1}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
            <div className="flex flex-col gap-2 mt-2">
              <label className="flex items-center gap-2 text-xs select-none">
                <input type="checkbox" className="h-4 w-4" checked={autoCalcEnabled} onChange={(e) => setAutoCalcEnabled(e.target.checked)} />
                <span>Auto-calculate shares from risk, mid price, and stops {autoCalcReady ? '' : '(incomplete inputs)'}</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Shares {autoCalcEnabled ? '(auto)' : '(manual)'}</label>
                <input type="number" value={newTrade.shares} onChange={(e) => !autoCalcEnabled && setNewTrade(prev => ({ ...prev, shares: Math.max(0, Math.round((parseFloat(e.target.value) || 0) * 100) / 100) }))} readOnly={autoCalcEnabled} className={`w-full p-3 border border-input ${autoCalcEnabled ? 'bg-muted' : 'bg-background'} text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring`} step="0.01" min="0" placeholder={autoCalcEnabled ? 'Auto-calculated' : 'Enter shares manually'} />
              </div>
            </div>
          </div>
        </div>

        <button onClick={addTrade} disabled={loading} className="mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 dark:bg-green-700 dark:hover:bg-green-800">
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {loading ? 'Adding Trade...' : 'Add Trade'}
        </button>
      </div>
    </div>
  );
};
