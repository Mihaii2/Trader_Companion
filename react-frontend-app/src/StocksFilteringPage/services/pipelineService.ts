import { PipelineStatus } from '../types/pipelineStatus';
import { API_CONFIG } from '../../config';

export async function getPipelineStatus(): Promise<PipelineStatus> {
    const response = await fetch(`${API_CONFIG.baseURL}/stock_filtering_app/pipeline/status`);
    if (!response.ok) {
        throw new Error(`Failed to fetch pipeline status: ${response.statusText}`);
    }
    return response.json();
}