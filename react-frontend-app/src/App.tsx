// App.tsx
import './App.css';
import { useState } from 'react';
import { StocksRankingPage } from './StocksFilteringPage/StocksFilteringPage';
import { PersonalRankingPage } from './StockRankingPage/PersonalRankingPage';
import { Navigation } from './components/Navigation';

export default function App() {
  const [currentPage, setCurrentPage] = useState('stocks');

  return (
    <div className="min-h-screen bg-background">
      <Navigation 
        currentPage={currentPage} 
        onPageChange={setCurrentPage} 
      />
      <main className="w-full px-2 sm:px-4 lg:px-6 py-2">
        {currentPage === 'stocks' ? (
          <StocksRankingPage />
        ) : (
          <PersonalRankingPage />
        )}
      </main>
    </div>
  );
}