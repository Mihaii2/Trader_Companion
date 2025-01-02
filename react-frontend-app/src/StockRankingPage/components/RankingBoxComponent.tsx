// components/RankingBoxComponent.tsx
import React, { useState } from 'react';
import type { RankingBox } from '../types';
import { useStockOperations } from '../hooks/useStockPickOperations';
import { stockPicksApi } from '../services/stockPick';
import { Alert } from '@/components/ui/alert';
import { RankingItem } from './RankingItem';

interface Props {
  box: RankingBox;
  onRemoveBox: (id: number) => void;
  onUpdateBox: (boxId: number, updatedBox: RankingBox) => void;
}

export const RankingBoxComponent: React.FC<Props> = ({
  box,
  onRemoveBox,
  onUpdateBox
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStock, setNewStock] = useState({ symbol: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    error,
    handleStockUpdate,
    handleRemoveStock,
    sortStocksByScore
  } = useStockOperations({
    onUpdateBox
  });

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStock.symbol.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await stockPicksApi.createStockPick({
        symbol: newStock.symbol.trim().toUpperCase(),
        ranking_box: box.id,
        total_score: 0
      });

      const updatedBox = {
        ...box,
        stock_picks: [...box.stock_picks, response.data]
      };

      onUpdateBox(box.id, updatedBox);
      setNewStock({ symbol: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding stock:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedStocks = sortStocksByScore(box.stock_picks);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold">{box.title}</h3>
        <button
          onClick={() => onRemoveBox(box.id)}
          className="text-red-500 hover:text-red-700"
        >
          Remove Box
        </button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          {error}
        </Alert>
      )}

      <div className="mb-4">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Stock
          </button>
        ) : (
          <form onSubmit={handleAddStock} className="space-y-2">
            <input
              type="text"
              value={newStock.symbol}
              onChange={(e) => setNewStock({ symbol: e.target.value })}
              placeholder="Enter stock symbol"
              className="w-full p-2 border rounded"
              disabled={isSubmitting}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isSubmitting || !newStock.symbol.trim()}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setNewStock({ symbol: '' });
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-4">
        {sortedStocks.map((stock) => (
          <RankingItem
            key={stock.id}
            stock={stock}
            onUpdate={(updatedStock) => handleStockUpdate(box.id, updatedStock, box)}
            onRemove={() => handleRemoveStock(box.id, stock.id, box)}
          />
        ))}
      </div>
    </div>
  );
};