import React, { useState, useEffect } from 'react';
import type { StockPick, GlobalCharacteristic } from '../types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, X, Edit, Check } from 'lucide-react';
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
import {
  Checkbox
} from "@/components/ui/checkbox";
import { globalCharacteristicsApi } from '../services/globalCharacteristics';
import { stockPicksApi } from '../services/stockPick';

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
  const [stock, setStock] = useState<StockPick>(initialStock);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsText, setCaseText] = useState(initialStock.case_text || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalCharacteristics, setGlobalCharacteristics] = useState<GlobalCharacteristic[]>([]);
  const [isEditingScore, setIsEditingScore] = useState<number | null>(null);
  const [editedScore, setEditedScore] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  
  // Track pending characteristic changes
  const [pendingCharacteristics, setPendingCharacteristics] = useState<Record<number, boolean>>({});

  // Update local state when prop changes
  useEffect(() => {
    setStock(initialStock);
    setCaseText(initialStock.case_text || '');
  }, [initialStock]);

  // Fetch global characteristics when component mounts or expands
  useEffect(() => {
    if (isExpanded) {
      fetchGlobalCharacteristics();
    }
  }, [isExpanded]);

  // Fetch global characteristics from API
  const fetchGlobalCharacteristics = async () => {
    try {
      const response = await globalCharacteristicsApi.getAllGlobalCharacteristics();
      setGlobalCharacteristics(response.data);
    } catch (err) {
      console.error('Error fetching global characteristics:', err);
      setError('Failed to load global characteristics');
    }
  };

  // Handle case text changes
  const handleDetailsTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCaseText = e.target.value;
    setCaseText(newCaseText);
    
    try {
      setIsSaving(true);
      const updatedStock = await stockPicksApi.updateStockPick(stock.id, { 
        case_text: newCaseText 
      });
      // Update the local state with the response data
      setStock(updatedStock.data);
      onUpdate(updatedStock.data);
    } catch (err) {
      console.error('Error saving case text:', err);
      setError('Failed to save case text');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle a characteristic on/off
  const handleToggleCharacteristic = async (characteristicId: number, checked: boolean) => {
    try {
      // Immediately update UI state for better UX
      setPendingCharacteristics(prev => ({...prev, [characteristicId]: checked}));
      setIsSubmitting(true);
      setError(null);
      
      // Optimistically update local state for immediate feedback
      if (checked) {
        // Find the global characteristic to get its default score
        const globalChar = globalCharacteristics.find(gc => gc.id === characteristicId);
        if (globalChar) {
          const optimisticChar = {
            id: -Date.now(), // Temporary negative ID to avoid conflicts
            name: globalChar.name,
            score: globalChar.default_score,
            characteristic_id: globalChar.id
          };
          
          // Add to local state immediately
          const newTotal = stock.total_score + globalChar.default_score;
          const updatedStock = {
            ...stock,
            characteristics: [...stock.characteristics, optimisticChar],
            total_score: newTotal
          };
          setStock(updatedStock);
          onUpdate(updatedStock);
        }
      } else {
        // Remove from local state immediately
        const charToRemove = stock.characteristics.find(c => c.characteristic_id === characteristicId);
        if (charToRemove) {
          const newTotal = stock.total_score - charToRemove.score;
          const updatedStock = {
            ...stock,
            characteristics: stock.characteristics.filter(c => c.characteristic_id !== characteristicId),
            total_score: newTotal
          };
          setStock(updatedStock);
          onUpdate(updatedStock);
        }
      }
      
      // Then make the actual API call
      let response;
      if (checked) {
        // Find the global characteristic to get its default score
        const globalChar = globalCharacteristics.find(gc => gc.id === characteristicId);
        const defaultScore = globalChar ? globalChar.default_score : 0;
        
        // Add the characteristic
        response = await stockPicksApi.addCharacteristic(stock.id, {
          characteristic_id: characteristicId,
          score: defaultScore
        });
      } else {
        // Remove the characteristic
        response = await stockPicksApi.removeCharacteristic(stock.id, {
          characteristic_id: characteristicId
        });
      }
      
      // Update with the actual server response
      setStock(response.data);
      onUpdate(response.data);
    } catch (err) {
      console.error('Error toggling characteristic:', err);
      setError(`Failed to ${checked ? 'add' : 'remove'} characteristic`);
      
      // Revert optimistic update on error
      setPendingCharacteristics(prev => ({...prev, [characteristicId]: !checked}));
      const response = await stockPicksApi.getStockPick(stock.id);
      setStock(response.data);
      onUpdate(response.data);
    } finally {
      setIsSubmitting(false);
      setPendingCharacteristics(prev => {
        const newState = {...prev};
        delete newState[characteristicId];
        return newState;
      });
    }
  };

  // Begin editing a score
  const handleStartEditScore = (characteristicId: number) => {
    const char = stock.characteristics.find(c => c.characteristic_id === characteristicId);
    if (char) {
      setIsEditingScore(characteristicId);
      setEditedScore(char.score);
    }
  };

  // Save an edited score
  const handleSaveScore = async (characteristicId: number) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Optimistically update the score
      const charToUpdate = stock.characteristics.find(c => c.characteristic_id === characteristicId);
      if (charToUpdate) {
        const scoreDiff = editedScore - charToUpdate.score;
        const updatedStock = {
          ...stock,
          characteristics: stock.characteristics.map(c => 
            c.characteristic_id === characteristicId 
              ? {...c, score: editedScore} 
              : c
          ),
          total_score: stock.total_score + scoreDiff
        };
        setStock(updatedStock);
        onUpdate(updatedStock);
      }
      
      const response = await stockPicksApi.addCharacteristic(stock.id, {
        characteristic_id: characteristicId,
        score: editedScore
      });
      
      // Update with the actual server response
      setStock(response.data);
      onUpdate(response.data);
      setIsEditingScore(null);
    } catch (err) {
      console.error('Error updating score:', err);
      setError('Failed to update score');
      
      // Revert optimistic update on error
      const response = await stockPicksApi.getStockPick(stock.id);
      setStock(response.data);
      onUpdate(response.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if a characteristic is selected (considering both actual state and pending changes)
  const isCharacteristicSelected = (characteristicId: number) => {
    // If there's a pending change, use that
    if (characteristicId in pendingCharacteristics) {
      return pendingCharacteristics[characteristicId];
    }
    // Otherwise use the actual state
    return stock.characteristics.some(c => c.characteristic_id === characteristicId);
  };

  // Get characteristic data by ID
  const getCharacteristicById = (characteristicId: number) => {
    return stock.characteristics.find(c => c.characteristic_id === characteristicId);
  };

  return (
    <Card className="rounded-sm">
      <CardContent className="p-0 pl-1 rounded-sm">
        <div
          className="flex justify-between items-center cursor-pointer p-0.1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-1">
            <Badge variant="default" className="font-semibold">{stock.symbol}</Badge>
            <Badge variant="secondary">Score: {stock.total_score}</Badge>
            <div className="flex gap-1 flex-wrap">
              {stock.characteristics.map((char) => (
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
                  <AlertDialogTitle>Remove {stock.symbol}</AlertDialogTitle>
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
          <div className="mt-1 p-2">
            {error && (
              <Alert variant="destructive" className="py-1 px-2 mb-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-1">Characteristics</h3>
              
              {/* Compact Grid of Global Characteristics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0.5">
                {globalCharacteristics.map(globalChar => {
                  const isSelected = isCharacteristicSelected(globalChar.id);
                  const selectedChar = isSelected ? getCharacteristicById(globalChar.id) : null;
                  
                  return (
                    <div key={globalChar.id} className="flex items-center justify-between border p-0.5 rounded min-h-[28px]">

                      <div className="flex items-center gap-1">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToggleCharacteristic(globalChar.id, checked === true)}
                          disabled={isSubmitting && !(globalChar.id in pendingCharacteristics)}
                        />
                        <span className="text-sm">{globalChar.name}</span>
                      </div>
                      
                      {isSelected && selectedChar && (
                        <div className="flex items-center gap-0.5">
                          {isEditingScore === globalChar.id ? (
                            <div className="flex items-center gap-0.5">
                              <Input
                                type="number"
                                value={editedScore}
                                onChange={(e) => setEditedScore(Number(e.target.value))}
                                className="h-6 w-12 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-5 w-5" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveScore(globalChar.id);
                                }}
                                disabled={isSubmitting}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Badge variant="secondary" className="text-xs px-1">
                                {selectedChar.score}
                              </Badge>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-5 w-5 p-0" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditScore(globalChar.id);
                                }}
                                disabled={isSubmitting}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
  
            {/* More Details */}
            <div>
              <span className="text-sm font-medium">Details</span>
              <Textarea
                placeholder="Enter additional details..."
                value={detailsText}
                onChange={handleDetailsTextChange}
                className="mt-1"
                rows={4}
                style={{ resize: 'vertical' }}
                disabled={isSaving}
              />
              {isSaving && <p className="text-xs text-muted-foreground mt-1">Saving...</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RankingItem;