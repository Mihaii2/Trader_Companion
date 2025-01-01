export interface BanOptions {
  ticker: string;
  duration: number; // in days
}

export interface RankingItem {
  Symbol: string;
  Screeners: number;
  [key: string]: string | number;  // This allows for dynamic screener fields
}

export type RankingType = 'price' | 'screeners';

// For the success response
export interface RankingListSuccessResponse {
  status: 'success';
  message: RankingItem[];
  stock_data_created_at: string;
  rankings_created_at: string;
}

// For the error response
export interface RankingListErrorResponse {
  status: 'error';
  message: string;
}

// Combined type for all possible responses
export type RankingListResponse = RankingListSuccessResponse | RankingListErrorResponse;