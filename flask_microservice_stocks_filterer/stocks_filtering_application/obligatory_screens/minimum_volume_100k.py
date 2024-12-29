import csv
from datetime import datetime, timedelta
from collections import defaultdict

def process_stocks(input_file, output_file, volume_threshold=100000, months=4):
    stocks = defaultdict(list)
    cutoff_date = datetime.now() - timedelta(days=30*months)

    # Read input CSV and group data by stock symbol
    with open(input_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            date = datetime.strptime(row['Date'].split()[0], '%Y-%m-%d')
            if date >= cutoff_date:
                stocks[row['Symbol']].append(int(row['Volume']))

    # Calculate average volume for each stock
    qualified_stocks = []
    for symbol, volumes in stocks.items():
        if volumes and sum(volumes) / len(volumes) >= volume_threshold:
            qualified_stocks.append(symbol)

    # Write qualified stocks to output CSV
    with open(output_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Symbol'])
        for symbol in qualified_stocks:
            writer.writerow([symbol])

    print(f"Min Volume Processing complete. {len(qualified_stocks)} stocks met the criteria.")

# Usage
input_file = './stock_api_data/nasdaq_stocks_1_year_price_data.csv'
output_file = './obligatory_screens/results/minimum_volume_100k.csv'
process_stocks(input_file, output_file)