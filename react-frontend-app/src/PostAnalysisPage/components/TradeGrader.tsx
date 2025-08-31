import { Trade } from '@/TradeHistoryPage/types/Trade';
import React from 'react';
import { Metric, TradeGrade } from '../types/types';
import { Loader, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { gradeService } from '../services/postAnalysis';



const TradeGrader: React.FC<{
  trades: Trade[];
  metrics: Metric[];
  tradeGrades: TradeGrade[];
  onGradesUpdate: () => void;
}> = ({ trades, metrics, tradeGrades, onGradesUpdate }) => {
  const [localGrades, setLocalGrades] = useState<TradeGrade[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize local grades from props
  useEffect(() => {
    setLocalGrades([...tradeGrades]);
    setHasUnsavedChanges(false);
  }, [tradeGrades]);

  const getGradeForTrade = (tradeId: number, metricId: number): string | null => {
    const grade = localGrades.find(g => g.tradeId === tradeId && parseInt(g.metricId) === metricId);
    return grade?.selectedOptionId || null;
  };

  const updateLocalGrade = (tradeId: number, metricId: number, optionId: number) => {
    const newGrades = localGrades.filter(g => !(g.tradeId === tradeId && parseInt(g.metricId) === metricId));
    newGrades.push({
      tradeId,
      metricId: metricId.toString(),
      selectedOptionId: optionId.toString()
    });
    
    setLocalGrades(newGrades);
    setHasUnsavedChanges(true);
  };

  const handleSaveGrades = async () => {
    setSaving(true);
    try {
      await gradeService.bulkUpdateGrades(localGrades);
      setHasUnsavedChanges(false);
      onGradesUpdate();
    } catch (error) {
      console.error('Failed to save grades:', error);
    } finally {
      setSaving(false);
    }
  };

  if (metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Save className="mr-2" />
          Trade Grader
        </h2>
        <p className="text-gray-600">Please create some metrics first to start grading trades.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center">
          <Save className="mr-2" />
          Trade Grader
        </h2>
        
        {hasUnsavedChanges && (
          <button
            onClick={handleSaveGrades}
            disabled={saving}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 flex items-center"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </button>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-2 text-left">Ticker</th>
              {metrics.map(metric => (
                <th key={metric.id} className="border border-gray-300 px-4 py-2 text-left">
                  {metric.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => (
              <tr key={trade.ID} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">
                  {trade.Ticker}
                </td>
                {metrics.map(metric => (
                  <td key={metric.id} className="border border-gray-300 px-4 py-2">
                    <div className="space-y-1">
                      {metric.options.map(option => (
                        <label key={option.id} className="flex items-center">
                          <input
                            type="radio"
                            name={`trade-${trade.ID}-metric-${metric.id}`}
                            value={option.id}
                            checked={getGradeForTrade(trade.ID, metric.id) === option.id.toString()}
                            onChange={() => updateLocalGrade(trade.ID, metric.id, option.id)}
                            className="mr-2"
                          />
                          <span className="text-sm">{option.name}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {hasUnsavedChanges && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-yellow-800 text-sm">
            You have unsaved changes. Don't forget to save your grades!
          </p>
        </div>
      )}
    </div>
  );
};


export default TradeGrader;