import csv
import time
import random
import os
import logging
import shutil
import sys
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
import concurrent.futures

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
        url = f"https://stockanalysis.com/stocks/{ticker}/financials/?p=quarterly"
        
        # Clear cookies before each request
        driver.delete_all_cookies()
        
        # Load the page with retry logic
        driver.get(url)
        
        # Wait for page load with more specific condition - OPTIMIZED SHORTER WAIT TIMES
        try:
            # Wait for a specific element that indicates the page is fully loaded - reduced from 10 to 6 seconds
            WebDriverWait(driver, 6).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "table.sa-table"))
            )
        except TimeoutException:
            # If the specific element doesn't appear, fall back to document.readyState - reduced from 5 to 3 seconds
            WebDriverWait(driver, 3).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        
        # Introduce minimal human-like behavior - OPTIMIZED
        simulate_human_behavior_fast(driver)
        
        # Check if the page contains "A timeout occurred" message
        page_source = driver.page_source
        if "A timeout occurred" in page_source:
            logger.warning(f"Timeout message detected for {ticker}, restarting connection...")
            if retry_count < max_retries:
                # Don't save the page, restart driver and retry
                driver.quit()
                new_driver = setup_webdriver(False)  # Create a new driver instance
                time.sleep(random.uniform(2, 5))  # Reduced wait before retry from 5-10 to 2-5 seconds
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
            time.sleep(random.uniform(2, 5))  # Reduced wait before retry from 5-10 to 2-5 seconds
            return save_page_source(driver, ticker, html_pages_dir, last_activity_file, retry_count + 1, max_retries)
        logger.error(f"Failed to load page for {ticker} after {max_retries} retries: {e}")
        return False
        
    except Exception as e:
        logger.error(f"Error saving page source for {ticker}: {e}")
        if retry_count < max_retries:
            logger.warning(f"Retrying {ticker} ({retry_count+1}/{max_retries})...")
            time.sleep(random.uniform(2, 5))  # Reduced wait before retry
            return save_page_source(driver, ticker, html_pages_dir, last_activity_file, retry_count + 1, max_retries)
        return False


# Function to simulate human-like behavior - ORIGINAL VERSION (RETAINED FOR HIGH-RISK SCENARIOS)
def simulate_human_behavior(driver):
    # Random scrolling
    scroll_amount = random.randint(300, 700)
    driver.execute_script(f"window.scrollBy(0, {scroll_amount})")
    time.sleep(random.uniform(0.5, 1.5))
    
    # Scroll back up a bit
    driver.execute_script(f"window.scrollBy(0, {-random.randint(100, 300)})")
    time.sleep(random.uniform(0.3, 0.7))
    
    # More random scrolling
    driver.execute_script(f"window.scrollBy(0, {random.randint(200, 500)})")
    time.sleep(random.uniform(0.5, 1))

# Function to simulate minimal human-like behavior - OPTIMIZED FOR SPEED
def simulate_human_behavior_fast(driver):
    # One quick scroll down
    scroll_amount = random.randint(300, 600)
    driver.execute_script(f"window.scrollBy(0, {scroll_amount})")
    time.sleep(random.uniform(0.2, 0.5))  # Reduced wait time

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

