// src/types/index.ts
export interface StockCharacteristic {
  id: number;
  name: string;
  description: string;
  score: number;
}

export interface StockPick {
  id: number;
  symbol: string;
  totalScore: number;
  characteristics: StockCharacteristic[];
}

export interface RankingBox {
  id: number;
  title: string;
  stocks: StockPick[];
}

export interface UserPageState {
  columnCount: number;
  rankingBoxesOrder: number[];
}