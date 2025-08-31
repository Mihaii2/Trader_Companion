import axios from "axios";
import { API_CONFIG } from "@/config";
import { Trade } from "@/TradeHistoryPage/types/Trade";
import { Metric, MetricOption, TradeGrade, TradeGradeDeletion } from "../types/types";


export const tradesAPI = axios.create({
  baseURL: `${API_CONFIG.baseURL}/trades_app`
});

export const postAnalysisAPI = axios.create({
  baseURL: `${API_CONFIG.baseURL}/post_analysis/api`
});

export const tradeService = {
  getTrades: async (limit?: number): Promise<Trade[]> => {
    const response = await tradesAPI.get('/trades/', {
      params: { limit }
    });
    return response.data.sort((a: Trade, b: Trade) => {
      return new Date(b.Entry_Date).getTime() - new Date(a.Entry_Date).getTime();
    });
  }
};

export const metricService = {
  getMetrics: async (): Promise<Metric[]> => {
    const response = await postAnalysisAPI.get('/metrics/');
    return response.data;
  },

  createMetric: async (metric: { name: string; description?: string; options?: string[] }): Promise<Metric> => {
    const response = await postAnalysisAPI.post('/metrics/', metric);
    return response.data;
  },

  deleteMetric: async (id: number): Promise<void> => {
    await postAnalysisAPI.delete(`/metrics/${id}/`);
  },

  addOption: async (metricId: number, name: string): Promise<MetricOption> => {
    const response = await postAnalysisAPI.post(`/metrics/${metricId}/add_option/`, { name });
    return response.data;
  },

  removeOption: async (metricId: number, optionId: number): Promise<void> => {
    await postAnalysisAPI.delete(`/metrics/${metricId}/options/${optionId}/`);
  }
};

export const gradeService = {
  getGrades: async (): Promise<TradeGrade[]> => {
    const response = await postAnalysisAPI.get('/grades/');
    return response.data;
  },

  bulkUpdateGrades: async (grades: TradeGrade[], deletions: TradeGradeDeletion[] = []): Promise<TradeGrade[]> => {
    const payload: { grades: TradeGrade[]; deletions?: TradeGradeDeletion[] } = { grades };
    if (deletions.length) {
      payload.deletions = deletions;
    }
    const response = await postAnalysisAPI.post('/grades/bulk_update/', payload);
    return response.data;
  }
};

export interface PostTradeAnalysis {
  id: number;
  trade_id: number;
  title?: string;
  notes?: string;
  image?: string; // URL
  created_at: string;
  updated_at: string;
}

export const analysisService = {
  listByTrade: async (tradeId: number): Promise<PostTradeAnalysis[]> => {
    const response = await postAnalysisAPI.get('/analyses/', { params: { trade_id: tradeId } });
    return response.data;
  },
  create: async (data: { trade_id: number; title?: string; notes?: string; imageFile?: File }): Promise<PostTradeAnalysis> => {
    const form = new FormData();
    form.append('trade_id', String(data.trade_id));
    if (data.title) form.append('title', data.title);
    if (data.notes) form.append('notes', data.notes);
    if (data.imageFile) form.append('image', data.imageFile);
    const response = await postAnalysisAPI.post('/analyses/', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },
  update: async (id: number, data: { title?: string; notes?: string; imageFile?: File | null }): Promise<PostTradeAnalysis> => {
    const form = new FormData();
    if (data.title !== undefined) form.append('title', data.title);
    if (data.notes !== undefined) form.append('notes', data.notes);
    if (data.imageFile !== undefined) {
      if (data.imageFile) form.append('image', data.imageFile);
      else form.append('image', ''); // clearing not handled yet
    }
    const response = await postAnalysisAPI.patch(`/analyses/${id}/`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return response.data;
  },
  delete: async (id: number): Promise<void> => {
    await postAnalysisAPI.delete(`/analyses/${id}/`);
  }
};
