import pandas as pd
import numpy as np

def calculate_pct_change(previous, current):
    if previous == 0:
        return np.nan if current == 0 else np.sign(current) * np.inf
    else:
        return (current - previous) / abs(previous) * 100

input_file = './ranking_screens/passed_stocks_input_data/filtered_quarterly_fundamental_data_2years.csv'
df = pd.read_csv(input_file)

df = df.dropna(subset=['EPS'])

df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values(by=['Symbol', 'Date'])

grouped = df.groupby('Symbol')

filtered_stocks = []

for symbol, group in grouped:
    group = group.sort_values(by='Date')
    
    group['Trend EPS'] = group['EPS'].rolling(window=3).mean()

    # Check if we have enough data points
    if len(group) >= 3:
        latest_eps = group['EPS'].iloc[-1]
        trend_eps = group['Trend EPS'].iloc[-2]  # Second-to-last value

        if pd.notna(trend_eps) and trend_eps > 0:
            breakout_pct = calculate_pct_change(trend_eps, latest_eps)
            
            if breakout_pct >= 50:
                filtered_stocks.append({
                    'Symbol': symbol,
                    'EPS-Breakout(%)': breakout_pct
                })

filtered_df = pd.DataFrame(filtered_stocks)

output_file = './ranking_screens/results/eps_breakout_stocks.csv'
filtered_df.to_csv(output_file, index=False)

print(f"{len(filtered_stocks)} stocks with EPS breakout >= 50% over trend saved to {output_file}")