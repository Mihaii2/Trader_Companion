import React, { useState, useEffect } from 'react';
import { Play, Square, Plus, Eye, AlertCircle, DollarSign, RefreshCw, Trash2 } from 'lucide-react';

interface Trade {
  id: string;
  ticker: string;
  shares: number;
  risk_amount: number;
  lower_price_range: number;
  higher_price_range: number;
  sell_stops: Array<{ price: number; shares: number }>;
  timestamp: string;
  status: string;
}

interface BotConfig {
  ticker: string;
  lower_price: number;
  higher_price: number;
  volume_requirements: string[];
  pivot_adjustment: string;
  recent_interval: number;
  historical_interval: number;
  momentum_increase: number;
  day_high_max_percent_off: number;
  time_in_pivot: number;
  time_in_pivot_positions: string;
  data_server: string;
  trade_server: string;
}

interface ServerStatus {
  success: boolean;
  active_trades: number;
  available_risk: number;
  server_uptime: string;
  last_trade_time: string;
}

interface ErrorLog {
  timestamp: string;
  error: string;
  details: string;
}

export function TradingBotPage() {
  const [activeTab, setActiveTab] = useState<'bot' | 'trades' | 'status' | 'errors'>('bot');
  const [botConfig, setBotConfig] = useState<BotConfig>({
    ticker: '',
    lower_price: 0,
    higher_price: 0,
    volume_requirements: [],
    pivot_adjustment: '0.5',
    recent_interval: 20,
    historical_interval: 600,
    momentum_increase: 0.05,
    day_high_max_percent_off: 0.5,
    time_in_pivot: 0,
    time_in_pivot_positions: '',
    data_server: 'http://localhost:5001',
    trade_server: 'http://localhost:5002'
  });
  
  const [newTrade, setNewTrade] = useState({
    ticker: '',
    shares: 0,
    risk_amount: 0,
    lower_price_range: 0,
    higher_price_range: 0,
    sell_stops: [{ price: 0, shares: 0 }]
  });
  
  const [trades, setTrades] = useState<Trade[]>([]);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [newVolumeReq, setNewVolumeReq] = useState('');
  const [riskAmount, setRiskAmount] = useState(0);

  // API calls
  const startBot = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5003/start_bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(botConfig)
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Bot started successfully!');
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Network error: ${error}`);
    } finally {
      setLoading(false);
    }
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
        alert('Trade added successfully!');
        setNewTrade({
          ticker: '',
          shares: 0,
          risk_amount: 0,
          lower_price_range: 0,
          higher_price_range: 0,
          sell_stops: [{ price: 0, shares: 0 }]
        });
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

  const addVolumeRequirement = () => {
    if (newVolumeReq.trim()) {
      setBotConfig(prev => ({
        ...prev,
        volume_requirements: [...prev.volume_requirements, newVolumeReq.trim()]
      }));
      setNewVolumeReq('');
    }
  };

  const removeVolumeRequirement = (index: number) => {
    setBotConfig(prev => ({
      ...prev,
      volume_requirements: prev.volume_requirements.filter((_, i) => i !== index)
    }));
  };

  const addSellStop = () => {
    setNewTrade(prev => ({
      ...prev,
      sell_stops: [...prev.sell_stops, { price: 0, shares: 0 }]
    }));
  };

  const removeSellStop = (index: number) => {
    setNewTrade(prev => ({
      ...prev,
      sell_stops: prev.sell_stops.filter((_, i) => i !== index)
    }));
  };

  const updateSellStop = (index: number, field: 'price' | 'shares', value: number) => {
    setNewTrade(prev => ({
      ...prev,
      sell_stops: prev.sell_stops.map((stop, i) => 
        i === index ? { ...stop, [field]: value } : stop
      )
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

  const TabButton = ({ tab, label, icon: Icon }: { tab: string; label: string; icon: any }) => (
    <button
      onClick={() => setActiveTab(tab as any)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        activeTab === tab
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Trading Bot Management</h1>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6">
          <TabButton tab="bot" label="Bot Config" icon={Play} />
          <TabButton tab="trades" label="Trades" icon={Plus} />
          <TabButton tab="status" label="Status" icon={Eye} />
          <TabButton tab="errors" label="Errors" icon={AlertCircle} />
        </div>

        {/* Bot Configuration Tab */}
        {activeTab === 'bot' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ticker</label>
                <input
                  type="text"
                  value={botConfig.ticker}
                  onChange={(e) => setBotConfig(prev => ({ ...prev, ticker: e.target.value }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="AAPL"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lower Price</label>
                <input
                  type="number"
                  value={botConfig.lower_price}
                  onChange={(e) => setBotConfig(prev => ({ ...prev, lower_price: parseFloat(e.target.value) }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Higher Price</label>
                <input
                  type="number"
                  value={botConfig.higher_price}
                  onChange={(e) => setBotConfig(prev => ({ ...prev, higher_price: parseFloat(e.target.value) }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pivot Adjustment</label>
                <select
                  value={botConfig.pivot_adjustment}
                  onChange={(e) => setBotConfig(prev => ({ ...prev, pivot_adjustment: e.target.value }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="0.5">0.5%</option>
                  <option value="1.0">1.0%</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recent Interval (seconds)</label>
                <input
                  type="number"
                  value={botConfig.recent_interval}
                  onChange={(e) => setBotConfig(prev => ({ ...prev, recent_interval: parseInt(e.target.value) }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Historical Interval (seconds)</label>
                <input
                  type="number"
                  value={botConfig.historical_interval}
                  onChange={(e) => setBotConfig(prev => ({ ...prev, historical_interval: parseInt(e.target.value) }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Momentum Increase</label>
                <input
                  type="number"
                  value={botConfig.momentum_increase}
                  onChange={(e) => setBotConfig(prev => ({ ...prev, momentum_increase: parseFloat(e.target.value) }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Day High Max % Off</label>
                <input
                  type="number"
                  value={botConfig.day_high_max_percent_off}
                  onChange={(e) => setBotConfig(prev => ({ ...prev, day_high_max_percent_off: parseFloat(e.target.value) }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.01"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time in Pivot (seconds)</label>
                <input
                  type="number"
                  value={botConfig.time_in_pivot}
                  onChange={(e) => setBotConfig(prev => ({ ...prev, time_in_pivot: parseInt(e.target.value) }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time in Pivot Positions</label>
              <input
                type="text"
                value={botConfig.time_in_pivot_positions}
                onChange={(e) => setBotConfig(prev => ({ ...prev, time_in_pivot_positions: e.target.value }))}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="all,bottom,lower,middle,upper,upper_half,middle_upper"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Volume Requirements</label>
              <div className="space-y-2">
                {botConfig.volume_requirements.map((req, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="flex-1 p-2 bg-gray-50 rounded">{req}</span>
                    <button
                      onClick={() => removeVolumeRequirement(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVolumeReq}
                    onChange={(e) => setNewVolumeReq(e.target.value)}
                    className="flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="minutes=volume or day=2000"
                  />
                  <button
                    onClick={addVolumeRequirement}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Server</label>
                <input
                  type="text"
                  value={botConfig.data_server}
                  onChange={(e) => setBotConfig(prev => ({ ...prev, data_server: e.target.value }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trade Server</label>
                <input
                  type="text"
                  value={botConfig.trade_server}
                  onChange={(e) => setBotConfig(prev => ({ ...prev, trade_server: e.target.value }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <button
              onClick={startBot}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {loading ? 'Starting Bot...' : 'Start Trading Bot'}
            </button>
          </div>
        )}

        {/* Trades Tab */}
        {activeTab === 'trades' && (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Add New Trade</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ticker</label>
                  <input
                    type="text"
                    value={newTrade.ticker}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, ticker: e.target.value }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Shares</label>
                  <input
                    type="number"
                    value={newTrade.shares}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, shares: parseInt(e.target.value) }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Risk Amount</label>
                  <input
                    type="number"
                    value={newTrade.risk_amount}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, risk_amount: parseFloat(e.target.value) }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lower Price Range</label>
                  <input
                    type="number"
                    value={newTrade.lower_price_range}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, lower_price_range: parseFloat(e.target.value) }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Higher Price Range</label>
                  <input
                    type="number"
                    value={newTrade.higher_price_range}
                    onChange={(e) => setNewTrade(prev => ({ ...prev, higher_price_range: parseFloat(e.target.value) }))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Sell Stops</label>
                <div className="space-y-2">
                  {newTrade.sell_stops.map((stop, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="number"
                        value={stop.price}
                        onChange={(e) => updateSellStop(index, 'price', parseFloat(e.target.value))}
                        className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Price"
                        step="0.01"
                      />
                      <input
                        type="number"
                        value={stop.shares}
                        onChange={(e) => updateSellStop(index, 'shares', parseInt(e.target.value))}
                        className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Shares"
                      />
                      <button
                        onClick={() => removeSellStop(index)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        disabled={newTrade.sell_stops.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addSellStop}
                    className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-gray-400 text-gray-600 hover:text-gray-800"
                  >
                    + Add Sell Stop
                  </button>
                </div>
              </div>
              
              <button
                onClick={addTrade}
                disabled={loading}
                className="mt-4 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
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
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="w-5 h-5 text-blue-600" />
                      <h3 className="font-semibold text-blue-800">Active Trades</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{serverStatus.active_trades}</p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-green-800">Available Risk</h3>
                    </div>
                    <p className="text-2xl font-bold text-green-600">${serverStatus.available_risk}</p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <RefreshCw className="w-5 h-5 text-purple-600" />
                      <h3 className="font-semibold text-purple-800">Server Uptime</h3>
                    </div>
                    <p className="text-lg font-bold text-purple-600">{serverStatus.server_uptime}</p>
                  </div>
                  
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Play className="w-5 h-5 text-orange-600" />
                      <h3 className="font-semibold text-orange-800">Last Trade</h3>
                    </div>
                    <p className="text-sm font-medium text-orange-600">{serverStatus.last_trade_time || 'Never'}</p>
                  </div>
                </>
              )}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Update Risk Amount</h3>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Risk Amount</label>
                  <input
                    type="number"
                    value={riskAmount}
                    onChange={(e) => setRiskAmount(parseFloat(e.target.value))}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    step="0.01"
                  />
                </div>
                <button
                  onClick={updateRisk}
                  disabled={loading}
                  className="bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
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
                onClick={fetchErrors}
                className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
            
            <div className="space-y-3">
              {errors.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No errors found</p>
                </div>
              ) : (
                errors.map((error, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-red-800">Error</span>
                          <span className="text-sm text-red-600">{error.timestamp}</span>
                        </div>
                        <p className="text-red-700 mb-2">{error.error}</p>
                        {error.details && (
                          <p className="text-sm text-red-600 bg-red-100 p-2 rounded">{error.details}</p>
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
    </div>
  );
}