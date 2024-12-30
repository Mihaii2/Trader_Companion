import React, { useState } from 'react';
import { ScreeningOptions } from '../../types/screenerCommander';
import { useStockScreener } from '../../hooks/useStockScreener';

const OBLIGATORY_SCREEN_OPTIONS = [
  { id: 'above_52week_low', label: 'Above 52 Week Low' },
  { id: 'trending_up', label: 'Trending Up' },
  { id: 'close_to_52week_high', label: 'Close to 52 Week High' },
];

const RANKING_SCREEN_OPTIONS = [
  { id: 'annual_EPS_acceleration', label: 'Annual EPS Acceleration' },
  { id: 'quarterly_EPS_acceleration', label: 'Quarterly EPS Acceleration' },
  { id: 'top_price_increases_1y', label: 'Top Price Increases (1Y)' },
  { id: 'price_spikes', label: 'Price Spikes' },
  { id: 'rs_over_70', label: 'RS Over 70' }
];

export const StocksScreenerCommander: React.FC = () => {
  const { response, loading, error, sendCommand } = useStockScreener();

  const [options, setOptions] = useState<ScreeningOptions>({
    min_price_increase: 400,
    ranking_method: 'price',
    fetch_data: false,
    top_n: 30,
    obligatory_screens: ['above_52week_low', 'trending_up'],
    ranking_screens: ['annual_EPS_acceleration', 'quarterly_EPS_acceleration', 'top_price_increases_1y', 'price_spikes', 'rs_over_70'],
    skip_obligatory: false,
    skip_sentiment: false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendCommand(options);
  };

  const handleObligatoryScreenChange = (screenId: string) => {
    setOptions(prev => ({
      ...prev,
      obligatory_screens: prev.obligatory_screens.includes(screenId)
        ? prev.obligatory_screens.filter(id => id !== screenId)
        : [...prev.obligatory_screens, screenId]
    }));
  };

  const handleRankingScreenChange = (screenId: string) => {
    setOptions(prev => ({
      ...prev,
      ranking_screens: prev.ranking_screens.includes(screenId)
        ? prev.ranking_screens.filter(id => id !== screenId)
        : [...prev.ranking_screens, screenId]
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-white rounded-lg shadow">
      {/* Global Settings Section */}
      <div className="flex flex-col space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Global Settings</h3>
        <div className="flex space-x-6">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              checked={!options.skip_obligatory}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                skip_obligatory: !e.target.checked
              }))}
            />
            <span className="ml-2 text-sm text-gray-600">Enable Obligatory Screens</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              checked={!options.skip_sentiment}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                skip_sentiment: !e.target.checked
              }))}
            />
            <span className="ml-2 text-sm text-gray-600">Enable Sentiment Analysis</span>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              checked={options.fetch_data}
              onChange={(e) => setOptions(prev => ({
                ...prev,
                fetch_data: e.target.checked
              }))}
            />
            <span className="ml-2 text-sm text-gray-600">Fetch Latest Data</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Ranking Criteria
          </label>
          <select 
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={options.ranking_method}
            onChange={(e) => setOptions({
              ...options,
              ranking_method: e.target.value as ScreeningOptions['ranking_method']
            })}
          >
            <option value="PRICE_INCREASE">Price Increase</option>
            <option value="SCREENERS_COUNT">Number of Screeners</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Price Increase (%)
          </label>
          <input
            type="number"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={options.min_price_increase}
            onChange={(e) => setOptions({
              ...options,
              min_price_increase: parseFloat(e.target.value)
            })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Top N Results
          </label>
          <input
            type="number"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={options.top_n}
            onChange={(e) => setOptions({
              ...options,
              top_n: parseInt(e.target.value)
            })}
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Obligatory Screens
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {OBLIGATORY_SCREEN_OPTIONS.map(screen => (
              <label key={screen.id} className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  checked={options.obligatory_screens.includes(screen.id)}
                  onChange={() => handleObligatoryScreenChange(screen.id)}
                  disabled={options.skip_obligatory}
                />
                <span className="ml-2 text-sm text-gray-600">{screen.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Ranking Screens
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {RANKING_SCREEN_OPTIONS.map(screen => (
              <label key={screen.id} className="inline-flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  checked={options.ranking_screens.includes(screen.id)}
                  onChange={() => handleRankingScreenChange(screen.id)}
                />
                <span className="ml-2 text-sm text-gray-600">{screen.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Start Screening'}
      </button>

      {response && (
        <div className="bg-blue-50 text-blue-600 p-4 rounded">
          {response}
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded">
          {error}
        </div>
      )}
    </form>
  );
};

export default StocksScreenerCommander;