import React, { useCallback, useEffect, useRef, useState, forwardRef } from "react";
import { Trade } from "@/TradeHistoryPage/types/Trade";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { analysisService, PostTradeAnalysis } from "../services/postAnalysis";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface TradeCaseDetailsProps {
  trade: Trade;
}

// forwardRef so parent can focus the drop zone when navigating trades via keyboard
const TradeCaseDetails = forwardRef<HTMLDivElement, TradeCaseDetailsProps>(({ trade }, ref) => {
  // Hooks must be first
  const [existingAnalyses, setExistingAnalyses] = useState<PostTradeAnalysis[]>([]);
  const [notes, setNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  type CaseData = {
    symbol?: string;
    total_score?: number;
    personal_opinion_score?: number;
    details?: string;
    demand_reason?: string;
    characteristics?: Record<string, unknown>;
  };
  let caseData: CaseData | null = null;
  if (trade.Case) {
    try {
      caseData = typeof trade.Case === "string" ? (JSON.parse(trade.Case) as CaseData) : (trade.Case as unknown as CaseData);
    } catch (err) {
      console.error("Invalid Case JSON:", err);
    }
  }

  const { symbol, total_score, personal_opinion_score, details, demand_reason, characteristics = {} } =
    caseData || {};

  const loadAnalyses = useCallback(async () => {
    try {
  const data = await analysisService.listByTrade(trade.ID);
  // Ensure newest first (fallback if backend not already sorted)
  const sorted = [...data].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  // If more than one exists, keep only the newest to save space
  if (sorted.length > 1) {
    // fire-and-forget deletions sequentially to avoid hammering API
    for (let i = 1; i < sorted.length; i++) {
      try { await analysisService.delete(sorted[i].id); } catch (err) { console.warn('Failed to delete old analysis', sorted[i].id, err); }
    }
    sorted.splice(1); // retain only first in local state
  }
  setExistingAnalyses(sorted);
  if (sorted.length) setNotes(sorted[0].notes || "");
    } catch (e) {
      console.error(e);
    }
  }, [trade.ID]);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  const handleFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed");
      return;
    }
    setError(null);
    setImageFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer.files);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const submitAnalysis = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (existingAnalyses.length) {
        // Update latest analysis. Only send image if user picked a new one so existing image isn't cleared.
        await analysisService.update(existingAnalyses[0].id, { notes, imageFile: imageFile || undefined });
      } else {
        // No existing record -> create new
        await analysisService.create({ trade_id: trade.ID, notes, imageFile: imageFile || undefined });
      }
      if (imageFile) setImageFile(null); // clear only if we just used a new image
      await loadAnalyses();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentImage = existingAnalyses[0]?.image;

  // Determine whether we have meaningful case data (avoid blocking UI if invalid/missing)
  const showCaseDetails = Boolean(
    caseData && (
      caseData.symbol ||
      caseData.total_score !== undefined ||
      caseData.personal_opinion_score !== undefined ||
      caseData.details ||
      caseData.demand_reason ||
      (caseData.characteristics && Object.keys(caseData.characteristics || {}).length > 0)
    )
  );

  // Preview for newly selected (unsaved) image
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl(null);
  }, [imageFile]);

  return (
    <Card className="mt-2 border border-border shadow-md rounded-xl">
      <CardContent className="p-4 space-y-6">
        <div className="space-y-3">
          <h4 className="font-semibold text-md">Post Analysis</h4>
          <div className="flex flex-col gap-4">
            {/* Image drop zone full-width first for maximum horizontal space */}
            <div
              ref={ref}
              tabIndex={-1} // allow programmatic focus
              aria-label="Trade analysis image drop zone"
              className="border-2 border-dashed rounded-md p-3 w-full text-center cursor-pointer hover:bg-muted/40 transition focus:outline-none focus:ring-2 focus:ring-ring/60"
              onDrop={onDrop}
              onDragOver={onDragOver}
              onClick={() => fileInputRef.current?.click()}
              data-drop-zone
            >
              {previewUrl ? (
                <div className="space-y-2">
                  <img src={previewUrl} alt="new upload preview" className="w-full h-auto max-h-[70vh] object-contain rounded" />
                  <p className="text-xs text-muted-foreground">(Unsaved) {imageFile?.name} — click or drop to replace</p>
                </div>
              ) : currentImage ? (
                <div className="space-y-2">
                  <img src={currentImage} alt="analysis" className="w-full h-auto max-h-[70vh] object-contain rounded" />
                  <p className="text-xs text-muted-foreground">Drag & drop or click to replace image</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Drop image here or click to browse</p>
              )}
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            <Textarea
              placeholder="Write your observations about this trade..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[140px]"
            />

            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" disabled={isSubmitting} onClick={submitAnalysis}>
                {isSubmitting ? 'Saving...' : 'Save Image & Notes'}
              </Button>
              {imageFile && (
                <Button size="sm" variant="secondary" onClick={() => setImageFile(null)}>Clear Image</Button>
              )}
            </div>
            {/* No older revision retention; only latest kept to save storage */}
          </div>
        </div>
        {showCaseDetails && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Case Details</h3>
            <div className="grid grid-cols-2 gap-0 text-sm">
              <p className="border-r border-b border-border" style={{ margin: 0, padding: '2px 6px' }}><span className="font-medium">Symbol:</span> {symbol}</p>
              <p className="border-b border-border" style={{ margin: 0, padding: '2px 6px' }}><span className="font-medium">Total Score:</span> {total_score}</p>
              <p className="border-r border-b border-border" style={{ margin: 0, padding: '2px 6px' }}><span className="font-medium">Opinion Score:</span> {personal_opinion_score}</p>
              <p className="border-b border-border" style={{ margin: 0, padding: '2px 6px' }}><span className="font-medium">Demand Reason:</span> {demand_reason || '—'}</p>
            </div>
            {details && (
              <div>
                <p className="font-medium">Details:</p>
                <p className="text-muted-foreground text-sm">{details}</p>
              </div>
            )}
            <div>
              <p className="font-medium mb-2">Characteristics:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-0 text-sm">
                {Object.entries(characteristics).map(([key, value], idx) => (
                  <div
                    key={key}
                    className={`flex items-center space-x-2 border-b border-border ${((idx + 1) % 3 !== 0) ? 'border-r' : ''}`}
                    style={{ padding: '2px 6px', margin: 0 }}
                  >
                    <Checkbox checked={Boolean(value)} disabled />
                    <span>{key}</span>
                  </div>
                ))}
              </div>
            </div>
            <hr className="border-border" />
          </div>
        )}

      </CardContent>
    </Card>
  );
});

TradeCaseDetails.displayName = "TradeCaseDetails";

export default TradeCaseDetails;
