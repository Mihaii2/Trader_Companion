import csv
from datetime import datetime
from collections import defaultdict

def check_52_week_high(input_file, output_file):
    # Dictionary to store data for each stock
    stocks = defaultdict(list)
    skipped_rows = 0

    # Read the input CSV file
    with open(input_file, 'r') as csvfile:
        reader = csv.DictReader(csvfile)
        for row_num, row in enumerate(reader, start=2):  # Start at 2 to account for header row
            try:
                date = datetime.strptime(row['Date'].split()[0], '%Y-%m-%d')
                high_str = row['High'].strip()
                symbol = row['Symbol']
                
                if not high_str or not symbol:
                    raise ValueError("Missing 'High' or 'Symbol' value")
                
                high = float(high_str)
                stocks[symbol].append((date, high))
            except (ValueError, KeyError) as e:
                print(f"Error processing row {row_num}: {e}")
                skipped_rows += 1
                continue

    # Find stocks that hit 52-week high in the last trading day
    results = []
    for symbol, data in stocks.items():
        # Sort data by date
        data.sort(key=lambda x: x[0])
        
        # Get the last 252 trading days (approximately 1 year)
        last_year_data = data[-252:]
        
        if len(last_year_data) > 0:
            last_day = last_year_data[-1]
            year_high = max(last_year_data, key=lambda x: x[1])[1]
            
            if last_day[1] == year_high:
                results.append(symbol)

    # Write results to output CSV file
    with open(output_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Symbol'])
        for symbol in results:
            writer.writerow([symbol])

    print(f"New 52-week-high analysis complete. {len(results)} stocks hit 52-week high in the last trading day.")
    print(f"Skipped {skipped_rows} rows due to missing or invalid data.")

# Usage
input_file = './stock_api_data/nasdaq_stocks_1_year_price_data.csv'
output_file = './market_sentiment_screens/results/52week_high_1_days.csv'
check_52_week_high(input_file, output_file)