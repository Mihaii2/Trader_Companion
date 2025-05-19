import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def calculate_roc(data, period):
    """Calculate Rate of Change over the specified period"""
    return (data['Close'] / data['Close'].shift(period) - 1) * 100

def calculate_rs_rating(group):
    """Calculate IBD-style Relative Strength rating"""
    # Ensure we have enough data for the longest period (252 days)
    if len(group) <= 252:
        return np.nan
    
    # Calculate Rate of Change for different periods
    group['ROC_63'] = calculate_roc(group, 63)    # ~3 months
    group['ROC_126'] = calculate_roc(group, 126)  # ~6 months
    group['ROC_189'] = calculate_roc(group, 189)  # ~9 months
    group['ROC_252'] = calculate_roc(group, 252)  # ~12 months
    
    # Calculate Strength Factor using the provided formula
    # StrengthFactor = 0.4 * ROC(C, 63) + 0.2 * ROC(C, 126) + 0.2 * ROC(C, 189) + 0.2 * ROC(C, 252)
    group['StrengthFactor'] = (0.4 * group['ROC_63'] + 
                               0.2 * group['ROC_126'] + 
                               0.2 * group['ROC_189'] + 
                               0.2 * group['ROC_252'])
    
    # Return the most recent Strength Factor value
    return group['StrengthFactor'].iloc[-1]

def main():
    # Get the absolute path of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Find the absolute path of the "flask_microservice_stocks_filterer" directory
    while not script_dir.endswith("flask_microservice_stocks_filterer") and os.path.dirname(script_dir) != script_dir:
        script_dir = os.path.dirname(script_dir)

    # Define the input and output file paths
    input_file = os.path.join(script_dir, "stocks_filtering_application", "price_data", "all_tickers_historical.csv")
    output_file = os.path.join(script_dir, "stocks_filtering_application", "minervini_1mo", "obligatory_screens", "results", "raw_rs_file.csv")

    # Create output directory if it doesn't exist
    output_dir = os.path.dirname(output_file)
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    print(f"Resolved input file path: {input_file}")
    print(f"Resolved output file path: {output_file}")
    
    # Read the CSV file
    print("Reading historical stock data...")
    df = pd.read_csv(input_file, parse_dates=['Date'])
    
    # Group the data by stock symbol
    grouped = df.groupby('Symbol')
    
    # Calculate RS rating for each stock
    print("Calculating RS ratings for all stocks...")
    rs_values = {}
    
    for symbol, group in grouped:
        # Sort by date
        group = group.sort_values('Date')
        
        # Calculate RS rating
        rs_value = calculate_rs_rating(group)
        
        if not np.isnan(rs_value):
            rs_values[symbol] = rs_value
    
    # Convert to DataFrame
    rs_df = pd.DataFrame(list(rs_values.items()), columns=['Symbol', 'StrengthFactor'])
    
    # Rank stocks and calculate percentile (0-99)
    print("Ranking stocks based on RS rating...")
    rs_df['IBD_RSI'] = rs_df['StrengthFactor'].rank(pct=True) * 100
    rs_df['IBD_RSI'] = rs_df['IBD_RSI'].apply(lambda x: int(min(99, max(0, x))))  # Ensure between 0-99
    
    # Sort by RS rating in descending order
    rs_df = rs_df.sort_values('IBD_RSI', ascending=False)

    # Keep only Symbol and IBD_RSI columns
    rs_df = rs_df[['Symbol', 'IBD_RSI']]

    # Save to CSV
    print(f"Saving RS ratings for {len(rs_df)} stocks to {output_file}")
    rs_df.to_csv(output_file, index=False)
    print("RS rating calculation complete!")

if __name__ == "__main__":
    main()
