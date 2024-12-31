export interface BanOptions {
  ticker: string;
  duration: number; // in days
}

export interface RankingItem {
  Symbol: string;
  Screeners: number;
  [key: string]: string | number;  // This allows for dynamic screener fields
}

export interface RankingListResponse {
  status: 'success' | 'error';
  message: RankingItem[] | string;  // Array for success, string for error
  created_at?: string;  // Optional since it's only present in success response
}