'use client';
import { useState, useEffect } from 'react';
import PuzzleEditor from '@/components/admin/PuzzleEditor';
import PuzzleCalendar from '@/components/admin/PuzzleCalendar';
import StatsOverview from '@/components/admin/StatsOverview';
import ThemeTracker from '@/components/admin/ThemeTracker';
import BulkImport from '@/components/admin/BulkImport';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [editingPuzzle, setEditingPuzzle] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('AdminDashboard mounted');
  }, []);

  console.log('AdminDashboard rendering, showBulkImport:', showBulkImport, 'mounted:', mounted);

  return (
    <div className="px-2 py-3 sm:px-4 sm:py-5 md:p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            Puzzle Management
          </h2>
          {mounted && (
            <button
              onClick={() => {
                console.log('Bulk Import button clicked!');
                setShowBulkImport(true);
              }}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-sky-500 hover:bg-sky-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              style={{ backgroundColor: '#0ea5e9' }}
            >
              📤 Bulk Import
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Create and manage daily puzzles for Tandem
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`
              py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap
              ${
                activeTab === 'calendar'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`
              py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap
              ${
                activeTab === 'editor'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Editor
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`
              py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap
              ${
                activeTab === 'stats'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Statistics
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`
              py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap
              ${
                activeTab === 'themes'
                  ? 'border-sky-500 text-sky-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
          >
            Themes
          </button>
        </nav>
      </div>

      <div className="mt-4 sm:mt-6 min-h-[400px] sm:min-h-[500px]">
        {activeTab === 'calendar' && (
          <PuzzleCalendar
            key={refreshKey}
            onEditPuzzle={(puzzle) => {
              setEditingPuzzle(puzzle);
              setActiveTab('editor');
            }}
          />
        )}
        {activeTab === 'editor' && (
          <PuzzleEditor
            initialPuzzle={editingPuzzle}
            onClose={() => {
              setEditingPuzzle(null);
              setActiveTab('calendar');
            }}
          />
        )}
        {activeTab === 'stats' && <StatsOverview />}
        {activeTab === 'themes' && (
          <ThemeTracker
            onEditPuzzle={(date) => {
              setEditingPuzzle({ date, theme: '', puzzles: [] });
              setActiveTab('editor');
            }}
          />
        )}
      </div>

      {showBulkImport && (
        <BulkImport
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            setRefreshKey((prev) => prev + 1);
            setActiveTab('calendar');
          }}
        />
      )}
    </div>
  );
}
