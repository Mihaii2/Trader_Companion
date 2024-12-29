import csv
from datetime import datetime

def process_stocks(input_file, output_file):
    stocks = {}
    skipped_rows = 0
    
    # Read the CSV file and process the data
    with open(input_file, 'r') as file:
        csv_reader = csv.DictReader(file)
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 to account for header row
            symbol = row['Symbol']
            date_str = row['Date'].split()[0] if row['Date'] else None
            close_price_str = row['Close']
            
            # Skip rows with missing data
            if not symbol or not date_str or not close_price_str:
                skipped_rows += 1
                continue
            
            try:
                date = datetime.strptime(date_str, '%Y-%m-%d')
                close_price = float(close_price_str)
            except ValueError as e:
                print(f"Error processing row {row_num}: {e}")
                skipped_rows += 1
                continue
            
            if symbol not in stocks:
                stocks[symbol] = {'prices': [], 'dates': []}
            
            stocks[symbol]['prices'].append(close_price)
            stocks[symbol]['dates'].append(date)

    # Find stocks that are at least 25% above their 52-week low
    qualified_stocks = []
    for symbol, data in stocks.items():
        prices = data['prices']
        dates = data['dates']
        
        if not prices or not dates:
            continue
        
        # Find the 52-week period
        latest_date = max(dates)
        one_year_ago = latest_date.replace(year=latest_date.year - 1)
        
        # Filter prices within the last 52 weeks
        prices_52_weeks = [price for price, date in zip(prices, dates) if date >= one_year_ago]
        
        if prices_52_weeks:
            low_52_week = min(prices_52_weeks)
            current_price = prices[-1]
            
            if current_price >= low_52_week * 1.25:
                qualified_stocks.append(symbol)

    # Write the qualified stocks to a new CSV file
    with open(output_file, 'w', newline='') as file:
        csv_writer = csv.writer(file)
        csv_writer.writerow(['Symbol'])
        for symbol in qualified_stocks:
            csv_writer.writerow([symbol])

    print(f"Above 52 week low analysis complete. {len(qualified_stocks)} stocks meeting the criteria have been saved to {output_file}.")
    print(f"Skipped {skipped_rows} rows due to missing or invalid data.")

# Usage
input_file = './stock_api_data/nasdaq_stocks_1_year_price_data.csv'
output_file = './obligatory_screens/results/above_52week_low.csv'
process_stocks(input_file, output_file)