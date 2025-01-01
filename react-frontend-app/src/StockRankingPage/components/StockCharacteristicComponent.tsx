import React from 'react';
import type { StockCharacteristic } from '../types';

interface Props {
  characteristic: StockCharacteristic;
}

export const StockCharacteristicComponent: React.FC<Props> = ({
  characteristic,
}) => {
  return (
    <div className="mb-2">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="flex justify-between">
            <span className="font-medium">{characteristic.name}</span>
            <span>Score: {characteristic.score}</span>
          </div>
          <p className="text-gray-600 text-sm">{characteristic.description}</p>
        </div>
        <button
          onClick={() => console.log('Removing characteristic', characteristic.name)}
          className="ml-4 text-red-500 hover:text-red-700"
          aria-label={`Remove ${characteristic.name} characteristic`}
        >
          ×
        </button>
      </div>
    </div>
  );
};