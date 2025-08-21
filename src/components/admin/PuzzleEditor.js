'use client';
import { useState, useEffect } from 'react';
import { PUZZLE_TEMPLATES } from '@/lib/constants';
import adminService from '@/services/admin.service';

export default function PuzzleEditor({ initialPuzzle, onClose }) {
  const [selectedDate, setSelectedDate] = useState(
    initialPuzzle?.date || new Date().toISOString().split('T')[0]
  );
  const [theme, setTheme] = useState(initialPuzzle?.theme || '');
  const [puzzles, setPuzzles] = useState(
    initialPuzzle?.puzzles || [
      { emoji: '', answer: '' },
      { emoji: '', answer: '' },
      { emoji: '', answer: '' },
      { emoji: '', answer: '' },
    ]
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (initialPuzzle) {
      setSelectedDate(initialPuzzle.date);
      setTheme(initialPuzzle.theme || '');
      setPuzzles(initialPuzzle.puzzles || [
        { emoji: '', answer: '' },
        { emoji: '', answer: '' },
        { emoji: '', answer: '' },
        { emoji: '', answer: '' },
      ]);
    }
  }, [initialPuzzle]);

  const handleTemplateSelect = (template) => {
    setTheme(template.theme);
    setPuzzles(template.puzzles.map(p => ({ ...p })));
    setMessage('Template loaded: ' + template.name);
  };

  const handlePuzzleChange = (index, field, value) => {
    const newPuzzles = [...puzzles];
    newPuzzles[index][field] = field === 'answer' ? value.toUpperCase() : value;
    setPuzzles(newPuzzles);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const result = await adminService.savePuzzle(selectedDate, {
        theme,
        puzzles: puzzles.map(p => ({
          emoji: p.emoji.trim(),
          answer: p.answer.trim().toUpperCase()
        }))
      });

      if (result.success) {
        setMessage(`✅ Puzzle saved for ${selectedDate}`);
        if (onClose) {
          setTimeout(() => onClose(), 1500);
        }
      } else {
        setMessage('❌ Failed to save puzzle');
      }
    } catch (error) {
      setMessage('❌ Error saving puzzle');
      console.error('Save puzzle error:', error);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    if (!theme.trim()) return false;
    return puzzles.every(p => 
      p.emoji.trim().length >= 2 && 
      p.answer.trim().length >= 2 && 
      p.answer.trim().length <= 10
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {initialPuzzle && (
        <div className="mb-4 p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-lg">
          <p className="text-sm text-sky-700 dark:text-sky-300">
            Editing puzzle for {initialPuzzle.date}
          </p>
        </div>
      )}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Quick Templates
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {PUZZLE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleTemplateSelect(template)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-plum focus:border-plum dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Theme
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., Things found in a kitchen"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-plum focus:border-plum dark:bg-gray-700 dark:text-white"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Puzzle Pairs
          </label>
          <div className="space-y-4">
            {puzzles.map((puzzle, index) => (
              <div key={index} className="flex gap-4 items-center">
                <span className="text-gray-500 dark:text-gray-400 w-8">
                  #{index + 1}
                </span>
                <input
                  type="text"
                  value={puzzle.emoji}
                  onChange={(e) => handlePuzzleChange(index, 'emoji', e.target.value)}
                  placeholder="Emoji pair (e.g., 🍳🔥)"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-plum focus:border-plum dark:bg-gray-700 dark:text-white"
                  required
                />
                <input
                  type="text"
                  value={puzzle.answer}
                  onChange={(e) => handlePuzzleChange(index, 'answer', e.target.value)}
                  placeholder="Answer (e.g., STOVE)"
                  maxLength={10}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-plum focus:border-plum dark:bg-gray-700 dark:text-white uppercase"
                  required
                />
              </div>
            ))}
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${
            message.startsWith('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : message.startsWith('❌')
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
          }`}>
            {message}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => {
              setTheme('');
              setPuzzles([
                { emoji: '', answer: '' },
                { emoji: '', answer: '' },
                { emoji: '', answer: '' },
                { emoji: '', answer: '' },
              ]);
              setMessage('');
            }}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={loading || !validateForm()}
            className="px-6 py-2 bg-gradient-to-r from-plum to-peach text-white rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save Puzzle'}
          </button>
        </div>
      </form>
    </div>
  );
}