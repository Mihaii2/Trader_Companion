import { ScreeningOptions } from '../types/screenerCommander';
import { API_CONFIG } from '../config';

export const sendScreenerCommand = async (options: ScreeningOptions) => {
  try {
    const screeningData = {
      min_price_increase: 10.5,
      ranking_method: "price_increase",
      fetch_data: false,
      top_n: 20,
      obligatory_screens: ["above_52week_low", "trending_up"],
      ranking_screens: ["annual_EPS_acceleration", "quarterly_EPS_acceleration", "top_price_increases_1y", "price_spikes", "rs_over_70"],
      skip_obligatory: true,
      skip_sentiment: true
    };

    const response = await fetch(`${API_CONFIG.baseURL}/stock_filtering_app/run_screening`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),  // Convert object to JSON string
    });
    
    if (!response.ok && response.status !== 409) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const response_json = await response.json();
    return response_json.message;
  } catch (error) {
    console.error('Error in stock screener:', error);
    throw error;
  }
};