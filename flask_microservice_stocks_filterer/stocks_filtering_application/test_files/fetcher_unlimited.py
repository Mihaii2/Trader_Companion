import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import concurrent.futures
import time

def get_stock_data(ticker):
    try:
        stock = yf.Ticker(ticker)
        
        # Get price data for the last year
        end_date = datetime.now()
        start_date = end_date - timedelta(days=365)
        price_data = stock.history(start=start_date, end=end_date)
        price_data['Symbol'] = ticker

        # Reset index to include date in the DataFrame
        price_data.reset_index(inplace=True)

        # Round the price data to two decimal places
        price_data = price_data.round(2)

        # Get financial statements
        yearly_balance_sheet = stock.balance_sheet
        quarterly_balance_sheet = stock.quarterly_balance_sheet
        yearly_income_stmt = stock.income_stmt
        quarterly_income_stmt = stock.quarterly_income_stmt

        # Prepare data structures for quarterly and annual fundamental data
        quarterly_data = []
        annual_data = []

        # Function to extract fundamental data for a specific date
        def extract_fundamental_data(date, is_annual=False):
            if date in quarterly_balance_sheet.columns:
                bs = quarterly_balance_sheet.loc[:, date]
            else:
                return
            if date in quarterly_income_stmt.columns:
                is_ = quarterly_income_stmt.loc[:, date] if not is_annual else yearly_income_stmt.loc[:, date]
            else:
                return
            return {
                'Symbol': ticker,
                'Date': date.strftime('%Y-%m-%d'),
                'Total Assets': bs.get('Total Assets', ''),
                'Total Liabilities': bs.get('Total Liabilities Net Minority Interest', ''),
                'Total Equity': bs.get('Total Equity Gross Minority Interest', ''),
                'Total Revenue': is_.get('Total Revenue', ''),
                'Gross Profit': is_.get('Gross Profit', ''),
                'Operating Income': is_.get('Operating Income', ''),
                'Net Income': is_.get('Net Income', ''),
                'Net profit margin': is_.get('Net Income', '') / is_.get('Total Revenue', '') if is_.get('Total Revenue', '') != 0 else '',
                'EPS': is_.get('Diluted EPS', ''),
            }

        # Get quarterly data for last 3 years
        two_years_ago = datetime.now() - timedelta(days=3*365)
        for date in quarterly_balance_sheet.columns:
            if date >= two_years_ago:
                quarterly_data.append(extract_fundamental_data(date))

        # Get annual data for last 3 years
        for date in yearly_balance_sheet.columns.year:
            if date < two_years_ago.year:
                continue
            annual_date = yearly_balance_sheet.columns[yearly_balance_sheet.columns.year == date][-1]
            annual_data.append(extract_fundamental_data(annual_date, is_annual=True))

        print(f"Fetched data for {ticker}")
        return price_data, quarterly_data, annual_data
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return pd.DataFrame(), [], []

def main():
    # Read NASDAQ stock list (you need to have this CSV file)
    nasdaq_stocks = pd.read_csv('./stock_tickers/nasdaq_stocks.csv')

    # Create lists to store all data
    all_price_data = []
    all_quarterly_fundamental_data = []
    all_annual_fundamental_data = []

    # Use ThreadPoolExecutor for concurrent execution
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        # Submit tasks for each stock
        futures = [executor.submit(get_stock_data, ticker) for ticker in nasdaq_stocks['Symbol']]
        
        # Collect results as they complete
        for future in concurrent.futures.as_completed(futures):
            price_data, quarterly_data, annual_data = future.result()
            if not price_data.empty:
                all_price_data.append(price_data)
            all_quarterly_fundamental_data.extend(quarterly_data)
            all_annual_fundamental_data.extend(annual_data)

    # Combine all price data
    combined_price_data = pd.concat(all_price_data, ignore_index=True)

    # Save the combined price data to CSV with the index set to True (dates will be included as a column)
    combined_price_data.to_csv('./stock_api_data/nasdaq_stocks_1_year_price_data.csv', index=False)

    # Filter out None values and convert fundamental data to DataFrames
    quarterly_fundamental_data = [item for item in all_quarterly_fundamental_data if item is not None]
    annual_fundamental_data = [item for item in all_annual_fundamental_data if item is not None]

    if quarterly_fundamental_data:
        quarterly_fundamental_df = pd.DataFrame(quarterly_fundamental_data)
        quarterly_fundamental_df.to_csv('./stock_api_data/quarterly_fundamental_data_2years.csv', index=False)
    else:
        print("No valid quarterly fundamental data available.")

    if annual_fundamental_data:
        annual_fundamental_df = pd.DataFrame(annual_fundamental_data)
        annual_fundamental_df.to_csv('./stock_api_data/annual_fundamental_data_2years.csv', index=False)
    else:
        print("No valid annual fundamental data available.")

    print("Data collection complete. Results saved to CSV files.")

if __name__ == "__main__":
    start_time = time.time()
    main()
    end_time = time.time()
    print(f"Total execution time: {end_time - start_time:.2f} seconds")