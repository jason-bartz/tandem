'use client';
import { useState, useEffect } from 'react';
import adminService from '@/services/admin.service';
import { formatDate } from '@/lib/utils';

export default function PuzzleCalendar({ onEditPuzzle }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [puzzles, setPuzzles] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);

  useEffect(() => {
    loadMonthPuzzles();
  }, [currentMonth]);

  const loadMonthPuzzles = async () => {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
      
      const result = await adminService.getPuzzlesRange(startDate, endDate);
      if (result.success) {
        setPuzzles(result.puzzles || {});
      }
    } catch (error) {
      console.error('Failed to load puzzles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return days;
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const handleDeletePuzzle = async (date) => {
    if (!confirm('Are you sure you want to delete this puzzle?')) return;
    
    try {
      const result = await adminService.deletePuzzle(date);
      if (result.success) {
        loadMonthPuzzles();
      }
    } catch (error) {
      console.error('Failed to delete puzzle:', error);
    }
  };

  const getPuzzleForDay = (day) => {
    if (!day) return null;
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
      .toISOString().split('T')[0];
    return puzzles[date];
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    return (
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-full">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ←
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading puzzles...</div>
      ) : (
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {getDaysInMonth().map((day, index) => {
              const puzzle = getPuzzleForDay(day);
              const dateStr = day ? new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day)
                .toISOString().split('T')[0] : '';
              
              return (
                <div
                  key={index}
                  className={`
                    min-h-[80px] p-2 rounded-lg border
                    ${day ? 'cursor-pointer hover:border-plum' : ''}
                    ${isToday(day) ? 'border-plum bg-plum/5' : 'border-gray-200 dark:border-gray-700'}
                    ${puzzle ? 'bg-green-50 dark:bg-green-900/20' : ''}
                  `}
                  onClick={() => day && setSelectedPuzzle(puzzle || { date: dateStr })}
                >
                  {day && (
                    <>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {day}
                      </div>
                      {puzzle && (
                        <div className="mt-1">
                          <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {puzzle.theme}
                          </div>
                          <div className="text-lg mt-1">
                            {puzzle.puzzles[0].emoji}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedPuzzle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {selectedPuzzle.theme ? 'Puzzle Details' : 'No Puzzle'} - {formatDate(selectedPuzzle.date, 'short')}
            </h3>
            
            {selectedPuzzle.theme ? (
              <>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Theme:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedPuzzle.theme}</p>
                </div>
                
                <div className="space-y-2 mb-6">
                  {selectedPuzzle.puzzles.map((p, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <span className="text-2xl">{p.emoji}</span>
                      <span className="text-gray-700 dark:text-gray-300">{p.answer}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      onEditPuzzle(selectedPuzzle);
                      setSelectedPuzzle(null);
                    }}
                    className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeletePuzzle(selectedPuzzle.date)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedPuzzle(null)}
                    className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  No puzzle scheduled for this date.
                </p>
                <button
                  onClick={() => setSelectedPuzzle(null)}
                  className="w-full px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}