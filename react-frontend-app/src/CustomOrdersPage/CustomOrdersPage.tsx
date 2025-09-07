import React, { useState, useEffect } from 'react';
import { Play, Plus, Eye, AlertCircle, DollarSign, RefreshCw, Trash2 } from 'lucide-react';


interface OrderConfig {
  ticker: string;
  lower_price: number;
  higher_price: number;
  volume_requirements: string[];
  pivot_adjustment: string;
  day_high_max_percent_off: number;
  time_in_pivot: number;
  time_in_pivot_positions: string;
  data_server: string;
  trade_server: string;
  volume_multipliers: number[];
  max_day_low: number | null;
  min_day_low?: number | null;
  wait_after_open_minutes?: number; // NEW custom wait time after market open (float)
  breakout_lookback_minutes?: number; // NEW
  breakout_exclude_minutes?: number; // NEW
  start_minutes_before_close?: number | null; // NEW (late-day start)
  stop_minutes_before_close?: number | null;  // NEW (late-day stop buffer)
}

interface ServerStatus {
  success: boolean;
  active_trades: number;
  available_risk: number;
  server_uptime: string;
  last_trade_time: string;
  trades: Array<{
    trade_id: string;
    ticker: string;
    shares: number;
    risk_amount: number;
    lower_price_range: number;
    higher_price_range: number;
  sell_stops: Array<{ price?: number; shares: number; percent_below_fill?: number }>;
  }>;
  error_count?: number;
  is_processing?: boolean;
}

interface TradeData {
  ticker?: string;
  shares?: number;
  risk_amount?: number;
  lower_price_range?: number;
  higher_price_range?: number;
  sell_stops?: Array<{ price?: number; shares: number; percent_below_fill?: number; __ui_mode?: 'price' | 'percent' }>;
  [key: string]: unknown;
}

interface ErrorLog {
  timestamp: string;
  error_message: string;
  error_type: string;
  ticker: string;
  trade_data: TradeData;
}

