import React, { useState } from 'react';
import { Stock } from '../../types/screenerCommander';
// import { BanStockModal } from './BanStockModal';

interface StockItemProps {
  stock: Stock;
  onAddToPersonal: (ticker: string) => void;
  onBanStock: (ticker: string, duration: number) => void;
}

export const StockItem: React.FC<StockItemProps> = ({
  stock,
  onAddToPersonal,
  onBanStock,
}) => {
  const [showBanModal, setShowBanModal] = useState(false);

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div>
        <h3 className="font-medium">{stock.ticker}</h3>
        <p className="text-sm text-gray-500">
          Price Increase: {stock.priceIncrease}% | Screeners: {stock.screenersCount}
        </p>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => onAddToPersonal(stock.ticker)}
          className="bg-green-500 text-white px-3 py-1 rounded"
        >
          Add to Personal
        </button>
        <button
          onClick={() => setShowBanModal(true)}
          className="bg-red-500 text-white px-3 py-1 rounded"
        >
          Ban
        </button>
      </div>

      {/* {showBanModal && (
        <BanStockModal
          ticker={stock.ticker}
          onConfirm={(duration) => {
            onBanStock(stock.ticker, duration);
            setShowBanModal(false);
          }}
          onClose={() => setShowBanModal(false)}
        />
      )} */}
    </div>
  );
};