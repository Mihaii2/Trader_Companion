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
    const payload: any = { grades };
    if (deletions.length) {
      payload.deletions = deletions;
    }
    const response = await postAnalysisAPI.post('/grades/bulk_update/', payload);
    return response.data;
  }
};
