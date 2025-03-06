import pandas as pd
import numpy as np

def calculate_pct_change(previous, current):
    if previous == 0:
        return np.nan if current == 0 else np.sign(current) * np.inf
    else:
        return (current - previous) / abs(previous) * 100

input_file = './ranking_screens/passed_stocks_input_data/filtered_annual_fundamental_data_2years.csv'
df = pd.read_csv(input_file)

df = df.dropna(subset=['Total Revenue'])
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values(by=['Symbol', 'Date'])

grouped = df.groupby('Symbol')
filtered_stocks = []

for symbol, group in grouped:
    if len(group) <= 1:
        continue
    
    sales_growth = [np.nan]
    for prev, curr in zip(group['Total Revenue'][:-1], group['Total Revenue'][1:]):
        sales_growth.append(calculate_pct_change(prev, curr))
    
    group['Revenue Growth'] = sales_growth
    
    valid_growth = [g for g in sales_growth if not np.isnan(g) and not np.isinf(g)]
    
    if len(valid_growth) > 0:
        avg_growth = np.mean(valid_growth)
        if avg_growth >= 10:
            filtered_stocks.append({
                'Symbol': symbol,
                'Annual-Revenue-Increase(%)': avg_growth
            })

filtered_df = pd.DataFrame(filtered_stocks)

output_file = './ranking_screens/results/annual_sales_acceleration_stocks.csv'
filtered_df.to_csv(output_file, index=False)

print(f"{len(filtered_stocks)} stocks with annual Revenue acceleration >= 10% saved to {output_file}")