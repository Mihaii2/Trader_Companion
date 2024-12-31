import React, { useState } from 'react';
import { RankingItem } from '../../types/rankingList';

interface RankingListItemProps {
  rankingData: RankingItem;
}

export const RankingItemComponent: React.FC<RankingListItemProps> = ({ rankingData }) => {
  const [showBanModal, setShowBanModal] = useState(false);

  const handleAddToPersonal = async () => {
    try {
      console.log(`Adding ${rankingData.Symbol} to personal list`);
    } catch (error) {
      console.error('Error adding to personal list:', error);
    }
  };

  const handleBanStock = async (duration?: number) => {
    try {
      console.log(`Banning ${rankingData.Symbol} for ${duration} days`);
      setShowBanModal(false);
    } catch (error) {
      console.error('Error banning stock:', error);
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
            {rankingData['Price Increase'] === null || rankingData['Price Increase'] === undefined 
              ? '-' 
              : typeof rankingData['Price Increase'] === 'number'
                ? rankingData['Price Increase'].toFixed(2)
                : rankingData['Price Increase'].toString()
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
          {screenerFields.map(([key, value], ) => (
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
          <div className="bg-white p-4 rounded-lg w-64">
            <h3 className="text-lg font-medium mb-4">Ban {rankingData.Symbol}</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleBanStock(1)}
                className="w-full bg-gray-100 hover:bg-gray-200 p-2 rounded"
              >
                1 Day
              </button>
              <button
                onClick={() => handleBanStock(7)}
                className="w-full bg-gray-100 hover:bg-gray-200 p-2 rounded"
              >
                7 Days
              </button>
              <button
                onClick={() => handleBanStock(30)}
                className="w-full bg-gray-100 hover:bg-gray-200 p-2 rounded"
              >
                30 Days
              </button>
              <button
                onClick={() => setShowBanModal(false)}
                className="w-full bg-red-500 hover:bg-red-600 text-white p-2 rounded mt-4"
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