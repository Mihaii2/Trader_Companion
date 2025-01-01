// src/components/RankingItem.tsx
import React, { useState } from 'react';
import type { StockPick, StockCharacteristic } from '../types';

interface Props {
  stock: StockPick;
}

export const RankingItem: React.FC<Props> = ({
  stock
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border rounded-lg p-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <span className="font-semibold">{stock.symbol}</span>
          <span className="text-gray-600">Score: {stock.totalScore}</span>
          <div className="flex gap-2">
            {stock.characteristics.map((char) => (
              <span
                key={char.id}
                className="px-2 py-1 bg-gray-100 rounded text-sm"
              >
                {char.name}
              </span>
            ))}
          </div>
        </div>
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log('Removing', stock.symbol);}}
          className="text-red-500 hover:text-red-700"
        >
          Remove
          </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pl-4 border-l-2 border-gray-200">
          <h4 className="font-medium mb-2">Characteristics</h4>
          {stock.characteristics.map((char) => (
            <div key={char.id} className="mb-2">
              <div className="flex justify-between">
                <span className="font-medium">{char.name}</span>
                <span>Score: {char.score}</span>
              </div>
              <p className="text-gray-600 text-sm">{char.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};