# Function to implement optimized wait time strategy - OPTIMIZED
def get_wait_time(consecutive_failures):
    if consecutive_failures == 0:
        # Normal case - Reduced wait time from 3-7 to 1.5-3.5 seconds
        return random.uniform(1.5, 3.5)
    else:
        # Exponential backoff with jitter but with reduced base times
        base_wait = min(30, 3 * (2 ** consecutive_failures))  # Cap at 30 seconds (reduced from 60)
        jitter = random.uniform(0, 0.3 * base_wait)  # Reduced jitter from 50% to 30%
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
        
        # Move all HTML files - OPTIMIZED WITH BULK OPERATIONS
        html_files = [f for f in os.listdir(html_pages_dir) if f.endswith('.html')]
        
        # Use multithreading for file moving operations
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            future_to_file = {
                executor.submit(shutil.move, 
                                os.path.join(html_pages_dir, file), 
                                os.path.join(last_run_dir, file)): file 
                for file in html_files
            }
            
            moved_count = 0
            for future in concurrent.futures.as_completed(future_to_file):
                future.result()  # This will raise any exceptions that occurred
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
            
        # Add a pause to ensure cleanup - REDUCED from 5 to 3 seconds
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
                # OPTIMIZED: reduced wait time between attempts
                time.sleep(5 * (attempt + 1))  # Increasing delay for each attempt (reduced from 10 to 5 seconds base)
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
    # OPTIMIZED: Use multithreading to check files in parallel
    timeout_files = []
    files_to_check = [f for f in os.listdir(html_pages_dir) if f.endswith('.html')]
    
    def check_file(file):
        file_path = os.path.join(html_pages_dir, file)
        if check_for_timeout(file_path):
            ticker = os.path.splitext(file)[0]
            # Remove the file with timeout message
            os.remove(file_path)
            logger.info(f"Removed HTML file for {ticker} due to timeout message")
            return ticker
        return None
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(check_file, files_to_check))
    
    # Filter out None values
    timeout_files = [ticker for ticker in results if ticker]
    
    if timeout_files:
        logger.info(f"Found {len(timeout_files)} HTML files with timeout messages that were removed")
    
    return timeout_files

# Setup a driver pool for parallel processing - NEW FUNCTION
def setup_driver_pool(num_drivers, use_proxies):
    drivers = []
    for _ in range(num_drivers):
        proxy = get_random_proxy() if use_proxies else None
        try:
            driver = setup_webdriver(use_proxies, proxy)
            drivers.append(driver)
        except Exception as e:
            logger.error(f"Failed to create driver for pool: {e}")
    logger.info(f"Created driver pool with {len(drivers)} drivers")
    return drivers

# Function to process a batch of tickers in parallel - NEW FUNCTION
def process_ticker_batch(driver_pool, ticker_batch, html_pages_dir, last_activity_file):
    success_count = 0
    failures = []
    
    def process_ticker(args):
        driver, ticker = args
        if is_ticker_scraped(ticker, html_pages_dir):
            return (ticker, True, "Already processed")
        
        success = save_page_source(driver, ticker, html_pages_dir, last_activity_file)
        return (ticker, success, "Success" if success else "Failed")
    
    # Pair drivers with tickers
    ticker_driver_pairs = []
    for i, ticker in enumerate(ticker_batch):
        driver_index = i % len(driver_pool)
        ticker_driver_pairs.append((driver_pool[driver_index], ticker))
    
    # Process in sequence to avoid overloading the server
    results = []
    for pair in ticker_driver_pairs:
        result = process_ticker(pair)
        results.append(result)
        # Add a small delay between requests even when using different drivers
        time.sleep(random.uniform(0.5, 1.5))
    
    # Count successes and failures
    for ticker, success, message in results:
        if success:
            success_count += 1
        else:
            failures.append(ticker)
    
    return success_count, failures

