import React, { useState } from 'react';
import { ConfigurationBox } from './components/ConfigurationBox';
import { MainRankingList } from './components/MainRankingBox';
import { RankingBoxComponent } from './components/RankingBoxComponent';
import { RankingBox, UserPageState, StockPick, StockCharacteristic } from './types/index';
import { useDragDrop } from './hooks/useDragDrop';
import { Plus } from 'lucide-react';

const sampleCharacteristics: StockCharacteristic[] = [
  {
    id: 1,
    name: "Growth",
    description: "Strong revenue and earnings growth trajectory",
    score: 85
  },
  {
    id: 2,
    name: "Value",
    description: "Attractive valuation metrics relative to peers",
    score: 92
  },
  {
    id: 3,
    name: "Quality",
    description: "High return on equity and stable margins",
    score: 78
  },
  {
    id: 4,
    name: "Momentum",
    description: "Strong price performance and positive earnings revisions",
    score: 88
  }
];

const sampleStocks: StockPick[] = [
  {
    id: 1,
    symbol: "AAPL",
    totalScore: 89,
    characteristics: [
      { ...sampleCharacteristics[0], score: 90 },
      { ...sampleCharacteristics[1], score: 75 },
      { ...sampleCharacteristics[2], score: 95 }
    ]
  },
  {
    id: 2,
    symbol: "MSFT",
    totalScore: 92,
    characteristics: [
      { ...sampleCharacteristics[0], score: 88 },
      { ...sampleCharacteristics[1], score: 82 },
      { ...sampleCharacteristics[3], score: 94 }
    ]
  },
  {
    id: 3,
    symbol: "GOOGL",
    totalScore: 87,
    characteristics: [
      { ...sampleCharacteristics[0], score: 85 },
      { ...sampleCharacteristics[2], score: 89 },
      { ...sampleCharacteristics[3], score: 92 }
    ]
  }
];

const sampleRankingBoxes: RankingBox[] = [
  {
    id: 1,
    title: "Tech Leaders",
    stocks: sampleStocks
  },
  {
    id: 2,
    title: "Growth Picks",
    stocks: sampleStocks.filter(s =>
      s.characteristics.some(c => c.name === "Growth" && c.score > 85)
    )
  },
  {
    id: 3,
    title: "Value Opportunities",
    stocks: sampleStocks.filter(s =>
      s.characteristics.some(c => c.name === "Value" && c.score > 80)
    )
  }
];

export const PersonalRankingPage: React.FC = () => {
  const [pageState, setPageState] = useState<UserPageState>({
    columnCount: 3,
    rankingBoxesOrder: [],
  });
  
  const [showNewBoxDialog, setShowNewBoxDialog] = useState(false);
  const [newBoxTitle, setNewBoxTitle] = useState('');

  const {
    rankingBoxes,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleRemoveBox,
    addNewBox
  } = useDragDrop(sampleRankingBoxes);

  const handleColumnCountChange = (count: number) => {
    setPageState((prev) => ({ ...prev, columnCount: count }));
  };

  const handleAddNewBox = () => {
    if (newBoxTitle.trim()) {
      const newBox: RankingBox = {
        id: Date.now(),
        title: newBoxTitle.trim(),
        stocks: []
      };
      addNewBox(newBox);
      setNewBoxTitle('');
      setShowNewBoxDialog(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mt-8">
        <MainRankingList allStocks={sampleStocks} />
      </div>
      <div className="flex items-center justify-between mt-8">
        <ConfigurationBox
          columnCount={pageState.columnCount}
          onColumnCountChange={handleColumnCountChange}
        />
        <button
          onClick={() => setShowNewBoxDialog(true)}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Add Ranking Box
        </button>
      </div>
      
      {showNewBoxDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-semibold mb-4">Add New Ranking Box</h3>
            <input
              type="text"
              value={newBoxTitle}
              onChange={(e) => setNewBoxTitle(e.target.value)}
              placeholder="Enter box title"
              className="w-full px-3 py-2 border rounded-lg mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNewBoxDialog(false);
                  setNewBoxTitle('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewBox}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                disabled={!newBoxTitle.trim()}
              >
                Add Box
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className="mt-8 grid gap-6"
        style={{
          gridTemplateColumns: `repeat(${pageState.columnCount}, minmax(0, 1fr))`,
        }}
      >
        {rankingBoxes.map((box) => (
          <div
            key={box.id}
            draggable
            onDragStart={(e) => handleDragStart(e, box)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, box)}
            className="transition-all duration-200 cursor-move"
          >
            <RankingBoxComponent
              box={box}
              onRemoveBox={handleRemoveBox}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalRankingPage;