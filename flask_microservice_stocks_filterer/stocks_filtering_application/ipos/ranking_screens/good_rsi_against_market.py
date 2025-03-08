import pandas as pd
import numpy as np
import yfinance as yf
from datetime import datetime, timedelta
import os

def calculate_relative_strength(stock_df, sp500_df):
    """
    Calculate the relative strength of a stock compared to S&P 500
    
    Returns the maximum relative strength over the last month
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
    
    # For shorter timeframe (1 month), we'll adjust the RSI period to 10 days
    # This allows for better responsiveness for recent IPOs
    rsi_period = 10
    
    if len(merged_df) < rsi_period:
        return 0, pd.DataFrame()
    
    # Calculate RSI of relative strength with shorter period
    delta = merged_df['relative_strength'].diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=rsi_period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=rsi_period).mean()
    
    # Avoid division by zero
    loss = loss.replace(0, np.nan)
    rs = gain / loss
    merged_df['rs_rsi'] = 100 - (100 / (1 + rs))
    
    # Find maximum RSI in the last month
    max_rs_rsi = merged_df['rs_rsi'].dropna().max() if not merged_df['rs_rsi'].dropna().empty else 0
    
    return max_rs_rsi, merged_df[['DateStr', 'rs_rsi', 'Symbol']].dropna()

def main():
    # Read the input CSV file
    # Get the absolute path of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Find the absolute path of the "flask_microservice_stocks_filterer" directory
    while not script_dir.endswith("flask_microservice_stocks_filterer") and os.path.dirname(script_dir) != script_dir:
        script_dir = os.path.dirname(script_dir)

    # Append the correct relative path to the input and output files
    input_file = os.path.join(script_dir, "stocks_filtering_application", "ipos", "ranking_screens", "passed_stocks_input_data", "filtered_price_data.csv")
    output_file = os.path.join(script_dir, "stocks_filtering_application", "ipos", "ranking_screens", "results", "top_relative_strength_1m.csv")
    ipo_output_file = os.path.join(script_dir, "stocks_filtering_application", "ipos", "ranking_screens", "results", "strong_recent_ipos.csv")

    # Ensure output directories exist
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    os.makedirs(os.path.dirname(ipo_output_file), exist_ok=True)

    
    # Read CSV with proper date parsing
    df = pd.read_csv(input_file)
    df['Date'] = pd.to_datetime(df['Date'], utc=True)
    
    # Get today's date and date 1 month ago - make them timezone aware
    end_date = pd.Timestamp(datetime.now()).tz_localize('UTC')
    start_date = end_date - pd.Timedelta(days=30)  # Changed from 90 to 30 days
    
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
        
        # Convert stock_data dates to string for consistent comparison
        stock_data['Date_Str'] = stock_data['Date'].dt.strftime('%Y-%m-%d')
        
        # Make sure dates are within the 1-month window
        mask = (stock_data['Date_Str'] >= start_date_str) & (stock_data['Date_Str'] <= end_date_str)
        stock_data_filtered = stock_data.loc[mask]
        
        # For IPO detection, use string comparison to avoid timezone issues
        comparison_date = (start_date - pd.Timedelta(days=15)).strftime('%Y-%m-%d')
        earliest_date_str = stock_data['Date'].min().strftime('%Y-%m-%d')
        is_potential_ipo = (earliest_date_str >= comparison_date)
        
        # For potential IPOs, we want at least 5 days of data
        min_days_required = 5 if is_potential_ipo else 10
        
        if len(stock_data_filtered) >= min_days_required:
            try:
                max_rs, rs_df = calculate_relative_strength(stock_data_filtered, sp500_df)
                if max_rs > 0:  # Only include stocks with valid RSI
                    rel_strength_results[symbol] = max_rs
            except Exception as e:
                pass
    
    if not rel_strength_results:
        return
        
    # Create a DataFrame with the results
    result_df = pd.DataFrame({
        'Symbol': list(rel_strength_results.keys()),
        'RSI_Against_Market_1m': list(rel_strength_results.values())
    })
    
    # Sort by max relative strength in descending order
    result_df = result_df.sort_values('RSI_Against_Market_1m', ascending=False)
    
    # Make sure output directory exists
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    # Write the results to the output CSV file
    result_df.to_csv(output_file, index=False)
    
    # Let's also flag potential recent IPOs with strong performance
    # Consider stocks with less than 45 days of data as recent IPOs
    all_stock_data = df.copy()
    ipo_candidates = {}
    
    for symbol in result_df['Symbol']:
        symbol_data = all_stock_data[all_stock_data['Symbol'] == symbol]
        
        # Convert to string dates for comparison
        min_date_str = symbol_data['Date'].min().strftime('%Y-%m-%d')
        max_date_str = symbol_data['Date'].max().strftime('%Y-%m-%d')
        
        # Calculate date range in days
        min_date = pd.to_datetime(min_date_str)
        max_date = pd.to_datetime(max_date_str)
        date_range = (max_date - min_date).days
        
        if date_range <= 45:  # Likely a recent IPO
            rank = result_df[result_df['Symbol'] == symbol].index[0] + 1
            ipo_candidates[symbol] = {
                'rank': rank, 
                'days_trading': date_range
            }
    
    if ipo_candidates:
        ipo_df = pd.DataFrame.from_dict(ipo_candidates, orient='index')
        ipo_df.reset_index(inplace=True)
        ipo_df.rename(columns={'index': 'Symbol'}, inplace=True)
        ipo_df.sort_values('rank', inplace=True)
        
        # Save IPO list to separate file
        ipo_df.to_csv(ipo_output_file, index=False)
        print(f"Strong recent IPOs have been saved to {ipo_output_file}")

if __name__ == "__main__":
    main()