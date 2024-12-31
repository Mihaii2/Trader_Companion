// services/rankingService.ts
import axios from 'axios';
import { RankingListSuccessResponse } from '../types/backendResponses';
import { API_CONFIG } from '../config';
import { RankingType } from '../types/rankingList';

export const rankingService = {
  async fetchRankingList(rankingType: RankingType): Promise<RankingListSuccessResponse> {
    const endpoint = rankingType === 'price' 
      ? 'stocks_ranking_by_price'
      : 'stocks_ranking_by_screeners';

    try {
      const response = await axios.get(
        `${API_CONFIG.baseURL}/stock_filtering_app/rankings/${endpoint}`
      );

      if (response.data.status === 'error') {
        throw new Error(response.data.message);
      }
      
      return response.data as RankingListSuccessResponse;
    } catch (error) {
      throw new Error(
        axios.isAxiosError(error) 
          ? error.response?.data?.message || error.message 
          : 'Failed to fetch ranking list'
      );
    }
  }
};