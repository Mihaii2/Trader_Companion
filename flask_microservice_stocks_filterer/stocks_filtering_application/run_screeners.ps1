# Get the current script's directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Define file paths using Join-Path for cross-platform compatibility
$priceFundamentalScript = Join-Path $scriptDir "price_1y_fundamental_2y.py"
$obligatory_passed_stocks = Join-Path $scriptDir "obligatory_screens\obligatory_screen_passer.py"
$obligatory_data_filter = Join-Path $scriptDir "ranking_screens\passed_stocks_input_data\obligatory_screen_data_filter.py"
$banned_filter = Join-Path $scriptDir "banned_Stocks/banned_filter.py"
$obligatory_screens = @(
    "obligatory_screens\above_52week_low.py",
    # "obligatory_screens\rs_over_65.py",
    "obligatory_screens\trending_up.py",
    # "obligatory_screens\low_volatility.py",
    "obligatory_screens\close_to_52week_high.py",
    "obligatory_screens\minimum_volume_100k.py"
    )
$ranking_screens = @(
    "annual_EPS_acceleration.py",
    "annual_margin_acceleration.py",
    "annual_sales_acceleration.py",
    # "higher_volume_up.py",
    # "more_up_days.py",
    "quarterly_EPS_acceleration.py",
    "quarterly_eps_breakout.py",
    "quarterly_margin_acceleration.py",
    "quarterly_sales_acceleration.py",
    "rs_over_70.py",
    "rsi_trending_up.py",
    # "volume_contraction.py",
    "volume_acceleration.py",
    "price_spikes.py",
    "top_price_increases_1y.py"
    )
$market_sentiment_screens = @(
    "52week_high_2w.py",
    "52week_low_2w.py",
    "rs_over_70.py",
    "rsi_under_30.py",
    "rsi_trending_up.py",
    "rsi_trending_down.py",
    "52week_high_1d.py",
    "52week_low_1d.py"
    )
$top_100_stocks = Join-Path $scriptDir "top_100_stocks_by_price_increase.py"
$obligatory_passed_csv = Join-Path $scriptDir "obligatory_screens\results\obligatory_passed_stocks.csv"
# $annual_data = Join-Path $scriptDir "stock_api_data\annual_fundamental_data_2years.csv"
# $quarterly_data = Join-Path $scriptDir "stock_api_data\quarterly_fundamental_data_2years.csv"
# $price_data = Join-Path $scriptDir "stock_api_data\nasdaq_stocks_1_year_price_data.csv"
# $filtered_annual_data = Join-Path $scriptDir "ranking_screens\passed_stocks_input_data\filtered_annual_fundamental_data_2years.csv"
# $filtered_quarterly_data = Join-Path $scriptDir "ranking_screens\passed_stocks_input_data\filtered_quarterly_fundamental_data_2years.csv"
# $filtered_price_data = Join-Path $scriptDir "ranking_screens\passed_stocks_input_data\filtered_price_data.csv"
$ranking_screens_csvs = @(
    "annual_EPS_acceleration_stocks.csv",
    "annual_margin_acceleration_stocks.csv",
    "annual_sales_acceleration_stocks.csv",
    "higher_volume_up.csv",
    "more_up_days_stocks.csv",
    "quarterly_EPS_acceleration_stocks.csv",
    "eps_breakout_stocks.csv",
    "quarterly_margin_acceleration_stocks.csv",
    "quarterly_sales_acceleration_stocks.csv",
    "rs_over_70.csv",
    "rsi_trending_up_stocks.csv",
    "volume_acceleration_stocks.csv",
    "stocks_with_volume_contraction.csv",
    "price_spikes.csv",
    "top_price_increase_1y.csv"
    )
$obligatory_screens_csvs = @(
    "above_52week_low.csv",
    # "rs_over_65.csv",
    "trending_up_stocks.csv",
    # "low_volatility_2weeks.csv",
    "close_to_52week_high.csv",
    "minimum_volume_100k.csv"
    )
$market_sentiment_screens_csvs = @(
    "52week_high_2_weeks.csv",
    "52week_low_2_weeks.csv",
    "rsi_over_70.csv",
    "rsi_under_30.csv",
    "rsi_trending_up_stocks.csv",
    "rsi_trending_down_stocks.csv",
    "52week_high_1_days.csv",
    "52week_low_1_days.csv"
    )

$top_100_stocks_csv = Join-Path $scriptDir "top_100_stocks_by_price_increase.csv"
$history_handler = Join-Path $scriptDir "./market_sentiment_screens/history_handler.py"
$stocks_not_banned = Join-Path $scriptDir "banned_Stocks/stocks_not_banned.csv"


Write-Host "Deleting old result files..."

