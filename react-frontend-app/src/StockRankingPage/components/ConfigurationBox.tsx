// src/components/ConfigurationBox.tsx
import React, { useState } from 'react';
import { rankingBoxesApi } from '../services/rankingBoxes';
import { Alert } from '@/components/ui/alert';
import { Plus } from 'lucide-react';

interface Props {
  columnCount: number;
  onColumnCountChange: (count: number) => void;
  onRankingBoxCreated?: () => void;
}

export const ConfigurationBox: React.FC<Props> = ({ 
  columnCount, 
  onColumnCountChange,
  onRankingBoxCreated 
}) => {
  const [newBoxTitle, setNewBoxTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateBox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoxTitle.trim()) return;

    try {
      setIsCreating(true);
      setError(null);
      await rankingBoxesApi.createRankingBox(newBoxTitle.trim());
      setNewBoxTitle('');
      onRankingBoxCreated?.();
    } catch (err) {
      setError('Failed to create ranking box');
      console.error('Error creating ranking box:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md space-y-6">
      <h2 className="text-lg font-semibold">Layout Configuration</h2>
      
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((count) => (
          <button
            key={count}
            onClick={() => onColumnCountChange(count)}
            className={`px-4 py-2 rounded ${
              columnCount === count
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {count} {count === 1 ? 'Column' : 'Columns'}
          </button>
        ))}
      </div>

      <form onSubmit={handleCreateBox} className="flex gap-2">
        <input
          type="text"
          value={newBoxTitle}
          onChange={(e) => setNewBoxTitle(e.target.value)}
          placeholder="Enter ranking box title"
          className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isCreating}
        />
        <button
          type="submit"
          disabled={isCreating || !newBoxTitle.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={20} />
          Add Box
        </button>
      </form>

      {error && (
        <Alert variant="destructive" className="mt-2">
          {error}
        </Alert>
      )}
    </div>
  );
};