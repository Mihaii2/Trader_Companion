import React, { useState, useEffect } from 'react';
import { Trade } from '../types/Trade';

interface TradesTableProps {
  trades: Trade[];
  onUpdate: (updatedTrade: Trade) => void;
  onDelete: (id: number) => void;
}

export const TradesTable: React.FC<TradesTableProps> = ({
  trades,
  onUpdate,
  onDelete,
}) => {
  const [editedTrades, setEditedTrades] = useState<{ [key: number]: Trade }>({});

  // Synchronize editedTrades with incoming trades
  useEffect(() => {
    const newEditedTrades = trades.reduce((acc, trade) => ({
      ...acc,
      [trade.ID]: { ...trade }
    }), {});
    setEditedTrades(newEditedTrades);
  }, [trades]);

  const handleInputChange = (tradeId: number, field: keyof Trade, value: Trade[keyof Trade]) => {
    setEditedTrades(prev => ({
      ...prev,
      [tradeId]: {
        ...prev[tradeId],
        [field]: value
      }
    }));
  };

  const handleUpdate = (tradeId: number) => {
    const editedTrade = editedTrades[tradeId];
    if (editedTrade) {
      onUpdate(editedTrade);
    }
  };

  const renderCell = (trade: Trade, field: keyof Trade) => {
    const editedTrade = editedTrades[trade.ID];
    if (!editedTrade) return null;  // Return null if trade is not in editedTrades yet
    
    const value = editedTrade[field];
    
    if (field === 'ID') {
      return <span className="px-2">{value}</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => handleInputChange(trade.ID, field, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300"
        />
      );
    }

    if (field === 'Entry_Date' || field === 'Exit_Date') {
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => handleInputChange(trade.ID, field, e.target.value)}
          className="w-full px-2 py-1 border rounded bg-background"
        />
      );
    }

    if (typeof value === 'number') {
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => handleInputChange(trade.ID, field, Number(e.target.value))}
          className="w-full px-2 py-1 border rounded bg-background"
          step={field.includes('Price') ? '0.01' : '1'}
        />
      );
    }

    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => handleInputChange(trade.ID, field, e.target.value)}
        className="w-full px-2 py-1 border rounded bg-background"
      />
    );
  };

  // Get all fields from the first trade or return empty array if no trades
  const fields = trades.length > 0 ? Object.keys(trades[0]) as (keyof Trade)[] : [];

  if (trades.length === 0) {
    return <div className="text-center py-4">No trades available</div>;
  }

  return (
    <div className="overflow-x-auto border rounded-lg">
      <div className="max-h-96 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-gray-100">
            <tr>
              {fields.map(field => (
                <th key={field} className="px-4 py-2 text-left border-b font-medium">
                  {field.replace(/_/g, ' ')}
                </th>
              ))}
              <th className="px-4 py-2 text-left border-b font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => (
              <tr key={trade.ID} className="hover:bg-gray-50">
                {fields.map(field => (
                  <td key={field} className="px-4 py-2 border-b">
                    {renderCell(trade, field)}
                  </td>
                ))}
                <td className="px-4 py-2 border-b">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUpdate(trade.ID)}
                      className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
                    >
                      Update
                    </button>
                    <button
                      onClick={() => onDelete(trade.ID)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};