export function CustomOrdersPage() {
  // -------------------- Persistence Keys & Defaults --------------------
  const ORDER_CONFIG_STORAGE_KEY = 'customOrdersPage.orderConfig.v1';
  const NEW_TRADE_STORAGE_KEY = 'customOrdersPage.newTrade.v1';
  const PIVOT_POSITIONS_STORAGE_KEY = 'customOrdersPage.pivotPositions.v1';
  const SHOW_ADVANCED_STORAGE_KEY = 'customOrdersPage.showAdvanced.v1';

  const defaultOrderConfig: OrderConfig = {
    ticker: '',
    lower_price: 0,
    higher_price: 0,
    volume_requirements: [],
    pivot_adjustment: '0.0',
    day_high_max_percent_off: 3,
    time_in_pivot: 30,
    time_in_pivot_positions: '',
    data_server: 'http://localhost:5001',
    trade_server: 'http://localhost:5002',
    volume_multipliers: [1.0, 1.0, 1.0],
    max_day_low: null,
    min_day_low: null,
    wait_after_open_minutes: 1.01,
    breakout_lookback_minutes: 60,
    breakout_exclude_minutes: 0.5,
  start_minutes_before_close: null,
  stop_minutes_before_close: 0,
  };

  const defaultPivotPositions = { any: false, lower: false, middle: false, upper: false };

  const defaultNewTrade: { ticker: string; shares: number; risk_amount: number; lower_price_range: number; higher_price_range: number; sell_stops: { price?: number; shares: number; percent_below_fill?: number; __ui_mode?: 'price' | 'percent'; }[] } = {
    ticker: '',
    shares: 0,
    risk_amount: 0,
    lower_price_range: 0,
    higher_price_range: 0,
  sell_stops: [{ price: 0, shares: 0, percent_below_fill: undefined, __ui_mode: 'price' as const }]
  };

  const safeLoad = <T,>(key: string, fallback: T): T => {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      // Merge with fallback so new fields are added automatically
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...fallback, ...parsed } as T;
      }
      return fallback;
    } catch {
      return fallback;
    }
  };

  const [activeTab, setActiveTab] = useState<'order' | 'trades' | 'status' | 'errors'>('order');
  const [orderConfig, setOrderConfig] = useState<OrderConfig>(() => safeLoad(ORDER_CONFIG_STORAGE_KEY, defaultOrderConfig));
  const [pivotPositions, setPivotPositions] = useState(() => safeLoad(PIVOT_POSITIONS_STORAGE_KEY, defaultPivotPositions));
  const [newTrade, setNewTrade] = useState(() => safeLoad(NEW_TRADE_STORAGE_KEY, defaultNewTrade));
  
  // Removed unused trades state (was: const [trades, setTrades] = useState<Trade[]>([]);)
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [newVolumeReq, setNewVolumeReq] = useState('');
  const [riskAmount, setRiskAmount] = useState(0);
  const [showVolumeWarningModal, setShowVolumeWarningModal] = useState(false);
  const [addFractionalVolumes, setAddFractionalVolumes] = useState(true); // NEW: auto add 1/2 & 1/4
  const [showAdvanced, setShowAdvanced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const raw = localStorage.getItem(SHOW_ADVANCED_STORAGE_KEY);
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  }); // UI: toggle advanced settings (persisted)

  // Quick visual feedback (glow) when certain buttons are clicked (for touchpad w/out click sound)
  const [flash, setFlash] = useState<{ order: boolean; trade: boolean; advanced: boolean; refresh: boolean }>({
    order: false,
    trade: false,
    advanced: false,
    refresh: false,
  });

  // Single subtle highlight style (toned down vs multicolor)
  const subtleFlashClass = 'ring-2 ring-primary/50 bg-muted/60 shadow-sm';

  const triggerFlash = (key: keyof typeof flash, duration = 180) => {
    setFlash(prev => ({ ...prev, [key]: true }));
    // Clear after short delay
    window.setTimeout(() => {
      setFlash(prev => ({ ...prev, [key]: false }));
    }, duration);
  };

  
  
  // API calls
  const startOrder = async () => {
    if (orderConfig.volume_requirements.length === 0) {
      setShowVolumeWarningModal(true);
      return;
    }


    await performStartOrder();
  };

  const performStartOrder = async () => {
    setLoading(true);
    try {
      const configToSend = {
        ...orderConfig,
      };

      const response = await fetch('http://localhost:5003/start_bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configToSend)
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Order started successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmStart = () => {
    setShowVolumeWarningModal(false);
    performStartOrder();
  };

  const handleCancelStart = () => {
    setShowVolumeWarningModal(false);
  };



  const addTrade = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/add_trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTrade)
      });
      
      const result = await response.json();
      if (result.success) {
        // ✅ Add ticker to monitoring server
        try {
          await fetch('http://localhost:5001/tickers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: newTrade.ticker.toUpperCase() })
          });
        } catch (tickerErr) {
          console.error('Failed to add ticker to monitoring server:', tickerErr);
        }

        alert('Trade added successfully!');
  setNewTrade(defaultNewTrade);
        fetchStatus();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };


  const fetchStatus = async () => {
    try {
      const response = await fetch('http://localhost:5002/status');
      const result = await response.json();
      setServerStatus(result);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const fetchErrors = async () => {
    try {
      const response = await fetch('http://localhost:5002/errors');
      const result = await response.json();
      if (result.success) {
        setErrors(result.errors);
      }
    } catch (error) {
      console.error('Error fetching errors:', error);
    }
  };

  const updatePivotPositions = (position: string, checked: boolean) => {
    setPivotPositions(prev => ({
      ...prev,
      [position]: checked
    }));
    
    // Update the orderConfig with the selected positions
    const newPositions = { ...pivotPositions, [position]: checked };
    const selectedPositions = Object.entries(newPositions)
      .filter(([, isSelected]) => isSelected)
      .map(([pos]) => pos);
    
    setOrderConfig(prev => ({
      ...prev,
      time_in_pivot_positions: selectedPositions.join(',')
    }));
  };

  const updateRisk = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/update_risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: riskAmount })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Risk amount updated successfully!');
        fetchStatus();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteTrade = async (tradeId: string) => {
    if (!confirm('Are you sure you want to delete this trade?')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5002/remove_trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade_id: tradeId })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Trade deleted successfully!');
        fetchStatus();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const addVolumeRequirement = () => {
    if (newVolumeReq.trim()) {
      const baseReq = newVolumeReq.trim();

      setOrderConfig(prev => {
        const existing = new Set(prev.volume_requirements.map(v => v.trim()))
        const additions: string[] = [];

        // Always add the base requirement if not already present
        if (!existing.has(baseReq)) {
          additions.push(baseReq);
          existing.add(baseReq);
        }

        // If checkbox enabled and pattern matches minutes=volume (both integers)
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
            if (!existing.has(halfReq)) {
              additions.push(halfReq);
              existing.add(halfReq);
            }
            if (!existing.has(quarterReq)) {
              additions.push(quarterReq);
              existing.add(quarterReq);
            }
          }
        }

        return {
          ...prev,
          volume_requirements: [...prev.volume_requirements, ...additions]
        };
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

  const addSellStop = () => {
    setNewTrade(prev => ({
      ...prev,
      sell_stops: [...prev.sell_stops, { price: 0, shares: 0, percent_below_fill: undefined, __ui_mode: 'price' }]
    }));
  };

  const removeSellStop = (index: number) => {
    setNewTrade(prev => ({
      ...prev,
      sell_stops: prev.sell_stops.filter((_, i) => i !== index)
    }));
  };

  const updateSellStop = (index: number, field: 'price' | 'shares' | 'percent_below_fill' | '__ui_mode', value: number | string) => {
    type StopType = { price?: number; shares: number; percent_below_fill?: number; __ui_mode?: 'price' | 'percent' };
    setNewTrade(prev => ({
      ...prev,
      sell_stops: prev.sell_stops.map((stop: StopType, i: number): StopType => {
        if (i !== index) return stop;
        if (field === '__ui_mode') {
          const mode = value as 'price' | 'percent';
          if (mode === 'price') {
            return { ...stop, __ui_mode: 'price', percent_below_fill: undefined, price: stop.price ?? 0 };
          } else {
            return { ...stop, __ui_mode: 'percent', price: undefined, percent_below_fill: stop.percent_below_fill ?? 1 };
          }
        }
  type StopType = { price?: number; shares: number; percent_below_fill?: number; __ui_mode?: 'price' | 'percent' };
  const numeric = typeof value === 'string' ? (parseFloat(value) || 0) : value;
  return { ...stop, [field]: numeric } as StopType;
      })
    }));
  };

  useEffect(() => {
    fetchStatus();
    fetchErrors();
    const interval = setInterval(() => {
      fetchStatus();
      fetchErrors();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // -------------------- Persistence Effects --------------------
  useEffect(() => {
    try { localStorage.setItem(ORDER_CONFIG_STORAGE_KEY, JSON.stringify(orderConfig)); } catch { /* ignore persistence error */ }
  }, [orderConfig]);

  useEffect(() => {
    try { localStorage.setItem(NEW_TRADE_STORAGE_KEY, JSON.stringify(newTrade)); } catch { /* ignore persistence error */ }
  }, [newTrade]);

  useEffect(() => {
    try { localStorage.setItem(PIVOT_POSITIONS_STORAGE_KEY, JSON.stringify(pivotPositions)); } catch { /* ignore persistence error */ }
  }, [pivotPositions]);

  useEffect(() => {
    try { localStorage.setItem(SHOW_ADVANCED_STORAGE_KEY, JSON.stringify(showAdvanced)); } catch { /* ignore persistence error */ }
  }, [showAdvanced]);

  const clearSavedOrderConfig = () => {
    // Instant reset (no confirmation per user request)
    setOrderConfig(defaultOrderConfig);
    try { localStorage.removeItem(ORDER_CONFIG_STORAGE_KEY); } catch { /* ignore */ }
  triggerFlash('order');
  };

  const clearSavedTrade = () => {
    // Instant reset (no confirmation per user request)
    setNewTrade(defaultNewTrade);
    try { localStorage.removeItem(NEW_TRADE_STORAGE_KEY); } catch { /* ignore */ }
  triggerFlash('trade');
  };

  // Removed global clearAll per user feedback (was duplicating Reset Order intention visually)

  const TabButton = ({ tab, label, icon: Icon }: { tab: string; label: string; icon: React.ComponentType<{ className?: string }> }) => (
    <button
      onClick={() => setActiveTab(tab as 'order' | 'trades' | 'status' | 'errors')}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        activeTab === tab
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );


  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-card text-card-foreground rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold mb-6">Custom Breakout Order Management</h1>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <TabButton tab="order" label="Order Config" icon={Play} />
          <TabButton tab="trades" label="Trades" icon={Plus} />
          <TabButton tab="status" label="Status" icon={Eye} />
          <TabButton tab="errors" label="Errors" icon={AlertCircle} />
        </div>

        {/* Order Configuration Tab */}
        {activeTab === 'order' && (
          <div className="space-y-5">
            {/* Common (frequently used) fields */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">Basic Breakout Order Settings</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowAdvanced(s => !s); triggerFlash('advanced'); }}
                  className={`text-xs px-3 py-1.5 rounded-md border border-input hover:bg-muted/60 flex items-center gap-1 relative transition-shadow duration-200 ${flash.advanced ? subtleFlashClass : ''}`}
                >
                  {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </button>
                <button
                  type="button"
                  onClick={clearSavedOrderConfig}
                  className={`text-xs px-3 py-1.5 rounded-md border border-input hover:bg-muted/60 transition-shadow relative duration-200 ${flash.order ? subtleFlashClass : ''}`}
                  title="Reset & remove saved order config"
                >
                  Reset Order
                </button>
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

            {/* Volume Requirements */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-foreground">Volume Requirements (passed if any passes)</label>
              <div className="flex flex-col md:flex-row gap-2 items-start md:items-end">
                <input
                  type="text"
                  value={newVolumeReq}
                  onChange={(e) => setNewVolumeReq(e.target.value)}
                  className="flex-1 w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                  placeholder="minutes=volume or day=volume (e.g. 60=100000, meaning 60min volume ≥100k)"
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


            {/* Advanced Section */}
            {showAdvanced && (
              <div className="space-y-4 border border-dashed border-border rounded-md p-4 bg-muted/30">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Advanced Settings</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Start Minutes Before Close</label>
                    <input
                      type="number"
                      step="1"
                      value={orderConfig.start_minutes_before_close ?? ''}
                      onChange={(e) => setOrderConfig(prev => ({ ...prev, start_minutes_before_close: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                      min={1}
                      placeholder="e.g. 60 (trades only last hour)"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Stop Minutes Before Close</label>
                    <input
                      type="number"
                      step="1"
                      value={orderConfig.stop_minutes_before_close ?? 0}
                      onChange={(e) => setOrderConfig(prev => ({ ...prev, stop_minutes_before_close: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                      min={0}
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium mb-1">Max Day Low</label>
                    <input
                      type="number"
                      value={orderConfig.max_day_low || ''}
                      onChange={(e) => setOrderConfig(prev => ({
                        ...prev,
                        max_day_low: e.target.value ? parseFloat(e.target.value) : null
                      }))}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus-border-ring text-sm"
                      step="0.01"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Min Day Low</label>
                    <input
                      type="number"
                      value={orderConfig.min_day_low || ''}
                      onChange={(e) => setOrderConfig(prev => ({
                        ...prev,
                        min_day_low: e.target.value ? parseFloat(e.target.value) : null
                      }))}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus-border-ring text-sm"
                      step="0.01"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Day High Max % Off</label>
                    <input
                      type="number"
                      value={orderConfig.day_high_max_percent_off}
                      onChange={(e) => setOrderConfig(prev => ({ ...prev, day_high_max_percent_off: parseFloat(e.target.value) }))}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus-border-ring text-sm"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Wait After Open (minutes)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={orderConfig.wait_after_open_minutes ?? 0}
                      onChange={(e) => setOrderConfig(prev => ({
                        ...prev,
                        wait_after_open_minutes: parseFloat(e.target.value) || 0
                      }))}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus-border-ring text-sm"
                      min={0}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2 md:col-span-3 xl:col-span-4 space-y-2">
                    <label className="block text-xs font-medium text-foreground">Volume Multipliers</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['Lower', 'Middle', 'Upper'].map((label, idx) => (
                        <input
                          key={idx}
                          type="number"
                          value={orderConfig.volume_multipliers[idx]}
                          onChange={(e) => {
                            const newMultipliers = [...orderConfig.volume_multipliers];
                            newMultipliers[idx] = parseFloat(e.target.value);
                            setOrderConfig(prev => ({ ...prev, volume_multipliers: newMultipliers }));
                          }}
                          className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                          step="0.01"
                          placeholder={label}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-3 xl:col-span-4">
                    <label className="block text-xs font-medium mb-1">Time in Pivot Positions</label>
                    <div className="flex flex-wrap gap-3">
                      {(['any', 'lower', 'middle', 'upper'] as const).map(position => (
                        <label key={position} className="flex items-center gap-1 text-xs bg-muted/40 px-2 py-1 rounded">
                          <input
                            type="checkbox"
                            checked={pivotPositions[position]}
                            onChange={(e) => updatePivotPositions(position, e.target.checked)}
                            className="rounded border-input text-primary focus:ring-ring h-3 w-3"
                          />
                          <span className="capitalize">{position}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Pivot Adjustment</label>
                    <select
                      value={orderConfig.pivot_adjustment}
                      onChange={(e) => setOrderConfig(prev => ({ ...prev, pivot_adjustment: e.target.value }))}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                    >
                      <option value="0.0">0.0%</option>
                      <option value="0.5">0.5%</option>
                      <option value="1.0">1.0%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Time in Pivot (s)</label>
                    <input
                      type="number"
                      value={orderConfig.time_in_pivot}
                      onChange={(e) => setOrderConfig(prev => ({ ...prev, time_in_pivot: parseInt(e.target.value) }))}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                      placeholder="seconds"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Breakout Lookback (m)</label>
                    <input
                      type="number"
                      value={orderConfig.breakout_lookback_minutes}
                      onChange={(e) => setOrderConfig(prev => ({ ...prev, breakout_lookback_minutes: parseInt(e.target.value) || 0 }))}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Lookback Exclude Recent (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={orderConfig.breakout_exclude_minutes}
                      onChange={(e) => setOrderConfig(prev => ({ ...prev, breakout_exclude_minutes: parseFloat(e.target.value) || 0 }))}
                      className="w-full p-2 border border-input bg-background text-foreground rounded-md focus:ring-2 focus:ring-ring focus:border-ring text-sm"
                      min={0}
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={startOrder}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? 'Starting Order...' : 'Start Trading Order'}
            </button>
          </div>
        )}

        {/* Trades Tab */}
        {activeTab === 'trades' && (
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h3 className="text-lg font-semibold">Add New Trade</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={clearSavedTrade}
                    className={`text-xs px-3 py-1.5 rounded-md border border-input hover:bg-muted/60 transition-shadow relative duration-200 ${flash.trade ? subtleFlashClass : ''}`}
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
                  <label className="block text-sm font-medium text-foreground mb-2">Shares</label>
                  <input
                    type="number"
                    value={newTrade.shares}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, shares: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                    step="0.001"
                    min="0.001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Risk Amount</label>
                  <input
                    type="number"
                    value={newTrade.risk_amount}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, risk_amount: parseFloat(e.target.value) }))}
                    className="w-full p-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Lower Price Range</label>
                  <input
                    type="number"
                    value={newTrade.lower_price_range}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, lower_price_range: parseFloat(e.target.value) }))}
                    className="w-full p-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Higher Price Range</label>
                  <input
                    type="number"
                    value={newTrade.higher_price_range}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, higher_price_range: parseFloat(e.target.value) }))}
                    className="w-full p-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-foreground mb-2">Sell Stops</label>
                <div className="space-y-2">
                  {newTrade.sell_stops.map((stop, index) => {
                    const mode = (stop.__ui_mode || (stop.percent_below_fill != null ? 'percent' : 'price')) as 'price' | 'percent';
                    return (
                      <div key={index} className="flex items-start gap-2 flex-wrap md:flex-nowrap">
                        <div className="w-32">
                          <label className="block text-xs text-muted-foreground mb-1">Mode</label>
                          <select
                            value={mode}
                            onChange={(e) => updateSellStop(index, '__ui_mode', e.target.value)}
                            className="w-full p-2 border border-input bg-background text-foreground rounded-lg text-xs"
                          >
                            <option value="price">Fixed Price</option>
                            <option value="percent">% Below Fill</option>
                          </select>
                        </div>
                        {mode === 'price' ? (
                          <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs text-muted-foreground mb-1">Stop Price</label>
                            <input
                              type="number"
                              value={stop.price ?? 0}
                              onChange={(e) => updateSellStop(index, 'price', parseFloat(e.target.value))}
                              className="w-full p-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                              placeholder="Price"
                              step="0.01"
                            />
                          </div>
                        ) : (
                          <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs text-muted-foreground mb-1">% Below Fill</label>
                            <input
                              type="number"
                              value={stop.percent_below_fill ?? 1}
                              onChange={(e) => updateSellStop(index, 'percent_below_fill', parseFloat(e.target.value))}
                              className="w-full p-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                              placeholder="Percent"
                              step="0.1"
                              min="0.1"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-[140px]">
                          <label className="block text-xs text-muted-foreground mb-1">Shares</label>
                          <input
                            type="number"
                            value={stop.shares}
                            onChange={(e) => updateSellStop(index, 'shares', parseFloat(e.target.value) || 0)}
                            className="w-full p-2 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                            placeholder="Shares"
                            step="0.001"
                            min="0.001"
                          />
                        </div>
                        <button
                          onClick={() => removeSellStop(index)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded mt-5"
                          disabled={newTrade.sell_stops.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    onClick={addSellStop}
                    className="w-full p-2 border-2 border-dashed border-border rounded-lg hover:border-border/80 text-muted-foreground hover:text-foreground"
                  >
                    + Add Sell Stop
                  </button>
                </div>
              </div>
              
              <button
                onClick={addTrade}
                disabled={loading}
                className="mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2 dark:bg-green-700 dark:hover:bg-green-800"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {loading ? 'Adding Trade...' : 'Add Trade'}
              </button>
            </div>
          </div>
        )}

        {/* Status Tab */}
        {activeTab === 'status' && (
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
            
            {/* Active Trades Details */}
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
                      {serverStatus.trades.map((trade) => (
                        <tr key={trade.trade_id} className="hover:bg-muted/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                            {trade.trade_id.substring(0, 8)}...
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                            {trade.ticker}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            {trade.shares.toFixed(3)} {/* Show 3 decimal places */}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            ${trade.risk_amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                            ${trade.lower_price_range.toFixed(2)} - ${trade.higher_price_range.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-sm text-foreground">
                            <div className="space-y-1">
                              {trade.sell_stops.map((stop, index) => {
                                const isPercent = stop.percent_below_fill !== undefined && stop.percent_below_fill !== null;
                                return (
                                  <div key={index} className="text-xs bg-muted px-2 py-1 rounded">
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
                            <button
                              onClick={() => deleteTrade(trade.trade_id)}
                              disabled={loading}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50 text-sm"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
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
                  <input
                    type="number"
                    value={riskAmount}
                    onChange={(e) => setRiskAmount(parseFloat(e.target.value))}
                    className="w-full p-3 border border-input bg-background text-foreground rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                    step="0.01"
                  />
                </div>
                <button
                  onClick={updateRisk}
                  disabled={loading}
                  className="bg-primary text-primary-foreground py-3 px-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                  Update Risk
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Errors Tab */}
        {activeTab === 'errors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Error Log</h3>
              <button
                onClick={() => { fetchErrors(); triggerFlash('refresh'); }}
                className={`flex items-center gap-2 px-3 py-1 bg-muted rounded-lg hover:bg-muted/80 transition-shadow duration-200 ${flash.refresh ? subtleFlashClass : ''}`}
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
            
            <div className="space-y-3">
              {errors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No errors found</p>
                </div>
              ) : (
                errors.map((error, index) => (
                  <div key={index} className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-red-700 dark:text-red-300">{error.error_type}</span>
                          <span className="text-sm text-red-600 dark:text-red-400">{error.timestamp}</span>
                        </div>
                        <p className="text-red-800 dark:text-red-200 mb-2">{error.error_message}</p>
                        {error.ticker && (
                          <p className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2 rounded">
                            Ticker: {error.ticker}
                          </p>
                        )}
                        {error.trade_data && (
                          <p className="text-sm text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 p-2 rounded mt-2">
                            Trade Data: {JSON.stringify(error.trade_data)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {/* Volume Warning Modal */}
      {showVolumeWarningModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg font-semibold text-foreground">No Volume Requirements Set</h3>
            </div>
            
            <p className="text-muted-foreground mb-6">
              You haven't set any volume requirements for the trading order. This means the order will trade without volume filters. Are you sure you want to continue?
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelStart}
                className="px-4 py-2 text-muted-foreground border border-input rounded-lg hover:bg-muted/50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStart}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              >
                Start Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}