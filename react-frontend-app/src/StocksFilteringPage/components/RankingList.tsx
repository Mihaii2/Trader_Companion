import React, { useState, useMemo } from 'react';
import { useRankingList } from '../hooks/useRankingList';
import { useBanStock } from '../hooks/useBanStock';

interface RankingListProps {
  filename: string;
  title?: string;
}

export const RankingList: React.FC<RankingListProps> = ({ filename, title }) => {
  const { rankings, loading, error } = useRankingList(filename);
  const { banStocks, isLoading: isBanning, error: banError } = useBanStock();
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [bannedStocks, setBannedStocks] = useState<Record<string, boolean>>({});
  const [lastClickedRow, setLastClickedRow] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleBanStock = async (ticker: string, durationWeeks: number) => {
    try {
      await banStocks([{ ticker, duration: durationWeeks }]);
      // Mark the stock as banned in local state to provide immediate visual feedback
      setBannedStocks(prev => ({ ...prev, [ticker]: true }));
    } catch (err) {
      console.error('Failed to ban stock:', err);
    }
  };

  const handleRowClick = (symbol: string) => {
    setLastClickedRow(symbol);
  };

  const sortedRankings = useMemo(() => {
    if (!rankings?.message || !sortColumn) return rankings?.message || [];

    return [...rankings.message].sort((a, b) => {
      const valueA = a[sortColumn];
      const valueB = b[sortColumn];

      // Push missing values to the bottom
      const isValueAMissing = valueA === null || valueA === undefined || valueA === '';
      const isValueBMissing = valueB === null || valueB === undefined || valueB === '';

      if (isValueAMissing && isValueBMissing) return 0;
      if (isValueAMissing) return 1; // Always move missing values down
      if (isValueBMissing) return -1;

      if (typeof valueA === 'number' && typeof valueB === 'number') {
        return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
      }

      const strA = String(valueA).toLowerCase();
      const strB = String(valueB).toLowerCase();

      return sortDirection === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [rankings, sortColumn, sortDirection]);

  if (loading) {
    return <div className="bg-background rounded-lg shadow-sm p-4">Loading rankings...</div>;
  }

  if (error) {
    return <div className="bg-background rounded-lg shadow-sm p-4 text-destructive">Error: {error}</div>;
  }

  if (!sortedRankings.length) {
    return <div className="bg-background rounded-lg shadow-sm p-4">No data available</div>;
  }

  // Get all available columns
  const allAvailableColumns = Object.keys(sortedRankings[0]);
  
  // Define the exact order we want for specific columns
  const priorityColumns = ['Symbol', 'Price_Increase_Percentage', 'Screeners'];
  
  // Add EPS_Quarters and Revenue_Quarters after Screeners if they exist
  if (allAvailableColumns.includes('EPS_Quarters')) {
    priorityColumns.push('EPS_Quarters');
  }
  
  if (allAvailableColumns.includes('Revenue_Quarters')) {
    priorityColumns.push('Revenue_Quarters');
  }
  
  // Add remaining columns that weren't explicitly ordered
  const remainingColumns = allAvailableColumns.filter(
    (key) => !priorityColumns.includes(key)
  );
  
  // Final column order
  const orderedColumns = [...priorityColumns, ...remainingColumns];

  return (
    <div className="bg-background rounded-lg shadow-sm">
      <div className="p-4 border-b border-border flex justify-between items-start">
        <div className="text-lg font-semibold">
          {title || 'Stock Rankings'}
        </div>
        <div className="text-sm text-muted-foreground text-right">
          {rankings?.rankings_created_at && (
            <p>Current Ranking List Last Update: {new Date(rankings.rankings_created_at).toLocaleString()}</p>
          )}
          {rankings?.stock_data_created_at && (
            <p>Stock Data Last Update: {new Date(rankings.stock_data_created_at).toLocaleString()}</p>
          )}
        </div>
      </div>
      
      {banError && (
        <div className="p-2 bg-destructive/10 text-destructive text-sm">
          Error when banning stocks: {banError}
        </div>
      )}

      <div className="overflow-auto">
        <table className="w-full text-sm border border-border">
          <thead>
            <tr className="border-b bg-muted text-muted-foreground">
              {orderedColumns.map((column) => (
                <th
                  key={column}
                  className={`px-2 py-1 cursor-pointer text-left border-r border-border transition-colors duration-150 
                    ${hoveredColumn === column ? 'bg-secondary/30' : ''}`}
                  onClick={() => handleSort(column)}
                  onMouseEnter={() => setHoveredColumn(column)}
                  onMouseLeave={() => setHoveredColumn(null)}
                >
                  {column.replace(/_/g, ' ')}{' '}
                  {sortColumn === column && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
              <th 
                className={`px-2 py-1 text-left border-r border-border transition-colors duration-150
                  ${hoveredColumn === 'actions' ? 'bg-secondary/30' : ''}`}
                onMouseEnter={() => setHoveredColumn('actions')}
                onMouseLeave={() => setHoveredColumn(null)}
              >
                Ban Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRankings.map((item, rowIndex) => (
              <tr
                key={item.Symbol}
                className={`border-b 
                  ${rowIndex % 2 === 0 ? 'bg-muted/20' : 'bg-background'} 
                  ${bannedStocks[item.Symbol] ? 'opacity-50' : ''} 
                  ${lastClickedRow === item.Symbol ? 'bg-primary/20' : ''} 
                  hover:bg-primary/20 hover:shadow-sm transition-all duration-150`}
                onClick={() => handleRowClick(item.Symbol)}
              >
                {orderedColumns.map((column) => (
                  <td 
                    key={column} 
                    className={`px-2 py-0.5 border-r border-border transition-colors duration-150
                      ${hoveredColumn === column ? 'bg-secondary/20' : ''}`}
                  >
                    {typeof item[column] === 'number'
                      ? Math.round(item[column]) // Convert numbers to integers
                      : item[column] ?? '-'}
                  </td>
                ))}
                <td 
                  className={`px-2 py-0.5 border-r border-border transition-colors duration-150
                    ${hoveredColumn === 'actions' ? 'bg-secondary/20' : ''}`}
                >
                  <div className="flex gap-2">
                    <button
                      className="bg-red-500/40 hover:bg-red-600/80 text-white w-full text-xs font-medium py-0.5 px-2 rounded"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click when clicking the button
                        handleBanStock(item.Symbol, 1);
                      }}
                      disabled={isBanning || bannedStocks[item.Symbol]}
                    >
                      1W
                    </button>
                    <button
                      className="bg-red-500/40 hover:bg-red-600/80 text-white w-full text-xs font-medium py-0.5 px-2 rounded"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click when clicking the button
                        handleBanStock(item.Symbol, 4);
                      }}
                      disabled={isBanning || bannedStocks[item.Symbol]}
                    >
                      1Mo
                    </button>
                    <button
                      className="bg-red-500/40 hover:bg-red-600/80 text-white w-full text-xs font-medium py-0.5 px-2 rounded"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click when clicking the button
                        handleBanStock(item.Symbol, 12);
                      }}
                      disabled={isBanning || bannedStocks[item.Symbol]}
                    >
                      3Mo
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

export default RankingList;