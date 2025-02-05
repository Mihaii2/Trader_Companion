// src/components/TradeComponent.tsx
import React, { useState } from 'react';
import { Trade } from '../types/Trade';

interface TradeComponentProps {
  trade: Trade;  // Required since this is for existing trades
  onUpdate: (trade: Trade) => void;
  onDelete: (id: number) => void;
}

export const TradeComponent: React.FC<TradeComponentProps> = ({ 
  trade, 
  onUpdate, 
  onDelete 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTrade, setEditedTrade] = useState<Trade>(trade);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setEditedTrade(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              type === 'number' ? (value === '' ? null : Number(value)) : 
              value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(editedTrade);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTrade(trade);
    setIsEditing(false);
  };

  const renderValue = (value: Trade[keyof Trade]) => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value === null) return '-';
    return value;
  };

  if (!isEditing) {
    return (
      <div className="bg-background p-6 rounded-lg shadow-md border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(trade).map(([key, value]) => (
            <div key={key} className="mb-2">
              <span className="text-sm font-medium text-foreground">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="ml-2 text-sm text-muted-foreground">
                {renderValue(value)}
              </span>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2 mt-4">
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(trade.ID)}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-background p-6 rounded-lg shadow-md border">
      <h2 className="text-xl font-bold mb-6">Edit Trade</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(editedTrade).map(([key, value]) => {
          if (typeof value === 'boolean') {
            return (
              <div key={key} className="flex items-center">
                <input
                  type="checkbox"
                  name={key}
                  checked={value}
                  onChange={handleInputChange}
                  className="h-4 w-4 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-muted-foreground">
                  {key.replace(/_/g, ' ')}
                </span>
              </div>
            );
          }

          return (
            <div key={key} className="mb-2">
              <label className="block text-sm font-medium text-foreground mb-1">
                {key.replace(/_/g, ' ')}
              </label>
              {key === 'Entry_Date' || key === 'Exit_Date' ? (
                <input
                  type="date"
                  name={key}
                  value={value ?? ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required={key === 'Entry_Date'}
                />
              ) : (
                <input
                  type={typeof value === 'number' ? 'number' : 'text'}
                  name={key}
                  value={value ?? ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  step={key.includes('Price') ? '0.01' : '1'}
                  disabled={key === 'ID'}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 border rounded-md hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </form>
  );
};
