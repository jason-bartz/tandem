'use client';
import { useState } from 'react';
import adminService from '@/services/admin.service';

export default function BulkImport({ onClose, onSuccess }) {
  const [jsonInput, setJsonInput] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [overwrite, setOverwrite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState(null);

  const sampleData = `[
  {
    "theme": "Things That Dissolve",
    "puzzles": [
      { "emoji": "🧂💧", "answer": "SALT" },
      { "emoji": "🍬👅", "answer": "CANDY" },
      { "emoji": "💊🥤", "answer": "TABLET" },
      { "emoji": "🧊☀️", "answer": "ICE" }
    ]
  },
  {
    "theme": "Types of Boundaries",
    "puzzles": [
      { "emoji": "🧱🏠", "answer": "FENCE" },
      { "emoji": "🌊🏖️", "answer": "SHORE" },
      { "emoji": "🗺️📍", "answer": "BORDER" },
      { "emoji": "🚫⭕", "answer": "LIMIT" }
    ]
  }
]`;

  const handleImport = async () => {
    setLoading(true);
    setMessage('');
    setResults(null);

    try {
      let puzzles;
      try {
        puzzles = JSON.parse(jsonInput.trim());
      } catch (parseError) {
        setMessage('❌ Invalid JSON format. Please check your input.');
        setLoading(false);
        return;
      }

      if (!Array.isArray(puzzles)) {
        setMessage('❌ Input must be an array of puzzle objects');
        setLoading(false);
        return;
      }

      const result = await adminService.bulkImportPuzzles(puzzles, startDate, overwrite);

      if (result.success) {
        setMessage(`✅ Successfully imported ${result.summary.successful} puzzles!`);
        setResults(result);
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 2000);
        }
      } else {
        setMessage(`❌ Import failed: ${result.error || 'Unknown error'}`);
        if (result.details) {
          console.error('Import error details:', result.details);
        }
      }
    } catch (error) {
      setMessage('❌ Error during import: ' + error.message);
      console.error('Import error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    setJsonInput(sampleData);
    setMessage('Sample data loaded. You can modify it or paste your own.');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Bulk Import Puzzles
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Puzzles will be assigned to available dates starting from this date
                </p>
              </div>

              <div className="flex items-end">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                    className="rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Overwrite existing puzzles
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                  {overwrite ? 'Will replace existing puzzles' : 'Will skip dates with existing puzzles'}
                </p>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  JSON Data
                </label>
                <button
                  type="button"
                  onClick={loadSampleData}
                  className="text-sm text-sky-600 hover:text-sky-700 transition-colors"
                >
                  Load Sample Data
                </button>
              </div>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder='Paste your JSON array of puzzles here...'
                className="w-full h-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-sky-500 focus:border-sky-500 dark:bg-gray-700 dark:text-white font-mono text-sm"
                spellCheck={false}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Expected format: Array of objects with "theme" and "puzzles" properties
              </p>
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

            {results && results.summary && (
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Import Summary</h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                  <p>Total puzzles: {results.summary.total}</p>
                  <p>Successfully imported: {results.summary.successful}</p>
                  {results.summary.failed > 0 && (
                    <p className="text-red-600 dark:text-red-400">Failed: {results.summary.failed}</p>
                  )}
                  <p>Date range: {results.summary.dateRange.start} to {results.summary.dateRange.end}</p>
                </div>
                
                {results.imported && results.imported.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-1">Imported Puzzles:</h4>
                    <div className="max-h-32 overflow-y-auto">
                      {results.imported.map((item, index) => (
                        <div key={index} className="text-xs text-gray-600 dark:text-gray-400">
                          {item.date}: {item.theme}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {results.errors && results.errors.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium text-red-600 dark:text-red-400 mb-1">Errors:</h4>
                    <div className="max-h-32 overflow-y-auto">
                      {results.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-600 dark:text-red-400">
                          {error.date}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={loading || !jsonInput.trim()}
                className="px-6 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Importing...' : 'Import Puzzles'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}