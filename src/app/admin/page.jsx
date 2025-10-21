'use client';
import { useState, useEffect } from 'react';
import PuzzleEditor from '@/components/admin/PuzzleEditor';
import PuzzleCalendar from '@/components/admin/PuzzleCalendar';
import ThemeTracker from '@/components/admin/ThemeTracker';
import BulkImport from '@/components/admin/BulkImport';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [editingPuzzle, setEditingPuzzle] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="px-2 py-3 sm:px-4 sm:py-5 md:p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Puzzle Management</h2>
          {mounted && (
            <button
              onClick={() => setShowBulkImport(true)}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-accent-blue to-accent-green text-white border-[3px] border-border-main font-bold rounded-lg hover:translate-y-[-2px] transition-transform"
              style={{ boxShadow: 'var(--shadow-button)' }}
            >
              📤 Bulk Import
            </button>
          )}
        </div>
        <p className="text-sm text-text-secondary font-medium">
          Create and manage daily puzzles for Tandem
        </p>
      </div>

      <div className="border-b-[3px] border-border-main overflow-x-auto mb-6">
        <nav className="-mb-[3px] flex space-x-4 sm:space-x-8 min-w-max">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`
              py-3 px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all
              ${
                activeTab === 'calendar'
                  ? 'border-accent-yellow text-text-primary bg-accent-yellow/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            📅 Calendar
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`
              py-3 px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all
              ${
                activeTab === 'editor'
                  ? 'border-accent-green text-text-primary bg-accent-green/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            ✏️ Editor
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`
              py-3 px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all
              ${
                activeTab === 'themes'
                  ? 'border-accent-pink text-text-primary bg-accent-pink/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            🎨 Themes
          </button>
        </nav>
      </div>

      <div className="mt-4 sm:mt-6 min-h-[400px] sm:min-h-[500px]">
        {activeTab === 'calendar' && (
          <PuzzleCalendar
            key={refreshKey}
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
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
        {activeTab === 'themes' && (
          <ThemeTracker
            onEditPuzzle={(puzzle) => {
              setEditingPuzzle(puzzle);
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
