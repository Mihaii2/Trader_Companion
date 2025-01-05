import React, { useState, useEffect, useRef } from 'react';
import type { StockCharacteristic } from '../types';
import { X, Check, X as XIcon } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { stockCharacteristicsApi } from '../services/stockCharacteristics';

interface Props {
  characteristic: StockCharacteristic;
  onRemove: () => void;
  onUpdate: (updated: StockCharacteristic) => void;
}

export const StockCharacteristicComponent: React.FC<Props> = ({
  characteristic,
  onRemove,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(characteristic.name);
  const [editedScore, setEditedScore] = useState(characteristic.score.toString());
  const [editedDescription, setEditedDescription] = useState(characteristic.description || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isEditing]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleCancel = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setIsEditing(false);
    setEditedName(characteristic.name);
    setEditedScore(characteristic.score.toString());
    setEditedDescription(characteristic.description || '');
  };

  const handleSubmit = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!editedName.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const updatedData = {
        name: editedName.trim(),
        score: Number(editedScore),
        description: editedDescription.trim(),
        stock_pick: characteristic.stock_pick
      };

      const response = await stockCharacteristicsApi.updateCharacteristic(
        characteristic.id,
        updatedData
      );

      onUpdate(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update characteristic:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <Card className="p-2 bg-muted/50 rounded-sm" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Input
              ref={nameInputRef}
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Name"
              className="h-7 flex-1"
              disabled={isSubmitting}
            />
            <Input
              type="number"
              value={editedScore}
              onChange={(e) => setEditedScore(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Score"
              className="h-7 w-20"
              disabled={isSubmitting}
              min={-100}
              step={1}
            />
          </div>
          <Textarea
            value={editedDescription}
            onChange={(e) => setEditedDescription(e.target.value)}
            placeholder="Description"
            className="text-sm min-h-[60px]"
            disabled={isSubmitting}
          />
          <div className="flex gap-1">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !editedName.trim()}
              className="h-6 w-6 rounded-sm hover:bg-primary/20 flex items-center justify-center transition-colors"
              aria-label="Save changes"
            >
              <Check size={14} className="text-primary" />
            </button>
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="h-6 w-6 rounded-sm hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
              aria-label="Cancel editing"
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      className="px-1.5 py-0.5 hover:bg-muted/50 transition-colors rounded-sm cursor-pointer"
      onClick={handleStartEdit}
    >
      <div className="flex flex-wrap items-center gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="font-medium whitespace-nowrap text-sm">{characteristic.name}</span>
          <Badge variant="secondary" className="shrink-0 text-xs px-1.5 py-0 rounded-sm">
            Score: {characteristic.score}
          </Badge>
        </div>
        {characteristic.description && (
          <span className="text-xs text-muted-foreground flex-1">
            {characteristic.description}
          </span>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="h-4 w-4 rounded-sm hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors shrink-0 ml-auto"
              aria-label={`Remove ${characteristic.name} characteristic`}
            >
              <X size={10} />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Characteristic</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{characteristic.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
};

export default StockCharacteristicComponent;