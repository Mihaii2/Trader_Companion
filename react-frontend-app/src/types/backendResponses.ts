import { RankingItem } from './rankingList';
export interface StocksScreenerCommanderResponse {
  success: boolean;
  message: string;
}

// For the success response
export interface RankingListSuccessResponse {
  status: 'success';
  message: RankingItem[];
  created_at: string;
}

// For the error response
export interface RankingListErrorResponse {
  status: 'error';
  message: string;
}

// Combined type for all possible responses
export type RankingListResponse = RankingListSuccessResponse | RankingListErrorResponse;