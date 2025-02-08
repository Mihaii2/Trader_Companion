import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Trade } from '../types/Trade';

interface TradesTableProps {
  trades: Trade[];
  onUpdate: (updatedTrade: Trade) => void;
  onDelete: (id: number) => void;
  columnWidths?: { [key in keyof Trade]?: string };
}

export const TradesTable: React.FC<TradesTableProps> = ({
  trades,
  onUpdate,
  onDelete,
  columnWidths = {}
}) => {
  const [editedTrades, setEditedTrades] = useState<{ [key: number]: Trade }>({});
  const [displayCount, setDisplayCount] = useState<number>(10);

  const defaultColumnWidths: { [key: string]: string } = {
    Ticker: 'w-11',
    Status: 'w-14',
    Entry_Date: 'w-32',
    Exit_Date: 'w-32',
    Entry_Price: 'w-12',
    Exit_Price: 'w-12',
    Pattern: 'w-20',
    Days_In_Pattern_Before_Entry: 'w-14',
    Price_Tightness_1_Week_Before: 'w-20',
    Exit_Reason: 'w-20',
    Market_Condition: 'w-20',
    Category: 'w-20',
    Earnings_Quality: 'w-16',
    Nr_Bases: 'w-10',
  };

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

  const handleDisplayCountChange = (value: number) => {
    const newCount = Math.min(Math.max(1, value), trades.length);
    setDisplayCount(newCount);
  };

  const getColumnWidth = (field: keyof Trade) => {
    return columnWidths[field] || defaultColumnWidths[field] || 'w-40';
  };

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      const dateA = new Date(a.Entry_Date);
      const dateB = new Date(b.Entry_Date);
      return dateB.getTime() - dateA.getTime();
    });
  }, [trades]);

  const renderCell = (trade: Trade, field: keyof Trade) => {
    const editedTrade = editedTrades[trade.ID];
    if (!editedTrade) return null;
    
    const value = editedTrade[field];
    const width = getColumnWidth(field);
    
    if (field === 'ID') {
      return <span className={`${width}`}>{value}</span>;
    }
    
    if (typeof value === 'boolean') {
      return (
        <Checkbox
          checked={value}
          onCheckedChange={(checked) => 
            handleInputChange(trade.ID, field, checked)
          }
          className="h-4 w-4"
        />
      );
    }

    if (field === 'Entry_Date' || field === 'Exit_Date') {
      return (
        <Input
          type="date"
          value={value || ''}
          onChange={(e) => handleInputChange(trade.ID, field, e.target.value)}
          className={`${width} h-6 px-0.5 text-xs`}
        />
      );
    }

    if (typeof value === 'number') {
      return (
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => handleInputChange(trade.ID, field, Number(e.target.value))}
          className={`${width} h-8 px-1`}
          step={field.includes('Price') ? '0.01' : '1'}
        />
      );
    }

    return (
      <Input
        type="text"
        value={value || ''}
        onChange={(e) => handleInputChange(trade.ID, field, e.target.value)}
        className={`${width} h-8 px-1`}
      />
    );
  };

  const fields = trades.length > 0 ? Object.keys(trades[0]) as (keyof Trade)[] : [];

  if (trades.length === 0) {
    return <div className="text-center py-4">No trades available</div>;
  }

  return (
    <div className="space-y-2">
      <Card className="py-0">
        <CardContent className="flex items-center space-x-4 p-2">
          <span className="text-xs font-medium">
            Show latest trades:
          </span>
          <Slider
            min={1}
            max={trades.length}
            value={[displayCount]}
            onValueChange={([value]) => handleDisplayCountChange(value)}
            className="w-48 py-0"
          />
          <Input
            type="number"
            value={displayCount}
            onChange={(e) => handleDisplayCountChange(Number(e.target.value))}
            className="w-16 h-6 text-xs"
            min={1}
            max={trades.length}
          />
          <span className="text-xs text-muted-foreground">
            of {trades.length} trades
          </span>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-muted">
              <TableRow className="border-b">
                {fields.map(field => (
                  <TableHead 
                    key={field} 
                    className={`py-0.5 px-0.5 border-r text-xs text-center ${getColumnWidth(field)}`}
                  >
                    {field.replace(/_/g, ' ')}
                  </TableHead>
                ))}
                <TableHead className="w-32 py-0.5 px-0.5 text-xs text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTrades.slice(0, displayCount).map(trade => (
                <TableRow key={trade.ID} className="border-b hover:bg-muted/50">
                  {fields.map(field => (
                    <TableCell key={field} className={`p-0 border-r ${getColumnWidth(field)}`}>
                      {renderCell(trade, field)}
                    </TableCell>
                  ))}
                  <TableCell className="p-0 w-32">
                    <div className="flex space-x-0.5">
                      <Button
                        onClick={() => onUpdate(editedTrades[trade.ID])}
                        variant="default"
                        size="sm"
                        className="h-6 text-xs px-1"
                      >
                        Update
                      </Button>
                      <Button
                        onClick={() => onDelete(trade.ID)}
                        variant="destructive"
                        size="sm"
                        className="h-6 text-xs px-1"
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};