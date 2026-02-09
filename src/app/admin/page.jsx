'use client';
import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import UnifiedPuzzleCalendar from '@/components/admin/UnifiedPuzzleCalendar';
import GameSelectorModal from '@/components/admin/GameSelectorModal';
import PuzzleEditor from '@/components/admin/PuzzleEditor';
import ThemeTracker from '@/components/admin/ThemeTracker';
import BulkImport from '@/components/admin/BulkImport';
import MiniPuzzleEditor from '@/components/admin/mini/MiniPuzzleEditor';
import ReelConnectionsPuzzleEditor from '@/components/admin/reel-connections/ReelConnectionsPuzzleEditor';
import ConnectionTracker from '@/components/admin/reel-connections/ConnectionTracker';
import DailyAlchemyPuzzleEditor from '@/components/admin/daily-alchemy/DailyAlchemyPuzzleEditor';
import ElementManager from '@/components/admin/daily-alchemy/ElementManager';
import FeedbackDashboard from '@/components/admin/feedback/FeedbackDashboard';
import SubmissionsDashboard from '@/components/admin/submissions/SubmissionsDashboard';
import BotLeaderboardManager from '@/components/admin/BotLeaderboardManager';
import AvatarManager from '@/components/admin/AvatarManager';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';
import { ASSET_VERSION } from '@/lib/constants';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [calendarSubTab, setCalendarSubTab] = useState('calendar'); // 'calendar', 'themes'
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [feedbackCounts, setFeedbackCounts] = useState(null);
  const [submissionCounts, setSubmissionCounts] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [importedSubmission, setImportedSubmission] = useState(null);

  // Game selector modal state
  const [showGameSelector, setShowGameSelector] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDatePuzzles, setSelectedDatePuzzles] = useState({});

  // Editor state
  const [activeEditor, setActiveEditor] = useState(null); // 'tandem', 'mini', 'reel', or null
  const [editingPuzzle, setEditingPuzzle] = useState(null);

  // Themes modal state (for viewing themes while in puzzle editor)
  const [showThemesModal, setShowThemesModal] = useState(false);

  // Connections modal state (for viewing connections while in reel editor)
  const [showConnectionsModal, setShowConnectionsModal] = useState(false);

  // Loading states for save operations
  const [miniLoading, setMiniLoading] = useState(false);
  const [reelLoading, setReelLoading] = useState(false);
  const [soupLoading, setSoupLoading] = useState(false);

  // Calendar refresh function reference
  const refreshCalendarRef = useRef(null);

  // Handle date selection from unified calendar
  const handleDateSelect = (date, puzzles) => {
    setSelectedDate(date);
    setSelectedDatePuzzles(puzzles);
    setShowGameSelector(true);
  };

  // Handle game selection from modal
  const handleGameSelect = (gameId, existingPuzzle) => {
    setShowGameSelector(false);
    setActiveEditor(gameId);
    setEditingPuzzle(existingPuzzle);
  };

  // Close editor and return to calendar
  const handleCloseEditor = useCallback(() => {
    setActiveEditor(null);
    setEditingPuzzle(null);
    setSelectedDate(null);
    // Refresh the calendar to show updated data
    if (refreshCalendarRef.current) {
      refreshCalendarRef.current();
    }
  }, []);

  // Mini puzzle save handler
  const handleSaveMiniPuzzle = async (puzzleData) => {
    setMiniLoading(true);
    try {
      const isEdit = !!editingPuzzle;
      const url = '/api/admin/mini/puzzles';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...puzzleData, id: editingPuzzle.id } : puzzleData;

      const response = await fetch(url, {
        method,
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify(body),
      });

      if (response.ok) {
        handleCloseEditor();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save puzzle'}`);
      }
    } catch (error) {
      logger.error('Error saving mini puzzle', error);
      alert('Failed to save puzzle. Please try again.');
    } finally {
      setMiniLoading(false);
    }
  };

  // Mini puzzle delete handler
  const handleDeleteMiniPuzzle = async (puzzleId) => {
    if (!confirm('Are you sure you want to delete this puzzle?')) return;

    try {
      const response = await fetch(`/api/admin/mini/puzzles?id=${puzzleId}`, {
        method: 'DELETE',
        headers: await authService.getAuthHeaders(true),
      });

      if (response.ok) {
        handleCloseEditor();
      } else {
        alert('Failed to delete puzzle. Please try again.');
      }
    } catch (error) {
      logger.error('Error deleting mini puzzle', error);
      alert('Failed to delete puzzle. Please try again.');
    }
  };

  // Reel puzzle save handler
  const handleSaveReelPuzzle = async (puzzleData) => {
    setReelLoading(true);
    try {
      // Check for existing puzzle ID (not just editingPuzzle, which may be set for imports without an ID)
      const isEdit = !!editingPuzzle?.id;
      const url = '/api/admin/reel-connections/puzzles';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...puzzleData, id: editingPuzzle.id } : puzzleData;

      const response = await fetch(url, {
        method,
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify(body),
      });

      if (response.ok) {
        handleCloseEditor();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save puzzle'}`);
      }
    } catch (error) {
      logger.error('Error saving Reel Connections puzzle', error);
      alert('Failed to save puzzle. Please try again.');
    } finally {
      setReelLoading(false);
    }
  };

  // Reel puzzle delete handler
  const handleDeleteReelPuzzle = async (puzzleId) => {
    if (!confirm('Are you sure you want to delete this puzzle?')) return;

    try {
      const response = await fetch(`/api/admin/reel-connections/puzzles?id=${puzzleId}`, {
        method: 'DELETE',
        headers: await authService.getAuthHeaders(true),
      });

      if (response.ok) {
        handleCloseEditor();
      } else {
        alert('Failed to delete puzzle. Please try again.');
      }
    } catch (error) {
      logger.error('Error deleting Reel Connections puzzle', error);
      alert('Failed to delete puzzle. Please try again.');
    }
  };

  // Soup puzzle save handler
  const handleSaveSoupPuzzle = async (puzzleData) => {
    setSoupLoading(true);
    try {
      const isEdit = !!editingPuzzle?.id;
      const url = '/api/admin/daily-alchemy/puzzles';
      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit ? { ...puzzleData, id: editingPuzzle.id } : puzzleData;

      const response = await fetch(url, {
        method,
        headers: await authService.getAuthHeaders(true),
        body: JSON.stringify(body),
      });

      if (response.ok) {
        handleCloseEditor();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to save puzzle'}`);
      }
    } catch (error) {
      logger.error('Error saving Daily Alchemy puzzle', error);
      alert('Failed to save puzzle. Please try again.');
    } finally {
      setSoupLoading(false);
    }
  };

  // Soup puzzle delete handler
  const handleDeleteSoupPuzzle = async (puzzleId) => {
    if (!confirm('Are you sure you want to delete this puzzle?')) return;

    try {
      const response = await fetch(`/api/admin/daily-alchemy/puzzles?id=${puzzleId}`, {
        method: 'DELETE',
        headers: await authService.getAuthHeaders(true),
      });

      if (response.ok) {
        handleCloseEditor();
      } else {
        alert('Failed to delete puzzle. Please try again.');
      }
    } catch (error) {
      logger.error('Error deleting Daily Alchemy puzzle', error);
      alert('Failed to delete puzzle. Please try again.');
    }
  };

  // Render the appropriate editor based on activeEditor
  const renderEditor = () => {
    if (!activeEditor) return null;

    switch (activeEditor) {
      case 'tandem':
        return (
          <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-b-[3px] border-black dark:border-white">
              <div className="flex items-center gap-3">
                <Image src="/icons/ui/tandem.png" alt="" width={24} height={24} />
                <h3 className="text-base sm:text-lg font-bold text-text-primary">
                  {editingPuzzle ? 'Edit' : 'Create'} Daily Tandem Puzzle
                </h3>
              </div>
            </div>
            <div className="p-3 sm:p-6">
              <PuzzleEditor
                initialPuzzle={
                  editingPuzzle ? { ...editingPuzzle, date: selectedDate } : { date: selectedDate }
                }
                onClose={handleCloseEditor}
                onShowBulkImport={() => setShowBulkImport(true)}
                onShowThemes={() => {
                  setShowThemesModal(true);
                }}
              />
            </div>
          </div>
        );

      case 'mini':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/icons/ui/mini.png" alt="" width={24} height={24} />
                <h3 className="text-base sm:text-lg font-bold text-text-primary">
                  {editingPuzzle ? 'Edit' : 'Create'} Daily Mini Puzzle
                </h3>
              </div>
              {editingPuzzle && (
                <button
                  onClick={() => handleDeleteMiniPuzzle(editingPuzzle.id)}
                  className="px-4 py-2 bg-accent-red text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
                >
                  Delete Puzzle
                </button>
              )}
            </div>
            <MiniPuzzleEditor
              puzzle={editingPuzzle}
              date={selectedDate}
              onSave={handleSaveMiniPuzzle}
              onCancel={handleCloseEditor}
              loading={miniLoading}
            />
          </div>
        );

      case 'reel':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image src="/icons/ui/movie.png" alt="" width={24} height={24} />
                <h3 className="text-base sm:text-lg font-bold text-text-primary">
                  {editingPuzzle ? 'Edit' : 'Create'} Reel Connections Puzzle
                </h3>
              </div>
              {editingPuzzle && (
                <button
                  onClick={() => handleDeleteReelPuzzle(editingPuzzle.id)}
                  className="px-4 py-2 bg-accent-red text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
                >
                  Delete Puzzle
                </button>
              )}
            </div>
            <ReelConnectionsPuzzleEditor
              puzzle={editingPuzzle}
              date={selectedDate}
              onSave={handleSaveReelPuzzle}
              onCancel={handleCloseEditor}
              loading={reelLoading}
              onShowConnections={() => setShowConnectionsModal(true)}
            />
          </div>
        );

      case 'soup':
        return (
          <div className="space-y-4 overflow-visible">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src={`/icons/ui/daily-alchemy.png?v=${ASSET_VERSION}`}
                  alt=""
                  width={24}
                  height={24}
                />
                <h3 className="text-base sm:text-lg font-bold text-text-primary">
                  {editingPuzzle ? 'Edit' : 'Create'} Daily Alchemy Puzzle
                </h3>
              </div>
              {editingPuzzle?.id && (
                <button
                  onClick={() => handleDeleteSoupPuzzle(editingPuzzle.id)}
                  className="px-4 py-2 bg-accent-red text-white border-[3px] border-black dark:border-white font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(255,255,255,0.3)]"
                >
                  Delete Puzzle
                </button>
              )}
            </div>
            <DailyAlchemyPuzzleEditor
              puzzle={editingPuzzle}
              date={selectedDate}
              onSave={handleSaveSoupPuzzle}
              onCancel={handleCloseEditor}
              loading={soupLoading}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="px-2 py-3 sm:px-4 sm:py-5 md:p-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
            Puzzle & Game Management
          </h2>
        </div>
        <p className="text-sm text-text-secondary font-medium">Manage Daily Puzzles and Settings</p>
      </div>

      {/* Main tabs: Calendar and Feedback */}
      <div className="border-b-[3px] border-black dark:border-white mb-6">
        <nav className="-mb-[3px] flex space-x-2 sm:space-x-4 md:space-x-8">
          <button
            onClick={() => {
              setActiveTab('calendar');
              setActiveEditor(null);
            }}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2
              ${
                activeTab === 'calendar'
                  ? 'border-accent-yellow text-text-primary bg-accent-yellow/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image src="/icons/ui/archive.png" alt="" width={20} height={20} />
            <span className="hidden sm:inline">Calendar</span>
          </button>
          <button
            onClick={() => setActiveTab('elements')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2
              ${
                activeTab === 'elements'
                  ? 'border-green-500 text-text-primary bg-green-500/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image
              src={`/icons/ui/daily-alchemy.png?v=${ASSET_VERSION}`}
              alt=""
              width={20}
              height={20}
            />
            <span className="hidden sm:inline">Elements</span>
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2 relative
              ${
                activeTab === 'submissions'
                  ? 'border-accent-green text-text-primary bg-accent-green/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image src="/icons/ui/movie.png" alt="" width={20} height={20} />
            <span className="hidden sm:inline">Submissions</span>
            {submissionCounts?.pending > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-accent-red text-white text-xs font-bold rounded-full border-[2px] border-white">
                {submissionCounts.pending}
              </span>
            )}
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
            <span className="hidden sm:inline">Feedback</span>
            {feedbackCounts?.new > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-accent-red text-white text-xs font-bold rounded-full border-[2px] border-white">
                {feedbackCounts.new}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('avatars')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2
              ${
                activeTab === 'avatars'
                  ? 'border-accent-pink text-text-primary bg-accent-pink/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image src="/icons/ui/avatars.png" alt="" width={20} height={20} />
            <span className="hidden sm:inline">Avatars</span>
          </button>
          <button
            onClick={() => setActiveTab('leaderboards')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2
              ${
                activeTab === 'leaderboards'
                  ? 'border-accent-purple text-text-primary bg-accent-purple/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image src="/icons/ui/leaderboard-admin.png" alt="" width={20} height={20} />
            <span className="hidden sm:inline">Leaderboards</span>
          </button>
        </nav>
      </div>

      <div className="mt-4 sm:mt-6 min-h-[400px] sm:min-h-[500px]">
        {activeTab === 'calendar' && (
          <>
            {activeEditor ? (
              // Show editor when a game is selected
              renderEditor()
            ) : (
              // Show unified calendar with sub-tabs
              <div className="bg-bg-surface rounded-lg border-[3px] border-black dark:border-white shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(255,255,255,0.3)]">
                <div className="px-3 sm:px-6 py-3 sm:py-4 border-b-[3px] border-black dark:border-white">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="text-base sm:text-lg font-bold text-text-primary">
                      {calendarSubTab === 'calendar' ? 'All Games Calendar' : 'Theme Tracker'}
                    </h3>
                    {calendarSubTab === 'themes' && (
                      <button
                        onClick={() => setCalendarSubTab('calendar')}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm border-[2px] rounded-lg font-bold transition-all flex items-center gap-1 bg-bg-card border-black dark:border-white text-text-secondary hover:bg-accent-yellow/20"
                      >
                        <Image src="/icons/ui/archive.png" alt="" width={16} height={16} />
                        <span className="hidden sm:inline">← Back to Calendar</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 sm:p-6">
                  {calendarSubTab === 'calendar' && (
                    <UnifiedPuzzleCalendar
                      onSelectDate={handleDateSelect}
                      onRefresh={(fn) => {
                        refreshCalendarRef.current = fn;
                      }}
                    />
                  )}
                  {calendarSubTab === 'themes' && (
                    <ThemeTracker
                      onEditPuzzle={(puzzle) => {
                        setSelectedDate(puzzle.date);
                        setEditingPuzzle(puzzle);
                        setActiveEditor('tandem');
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {activeTab === 'elements' && <ElementManager />}
        {activeTab === 'feedback' && <FeedbackDashboard onCountsChange={setFeedbackCounts} />}
        {activeTab === 'submissions' && (
          <SubmissionsDashboard
            onCountsChange={setSubmissionCounts}
            onImportToEditor={(submission) => {
              // Convert submission to editor format and open Reel editor
              setImportedSubmission(submission);
              setActiveTab('calendar');
              setSelectedDate(null); // No date pre-selected for imported submissions
              setEditingPuzzle({
                // Convert submission groups to editor format
                groups: submission.groups.map((group) => ({
                  connection: group.connection,
                  difficulty: group.difficulty,
                  order: group.order,
                  movies: group.movies.map((movie) => ({
                    imdbId: movie.imdbId,
                    title: movie.title,
                    year: movie.year,
                    poster: movie.poster,
                    order: movie.order,
                  })),
                })),
                // Include creator info for attribution
                creatorName: submission.isAnonymous
                  ? 'An anonymous member'
                  : submission.displayName,
                isUserSubmitted: true,
              });
              setActiveEditor('reel');
            }}
          />
        )}
        {activeTab === 'leaderboards' && <BotLeaderboardManager />}
        {activeTab === 'avatars' && <AvatarManager />}
      </div>

      {/* Game selector modal */}
      {showGameSelector && (
        <GameSelectorModal
          date={selectedDate}
          puzzles={selectedDatePuzzles}
          onSelectGame={handleGameSelect}
          onClose={() => setShowGameSelector(false)}
        />
      )}

      {/* Bulk import modal */}
      {showBulkImport && (
        <BulkImport
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            if (refreshCalendarRef.current) {
              refreshCalendarRef.current();
            }
          }}
        />
      )}

      {/* Themes modal (for viewing themes while in puzzle editor) */}
      {showThemesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-lg border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-[3px] border-black flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-text-primary">Theme Tracker</h3>
              <button
                onClick={() => setShowThemesModal(false)}
                className="p-2 hover:bg-bg-card rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-text-primary"
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
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <ThemeTracker
                onEditPuzzle={(puzzle) => {
                  setShowThemesModal(false);
                  setSelectedDate(puzzle.date);
                  setEditingPuzzle(puzzle);
                  setActiveEditor('tandem');
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Connections modal (for viewing connections while in reel editor) */}
      {showConnectionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-surface rounded-lg border-[3px] border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b-[3px] border-black flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold text-text-primary">
                Connection Tracker
              </h3>
              <button
                onClick={() => setShowConnectionsModal(false)}
                className="p-2 hover:bg-bg-card rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5 text-text-primary"
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
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <ConnectionTracker
                onEditPuzzle={(puzzle) => {
                  setShowConnectionsModal(false);
                  setSelectedDate(puzzle.date);
                  setEditingPuzzle(puzzle);
                  setActiveEditor('reel');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
