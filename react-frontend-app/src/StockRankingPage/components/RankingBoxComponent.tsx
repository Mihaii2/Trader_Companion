import React, { useState } from 'react';
import type { RankingBox } from '../types';
import { useStockOperations } from '../hooks/useStockPickOperations';
import { stockPicksApi } from '../services/stockPick';
import { Alert } from '@/components/ui/alert';
import { RankingItem } from './RankingItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  box: RankingBox;
  onRemoveBox: (id: number) => void;
  onUpdateBox: (boxId: number, updatedBox: RankingBox) => void;
}

export const RankingBoxComponent: React.FC<Props> = ({
  box,
  onRemoveBox,
  onUpdateBox
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStock, setNewStock] = useState({ symbol: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { error, handleStockUpdate, handleRemoveStock, sortStocksByScore } = useStockOperations({
    onUpdateBox
  });

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStock.symbol.trim()) return;

    try {
      setIsSubmitting(true);
      const response = await stockPicksApi.createStockPick({
        symbol: newStock.symbol.trim().toUpperCase(),
        ranking_box: box.id,
        total_score: 0
      });
      onUpdateBox(box.id, { ...box, stock_picks: [...box.stock_picks, response.data] });
      setNewStock({ symbol: '' });
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding stock:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="bg-card border-none shadow-sm rounded-sm">
      <CardHeader className="p-2 flex-row justify-between items-center space-y-0">
      <Badge variant="default" className="text-base font-semibold">{box.title}</Badge>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-muted-foreground hover:text-destructive" 
          onClick={() => onRemoveBox(box.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="p-2 space-y-2">
        {error && (
          <Alert variant="destructive" className="py-1 text-xs">
            {error}
          </Alert>
        )}

        {!showAddForm ? (
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs rounded-sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-3 w-3 mr-1" /> Add Stock
          </Button>
        ) : (
          <form onSubmit={handleAddStock} className="flex gap-1">
            <Input
              type="text"
              value={newStock.symbol}
              onChange={(e) => setNewStock({ symbol: e.target.value })}
              placeholder="Stock symbol"
              className="h-8 text-xs rounded-sm"
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !newStock.symbol.trim()}
              className="h-8 text-xs"
            >
              {isSubmitting ? '...' : 'Add'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setNewStock({ symbol: '' });
              }}
              className="h-8 text-xs"
            >
              Cancel
            </Button>
          </form>
        )}

        <div className="space-y-1">
          {sortStocksByScore(box.stock_picks).map((stock) => (
            <RankingItem
              key={stock.id}
              stock={stock}
              onUpdate={(updatedStock) => handleStockUpdate(box.id, updatedStock, box)}
              onRemove={() => handleRemoveStock(box.id, stock.id, box)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};