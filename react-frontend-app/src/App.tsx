import './App.css'
import { StocksRankingPage } from './pages/StocksRankingPage'
import { ThemeProvider } from "./components/theme-provider"

function App() {

  return (
    <ThemeProvider defaultTheme="dark">
      <StocksRankingPage />
      
    </ThemeProvider>
  )
}

export default App
