import React, { useState } from 'react';
import { RankingItem } from '../../types/rankingList';

interface RankingListItemProps {
  rankingData: RankingItem;
}

export const RankingItemComponent: React.FC<RankingListItemProps> = ({ rankingData }) => {
  const [showBanModal, setShowBanModal] = useState(false);
  const [banDuration, setBanDuration] = useState(30); // Default 30 days

  const handleAddToPersonal = async () => {
    try {
      console.log(`Adding ${rankingData.Symbol} to personal list`);
    } catch (error) {
      console.error('Error adding to personal list:', error);
    }
  };

  const handleBanStock = async (duration?: number) => {
    try {
      const daysToban = duration || banDuration;
      console.log(`Banning ${rankingData.Symbol} for ${daysToban} days`);
      setShowBanModal(false);
      setBanDuration(30); // Reset to default after ban
    } catch (error) {
      console.error('Error banning stock:', error);
    }
  };

  const handleBanDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setBanDuration(value);
    }
  };

  const screenerFields = Object.entries(rankingData)
    .filter(([key]) => !['Symbol', 'Screeners', 'Price Increase'].includes(key));

  return (
    <div className="w-full">
      <div className="flex items-center border rounded bg-white text-sm">
        {/* Symbol Section */}
        <div className="flex-none w-24 px-2 py-1 border-r">
          <span className="font-medium">{rankingData.Symbol}</span>
        </div>

        {/* Price Increase Column */}
        <div className="flex-none w-20 px-2 py-1 text-center border-r group relative">
          <div className="invisible group-hover:visible absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap z-10">
            Price Increase
          </div>
          <span>
            {rankingData.Price_Increase_Percentage === null || rankingData.Price_Increase_Percentage === undefined 
              ? '-' 
              : typeof rankingData.Price_Increase_Percentage === 'number'
                ? rankingData.Price_Increase_Percentage.toFixed(2)
                : rankingData.Price_Increase_Percentage.toString()
            }
          </span>
        </div>

        {/* Screeners Count */}
        <div className="flex-none w-16 px-2 py-1 text-center border-r group relative">
          <div className="invisible group-hover:visible absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap z-10">
            Screeners
          </div>
          <span>
            {rankingData.Screeners}
          </span>
        </div>

        {/* Remaining Screener Fields Section */}
        <div className="flex-1 flex">
          {screenerFields.map(([key, value]) => (
            <div key={key} className="flex-1 px-2 py-1 text-center border-r last:border-r-0 group relative">
              <div className="invisible group-hover:visible absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-1.5 py-0.5 rounded text-xs whitespace-nowrap z-10">
                {key}
              </div>
              <span>
                {value === null || value === undefined 
                  ? '-' 
                  : typeof value === 'number' 
                    ? value.toFixed(2) 
                    : value.toString()
                }
              </span>
            </div>
          ))}
        </div>

        {/* Actions Section */}
        <div className="flex-none w-28 px-2 py-1 border-l flex justify-end space-x-1">
          <button
            onClick={handleAddToPersonal}
            className="bg-green-500 hover:bg-green-600 text-white px-2 py-0.5 rounded text-xs"
          >
            Add
          </button>
          <button
            onClick={() => setShowBanModal(true)}
            className="bg-red-500 hover:bg-red-600 text-white px-2 py-0.5 rounded text-xs"
          >
            Ban
          </button>
        </div>
      </div>

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg w-80">
            {/* Custom duration input */}
            <div className="mb-4">
              <label className="block text-sm mb-2">
                Ban {rankingData.Symbol} for {banDuration} days
              </label>
              <input
                type="number"
                value={banDuration}
                onChange={handleBanDurationChange}
                min="1"
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Quick select buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button
                onClick={() => setBanDuration(30)}
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm"
              >
                30 Days
              </button>
              <button
                onClick={() => setBanDuration(90)}
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm"
              >
                90 Days
              </button>
              <button
                onClick={() => setBanDuration(180)}
                className="bg-gray-100 hover:bg-gray-200 p-2 rounded text-sm"
              >
                180 Days
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleBanStock()}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white p-2 rounded text-sm"
              >
                Ban Stock
              </button>
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanDuration(30); // Reset to default when closing
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 p-2 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RankingItemComponent;