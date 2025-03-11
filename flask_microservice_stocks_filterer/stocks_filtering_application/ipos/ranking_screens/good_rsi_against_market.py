import pandas as pd
import numpy as np
import yfinance as yf
import os

def compute_rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    """
    Computes the RSI (Relative Strength Index) for a given price series.
    Returns a pandas Series of RSI values aligned with the input index.
    """
    delta = prices.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)

    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    rsi = 100 - (100 / (1 + rs))
    return rsi

def main():
    # ------------------------------------------------------------------------------
    # 1) Locate the input_file under "flask_microservice_stocks_filterer" directory
    # ------------------------------------------------------------------------------
    script_dir = os.path.dirname(os.path.abspath(__file__))
    while (not script_dir.endswith("flask_microservice_stocks_filterer")
           and os.path.dirname(script_dir) != script_dir):
        script_dir = os.path.dirname(script_dir)

    input_file = os.path.join(
        script_dir,
        "stocks_filtering_application",
        "ipos",
        "ranking_screens",
        "passed_stocks_input_data",
        "filtered_price_data.csv"
    )

    # ------------------------------------------------------------------------------
    # 2) READ CSV & FORCE PARSE THE "Date" COLUMN AS A NAIVE DATETIME
    # ------------------------------------------------------------------------------
    print(f"Reading CSV from: {input_file}")
    df = pd.read_csv(input_file)

    print("\nDEBUG: Checking initial columns in df:", df.columns.tolist())
    print("DEBUG: Head of df:\n", df.head(), "\n")

    # Force-parse date strings (including time zones) to naive datetimes
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce", utc=True)
    df["Date"] = df["Date"].dt.tz_convert(None)

    # Drop any rows with no valid Date
    initial_count = len(df)
    df = df.dropna(subset=["Date"])
    print(f"DEBUG: Dropped {initial_count - len(df)} rows due to invalid 'Date'.")
    print("DEBUG: df shape after date parsing:", df.shape)

    # ------------------------------------------------------------------------------
    # 3) FILTER TO THE LAST ~3 MONTHS
    # ------------------------------------------------------------------------------
    last_date_in_stocks = df["Date"].max()
    three_months_ago = last_date_in_stocks - pd.DateOffset(months=3)
    df = df[df["Date"] >= three_months_ago].copy()
    print(f"DEBUG: After filtering to last 3 months (>= {three_months_ago.date()}), df shape: {df.shape}")

    # ------------------------------------------------------------------------------
    # 4) SORT & CALCULATE STOCK RSI USING GROUPBY TRANSFORM
    # ------------------------------------------------------------------------------
    df.sort_values(by=["Symbol", "Date"], inplace=True)
    df["StockRSI"] = df.groupby("Symbol")["Close"].transform(compute_rsi)

    print("DEBUG: Checking if StockRSI is filled or mostly NaN:")
    print(df["StockRSI"].describe())  # quick stats

    # ------------------------------------------------------------------------------
    # 5) FETCH MARKET DATA FROM YFINANCE & CALCULATE MARKET RSI
    # ------------------------------------------------------------------------------
    market_symbol = "^GSPC"  # S&P 500
    market_ticker = yf.Ticker(market_symbol)

    print(f"\nFetching market data for {market_symbol} from {three_months_ago.date()} to {last_date_in_stocks.date()}")
    market_data = market_ticker.history(
        start=three_months_ago.strftime("%Y-%m-%d"),
        end=last_date_in_stocks.strftime("%Y-%m-%d"),
        interval="1d"
    )

    market_data.reset_index(inplace=True)
    market_data.rename(columns={"Date": "MarketDate"}, inplace=True)

    # Ensure naive datetimes
    market_data["MarketDate"] = pd.to_datetime(market_data["MarketDate"], errors="coerce", utc=True)
    market_data["MarketDate"] = market_data["MarketDate"].dt.tz_convert(None)

    # Drop rows with invalid MarketDate
    market_data = market_data.dropna(subset=["MarketDate"])
    market_data.sort_values("MarketDate", inplace=True)

    # Compute MarketRSI
    market_data["MarketRSI"] = compute_rsi(market_data["Close"])
    print("DEBUG: market_data head:\n", market_data.head(), "\n")
    print("DEBUG: market_data MarketRSI describe:\n", market_data["MarketRSI"].describe(), "\n")

    # ------------------------------------------------------------------------------
    # 6) MERGE STOCK DATA & MARKET DATA ON "Date"
    # ------------------------------------------------------------------------------
    market_data.rename(columns={"MarketDate": "Date"}, inplace=True)
    merged = pd.merge(
        df.reset_index(drop=True),
        market_data[["Date", "Close", "MarketRSI"]].reset_index(drop=True),
        on="Date",
        how="left",
        suffixes=("", "_Market")
    )

    print("DEBUG: merged shape:", merged.shape)
    print("DEBUG: merged columns:", merged.columns.tolist())
    print("DEBUG: Head of merged:\n", merged.head(), "\n")

    # ------------------------------------------------------------------------------
    # 7) CALCULATE RSI_vs_Market
    # ------------------------------------------------------------------------------
    merged["RSI_vs_Market"] = merged["StockRSI"] - merged["MarketRSI"]

    # Group by Symbol to find indices of the max / min rows for RSI_vs_Market
    groupobj = merged.groupby("Symbol")["RSI_vs_Market"]

    def safe_idxmax(series):
        if series.notna().any():
            return series.idxmax()
        return np.nan

    def safe_idxmin(series):
        if series.notna().any():
            return series.idxmin()
        return np.nan

    idx_series_max = groupobj.apply(safe_idxmax).dropna()
    idx_series_min = groupobj.apply(safe_idxmin).dropna()

    # If no valid rows for either max or min, we stop
    if len(idx_series_max) == 0 and len(idx_series_min) == 0:
        print("WARNING: No valid rows found for any symbol (all RSI_vs_Market are NaN). Exiting early.")
        return

    # ------------------------------------------------------------------------------
    # 8) EXTRACT AND SAVE MAX & MIN RSI_vs_Market
    # ------------------------------------------------------------------------------
    # Get the rows for each symbol's max RSI_vs_Market
    best_days = merged.loc[idx_series_max, ["Symbol", "RSI_vs_Market"]].copy()
    best_days.rename(columns={"RSI_vs_Market": "Max_Market_RSI_Diff_3M"}, inplace=True)
    # Sort descending by the max difference
    best_days.sort_values(by="Max_Market_RSI_Diff_3M", ascending=False, inplace=True)
    
    max_output_file = os.path.join(
        script_dir,
        "stocks_filtering_application",
        "ipos",
        "ranking_screens",
        "results",
        "max_rsi_vs_market_3mo.csv"
    )
    best_days.to_csv(max_output_file, index=False)
    print(f"Saved MAX RSI difference to: {max_output_file}")

    # Get the rows for each symbol's min RSI_vs_Market
    worst_days = merged.loc[idx_series_min, ["Symbol", "RSI_vs_Market"]].copy()
    worst_days.rename(columns={"RSI_vs_Market": "Min_Market_RSI_Diff_3M"}, inplace=True)
    # Sort ascending by the min difference
    worst_days.sort_values(by="Min_Market_RSI_Diff_3M", ascending=False, inplace=True)
    
    min_output_file = os.path.join(
        script_dir,
        "stocks_filtering_application",
        "ipos",
        "ranking_screens",
        "results",
        "min_rsi_vs_market_3mo.csv"
    )
    worst_days.to_csv(min_output_file, index=False)
    print(f"Saved MIN RSI difference to: {min_output_file}")

    print("\nDone!")

if __name__ == "__main__":
    main()
