import React, { useState } from 'react';
import { RankingItem } from '../../types/rankingList';
import { useBanStock } from '../../hooks/useBanStock';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RankingListItemProps {
  rankingData: RankingItem;
}

export const RankingItemComponent: React.FC<RankingListItemProps> = ({ 
  rankingData
}) => {
  const [showBanModal, setShowBanModal] = useState(false);
  const [banDuration, setBanDuration] = useState(1);
  const { banStocks, isLoading, error } = useBanStock();

  const handleAddToPersonal = async () => {
    try {
      console.log(`Adding ${rankingData.Symbol} to personal list`);
    } catch (error) {
      console.error('Error adding to personal list:', error);
    }
  };

  const handleBanStock = async (duration?: number) => {
    try {
      const monthsToBan = duration || banDuration;
      await banStocks([{ ticker: rankingData.Symbol, duration: monthsToBan }]);
      setShowBanModal(false);
      setBanDuration(1);
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
      <div className="flex items-center border rounded bg-background text-sm">
        {/* Symbol Section */}
        <div className="flex-none w-24 px-2 py-1 border-r">
          <span className="font-medium">{rankingData.Symbol}</span>
        </div>

        {/* Price Increase Column */}
        <div className="flex-none w-20 px-2 py-1 text-center border-r group relative">
          <div className="invisible group-hover:visible absolute -top-6 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-1.5 py-0.5 rounded text-xs whitespace-nowrap z-10">
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
          <div className="invisible group-hover:visible absolute -top-6 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-1.5 py-0.5 rounded text-xs whitespace-nowrap z-10">
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
              <div className="invisible group-hover:visible absolute -top-6 left-1/2 transform -translate-x-1/2 bg-popover text-popover-foreground px-1.5 py-0.5 rounded text-xs whitespace-nowrap z-10">
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
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-2 py-0.5 rounded text-xs"
          >
            Add
          </button>
          <button
            onClick={() => setShowBanModal(true)}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-2 py-0.5 rounded text-xs"
          >
            Ban
          </button>
        </div>
      </div>

      {/* Ban Modal */}
      {showBanModal && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <div className="bg-card text-foreground p-4 rounded-lg w-80">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mb-4">
              <label className="block text-sm mb-2 text-foreground">
                Ban {rankingData.Symbol} for {banDuration} {banDuration === 1 ? 'month' : 'months'}
              </label>
              <input
                type="number"
                value={banDuration}
                onChange={handleBanDurationChange}
                min="1"
                className="w-full p-2 border rounded bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-ring"
                disabled={isLoading}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 3, 6].map((months) => (
                <button
                  key={months}
                  onClick={() => setBanDuration(months)}
                  className="bg-muted hover:bg-muted/90 p-2 rounded text-sm text-foreground disabled:opacity-50"
                  disabled={isLoading}
                >
                  {months} {months === 1 ? 'Month' : 'Months'}
                </button>
              ))}
            </div>

            <div className="flex space-x-2">
              <button
                onClick={() => handleBanStock()}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground p-2 rounded text-sm disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Banning...' : 'Ban Stock'}
              </button>
              <button
                onClick={() => {
                  setShowBanModal(false);
                  setBanDuration(1);
                }}
                className="flex-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground p-2 rounded text-sm disabled:opacity-50"
                disabled={isLoading}
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