import pandas as pd
import numpy as np

# Custom function to handle percentage change with negative Net profit margin values
def calculate_pct_change(previous, current):
    if previous == 0:
        return np.nan if current == 0 else np.sign(current) * np.inf
    else:
        return (current - previous) / abs(previous) * 100

# Read the input CSV file
input_file = './ranking_screens/passed_stocks_input_data/filtered_annual_fundamental_data_2years.csv'
df = pd.read_csv(input_file)

# Ensure the required columns exist
if 'Net profit margin' not in df.columns or 'Date' not in df.columns or 'Symbol' not in df.columns:
    raise ValueError("Input CSV is missing required columns: 'Net profit margin', 'Date', or 'Symbol'")

# Drop rows where Net profit margin is missing
df = df.dropna(subset=['Net profit margin'])

# Sort by Symbol and Date
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values(by=['Symbol', 'Date'])

# Group by stock symbol
grouped = df.groupby('Symbol')

# List to store results
filtered_stocks = []

# Iterate over each stock's data
for symbol, group in grouped:
    margin = [np.nan]  
    for prev, curr in zip(group['Net profit margin'][:-1], group['Net profit margin'][1:]):
        margin.append(calculate_pct_change(prev, curr))
    
    group['Net profit margin Growth'] = margin

    if len(group['Net profit margin Growth']) <= 1:
        continue

    avg_growth = np.nanmean(group['Net profit margin Growth'])
    
    # Check if average growth is at least 20%
    if avg_growth >= 20:
        filtered_stocks.append({
            'Symbol': symbol,
            'Annual-Net-margin-Increase(%)': avg_growth
        })

# Create DataFrame of filtered stocks
filtered_df = pd.DataFrame(filtered_stocks, columns=['Symbol', 'Annual-Net-margin-Increase(%)'])

# Ensure the CSV file is created with headers even if it's empty
output_file = './ranking_screens/results/annual_margin_acceleration_stocks.csv'
filtered_df.to_csv(output_file, index=False)

print(f"{len(filtered_stocks)} stocks with annual Net profit margin acceleration >= 20% saved to {output_file}")
