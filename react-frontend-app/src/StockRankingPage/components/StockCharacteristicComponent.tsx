import React from 'react';
import type { StockCharacteristic } from '../types';
import { X } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  characteristic: StockCharacteristic;
  onRemove: () => void;
}

export const StockCharacteristicComponent: React.FC<Props> = ({
  characteristic,
  onRemove,
}) => {
  return (
    <Card className="px-1.5 py-0.5 hover:bg-muted/50 transition-colors rounded-sm">
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="h-4 w-4 rounded-sm hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors shrink-0 ml-auto"
          aria-label={`Remove ${characteristic.name} characteristic`}
        >
          <X size={10} />
        </button>
      </div>
    </Card>
  );
};

export default StockCharacteristicComponent;