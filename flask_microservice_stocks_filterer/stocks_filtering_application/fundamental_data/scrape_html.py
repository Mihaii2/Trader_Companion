import csv
import time
import random
import os
import logging
import shutil
import sys
import concurrent.futures
from pathlib import Path
from datetime import datetime, timedelta
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
from fake_useragent import UserAgent
import requests
import json

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("scraper.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Function to resolve the project paths
def resolve_project_paths():
    # Get the absolute path of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Find the absolute path of the "flask_microservice_stocks_filterer" directory
    base_dir = script_dir
    while not base_dir.endswith("flask_microservice_stocks_filterer") and os.path.dirname(base_dir) != base_dir:
        base_dir = os.path.dirname(base_dir)
    
    # Define all the necessary paths
    project_paths = {
        'base_dir': base_dir,
        'html_pages': os.path.join(script_dir, "html_pages"),
        'tickers_file': os.path.join(base_dir, "stocks_filtering_application", "stock_tickers", "nasdaq_stocks.csv"),
        'last_run_dir': os.path.join(base_dir, "stocks_filtering_application", "fundamental_data", "last_run"),
        'last_activity_file': os.path.join(script_dir, "last_activity.txt"),  # Track last activity
    }
    
    logger.info(f"Base directory: {project_paths['base_dir']}")
    logger.info(f"HTML pages directory: {project_paths['html_pages']}")
    logger.info(f"Tickers file: {project_paths['tickers_file']}")
    logger.info(f"Last run directory: {project_paths['last_run_dir']}")
    logger.info(f"Last activity file: {project_paths['last_activity_file']}")
    
    # Create necessary directories if they don't exist
    os.makedirs(project_paths['html_pages'], exist_ok=True)
    os.makedirs(project_paths['last_run_dir'], exist_ok=True)
    
    return project_paths

# Function to update the last activity timestamp
def update_last_activity(last_activity_file):
    try:
        with open(last_activity_file, 'w') as f:
            f.write(datetime.now().isoformat())
        logger.debug("Updated last activity timestamp")
    except Exception as e:
        logger.error(f"Error updating last activity timestamp: {e}")

# Function to check if the activity has stalled
def check_activity_stalled(last_activity_file, max_inactivity_minutes=30):
    try:
        if not os.path.exists(last_activity_file):
            # First run or file deleted
            update_last_activity(last_activity_file)
            return False
            
        with open(last_activity_file, 'r') as f:
            last_activity_str = f.read().strip()
            
        last_activity = datetime.fromisoformat(last_activity_str)
        current_time = datetime.now()
        
        # Calculate time difference
        inactivity_time = current_time - last_activity
        inactivity_minutes = inactivity_time.total_seconds() / 60
        
        if inactivity_minutes > max_inactivity_minutes:
            logger.warning(f"No activity detected for {inactivity_minutes:.2f} minutes, exceeding threshold of {max_inactivity_minutes} minutes")
            return True
            
        return False
    except Exception as e:
        logger.error(f"Error checking activity stall: {e}")
        # If we can't check, assume it's stalled for safety
        return True

# Function to read ticker symbols from a CSV file
def read_tickers_from_csv(file_path):
    try:
        # Check if file exists
        if not os.path.exists(file_path):
            logger.error(f"CSV file not found: {file_path}")
            raise FileNotFoundError(f"CSV file not found: {file_path}")
        
        with open(file_path, mode='r') as file:
            # Determine the field name for ticker symbols
            reader = csv.DictReader(file)
            field_names = reader.fieldnames
            
            # Look for common ticker symbol field names
            ticker_field = None
            for field in ['Symbol', 'Ticker', 'symbol', 'ticker']:
                if field in field_names:
                    ticker_field = field
                    break
            
            if ticker_field is None:
                logger.error(f"Could not find ticker symbol field in CSV: {field_names}")
                raise ValueError(f"Could not find ticker symbol field in CSV: {field_names}")
            
            # Reset file pointer to beginning
            file.seek(0)
            reader = csv.DictReader(file)
            
            # Extract ticker symbols
            tickers = [row[ticker_field] for row in reader]
            logger.info(f"Read {len(tickers)} tickers from {file_path}")
            return tickers
            
    except Exception as e:
        logger.error(f"Error reading CSV file: {e}")
        raise

# Function to get already processed tickers by checking the html_pages directory
def get_processed_tickers(html_pages_dir):
    processed_tickers = []
    if os.path.exists(html_pages_dir):
        for file in os.listdir(html_pages_dir):
            if file.endswith('.html'):
                ticker = os.path.splitext(file)[0]
                processed_tickers.append(ticker)
    
    logger.info(f"Found {len(processed_tickers)} already processed tickers in {html_pages_dir}")
    return processed_tickers

# Function to get a random user agent
def get_random_user_agent():
    try:
        ua = UserAgent()
        return ua.random
    except Exception:
        # Fallback user agents if fake_useragent fails
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.2 Safari/605.1.15",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:97.0) Gecko/20100101 Firefox/97.0",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4844.51 Safari/537.36 Edg/99.0.1150.30"
        ]
        return random.choice(user_agents)

