import axios from 'axios';
import { RankingListSuccessResponse } from '../types/rankingList';
import { API_CONFIG } from '../../config';

export const rankingService = {
  async fetchRankingList(fileName: string): Promise<RankingListSuccessResponse> {
    try {
      const response = await axios.get(
        `${API_CONFIG.baseURL}/stock_filtering_app/rankings/${fileName}`
      );
      
      // If response.data is already an object, use it directly
      if (typeof response.data === 'object' && response.data !== null) {
        return {
          status: 'success',
          message: response.data.message,
          stock_data_created_at: response.data.stock_data_created_at,
          rankings_created_at: response.data.rankings_created_at,
          total_stocks: response.data.total_stocks || 0, // Default to 0 if not present
          filtered_stocks: response.data.filtered_stocks || 0 // Default to 0 if not present
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
          rankings_created_at: parsed.rankings_created_at,
          total_stocks: parsed.total_stocks || 0, // Default to 0 if not present
          filtered_stocks: parsed.filtered_stocks || 0 // Default to 0 if not present
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