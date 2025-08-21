'use client';
import { useEffect, useState } from 'react';
import { getGameHistory } from '@/lib/storage';

export default function ArchiveModal({ isOpen, onClose, onSelectPuzzle }) {
  const [history, setHistory] = useState([]);
  const [puzzles, setPuzzles] = useState([]);

  useEffect(() => {
    if (isOpen) {
      // Get player's game history
      const gameHistory = getGameHistory();
      setHistory(gameHistory);
      
      // Load available puzzles
      loadAvailablePuzzles();
    }
  }, [isOpen]);

  const loadAvailablePuzzles = async () => {
    try {
      // Get today's date
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      // Get available puzzle dates (we have puzzles from Aug 16-30)
      const availableDates = [
        '2025-08-16', '2025-08-17', '2025-08-18', '2025-08-19', '2025-08-20',
        '2025-08-21', '2025-08-22', '2025-08-23', '2025-08-24', '2025-08-25',
        '2025-08-26', '2025-08-27', '2025-08-28', '2025-08-29', '2025-08-30'
      ];
      
      const puzzleList = [];
      for (const date of availableDates) {
        // Don't show today's puzzle or future puzzles in archive
        if (date >= todayStr) {
          continue;
        }
        
        try {
          const response = await fetch(`/api/puzzle?date=${date}`);
          if (response.ok) {
            const data = await response.json();
            if (data.puzzle) {
              const isCompleted = history[date]?.completed || false;
              puzzleList.push({
                date,
                // Only show theme if puzzle was completed
                theme: isCompleted ? data.puzzle.theme : null,
                completed: isCompleted,
                time: history[date]?.time,
                mistakes: history[date]?.mistakes
              });
            }
          }
        } catch (err) {
          // Could not load puzzle for this date
        }
      }
      
      // Sort by date descending (most recent first)
      puzzleList.sort((a, b) => b.date.localeCompare(a.date));
      setPuzzles(puzzleList);
    } catch (error) {
      // Error loading puzzles
    }
  };

  if (!isOpen) return null;

  const formatDate = (dateStr) => {
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            Puzzle Archive
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          {puzzles.map((puzzle) => (
            <button
              key={puzzle.date}
              onClick={() => {
                onSelectPuzzle(puzzle.date);
                onClose();
              }}
              className="w-full p-3 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-left"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {formatDate(puzzle.date)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {puzzle.completed ? puzzle.theme : 'Play to reveal theme'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {puzzle.completed ? (
                    <div className="text-green-500 text-xl">
                      ✓
                    </div>
                  ) : (
                    <div className="text-gray-400 text-xl">
                      ○
                    </div>
                  )}
                  {puzzle.time && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {puzzle.time}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
        
        <button
          onClick={onClose}
          className="mt-4 w-full py-3 bg-gradient-to-r from-sky-500 to-teal-400 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
        >
          Close
        </button>
      </div>
    </div>
  );
}