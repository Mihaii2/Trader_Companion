// src/components/ConfigurationBox.tsx
import React from 'react';

interface Props {
  columnCount: number;
  onColumnCountChange: (count: number) => void;
}

export const ConfigurationBox: React.FC<Props> = ({ columnCount, onColumnCountChange }) => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">Layout Configuration</h2>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((count) => (
          <button
            key={count}
            onClick={() => onColumnCountChange(count)}
            className={`px-4 py-2 rounded ${
              columnCount === count
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {count} {count === 1 ? 'Column' : 'Columns'}
          </button>
        ))}
      </div>
    </div>
  );
};