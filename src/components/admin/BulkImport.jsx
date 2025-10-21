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
        }
      }
    } catch (error) {
      setMessage('❌ Error during import: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    setJsonInput(sampleData);
    setMessage('Sample data loaded. You can modify it or paste your own.');
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-3 sm:p-4 z-50">
      <div
        className="bg-bg-surface rounded-lg border-[3px] border-border-main max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: 'var(--shadow-card)' }}
      >
        <div className="p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Bulk Import Puzzles</h2>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary flex-shrink-0 transition-colors"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-text-primary mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  style={{ boxShadow: 'var(--shadow-small)' }}
                />
                <p className="text-xs text-text-secondary font-medium mt-1">
                  Puzzles will be assigned to available dates starting from this date
                </p>
              </div>

              <div>
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                    className="mt-0.5 rounded border-border-main text-accent-blue focus:ring-accent-blue"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-text-primary block">
                      Overwrite existing puzzles
                    </span>
                    <p className="text-xs text-text-secondary font-medium mt-0.5">
                      {overwrite
                        ? 'Will replace existing puzzles'
                        : 'Will skip dates with existing puzzles'}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs sm:text-sm font-bold text-text-primary">
                  JSON Data
                </label>
                <button
                  type="button"
                  onClick={loadSampleData}
                  className="text-xs sm:text-sm text-accent-blue hover:text-accent-green font-bold transition-colors"
                >
                  Load Sample
                </button>
              </div>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste your JSON array of puzzles here..."
                className="w-full h-48 sm:h-64 px-3 sm:px-4 py-2 text-xs sm:text-sm border-[3px] border-border-main rounded-lg bg-bg-card text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-accent-blue"
                style={{ boxShadow: 'var(--shadow-small)' }}
                spellCheck={false}
              />
              <p className="text-xs text-text-secondary font-medium mt-1">
                Expected format: Array of objects with "theme" and "puzzles" properties
              </p>
            </div>

            {message && (
              <div
                className={`p-3 sm:p-4 rounded-lg border-[3px] text-sm sm:text-base font-bold ${
                  message.startsWith('✅')
                    ? 'bg-accent-green/20 border-accent-green text-text-primary'
                    : message.startsWith('❌')
                      ? 'bg-accent-red/20 border-accent-red text-text-primary'
                      : 'bg-accent-blue/20 border-accent-blue text-text-primary'
                }`}
                style={{ boxShadow: 'var(--shadow-small)' }}
              >
                {message}
              </div>
            )}

            {results && results.summary && (
              <div
                className="bg-bg-card border-[3px] border-border-main p-3 sm:p-4 rounded-lg"
                style={{ boxShadow: 'var(--shadow-small)' }}
              >
                <h3 className="text-sm sm:text-base font-bold text-text-primary mb-2">
                  Import Summary
                </h3>
                <div className="space-y-1 text-xs sm:text-sm text-text-primary font-medium">
                  <p>Total puzzles: {results.summary.total}</p>
                  <p>Successfully imported: {results.summary.successful}</p>
                  {results.summary.failed > 0 && (
                    <p className="text-accent-red font-bold">Failed: {results.summary.failed}</p>
                  )}
                  <p>
                    Date range: {results.summary.dateRange.start} to {results.summary.dateRange.end}
                  </p>
                </div>

                {results.imported && results.imported.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs sm:text-sm font-bold text-text-primary mb-1">
                      Imported Puzzles:
                    </h4>
                    <div className="max-h-32 overflow-y-auto">
                      {results.imported.map((item, index) => (
                        <div key={index} className="text-xs text-text-secondary font-medium">
                          {item.date}: {item.theme}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {results.errors && results.errors.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs sm:text-sm font-bold text-accent-red mb-1">Errors:</h4>
                    <div className="max-h-32 overflow-y-auto">
                      {results.errors.map((error, index) => (
                        <div key={index} className="text-xs text-accent-red font-medium">
                          {error.date}: {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base border-[3px] border-border-main bg-bg-card text-text-primary rounded-lg font-bold hover:bg-text-muted/20 transition-colors"
                style={{ boxShadow: 'var(--shadow-button)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={loading || !jsonInput.trim()}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 text-sm sm:text-base bg-gradient-to-r from-accent-blue to-accent-green border-[3px] border-border-main text-white rounded-lg font-bold hover:translate-y-[-2px] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ boxShadow: 'var(--shadow-button)' }}
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
