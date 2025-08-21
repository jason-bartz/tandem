'use client';
import { useState } from 'react';
import PuzzleEditor from '@/components/admin/PuzzleEditor';
import PuzzleCalendar from '@/components/admin/PuzzleCalendar';
import StatsOverview from '@/components/admin/StatsOverview';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [editingPuzzle, setEditingPuzzle] = useState(null);

  return (
    <div className="px-4 py-5 sm:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Puzzle Management
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create and manage daily puzzles for Tandem
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'calendar'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Calendar View
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'editor'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Puzzle Editor
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`
              py-2 px-1 border-b-2 font-medium text-sm
              ${activeTab === 'stats'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Statistics
          </button>
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'calendar' && (
          <PuzzleCalendar 
            onEditPuzzle={(puzzle) => {
              setEditingPuzzle(puzzle);
              setActiveTab('editor');
            }}
          />
        )}
        {activeTab === 'editor' && (
          <PuzzleEditor 
            initialPuzzle={editingPuzzle}
            onClose={() => setEditingPuzzle(null)}
          />
        )}
        {activeTab === 'stats' && <StatsOverview />}
      </div>
    </div>
  );
}