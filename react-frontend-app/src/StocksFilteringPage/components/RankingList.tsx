import React, { useState, useMemo } from 'react';
import { useRankingList } from '../hooks/useRankingList';

interface RankingListProps {
  filename: string;
  title?: string;
}

export const RankingList: React.FC<RankingListProps> = ({ filename, title }) => {
  const { rankings, loading, error } = useRankingList(filename);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
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

  // Ensure the right column order
  const firstColumns = ['Symbol', 'Price_Increase_Percentage', 'Screeners'];
  const otherColumns = Object.keys(sortedRankings[0]).filter(
    (key) => !firstColumns.includes(key)
  );
  const allColumns = [...firstColumns, ...otherColumns];

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

      <div className="overflow-auto">
        <table className="w-full text-sm border border-border">
          <thead>
            <tr className="border-b bg-muted text-muted-foreground">
              {allColumns.map((column) => (
                <th
                  key={column}
                  className="px-2 py-1 cursor-pointer text-left border-r border-border"
                  onClick={() => handleSort(column)}
                >
                  {column.replace(/_/g, ' ')}{' '}
                  {sortColumn === column && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRankings.map((item, rowIndex) => (
              <tr
                key={item.Symbol}
                className={`border-b ${rowIndex % 2 === 0 ? 'bg-muted/20' : 'bg-background'}`}
              >
                {allColumns.map((column) => (
                  <td key={column} className="px-2 py-0.5 border-r border-border">
                    {typeof item[column] === 'number'
                      ? Math.round(item[column]) // Convert numbers to integers
                      : item[column] ?? '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RankingList;