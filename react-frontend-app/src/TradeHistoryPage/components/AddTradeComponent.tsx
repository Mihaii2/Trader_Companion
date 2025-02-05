// src/components/AddTradeComponent.tsx

import React, { useState } from 'react';
import { Trade } from '../types/Trade';

interface AddTradeComponentProps {
  trade?: Trade;  // Make trade optional since it's not always provided
  onAdd?: (trade: Trade) => void;  // Make onAdd optional 
  onUpdate?: (trade: Trade) => void;  // Add onUpdate
  onDelete?: (id: number) => void;  // Add onDelete
}

export const AddTradeComponent: React.FC<AddTradeComponentProps> = ({ 
  trade, 
  onAdd, 
  onUpdate, 
  onDelete 
}) => {
  const initialTrade: Trade = {
    ID: 0,
    Ticker: '',
    Status: '',
    Entry_Date: new Date().toISOString().split('T')[0],
    Exit_Date: null,
    Entry_Price: 0,
    Exit_Price: null,
    Pattern: '',
    Days_In_Pattern_Before_Entry: 0,
    Price_Tightness_1_Week_Before: 0,
    Exit_Reason: '',
    Market_Condition: '',
    Category: '',
    Earnings_Quality: 0,
    Fundamentals_Quality: false,
    Has_Earnings_Acceleration: false,
    Has_Catalyst: false,
    Earnings_Last_Q_20_Pct: false,
    IPO_Last_10_Years: false,
    Nr_Bases: 0,
    Volume_Confirmation: false,
    Is_BioTech: false,
    Earnings_Surprises: false,
    Expanding_Margins: false,
    EPS_breakout: false,
    Strong_annual_EPS: false,
    Signs_Acceleration_Will_Continue: false,
    Sudden_Growth_Change: false,
    Strong_Quarterly_And_Yearly_Sales: false,
    Positive_Analysts_Revisions: false,
    Ownership_Pct_Change_Past_Earnings: false,
    Quarters_With_75pct_Surprise: false,
    Over_10_pct_Avg_Surprise: false,
  };

  const [isEditing, setIsEditing] = useState(!!trade);
  const [newTrade, setNewTrade] = useState<Trade>(trade || initialTrade);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setNewTrade(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              type === 'number' ? (value === '' ? null : Number(value)) : 
              value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trade && onUpdate) {
      onUpdate(newTrade);
      setIsEditing(false);
    } else if (onAdd) {
      onAdd(newTrade);
      setNewTrade(initialTrade);
    }
  };

  const handleCancel = () => {
    if (trade) {
      setNewTrade(trade);
      setIsEditing(false);
    }
  };

  const renderValue = (key: keyof Trade, value: any) => {
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    if (value === null) return '-';
    return value;
  };

  if (trade && !isEditing) {
    return (
      <div className="bg-background p-6 rounded-lg shadow-md border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(trade).map(([key, value]) => (
            <div key={key} className="mb-2">
              <span className="text-sm font-medium text-foreground">
                {key.replace(/_/g, ' ')}:
              </span>
              <span className="ml-2 text-sm text-muted-foreground">
                {renderValue(key as keyof Trade, value)}
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
          {onDelete && (
            <button
              onClick={() => onDelete(trade.ID)}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-background p-6 rounded-lg shadow-md border">
      <h2 className="text-xl font-bold mb-6">{trade ? 'Edit Trade' : 'Add New Trade'}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(newTrade).map(([key, value]) => {
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
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end space-x-2 mt-4">
        {trade && (
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {trade ? 'Save' : 'Add Trade'}
        </button>
      </div>
    </form>
  );
};
