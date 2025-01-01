import React, { useState } from 'react';
import { ConfigurationBox } from './components/ConfigurationBox';
import { MainRankingList } from './components/MainRankingBox';
import { RankingBoxComponent } from './components/RankingBoxComponent';
import { RankingBox, UserPageState, StockPick, StockCharacteristic } from './types/index';

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
  const [rankingBoxes, setRankingBoxes] = useState(sampleRankingBoxes);

  const handleColumnCountChange = (count: number) => {
    setPageState((prev) => ({ ...prev, columnCount: count }));
  };

  const handleRemoveBox = (id: number) => {
    setRankingBoxes(prev => prev.filter(box => box.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="mt-8">
        <MainRankingList allStocks={sampleStocks} />
      </div>

      <ConfigurationBox
        columnCount={pageState.columnCount}
        onColumnCountChange={handleColumnCountChange}
      />

      <div
        className={`mt-8 grid gap-6`}
        style={{
          gridTemplateColumns: `repeat(${pageState.columnCount}, minmax(0, 1fr))`,
        }}
      >
        {rankingBoxes.map((box) => (
          <RankingBoxComponent
            key={box.id}
            box={box}
            onRemoveBox={(id) =>
              setRankingBoxes((prev) =>
                prev.filter((box) => box.id !== id)
              )
            }
          />
        ))}
      </div>
    </div>
  );
};