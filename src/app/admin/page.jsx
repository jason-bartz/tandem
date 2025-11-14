'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import PuzzleEditor from '@/components/admin/PuzzleEditor';
import PuzzleCalendar from '@/components/admin/PuzzleCalendar';
import ThemeTracker from '@/components/admin/ThemeTracker';
import BulkImport from '@/components/admin/BulkImport';
import CrypticPuzzleCalendar from '@/components/admin/cryptic/CrypticPuzzleCalendar';
import CrypticPuzzleEditor from '@/components/admin/cryptic/CrypticPuzzleEditor';
import FeedbackDashboard from '@/components/admin/feedback/FeedbackDashboard';
import authService from '@/services/auth.service';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('tandem');
  const [tandemSubTab, setTandemSubTab] = useState('calendar'); // 'calendar', 'editor', 'themes'
  const [editingPuzzle, setEditingPuzzle] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [feedbackCounts, setFeedbackCounts] = useState(null);
  const { isDark } = useTheme();

  // Cryptic puzzle state
  const [crypticPuzzles, setCrypticPuzzles] = useState([]);
  const [crypticLoading, setCrypticLoading] = useState(false);
  const [selectedCrypticDate, setSelectedCrypticDate] = useState(null);
  const [editingCrypticPuzzle, setEditingCrypticPuzzle] = useState(null);
  const [showCrypticEditor, setShowCrypticEditor] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load cryptic puzzles when cryptic tab is active
  useEffect(() => {
    if (activeTab === 'cryptic' && mounted) {
      loadCrypticPuzzles();
    }
  }, [activeTab, mounted, refreshKey]);

  const loadCrypticPuzzles = async () => {
    setCrypticLoading(true);
    try {
      const response = await fetch('/api/admin/cryptic/puzzles?limit=365', {
        headers: authService.getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setCrypticPuzzles(data.puzzles || []);
      }
    } catch (error) {
      console.error('Error loading cryptic puzzles:', error);
    } finally {
      setCrypticLoading(false);
    }
  };

  const handleSaveCrypticPuzzle = async (puzzleData) => {
    setCrypticLoading(true);
    try {
      const isEdit = !!editingCrypticPuzzle;
      const url = '/api/admin/cryptic/puzzles';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...puzzleData, id: editingCrypticPuzzle.id } : puzzleData;

      const response = await fetch(url, {
        method,
        headers: authService.getAuthHeaders(true), // Include CSRF for state-changing operations
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await loadCrypticPuzzles();
        setShowCrypticEditor(false);
        setEditingCrypticPuzzle(null);
        setSelectedCrypticDate(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save puzzle'}`);
      }
    } catch (error) {
      console.error('Error saving cryptic puzzle:', error);
      alert('Failed to save puzzle. Please try again.');
    } finally {
      setCrypticLoading(false);
    }
  };

  const handleDeleteCrypticPuzzle = async (puzzleId) => {
    if (!confirm('Are you sure you want to delete this puzzle?')) return;

    try {
      const response = await fetch(`/api/admin/cryptic/puzzles?id=${puzzleId}`, {
        method: 'DELETE',
        headers: authService.getAuthHeaders(true), // Include CSRF
      });

      if (response.ok) {
        await loadCrypticPuzzles();
        setShowCrypticEditor(false);
        setEditingCrypticPuzzle(null);
      }
    } catch (error) {
      console.error('Error deleting cryptic puzzle:', error);
      alert('Failed to delete puzzle. Please try again.');
    }
  };

  const handleSelectCrypticDate = (date) => {
    setSelectedCrypticDate(date);
    const existingPuzzle = crypticPuzzles.find((p) => p.date === date);
    if (existingPuzzle) {
      setEditingCrypticPuzzle(existingPuzzle);
    } else {
      setEditingCrypticPuzzle(null);
    }
    setShowCrypticEditor(true);
  };

  return (
    <div className="px-2 py-3 sm:px-4 sm:py-5 md:p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">Puzzle Management</h2>
          {mounted && (
            <button
              onClick={() => setShowBulkImport(true)}
              className="hidden sm:inline-block px-4 sm:px-6 py-2 sm:py-3 bg-accent-blue text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
            >
              📤 Bulk Import
            </button>
          )}
        </div>
        <p className="text-sm text-text-secondary font-medium">
          Create and manage daily puzzles for Tandem
        </p>
      </div>

      <div className="border-b-[3px] border-black dark:border-white mb-6">
        <nav className="-mb-[3px] flex space-x-2 sm:space-x-4 md:space-x-8">
          <button
            onClick={() => setActiveTab('tandem')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2
              ${
                activeTab === 'tandem'
                  ? 'border-accent-yellow text-text-primary bg-accent-yellow/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image
              src={isDark ? '/icons/ui/tandem-dark.png' : '/icons/ui/tandem.png'}
              alt=""
              width={20}
              height={20}
            />
            Tandem
          </button>
          <button
            onClick={() => setActiveTab('cryptic')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2
              ${
                activeTab === 'cryptic'
                  ? 'border-purple-500 text-text-primary bg-purple-500/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image
              src={isDark ? '/icons/ui/cryptic-dark.png' : '/icons/ui/cryptic.png'}
              alt=""
              width={20}
              height={20}
            />
            Cryptic
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2 relative
              ${
                activeTab === 'feedback'
                  ? 'border-accent-blue text-text-primary bg-accent-blue/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image
              src={isDark ? '/icons/ui/feedback-dark.png' : '/icons/ui/feedback.png'}
              alt=""
              width={20}
              height={20}
            />
            Feedback
            {feedbackCounts?.new > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-accent-red text-white text-xs font-bold rounded-full border-[2px] border-white">
                {feedbackCounts.new}
              </span>
            )}
          </button>
        </nav>
      </div>

      <div className="mt-4 sm:mt-6 min-h-[400px] sm:min-h-[500px]">
        {activeTab === 'tandem' && (
          <div className="space-y-4">
            {/* Sub-navigation buttons within Tandem calendar header */}
            <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
              <div className="px-3 sm:px-6 py-3 sm:py-4 border-b-[3px] border-black dark:border-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h3 className="text-base sm:text-lg font-bold text-text-primary">
                    {tandemSubTab === 'calendar' ? 'Daily Tandem Calendar' : tandemSubTab === 'editor' ? 'Puzzle Editor' : 'Theme Tracker'}
                  </h3>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button
                      onClick={() => setTandemSubTab('calendar')}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border-[2px] rounded-lg font-bold transition-all flex items-center gap-1 ${
                        tandemSubTab === 'calendar'
                          ? 'bg-accent-yellow border-black dark:border-white text-text-primary shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                          : 'bg-bg-card border-black dark:border-white text-text-secondary hover:bg-accent-yellow/20'
                      }`}
                    >
                      <Image
                        src={isDark ? '/icons/ui/archive-dark.png' : '/icons/ui/archive.png'}
                        alt=""
                        width={16}
                        height={16}
                      />
                      <span className="hidden sm:inline">Calendar</span>
                    </button>
                    <button
                      onClick={() => setTandemSubTab('editor')}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border-[2px] rounded-lg font-bold transition-all flex items-center gap-1 ${
                        tandemSubTab === 'editor'
                          ? 'bg-accent-green border-black dark:border-white text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                          : 'bg-bg-card border-black dark:border-white text-text-secondary hover:bg-accent-green/20'
                      }`}
                    >
                      <Image
                        src={isDark ? '/icons/ui/editor-dark.png' : '/icons/ui/editor.png'}
                        alt=""
                        width={16}
                        height={16}
                      />
                      <span className="hidden sm:inline">Editor</span>
                    </button>
                    <button
                      onClick={() => setTandemSubTab('themes')}
                      className={`px-2 sm:px-3 py-1 text-xs sm:text-sm border-[2px] rounded-lg font-bold transition-all flex items-center gap-1 ${
                        tandemSubTab === 'themes'
                          ? 'bg-accent-pink border-black dark:border-white text-white shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                          : 'bg-bg-card border-black dark:border-white text-text-secondary hover:bg-accent-pink/20'
                      }`}
                    >
                      <Image
                        src={isDark ? '/icons/ui/theme-dark.png' : '/icons/ui/theme.png'}
                        alt=""
                        width={16}
                        height={16}
                      />
                      <span className="hidden sm:inline">Themes</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 sm:p-6">
                {tandemSubTab === 'calendar' && (
                  <PuzzleCalendar
                    key={refreshKey}
                    currentMonth={currentMonth}
                    onMonthChange={setCurrentMonth}
                    onEditPuzzle={(puzzle) => {
                      setEditingPuzzle(puzzle);
                      setTandemSubTab('editor');
                    }}
                  />
                )}
                {tandemSubTab === 'editor' && (
                  <PuzzleEditor
                    initialPuzzle={editingPuzzle}
                    onClose={() => {
                      setEditingPuzzle(null);
                      setTandemSubTab('calendar');
                    }}
                  />
                )}
                {tandemSubTab === 'themes' && (
                  <ThemeTracker
                    onEditPuzzle={(puzzle) => {
                      setEditingPuzzle(puzzle);
                      setTandemSubTab('editor');
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'cryptic' && (
          <div className="space-y-6">
            {!showCrypticEditor ? (
              <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-text-primary">Daily Cryptic Calendar</h3>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      handleSelectCrypticDate(today);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
                  >
                    New
                  </button>
                </div>
                {crypticLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  </div>
                ) : (
                  <CrypticPuzzleCalendar
                    puzzles={crypticPuzzles}
                    selectedDate={selectedCrypticDate}
                    onSelectDate={handleSelectCrypticDate}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {editingCrypticPuzzle && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeleteCrypticPuzzle(editingCrypticPuzzle.id)}
                      className="px-4 py-2 bg-accent-red text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
                    >
                      Delete Puzzle
                    </button>
                  </div>
                )}
                <CrypticPuzzleEditor
                  puzzle={editingCrypticPuzzle}
                  date={selectedCrypticDate}
                  onSave={handleSaveCrypticPuzzle}
                  onCancel={() => {
                    setShowCrypticEditor(false);
                    setEditingCrypticPuzzle(null);
                    setSelectedCrypticDate(null);
                  }}
                  loading={crypticLoading}
                />
              </div>
            )}
          </div>
        )}
        {activeTab === 'feedback' && (
          <FeedbackDashboard onCountsChange={setFeedbackCounts} />
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
