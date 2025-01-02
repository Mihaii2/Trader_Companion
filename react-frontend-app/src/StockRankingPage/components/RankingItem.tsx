import React, { useState } from 'react';
import type { StockPick, StockCharacteristic } from '../types';
import { StockCharacteristicComponent } from './StockCharacteristicComponent';

interface Props {
  stock: StockPick;
}

export const RankingItem: React.FC<Props> = ({
  stock: initialStock
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [stock, setStock] = useState<StockPick>(initialStock);
  const [newCharacteristic, setNewCharacteristic] = useState({
    name: '',
    description: '',
    score: 0,
    stock_pick: stock.id  // Added to match backend schema
  });

  const handleAddCharacteristic = () => {
    const characteristic: StockCharacteristic = {
      id: Math.max(0, ...stock.characteristics.map(c => c.id)) + 1,
      ...newCharacteristic,
      stock_pick: stock.id  // Ensure stock_pick is set
    };

    // Create new stock state with the added characteristic
    setStock(prevStock => {
      const updatedStock = {
        ...prevStock,
        characteristics: [...prevStock.characteristics, characteristic],
        // Recalculate total_score as the sum of all characteristic scores
        total_score: prevStock.characteristics.reduce((sum, char) => sum + char.score, 0) + characteristic.score
      };
      return updatedStock;
    });

    // Reset form
    setNewCharacteristic({ 
      name: '', 
      description: '', 
      score: 0,
      stock_pick: stock.id 
    });
    setShowAddForm(false);
  };

  return (
    <div className="border rounded-lg p-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <span className="font-semibold">{stock.symbol}</span>
          <span className="text-gray-600">Score: {stock.total_score}</span>
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
            console.log('Removing stock', stock.symbol);
          }}
          className="text-red-500 hover:text-red-700"
        >
          Remove
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 pl-4 border-l-2 border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">Characteristics</h4>
            {!showAddForm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Add Characteristic
              </button>
            )}
          </div>

          {showAddForm && (
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    type="text"
                    value={newCharacteristic.name}
                    onChange={(e) => setNewCharacteristic(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={newCharacteristic.description}
                    onChange={(e) => setNewCharacteristic(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Score</label>
                  <input
                    type="number"
                    value={newCharacteristic.score}
                    onChange={(e) => setNewCharacteristic(prev => ({
                      ...prev,
                      score: Number(e.target.value)
                    }))}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCharacteristic}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCharacteristic({ 
                        name: '', 
                        description: '', 
                        score: 0,
                        stock_pick: stock.id 
                      });
                    }}
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {stock.characteristics.map((char) => (
            <StockCharacteristicComponent
              key={char.id}
              characteristic={char}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default RankingItem;