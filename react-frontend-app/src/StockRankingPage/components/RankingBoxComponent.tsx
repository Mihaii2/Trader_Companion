// src/components/RankingBox.tsx
import React, { useState } from 'react';
import { RankingItem } from './RankingItem';
import { RankingBox } from '../types';

interface Props {
  box: RankingBox;
  onRemoveBox: (id: number) => void;
}

export const RankingBoxComponent: React.FC<Props> = ({
  box,
  onRemoveBox
}) => {
  const [newSymbol, setNewSymbol] = useState('');

  const handleAddStock = () => {
    if (newSymbol.trim()) {
      console.log('Adding stock', newSymbol);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">{box.title}</h3>
        <button
          onClick={() => onRemoveBox(box.id)}
          className="text-red-500 hover:text-red-700"
        >
          Remove Box
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newSymbol}
          onChange={(e) => setNewSymbol(e.target.value)}
          placeholder="Enter stock symbol"
          className="px-3 py-2 border rounded flex-1"
        />
        <button
          onClick={handleAddStock}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Stock
        </button>
      </div>

      <div className="space-y-4">
        {box.stock_picks
          .sort((a, b) => b.total_score - a.total_score)
          .map((stock) => (
            <RankingItem
              key={stock.id}
              stock={stock}
            />
          ))}
      </div>
    </div>
  );
};