# Remove-Item $annual_data -ErrorAction SilentlyContinue
# Remove-Item $quarterly_data -ErrorAction SilentlyContinue
# Remove-Item $price_data -ErrorAction SilentlyContinue
# Remove-Item $filtered_annual_data -ErrorAction SilentlyContinue
# Remove-Item $filtered_quarterly_data -ErrorAction SilentlyContinue
# Remove-Item $filtered_price_data -ErrorAction SilentlyContinue
Remove-Item $top_100_stocks_csv -ErrorAction SilentlyContinue
Remove-Item $obligatory_passed_csv -ErrorAction SilentlyContinue
Remove-Item $stocks_not_banned -ErrorAction SilentlyContinue
foreach ($screen in $obligatory_screens_csvs) {
    $screen_path = Join-Path $scriptDir "obligatory_screens\results\$screen"
    Remove-Item $screen_path -ErrorAction SilentlyContinue
}
foreach ($screen in $ranking_screens_csvs) {
    $screen_path = Join-Path $scriptDir "ranking_screens\results\$screen"
    Remove-Item $screen_path -ErrorAction SilentlyContinue
}
foreach ($screen in $market_sentiment_screens_csvs) {
    $screen_path = Join-Path $scriptDir "market_sentiment_screens\results\$screen"
    Remove-Item $screen_path -ErrorAction SilentlyContinue
}


Write-Host "Fetching stock data from the API..."
python $priceFundamentalScript

Write-Host "Running obligatory screen scripts in parallel..."

$jobs = @()

foreach ($screen in $obligatory_screens) {
    $jobs += Start-Job -ScriptBlock {
        param($scriptDir, $screen)
        Set-Location $scriptDir
        python $screen
    } -ArgumentList $scriptDir, $screen
}

Write-Host "Waiting for obligatory screen scripts to complete..."

function Show-JobOutput($jobs) {
    do {
        foreach ($job in $jobs) {
            $output = Receive-Job -Job $job
            if ($output) {
                Write-Host "Job $($job.Id): $output"
            }
        }
        Start-Sleep -Milliseconds 1000
    } while ($jobs | Where-Object { $_.State -eq 'Running' })
}

# Display output in real-time and wait for jobs to complete
Show-JobOutput $jobs

# Ensure all jobs are completed and display any final output
$jobs | Wait-Job | Out-Null
$jobs | Receive-Job

Write-Host "Obligatory screen completed. Checking that obligatory screen files exist..."

foreach ($file in $obligatory_screens_csvs) {
    $file_path = Join-Path $scriptDir "obligatory_screens\results\$file"
    if (-not (Test-Path $file_path)) {
        Write-Host "Error: $file_path does not exist."
        exit 1
    }
}


Write-Host "Obligatory screen files exist. Checking which stocks passed the obligatory screens..."

python $obligatory_passed_stocks

Write-Host "Checking which files are banned, creating unbanned stocks list..."

python $banned_filter

Write-Host "Running the filter to keep the data for the stocks that passed all obligatory screens and are not banned..."

python $obligatory_data_filter

Write-Host "Running ranking screens scripts in parallel..."

$rankingJobs = @()

foreach ($screen in $ranking_screens) {
    $screen_path = Join-Path $scriptDir "ranking_screens\$screen"
    $rankingJobs += Start-Job -ScriptBlock {
        param($scriptDir, $screen_path)
        Set-Location $scriptDir
        python $screen_path
    } -ArgumentList $scriptDir, $screen_path
}

# Display output in real-time and wait for ranking jobs to complete
Show-JobOutput $rankingJobs

# Ensure all ranking jobs are completed and display any final output
$rankingJobs | Wait-Job | Out-Null
$rankingJobs | Receive-Job

Write-Host "All ranking screens completed."
Write-Host "Searching for the top 100 stocks"

python $top_100_stocks

Write-Host "Running market sentiment screens in parallel..."

$marketSentimentJobs = @()

foreach ($screen in $market_sentiment_screens) {
    $screen_path = Join-Path $scriptDir "market_sentiment_screens\$screen"
    $marketSentimentJobs += Start-Job -ScriptBlock {
        param($scriptDir, $screen_path)
        Set-Location $scriptDir
        python $screen_path
    } -ArgumentList $scriptDir, $screen_path
}

# Display output in real-time and wait for market sentiment jobs to complete
Show-JobOutput $marketSentimentJobs

# Ensure all market sentiment jobs are completed and display any final output
$marketSentimentJobs | Wait-Job | Out-Null
$marketSentimentJobs | Receive-Job

Write-Host "All market sentiment screens completed."

Write-Host "Running history handler script..."

python $history_handler

Write-Host "All scripts completed."

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.Application]::SetSuspendState('Suspend', $false, $false)