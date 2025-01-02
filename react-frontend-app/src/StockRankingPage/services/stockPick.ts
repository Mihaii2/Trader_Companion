// services/stockPick.ts
import axios from 'axios';
import { StockPick } from '../types';
import { API_CONFIG } from '@/config';

const api = axios.create({
  baseURL: API_CONFIG.baseURL + '/personal_ranking'
});

// Stock Picks API
export const stockPicksApi = {
  getAllStockPicks: () =>
    api.get<StockPick[]>('/stock-picks/'),
  
  getStockPicksByBox: (boxId: number) =>
    api.get<StockPick[]>(`/stock-picks/?ranking_box=${boxId}`),
  
  getStockPick: (id: number) =>
    api.get<StockPick>(`/stock-picks/${id}/`),
  
  createStockPick: (data: { ranking_box: number; symbol: string; total_score: number }) =>
    api.post<StockPick>('/stock-picks/', data),
  
  updateStockPick: (id: number, data: Partial<StockPick>) =>
    api.put<StockPick>(`/stock-picks/${id}/`, data),
  
  deleteStockPick: (id: number) =>
    api.delete(`/stock-picks/${id}/`)
};