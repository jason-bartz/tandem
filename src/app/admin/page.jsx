'use client';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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
import MilestoneTracker from '@/components/admin/MilestoneTracker';
import UserManagement from '@/components/admin/users/UserManagement';
import AnnouncementManager from '@/components/admin/AnnouncementManager';
import EmailBlastManager from '@/components/admin/email/EmailBlastManager';
import AnalyticsDashboard from '@/components/admin/AnalyticsDashboard';
import TeamManager from '@/components/admin/team/TeamManager';
import PuzzleAlertSettings from '@/components/admin/PuzzleAlertSettings';
import ProfileModal from '@/components/admin/team/ProfileModal';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';
import { ASSET_VERSION } from '@/lib/constants';
import useAdminFeedbackCounts from '@/hooks/useAdminFeedbackCounts';
import useAdminKeyboardShortcuts from '@/hooks/useAdminKeyboardShortcuts';
import KeyboardShortcutHelp from '@/components/admin/KeyboardShortcutHelp';
import SuggestionReviewQueue from '@/components/admin/SuggestionReviewQueue';

import {
  CalendarDays,
  FlaskConical,
  MessageSquareText,
  Users,
  Megaphone,
  Mail,
  Flag,
  BarChart3,
  ShieldCheck,
  BellRing,
} from 'lucide-react';

// Tab definitions with minimum role required
const ALL_TABS = [
  { id: 'calendar', label: 'Calendar', icon: CalendarDays, minRole: 'editor' },
  { id: 'elements', label: 'Elements', icon: FlaskConical, minRole: 'editor' },
  { id: 'feedback', label: 'Feedback', icon: MessageSquareText, hasBadge: true, minRole: 'admin' },
  { id: 'users', label: 'Users', icon: Users, minRole: 'admin' },
  { id: 'announcements', label: 'Announce', icon: Megaphone, minRole: 'admin' },
  { id: 'email', label: 'Email', icon: Mail, minRole: 'admin' },
  { id: 'milestones', label: 'Milestones', icon: Flag, minRole: 'admin' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, minRole: 'editor' },
  { id: 'alerts', label: 'Alerts', icon: BellRing, minRole: 'admin' },
  { id: 'team', label: 'Team', icon: ShieldCheck, minRole: 'admin' },
];

