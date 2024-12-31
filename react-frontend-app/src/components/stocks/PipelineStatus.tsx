import React from 'react';
import { usePipelineStatus } from '../../hooks/usePipelineStatus';

interface PipelineStatusProps {
    pollingInterval?: number;
}

export const PipelineStatus: React.FC<PipelineStatusProps> = ({ 
    pollingInterval = 1000 // Poll every second by default
}) => {
    const { status, error, isLoading } = usePipelineStatus({ pollingInterval });

    if (isLoading) {
        return (
            <div className="p-2 rounded-lg bg-gray-100">
                <p className="text-sm text-gray-600">Loading pipeline status...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-2 rounded-lg bg-red-100">
                <p className="text-sm text-red-600">Error: {error.message}</p>
            </div>
        );
    }

    if (!status) {
        return null;
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'running':
                return 'bg-blue-100 text-blue-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleTimeString();  // Only showing time for compactness
    };

    return (
        <div className="p-3 rounded-lg bg-white shadow-sm border">
            {/* Header row with status */}
            <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-medium">Pipeline Status</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status.status)}`}>
                    {status.status.toUpperCase()}
                </span>
            </div>

            {/* Info row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 mb-2">
                <span>
                    Step: <span className="font-medium">{status.current_step}</span>
                </span>
                {status.current_batch && (
                    <span>
                        Batch: {status.current_batch}/{status.total_batches}
                    </span>
                )}
                <span>Started: {formatTime(status.start_time)}</span>
                <span>Last Updated: {formatTime(status.last_updated)}</span>
            </div>

            {/* Steps row */}
            <div className="flex flex-wrap gap-1 text-xs">
                {status.steps_completed.map((step) => (
                    <span 
                        key={step} 
                        className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700"
                    >
                        <svg className="w-3 h-3 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        {step}
                    </span>
                ))}
            </div>
        </div>
    );
};