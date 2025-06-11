import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { StockPick, GlobalCharacteristic } from '../types';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, X, Edit, Check, MoreHorizontal, Download } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Checkbox
} from "@/components/ui/checkbox";
import { globalCharacteristicsApi } from '../services/globalCharacteristics';
import { stockPicksApi } from '../services/stockPick';

interface Props {
  stock: StockPick;
  onUpdate: (updatedStock: StockPick) => void;
  onRemove: () => void;
}

// Define manually ordered characteristic names
// Add your preferred characteristics in the desired order here
const ORDERED_CHARACTERISTICS = [
  "Earnings Surprises",
  "Strong Against Market",
  "Weak RSI(<70)",
  "Weak Against Market",
  "Spike Down On Volume",
  "Support off The Lows",
  "Good Stage 2 Volume",
  "Not a Porcupine",
  "Good EPS Estimates",
  "M - Favorable Market Direction",
  "Accum.(no selling) on Weekly",
  "Looks good on Weekly Too",
  "Accum.(no selling) on Daily",
  "High Alpha Low StdDev",
  "Low Alpha High StdDev",
  "Spikes On Volume",
  "Shakeouts",
  "Volatile",
  "Held Up Well Against Market/ Outperforming/ Surging/RSI Uptrend",
  "Strong IPO Price Action",
  "MVP(Not Late Stage)",
  "Power Play(EARLY STAGE)",
  "PP With Tight W Closes",
  "Fast Rebounder",
  "Drawn Bases Lines",
  "NOT LATE STAGE(PE Exp, Bases, Loose Base)",
  "Started Off Correction",
  "Good ROE",
  "Earnings Dump",
  "IPO 10 Years",
  "Top Competitor",
  "L - Leader",
  "Cyclical",
  "Turnaround(100%>2Q)",
  "Institutional Favorite",
  "Low PE",
  "Under 30M Shares",
  "S - Reasonable Number Of Shares",
  "Good Yearly Sales",
  "Good Yearly Net Margins",
  "Good Yearly EPS",
  "A - Compounded Yearly EPS of 25%(10% for turnarounds)",
  "Compounded Yearly EPS of 50%",
  "Steady Yearly EPS increase",
  "Yearly Code 33",
  "EPS Breakout Year",
  "Good Q YOY Revenue",
  "Good Q YOY Net Margins",
  "Good Q YOY EPS",
  "Reasonable Debt",
  "Sales Deceleration",
  "No Earnings Deceleration",
  "C - Current Quarter 20% Up",
  "C - Current Quarter 40% Up",
  "Previous 2 Quarters Also Up 20%",
  "Earnings Acceleration somewhere in Last 10Q",
  "Code 33",
  "Rolling 2Q Code 33",
  "Last Q 20pct YOY EPS",
  "Sudden Growth Change",
  "Good ROE",
  "Bad Inventory&Receivables",
  "Earnings Red Flags",
  "Not Much Taxes",
  "Over 10pct Avg surprise",
  "Q with 75pct Surprise",
  "Decelerating Surprises %",
  "Sales Surprises",
  "Upward Revisions",
  "Sales Upward Revisions",
  "Downward Revisions",
  "Good Ownership Past Q",
  "I - Institutional support so far",
  "Bad Ownership Past Q",
  "N - New Product/ Management/ Industry change/ Catalyst in last 5 Years",
  "Good Guidance",
  "Signs Acceleration will Continue",
];

// Define priority characteristics that should always be displayed first if present
// Replace these with your preferred characteristics list
const PRIORITY_CHARACTERISTICS = [
  "L - Leader",
  "Cyclical",
  "Top Competitor",
  "Turnaround(100%>2Q)",
  "Power Play(EARLY STAGE)",
  "Code 33",
];

const COLOR_CODED_CHARACTERISTICS = [
  "No Earnings Deceleration",
  "Earnings Acceleration somewhere in Last 10Q",
  "Started Off Correction",
  "IPO 10 Years",
  "NOT LATE STAGE(PE Exp, Bases, Loose Base)",
  "Held Up Well Against Market/ Outperforming/ Surging/RSI Uptrend",
  "C - Current Quarter 20% Up",
  "A - Compounded Yearly EPS of 25%(10% for turnarounds)",
  "N - New Product/ Management/ Industry change/ Catalyst in last 5 Years",
  "S - Reasonable Number Of Shares",
  "L - Leader",
  "I - Institutional support so far",
  "M - Favorable Market Direction",
];

