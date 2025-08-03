// types/Trade.ts

export interface Trade {
  ID: number;
  Ticker: string;
  Status: string;
  Entry_Date: string;
  Exit_Date: string | null;
  Entry_Price: number;
  Exit_Price: number | null;
  Return: number | null;
  Pattern: string;
  // Days_In_Pattern_Before_Entry: number;
  Price_Tightness_1_Week_Before: number;
  Exit_Reason: string;
  Market_Condition: string;
  Category: string;
  // Earnings_Quality: number;
  // Fundamentals_Quality: number;
  Nr_Bases: number;
  Has_Earnings_Acceleration: boolean;
  Has_Catalyst: boolean;
  // Earnings_Last_Q_20_Pct: boolean;
  IPO_Last_10_Years: boolean;
  // Volume_Confirmation: boolean;
  Is_BioTech: boolean;
  // Earnings_Surprises: boolean;
  // Expanding_Margins: boolean;
  // EPS_breakout: boolean;
  Strong_annual_EPS: boolean;
  Signs_Acceleration_Will_Continue: boolean;
  // Sudden_Growth_Change: boolean;
  // Strong_Quarterly_Sales: boolean;
  // Strong_Yearly_Sales: boolean;
  // Positive_Analysts_EPS_Revisions: boolean;
  // Positive_Analysts_Price_Revisions: boolean;
  // Ownership_Pct_Change_Past_Earnings: boolean;
  // Quarters_With_75pct_Surprise: boolean;
  // Over_10_pct_Avg_Surprise: boolean;
  Under_30M_Shares: boolean;
  Case: string;
  // Spikes_On_Volume: boolean;
  // Started_Off_Correction: boolean;
  // All_Trendlines_Up: boolean;
  If_You_Could_Only_Make_10_Trades: boolean;
  Pct_Off_52W_High: number;
}