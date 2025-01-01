import { useState } from 'react';
import { RankingBox } from '../types';

export const useDragDrop = (initialBoxes: RankingBox[]) => {
  const [rankingBoxes, setRankingBoxes] = useState(initialBoxes);
  const [draggedBox, setDraggedBox] = useState<RankingBox | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, box: RankingBox) => {
    setDraggedBox(box);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('opacity-50');
    setDraggedBox(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('border-2', 'border-blue-500');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('border-2', 'border-blue-500');
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetBox: RankingBox) => {
    e.preventDefault();
    e.currentTarget.classList.remove('border-2', 'border-blue-500');
    
    if (!draggedBox || draggedBox.id === targetBox.id) return;

    const newBoxes = [...rankingBoxes];
    const draggedIdx = newBoxes.findIndex(box => box.id === draggedBox.id);
    const targetIdx = newBoxes.findIndex(box => box.id === targetBox.id);

    newBoxes.splice(draggedIdx, 1);
    newBoxes.splice(targetIdx, 0, draggedBox);

    setRankingBoxes(newBoxes);
  };

  const handleRemoveBox = (id: number) => {
    setRankingBoxes(prev => prev.filter(box => box.id !== id));
  };

  const addNewBox = (newBox: RankingBox) => {
    setRankingBoxes(prevBoxes => [...prevBoxes, newBox]);
  };

  return {
    rankingBoxes,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveBox,
    addNewBox
  };
}