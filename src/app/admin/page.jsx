'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import PuzzleEditor from '@/components/admin/PuzzleEditor';
import PuzzleCalendar from '@/components/admin/PuzzleCalendar';
import ThemeTracker from '@/components/admin/ThemeTracker';
import BulkImport from '@/components/admin/BulkImport';
import CrypticPuzzleCalendar from '@/components/admin/cryptic/CrypticPuzzleCalendar';
import CrypticPuzzleEditor from '@/components/admin/cryptic/CrypticPuzzleEditor';
import authService from '@/services/auth.service';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('calendar');
  const [editingPuzzle, setEditingPuzzle] = useState(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
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
              className="hidden sm:inline-block px-4 sm:px-6 py-2 sm:py-3 bg-accent-blue text-white border-[3px] border-border-main font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform"
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

      <div className="border-b-[3px] border-border-main mb-6">
        <nav className="-mb-[3px] flex space-x-2 sm:space-x-4 md:space-x-8">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2
              ${
                activeTab === 'calendar'
                  ? 'border-accent-yellow text-text-primary bg-accent-yellow/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image
              src={isDark ? '/icons/ui/archive-dark.png' : '/icons/ui/archive.png'}
              alt=""
              width={20}
              height={20}
            />
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('editor')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2
              ${
                activeTab === 'editor'
                  ? 'border-accent-green text-text-primary bg-accent-green/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image
              src={isDark ? '/icons/ui/editor-dark.png' : '/icons/ui/editor.png'}
              alt=""
              width={20}
              height={20}
            />
            Editor
          </button>
          <button
            onClick={() => setActiveTab('themes')}
            className={`
              py-3 px-2 sm:px-4 border-b-[3px] font-bold text-sm sm:text-base whitespace-nowrap transition-all flex items-center gap-1 sm:gap-2
              ${
                activeTab === 'themes'
                  ? 'border-accent-pink text-text-primary bg-accent-pink/20'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-text-muted'
              }
            `}
          >
            <Image
              src={isDark ? '/icons/ui/theme-dark.png' : '/icons/ui/theme.png'}
              alt=""
              width={20}
              height={20}
            />
            Themes
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
            Daily Cryptic
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
        {activeTab === 'cryptic' && (
          <div className="space-y-6">
            {!showCrypticEditor ? (
              <div
                className="bg-accent-yellow/30 rounded-[24px] border-[3px] border-border-main p-4 sm:p-6"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-text-primary">Cryptic Puzzle Calendar</h3>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      handleSelectCrypticDate(today);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white border-[3px] border-border-main font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform"
                    style={{ boxShadow: 'var(--shadow-button)' }}
                  >
                    + New Puzzle
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
                      className="px-4 py-2 bg-accent-red text-white border-[3px] border-border-main font-bold rounded-xl hover:translate-y-[-2px] active:translate-y-0 transition-transform"
                      style={{ boxShadow: 'var(--shadow-button)' }}
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
