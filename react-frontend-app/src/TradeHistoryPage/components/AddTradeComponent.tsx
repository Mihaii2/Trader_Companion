import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trade } from '../types/Trade';
import { AxiosError } from 'axios';

interface AddTradeComponentProps {
  onAdd: (trade: Trade) => Promise<void>;
}

export const AddTradeComponent: React.FC<AddTradeComponentProps> = ({ onAdd }) => {
  const initialTrade: Trade = {
    ID: 0,
    Ticker: '',
    Status: '',
    Entry_Date: new Date().toISOString().split('T')[0],
    Exit_Date: null,
    Entry_Price: 0,
    Return: 0,
    Exit_Price: 0,
    Pattern: '',
    // Days_In_Pattern_Before_Entry: 0,
    Price_Tightness_1_Week_Before: 0,
    Exit_Reason: '',
    Market_Condition: '',
    Category: '',
    // Earnings_Quality: 0,
    Nr_Bases: 0,
    Case: '',
    // Fundamentals_Quality: 0,
    Has_Earnings_Acceleration: false,
    Has_Catalyst: false,
    // Earnings_Last_Q_20_Pct: false,
    IPO_Last_10_Years: false,
    // Volume_Confirmation: false,
    Is_BioTech: false,
    // Earnings_Surprises: false,
    // Expanding_Margins: false,
    // EPS_breakout: false,
    Strong_annual_EPS: false,
    Signs_Acceleration_Will_Continue: false,
    // Sudden_Growth_Change: false,
    // Strong_Quarterly_Sales: false,
    // Strong_Yearly_Sales: false,
    // Positive_Analysts_EPS_Revisions: false,
    // Positive_Analysts_Price_Revisions: false,
    // Ownership_Pct_Change_Past_Earnings: false,
    // Quarters_With_75pct_Surprise: false,
    // Over_10_pct_Avg_Surprise: false,
    Under_30M_Shares: false,
    // Spikes_On_Volume: false,
    // Started_Off_Correction: false,
    // All_Trendlines_Up: false,
    If_You_Could_Only_Make_10_Trades: false,
    Pct_Off_52W_High: 0,
    C: false,
    A: false,
    N: false,
    S: false,
    L: false,
    I: false,
    M: false,
  };

  const [newTrade, setNewTrade] = useState<Trade>(initialTrade);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const checked = e.target.checked;
    
    setNewTrade(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              type === 'number' ? (value === '' ? 0 : Number(value)) : 
              value
    }));

    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await onAdd(newTrade);
      setNewTrade(initialTrade); // Only reset form on successful submission
    } catch (err) {
      // Handle different types of errors
      if (err instanceof AxiosError) {
        const errorMessage = err.response?.data?.detail || 
                           err.response?.data?.message ||
                           'Failed to add trade. Please try again.';
        setError(errorMessage);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  type InputValue = string | number | boolean | null;
  
  const renderFormField = (key: keyof Trade, value: InputValue) => {
    if (typeof value === 'boolean') {
      return (
        <div key={key} className="flex items-center space-x-2">
          <Checkbox
            id={key}
            name={key}
            checked={value}
            onCheckedChange={(checked: boolean) => 
              setNewTrade(prev => ({ ...prev, [key]: checked }))
            }
            disabled={isSubmitting}
          />
          <Label htmlFor={key} className="text-sm">
            {key.replace(/_/g, ' ')}
          </Label>
        </div>
      );
    }

    return (
      <div key={key} className="space-y-1">
        <Label htmlFor={key} className="text-sm">
          {key.replace(/_/g, ' ')}
        </Label>
        <Input
          id={key}
          type={key.includes('Date') ? 'date' : typeof value === 'number' ? 'number' : 'text'}
          name={key}
          value={value ?? ''}
          onChange={handleInputChange}
          step={key.includes('Price') ? '0.01' : '1'}
          className="h-8"
          disabled={isSubmitting}
        />
      </div>
    );
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="py-3 flex-shrink-0">
        <CardTitle className="text-lg font-semibold">Add New Trade</CardTitle>
      </CardHeader>
      <CardContent className="p-3 flex-grow overflow-hidden">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <ScrollArea className="flex-grow pr-4 -mr-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 mb-4">
              {Object.entries(newTrade).map(([key, value]) => 
                renderFormField(key as keyof Trade, value as InputValue)
              )}
            </div>
          </ScrollArea>
          
          <Button 
            type="submit" 
            className="w-full mt-4"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Adding Trade...' : 'Add Trade'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};