const ROLE_LEVELS = { owner: 3, admin: 2, editor: 1 };

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [calendarSubTab, setCalendarSubTab] = useState('calendar'); // 'calendar', 'themes'
  const [showBulkImport, setShowBulkImport] = useState(false);
  const { counts: feedbackCounts, updateCounts: setFeedbackCounts } = useAdminFeedbackCounts();
  const [showProfileModal, setShowProfileModal] = useState(false);

  const currentUser = authService.getCurrentUser();
  const userRoleLevel = ROLE_LEVELS[currentUser?.role] || 1;
  const TABS = ALL_TABS.filter((tab) => userRoleLevel >= (ROLE_LEVELS[tab.minRole] || 1));

  // Listen for profile modal open event from layout user menu
  useEffect(() => {
    const handleOpenProfile = () => setShowProfileModal(true);
    window.addEventListener('open-admin-profile', handleOpenProfile);
    return () => window.removeEventListener('open-admin-profile', handleOpenProfile);
  }, []);

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

  // Suggestion review state
  const [suggestionDate, setSuggestionDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });

  // Loading states for save operations
  const [miniLoading, setMiniLoading] = useState(false);
  const [reelLoading, setReelLoading] = useState(false);
  const [soupLoading, setSoupLoading] = useState(false);

  // Calendar refresh function reference
  const refreshCalendarRef = useRef(null);
  const calendarRef = useRef(null);

  // Keyboard shortcut state
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

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

  // Handle selecting a suggestion — opens the appropriate editor pre-populated
  const handleSelectSuggestion = useCallback((gameId, suggestion) => {
    const data = suggestion.puzzle_data;
    const date = suggestion.target_date;
    setSelectedDate(date);
    setCalendarSubTab('calendar');

    switch (gameId) {
      case 'tandem':
        setEditingPuzzle({
          date,
          theme: data.theme,
          puzzles: data.puzzles,
          difficultyRating: data.difficultyRating,
          difficultyFactors: data.difficultyFactors,
        });
        setActiveEditor('tandem');
        break;

      case 'mini':
        setEditingPuzzle({
          date,
          grid: data.grid,
          solution: data.solution,
          words: data.words,
          clues: data.clues,
          // Mark as suggestion so editor knows not to look for an existing ID
          _fromSuggestion: true,
        });
        setActiveEditor('mini');
        break;

      case 'soup':
        setEditingPuzzle({
          date,
          target_element: data.targetElement,
          target_emoji: data.targetEmoji,
          par_moves: data.parMoves,
          difficulty: data.difficulty,
          solution_path: data.solutionPath,
          _fromSuggestion: true,
        });
        setActiveEditor('soup');
        break;

      case 'reel':
        setEditingPuzzle({
          date,
          groups: data.groups?.map((g, i) => ({
            connection: g.connection,
            difficulty: g.difficulty,
            order: i + 1,
            movies: (g.movies || []).map((m, j) => ({
              ...m,
              order: j + 1,
            })),
          })),
          _fromSuggestion: true,
        });
        setActiveEditor('reel');
        break;
    }
  }, []);

  // Stabilize initialPuzzle to prevent useEffect resets on parent re-renders
  const tandemInitialPuzzle = useMemo(
    () => (editingPuzzle ? { ...editingPuzzle, date: selectedDate } : { date: selectedDate }),
    [editingPuzzle, selectedDate]
  );

  // Render the appropriate editor based on activeEditor
  const renderEditor = () => {
    if (!activeEditor) return null;

    switch (activeEditor) {
      case 'tandem':
        return (
          <div className="bg-bg-surface rounded-lg">
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <Image src="/ui/games/tandem.png" alt="" width={24} height={24} />
                <h3 className="text-lg font-bold text-text-primary">
                  {editingPuzzle ? 'Edit' : 'Create'} Daily Tandem Puzzle
                </h3>
              </div>
            </div>
            <div className="p-2 sm:p-6">
              <PuzzleEditor
                initialPuzzle={tandemInitialPuzzle}
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
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Image
                  src="/ui/games/mini.png"
                  alt=""
                  width={24}
                  height={24}
                  className="flex-shrink-0"
                />
                <h3 className="text-lg font-bold text-text-primary truncate">
                  {editingPuzzle ? 'Edit' : 'Create'} Daily Mini Puzzle
                </h3>
              </div>
              {editingPuzzle && (
                <button
                  onClick={() => handleDeleteMiniPuzzle(editingPuzzle.id)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-accent-red text-white font-bold rounded-md hover:scale-105 transition-all duration-200 whitespace-nowrap flex-shrink-0"
                >
                  Delete
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
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Image
                  src="/ui/games/movie.png"
                  alt=""
                  width={24}
                  height={24}
                  className="flex-shrink-0"
                />
                <h3 className="text-lg font-bold text-text-primary truncate">
                  {editingPuzzle ? 'Edit' : 'Create'} Reel Connections Puzzle
                </h3>
              </div>
              {editingPuzzle && (
                <button
                  onClick={() => handleDeleteReelPuzzle(editingPuzzle.id)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-accent-red text-white font-bold rounded-md hover:scale-105 transition-all duration-200 whitespace-nowrap flex-shrink-0"
                >
                  Delete
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
          <div className="space-y-3 sm:space-y-4 overflow-visible">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <Image
                  src={`/ui/games/daily-alchemy.png?v=${ASSET_VERSION}`}
                  alt=""
                  width={24}
                  height={24}
                  className="flex-shrink-0"
                />
                <h3 className="text-lg font-bold text-text-primary truncate">
                  {editingPuzzle ? 'Edit' : 'Create'} Daily Alchemy Puzzle
                </h3>
              </div>
              {editingPuzzle?.id && (
                <button
                  onClick={() => handleDeleteSoupPuzzle(editingPuzzle.id)}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-sm bg-accent-red text-white font-bold rounded-md hover:scale-105 transition-all duration-200 whitespace-nowrap flex-shrink-0"
                >
                  Delete
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

  const handleTabClick = useCallback((tabId) => {
    setActiveTab(tabId);
    if (tabId === 'calendar') {
      setActiveEditor(null);
    }
  }, []);

  // Create puzzle for today via keyboard shortcut
  const handleCreateToday = useCallback(() => {
    if (activeTab !== 'calendar') return;
    const ref = calendarRef.current;
    if (!ref) return;
    const todayKey = ref.getTodayDateKey();
    const puzzles = ref.getPuzzleData();
    setSelectedDate(todayKey);
    setSelectedDatePuzzles(puzzles[todayKey] || {});
    setShowGameSelector(true);
  }, [activeTab]);

  const toggleShortcutHelp = useCallback(() => setShowShortcutHelp((prev) => !prev), []);

  useAdminKeyboardShortcuts({
    tabs: TABS,
    activeTab,
    onTabChange: handleTabClick,
    calendarRef,
    activeEditor,
    onCreateToday: handleCreateToday,
    onCloseEditor: handleCloseEditor,
    showHelp: showShortcutHelp,
    onToggleHelp: toggleShortcutHelp,
  });

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar — icon rail on mobile, expands on hover on desktop */}
      <aside className="admin-sidebar flex-shrink-0 w-11 sm:w-44 bg-bg-surface flex flex-col py-2 overflow-hidden overflow-y-auto z-30">
        <nav className="flex flex-col gap-0.5 px-1.5">
          {TABS.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                title={tab.label}
                className={`
                  relative flex items-center gap-2.5 h-9 px-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-200
                  ${isActive ? 'bg-text-primary text-ghost-white' : 'text-text-secondary hover:bg-muted hover:text-text-primary'}
                `}
              >
                <Icon size={16} className="flex-shrink-0" />
                <span className="hidden sm:inline opacity-100 text-xs font-semibold">
                  {tab.label}
                </span>
                {/* Keyboard hint */}
                <span className="ml-auto hidden sm:inline opacity-100 text-[10px] text-text-muted font-mono">
                  {idx < 9 ? idx + 1 : idx === 9 ? '0' : ''}
                </span>
                {/* Badge */}
                {tab.hasBadge && feedbackCounts?.new > 0 && (
                  <span className="absolute -top-0.5 right-0 sm:right-8 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 bg-accent-red text-white text-[9px] font-bold rounded-full">
                    {feedbackCounts.new}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer to push sidebar content up */}
        <div className="mt-auto" />
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0 px-1.5 py-2 sm:px-4 sm:py-4 md:px-6 md:py-5 min-h-[500px]">
        {activeTab === 'calendar' && (
          <>
            {activeEditor ? (
              renderEditor()
            ) : calendarSubTab === 'themes' ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-text-primary">Theme Tracker</h3>
                  <button
                    onClick={() => setCalendarSubTab('calendar')}
                    className="px-3 py-1.5 text-sm rounded-md font-semibold text-text-secondary bg-bg-surface hover:bg-muted transition-all duration-200"
                  >
                    Back to Calendar
                  </button>
                </div>
                <ThemeTracker
                  onEditPuzzle={(puzzle) => {
                    setSelectedDate(puzzle.date);
                    setEditingPuzzle(puzzle);
                    setActiveEditor('tandem');
                  }}
                />
              </div>
            ) : calendarSubTab === 'suggestions' ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-text-primary">Puzzle Suggestions</h3>
                  <button
                    onClick={() => setCalendarSubTab('calendar')}
                    className="px-3 py-1.5 text-sm rounded-md font-semibold text-text-secondary bg-bg-surface hover:bg-muted transition-all duration-200"
                  >
                    Back to Calendar
                  </button>
                </div>
                <SuggestionReviewQueue
                  date={suggestionDate}
                  onSelectSuggestion={handleSelectSuggestion}
                />
              </div>
            ) : (
              <UnifiedPuzzleCalendar
                ref={calendarRef}
                onSelectDate={handleDateSelect}
                onRefresh={(fn) => {
                  refreshCalendarRef.current = fn;
                }}
                onOpenSuggestions={(date) => {
                  setSuggestionDate(date);
                  setCalendarSubTab('suggestions');
                }}
              />
            )}
          </>
        )}
        {activeTab === 'elements' && <ElementManager />}
        {activeTab === 'feedback' && <FeedbackDashboard onCountsChange={setFeedbackCounts} />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'announcements' && <AnnouncementManager />}
        {activeTab === 'email' && <EmailBlastManager />}
        {activeTab === 'milestones' && <MilestoneTracker />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'alerts' && <PuzzleAlertSettings />}
        {activeTab === 'team' && <TeamManager />}
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
          <div className="bg-bg-surface rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">Theme Tracker</h3>
              <button
                onClick={() => setShowThemesModal(false)}
                className="p-2 hover:bg-bg-card rounded-lg transition-colors"
                aria-label="Close theme tracker"
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
          <div className="bg-bg-surface rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-text-primary">
                Connection Tracker
              </h3>
              <button
                onClick={() => setShowConnectionsModal(false)}
                className="p-2 hover:bg-bg-card rounded-lg transition-colors"
                aria-label="Close connection tracker"
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

      {/* Profile modal */}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}

      {/* Keyboard shortcut help overlay */}
      {showShortcutHelp && <KeyboardShortcutHelp onClose={toggleShortcutHelp} />}

      {/* Fixed bottom-right shortcut hint */}
      <button
        onClick={toggleShortcutHelp}
        className="fixed bottom-4 right-4 hidden sm:flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-all duration-200"
      >
        <span>Press <kbd className="font-bold bg-bg-surface text-text-muted rounded px-1 py-0.5">?</kbd> for keyboard shortcuts</span>
      </button>
    </div>
  );
}
