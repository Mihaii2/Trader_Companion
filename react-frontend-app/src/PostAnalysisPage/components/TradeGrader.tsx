import { Trade } from '@/TradeHistoryPage/types/Trade';
import React from 'react';
import { Metric, TradeGrade, TradeGradeDeletion } from '../types/types';
import { Loader, Save } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { gradeService } from '../services/postAnalysis';
import TradeCaseDetails from './TradeCaseDetailsProps';


const TradeGrader: React.FC<{
  trades: Trade[];
  metrics: Metric[];
  tradeGrades: TradeGrade[];
}> = ({ trades, metrics, tradeGrades }) => {
  const [localGrades, setLocalGrades] = useState<TradeGrade[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false); // internal flag before auto-save completes
  const [expandedTradeId, setExpandedTradeId] = useState<number | null>(null);
  const [pendingDeletions, setPendingDeletions] = useState<TradeGradeDeletion[]>([]);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightSave = useRef<Promise<void> | null>(null);
  const latestGradesRef = useRef<TradeGrade[]>([]);
  const latestDeletionsRef = useRef<TradeGradeDeletion[]>([]);

  // Keep refs synced
  useEffect(() => {
    latestGradesRef.current = localGrades;
  }, [localGrades]);
  useEffect(() => {
    latestDeletionsRef.current = pendingDeletions;
  }, [pendingDeletions]);

  const toggleTradeDetails = (tradeId: number) => {
    setExpandedTradeId(prev => (prev === tradeId ? null : tradeId));
  };

  // Initialize local grades from props
  useEffect(() => {
    setLocalGrades([...tradeGrades]);
    setHasUnsavedChanges(false);
  }, [tradeGrades]);

  const getGradeForTrade = (tradeId: number, metricId: number): string | null => {
    const grade = localGrades.find(g => g.tradeId === tradeId && parseInt(g.metricId) === metricId);
    return grade?.selectedOptionId || null;
  };

  const scheduleAutoSave = useCallback(() => {
    setHasUnsavedChanges(true);
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const run = async () => {
        setSaving(true);
        const gradesSnapshot = [...latestGradesRef.current];
        const deletionsSnapshot = [...latestDeletionsRef.current];
        try {
          const saved = await gradeService.bulkUpdateGrades(gradesSnapshot, deletionsSnapshot);
          // Replace local grades with authoritative response if provided
          if (Array.isArray(saved)) {
            setLocalGrades(saved);
            latestGradesRef.current = saved;
          }
          // Clear only deletions we sent (simple approach: clear all)
          setPendingDeletions([]);
          latestDeletionsRef.current = [];
          setHasUnsavedChanges(false);
          // Intentionally NOT calling onGradesUpdate to avoid page refresh
        } catch (err) {
          console.error('Auto-save failed:', err);
        } finally {
          setSaving(false);
        }
      };
      const p = inFlightSave.current ? inFlightSave.current.then(run) : run();
      inFlightSave.current = p;
    }, 600);
  }, []);

  const updateLocalGrade = (tradeId: number, metricId: number, optionId: number) => {
    // Remove any previous grade for this trade/metric
    const newGrades = localGrades.filter(
      g => !(g.tradeId === tradeId && parseInt(g.metricId) === metricId)
    );

    // Add new one
    newGrades.push({
      tradeId,
      metricId: metricId.toString(),
      selectedOptionId: optionId.toString()
    });

  setLocalGrades(newGrades);
  scheduleAutoSave();
  };

  const clearLocalGrade = (tradeId: number, metricId: number) => {
    // Remove the grade for this trade/metric entirely (no selection)
    const newGrades = localGrades.filter(
      g => !(g.tradeId === tradeId && parseInt(g.metricId) === metricId)
    );
    setLocalGrades(newGrades);
    // Record deletion so backend can delete persisted grade
    setPendingDeletions(prev => {
      const exists = prev.find(d => d.tradeId === tradeId && parseInt(d.metricId) === metricId);
      if (exists) return prev; // avoid duplicates
      return [...prev, { tradeId, metricId: metricId.toString() }];
    });
  scheduleAutoSave();
  };

  const toggleGrade = (tradeId: number, metricId: number, optionId: number) => {
    const current = getGradeForTrade(tradeId, metricId);
    if (current === optionId.toString()) {
      // Clicking the already selected option -> unselect (clear)
      clearLocalGrade(tradeId, metricId);
    } else {
      updateLocalGrade(tradeId, metricId, optionId);
    }
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  if (metrics.length === 0) {
    return (
      <div className="bg-background rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Save className="mr-2" />
          Trade Grader
        </h2>
        <p className="text-muted-foreground">Please create some metrics first to start grading trades.</p>
      </div>
    );
  }

  return (
  <div className="bg-background rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold flex items-center">
          <Save className="mr-2" />
          Trade Grader
        </h2>
        <div className="text-sm text-muted-foreground h-5 flex items-center">
          {saving && (
            <span className="flex items-center"><Loader className="w-4 h-4 mr-1 animate-spin" /> Saving</span>
          )}
          {!saving && hasUnsavedChanges && <span>Pending…</span>}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border px-4 py-2 text-left">Ticker</th>
              <th className="border border-border px-4 py-2 text-left">Entry Date</th>
              <th className="border border-border px-4 py-2 text-left">Exit Date</th>
              {metrics.map(metric => (
                <th key={metric.id} className="border border-border px-4 py-2 text-left">
                  {metric.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map(trade => (
              <React.Fragment key={trade.ID}>
                <tr className="hover:bg-muted">
                  {/* Clickable cells */}
                  <td
                    className="border border-border px-4 py-2 font-medium cursor-pointer"
                    onClick={() => toggleTradeDetails(trade.ID)}
                  >
                    {trade.Ticker}
                  </td>
                  <td
                    className="border border-border px-4 py-2 cursor-pointer"
                    onClick={() => toggleTradeDetails(trade.ID)}
                  >
                    {trade.Entry_Date}
                  </td>
                  <td
                    className="border border-border px-4 py-2 cursor-pointer"
                    onClick={() => toggleTradeDetails(trade.ID)}
                  >
                    {trade.Exit_Date}
                  </td>

                  {/* Non-clickable grading cells */}
                  {metrics.map(metric => (
                    <td key={metric.id} className="border border-border px-4 py-2">
                      <div className="space-y-1">
                        {metric.options.map(option => (
                          <label key={option.id} className="flex items-center">
                            <input
                              type="checkbox" /* Using checkbox to allow unchecking by clicking again */
                              value={option.id}
                              checked={getGradeForTrade(trade.ID, metric.id) === option.id.toString()}
                              onChange={() => toggleGrade(trade.ID, metric.id, option.id)}
                              className="mr-2"
                            />
                            <span className="text-sm">{option.name}</span>
                          </label>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Dropdown row */}
                {expandedTradeId === trade.ID && (
                  <tr>
                    <td colSpan={3 + metrics.length} className="p-2 bg-muted/30">
                      <TradeCaseDetails trade={trade} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
  {/* Quiet auto-save: no manual save warning banner */}
    </div>
  );
};


export default TradeGrader;