# Function to get a random proxy from a free proxy list (implement your own proxy solution)
def get_random_proxy():
    # This is a placeholder - you should implement your own proxy rotation logic
    # For a production system, consider using a paid proxy service
    try:
        response = requests.get('https://proxylist.geonode.com/api/proxy-list?limit=50&page=1&sort_by=lastChecked&sort_type=desc&filterUpTime=90&speed=fast')
        data = json.loads(response.text)
        proxies = [f"{proxy['ip']}:{proxy['port']}" for proxy in data['data']]
        return random.choice(proxies) if proxies else None
    except Exception as e:
        logger.warning(f"Error fetching proxy: {e}")
        return None

# Function to set up the Selenium WebDriver with enhanced anti-detection
def setup_webdriver(use_proxy=False, proxy=None):
    options = Options()
    
    # Headless mode can sometimes be detected, but improves performance
    # Uncomment if needed, but be aware it may increase detection chance
    # options.add_argument("--headless")
    
    # Standard anti-detection measures
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-infobars")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    # Random user agent
    user_agent = get_random_user_agent()
    options.add_argument(f'user-agent={user_agent}')
    
    # Add proxy if enabled
    if use_proxy and proxy:
        options.add_argument(f'--proxy-server={proxy}')
    
    # Add experimental options to mask automation
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    
    try:
        driver = webdriver.Chrome(options=options)
        
        # Execute CDP commands to mask automation
        driver.execute_cdp_cmd(
            'Page.addScriptToEvaluateOnNewDocument',
            {'source': '''
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'plugins', {get: function() { return [1, 2, 3, 4, 5]; }});
                Object.defineProperty(navigator, 'languages', {get: function() { return ['en-US', 'en', 'es']; }});
                window.chrome = { runtime: {} };
            '''}
        )
        
        # Simulate human-like behavior by scrolling and moving the mouse
        driver.execute_script("""
            if (typeof window.simulate_human === 'undefined') {
                window.simulate_human = function() {
                    const randomScroll = () => { 
                        window.scrollBy(0, Math.floor(Math.random() * 100)); 
                    };
                    setInterval(randomScroll, Math.floor(Math.random() * 5000) + 2000);
                }
                window.simulate_human();
            }
        """)
        
        return driver
    except Exception as e:
        logger.error(f"Error setting up WebDriver: {e}")
        raise

