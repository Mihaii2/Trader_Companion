export interface PipelineStatus {
  current_batch: number | null;
  current_step: string;
  end_time: number;
  last_updated: number;
  start_time: number;
  status: 'completed' | 'running' | 'failed';
  steps_completed: string[];
  total_batches: number | null;
}