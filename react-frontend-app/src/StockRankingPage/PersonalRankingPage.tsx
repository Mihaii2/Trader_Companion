// pages/PersonalRankingPage.tsx
import React from 'react';
import { ConfigurationBox } from './components/ConfigurationBox';
import { MainRankingList } from './components/MainRankingBox';
import { RankingBoxComponent } from './components/RankingBoxComponent';
import { useRankingBoxes } from './hooks/useRankingBoxes';
import { useStockOperations } from './hooks/useStockPickOperations';
import { useDragDrop } from './hooks/useDragDrop';
import { Alert } from '@/components/ui/alert';

export const PersonalRankingPage: React.FC = () => {
  const {
    rankingBoxes,
    pageState,
    isLoading,
    error: rankingBoxError,
    handleReorderBoxes,
    handleColumnCountChange,
    handleRemoveBox,
    handleUpdateStock,
    refreshBoxes
  } = useRankingBoxes();

  const {
    error: stockError,
    handleStockUpdate,
    handleRemoveStock
  } = useStockOperations({
    onUpdateBox: handleUpdateStock
  });

  const {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragDrop(rankingBoxes, handleReorderBoxes);

  // Get all stocks across all boxes
  const allStocks = rankingBoxes.flatMap(box => 
    box.stock_picks.map(stock => ({
      ...stock,
      ranking_box: box.id
    }))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (rankingBoxError || stockError) {
    return <Alert variant="destructive">{rankingBoxError || stockError}</Alert>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mt-8">
        <MainRankingList 
          allStocks={allStocks}
          onStockUpdate={(boxId, updatedStock) => {
            const box = rankingBoxes.find(b => b.id === boxId);
            if (box) {
              handleStockUpdate(boxId, updatedStock, box);
            }
          }}
          onRemoveStock={(boxId, stockId) => {
            const box = rankingBoxes.find(b => b.id === boxId);
            if (box) {
              handleRemoveStock(boxId, stockId, box);
            }
          }}
        />
      </div>
      <ConfigurationBox
        columnCount={pageState.column_count}
        onColumnCountChange={handleColumnCountChange}
        onRankingBoxCreated={refreshBoxes}
      />
      <div
        className="mt-8 grid gap-6"
        style={{
          gridTemplateColumns: `repeat(${pageState.column_count}, minmax(0, 1fr))`,
        }}
      >
        {rankingBoxes.map((box) => (
          <div
            key={box.id}
            draggable
            onDragStart={(e) => handleDragStart(e, box)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, box)}
            className="transition-all duration-200 cursor-move"
          >
            <RankingBoxComponent
              box={box}
              onRemoveBox={handleRemoveBox}
              onUpdateBox={handleUpdateStock}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalRankingPage;