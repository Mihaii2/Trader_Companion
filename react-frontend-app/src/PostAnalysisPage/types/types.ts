export interface MetricOption {
  id: number;
  name: string;
  value: number;
}

export interface Metric {
  id: number;
  name: string;
  description: string;
  options: MetricOption[];
  created_at: string;
  updated_at: string;
}


export interface TradeGrade {
  tradeId: number;
  metricId: string;
  selectedOptionId: string;
}

export interface APIError {
  message: string;
  details?: any;
}