import React from 'react';
import { ThemeToggle } from './ThemeToggle';

interface NavigationProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  currentPage, 
  onPageChange 
}) => {
  return (
    <nav className="w-full bg-background border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex space-x-8">
            <button
              onClick={() => onPageChange('stocks')}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary
                ${currentPage === 'stocks' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-muted-foreground'
                }`}
            >
              Stocks Ranking
            </button>
            <button
              onClick={() => onPageChange('personal')}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium transition-colors hover:text-primary
                ${currentPage === 'personal' 
                  ? 'border-b-2 border-primary text-primary' 
                  : 'text-muted-foreground'
                }`}
            >
              Personal Ranking
            </button>
          </div>
          <div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;