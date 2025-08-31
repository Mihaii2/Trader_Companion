// components/Navigation.tsx
import { Link, useLocation } from 'react-router-dom';
import { ThemeToggle } from './ThemeToggle';

export function Navigation() {
  const location = useLocation();
  const currentPage = location.pathname.slice(1) || 'stocks_screeners';

  return (
    <nav className="w-full bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex space-x-8">
            <Link
              to="/stocks_screeners"
              className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary
                ${currentPage === 'stocks_screeners' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-muted-foreground'
                }`}
            >
              Stocks Screeners
            </Link>
            <Link
              to="/personal_ranking"
              className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary
                ${currentPage === 'personal_ranking' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-muted-foreground'
                }`}
            >
              Personal Ranking
            </Link>
            <Link
              to="/trade_history"
              className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary
                ${currentPage === 'trade_history' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-muted-foreground'
                }`}
            >
              Trade History
            </Link>
            <Link
              to="/trading_stats"
              className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary
                ${currentPage === 'trading_stats' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-muted-foreground'
                }`}
            >
              Trading Stats
            </Link>
            <Link
              to="/ticker_management"
              className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary
                ${currentPage === 'ticker_management' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-muted-foreground'
                }`}
            >
              Ticker Monitoring
            </Link>
            <Link
              to="/trading_bots"
              className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary
                ${currentPage === 'trading_bots' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-muted-foreground'
                }`}
            >
              Trading Bots
            </Link>
            <Link
              to="/post_analysis"
              className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary
                ${currentPage === 'post_analysis' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-muted-foreground'
                }`}
            >
              Post Analysis
            </Link>
          </div>
          <div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}