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
        'html_pages': os.path.join(base_dir, "stocks_filtering_application", "fundamental_data", "html_pages"),
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
        url = f"https://stockanalysis.com/stocks/{ticker.lower()}/financials"
        
        # Clear cookies before each request
        driver.delete_all_cookies()
        
        # Load the page with retry logic
        driver.get(url)
        
        # After the driver.get(url) line and before the WebDriverWait
        # Make sure Quarterly button is active or click it if not
        try:
            # Wait for the nav menu to be present
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "nav ul.navmenu.submenu"))
            )
            
            # Find all buttons in the submenu
            submenu_buttons = driver.find_elements(By.CSS_SELECTOR, "nav ul.navmenu.submenu li button")
            
            # Look for the "Quarterly" button specifically
            quarterly_button = None
            for button in submenu_buttons:
                if button.text.strip() == "Quarterly":
                    quarterly_button = button
                    break
            
            if quarterly_button:
                # Check if it's already active
                if "active" not in quarterly_button.get_attribute("class"):
                    # Click the button and wait
                    quarterly_button.click()
                    time.sleep(1.5)  # Increased wait time
                    logger.info(f"Clicked Quarterly button for {ticker}")
                else:
                    logger.info(f"Quarterly button already active for {ticker}")
            else:
                logger.info(f"No Quarterly button found for {ticker}, proceeding with default view")
                # Continue with the default view instead of warning
                
        except Exception as e:
            logger.info(f"Could not interact with Quarterly button for {ticker}, proceeding with default view: {e}")
        
        # Wait for page load with more specific condition
        try:
            # Wait for a specific element that indicates the page is fully loaded
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "table.sa-table"))
            )
        except TimeoutException:
            # If the specific element doesn't appear, fall back to document.readyState
            WebDriverWait(driver, 5).until(
                lambda d: d.execute_script("return document.readyState") == "complete"
            )
        
        # Introduce random human-like behavior
        simulate_human_behavior(driver)
        
        # Check if the page contains "A timeout occurred" message
        page_source = driver.page_source
        if "A timeout occurred" in page_source:
            logger.warning(f"Timeout message detected for {ticker}, restarting connection...")
            if retry_count < max_retries:
                # Don't save the page, restart driver and retry
                driver.quit()
                new_driver = setup_webdriver(False)  # Create a new driver instance
                time.sleep(random.uniform(5, 10))  # Longer wait before retry
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
            time.sleep(random.uniform(5, 10))  # Longer wait before retry
            return save_page_source(driver, ticker, html_pages_dir, last_activity_file, retry_count + 1, max_retries)
        logger.error(f"Failed to load page for {ticker} after {max_retries} retries: {e}")
        return False
        
    except Exception as e:
        logger.error(f"Error saving page source for {ticker}: {e}")
        
        # Check for the specific connection error and force driver rotation
        if "NewConnectionError" in str(e) or "Failed to establish a new connection" in str(e) or "No connection could be made" in str(e):
            logger.warning(f"Connection broken for {ticker}, creating new WebDriver instance...")
            try:
                # Quit the current driver
                if driver:
                    driver.quit()
            except:
                pass  # Ignore errors when quitting the driver
                
            # Create a new driver
            time.sleep(5)  # Allow time for cleanup
            try:
                # Since we don't have access to the use_proxies variable here, 
                # just create a fresh driver without proxy
                new_driver = setup_webdriver(False, None)
                # Return the new driver to the calling function
                return save_page_source(new_driver, ticker, html_pages_dir, last_activity_file, retry_count, max_retries)
            except Exception as driver_error:
                logger.error(f"Failed to create new WebDriver: {driver_error}")
                # Fall through to retry logic
        
        # Original retry logic
        if retry_count < max_retries:
            logger.warning(f"Retrying {ticker} ({retry_count+1}/{max_retries})...")
            time.sleep(random.uniform(5, 10))
            return save_page_source(driver, ticker, html_pages_dir, last_activity_file, retry_count + 1, max_retries)
        return False


# Function to simulate human-like behavior
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