export const RankingItem: React.FC<Props> = ({
  stock: initialStock,
  onUpdate,
  onRemove
}) => {
  const [stock, setStock] = useState<StockPick>(initialStock);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsText, setCaseText] = useState(initialStock.case_text || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalCharacteristics, setGlobalCharacteristics] = useState<GlobalCharacteristic[]>([]);
  const [isEditingScore, setIsEditingScore] = useState<number | null>(null);
  const [editedScore, setEditedScore] = useState<number>(0);
  const [isEditingPersonalScore, setIsEditingPersonalScore] = useState(false);
  const [personalScore, setPersonalScore] = useState<number>(initialStock.personal_opinion_score || 0);
  const [isSaving, setIsSaving] = useState(false);
  // Properly type the visible characteristics array
  const [visibleCharacteristics, setVisibleCharacteristics] = useState<StockPick['characteristics']>([]);
  const [priorityCharacteristics, setPriorityCharacteristics] = useState<StockPick['characteristics']>([]);
  const [hasHiddenCharacteristics, setHasHiddenCharacteristics] = useState(false);
  const [note, setNote] = useState<string>(initialStock.note || '');
  const [lastClickedCharacteristic, setLastClickedCharacteristic] = useState<number | null>(null);

  
  // Track pending characteristic changes
  const [pendingCharacteristics, setPendingCharacteristics] = useState<Record<number, boolean>>({});
  
  // Add a saveTimeout ref to debounce saving
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Ref for the characteristics container
  const charContainerRef = useRef<HTMLDivElement>(null);

  // Update local state when prop changes
  useEffect(() => {
    setStock(initialStock);
    setCaseText(initialStock.case_text || '');
    setPersonalScore(initialStock.personal_opinion_score || 0);
    setNote(initialStock.note || '');
    
    // Extract priority characteristics that exist in this stock
    const priorityChars = initialStock.characteristics.filter(
      char => PRIORITY_CHARACTERISTICS.includes(char.name)
    );
    setPriorityCharacteristics(priorityChars);
  }, [initialStock]);

  // Calculate which characteristics should be visible based on container height
  // Use useCallback to memoize the function and prevent unnecessary re-renders
  const calculateVisibleCharacteristics = useCallback(() => {
    if (!charContainerRef.current) return;

    // Get all characteristics and sort by score (descending)
    // Filter out priority characteristics as they'll be shown separately
    const priorityCharNames = PRIORITY_CHARACTERISTICS.filter(name => 
      stock.characteristics.some(c => c.name === name)
    );
    
    const sortedChars = [...stock.characteristics]
      .filter(char => !priorityCharNames.includes(char.name))
      .sort((a, b) => b.score - a.score);
    
    const container = charContainerRef.current;
    // Clone the container for testing
    const testContainer = container.cloneNode(true) as HTMLDivElement;
    testContainer.style.position = 'absolute';
    testContainer.style.visibility = 'hidden';
    testContainer.style.width = `${container.offsetWidth}px`;
    testContainer.innerHTML = '';
    document.body.appendChild(testContainer);
    
    // First add all priority characteristic badges
    const priorityBadges = document.createElement('div');
    priorityBadges.style.display = 'inline-block';
    testContainer.appendChild(priorityBadges);
    
    // Calculate how many badges we can fit before creating more than 2 rows
    const maxHeight = 28; // Approximate height for 1 row (adjust as needed)
    let visibleCount = 0;
    const totalChars = sortedChars.length;
    
    // If we have no non-priority characteristics, early return
    if (totalChars === 0) {
      setVisibleCharacteristics([]);
      setHasHiddenCharacteristics(false);
      document.body.removeChild(testContainer);
      return;
    }
    
    for (let i = 0; i < totalChars; i++) {
      const badge = document.createElement('div');
      badge.className = 'inline-block px-2 py-0.5 m-0.5 text-xs font-medium rounded-full';
      badge.textContent = sortedChars[i].name;
      testContainer.appendChild(badge);
      
      if (testContainer.offsetHeight > maxHeight) {
        // We've gone too far, remove this badge
        testContainer.removeChild(badge);
        
        // If we have more chars and this isn't the first one
        if (i < totalChars - 1 && i > 0) {
          visibleCount = i;
          setHasHiddenCharacteristics(true);
        } else {
          visibleCount = Math.max(1, i);
          setHasHiddenCharacteristics(i < totalChars - 1);
        }
        break;
      }
      
      // If we've added all badges and still fit
      if (i === totalChars - 1) {
        visibleCount = totalChars;
        setHasHiddenCharacteristics(false);
      }
    }
    
    // Clean up
    document.body.removeChild(testContainer);
    
    // If we need to add the "more" indicator, reserve space for it
    if (visibleCount < totalChars) {
      const moreTestContainer = container.cloneNode(true) as HTMLDivElement;
      moreTestContainer.style.position = 'absolute';
      moreTestContainer.style.visibility = 'hidden';
      moreTestContainer.style.width = `${container.offsetWidth}px`;
      moreTestContainer.innerHTML = '';
      document.body.appendChild(moreTestContainer);
      
      // Add the priority badges first
      const priorityBadges = document.createElement('div');
      priorityBadges.style.display = 'inline-block';
      moreTestContainer.appendChild(priorityBadges);
      
      // Add visible badges
      for (let i = 0; i < visibleCount; i++) {
        const badge = document.createElement('div');
        badge.className = 'inline-block px-2 py-0.5 m-0.5 text-xs font-medium rounded-full';
        badge.textContent = sortedChars[i].name;
        moreTestContainer.appendChild(badge);
      }
      
      // Add the "more" badge
      const moreBadge = document.createElement('div');
      moreBadge.className = 'inline-block px-2 py-0.5 m-0.5 text-xs font-medium rounded-full';
      moreBadge.textContent = '...';
      moreTestContainer.appendChild(moreBadge);
      
      // Check if adding "more" badge pushes to third row
      if (moreTestContainer.offsetHeight > maxHeight && visibleCount > 1) {
        visibleCount--;
      }
      
      document.body.removeChild(moreTestContainer);
    }
    
    // Update state with visible characteristics
    setVisibleCharacteristics(sortedChars.slice(0, visibleCount));
    setHasHiddenCharacteristics(visibleCount < totalChars);
  }, [stock.characteristics]);

  // Fetch global characteristics when component mounts or expands
  useEffect(() => {
    if (isExpanded) {
      fetchGlobalCharacteristics();
    }
  }, [isExpanded]);

  // Check visible characteristics on stock change or window resize
  useEffect(() => {
    // First, extract priority characteristics
    const priorityChars = stock.characteristics.filter(
      char => PRIORITY_CHARACTERISTICS.includes(char.name)
    );
    setPriorityCharacteristics(priorityChars);
    
    // Then calculate remaining visible characteristics
    calculateVisibleCharacteristics();
    window.addEventListener('resize', calculateVisibleCharacteristics);
    return () => {
      window.removeEventListener('resize', calculateVisibleCharacteristics);
    };
  }, [calculateVisibleCharacteristics, stock.characteristics]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Fetch global characteristics from API
  const fetchGlobalCharacteristics = async () => {
    try {
      const response = await globalCharacteristicsApi.getAllGlobalCharacteristics();
      setGlobalCharacteristics(response.data);
    } catch (err) {
      console.error('Error fetching global characteristics:', err);
      setError('Failed to load global characteristics');
    }
  };

  // Handle case text changes - use debounce to prevent API calls on every keystroke
  // Update the handleDetailsTextChange function to use the latest stock state
  const handleDetailsTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCaseText = e.target.value;
    setCaseText(newCaseText);
    
    // Update local stock state immediately for UI responsiveness
    setStock(prevStock => ({
      ...prevStock,
      case_text: newCaseText
    }));
    
    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Set a new timeout to save after typing stops
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        // Get the CURRENT stock state at the time of saving, not the closure value
        const currentStock = { ...stock };
        
        // Include all required fields from the current stock object
        const updatedStock = await stockPicksApi.updateStockPick(currentStock.id, { 
          case_text: newCaseText,
          ranking_box: currentStock.ranking_box,
          symbol: currentStock.symbol,
          total_score: currentStock.total_score,
          // Make sure to include the current personal_opinion_score
          personal_opinion_score: currentStock.personal_opinion_score
        });
        
        // Update the local state with the response data
        setStock(updatedStock.data);
        onUpdate(updatedStock.data);
      } catch (err) {
        console.error('Error saving case text:', err);
        setError('Failed to save case text');
      } finally {
        setIsSaving(false);
      }
    }, 1000); // Wait 1 second after typing stops before saving
  };

  // Toggle a characteristic on/off
  const handleToggleCharacteristic = async (characteristicId: number, checked: boolean) => {
    try {
      // Immediately update UI state for better UX
      setPendingCharacteristics(prev => ({...prev, [characteristicId]: checked}));
      setIsSubmitting(true);
      setError(null);
      
      // Optimistically update local state for immediate feedback
      if (checked) {
        // Find the global characteristic to get its default score
        const globalChar = globalCharacteristics.find(gc => gc.id === characteristicId);
        if (globalChar) {
          const optimisticChar = {
            id: -Date.now(), // Temporary negative ID to avoid conflicts
            name: globalChar.name,
            score: globalChar.default_score,
            characteristic_id: globalChar.id
          };
          
          // Add to local state immediately
          const newTotal = stock.total_score + globalChar.default_score;
          const updatedStock = {
            ...stock,
            characteristics: [...stock.characteristics, optimisticChar],
            total_score: newTotal
          };
          setStock(updatedStock);
          onUpdate(updatedStock);
        }
      } else {
        // Remove from local state immediately
        const charToRemove = stock.characteristics.find(c => c.characteristic_id === characteristicId);
        if (charToRemove) {
          const newTotal = stock.total_score - charToRemove.score;
          const updatedStock = {
            ...stock,
            characteristics: stock.characteristics.filter(c => c.characteristic_id !== characteristicId),
            total_score: newTotal
          };
          setStock(updatedStock);
          onUpdate(updatedStock);
        }
      }
      
      // Then make the actual API call
      let response;
      if (checked) {
        // Find the global characteristic to get its default score
        const globalChar = globalCharacteristics.find(gc => gc.id === characteristicId);
        const defaultScore = globalChar ? globalChar.default_score : 0;
        
        // Add the characteristic
        response = await stockPicksApi.addCharacteristic(stock.id, {
          characteristic_id: characteristicId,
          score: defaultScore
        });
      } else {
        // Remove the characteristic
        response = await stockPicksApi.removeCharacteristic(stock.id, {
          characteristic_id: characteristicId
        });
      }
      
      // Update with the actual server response
      setStock(response.data);
      onUpdate(response.data);
    } catch (err) {
      console.error('Error toggling characteristic:', err);
      setError(`Failed to ${checked ? 'add' : 'remove'} characteristic`);
      
      // Revert optimistic update on error
      setPendingCharacteristics(prev => ({...prev, [characteristicId]: !checked}));
      const response = await stockPicksApi.getStockPick(stock.id);
      setStock(response.data);
      onUpdate(response.data);
    } finally {
      setIsSubmitting(false);
      setPendingCharacteristics(prev => {
        const newState = {...prev};
        delete newState[characteristicId];
        return newState;
      });
    }
  };

  // Begin editing a score
  const handleStartEditScore = (characteristicId: number) => {
    const char = stock.characteristics.find(c => c.characteristic_id === characteristicId);
    if (char) {
      setIsEditingScore(characteristicId);
      setEditedScore(char.score);
    }
  };

  // Save an edited score
  const handleSaveScore = async (characteristicId: number) => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Optimistically update the score
      const charToUpdate = stock.characteristics.find(c => c.characteristic_id === characteristicId);
      if (charToUpdate) {
        const scoreDiff = editedScore - charToUpdate.score;
        const updatedStock = {
          ...stock,
          characteristics: stock.characteristics.map(c => 
            c.characteristic_id === characteristicId 
              ? {...c, score: editedScore} 
              : c
          ),
          total_score: stock.total_score + scoreDiff
        };
        setStock(updatedStock);
        onUpdate(updatedStock);
      }
      
      const response = await stockPicksApi.addCharacteristic(stock.id, {
        characteristic_id: characteristicId,
        score: editedScore
      });
      
      // Update with the actual server response
      setStock(response.data);
      onUpdate(response.data);
      setIsEditingScore(null);
    } catch (err) {
      console.error('Error updating score:', err);
      setError('Failed to update score');
      
      // Revert optimistic update on error
      const response = await stockPicksApi.getStockPick(stock.id);
      setStock(response.data);
      onUpdate(response.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle personal opinion score updates
  const handleStartEditPersonalScore = () => {
    setIsEditingPersonalScore(true);
  };

  const handleSavePersonalScore = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Optimistically update the score
      const scoreDiff = personalScore - (stock.personal_opinion_score || 0);
      const updatedStock = {
        ...stock,
        personal_opinion_score: personalScore,
        total_score: stock.total_score + scoreDiff
      };
      
      setStock(updatedStock);
      onUpdate(updatedStock);
      
      const response = await stockPicksApi.updatePersonalScore(stock.id, personalScore);
      
      // Update with the actual server response
      setStock(response.data);
      onUpdate(response.data);
      setIsEditingPersonalScore(false);
    } catch (err) {
      console.error('Error updating personal opinion score:', err);
      setError('Failed to update personal opinion score');
      
      // Revert optimistic update on error
      const response = await stockPicksApi.getStockPick(stock.id);
      setStock(response.data);
      onUpdate(response.data);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if a characteristic is selected (considering both actual state and pending changes)
  const isCharacteristicSelected = (characteristicId: number) => {
    // If there's a pending change, use that
    if (characteristicId in pendingCharacteristics) {
      return pendingCharacteristics[characteristicId];
    }
    // Otherwise use the actual state
    return stock.characteristics.some(c => c.characteristic_id === characteristicId);
  };

  // Get characteristic data by ID
  const getCharacteristicById = (characteristicId: number) => {
    return stock.characteristics.find(c => c.characteristic_id === characteristicId);
  };

  // Sort global characteristics based on the ORDERED_CHARACTERISTICS list
  const getSortedGlobalCharacteristics = () => {
    return [...globalCharacteristics].sort((a, b) => {
      const indexA = ORDERED_CHARACTERISTICS.indexOf(a.name);
      const indexB = ORDERED_CHARACTERISTICS.indexOf(b.name);
      
      // If both are not in the list, maintain original order
      if (indexA === -1 && indexB === -1) return 0;
      
      // If only a is not in the list, b comes first
      if (indexA === -1) return 1;
      
      // If only b is not in the list, a comes first
      if (indexB === -1) return -1;
      
      // If both are in the list, sort by their position in the list
      return indexA - indexB;
    });
  };

  // Generate and download characteristics JSON
  const handleDownloadJson = () => {
    try {
      // Create an object to map each characteristic to its checked status
      const characteristicsStatus: Record<string, boolean> = {};
      
      // Add entries for all global characteristics
      globalCharacteristics.forEach(gc => {
        const isChecked = isCharacteristicSelected(gc.id);
        characteristicsStatus[gc.name] = isChecked;
      });
      
      // Create the data object to download
      const downloadData = {
        symbol: stock.symbol,
        total_score: stock.total_score,
        personal_opinion_score: stock.personal_opinion_score,
        details: detailsText,
        demand_reason: stock.demand_reason,
        note: note, // Add this line
        characteristics: characteristicsStatus
      };
      
      // Convert to JSON
      const jsonData = JSON.stringify(downloadData, null, 2);
      
      // Create and trigger download
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${stock.symbol}_characteristics.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading JSON:', err);
      setError('Failed to download characteristics data');
    }
  };

  return (
    <Card className="rounded-sm">
      <CardContent className="p-0 pl-1 rounded-sm">
        <div
          className="flex justify-between items-center cursor-pointer p-0.1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-1">
            <Badge variant="default" className="font-semibold">{stock.symbol}</Badge>
            <Badge variant="secondary" className="whitespace-nowrap">Score: {stock.total_score}</Badge>
            
            {/* Priority Characteristics - shown with yellow text */}
            {priorityCharacteristics.length > 0 && priorityCharacteristics.map((char) => (
              <Badge 
                key={char.id} 
                variant="outline" 
                className="text-yellow-600 dark:text-yellow-400 whitespace-nowrap"
              >
                {char.name}
              </Badge>
            ))}

            {/* Note Badge - shown with blue text before demand reason */}
            {stock.note && (
              <Badge 
                variant="outline" 
                className="text-blue-600 dark:text-blue-400 whitespace-nowrap"
              >
                {stock.note}
              </Badge>
            )}

            {/* Demand Reason Badge - shown with green text right after priority characteristics */}
            {stock.demand_reason && (
              <Badge 
                variant="outline" 
                className="text-green-600 dark:text-green-400 whitespace-nowrap"
              >
                {stock.demand_reason}
              </Badge>
            )}

            {/* Regular Characteristics container with ref for measuring */}
            <div className="flex flex-wrap gap-1 max-h-7 overflow-hidden" ref={charContainerRef}>
              {visibleCharacteristics.map((char) => (
                <Badge key={char.id} variant="outline">
                  {char.name}
                </Badge>
              ))}
              
              {hasHiddenCharacteristics && (
                <Badge variant="outline" className="flex items-center">
                  <MoreHorizontal className="h-3 w-3 mr-0.5" />
                </Badge>
              )}
            </div>
            
            {stock.personal_opinion_score > 0 && (
              <Badge variant="outline" className="bg-green-100/70 dark:bg-green-900/70 whitespace-nowrap">
                Personal: +{stock.personal_opinion_score}
              </Badge>
            )}
            {stock.personal_opinion_score < 0 && (
              <Badge variant="outline" className="bg-red-100/70 dark:bg-red-900/70 whitespace-nowrap">
                Personal: {stock.personal_opinion_score}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <X className="h-3 w-3 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove {stock.symbol}</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove this stock from your ranking? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Remove
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
  
        {isExpanded && (
          <div className="mt-1 p-2">
            {error && (
              <Alert variant="destructive" className="py-1 px-2 mb-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Note field - Add this after the Demand Reason section (around line 624) */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Note:</span>
                <div className="flex-1">
                  <Input
                    value={note || ''}
                    onChange={async (e) => {
                      const newNote = e.target.value;
                      // Update local state immediately
                      setNote(newNote);
                      setStock(prevStock => ({
                        ...prevStock,
                        note: newNote
                      }));
                      
                      // Clear any existing timeout
                      if (saveTimeoutRef.current) {
                        clearTimeout(saveTimeoutRef.current);
                      }
                      
                      // Set a new timeout to save after typing stops
                      saveTimeoutRef.current = setTimeout(async () => {
                        try {
                          setIsSaving(true);
                          
                          // Update note in backend
                          const updatedStock = await stockPicksApi.updateStockPick(stock.id, {
                            note: newNote,
                            demand_reason: stock.demand_reason,
                            ranking_box: stock.ranking_box,
                            symbol: stock.symbol,
                            total_score: stock.total_score,
                            personal_opinion_score: stock.personal_opinion_score,
                            case_text: stock.case_text
                          });
                          
                          // Update with server response
                          setStock(updatedStock.data);
                          onUpdate(updatedStock.data);
                        } catch (err) {
                          console.error('Error saving note:', err);
                          setError('Failed to save note');
                        } finally {
                          setIsSaving(false);
                        }
                      }, 1000);
                    }}
                    placeholder="Enter note..."
                    className="h-8"
                  />
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <h3 className="text-sm font-medium">Characteristics</h3>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 py-0 flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownloadJson();
                  }}
                >
                  <Download className="h-3 w-3" />
                  <span className="text-xs">Download</span>
                </Button>
              </div>
              
              {/* Compact Grid of Global Characteristics - sorted by predefined order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-0.5">
                {getSortedGlobalCharacteristics().map(globalChar => {
                  const isSelected = isCharacteristicSelected(globalChar.id);
                  const selectedChar = isSelected ? getCharacteristicById(globalChar.id) : null;
                  const isColorCoded = COLOR_CODED_CHARACTERISTICS.includes(globalChar.name);

                  return (
                    <div 
                      key={globalChar.id} 
                      className={`flex items-center justify-between border p-0.5 rounded min-h-[28px] 
                        ${lastClickedCharacteristic === globalChar.id ? 'bg-primary/20' : ''} 
                        ${isColorCoded ? 
                          (isSelected 
                            ? 'bg-green-100 dark:bg-green-800/40' 
                            : 'bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-950/50'
                          ) : 'hover:bg-secondary/20'
                        }
                        transition-colors duration-150 cursor-default`}
                      onClick={() => setLastClickedCharacteristic(globalChar.id)}
                    >
              
                      <div className="flex items-center gap-1">
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={(checked) => handleToggleCharacteristic(globalChar.id, checked === true)}
                          disabled={isSubmitting && !(globalChar.id in pendingCharacteristics)}
                        />
                        <span className="text-sm">{globalChar.name}</span>
                      </div>
                      
                      {isSelected && selectedChar && (
                        <div className="flex items-center gap-0.5">
                          {isEditingScore === globalChar.id ? (
                            <div className="flex items-center gap-0.5">
                              <Input
                                type="number"
                                value={editedScore}
                                onChange={(e) => setEditedScore(Number(e.target.value))}
                                className="h-6 w-12 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-5 w-5" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSaveScore(globalChar.id);
                                }}
                                disabled={isSubmitting}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <Badge variant="secondary" className="text-xs px-1">
                                {selectedChar.score}
                              </Badge>
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-5 w-5 p-0" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditScore(globalChar.id);
                                }}
                                disabled={isSubmitting}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Demand Reason - More compact layout */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Catalyst:</span>
                <div className="flex-1">
                  <Input
                    value={stock.demand_reason || ''}
                    onChange={async (e) => {
                      const newDemandReason = e.target.value;
                      // Update local state immediately
                      setStock(prevStock => ({
                        ...prevStock,
                        demand_reason: newDemandReason
                      }));
                      
                      // Clear any existing timeout
                      if (saveTimeoutRef.current) {
                        clearTimeout(saveTimeoutRef.current);
                      }
                      
                      // Set a new timeout to save after typing stops
                      saveTimeoutRef.current = setTimeout(async () => {
                        try {
                          setIsSaving(true);
                          
                          // Update demand reason in backend
                          const updatedStock = await stockPicksApi.updateStockPick(stock.id, {
                            demand_reason: newDemandReason,
                            ranking_box: stock.ranking_box,
                            symbol: stock.symbol,
                            total_score: stock.total_score,
                            personal_opinion_score: stock.personal_opinion_score,
                            case_text: stock.case_text
                          });
                          
                          // Update with server response
                          setStock(updatedStock.data);
                          onUpdate(updatedStock.data);
                        } catch (err) {
                          console.error('Error saving demand reason:', err);
                          setError('Failed to save demand reason');
                        } finally {
                          setIsSaving(false);
                        }
                      }, 1000);
                    }}
                    placeholder="Enter demand reason..."
                    className="h-8"
                  />
                </div>
              </div>
            </div>
            
            
            {/* Personal Opinion Score - More compact layout */}
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Personal Opinion Score:</span>
                {isEditingPersonalScore ? (
                  <>
                    <Input
                      type="number"
                      value={personalScore}
                      onChange={(e) => setPersonalScore(Number(e.target.value))}
                      className="w-20 h-8"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSavePersonalScore();
                      }}
                      disabled={isSubmitting}
                      className="h-8"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge 
                      variant={personalScore === 0 ? "secondary" : personalScore > 0 ? "outline" : "destructive"}
                      className={personalScore > 0 ? "bg-green-100/70 dark:bg-green-900/70 px-2" : "px-2"}
                    >
                      {personalScore > 0 ? `+${personalScore}` : personalScore}
                    </Badge>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditPersonalScore();
                      }}
                      disabled={isSubmitting}
                      className="h-8"
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
            </div>
  
            {/* More Details */}
            <div>
              <span className="text-sm font-medium">Details</span>
              <Textarea
                placeholder="Enter additional details..."
                value={detailsText}
                onChange={handleDetailsTextChange}
                className="mt-1"
                rows={4}
                style={{ resize: 'vertical' }}
              />
              {isSaving && <p className="text-xs text-muted-foreground mt-1">Saving...</p>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RankingItem;