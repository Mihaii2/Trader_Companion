// services/rankingService.ts
import axios from 'axios';
import { RankingListSuccessResponse } from '../types/rankingList';
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
      
      // If response.data is already an object, use it directly
      if (typeof response.data === 'object' && response.data !== null) {
        return {
          status: 'success',
          message: response.data.message,
          stock_data_created_at: response.data.stock_data_created_at,
          rankings_created_at: response.data.rankings_created_at
        };
      }

      // If it's a string, we need to handle potential Infinity values before parsing
      if (typeof response.data === 'string') {
        // Replace Infinity with a numeric value
        const sanitizedData = response.data
          .replace(/:\s*Infinity/g, ': null')
          .replace(/:\s*-Infinity/g, ': null');
        
        const parsed = JSON.parse(sanitizedData);
        return {
          status: 'success',
          message: parsed.message,
          stock_data_created_at: parsed.stock_data_created_at,
          rankings_created_at: parsed.rankings_created_at
        };
      }

      throw new Error('Invalid response format');
    } catch (error) {
      console.error('Error details:', error);
      throw new Error(
        axios.isAxiosError(error) 
          ? error.response?.data?.message || error.message 
          : 'Failed to fetch ranking list'
      );
    }
  }
};