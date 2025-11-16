import React, { useState } from 'react';
import { Info, Play, RefreshCw, Trash2 } from 'lucide-react';
import { OrderConfig } from '../types';

interface PivotPositions { [key: string]: boolean; }

interface Props {
  orderConfig: OrderConfig;
  setOrderConfig: React.Dispatch<React.SetStateAction<OrderConfig>>;
  pivotPositions: PivotPositions;
  updatePivotPositions: (position: string, checked: boolean) => void;
  clearSavedOrderConfig: () => void;
  showAdvanced: boolean;
  setShowAdvanced: React.Dispatch<React.SetStateAction<boolean>>;
  startOrder: () => Promise<void> | void;
  loading: boolean;
  flashAdvanced: boolean;
  flashOrder: boolean;
  triggerFlash: (key: string) => void;
  subtleFlashClass: string;
}

export const OrderConfigTab: React.FC<Props> = ({
  orderConfig,
  setOrderConfig,
  pivotPositions,
  updatePivotPositions,
  clearSavedOrderConfig,
  showAdvanced,
  setShowAdvanced,
  startOrder,
  loading,
  flashAdvanced,
  flashOrder,
  triggerFlash,
  subtleFlashClass
}) => {
  const [newVolumeReq, setNewVolumeReq] = useState('');
  const [addFractionalVolumes, setAddFractionalVolumes] = useState(true);
  const [convertDayToHourly, setConvertDayToHourly] = useState(true);

  const addVolumeRequirement = () => {
    if (newVolumeReq.trim()) {
      let baseReq = newVolumeReq.trim();
      const dayMatch = baseReq.match(/^day\s*=\s*([\d,.]+)$/i);
      if (convertDayToHourly && dayMatch) {
        const dayVolume = parseFloat(dayMatch[1].replace(/,/g, ''));
        if (!isNaN(dayVolume) && dayVolume > 0) {
          const hourlyVolume = Math.round(dayVolume / 6.5);
          baseReq = `60=${hourlyVolume}`;
        }
      }

      setOrderConfig(prev => {
        const existing = new Set(prev.volume_requirements.map(v => v.trim()));
        const additions: string[] = [];
        if (!existing.has(baseReq)) { additions.push(baseReq); existing.add(baseReq); }
        const match = baseReq.match(/^(\d+)\s*=\s*(\d+)$/);
        if (addFractionalVolumes && match) {
          const minutes = parseInt(match[1], 10);
          const volume = parseInt(match[2], 10);
          if (minutes > 1) {
            const halfMinutes = Math.round(minutes / 2);
            const quarterMinutes = Math.round(minutes / 4);
            const halfVolume = Math.round(volume / 2);
            const quarterVolume = Math.round(volume / 4);
            const halfReq = `${halfMinutes}=${halfVolume}`;
            const quarterReq = `${quarterMinutes}=${quarterVolume}`;
            if (!existing.has(halfReq)) { additions.push(halfReq); existing.add(halfReq); }
            if (!existing.has(quarterReq)) { additions.push(quarterReq); existing.add(quarterReq); }
          }
        }
        return { ...prev, volume_requirements: [...prev.volume_requirements, ...additions] };
      });
      setNewVolumeReq('');
    }
  };

  const removeVolumeRequirement = (index: number) => {
    setOrderConfig(prev => ({
      ...prev,
      volume_requirements: prev.volume_requirements.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">Basic Breakout Order Settings</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setShowAdvanced(s => !s); triggerFlash('advanced'); }}
            className={`text-xs px-3 py-1.5 rounded-md border border-input hover:bg-muted/60 flex items-center gap-1 relative transition-shadow duration-200 ${flashAdvanced ? subtleFlashClass : ''}`}
          >
            {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
          </button>
          <button
            type="button"
            onClick={() => { clearSavedOrderConfig(); triggerFlash('order'); }}
            className={`text-xs px-3 py-1.5 rounded-md border border-input hover:bg-muted/60 transition-shadow relative duration-200 ${flashOrder ? subtleFlashClass : ''}`}
            title="Reset & remove saved order config"
          >
            Reset Order
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 text-sm text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100 rounded-md p-3 flex gap-3 items-start">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <div>
          <p>
            To capture full trading-day data for a ticker, add the trade in the <strong>Trades</strong> tab before the market opens.
            Custom orders can be created or deleted after the open&mdash;they will still use the complete day&apos;s data as long as
            the ticker was added ahead of the opening bell.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Ticker</label>
          <input
            type="text"
            value={orderConfig.ticker}
            onChange={(e) => setOrderConfig(prev => ({ ...prev, ticker: e.target.value }))}
            className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring"
            placeholder="AAPL"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Lower Pivot Price</label>
          <input
            type="number"
            value={orderConfig.lower_price}
            onChange={(e) => setOrderConfig(prev => ({ ...prev, lower_price: parseFloat(e.target.value) }))}
            className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Higher Pivot Price</label>
          <input
            type="number"
            value={orderConfig.higher_price}
            onChange={(e) => setOrderConfig(prev => ({ ...prev, higher_price: parseFloat(e.target.value) }))}
            className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring"
            step="0.01"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-foreground">Volume Requirements (passed if any passes)</label>
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-end">
          <input
            type="text"
            value={newVolumeReq}
            onChange={(e) => setNewVolumeReq(e.target.value)}
            className="flex-1 w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm"
            placeholder="minutes=volume or day=volume (e.g. 60=100000)"
          />
          <button
            onClick={addVolumeRequirement}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 text-sm"
            disabled={!newVolumeReq.trim()}
          >Add</button>
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={addFractionalVolumes}
            onChange={(e) => setAddFractionalVolumes(e.target.checked)}
          />
          Auto add 1/2 & 1/4 (e.g. 60=100000 ➜ 30=50000 & 15=25000)
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={convertDayToHourly}
            onChange={(e) => setConvertDayToHourly(e.target.checked)}
          />
          Auto-convert daily volume to hourly (day=volume ➜ 60=volume/6.5)
        </label>
        {orderConfig.volume_requirements.length === 0 && (
          <p className="text-xs text-muted-foreground">No volume requirements added yet.</p>
        )}
        {orderConfig.volume_requirements.length > 0 && (
          <ul className="space-y-1 max-h-40 overflow-auto pr-1">
            {orderConfig.volume_requirements.map((req, index) => (
              <li key={index} className="flex items-center gap-2 bg-muted/40 px-2 py-1 rounded text-xs">
                <span className="flex-1 font-mono">{req}</span>
                <button
                  onClick={() => removeVolumeRequirement(index)}
                  className="p-1 text-destructive hover:bg-destructive/10 rounded"
                  title="Remove"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAdvanced && (
        <div className="space-y-4 border border-dashed border-border rounded-md p-4 bg-muted/30">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Advanced Settings</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Request Lower Trade Price (override)</label>
              <input
                type="number"
                step="0.01"
                value={orderConfig.request_lower_price ?? ''}
                onChange={(e) => setOrderConfig(prev => ({ ...prev, request_lower_price: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Request Higher Trade Price (override)</label>
              <input
                type="number"
                step="0.01"
                value={orderConfig.request_higher_price ?? ''}
                onChange={(e) => setOrderConfig(prev => ({ ...prev, request_higher_price: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Start Minutes Before Close</label>
              <input type="number" step="1" value={orderConfig.start_minutes_before_close ?? ''} onChange={(e) => setOrderConfig(prev => ({ ...prev, start_minutes_before_close: e.target.value === '' ? null : parseFloat(e.target.value) }))} className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm" min={1} placeholder="e.g. 60" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Stop Minutes Before Close</label>
              <input type="number" step="1" value={orderConfig.stop_minutes_before_close ?? 0} onChange={(e) => setOrderConfig(prev => ({ ...prev, stop_minutes_before_close: parseFloat(e.target.value) || 0 }))} className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm" min={0} placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Max Day Low</label>
              <input type="number" value={orderConfig.max_day_low || ''} onChange={(e) => setOrderConfig(prev => ({ ...prev, max_day_low: e.target.value ? parseFloat(e.target.value) : null }))} className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus-border-ring text-sm" step="0.01" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Min Day Low</label>
              <input type="number" value={orderConfig.min_day_low || ''} onChange={(e) => setOrderConfig(prev => ({ ...prev, min_day_low: e.target.value ? parseFloat(e.target.value) : null }))} className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus-border-ring text-sm" step="0.01" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Day High Max % Off</label>
              <input type="number" value={orderConfig.day_high_max_percent_off} onChange={(e) => setOrderConfig(prev => ({ ...prev, day_high_max_percent_off: parseFloat(e.target.value) }))} className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus-border-ring text-sm" step="0.01" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Wait After Open (minutes)</label>
              <input type="number" step="0.1" value={orderConfig.wait_after_open_minutes ?? 0} onChange={(e) => setOrderConfig(prev => ({ ...prev, wait_after_open_minutes: parseFloat(e.target.value) || 0 }))} className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus-border-ring text-sm" min={0} placeholder="0" />
            </div>
            <div className="col-span-2 md:col-span-3 xl:col-span-4 space-y-2">
              <label className="block text-xs font-medium text-foreground">Volume Multipliers</label>
              <div className="grid grid-cols-3 gap-2">
                {['Lower', 'Middle', 'Upper'].map((label, idx) => (
                  <input key={idx} type="number" value={orderConfig.volume_multipliers[idx]} onChange={(e) => { const newMultipliers = [...orderConfig.volume_multipliers]; newMultipliers[idx] = parseFloat(e.target.value); setOrderConfig(prev => ({ ...prev, volume_multipliers: newMultipliers })); }} className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm" step="0.01" placeholder={label} />
                ))}
              </div>
            </div>
            <div className="col-span-2 md:col-span-3 xl:col-span-4">
              <label className="block text-xs font-medium mb-1">Time in Pivot Positions</label>
              <div className="flex flex-wrap gap-3">
                {(['any', 'lower', 'middle', 'upper'] as const).map(position => (
                  <label key={position} className="flex items-center gap-1 text-xs bg-muted/40 px-2 py-1 rounded">
                    <input type="checkbox" checked={pivotPositions[position]} onChange={(e) => updatePivotPositions(position, e.target.checked)} className="rounded border-input text-primary focus:ring-ring h-3 w-3" />
                    <span className="capitalize">{position}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Pivot Adjustment</label>
              <select value={orderConfig.pivot_adjustment} onChange={(e) => setOrderConfig(prev => ({ ...prev, pivot_adjustment: e.target.value }))} className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm">
                <option value="0.0">0.0%</option>
                <option value="0.5">0.5%</option>
                <option value="1.0">1.0%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Time in Pivot (s)</label>
              <input type="number" value={orderConfig.time_in_pivot} onChange={(e) => setOrderConfig(prev => ({ ...prev, time_in_pivot: parseInt(e.target.value) }))} className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus-border-ring text-sm" placeholder="seconds" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Breakout Lookback (m)</label>
              <input type="number" value={orderConfig.breakout_lookback_minutes} onChange={(e) => setOrderConfig(prev => ({ ...prev, breakout_lookback_minutes: parseInt(e.target.value) || 0 }))} className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus-border-ring text-sm" min={1} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Lookback Exclude Recent (m)</label>
              <input type="number" step="0.1" value={orderConfig.breakout_exclude_minutes} onChange={(e) => setOrderConfig(prev => ({ ...prev, breakout_exclude_minutes: parseFloat(e.target.value) || 0 }))} className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus-border-ring text-sm" min={0} />
            </div>
          </div>
        </div>
      )}

      <button onClick={startOrder} disabled={loading} className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2">
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {loading ? 'Starting Order...' : 'Start Trading Order'}
      </button>
    </div>
  );
};
