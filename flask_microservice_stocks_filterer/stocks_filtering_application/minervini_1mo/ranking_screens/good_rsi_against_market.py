import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import os

def calculate_relative_strength(stock_df, sp500_df):
    """
    Calculate the relative strength of a stock compared to S&P 500
    
    Returns the maximum relative strength over the last 3 months
    """
    # Make a copy of the dataframes to avoid modifying the originals
    stock_df = stock_df.copy()
    sp500_df = sp500_df.copy()
    
    # Convert dates to string format for merging
    stock_df['DateStr'] = stock_df['Date'].dt.strftime('%Y-%m-%d')
    sp500_df['DateStr'] = sp500_df['Date'].dt.strftime('%Y-%m-%d')
    
    # Merge on date strings to avoid timezone issues
    # Note: We use the exact renamed column after flattening (Close_^GSPC)
    merged_df = pd.merge(
        stock_df[['DateStr', 'Close', 'Symbol']], 
        sp500_df[['DateStr', 'Close_^GSPC']], 
        on='DateStr'
    )
    
    if merged_df.empty:
        return 0, pd.DataFrame()
    
    # Calculate daily returns for both stock and S&P 500
    merged_df['stock_return'] = merged_df['Close'].pct_change()
    merged_df['sp500_return'] = merged_df['Close_^GSPC'].pct_change()
    
    # Calculate relative strength (stock return / S&P 500 return)
    merged_df['relative_strength'] = merged_df['stock_return'] / merged_df['sp500_return']
    
    # Replace inf values with NaN and drop NaN values
    merged_df.replace([np.inf, -np.inf], np.nan, inplace=True)
    merged_df.dropna(subset=['relative_strength'], inplace=True)
    
    if len(merged_df) < 14:
        return 0, pd.DataFrame()
    
    # Calculate 14-day RSI of relative strength
    delta = merged_df['relative_strength'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    
    # Avoid division by zero
    loss = loss.replace(0, np.nan)
    rs = gain / loss
    merged_df['rs_rsi'] = 100 - (100 / (1 + rs))
    
    # Find maximum RSI in the last 3 months
    max_rs_rsi = merged_df['rs_rsi'].dropna().max() if not merged_df['rs_rsi'].dropna().empty else 0
    
    return max_rs_rsi, merged_df[['DateStr', 'rs_rsi', 'Symbol']].dropna()

def main():
    # Get the absolute path of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Find the absolute path of the "flask_microservice_stocks_filterer" directory
    while not script_dir.endswith("flask_microservice_stocks_filterer") and os.path.dirname(script_dir) != script_dir:
        script_dir = os.path.dirname(script_dir)

    # Append the correct relative path to the input and output files
    input_file = os.path.join(script_dir, "stocks_filtering_application", "minervini_1mo", "ranking_screens", "passed_stocks_input_data", "filtered_price_data.csv")
    output_file = os.path.join(script_dir, "stocks_filtering_application", "minervini_1mo", "ranking_screens", "results", "top_relative_strength_3m.csv")

    
    # Read CSV with proper date parsing
    df = pd.read_csv(input_file)
    df['Date'] = pd.to_datetime(df['Date'], utc=True)
    
    # Get today's date and date 3 months ago
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)
    
    # Format dates for yfinance
    start_str = start_date.strftime('%Y-%m-%d')
    end_str = end_date.strftime('%Y-%m-%d')
    
    # Fetch S&P 500 data for the same period
    sp500_data = yf.download('^GSPC', start=start_str, end=end_str)
    
    # Reset index to convert the date index to a column
    sp500_df = sp500_data.reset_index()
    
    # If sp500_df has a MultiIndex, flatten it
    if isinstance(sp500_df.columns, pd.MultiIndex):
        # For each level in the MultiIndex, join the names with '_'
        sp500_df.columns = ['_'.join(col).strip('_') for col in sp500_df.columns.values]
    
    # Convert S&P 500 dates to UTC for consistency
    sp500_df['Date'] = pd.to_datetime(sp500_df['Date'], utc=True)
    
    # Create a dictionary to store max relative strength for each symbol
    rel_strength_results = {}
    
    # Process each stock
    symbols = df['Symbol'].unique()
    
    for i, symbol in enumerate(symbols):
        # Get data for this symbol
        stock_data = df[df['Symbol'] == symbol].copy()
        
        # Convert dates to string format for easier filtering
        start_date_str = start_date.strftime('%Y-%m-%d')
        end_date_str = end_date.strftime('%Y-%m-%d')
        stock_data_date_str = stock_data['Date'].dt.strftime('%Y-%m-%d')
        
        # Make sure dates are within the 3-month window
        mask = (stock_data_date_str >= start_date_str) & (stock_data_date_str <= end_date_str)
        stock_data_filtered = stock_data.loc[mask]
        
        if len(stock_data_filtered) >= 14:  # Need at least 14 days for RSI calculation
            try:
                max_rs, rs_df = calculate_relative_strength(stock_data_filtered, sp500_df)
                if max_rs > 0:  # Only include stocks with valid RSI
                    rel_strength_results[symbol] = max_rs
            except Exception:
                pass
    
    if not rel_strength_results:
        return
        
    # Create a DataFrame with the results
    result_df = pd.DataFrame({
        'Symbol': list(rel_strength_results.keys()),
        'RSI_Against_Market_3m': list(rel_strength_results.values())
    })
    
    # Sort by max relative strength in descending order
    result_df = result_df.sort_values('RSI_Against_Market_3m', ascending=False)
    
    # Make sure output directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Write the results to the output CSV file
    result_df.to_csv(output_file, index=False)
    
    print(f"Top stocks by relative strength have been saved to {output_file}")

if __name__ == "__main__":
    main()