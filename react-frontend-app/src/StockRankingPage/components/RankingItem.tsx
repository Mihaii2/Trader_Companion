// components/RankingItem.tsx
import React, { useState } from 'react';
import type { StockPick } from '../types';
import { StockCharacteristicComponent } from './StockCharacteristicComponent';
import { stockCharacteristicsApi } from '../services/stockCharacteristics';
import { Alert } from '@/components/ui/alert';

interface Props {
  stock: StockPick;
  onUpdate: (updatedStock: StockPick) => void;
  onRemove: () => void;
}

export const RankingItem: React.FC<Props> = ({
  stock: initialStock,
  onUpdate,
  onRemove
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCharacteristic, setNewCharacteristic] = useState({
    name: '',
    description: '',
    score: 0,
    stock_pick: initialStock.id
  });

  const handleAddCharacteristic = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      const response = await stockCharacteristicsApi.createCharacteristic({
        stock_pick: initialStock.id,
        name: newCharacteristic.name.trim(),
        description: newCharacteristic.description.trim(),
        score: newCharacteristic.score
      });

      // Update local state
      const updatedCharacteristics = [...initialStock.characteristics, response.data];
      const updatedStock = {
        ...initialStock,
        characteristics: updatedCharacteristics,
        total_score: updatedCharacteristics.reduce(
          (sum, char) => sum + char.score, 0
        )
      };

      onUpdate(updatedStock);

      // Reset form
      setNewCharacteristic({
        name: '',
        description: '',
        score: 0,
        stock_pick: initialStock.id
      });
      setShowAddForm(false);

    } catch (err) {
      setError('Failed to add characteristic');
      console.error('Error adding characteristic:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCharacteristic = async (characteristicId: number) => {
    try {
      await stockCharacteristicsApi.deleteCharacteristic(characteristicId);

      // Update local state
      const updatedCharacteristics = initialStock.characteristics.filter(
        char => char.id !== characteristicId
      );

      const updatedStock = {
        ...initialStock,
        characteristics: updatedCharacteristics,
        total_score: updatedCharacteristics.reduce(
          (sum, char) => sum + char.score, 0
        )
      };

      onUpdate(updatedStock);
    } catch (err) {
      setError('Failed to remove characteristic');
      console.error('Error removing characteristic:', err);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <span className="font-semibold">{initialStock.symbol}</span>
          <span className="text-gray-600">Score: {initialStock.total_score}</span>
          <div className="flex gap-2">
            {initialStock.characteristics.map((char) => (
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
            onRemove();
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

          {error && (
            <Alert variant="destructive" className="mb-4">
              {error}
            </Alert>
          )}

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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
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
                    disabled={isSubmitting}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCharacteristic}
                    disabled={isSubmitting || !newCharacteristic.name.trim()}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCharacteristic({
                        name: '',
                        description: '',
                        score: 0,
                        stock_pick: initialStock.id
                      });
                    }}
                    disabled={isSubmitting}
                    className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {initialStock.characteristics.map((char) => (
            <StockCharacteristicComponent
              key={char.id}
              characteristic={char}
              onRemove={() => handleRemoveCharacteristic(char.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};