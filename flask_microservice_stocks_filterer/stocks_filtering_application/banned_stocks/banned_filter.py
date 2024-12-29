import csv
from datetime import datetime, timedelta

def read_symbols(file_path):
    with open(file_path, 'r') as f:
        return [row['Symbol'] for row in csv.DictReader(f)]

def read_banned_symbols(file_path):
    banned_dict = {}
    with open(file_path, 'r') as f:
        for row in csv.DictReader(f):
            banned_dict[row['Symbol']] = {
                'date': datetime.strptime(row['Date'], '%Y-%m-%d'),
                'duration': int(row['BanDurationInMonths']) * 30  # Convert months to days
            }
    return banned_dict

def is_still_banned(ban_info, current_date):
    return current_date < ban_info['date'] + timedelta(days=ban_info['duration'])

def write_banned_symbols(file_path, banned_symbols):
    with open(file_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Date', 'Symbol', 'BanDurationInMonths'])
        for symbol, ban_info in banned_symbols.items():
            writer.writerow([
                ban_info['date'].strftime('%Y-%m-%d'),
                symbol,
                str(ban_info['duration'] // 30)  # Convert days back to months
            ])

def process_symbols(symbols, banned_symbols, current_date):
    initial_ban_count = len(banned_symbols)
    
    # Check all banned symbols and remove expired bans
    expired_bans = [
        symbol for symbol, ban_info in banned_symbols.items() 
        if not is_still_banned(ban_info, current_date)
    ]
    
    for symbol in expired_bans:
        del banned_symbols[symbol]
    
    # Get allowed symbols (not in banned list)
    allowed_symbols = [symbol for symbol in symbols if symbol not in banned_symbols]
    
    return allowed_symbols, banned_symbols, len(expired_bans)

def main():
    current_date = datetime.now()
    
    # Read input files
    symbols = read_symbols('./obligatory_screens/results/obligatory_passed_stocks.csv')
    banned_symbols = read_banned_symbols('./banned_stocks/banned_stocks.csv')
    
    # Process symbols
    allowed_symbols, updated_banned_symbols, removed_count = process_symbols(symbols, banned_symbols, current_date)
    
    # Update banned_stocks.csv to remove expired bans
    write_banned_symbols('./banned_stocks/banned_stocks.csv', updated_banned_symbols)
    
    # Write the allowed symbols to a CSV file
    with open('./banned_stocks/stocks_not_banned.csv', 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['Symbol'])
        for symbol in allowed_symbols:
            writer.writerow([symbol])
    
    print(f"Checking {len(symbols)} symbols for ban. {len(allowed_symbols)} symbols are allowed.")
    print(f"Removed {removed_count} expired bans.")

if __name__ == "__main__":
    main()