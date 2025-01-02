// src/utils/rankingUtils.ts
import { RankingBox } from "@/StockRankingPage/types";

export const orderRankingBoxes = (
  boxes: RankingBox[], 
  orderIds: number[]
): RankingBox[] => {
  // Create a map for O(1) lookups
  const boxMap = new Map(boxes.map(box => [box.id, box]));
  
  // First, add all boxes that are in the order array
  const orderedBoxes = orderIds
    .map(id => boxMap.get(id))
    .filter((box): box is RankingBox => box !== undefined);
  
  // Then add any remaining boxes that weren't in the order array
  const remainingBoxes = boxes.filter(box => !orderIds.includes(box.id));
  
  return [...orderedBoxes, ...remainingBoxes];
};