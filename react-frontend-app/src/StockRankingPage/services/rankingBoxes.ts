// services/personalRanking.ts
import axios from 'axios';
import { RankingBox } from '../types';
import { API_CONFIG } from '@/config';

const api = axios.create({
  baseURL: API_CONFIG.baseURL + '/personal_ranking'
});

export const rankingBoxesApi = {
  getRankingBoxes: () => 
    api.get<RankingBox[]>('/ranking-boxes/'),
  
  getRankingBox: (id: number) => 
    api.get<RankingBox>(`/ranking-boxes/${id}/`),
  
  createRankingBox: (title: string) => 
    api.post<RankingBox>('/ranking-boxes/', { title }),
  
  updateRankingBox: (id: number, title: string) => 
    api.put<RankingBox>(`/ranking-boxes/${id}/`, { title }),
  
  deleteRankingBox: (id: number) => 
    api.delete(`/ranking-boxes/${id}/`),
};