import './App.css'
// import { StocksRankingPage } from './StocksFilteringPage/StocksFilteringPage'
import { PersonalRankingPage } from './StockRankingPage/PersonalRankingPage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {

  return (
    <QueryClientProvider client={queryClient}>
      {/* <StocksRankingPage /> */}
      <PersonalRankingPage />
    </QueryClientProvider>
  )
}

export default App
