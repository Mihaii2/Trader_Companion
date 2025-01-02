// src/types/index.ts
export interface StockCharacteristic {
  id: number;
  name: string;
  description: string;
  score: number;
  stock_pick: number;  // Added to match backend
}

export interface StockPick {
  id: number;
  symbol: string;
  total_score: number;  // Changed from camelCase to snake_case
  ranking_box: number;  // Added to match backend
  characteristics: StockCharacteristic[];
}

export interface RankingBox {
  id: number;
  title: string;
  stock_picks: StockPick[];
  order?: number;  // Make order optional since it's only used during drag operations
}

export interface UserPageState {
  column_count: number;  // Changed from camelCase to snake_case
  ranking_boxes_order: number[];  // Changed from camelCase to snake_case
}