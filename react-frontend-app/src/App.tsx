// App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StocksRankingPage } from './StocksFilteringPage/StocksFilteringPage';
import { PersonalRankingPage } from './StockRankingPage/PersonalRankingPage';
import { TradeHistoryPage } from './TradeHistoryPage/TradeHistoryPage';
import { TradingStatsPage } from './TradeStatisticsPage/TradeStatisticsPage';
import { CustomOrdersPage } from './CustomOrdersPage/CustomOrdersPage';
import { TickerManagementPage } from './TickerManagementPage/TickerManagementPage';
import { Navigation } from './components/Navigation';
import './App.css';
import PostAnalysisPage from './PostAnalysisPage/PostAnalysisPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="w-full px-2 sm:px-4 lg:px-6 py-2">
          <Routes>
            <Route path="/stocks_screeners" element={<StocksRankingPage />} />
            <Route path="/personal_ranking" element={<PersonalRankingPage />} />
            <Route path="/trade_history" element={<TradeHistoryPage />} />
            <Route path="/trading_stats" element={<TradingStatsPage />} />
            <Route path="/custom_orders" element={<CustomOrdersPage />} />
            <Route path="/ticker_management" element={<TickerManagementPage />} />
            <Route path="/post_analysis" element={<PostAnalysisPage />} />
            {/* Redirect to stocks screeners if no path matches */}
            {/* Redirect root path to stocks screeners */}
            <Route path="/" element={<Navigate to="/stocks_screeners" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
