import axios from 'axios';
import { RankingListSuccessResponse } from '../types/backendResponses';
import { API_CONFIG } from '../config';

export const rankingService = {
  async fetchRankingList(): Promise<RankingListSuccessResponse> {
    try {
      const response = await axios.get(
        `${API_CONFIG.baseURL}/stock_filtering_app/rankings/stocks_ranking_by_price`
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