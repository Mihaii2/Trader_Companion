import React, { useState } from 'react';
import type { StockPick } from '../types';
import { StockCharacteristicComponent } from './StockCharacteristicComponent';
import { stockCharacteristicsApi } from '../services/stockCharacteristics';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    score: '' as number | '',
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
        score: Number(newCharacteristic.score) || 0
      });
      
      const updatedCharacteristics = [...initialStock.characteristics, response.data];
      onUpdate({
        ...initialStock,
        characteristics: updatedCharacteristics,
        total_score: updatedCharacteristics.reduce((sum, char) => sum + char.score, 0)
      });
      
      setNewCharacteristic({ name: '', description: '', score: '', stock_pick: initialStock.id });
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
      const updatedCharacteristics = initialStock.characteristics.filter(
        char => char.id !== characteristicId
      );
      onUpdate({
        ...initialStock,
        characteristics: updatedCharacteristics,
        total_score: updatedCharacteristics.reduce((sum, char) => sum + char.score, 0)
      });
    } catch (err) {
      setError('Failed to remove characteristic');
      console.error('Error removing characteristic:', err);
    }
  };

  return (
    <Card className="mb-1 rounded-sm">
      <CardContent className="p-1 rounded-sm">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-1">
            <Badge variant="default" className="font-semibold">{initialStock.symbol}</Badge>
            <Badge variant="secondary">Score: {initialStock.total_score}</Badge>
            <div className="flex gap-1 flex-wrap">
              {initialStock.characteristics.map((char) => (
                <Badge key={char.id} variant="outline">
                  {char.name}
                </Badge>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <X className="h-3 w-3 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {initialStock.symbol}</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove this stock from your ranking? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Characteristics</span>
                {!showAddForm && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="py-1 px-2 mb-1">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {showAddForm && (
              <div className="bg-muted/50 p-2 rounded-sm mb-1">
                <div className="flex gap-2 mb-1">
                  <Input
                    placeholder="Name"
                    value={newCharacteristic.name}
                    onChange={(e) => setNewCharacteristic(prev => ({
                      ...prev,
                      name: e.target.value
                    }))}
                    disabled={isSubmitting}
                    className="h-7"
                  />
                  <Input
                    type="number"
                    placeholder="Score"
                    value={newCharacteristic.score}
                    onChange={(e) => setNewCharacteristic(prev => ({
                      ...prev,
                      score: e.target.value === '' ? '' : Number(e.target.value)
                    }))}
                    disabled={isSubmitting}
                    className="h-7 w-20"
                  />
                </div>
                <Textarea
                  placeholder="Description"
                  value={newCharacteristic.description}
                  onChange={(e) => setNewCharacteristic(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  disabled={isSubmitting}
                  className="mb-1 text-sm"
                  rows={2}
                />
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    onClick={handleAddCharacteristic}
                    disabled={isSubmitting || !newCharacteristic.name.trim()}
                    className="h-6 px-2"
                  >
                    {isSubmitting ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewCharacteristic({
                        name: '',
                        description: '',
                        score: '',
                        stock_pick: initialStock.id
                      });
                    }}
                    disabled={isSubmitting}
                    className="h-6 px-2"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div>
              {initialStock.characteristics.map((char) => (
                <StockCharacteristicComponent
                  key={char.id}
                  characteristic={char}
                  onRemove={() => handleRemoveCharacteristic(char.id)}
                  onUpdate={(updated) => {
                    const updatedCharacteristics = initialStock.characteristics.map(c => 
                      c.id === updated.id ? updated : c
                    );
                    onUpdate({
                      ...initialStock,
                      characteristics: updatedCharacteristics,
                      total_score: updatedCharacteristics.reduce((sum, char) => sum + char.score, 0)
                    });
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};