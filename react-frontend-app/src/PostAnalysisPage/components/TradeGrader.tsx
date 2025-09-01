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

  const tradeDropZoneRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const expandedTradeIdRef = useRef<number | null>(null);
  useEffect(() => { expandedTradeIdRef.current = expandedTradeId; }, [expandedTradeId]);

  // Fullscreen image viewer state (declared after toggleTradeDetails so dependencies order is valid)
  const [fullscreenTradeId, setFullscreenTradeId] = useState<number | null>(null);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);

  const centerImageWithRetry = useCallback((tradeId: number, attempt = 0) => {
    if (expandedTradeIdRef.current !== tradeId) return; // trade no longer expanded
    const container = tradeDropZoneRefs.current[tradeId];
    if (!container) {
      if (attempt < 10) setTimeout(() => centerImageWithRetry(tradeId, attempt + 1), 80);
      return;
    }
    const img = container.querySelector('img');
    if (!img || !img.complete || (img as HTMLImageElement).naturalHeight === 0) {
      if (attempt < 15) setTimeout(() => centerImageWithRetry(tradeId, attempt + 1), 120);
      return;
    }
    const rect = img.getBoundingClientRect();
    const docTop = window.scrollY + rect.top;
    const targetScrollTop = docTop + rect.height / 2 - window.innerHeight / 2;
    window.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
  }, []);

  const toggleTradeDetails = useCallback((tradeId: number, focusAfter = false) => {
    setExpandedTradeId(prev => {
      const newId = prev === tradeId ? null : tradeId;
      if (focusAfter && newId !== null) {
        // Initial slight delay for render, then run retry-based centering
        setTimeout(() => {
          const container = tradeDropZoneRefs.current[newId];
            if (container) {
              container.focus();
            }
            centerImageWithRetry(newId, 0);
        }, 50);
      }
      return newId;
    });
  }, [centerImageWithRetry]);

  const getTradeIndexById = useCallback((id: number | null) => {
    if (id == null) return -1;
    return trades.findIndex(t => t.ID === id);
  }, [trades]);

  const openFullscreenForTrade = useCallback((tradeId: number) => {
    const container = tradeDropZoneRefs.current[tradeId];
    if (container) {
      const img = container.querySelector('img');
      if (img && (img as HTMLImageElement).src) {
        setFullscreenImageUrl((img as HTMLImageElement).src);
        setFullscreenTradeId(tradeId);
      }
    }
  }, []);

  const closeFullscreen = useCallback(() => {
    setFullscreenTradeId(null);
    setFullscreenImageUrl(null);
  }, []);

  const navigateFullscreen = useCallback((direction: 1 | -1) => {
    if (fullscreenTradeId == null || !trades.length) return;
    let idx = getTradeIndexById(fullscreenTradeId);
    if (idx === -1) return;
    idx = (idx + direction + trades.length) % trades.length;
    const nextTrade = trades[idx];
    if (expandedTradeId !== nextTrade.ID) {
      toggleTradeDetails(nextTrade.ID);
      setTimeout(() => openFullscreenForTrade(nextTrade.ID), 80);
    } else {
      openFullscreenForTrade(nextTrade.ID);
    }
  }, [fullscreenTradeId, trades, expandedTradeId, toggleTradeDetails, openFullscreenForTrade, getTradeIndexById]);

  // Keyboard navigation: left/right arrows move between trades and auto-focus image drop zone
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (fullscreenTradeId !== null) {
      if (e.key === 'Escape') { e.preventDefault(); closeFullscreen(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); navigateFullscreen(1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); navigateFullscreen(-1); return; }
      if (e.key.toLowerCase() === 'f') { e.preventDefault(); closeFullscreen(); return; }
    }
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      if (!trades.length) return;
      e.preventDefault();
      let currentIndex = expandedTradeId !== null ? trades.findIndex(t => t.ID === expandedTradeId) : -1;
      if (currentIndex === -1) {
        currentIndex = e.key === 'ArrowRight' ? -1 : trades.length;
      }
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      let nextIndex = currentIndex + delta;
      if (nextIndex < 0) nextIndex = trades.length - 1;
      if (nextIndex >= trades.length) nextIndex = 0;
      const nextTrade = trades[nextIndex];
      toggleTradeDetails(nextTrade.ID, true);
    }
    if (e.key.toLowerCase() === 'f' && expandedTradeId !== null) {
      e.preventDefault();
      openFullscreenForTrade(expandedTradeId);
    }
  }, [expandedTradeId, trades, toggleTradeDetails, fullscreenTradeId, closeFullscreen, navigateFullscreen, openFullscreenForTrade]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
                      <TradeCaseDetails
                        trade={trade}
      onRequestFullscreen={() => openFullscreenForTrade(trade.ID)}
                        ref={(el) => { tradeDropZoneRefs.current[trade.ID] = el; }}
                      />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
  {/* Quiet auto-save: no manual save warning banner */}
      {fullscreenTradeId !== null && fullscreenImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <img
            src={fullscreenImageUrl}
            alt="analysis fullscreen"
            className="max-w-[100vw] max-h-[100vh] object-contain select-none"
            draggable={false}
            onClick={closeFullscreen}
          />
          <div className="absolute top-3 left-4 text-xs text-white/70 space-x-4">
            <span className="hidden sm:inline">Esc / Click: Close</span>
            <span>← → Navigate</span>
            <span>F Close</span>
          </div>
          <button
            onClick={() => navigateFullscreen(-1)}
            className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3"
            aria-label="Previous image"
          >
            ‹
          </button>
          <button
            onClick={() => navigateFullscreen(1)}
            className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-3"
            aria-label="Next image"
          >
            ›
          </button>
          <button
            onClick={closeFullscreen}
            className="absolute top-2 right-2 md:top-4 md:right-4 bg-white/10 hover:bg-white/20 text-white rounded-full px-3 py-1 text-sm"
            aria-label="Close fullscreen"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};


export default TradeGrader;