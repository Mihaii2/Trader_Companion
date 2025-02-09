import pandas as pd
import requests
from typing import Dict, Any

# API configuration
BASE_URL = "http://localhost:8000/trades_app"

def format_date(date_str: str) -> str:
    """Convert date string to YYYY-MM-DD format"""
    if pd.isna(date_str):
        return None
    try:
        return pd.to_datetime(date_str).strftime('%Y-%m-%d')
    except:
        return None

def prepare_trade(row: Dict[str, Any]) -> Dict[str, Any]:
    """Prepare trade data matching the exact format that works in Postman"""
    trade = {
        "ID": int(row["Id"]),
        "Ticker": str(row["Ticker"]),
        "Status": str(row["Status"]),
        "Entry_Date": format_date(row["Entry_Date"]),
        "Exit_Date": format_date(row["Exit_Date"]) if not pd.isna(row["Exit_Date"]) else None,
        "Entry_Price": float(row["Entry_Price"]),
        "Exit_Price": float(row["Exit_Price"]) if not pd.isna(row["Exit_Price"]) else None,
        "Pattern": str(row["Pattern"]),
        "Days_In_Pattern_Before_Entry": int(row["Days_In_Pattern_Before_Entry"]),
        "Price_Tightness_1_Week_Before": float(row["Price_Tightness_1_Week_Before"]),
        "Exit_Reason": str(row["Exit_Reason"]),
        "Market_Condition": str(row["Market_Condition"]),
        "Category": str(row["Category"]),
        "Earnings_Quality": int(row["Earnings_Quality"]),
        "Fundamentals_Quality": int(row["Fundamentals_Quality"]),  # Changed from bool to int
        "Has_Earnings_Acceleration": bool(row["Has_Earnings_Acceleration"]),
        "Has_Catalyst": bool(row["Has_Catalyst"]),
        "Earnings_Last_Q_20_Pct": bool(row["Earnings_Last_Q_20_Pct"]),
        "IPO_Last_10_Years": bool(row["IPO_Last_10_Years"]),
        "Nr_Bases": int(row["Nr_Bases"]),
        "Volume_Confirmation": bool(row["Volume_Confirmation"]),
        "Is_BioTech": bool(row["Is_BioTech"]),
        # Default values for missing columns
        "Earnings_Surprises": False,
        "Expanding_Margins": False,
        "EPS_breakout": False,
        "Strong_annual_EPS": False,
        "Signs_Acceleration_Will_Continue": False,
        "Sudden_Growth_Change": False,
        "Strong_Quarterly_And_Yearly_Sales": False,
        "Positive_Analysts_Revisions": False,
        "Ownership_Pct_Change_Past_Earnings": False,
        "Quarters_With_75pct_Surprise": False,
        "Over_10_pct_Avg_Surprise": False
    }
    return trade

def upload_trades(csv_path: str):
    """Read CSV and upload trades to the API"""
    try:
        # Read CSV file
        df = pd.read_csv(csv_path)
        
        # Create session for better performance
        session = requests.Session()
        session.headers.update({
            "Content-Type": "application/json",
            "Accept": "application/json"
        })
        
        # Track successful and failed uploads
        successful = 0
        failed = []
        
        # Process each trade
        for _, row in df.iterrows():
            try:
                trade_data = prepare_trade(row)
                
                # Make API request
                response = session.post(
                    f"{BASE_URL}/trades/",
                    json=trade_data
                )
                
                # Print request payload for debugging
                print(f"Sending payload for {trade_data['Ticker']}:")
                print(trade_data)
                
                # Check if request was successful
                response.raise_for_status()
                successful += 1
                print(f"Successfully uploaded trade for {trade_data['Ticker']}")
                
            except requests.exceptions.RequestException as e:
                error_detail = ""
                if hasattr(e.response, 'text'):
                    error_detail = f" - Details: {e.response.text}"
                
                failed.append({
                    "ticker": row["Ticker"],
                    "error": str(e) + error_detail
                })
                print(f"Failed to upload trade for {row['Ticker']}: {str(e)}{error_detail}")
        
        # Print summary
        print(f"\nUpload complete!")
        print(f"Successfully uploaded: {successful} trades")
        print(f"Failed uploads: {len(failed)} trades")
        
        if failed:
            print("\nFailed trades:")
            for fail in failed:
                print(f"- {fail['ticker']}: {fail['error']}")
                
    except Exception as e:
        print(f"Error processing CSV file: {str(e)}")

if __name__ == "__main__":
    csv_path = "trades.csv"  # Replace with your CSV file path
    upload_trades(csv_path)