# Main function to execute the process
def main():
    # Resolve project paths
    paths = resolve_project_paths()
    
    # Configuration
    use_proxies = False  # Set to True if you have a proxy rotation system
    max_consecutive_failures = 5  # Max failures before driver rotation
    tickers_per_driver = 100  # OPTIMIZED: Increased from 50 to 100
    max_inactivity_minutes = 30  # Maximum time without activity before restarting
    
    # NEW: Multi-driver configuration
    num_drivers = 2  # Use 2 drivers in parallel - can be adjusted based on resources
    batch_size = 5   # Process 5 tickers per batch
    
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
    
    start_time = time.time()
    
    # OPTIMIZATION: Use a driver pool instead of a single driver
    driver_pool = setup_driver_pool(num_drivers, use_proxies)
    if not driver_pool:
        logger.error("Failed to create driver pool. Exiting.")
        return
    
    successful_scrapes = 0
    consecutive_failures = 0
    
    try:
        # Process tickers in batches
        i = 0
        while i < len(pending_tickers):
            try:
                # Check for inactivity stall
                if check_activity_stalled(paths['last_activity_file'], max_inactivity_minutes):
                    logger.warning(f"Detected activity stall. Restarting the scraper...")
                    
                    # Restart the script
                    logger.info("Restarting the script...")
                    # Clean up drivers before restarting
                    for driver in driver_pool:
                        try:
                            driver.quit()
                        except:
                            pass
                    os.execv(sys.executable, ['python'] + sys.argv)
                    return  # This line won't execute, but added for clarity
                
                # Get the current batch
                end_idx = min(i + batch_size, len(pending_tickers))
                current_batch = pending_tickers[i:end_idx]
                
                # Process the batch
                batch_success, batch_failures = process_ticker_batch(
                    driver_pool, current_batch, paths['html_pages'], paths['last_activity_file']
                )
                
                successful_scrapes += batch_success
                i += len(current_batch) - len(batch_failures)  # Move forward but account for failures
                
                # Update consecutive failures count
                if batch_failures:
                    consecutive_failures += 1
                else:
                    consecutive_failures = 0
                
                # Check if we need to rotate driver pool
                if consecutive_failures >= max_consecutive_failures or (i > 0 and i % tickers_per_driver == 0):
                    logger.warning(f"Rotating driver pool after consecutive failures or {tickers_per_driver} tickers")
                    # Close existing drivers
                    for driver in driver_pool:
                        try:
                            driver.quit()
                        except:
                            pass
                    # Create new driver pool
                    driver_pool = setup_driver_pool(num_drivers, use_proxies)
                    consecutive_failures = 0
                
                # Wait between batches - OPTIMIZED WAIT TIME
                wait_time = get_wait_time(consecutive_failures)
                logger.info(f"Waiting {wait_time:.2f} seconds before next batch")
                time.sleep(wait_time)
                
                # Print remaining time estimation
                if i > 0 and i % 20 == 0:  # Increased from 10 to 20 for less frequent updates
                    print_remaining_time(start_time, i, len(pending_tickers), successful_scrapes)
                    
            except KeyboardInterrupt:
                raise
                
            except Exception as e:
                logger.error(f"Unexpected error processing batch: {e}")
                consecutive_failures += 1
                
                if "NewConnectionError" in str(e) or "Failed to establish a new connection" in str(e) or "No connection could be made" in str(e):
                    logger.warning("Detected connection failure, forcing driver pool rotation...")
                    # Close existing drivers
                    for driver in driver_pool:
                        try:
                            driver.quit()
                        except:
                            pass
                    # Create new driver pool
                    driver_pool = setup_driver_pool(num_drivers, use_proxies)
                    consecutive_failures = 0
                    time.sleep(10)  # Shorter wait after connection issues (reduced from 15)
                
                continue
        
        # Final stats
        elapsed_time = time.time() - start_time
        hours, remainder = divmod(elapsed_time, 3600)
        minutes, seconds = divmod(remainder, 60)
        
        logger.info(f"Scraping completed in {int(hours)}h {int(minutes)}m {int(seconds)}s")
        logger.info(f"Processed {len(pending_tickers)} tickers with {successful_scrapes} successful scrapes")
        if len(pending_tickers) > 0:
            logger.info(f"Success rate: {successful_scrapes/len(pending_tickers)*100:.2f}%")
        
        # Check if all tickers are processed
        processed_tickers = get_processed_tickers(paths['html_pages'])
        remaining_tickers = [t for t in all_tickers if t not in processed_tickers]
        
        if not remaining_tickers:
            logger.info("All tickers processed! Moving files to last_run directory")
            move_files_to_last_run(paths['html_pages'], paths['last_run_dir'])
    
    except KeyboardInterrupt:
        logger.info("Scraping interrupted by user")
    
    finally:
        # Close all drivers in the pool
        for driver in driver_pool:
            try:
                driver.quit()
            except:
                pass

# Wrapper function to handle automatic restarts
def run_with_auto_restart():
    max_restarts = 5
    restart_count = 0
    restart_delay = 30  # OPTIMIZED: Reduced from 60 to 30 seconds
    
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
            restart_delay = min(restart_delay * 1.5, 180)  # OPTIMIZED: Cap at 3 minutes (reduced from 5)
    
    if restart_count >= max_restarts:
        logger.critical(f"Maximum number of restarts ({max_restarts}) reached. Exiting.")

if __name__ == "__main__":
    try:
        run_with_auto_restart()
    except Exception as e:
        logger.critical(f"Unrecoverable error: {e}")
        raise