# Function to implement exponential backoff for rate limiting
def get_wait_time(consecutive_failures):
    if consecutive_failures == 0:
        # Normal case - random wait between 3-7 seconds
        return random.uniform(3, 7)
    else:
        # Exponential backoff with jitter
        base_wait = min(60, 5 * (2 ** consecutive_failures))  # Cap at 60 seconds
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
            
        # Add a pause to ensure cleanup
        time.sleep(5)
        
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
                time.sleep(10 * (attempt + 1))  # Increasing delay for each attempt
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

# Main function to execute the process
def main():
    # Resolve project paths
    paths = resolve_project_paths()
    
    # Configuration
    use_proxies = False  # Set to True if you have a proxy rotation system
    max_consecutive_failures = 5  # Max failures before driver rotation
    tickers_per_driver = 50  # Number of tickers to process before rotating driver
    max_inactivity_minutes = 30  # Maximum time without activity before restarting
    
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
    driver = setup_webdriver(use_proxies, get_random_proxy() if use_proxies else None)
    
    successful_scrapes = 0
    consecutive_failures = 0
    
    try:
        i = 0
        while i < len(pending_tickers):
            ticker = pending_tickers[i]
            try:
                # Check for inactivity stall
                if check_activity_stalled(paths['last_activity_file'], max_inactivity_minutes):
                    logger.warning(f"Detected activity stall. Restarting the scraper...")
                    
                    # Restart the script
                    logger.info("Restarting the script...")
                    os.execv(sys.executable, ['python'] + sys.argv)
                    return  # This line won't execute, but added for clarity
                
                # Check if this ticker was already scraped (file exists)
                if is_ticker_scraped(ticker, paths['html_pages']):
                    logger.info(f"Ticker {ticker} already has HTML file, skipping")
                    i += 1
                    # Update last activity even when skipping
                    update_last_activity(paths['last_activity_file'])
                    continue
                
                # Check if we need to rotate the driver
                # if i > 0 and i % tickers_per_driver == 0:
                #     logger.info(f"Rotating driver after {tickers_per_driver} tickers")
                #     driver = rotate_driver(driver, use_proxies)
                
                # Check if we need to rotate the driver due to consecutive failures
                if consecutive_failures >= max_consecutive_failures:
                    logger.warning(f"Rotating driver after {consecutive_failures} consecutive failures")
                    driver = rotate_driver(driver, use_proxies)
                    consecutive_failures = 0
                
                # Save the page source
                success = save_page_source(driver, ticker, paths['html_pages'], paths['last_activity_file'])
                
                if success:
                    successful_scrapes += 1
                    consecutive_failures = 0
                    i += 1  # Only increment if successful or skipped
                else:
                    consecutive_failures += 1
                    # Important: Don't increment i on failure, so we'll retry the same ticker
                
                # Dynamic wait time based on consecutive failures
                wait_time = get_wait_time(consecutive_failures)
                logger.info(f"Waiting {wait_time:.2f} seconds before next request")
                time.sleep(wait_time)
                
                # Print remaining time estimation
                if i > 0 and i % 10 == 0:
                    print_remaining_time(start_time, i, len(pending_tickers), successful_scrapes)
                    
            except KeyboardInterrupt:
                raise
                
            except Exception as e:
                logger.error(f"Unexpected error processing ticker {ticker}: {e}")
                consecutive_failures += 1
                # Don't increment i on exception, retry the same ticker
                
                if "NewConnectionError" in str(e) or "Failed to establish a new connection" in str(e) or "No connection could be made" in str(e):
                    logger.warning("Detected connection failure, forcing driver rotation...")
                    driver = rotate_driver(driver, use_proxies)
                    consecutive_failures = 0
                    time.sleep(15)  # Longer wait after connection issues
                
                # If we've had too many failures in a row, create a fresh driver
                if consecutive_failures >= max_consecutive_failures:
                    logger.warning(f"Too many consecutive failures, restarting driver...")
                    driver = rotate_driver(driver, use_proxies)
                    consecutive_failures = 0
                
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
        if driver:
            driver.quit()

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