import React from "react";
import { Trade } from "@/TradeHistoryPage/types/Trade";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

interface TradeCaseDetailsProps {
  trade: Trade;
}

const TradeCaseDetails: React.FC<TradeCaseDetailsProps> = ({ trade }) => {
  if (!trade.Case) return null;

  let caseData: any;
  try {
    caseData = typeof trade.Case === "string" ? JSON.parse(trade.Case) : trade.Case;
  } catch (err) {
    console.error("Invalid Case JSON:", err);
    return <p className="text-red-500 text-sm">Invalid case data</p>;
  }

  const { symbol, total_score, personal_opinion_score, details, demand_reason, characteristics } =
    caseData;

  return (
    <Card className="mt-2 border border-border shadow-md rounded-xl">
      <CardContent className="p-4 space-y-3">
        <h3 className="text-lg font-semibold">Case Details</h3>

        <div className="grid grid-cols-2 gap-0 text-sm">
          <p className="border-r border-b border-border" style={{margin:0,padding:'2px 6px'}}><span className="font-medium">Symbol:</span> {symbol}</p>
          <p className="border-b border-border" style={{margin:0,padding:'2px 6px'}}><span className="font-medium">Total Score:</span> {total_score}</p>
          <p className="border-r border-b border-border" style={{margin:0,padding:'2px 6px'}}><span className="font-medium">Opinion Score:</span> {personal_opinion_score}</p>
          <p className="border-b border-border" style={{margin:0,padding:'2px 6px'}}><span className="font-medium">Demand Reason:</span> {demand_reason || "—"}</p>
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
                className={`flex items-center space-x-2 border-b border-border ${((idx+1)%3!==0)?'border-r':''}`}
                style={{padding:'2px 6px',margin:0}}
              >
                <Checkbox checked={Boolean(value)} disabled />
                <span>{key}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradeCaseDetails;
