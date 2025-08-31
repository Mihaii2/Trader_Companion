import React, { useState } from 'react';
import { Edit2, Loader, Plus, X } from 'lucide-react';
import { Metric } from '../types/types';
import { metricService } from '../services/postAnalysis';


const MetricManager: React.FC<{
  metrics: Metric[];
  onRefetch: () => void;
}> = ({ metrics, onRefetch }) => {
  const [newMetricName, setNewMetricName] = useState('');
  const [newMetricDescription, setNewMetricDescription] = useState('');
  const [editingMetric, setEditingMetric] = useState<number | null>(null);
  const [newOptionName, setNewOptionName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddMetric = async () => {
    if (!newMetricName.trim()) return;
    
    setLoading(true);
    try {
      await metricService.createMetric({
        name: newMetricName.trim(),
        description: newMetricDescription.trim(),
        options: []
      });
      
      setNewMetricName('');
      setNewMetricDescription('');
      onRefetch();
    } catch (error) {
      console.error('Failed to create metric:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMetric = async (metricId: number) => {
    if (!confirm('Are you sure you want to delete this metric? This will also delete all associated grades.')) {
      return;
    }

    setLoading(true);
    try {
      await metricService.deleteMetric(metricId);
      onRefetch();
    } catch (error) {
      console.error('Failed to delete metric:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = async (metricId: number) => {
    if (!newOptionName.trim()) return;
    
    setLoading(true);
    try {
      await metricService.addOption(metricId, newOptionName.trim());
      setNewOptionName('');
      setEditingMetric(null);
      onRefetch();
    } catch (error) {
      console.error('Failed to add option:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOption = async (metricId: number, optionId: number) => {
    setLoading(true);
    try {
      await metricService.removeOption(metricId, optionId);
      onRefetch();
    } catch (error) {
      console.error('Failed to remove option:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center">
        <Edit2 className="mr-2" />
        Metric Manager
      </h2>
      
      {/* Add new metric */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Create New Metric</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={newMetricName}
            onChange={(e) => setNewMetricName(e.target.value)}
            placeholder="Enter metric name (e.g., Entry Point, Fundamentals)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          
          <button
            onClick={handleAddMetric}
            disabled={loading || !newMetricName.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? <Loader className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
            Add Metric
          </button>
        </div>
      </div>

      {/* Existing metrics */}
      <div className="space-y-4">
        {metrics.map(metric => (
          <div key={metric.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h4 className="text-lg font-medium">{metric.name}</h4>
                {metric.description && (
                  <p className="text-sm text-gray-600 mt-1">{metric.description}</p>
                )}
              </div>
              <button
                onClick={() => handleRemoveMetric(metric.id)}
                disabled={loading}
                className="text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Options */}
            <div className="mb-3">
              <div className="flex flex-wrap gap-2 mb-2">
                {metric.options.map(option => (
                  <div key={option.id} className="flex items-center bg-blue-100 rounded-full px-3 py-1">
                    <span className="text-sm">{option.name}</span>
                    <button
                      onClick={() => handleRemoveOption(metric.id, option.id)}
                      disabled={loading}
                      className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Add option */}
            {editingMetric === metric.id ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOptionName}
                  onChange={(e) => setNewOptionName(e.target.value)}
                  placeholder="Enter option name"
                  className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={loading}
                />
                <button
                  onClick={() => handleAddOption(metric.id)}
                  disabled={loading || !newOptionName.trim()}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600 disabled:opacity-50"
                >
                  {loading ? <Loader className="w-3 h-3 animate-spin" /> : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setEditingMetric(null);
                    setNewOptionName('');
                  }}
                  disabled={loading}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingMetric(metric.id)}
                disabled={loading}
                className="text-blue-500 hover:text-blue-700 text-sm flex items-center disabled:opacity-50"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Option
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


export default MetricManager;