# Function to save page source as an HTML file
def save_page_source(driver, ticker, html_pages_dir, last_activity_file, retry_count=0, max_retries=3):
    try:
        url = f"https://stockanalysis.com/stocks/{ticker.lower()}/financials/?p=quarterly"
        
        # Clear cookies before each request
        driver.delete_all_cookies()
        
        # Load the page with retry logic
        driver.get(url)
        
        # Wait for page load with more specific condition - REDUCED TIMEOUT FROM 10 TO 7 SECONDS
        try:
            # Wait for a specific element that indicates the page is fully loaded
            WebDriverWait(driver, 7).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "table.sa-table"))
            )
        except TimeoutException:
            # If the specific element doesn't appear, fall back to document.readyState
            WebDriverWait(driver, 3).until(  # REDUCED TIMEOUT FROM 5 TO 3 SECONDS
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        
        # Introduce random human-like behavior - REDUCED INTENSITY
        simulate_human_behavior(driver, reduced=True)
        
        # Check if the page contains "A timeout occurred" message
        page_source = driver.page_source
        if "A timeout occurred" in page_source:
            logger.warning(f"Timeout message detected for {ticker}, restarting connection...")
            if retry_count < max_retries:
                # Don't save the page, restart driver and retry
                driver.quit()
                new_driver = setup_webdriver(False)  # Create a new driver instance
                time.sleep(random.uniform(2, 5))  # REDUCED WAIT FROM 5-10 TO 2-5 SECONDS
                return save_page_source(new_driver, ticker, html_pages_dir, last_activity_file, retry_count + 1, max_retries)
            logger.error(f"Failed to load page for {ticker} after {max_retries} retries: Timeout message detected")
            return False
        
        # Save the page source
        html_path = os.path.join(html_pages_dir, f"{ticker}.html")
        with open(html_path, "w", encoding="utf-8") as file:
            file.write(page_source)
        
        # Update last activity timestamp
        update_last_activity(last_activity_file)
        
        logger.info(f"Page source saved for {ticker} at {html_path}")
        return True
        
    except TimeoutException as e:
        if retry_count < max_retries:
            logger.warning(f"Timeout for {ticker}, retrying ({retry_count+1}/{max_retries})...")
            time.sleep(random.uniform(2, 5))  # REDUCED WAIT FROM 5-10 TO 2-5 SECONDS
            return save_page_source(driver, ticker, html_pages_dir, last_activity_file, retry_count + 1, max_retries)
        logger.error(f"Failed to load page for {ticker} after {max_retries} retries: {e}")
        return False
        
    except Exception as e:
        logger.error(f"Error saving page source for {ticker}: {e}")
        if retry_count < max_retries:
            logger.warning(f"Retrying {ticker} ({retry_count+1}/{max_retries})...")
            time.sleep(random.uniform(2, 5))  # REDUCED WAIT FROM 5-10 TO 2-5 SECONDS
            return save_page_source(driver, ticker, html_pages_dir, last_activity_file, retry_count + 1, max_retries)
        return False


# Function to simulate human-like behavior, with reduced intensity option
def simulate_human_behavior(driver, reduced=False):
    if reduced:
        # Less intensive scrolling with shorter waits
        scroll_amount = random.randint(200, 500)
        driver.execute_script(f"window.scrollBy(0, {scroll_amount})")
        time.sleep(random.uniform(0.3, 0.7))  # REDUCED WAIT TIMES
        
        # Shorter or no second scrolling
        if random.random() > 0.5:  # Only do this 50% of the time
            driver.execute_script(f"window.scrollBy(0, {random.randint(100, 300)})")
            time.sleep(random.uniform(0.2, 0.4))  # REDUCED WAIT TIMES
    else:
        # Original behavior
        scroll_amount = random.randint(300, 700)
        driver.execute_script(f"window.scrollBy(0, {scroll_amount})")
        time.sleep(random.uniform(0.5, 1.5))
        
        # Scroll back up a bit
        driver.execute_script(f"window.scrollBy(0, {-random.randint(100, 300)})")
        time.sleep(random.uniform(0.3, 0.7))
        
        # More random scrolling
        driver.execute_script(f"window.scrollBy(0, {random.randint(200, 500)})")
        time.sleep(random.uniform(0.5, 1))

# Function to estimate and print the remaining time
def print_remaining_time(start_time, tickers_processed, total_tickers, successful_scrapes):
    elapsed_time = time.time() - start_time
    average_time_per_ticker = elapsed_time / max(tickers_processed, 1)
    remaining_tickers = total_tickers - tickers_processed
    estimated_remaining_time = average_time_per_ticker * remaining_tickers
    
    hours, remainder = divmod(estimated_remaining_time, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    logger.info(f"Progress: {tickers_processed}/{total_tickers} ({successful_scrapes} successful)")
    logger.info(f"Estimated remaining time: {int(hours)}h {int(minutes)}m {int(seconds)}s")
    logger.info(f"Average time per ticker: {average_time_per_ticker:.2f} seconds")
    logger.info(f"Success rate: {successful_scrapes/max(tickers_processed, 1)*100:.2f}%")

# Function to implement optimized wait time for rate limiting
def get_wait_time(consecutive_failures):
    if consecutive_failures == 0:
        # Normal case - REDUCED WAIT TIME FROM 3-7 TO 1.5-4 SECONDS
        return random.uniform(1.5, 4)
    else:
        # Exponential backoff with jitter - CAPPED AT 45 SECONDS INSTEAD OF 60
        base_wait = min(45, 5 * (2 ** consecutive_failures))  # Cap at 45 seconds
        jitter = random.uniform(0, 0.5 * base_wait)  # Add up to 50% jitter
        return base_wait + jitter

# Check if a ticker has already been scraped by looking for its HTML file
def is_ticker_scraped(ticker, html_pages_dir):
    html_path = os.path.join(html_pages_dir, f"{ticker}.html")
    return os.path.exists(html_path)

# Move HTML files to last_run directory when scraping is complete
def move_files_to_last_run(html_pages_dir, last_run_dir):
    try:
        # Ensure last_run directory exists and is empty
        if os.path.exists(last_run_dir):
            logger.info(f"Clearing existing files in {last_run_dir}")
            for file in os.listdir(last_run_dir):
                file_path = os.path.join(last_run_dir, file)
                if os.path.isfile(file_path):
                    os.remove(file_path)
        else:
            os.makedirs(last_run_dir, exist_ok=True)
        
        # Move all HTML files
        moved_count = 0
        for file in os.listdir(html_pages_dir):
            if file.endswith('.html'):
                source_path = os.path.join(html_pages_dir, file)
                dest_path = os.path.join(last_run_dir, file)
                shutil.move(source_path, dest_path)
                moved_count += 1
        
        logger.info(f"Moved {moved_count} HTML files to {last_run_dir}")
        return True
    
    except Exception as e:
        logger.error(f"Error moving files to last_run directory: {e}")
        return False

# Rotate drivers to avoid detection patterns
def rotate_driver(current_driver, use_proxies):
    # First, try to properly close the current driver
    if current_driver:
        try:
            current_driver.quit()
        except Exception as e:
            logger.warning(f"Error closing driver: {e}")
            
        # Add a pause to ensure cleanup - REDUCED FROM 5 TO 3 SECONDS
        time.sleep(3)
        
        # Kill any orphaned chromedriver processes
        try:
            import os
            if os.name == 'nt':  # Windows
                os.system('taskkill /f /im chromedriver.exe')
            else:  # Linux/Mac
                os.system('pkill -f chromedriver')
            logger.info("Killed orphaned chromedriver processes")
        except Exception as e:
            logger.warning(f"Failed to kill processes: {e}")
    
    # Get a new proxy if enabled
    proxy = get_random_proxy() if use_proxies else None
    
    # Try multiple times to create a new driver
    max_attempts = 3
    for attempt in range(max_attempts):
        try:
            new_driver = setup_webdriver(use_proxies, proxy)
            logger.info("Successfully created new WebDriver instance")
            return new_driver
        except Exception as e:
            if attempt < max_attempts - 1:
                logger.warning(f"Failed to create new driver (attempt {attempt+1}/{max_attempts}): {e}")
                time.sleep(5 * (attempt + 1))  # REDUCED FROM 10 TO 5 SECONDS PER ATTEMPT
            else:
                logger.error(f"All {max_attempts} attempts to create driver failed")
                raise

# Function to check HTML content for timeout message
def check_for_timeout(html_path):
    try:
        with open(html_path, 'r', encoding='utf-8') as file:
            content = file.read()
            return "A timeout occurred" in content
    except Exception as e:
        logger.error(f"Error checking HTML file for timeout: {e}")
        return False

# Function to validate existing HTML files to ensure none contain timeout messages
def validate_existing_files(html_pages_dir):
    timeout_files = []
    for file in os.listdir(html_pages_dir):
        if file.endswith('.html'):
            file_path = os.path.join(html_pages_dir, file)
            if check_for_timeout(file_path):
                ticker = os.path.splitext(file)[0]
                timeout_files.append(ticker)
                # Remove the file with timeout message
                os.remove(file_path)
                logger.info(f"Removed HTML file for {ticker} due to timeout message")
    
    if timeout_files:
        logger.info(f"Found {len(timeout_files)} HTML files with timeout messages that were removed")
    
    return timeout_files

# Function to process a batch of tickers with one driver
def process_ticker_batch(batch, paths, use_proxies, max_consecutive_failures):
    driver = setup_webdriver(use_proxies, get_random_proxy() if use_proxies else None)
    successful_scrapes = 0
    consecutive_failures = 0
    
    try:
        for ticker in batch:
            # Skip already processed tickers
            if is_ticker_scraped(ticker, paths['html_pages']):
                continue
                
            # Try to save the page source
            for attempt in range(3):  # Retry each ticker up to 3 times
                try:
                    # Check if we need to rotate the driver due to consecutive failures
                    if consecutive_failures >= max_consecutive_failures:
                        logger.warning(f"Rotating driver after {consecutive_failures} consecutive failures")
                        driver = rotate_driver(driver, use_proxies)
                        consecutive_failures = 0
                    
                    success = save_page_source(driver, ticker, paths['html_pages'], paths['last_activity_file'])
                    
                    if success:
                        successful_scrapes += 1
                        consecutive_failures = 0
                        break  # Break out of retry loop on success
                    else:
                        consecutive_failures += 1
                        if attempt < 2:  # Only wait between retries, not after the last attempt
                            wait_time = get_wait_time(consecutive_failures)
                            time.sleep(wait_time)
                except Exception as e:
                    logger.error(f"Error processing ticker {ticker}: {e}")
                    consecutive_failures += 1
                    if attempt < 2:
                        time.sleep(get_wait_time(consecutive_failures))
            
            # Wait between tickers (successful or not)
            time.sleep(get_wait_time(0))  # Always use base wait time between different tickers
            
    finally:
        # Always make sure to quit the driver
        if driver:
            try:
                driver.quit()
            except:
                pass
    
    return successful_scrapes

# Main function to execute the process with parallel processing
def main():
    # Resolve project paths
    paths = resolve_project_paths()
    
    # Configuration
    use_proxies = False  # Set to True if you have a proxy rotation system
    max_consecutive_failures = 5  # Max failures before driver rotation
    tickers_per_driver = 50  # Number of tickers to process before rotating driver
    max_inactivity_minutes = 30  # Maximum time without activity before restarting
    num_workers = 2  # Number of parallel workers
    
    # Initialize last activity timestamp
    update_last_activity(paths['last_activity_file'])
    
    # Check and validate existing HTML files 
    invalid_tickers = validate_existing_files(paths['html_pages'])
    
    # Get all tickers from CSV
    all_tickers = read_tickers_from_csv(paths['tickers_file'])
    
    # Get already processed tickers by checking for HTML files
    processed_tickers = get_processed_tickers(paths['html_pages'])
    
    # Create the pending tickers list, excluding already processed ones
    pending_tickers = [t for t in all_tickers if t not in processed_tickers]
    
    # Re-add any tickers whose files were found to be invalid
    for ticker in invalid_tickers:
        if ticker not in pending_tickers:
            pending_tickers.append(ticker)
    
    total_tickers = len(all_tickers)
    
    # Check if there are any tickers to process
    if not pending_tickers:
        logger.info("No pending tickers to process. Moving files to last_run directory.")
        move_files_to_last_run(paths['html_pages'], paths['last_run_dir'])
        return
    
    logger.info(f"Starting scraper for {len(pending_tickers)} pending tickers out of {total_tickers} total")
    logger.info(f"Already processed {len(processed_tickers)} tickers")
    logger.info(f"Current time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"Using {num_workers} concurrent workers")
    
    start_time = time.time()
    
    # Divide tickers into batches for parallel processing
    # If we have 2 workers and 100 tickers, we want to alternate rather than give
    # worker 1 tickers 1-50 and worker 2 tickers 51-100
    num_tickers = len(pending_tickers)
    batches = [[] for _ in range(num_workers)]
    
    # Distribute tickers in round-robin fashion
    for i, ticker in enumerate(pending_tickers):
        batch_index = i % num_workers
        batches[batch_index].append(ticker)
    
    # Process batches in parallel
    total_successful = 0
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
        # Submit all batches for processing
        future_to_batch = {
            executor.submit(
                process_ticker_batch, 
                batch, 
                paths, 
                use_proxies, 
                max_consecutive_failures
            ): i for i, batch in enumerate(batches)
        }
        
        # Process results as they complete
        for future in concurrent.futures.as_completed(future_to_batch):
            batch_index = future_to_batch[future]
            try:
                batch_successful = future.result()
                total_successful += batch_successful
                logger.info(f"Batch {batch_index+1} completed with {batch_successful} successful scrapes")
            except Exception as e:
                logger.error(f"Batch {batch_index+1} raised an exception: {e}")
    
    # Final stats
    elapsed_time = time.time() - start_time
    hours, remainder = divmod(elapsed_time, 3600)
    minutes, seconds = divmod(remainder, 60)
    
    logger.info(f"Scraping completed in {int(hours)}h {int(minutes)}m {int(seconds)}s")
    logger.info(f"Processed {len(pending_tickers)} tickers with {total_successful} successful scrapes")
    if len(pending_tickers) > 0:
        logger.info(f"Success rate: {total_successful/len(pending_tickers)*100:.2f}%")
    
    # Check if all tickers are processed
    processed_tickers = get_processed_tickers(paths['html_pages'])
    remaining_tickers = [t for t in all_tickers if t not in processed_tickers]
    
    if not remaining_tickers:
        logger.info("All tickers processed! Moving files to last_run directory")
        move_files_to_last_run(paths['html_pages'], paths['last_run_dir'])

# Wrapper function to handle automatic restarts
def run_with_auto_restart():
    max_restarts = 5
    restart_count = 0
    restart_delay = 60  # seconds
    
    while restart_count < max_restarts:
        try:
            logger.info(f"Starting scraper (restart {restart_count}/{max_restarts})")
            main()
            # If main() completes successfully, break the loop
            logger.info("Scraper completed successfully")
            break
        except Exception as e:
            restart_count += 1
            logger.critical(f"Critical error caused a crash: {e}")
            logger.info(f"Restarting in {restart_delay} seconds (attempt {restart_count}/{max_restarts})...")
            time.sleep(restart_delay)
            
            # Increase delay for next restart
            restart_delay = min(restart_delay * 2, 300)  # Cap at 5 minutes
    
    if restart_count >= max_restarts:
        logger.critical(f"Maximum number of restarts ({max_restarts}) reached. Exiting.")

if __name__ == "__main__":
    try:
        run_with_auto_restart()
    except Exception as e:
        logger.critical(f"Unrecoverable error: {e}")
        raise