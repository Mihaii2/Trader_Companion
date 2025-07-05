import React, { useState, useEffect } from 'react';
import { tradeAPI } from '../services/tradeAPI';
import { balanceAPI } from '../services/balanceAPI';
import { Trade } from '@/TradeHistoryPage/types/Trade';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DollarSign, Percent, Wallet, Edit, BarChart } from "lucide-react";

const StatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  valueColor 
}: { 
  label: string; 
  value: string; 
  icon: React.ElementType; 
  valueColor: string;
}) => (
  <Card className="bg-card border border-border">
    <CardContent className="py-1 px-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">{label}:</span>
        <span className={`font-semibold ${valueColor}`}>{value}</span>
      </div>
      <Icon className={`w-4 h-4 ${valueColor}`} />
    </CardContent>
  </Card>
);

export const RiskPoolStats: React.FC = () => {
  const [initialBalance, setInitialBalance] = useState<number>(1000);
  const [currentBalance, setCurrentBalance] = useState<number>(1000);
  const [riskPool, setRiskPool] = useState<number>(5);
  const [winRate, setWinRate] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingBalance, setEditingBalance] = useState<boolean>(false);
  const [tempBalance, setTempBalance] = useState<string>('1000');
  const [showSimulationDetails, setShowSimulationDetails] = useState<boolean>(false);
  const [maxRiskPercent, setMaxRiskPercent] = useState<number>(1.25);
  const [rMultiple, setRMultiple] = useState<number>(3);
  const [tradesFetched, setTradesFetched] = useState<Trade[]>([]);

  const [includeLosses, setIncludeLosses] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [tradesResponse, balance] = await Promise.all([
          tradeAPI.getTrades(),
          balanceAPI.getBalance()
        ]);
        
        // Filter trades that have status "Exited"
        const fetchedTrades = tradesResponse.data;
        setTradesFetched(fetchedTrades);
        setInitialBalance(balance);
        setCurrentBalance(balance);
        setTempBalance('69');
  
        let accountSize = balance;
        let currentRiskPool = accountSize * 0.005; // Start at 0.5% of account
        const logs: string[] = [];
        
        // Initialize last 8 trades array for tracking win rate
        const last8Trades: boolean[] = []; // true for win, false for loss
        let currentWinRate = 0;
        let tradingWell = false;
        
        logs.push(`Initial Risk Pool: $${currentRiskPool.toFixed(2)} (${(currentRiskPool/accountSize*100).toFixed(2)}%)`);

        fetchedTrades.forEach((trade: Trade, index: number) => {
          // Constants
          const thresholdPct = 0.005; // 0.5%
          const maxRiskPoolPct = 0.05; // 5%
          const reductionFactor = 0.25; // 25% reduction factor
          const increaseFactor = 0.25; // 25% increase factor
          
          const isWinningTrade = trade.Return !== null && trade.Return > 0;
          
          // Update last 8 trades history
          if (last8Trades.length >= 8) {
            last8Trades.shift(); // Remove oldest trade
          }
          last8Trades.push(isWinningTrade);
          
          // Calculate current win rate
          const wins = last8Trades.filter(win => win).length;
          currentWinRate = last8Trades.length > 0 ? wins / last8Trades.length : 0;
          
          
          
          logs.push(`\n--- Trade ${index + 1} (${trade.Ticker}) ---`);

          // Determine if we can take new positions
          const previousTradingWell = tradingWell;
          tradingWell = currentWinRate >= 0.375; // At least 3/8 wins (37.5%)
          
          // Check if win rate just crossed the threshold to allow trading
          if (!previousTradingWell && tradingWell) {
            logs.push(`WIN RATE THRESHOLD CROSSED: Win rate is now ${(currentWinRate * 100).toFixed(2)}%, trading improved!`);
            
            // Set risk pool to 0.5% when crossing the threshold only if the risk pool is below 0.5% of account
            if (currentRiskPool < accountSize * 0.005) {
              const oldRiskPool = currentRiskPool;
              currentRiskPool = accountSize * 0.005; // Set to 0.5% of account
              logs.push(`RISK POOL ADJUSTED: Setting risk pool to 0.5% of account: ${oldRiskPool.toFixed(4)} → ${currentRiskPool.toFixed(4)}`);
            }
          } else if (previousTradingWell && !tradingWell) {
            logs.push(`WIN RATE DROPPED BELOW THRESHOLD: Win rate is now ${(currentWinRate * 100).toFixed(2)}%, trading worse!`);
          }

          logs.push(`Win Rate: ${(currentWinRate * 100).toFixed(2)}% (${wins}/${last8Trades.length})`);
          
          // Formula for reducing risk pool when below threshold
          const calculateReducedRiskPool = (
            currentRiskPool: number,
            lossAmount: number
          ): number => {
            const lossProportion = Math.min(lossAmount / currentRiskPool, 1.0);
            const reduction = currentRiskPool * reductionFactor * lossProportion;
            return currentRiskPool - reduction;
          };
          

          // Formula for increasing risk pool when below threshold
          const calculateIncreasedRiskPool = (
            currentRiskPool: number,
            winAmount: number
          ): number => {
            const winProportion = Math.min(winAmount / currentRiskPool, 1.0);
            const increase = currentRiskPool * increaseFactor * winProportion;
            return currentRiskPool + increase;
          };

          // The corrected code portion for handling winning trades
          // Replace the existing win-handling logic with this code
          if (isWinningTrade && trade.Return !== null) {
            const winAmount = trade.Return;
            accountSize += winAmount;
            logs.push(`Win Amount: $${winAmount.toFixed(2)}`);
            
            // Update threshold based on new account size
            const newThresholdAmount = accountSize * thresholdPct;
            
            // Update risk pool based on threshold
            if (currentRiskPool < newThresholdAmount) {
              // If below threshold, we need to handle it differently
              const oldRiskPool = currentRiskPool;
              
              // Calculate how much the risk pool would increase if we applied the formula to the entire win amount
              const potentialNewRiskPool = calculateIncreasedRiskPool(oldRiskPool, winAmount);
              
              if (potentialNewRiskPool < newThresholdAmount) {
                // Even applying the formula to the entire win wouldn't reach the threshold
                // So apply formula to the entire win amount
                currentRiskPool = potentialNewRiskPool;
                const increasedAmount = currentRiskPool - oldRiskPool;
                
                const winProportion = Math.min(winAmount / oldRiskPool, 1.0);
                const formulaCalculation = oldRiskPool * increaseFactor * winProportion;
                
                logs.push(`Risk Pool Update: Formula used for entire win amount ($${winAmount.toFixed(2)})`);
                logs.push(`Formula calculation: $${oldRiskPool.toFixed(2)} * ${increaseFactor} * ${winProportion.toFixed(4)} = $${formulaCalculation.toFixed(4)}`);
                logs.push(`Formula added: $${increasedAmount.toFixed(4)} to pool`);
              } else {
                // Applying the formula to the entire win would exceed the threshold
                // Find the amount that would reach the threshold exactly when using the formula
                
                // We need to solve for x in: oldRiskPool + (oldRiskPool * increaseFactor * min(x/oldRiskPool, 1)) = threshold
                // If x >= oldRiskPool: oldRiskPool + (oldRiskPool * increaseFactor) = threshold
                // If x < oldRiskPool: oldRiskPool + (increaseFactor * x) = threshold
                
                const maxIncrease = oldRiskPool * increaseFactor;
                const neededIncrease = newThresholdAmount - oldRiskPool;
                
                let amountNeededForThreshold: number;
                if (neededIncrease <= maxIncrease) {
                  // We can reach threshold with partial application
                  amountNeededForThreshold = neededIncrease / increaseFactor;
                } else {
                  // Need full application plus direct addition
                  amountNeededForThreshold = oldRiskPool; // This will give us max increase
                }
                
                // Use formula for the threshold portion
                const riskPoolAtThreshold = calculateIncreasedRiskPool(oldRiskPool, amountNeededForThreshold);
                const increasedByFormula = riskPoolAtThreshold - oldRiskPool;
                
                // Add the rest directly
                const remainingWin = winAmount - amountNeededForThreshold;
                
                const winProportion = Math.min(amountNeededForThreshold / oldRiskPool, 1.0);
                
                logs.push(`Risk Pool Update: Formula used for $${amountNeededForThreshold.toFixed(4)}, adding $${increasedByFormula.toFixed(4)}`);
                logs.push(`Formula calculation: $${oldRiskPool.toFixed(2)} * ${increaseFactor} * ${winProportion.toFixed(4)} = $${increasedByFormula.toFixed(4)}`);
                logs.push(`Full addition for remaining $${remainingWin.toFixed(2)}`);
                
                // Apply both parts
                currentRiskPool = riskPoolAtThreshold + remainingWin;
              }
            } else {
              // If already above threshold, add full amount
              currentRiskPool += winAmount;
              logs.push(`Risk Pool Update: Full win amount $${winAmount.toFixed(2)} added`);
            }
            
            // Cap risk pool at maximum percentage
            const maxRiskPool = accountSize * maxRiskPoolPct;
            if (currentRiskPool > maxRiskPool) {
              logs.push(`Risk Pool Capped: $${currentRiskPool.toFixed(2)} → $${maxRiskPool.toFixed(2)} (5% limit)`);
              currentRiskPool = maxRiskPool;
            }
          } else if (!isWinningTrade && trade.Return !== null) {
            const lossAmount = Math.abs(trade.Return);
            accountSize -= lossAmount;
            logs.push(`Loss Amount: $${lossAmount.toFixed(2)}`);
            
            // Update threshold based on new account size
            const newThresholdAmount = accountSize * thresholdPct;
            
            // Store the old risk pool for logging
            const oldRiskPool = currentRiskPool;
            
            // Update risk pool based on threshold
            if (currentRiskPool > newThresholdAmount) {
              // If above threshold, subtract full amount down to threshold
              const amountAboveThreshold = currentRiskPool - newThresholdAmount;
              
              if (lossAmount <= amountAboveThreshold) {
                // Can subtract full loss without going below threshold
                currentRiskPool -= lossAmount;
                logs.push(`Risk Pool Update: Full loss of $${lossAmount.toFixed(2)} subtracted`);
              } else {
                // Need to reduce to threshold and then apply formula
                const reducedByDirect = amountAboveThreshold;
                const excessLoss = lossAmount - amountAboveThreshold;
                
                // First reduce to threshold
                currentRiskPool = newThresholdAmount;
                
                // Then apply formula for remaining amount
                const beforeFormula = currentRiskPool;
                const lossProportion = Math.min(excessLoss / beforeFormula, 1.0);
                const formulaCalculation = beforeFormula * reductionFactor * lossProportion;
                
                currentRiskPool = calculateReducedRiskPool(currentRiskPool, excessLoss);
                const reducedByFormula = beforeFormula - currentRiskPool;
                
                logs.push(`Risk Pool Update: ${reducedByDirect.toFixed(4)} subtracted directly to reach threshold`);
                logs.push(`Formula calculation: ${beforeFormula.toFixed(2)} * ${reductionFactor} * ${lossProportion.toFixed(4)} = ${formulaCalculation.toFixed(4)}`);
                logs.push(`Formula used for remaining ${excessLoss.toFixed(2)}, reducing by ${reducedByFormula.toFixed(4)}`);
              }
            } else {
              // Already below threshold, use formula for full loss
              const beforeFormula = currentRiskPool;
              currentRiskPool = calculateReducedRiskPool(currentRiskPool, lossAmount);
              const reducedBy = beforeFormula - currentRiskPool;
              
              const lossProportion = Math.min(lossAmount / beforeFormula, 1.0);
              const formulaCalculation = beforeFormula * reductionFactor * lossProportion;
              
              logs.push(`Risk Pool Update: Formula used for entire ${lossAmount.toFixed(2)} loss`);
              logs.push(`Formula calculation: ${beforeFormula.toFixed(2)} * ${reductionFactor} * ${lossProportion.toFixed(4)} = ${formulaCalculation.toFixed(4)}`);
              logs.push(`Formula reduced pool by ${reducedBy.toFixed(4)}`);
            }
            
            logs.push(`Risk Pool Change: $${oldRiskPool.toFixed(2)} → $${currentRiskPool.toFixed(2)}`);
          }
          
          logs.push(`Current Risk Pool: $${currentRiskPool.toFixed(2)}`);
        });
  
        setCurrentBalance(accountSize);
        setRiskPool(currentRiskPool);
        setWinRate(currentWinRate);
        
        // Log full calculation details to console
        console.log("Risk Pool Calculation Log:");
        logs.forEach(log => console.log(log));
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleBalanceUpdate = async () => {
    const newBalance = parseFloat(tempBalance);
    if (!isNaN(newBalance) && newBalance >= 0) {
      try {
        await balanceAPI.updateBalance(newBalance);
        setInitialBalance(newBalance);
        setCurrentBalance(newBalance);
        setRiskPool(newBalance * 0.005); // Set to 0.5% of new balance
        setEditingBalance(false);
      } catch (error) {
        console.error('Error updating balance:', error);
      }
    }
  };

  const percentageChange = ((currentBalance - initialBalance) / initialBalance) * 100;

  if (loading) return <div>Loading...</div>;

  const stats = [
    {
      label: "Initial Balance",
      value: `Hidden`,
      icon: Wallet,
      valueColor: "text-blue-500"
    },
    {
      label: "Percentage Change",
      value: `${percentageChange.toFixed(2)}%`,
      icon: Percent,
      valueColor: percentageChange >= 0 ? "text-green-500" : "text-red-0"
    },
    {
      label: "Current Balance",
      value: `Hidden`,
      icon: DollarSign,
      valueColor: "text-green-500"
    },
    {
      label: "Current Risk Pool",
      value: `$${riskPool.toFixed(2)}`,
      icon: DollarSign,
      valueColor: "text-purple-500"
    },
    {
      label: "Win Rate (Last 8)",
      value: `${(winRate * 100).toFixed(2)}%`,
      icon: BarChart,
      valueColor: winRate >= 0.375 ? "text-green-500" : "text-amber-500"
    }
  ];

  // Calculate perfect trading simulation

