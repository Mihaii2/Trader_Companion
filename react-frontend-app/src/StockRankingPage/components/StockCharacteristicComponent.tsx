// components/StockCharacteristicComponent.tsx
import React from 'react';
import type { StockCharacteristic } from '../types';
import { X } from 'lucide-react';

interface Props {
  characteristic: StockCharacteristic;
  onRemove: () => void;
}

export const StockCharacteristicComponent: React.FC<Props> = ({
  characteristic,
  onRemove,
}) => {
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex justify-between">
            <span className="font-medium">{characteristic.name}</span>
            <span className="text-gray-600">Score: {characteristic.score}</span>
          </div>
          {characteristic.description && (
            <p className="text-gray-600 text-sm mt-1">{characteristic.description}</p>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-4 p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-100"
          aria-label={`Remove ${characteristic.name} characteristic`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};