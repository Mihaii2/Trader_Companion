// components/TradeFilterer.tsx
import React from 'react';
import { Trade } from '../types';
import { useFilterOptions } from '../hooks/useFilterOptions';

interface TradeFiltererProps {
  filters: Partial<Trade> & {
    minEarningsQuality?: number;
    minFundamentalsQuality?: number;
    maxPriceTightness?: number;
    minNrBases?: number;
  };
  onFilterChange: (filters: Partial<Trade> & {
    minEarningsQuality?: number;
    minFundamentalsQuality?: number;
    maxPriceTightness?: number;
    minNrBases?: number;
  }) => void;
}

// Define fields that should be minimum value filters
const MIN_VALUE_FIELDS = {
  minEarningsQuality: 'Earnings_Quality',
  minFundamentalsQuality: 'Fundamentals_Quality',
  maxPriceTightness: 'Price_Tightness_1_Week_Before',
  minNrBases: 'Nr_Bases'
} as const;

// Define dropdown filter fields - including all relevant string and boolean fields
const DROPDOWN_FIELDS = [
  'Pattern',
  'Status',
  'Category',
  'Market_Condition',
  'Exit_Reason',
  'Has_Earnings_Acceleration',
  'Has_Catalyst',
  'IPO_Last_10_Years',
  'Earnings_Last_Q_20_Pct',
  'Volume_Confirmation',
  'Is_BioTech',
  'Earnings_Surprises',
  'Expanding_Margins',
  'EPS_breakout',
  'Strong_annual_EPS',
  'Signs_Acceleration_Will_Continue',
  'Sudden_Growth_Change',
  'Strong_Quarterly_And_Yearly_Sales',
  'Positive_Analysts_Revisions',
  'Ownership_Pct_Change_Past_Earnings',
  'Quarters_With_75pct_Surprise',
  'Over_10_pct_Avg_Surprise'
] as const;


const formatLabel = (fieldName: string): string => {
  return fieldName
    .split(/(?=[A-Z])|_/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const TradeFilterer: React.FC<TradeFiltererProps> = ({ filters, onFilterChange }) => {
  const { filterOptions, loading } = useFilterOptions();

  const handleDropdownChange = (key: keyof Trade, value: string) => {
    let processedValue: Trade[typeof key] | undefined;

    switch (typeof filters[key]) {
      case 'boolean':
        processedValue = value === 'true' ? true : 
                        value === 'false' ? false : 
                        undefined;
        break;
      case 'number':
        processedValue = value === '' ? undefined : Number(value);
        break;
      default:
        processedValue = value === '' ? undefined : value;
    }

    onFilterChange({ ...filters, [key]: processedValue });
  };

  const handleMinValueChange = (key: keyof typeof MIN_VALUE_FIELDS, value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    onFilterChange({ ...filters, [key]: numValue });
  };

  if (loading) {
    return <div className="text-white">Loading filters...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {/* Render minimum value filters */}
      {Object.entries(MIN_VALUE_FIELDS).map(([filterKey]) => (
        <div key={filterKey} className="flex flex-col space-y-1">
          <label 
            htmlFor={filterKey}
            className="text-sm font-medium text-foreground"
          >
            {formatLabel(filterKey)}
          </label>
          <input
            type="number"
            id={filterKey}
            min="0"
            className="w-full rounded-md bg-background border border-input px-3 py-2"
            value={filters[filterKey as keyof typeof filters]?.toString() ?? ''}
            onChange={(e) => handleMinValueChange(
              filterKey as keyof typeof MIN_VALUE_FIELDS,
              e.target.value
            )}
          />
        </div>
      ))}


      {/* Render dropdown filters */}
      {DROPDOWN_FIELDS.map((fieldName) => {
        const options = filterOptions[fieldName];
        if (!options) return null;

        const label = formatLabel(fieldName);
        const isBooleanField = Array.from(options).every(value => 
          typeof value === 'boolean'
        );

        return (
          <div key={fieldName} className="flex flex-col space-y-1">
            <label 
              htmlFor={fieldName}
              className="text-sm font-medium text-foreground"
            >
              {label}
            </label>
            <select
              id={fieldName}
              className="w-full rounded-md bg-background border border-input px-3 py-2"
              value={filters[fieldName]?.toString() ?? ''}
              onChange={(e) => handleDropdownChange(fieldName, e.target.value)}
            >
              <option value="">Any</option>
              {Array.from(options)
                .sort((a, b) => a.toString().localeCompare(b.toString()))
                .map((value) => (
                  <option key={value.toString()} value={value.toString()}>
                    {isBooleanField ? (value ? 'Yes' : 'No') : value.toString()}
                  </option>
                ))}
            </select>
          </div>
        );
      })}
    </div>
  );
};
