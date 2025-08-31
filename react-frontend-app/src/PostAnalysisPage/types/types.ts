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
  metricId: string; // kept as string to align with existing API
  selectedOptionId: string; // always present for actual saved grades
}

// For bulk deletion (unchecking a metric)
export interface TradeGradeDeletion {
  tradeId: number;
  metricId: string;
}

export interface APIError {
  message: string;
  details?: any;
}