// Modified calculatePerfectTrading function
  const calculatePerfectTrading = () => {
    const targetReturn = initialBalance * 1.0; // 100% return
    const targetBalance = initialBalance + targetReturn;
    
    let simAccountSize = currentBalance;
    let simRiskPool = riskPool;
    const trades = [];
    let tradeCount = 0;
    const simLast8Trades: boolean[] = [];
    const existingTrades = tradesFetched.slice(-8);
    existingTrades.forEach(trade => {
      const isWin = trade.Return !== null && trade.Return > 0;
      simLast8Trades.push(isWin);
    });
    
    while (simAccountSize < targetBalance && tradeCount < 100) {
      tradeCount++;
      
      const maxRisk = simAccountSize * (maxRiskPercent / 100);
      const riskAmount = Math.min(simRiskPool, maxRisk);
      const returnAmount = riskAmount * rMultiple;
      
      // Add win trade
      simAccountSize += returnAmount;
      
      const thresholdPct = 0.005;
      const maxRiskPoolPct = 0.05;
      const increaseFactor = 0.25;
      const reductionFactor = 0.25;
      
      const newThresholdAmount = simAccountSize * thresholdPct;
      let oldRiskPool = simRiskPool;
      
      const calculateIncreasedRiskPool = (currentRiskPool: number, winAmount: number): number => {
        const winProportion = Math.min(winAmount / currentRiskPool, 1.0);
        const increase = currentRiskPool * increaseFactor * winProportion;
        return currentRiskPool + increase;
      };
      
      const calculateReducedRiskPool = (currentRiskPool: number, lossAmount: number): number => {
        const lossProportion = Math.min(lossAmount / currentRiskPool, 1.0);
        const reduction = currentRiskPool * reductionFactor * lossProportion;
        return currentRiskPool - reduction;
      };
      
      // Handle win trade
      if (simRiskPool < newThresholdAmount) {
        const potentialNewRiskPool = calculateIncreasedRiskPool(oldRiskPool, returnAmount);
        
        if (potentialNewRiskPool < newThresholdAmount) {
          simRiskPool = potentialNewRiskPool;
        } else {
          const neededIncrease = newThresholdAmount - oldRiskPool;
          const maxIncrease = oldRiskPool * increaseFactor;
          
          let amountNeededForThreshold;
          if (neededIncrease <= maxIncrease) {
            amountNeededForThreshold = neededIncrease / increaseFactor;
          } else {
            amountNeededForThreshold = oldRiskPool;
          }
          
          const riskPoolAtThreshold = calculateIncreasedRiskPool(oldRiskPool, amountNeededForThreshold);
          const remainingWin = returnAmount - amountNeededForThreshold;
          simRiskPool = riskPoolAtThreshold + remainingWin;
        }
      } else {
        simRiskPool += returnAmount;
      }
      
      const maxRiskPool = simAccountSize * maxRiskPoolPct;
      if (simRiskPool > maxRiskPool) {
        simRiskPool = maxRiskPool;
      }
      
      trades.push({
        tradeNumber: tradeCount,
        riskAmount,
        returnAmount,
        newBalance: simAccountSize,
        newRiskPool: simRiskPool,
        percentageGain: ((simAccountSize - initialBalance) / initialBalance) * 100,
        isWin: true
      });
      
      if (simLast8Trades.length >= 8) {
        simLast8Trades.shift();
      }
      simLast8Trades.push(true);
      
      let currentWinRate = simLast8Trades.length > 0 ? simLast8Trades.filter(win => win).length / simLast8Trades.length : 0;
      
      if (currentWinRate >= 0.375 && simRiskPool < simAccountSize * 0.005) {
        simRiskPool = simAccountSize * 0.005;
      }
      
      // Add loss trade if includeLosses is true
      if (includeLosses) {
        tradeCount++;
        simAccountSize -= riskAmount;
        
        const newThresholdAmountLoss = simAccountSize * thresholdPct;
        oldRiskPool = simRiskPool;
        
        if (simRiskPool > newThresholdAmountLoss) {
          const amountAboveThreshold = simRiskPool - newThresholdAmountLoss;
          
          if (riskAmount <= amountAboveThreshold) {
            simRiskPool -= riskAmount;
          } else {
            const excessLoss = riskAmount - amountAboveThreshold;
            simRiskPool = newThresholdAmountLoss;
            simRiskPool = calculateReducedRiskPool(simRiskPool, excessLoss);
          }
        } else {
          simRiskPool = calculateReducedRiskPool(simRiskPool, riskAmount);
        }
        
        trades.push({
          tradeNumber: tradeCount,
          riskAmount,
          returnAmount: -riskAmount,
          newBalance: simAccountSize,
          newRiskPool: simRiskPool,
          percentageGain: ((simAccountSize - initialBalance) / initialBalance) * 100,
          isWin: false
        });
        
        if (simLast8Trades.length >= 8) {
          simLast8Trades.shift();
        }
        simLast8Trades.push(false);
        
        currentWinRate = simLast8Trades.length > 0 ? simLast8Trades.filter(win => win).length / simLast8Trades.length : 0;
        
        if (currentWinRate >= 0.375 && simRiskPool < simAccountSize * 0.005) {
          simRiskPool = simAccountSize * 0.005;
        }
      }
      
      if (simAccountSize >= targetBalance) break;
    }
    
    return trades;
  };
  
  const perfectTrades = calculatePerfectTrading();
  const finalGain = perfectTrades.length > 0 ? perfectTrades[perfectTrades.length - 1].percentageGain : 0;


  return (
    <>
      <Card className="mb-4">
      <CardHeader>
        <CardTitle>Risk Pool</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
        <div className="grid grid-cols-2 gap-1">
          {stats.map((stat) => (
          <div key={stat.label}>
            {stat.label === "Initial Balance" && editingBalance ? (
            <Card className="bg-card">
              <CardContent className="py-1 px-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{stat.label}:</span>
                <Input
                type="number"
                value={tempBalance}
                onChange={(e) => setTempBalance(e.target.value)}
                className="w-32 h-8 text-sm"
                />
              </div>
              <div className="flex gap-1">
                <Button size="sm" onClick={handleBalanceUpdate}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingBalance(false)}>Cancel</Button>
              </div>
              </CardContent>
            </Card>
            ) : (
            <div className="relative">
              <StatCard {...stat} />
              {stat.label === "Initial Balance" && !editingBalance && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-8 top-1 h-6 w-6 p-0"
                onClick={() => setEditingBalance(true)}
              >
                <Edit className="w-4 h-4 text-gray-500" />
              </Button>
              )}
            </div>
            )}
          </div>
          ))}
        </div>
        </div>
      </CardContent>
      </Card>

      <Card className="mb-4">
      <CardHeader>
        <div className="text-center">
          <CardTitle>Trading Simulation to 100% Return</CardTitle>
          <p className="text-sm text-muted-foreground">
            Simulating trades ({rMultiple}R return{includeLosses ? ", with 50% win rate" : ", no losses"}) using risk pool algorithm.
            {perfectTrades.length > 0 && (
              <>
                <br />
                <span className="font-semibold text-green-600">
                  {perfectTrades.length} trades needed to reach {finalGain.toFixed(1)}% return
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center justify-start gap-4 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIncludeLosses(!includeLosses)}
            className={`${
              includeLosses 
                ? "bg-destructive/20 text-foreground hover:bg-destructive/30 dark:bg-destructive/30 dark:text-secondary-foreground dark:hover:bg-destructive/40" 
                : "bg-background text-foreground hover:bg-accent dark:text-secondary-foreground dark:hover:bg-secondary/80"
            } border border-input transition-colors`}
          >
            {includeLosses ? "Remove Losses" : "Include Losses"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSimulationDetails(!showSimulationDetails)}
          >
            {showSimulationDetails ? "Hide Details" : "Show Details"}
          </Button>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">Max Risk:</span>
            <Input
              type="number"
              value={maxRiskPercent}
              onChange={(e) => setMaxRiskPercent(parseFloat(e.target.value) || 1.25)}
              className="w-20 h-8 text-sm"
              step="0.1"
              min="0.1"
              max="10"
            />
            <span className="text-sm text-muted-foreground">% of account.</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">Risk Multiple:</span>
            <Input
              type="number"
              value={rMultiple}
              onChange={(e) => setRMultiple(parseFloat(e.target.value) || 3)}
              className="w-20 h-8 text-sm"
              step="0.1"
              min="0.1"
              max="10"
            />
            <span className="text-sm text-muted-foreground">R's</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-2">
      {perfectTrades.map((trade) => (
        <Card key={trade.tradeNumber} className={trade.isWin ? "bg-green-50/20 dark:bg-green-950/20 border-green-100/30 dark:border-green-900/30" : "bg-red-50/20 dark:bg-red-950/20 border-red-100/30 dark:border-red-900/30"}>
          <CardContent className="p-3">
            <div className={`text-sm font-semibold ${trade.isWin ? "text-green-800 dark:text-green-200" : "text-red-0 dark:text-red-0"} mb-2`}>
              Trade #{trade.tradeNumber} {trade.isWin ? "(Win)" : "(Loss)"}
            </div>
            <div className="space-y-1 text-xs">
              {showSimulationDetails && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Risk:</span>
                    <span className="font-medium">${trade.riskAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Return:</span>
                    <span className={`font-medium ${trade.isWin ? "text-green-600" : "text-red-0"}`}>${trade.returnAmount.toFixed(0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">New Balance:</span>
                    <span className="font-medium">${trade.newBalance.toFixed(0)}</span>
                  </div>  
                </>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Gain:</span>
                <span className={`font-medium ${trade.percentageGain >= 0 ? "text-green-600" : "text-red-0"}`}>{trade.percentageGain.toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
        </div>
      </CardContent>
      </Card>
    </>
  );
};