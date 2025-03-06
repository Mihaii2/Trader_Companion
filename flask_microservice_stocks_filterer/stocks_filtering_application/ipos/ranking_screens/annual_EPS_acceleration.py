import pandas as pd
import numpy as np

# Custom function to handle percentage change with negative EPS values
def calculate_pct_change(previous, current):
    if previous == 0:
        return np.nan if current == 0 else np.sign(current) * np.inf
    else:
        return (current - previous) / abs(previous) * 100

# Read the input CSV file
input_file = './ranking_screens/passed_stocks_input_data/filtered_annual_fundamental_data_2years.csv'
df = pd.read_csv(input_file)

# Ensure the required columns exist
if 'EPS' not in df.columns or 'Date' not in df.columns or 'Symbol' not in df.columns:
    raise ValueError("Input CSV is missing required columns: 'EPS', 'Date', or 'Symbol'")

# Drop rows where EPS is missing
df = df.dropna(subset=['EPS'])

# Sort by Symbol and Date
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values(by=['Symbol', 'Date'])

# Group by stock symbol
grouped = df.groupby('Symbol')

# List to store results
filtered_stocks = []

# Iterate over each stock's data
for symbol, group in grouped:
    eps_growth = [np.nan]  
    for prev, curr in zip(group['EPS'][:-1], group['EPS'][1:]):
        eps_growth.append(calculate_pct_change(prev, curr))
    
    group['EPS Growth'] = eps_growth

    if len(group['EPS Growth']) <= 1:
        continue

    avg_growth = np.nanmean(group['EPS Growth'])
    
    # Check if average growth is at least 20%
    if avg_growth >= 20:
        filtered_stocks.append({
            'Symbol': symbol,
            'EPS-Increase(%)': avg_growth
        })

# Create DataFrame of filtered stocks
filtered_df = pd.DataFrame(filtered_stocks, columns=['Symbol', 'EPS-Increase(%)'])

# Ensure the CSV file is created with headers even if it's empty
output_file = './ranking_screens/results/annual_EPS_acceleration_stocks.csv'
filtered_df.to_csv(output_file, index=False)

print(f"{len(filtered_stocks)} stocks with annual EPS acceleration >= 20% saved to {output_file}")
