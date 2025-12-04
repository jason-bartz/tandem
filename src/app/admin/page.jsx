'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import PuzzleEditor from '@/components/admin/PuzzleEditor';
import PuzzleCalendar from '@/components/admin/PuzzleCalendar';
import ThemeTracker from '@/components/admin/ThemeTracker';
import BulkImport from '@/components/admin/BulkImport';
import MiniPuzzleCalendar from '@/components/admin/mini/MiniPuzzleCalendar';
import MiniPuzzleEditor from '@/components/admin/mini/MiniPuzzleEditor';
import ReelConnectionsPuzzleCalendar from '@/components/admin/reel-connections/ReelConnectionsPuzzleCalendar';
import ReelConnectionsPuzzleEditor from '@/components/admin/reel-connections/ReelConnectionsPuzzleEditor';
import FeedbackDashboard from '@/components/admin/feedback/FeedbackDashboard';
import authService from '@/services/auth.service';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('tandem');
  const [tandemSubTab, setTandemSubTab] = useState('calendar'); // 'calendar', 'editor', 'themes'
  const [editingPuzzle, setEditingPuzzle] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [feedbackCounts, setFeedbackCounts] = useState(null);

  // Mini puzzle state
  const [miniPuzzles, setMiniPuzzles] = useState([]);
  const [miniLoading, setMiniLoading] = useState(false);
  const [selectedMiniDate, setSelectedMiniDate] = useState(null);
  const [editingMiniPuzzle, setEditingMiniPuzzle] = useState(null);
  const [showMiniEditor, setShowMiniEditor] = useState(false);

  // Reel Connections puzzle state
  const [reelPuzzles, setReelPuzzles] = useState([]);
  const [reelLoading, setReelLoading] = useState(false);
  const [selectedReelDate, setSelectedReelDate] = useState(null);
  const [editingReelPuzzle, setEditingReelPuzzle] = useState(null);
  const [showReelEditor, setShowReelEditor] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load mini puzzles when mini tab is active
  useEffect(() => {
    if (activeTab === 'mini' && mounted) {
      loadMiniPuzzles();
    }
  }, [activeTab, mounted, refreshKey]);

  // Mini puzzle functions
  const loadMiniPuzzles = async () => {
    setMiniLoading(true);
    try {
      const response = await fetch('/api/admin/mini/puzzles?limit=365', {
        headers: await authService.getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setMiniPuzzles(data.puzzles || []);
      }
    } catch (error) {
      console.error('Error loading mini puzzles:', error);
    } finally {
      setMiniLoading(false);
    }
  };

  const handleSaveMiniPuzzle = async (puzzleData) => {
    setMiniLoading(true);
    try {
      const isEdit = !!editingMiniPuzzle;
      const url = '/api/admin/mini/puzzles';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...puzzleData, id: editingMiniPuzzle.id } : puzzleData;

      const response = await fetch(url, {
        method,
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await loadMiniPuzzles();
        setShowMiniEditor(false);
        setEditingMiniPuzzle(null);
        setSelectedMiniDate(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save puzzle'}`);
      }
    } catch (error) {
      console.error('Error saving mini puzzle:', error);
      alert('Failed to save puzzle. Please try again.');
    } finally {
      setMiniLoading(false);
    }
  };

  const handleDeleteMiniPuzzle = async (puzzleId) => {
    if (!confirm('Are you sure you want to delete this puzzle?')) return;

    try {
      const response = await fetch(`/api/admin/mini/puzzles?id=${puzzleId}`, {
        method: 'DELETE',
        headers: await authService.getAuthHeaders(true),
      });

      if (response.ok) {
        await loadMiniPuzzles();
        setShowMiniEditor(false);
        setEditingMiniPuzzle(null);
      }
    } catch (error) {
      console.error('Error deleting mini puzzle:', error);
      alert('Failed to delete puzzle. Please try again.');
    }
  };

  const handleSelectMiniDate = (date) => {
    setSelectedMiniDate(date);
    const existingPuzzle = miniPuzzles.find((p) => p.date === date);
    if (existingPuzzle) {
      setEditingMiniPuzzle(existingPuzzle);
    } else {
      setEditingMiniPuzzle(null);
    }
    setShowMiniEditor(true);
  };

  // Reel Connections puzzle functions
  useEffect(() => {
    if (activeTab === 'reel' && mounted) {
      loadReelPuzzles();
    }
  }, [activeTab, mounted, refreshKey]);

  const loadReelPuzzles = async () => {
    setReelLoading(true);
    try {
      const response = await fetch('/api/admin/reel-connections/puzzles?limit=365', {
        headers: await authService.getAuthHeaders(),
      });
      const data = await response.json();
      if (response.ok) {
        setReelPuzzles(data.puzzles || []);
      }
    } catch (error) {
      console.error('Error loading Reel Connections puzzles:', error);
    } finally {
      setReelLoading(false);
    }
  };

  const handleSaveReelPuzzle = async (puzzleData) => {
    setReelLoading(true);
    try {
      const isEdit = !!editingReelPuzzle;
      const url = '/api/admin/reel-connections/puzzles';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...puzzleData, id: editingReelPuzzle.id } : puzzleData;

      const response = await fetch(url, {
        method,
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify(body),
      });

      if (response.ok) {
        await loadReelPuzzles();
        setShowReelEditor(false);
        setEditingReelPuzzle(null);
        setSelectedReelDate(null);
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save puzzle'}`);
      }
    } catch (error) {
      console.error('Error saving Reel Connections puzzle:', error);
      alert('Failed to save puzzle. Please try again.');
    } finally {
      setReelLoading(false);
    }
  };

  const handleDeleteReelPuzzle = async (puzzleId) => {
    if (!confirm('Are you sure you want to delete this puzzle?')) return;

    try {
      const response = await fetch(`/api/admin/reel-connections/puzzles?id=${puzzleId}`, {
        method: 'DELETE',
        headers: await authService.getAuthHeaders(true),
      });

      if (response.ok) {
        await loadReelPuzzles();
        setShowReelEditor(false);
        setEditingReelPuzzle(null);
      }
    } catch (error) {
      console.error('Error deleting Reel Connections puzzle:', error);
      alert('Failed to delete puzzle. Please try again.');
    }
  };

  const handleSelectReelDate = (date) => {
    setSelectedReelDate(date);
    const existingPuzzle = reelPuzzles.find((p) => p.date === date);
    if (existingPuzzle) {
      setEditingReelPuzzle(existingPuzzle);
    } else {
      setEditingReelPuzzle(null);
    }
    setShowReelEditor(true);
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
            <Image src="/icons/ui/tandem.png" alt="" width={20} height={20} />
            Tandem
          </button>
          <button
            onClick={() => setActiveTab('mini')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2
              ${
                activeTab === 'mini'
                  ? 'border-accent-yellow text-text-primary bg-accent-yellow/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image src="/icons/ui/mini.png" alt="" width={20} height={20} />
            Mini
          </button>
          <button
            onClick={() => setActiveTab('reel')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2
              ${
                activeTab === 'reel'
                  ? 'border-accent-red text-text-primary bg-accent-red/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image src="/icons/ui/movie.png" alt="" width={20} height={20} />
            Reel
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
            <Image src="/icons/ui/feedback.png" alt="" width={20} height={20} />
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
                    {tandemSubTab === 'calendar'
                      ? 'Daily Tandem Calendar'
                      : tandemSubTab === 'editor'
                        ? 'Puzzle Editor'
                        : 'Theme Tracker'}
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
                      <Image src="/icons/ui/archive.png" alt="" width={16} height={16} />
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
                      <Image src="/icons/ui/editor.png" alt="" width={16} height={16} />
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
                      <Image src="/icons/ui/theme.png" alt="" width={16} height={16} />
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
        {activeTab === 'mini' && (
          <div className="space-y-6">
            {!showMiniEditor ? (
              <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-text-primary">Daily Mini Calendar</h3>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      handleSelectMiniDate(today);
                    }}
                    className="px-4 py-2 bg-accent-yellow text-gray-900 border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
                  >
                    New
                  </button>
                </div>
                {miniLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-yellow"></div>
                  </div>
                ) : (
                  <MiniPuzzleCalendar
                    puzzles={miniPuzzles}
                    selectedDate={selectedMiniDate}
                    onSelectDate={handleSelectMiniDate}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {editingMiniPuzzle && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeleteMiniPuzzle(editingMiniPuzzle.id)}
                      className="px-4 py-2 bg-accent-red text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
                    >
                      Delete Puzzle
                    </button>
                  </div>
                )}
                <MiniPuzzleEditor
                  puzzle={editingMiniPuzzle}
                  date={selectedMiniDate}
                  onSave={handleSaveMiniPuzzle}
                  onCancel={() => {
                    setShowMiniEditor(false);
                    setEditingMiniPuzzle(null);
                    setSelectedMiniDate(null);
                  }}
                  loading={miniLoading}
                />
              </div>
            )}
          </div>
        )}
        {activeTab === 'reel' && (
          <div className="space-y-6">
            {!showReelEditor ? (
              <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white p-4 sm:p-6 shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-text-primary">Reel Connections Calendar</h3>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      handleSelectReelDate(today);
                    }}
                    className="px-4 py-2 bg-accent-red text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
                  >
                    New
                  </button>
                </div>
                {reelLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-red"></div>
                  </div>
                ) : (
                  <ReelConnectionsPuzzleCalendar
                    puzzles={reelPuzzles}
                    selectedDate={selectedReelDate}
                    onSelectDate={handleSelectReelDate}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {editingReelPuzzle && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeleteReelPuzzle(editingReelPuzzle.id)}
                      className="px-4 py-2 bg-accent-red text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
                    >
                      Delete Puzzle
                    </button>
                  </div>
                )}
                <ReelConnectionsPuzzleEditor
                  puzzle={editingReelPuzzle}
                  date={selectedReelDate}
                  onSave={handleSaveReelPuzzle}
                  onCancel={() => {
                    setShowReelEditor(false);
                    setEditingReelPuzzle(null);
                    setSelectedReelDate(null);
                  }}
                  loading={reelLoading}
                />
              </div>
            )}
          </div>
        )}
        {activeTab === 'feedback' && <FeedbackDashboard onCountsChange={setFeedbackCounts} />}
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
