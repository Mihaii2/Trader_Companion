import pandas as pd
import numpy as np

def calculate_pct_change(previous, current):
    if previous == 0:
        return np.nan if current == 0 else np.sign(current) * np.inf
    else:
        return (current - previous) / abs(previous) * 100

input_file = './ranking_screens/passed_stocks_input_data/filtered_quarterly_fundamental_data_2years.csv'
df = pd.read_csv(input_file)

df = df.dropna(subset=['Total Revenue'])
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values(by=['Symbol', 'Date'])

grouped = df.groupby('Symbol')
filtered_stocks = []

for symbol, group in grouped:
    if len(group) <= 1:
        continue  # Skip stocks with only one data point
    
    sales_growth = group['Total Revenue'].pct_change() * 100
    group['Revenue Growth'] = sales_growth
    
    valid_growth = group['Revenue Growth'].dropna()
    
    if len(valid_growth) == 0:
        continue  # Skip stocks with no valid growth calculations
    
    avg_growth = valid_growth.mean()
    
    if avg_growth >= 10:
        filtered_stocks.append({
            'Symbol': symbol,
            'Qrt-Revenue-Increase(%)': avg_growth,
            'Data Points': len(valid_growth)
        })

filtered_df = pd.DataFrame(filtered_stocks)

output_file = './ranking_screens/results/quarterly_sales_acceleration_stocks.csv'
filtered_df.to_csv(output_file, index=False)

print(f"{len(filtered_stocks)} stocks with quarterly Revenue acceleration >= 10% saved to {output_file}")
print(f"Average number of data points per stock: {filtered_df['Data Points'].mean():.2f}")