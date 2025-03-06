import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
import multiprocessing as mp
from functools import partial

def process_symbol(symbol, df, min_data_points=252):
    """Process a single stock symbol against Minervini criteria"""
    # Get data for the current symbol
    stock_data = df[df['Symbol'] == symbol].sort_values('Date')
    
    # Skip if we don't have enough data
    if len(stock_data) < min_data_points:
        return None
    
    # Calculate moving averages more efficiently
    # We only need these values for the latest day and 1 month ago
    close_series = stock_data['Close']
    
    # Calculate latest values
    latest_close = close_series.iloc[-1]
    latest_ma50 = close_series.tail(50).mean()
    latest_ma150 = close_series.tail(150).mean()
    latest_ma200 = close_series.tail(200).mean()
    
    # Calculate 1-month ago values
    # Find index approximately 30 days prior to the last date
    last_date = stock_data['Date'].iloc[-1]
    one_month_ago_date = last_date - timedelta(days=30)
    one_month_ago_data = stock_data[stock_data['Date'] <= one_month_ago_date]
    
    if len(one_month_ago_data) < 200:  # Need enough data for 200-day MA one month ago
        return None
        
    # Get the data point closest to one month ago
    one_month_ago_idx = one_month_ago_data.index[-1]
    one_month_ago_close_data = stock_data.loc[one_month_ago_idx:one_month_ago_idx+199, 'Close']
    
    if len(one_month_ago_close_data) < 200:
        return None
        
    one_month_ago_ma200 = one_month_ago_close_data.mean()
    
    # Calculate 52-week high and low more efficiently
    year_data = stock_data.tail(min_data_points)
    low_52_week = year_data['Low'].min()
    high_52_week = year_data['High'].max()
    
    # Apply Minervini criteria
    try:
        # 1. Stock price is above both 150-day and 200-day moving averages
        condition1 = latest_close > latest_ma150 and latest_close > latest_ma200
        
        # 2. The 150-day moving average is above the 200-day moving average
        condition2 = latest_ma150 > latest_ma200
        
        # 3. The 200-day moving average line is trending up for at least 1 month
        condition3 = latest_ma200 > one_month_ago_ma200
        
        # 4. The 50-day moving average is above both 150-day and 200-day moving averages
        condition4 = latest_ma50 > latest_ma150 and latest_ma50 > latest_ma200
        
        # 5. Current stock price is at least 25% above its 52-week low
        condition5 = latest_close >= low_52_week * 1.25
        
        # 6. Current stock price is within at least 25% of its 52-week high
        condition6 = latest_close >= high_52_week * 0.75
        
        # 7. Current price is trading above the 50-day moving average
        condition7 = latest_close > latest_ma50
        
        # Check if all conditions are met
        all_conditions = condition1 and condition2 and condition3 and condition4 and condition5 and condition6 and condition7
        
        if all_conditions:
            return symbol
            
    except Exception as e:
        print(f"Error processing {symbol}: {e}")
    
    return None

def filter_stocks_minervini(file_path, output_file='minervini_1mo.csv', num_workers=None):
    """
    Filter stocks based on Minervini criteria and save the passing symbols to a CSV file.
    Uses multiprocessing for faster execution.
    
    Criteria:
    1. Stock price is above both 150-day and 200-day moving averages
    2. The 150-day moving average is above the 200-day moving average
    3. The 200-day moving average line is trending up for at least 1 month
    4. The 50-day moving average is above both 150-day and 200-day moving averages
    5. Current stock price is at least 25% above its 52-week low
    6. Current stock price is within at least 25% of its 52-week high
    7. Current price is trading above the 50-day moving average
    """
    # Read the CSV file
    print(f"Reading data from {file_path}...")
    
    # Use chunksize for large files
    chunks = pd.read_csv(file_path, chunksize=1000000)
    df_list = []
    for chunk in chunks:
        df_list.append(chunk)
    
    df = pd.concat(df_list)
    
    # Convert date column to datetime
    df['Date'] = pd.to_datetime(df['Date'])
    
    # Get unique symbols
    symbols = df['Symbol'].unique()
    print(f"Found {len(symbols)} unique stock symbols.")
    
    # Determine number of processes to use
    if num_workers is None:
        num_workers = min(mp.cpu_count(), len(symbols))
    
    print(f"Using {num_workers} worker processes")
    
    # Create a partial function with fixed df parameter
    process_symbol_partial = partial(process_symbol, df=df)
    
    # Set up multiprocessing pool
    with mp.Pool(processes=num_workers) as pool:
        # Process symbols in parallel and collect results
        results = list(pool.imap_unordered(process_symbol_partial, symbols))
        
    # Filter None values
    passing_symbols = [symbol for symbol in results if symbol is not None]
    
    # Save the results
    print(f"\nFound {len(passing_symbols)} stocks that pass all Minervini criteria.")
    result_df = pd.DataFrame({'Symbol': passing_symbols})
    result_df.to_csv(output_file, index=False)
    print(f"Results saved to {output_file}")
    
    return passing_symbols

def preprocess_data(file_path, output_file=None):
    """Preprocess data to optimize for faster analysis"""
    print(f"Preprocessing data from {file_path}...")
    
    # Determine output file name if not provided
    if output_file is None:
        file_name, file_ext = os.path.splitext(file_path)
        output_file = f"{file_name}_processed{file_ext}"
    
    # Read and process the data in chunks to handle large files
    chunks = pd.read_csv(file_path, chunksize=1000000)
    
    # Process first chunk to get column information
    first_chunk = next(chunks)
    essential_columns = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume', 'Symbol']
    available_columns = [col for col in essential_columns if col in first_chunk.columns]
    
    # Start processing from beginning
    chunks = pd.read_csv(file_path, chunksize=1000000, usecols=available_columns)
    
    # Process and save in chunks
    first_chunk = True
    for i, chunk in enumerate(chunks):
        print(f"Processing chunk {i+1}...")
        
        # Convert date and sort
        chunk['Date'] = pd.to_datetime(chunk['Date'])
        
        # Write to file
        mode = 'w' if first_chunk else 'a'
        header = first_chunk
        chunk.to_csv(output_file, mode=mode, header=header, index=False)
        first_chunk = False
    
    print(f"Preprocessed data saved to {output_file}")
    return output_file

if __name__ == "__main__":
    import argparse
    import time
    
    
    
    start_time = time.time()
    
    
    filtered_symbols = filter_stocks_minervini('../stock_api_data/nasdaq_stocks_1_year_price_data.csv', 'result.csv', 8)
    
    # Print first few symbols that passed
    if filtered_symbols:
        print("\nFirst 10 passing symbols:")
        for symbol in filtered_symbols[:10]:
            print(symbol)
    
    elapsed_time = time.time() - start_time
    print(f"\nTotal execution time: {elapsed_time:.2f} seconds")