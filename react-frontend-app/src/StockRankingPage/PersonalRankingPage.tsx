// pages/PersonalRankingPage.tsx
import React from 'react';
import { ConfigurationBox } from './components/ConfigurationBox';
import { MainRankingList } from './components/MainRankingBox';
import { RankingBoxComponent } from './components/RankingBoxComponent';
import { useRankingBoxes } from './hooks/useRankingBoxes';
import { useDragDrop } from './hooks/useDragDrop';
import { Alert } from '@/components/ui/alert';

export const PersonalRankingPage: React.FC = () => {
  const {
    rankingBoxes,
    pageState,
    isLoading,
    error,
    handleReorderBoxes,
    handleColumnCountChange,
    handleRemoveBox
  } = useRankingBoxes();

  const {
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragDrop(rankingBoxes, handleReorderBoxes);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>;
  }

  if (error) {
    return <Alert variant="destructive">{error}</Alert>;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mt-8">
        <MainRankingList allStocks={rankingBoxes.flatMap(box => box.stock_picks)} />
      </div>
      <ConfigurationBox
        columnCount={pageState.column_count}
        onColumnCountChange={handleColumnCountChange}
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
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalRankingPage;