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
  <Card className="bg-card">
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
          
          logs.push(`Current Risk Pool: $${currentRiskPool.toFixed(2)} (${(currentRiskPool/accountSize*100).toFixed(2)}%)`);
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
      value: `$${riskPool.toFixed(2)} (${(riskPool/currentBalance*100).toFixed(2)}%)`,
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

  return (
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
  );
};