'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  Sparkles,
  RotateCcw,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Plus,
  Beaker,
  GitBranch,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  Pencil,
  X,
  Save,
  Grid3X3,
  Loader2,
  Wand2,
  Route,
  Download,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import logger from '@/lib/logger';
import authService from '@/services/auth.service';
import { STARTER_ELEMENTS } from '@/lib/daily-alchemy.constants';

/**
 * ElementManager - Standalone admin tool for managing element combinations
 * Reorganized into two main sections:
 * - Create: All tools for adding new elements/combinations
 * - Library: Browse, search, and manage existing elements
 */
export default function ElementManager() {
  const [activeTab, setActiveTab] = useState('create'); // 'create', 'library', or 'discoveries'

  return (
    <div className="space-y-6">
      {/* Main Tabs */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-6 py-3 font-bold rounded-xl border-[3px] border-black dark:border-white transition-all flex items-center gap-2 ${
            activeTab === 'create'
              ? 'bg-green-500 text-white shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-bg-card text-text-secondary hover:bg-green-100 dark:hover:bg-green-900/20'
          }`}
        >
          <Plus className="w-5 h-5" />
          Create
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`px-6 py-3 font-bold rounded-xl border-[3px] border-black dark:border-white transition-all flex items-center gap-2 ${
            activeTab === 'library'
              ? 'bg-blue-500 text-white shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-bg-card text-text-secondary hover:bg-blue-100 dark:hover:bg-blue-900/20'
          }`}
        >
          <Grid3X3 className="w-5 h-5" />
          Library
        </button>
        <button
          onClick={() => setActiveTab('discoveries')}
          className={`px-6 py-3 font-bold rounded-xl border-[3px] border-black dark:border-white transition-all flex items-center gap-2 ${
            activeTab === 'discoveries'
              ? 'bg-amber-500 text-white shadow-[4px_4px_0px_rgba(0,0,0,1)]'
              : 'bg-bg-card text-text-secondary hover:bg-amber-100 dark:hover:bg-amber-900/20'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          First Discoveries
        </button>
      </div>

      {/* Content */}
      {activeTab === 'create' && <CreateSection />}
      {activeTab === 'library' && <LibrarySection />}
      {activeTab === 'discoveries' && <FirstDiscoveriesSection />}
    </div>
  );
}

/**
 * CreateSection - Unified section for all element creation tools
 * Modes: AI Generator, Manual Pathway, Single Combo
 */
function CreateSection() {
  const [createMode, setCreateMode] = useState('ai'); // 'ai', 'pathway', 'single'

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border-[3px] border-black dark:border-white p-4">
        <p className="text-sm text-text-secondary mb-3 font-medium">Choose how to add elements:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCreateMode('ai')}
            className={`px-4 py-2 font-bold rounded-lg border-[2px] transition-all flex items-center gap-2 ${
              createMode === 'ai'
                ? 'bg-green-500 text-white border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            AI Generator
          </button>
          <button
            onClick={() => setCreateMode('pathway')}
            className={`px-4 py-2 font-bold rounded-lg border-[2px] transition-all flex items-center gap-2 ${
              createMode === 'pathway'
                ? 'bg-purple-500 text-white border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30'
            }`}
          >
            <Route className="w-4 h-4" />
            Manual Pathway
          </button>
          <button
            onClick={() => setCreateMode('single')}
            className={`px-4 py-2 font-bold rounded-lg border-[2px] transition-all flex items-center gap-2 ${
              createMode === 'single'
                ? 'bg-amber-500 text-white border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30'
            }`}
          >
            <Beaker className="w-4 h-4" />
            Single Combo
          </button>
        </div>
        <p className="text-xs text-text-secondary mt-3">
          {createMode === 'ai' &&
            'Enter a target element and AI will generate multiple paths from starter elements.'}
          {createMode === 'pathway' &&
            'Build a complete pathway step-by-step with full control over each combination.'}
          {createMode === 'single' && 'Quickly add a single element combination.'}
        </p>
      </div>

      {/* Mode Content */}
      {createMode === 'ai' && <MultiPathGenerator />}
      {createMode === 'pathway' && <PathwayBuilder />}
      {createMode === 'single' && <SingleComboEntry />}
    </div>
  );
}

/**
 * LibrarySection - Browse, search, and manage existing elements
 */
function LibrarySection() {
  const [selectedElement, setSelectedElement] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-4">
      {/* Element Browser */}
      <ElementBrowser
        onSelectElement={(element) => setSelectedElement(element)}
        externalSearch={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Element Detail Modal */}
      {selectedElement && (
        <ElementDetailModal
          element={selectedElement}
          onClose={() => setSelectedElement(null)}
          onElementUpdated={() => {
            // Trigger refresh by clearing and re-selecting
            const el = selectedElement;
            setSelectedElement(null);
            setTimeout(() => setSelectedElement(el), 100);
          }}
          onElementDeleted={() => {
            setSelectedElement(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * MultiPathGenerator - Path generator with multi-select checkboxes
 */
function MultiPathGenerator() {
  const [targetInput, setTargetInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [paths, setPaths] = useState(null);
  const [error, setError] = useState(null);
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveResults, setSaveResults] = useState(null);

  const generatePaths = useCallback(async () => {
    if (!targetInput.trim()) {
      setError('Please enter a target element name');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPaths(null);
    setSelectedPaths(new Set());
    setSaveResults(null);

    try {
      const token = await authService.getToken();
      const response = await fetch('/api/admin/daily-alchemy/generate-path', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetElement: targetInput.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to generate paths');
      }

      if (data.success && data.paths) {
        setPaths(data.paths);
        // Auto-select all paths by default
        setSelectedPaths(new Set(data.paths.map((p) => p.id)));
        logger.info('[ElementManager] Paths received', { count: data.paths.length });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      logger.error('[ElementManager] Generation error', { error: err.message });
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [targetInput]);

  const togglePathSelection = useCallback((pathId) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(pathId)) {
        next.delete(pathId);
      } else {
        next.add(pathId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (paths) {
      setSelectedPaths(new Set(paths.map((p) => p.id)));
    }
  }, [paths]);

  const selectNone = useCallback(() => {
    setSelectedPaths(new Set());
  }, []);

  const saveSelectedPaths = useCallback(async () => {
    if (selectedPaths.size === 0 || !paths) return;

    setIsSaving(true);
    setError(null);
    setSaveResults(null);

    const results = { total: 0, created: 0, skipped: 0, conflicts: [], errors: [] };

    try {
      const token = await authService.getToken();

      // Save each selected path
      for (const pathId of selectedPaths) {
        const path = paths.find((p) => p.id === pathId);
        if (!path) continue;

        const finalStep = path.steps[path.steps.length - 1];
        const targetElement = finalStep.result;
        const targetEmoji = finalStep.resultEmoji;

        try {
          const response = await fetch('/api/admin/daily-alchemy/generate-path', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ path, targetElement, targetEmoji }),
          });

          const data = await response.json();

          if (!response.ok) {
            results.errors.push(`${path.label}: ${data.message || data.error}`);
          } else {
            results.created += data.created || 0;
            results.skipped += data.skipped || 0;
            // Collect conflicts from this path
            if (data.conflicts && data.conflicts.length > 0) {
              results.conflicts.push(...data.conflicts);
            }
          }
        } catch (err) {
          results.errors.push(`${path.label}: ${err.message}`);
        }

        results.total++;
      }

      setSaveResults(results);
      logger.info('[ElementManager] Paths saved', results);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [selectedPaths, paths]);

  const regenerate = useCallback(() => {
    setPaths(null);
    setSelectedPaths(new Set());
    setSaveResults(null);
    setError(null);
    generatePaths();
  }, [generatePaths]);

  // Delete a conflicting combination and refresh the path
  const deleteConflict = useCallback(
    async (elementA, elementB, _stepIdx) => {
      try {
        const token = await authService.getToken();
        const response = await fetch(
          `/api/admin/daily-alchemy/combinations?elementA=${encodeURIComponent(elementA)}&elementB=${encodeURIComponent(elementB)}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Handle non-JSON responses
        const text = await response.text();
        let data;
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          throw new Error(
            `Server returned invalid response (${response.status}): ${text.slice(0, 100)}`
          );
        }

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to delete combination');
        }

        logger.info('[ElementManager] Conflict deleted, regenerating paths', {
          elementA,
          elementB,
        });

        // Regenerate paths to update validation
        regenerate();
      } catch (err) {
        logger.error('[ElementManager] Delete conflict error', { error: err.message });
        setError(`Failed to delete conflict: ${err.message}`);
      }
    },
    [regenerate]
  );

  return (
    <div className="space-y-4">
      {/* Input Section */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isGenerating && generatePaths()}
            placeholder="Enter target element (e.g., Robot, Volcano, Pizza)"
            className="w-full px-4 py-3 pl-10 rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary text-lg"
            disabled={isGenerating}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>
        <button
          onClick={generatePaths}
          disabled={isGenerating || !targetInput.trim()}
          className="px-6 py-3 bg-green-500 text-white font-bold rounded-lg border-[2px] border-black hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
        >
          {isGenerating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Paths
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-[2px] border-red-500 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-600 dark:text-red-400">Error</p>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {saveResults && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border-[2px] border-green-500 rounded-lg flex items-start gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-green-600 dark:text-green-400">
              {saveResults.total} Path{saveResults.total !== 1 ? 's' : ''} Saved Successfully!
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              Created {saveResults.created} new combination
              {saveResults.created !== 1 ? 's' : ''}, {saveResults.skipped} already existed.
            </p>
            {saveResults.conflicts && saveResults.conflicts.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border-[2px] border-amber-500 rounded-lg">
                <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {saveResults.conflicts.length} Conflict
                  {saveResults.conflicts.length !== 1 ? 's' : ''} Detected
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                  These combinations already exist with different results (kept existing):
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {saveResults.conflicts.map((c, i) => (
                    <div
                      key={i}
                      className="text-sm bg-white dark:bg-gray-800 rounded p-2 border border-amber-300 dark:border-amber-700"
                    >
                      <span className="font-medium">
                        {c.elementA} + {c.elementB}
                      </span>
                      <span className="mx-2">=</span>
                      <span className="text-red-500 line-through">
                        {c.generated.emoji} {c.generated.result}
                      </span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="text-green-600 font-bold">
                        {c.existing.emoji} {c.existing.result}
                      </span>
                      <span className="text-xs text-gray-500 ml-1">(existing)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {saveResults.errors.length > 0 && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                <p className="font-bold">Errors:</p>
                <ul className="list-disc list-inside">
                  {saveResults.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="p-8 text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-text-primary">
            Generating 3 paths to &quot;{targetInput}&quot;...
          </p>
          <p className="text-sm text-text-secondary mt-2">This may take a few moments</p>
        </div>
      )}

      {/* Paths Display */}
      {paths && paths.length > 0 && (
        <div className="space-y-4">
          {/* Validation Warning Banner */}
          {paths.some((p) => p.validationSummary?.hasConflicts) && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-[2px] border-red-500 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-red-600 dark:text-red-400">
                  Conflicts Detected in Generated Paths
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Some combinations already exist with different results. These steps will be
                  skipped when saving. Consider regenerating or deselecting paths with conflicts.
                </p>
              </div>
            </div>
          )}

          {/* Header with Controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="text-lg font-bold text-text-primary">
              Generated Paths to &quot;{targetInput}&quot;
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="px-3 py-1.5 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
              >
                Select None
              </button>
              <button
                onClick={regenerate}
                disabled={isGenerating}
                className="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg border-[2px] border-black flex items-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Regenerate
              </button>
            </div>
          </div>

          {/* Paths Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {paths.map((path) => (
              <PathCardWithCheckbox
                key={path.id}
                path={path}
                isSelected={selectedPaths.has(path.id)}
                onToggle={() => togglePathSelection(path.id)}
                onDeleteConflict={deleteConflict}
              />
            ))}
          </div>

          {/* Save Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={saveSelectedPaths}
              disabled={isSaving || selectedPaths.size === 0}
              className="px-8 py-4 bg-green-500 text-white text-lg font-bold rounded-xl border-[3px] border-black hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-3"
              style={{ boxShadow: '4px 4px 0px rgba(0, 0, 0, 1)' }}
            >
              {isSaving ? (
                <>
                  <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  Saving {selectedPaths.size} Path{selectedPaths.size !== 1 ? 's' : ''}...
                </>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  Save {selectedPaths.size} Selected Path{selectedPaths.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isGenerating && !paths && !error && (
        <div className="p-8 text-center bg-gray-50 dark:bg-gray-900 rounded-lg border-[2px] border-dashed border-gray-300 dark:border-gray-600">
          <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-text-secondary">
            Enter a target element to generate paths
          </p>
          <p className="text-sm text-gray-500 mt-1">
            The AI will create 3 different paths from Earth, Water, Fire, and Wind
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * ValidationBadge - Shows validation status for a step
 */
function ValidationBadge({ validation }) {
  if (!validation) return null;

  const { status, emojiMismatch } = validation;

  if (status === 'conflict') {
    return (
      <div
        className="flex items-center gap-1 text-red-500"
        title="Conflict: different result exists"
      >
        <XCircle className="w-4 h-4 flex-shrink-0" />
      </div>
    );
  }

  if (status === 'exists') {
    return (
      <div
        className="flex items-center gap-1 text-amber-500"
        title={
          emojiMismatch ? `Exists (emoji differs: ${emojiMismatch.existing})` : 'Already exists'
        }
      >
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      </div>
    );
  }

  // status === 'new'
  return (
    <div className="flex items-center gap-1 text-green-500" title="New combination">
      <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
    </div>
  );
}

/**
 * PathCardWithCheckbox - Path card with selection checkbox
 */
function PathCardWithCheckbox({ path, isSelected, onToggle, onDeleteConflict }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [deletingConflict, setDeletingConflict] = useState(null);

  const getPathColors = (label) => {
    const lowerLabel = label.toLowerCase();
    // Short path - blue (quickest route)
    if (lowerLabel.includes('short') || lowerLabel.includes('direct')) {
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-500',
        text: 'text-blue-600 dark:text-blue-400',
        checkbox: 'accent-blue-500',
      };
    }
    // Medium path - purple (balanced route)
    if (lowerLabel.includes('medium') || lowerLabel.includes('creative')) {
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-500',
        text: 'text-purple-600 dark:text-purple-400',
        checkbox: 'accent-purple-500',
      };
    }
    // Long path - amber (extended journey)
    return {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      checkbox: 'accent-amber-500',
    };
  };

  const colors = getPathColors(path.label);
  const finalStep = path.steps[path.steps.length - 1];
  const validationSummary = path.validationSummary;

  return (
    <div
      className={`${colors.bg} border-[3px] ${colors.border} rounded-xl overflow-hidden ${
        isSelected ? 'ring-4 ring-green-500/50' : 'opacity-70'
      } transition-all cursor-pointer`}
      onClick={onToggle}
    >
      {/* Header */}
      <div className="p-4 border-b-[2px] border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggle}
              onClick={(e) => e.stopPropagation()}
              className={`w-5 h-5 rounded ${colors.checkbox}`}
            />
            <div>
              <h4 className={`font-bold ${colors.text}`}>{path.label}</h4>
              <p className="text-sm text-text-secondary">
                {path.steps.length} step{path.steps.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl">{path.targetEmoji}</span>
            <p className="text-xs text-text-secondary">{finalStep.result}</p>
          </div>
        </div>
        {/* Validation Summary */}
        {validationSummary && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {validationSummary.new > 0 && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                {validationSummary.new} new
              </span>
            )}
            {validationSummary.existing > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                {validationSummary.existing} existing
              </span>
            )}
            {validationSummary.conflicts > 0 && (
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full font-bold">
                ⚠️ {validationSummary.conflicts} conflict
                {validationSummary.conflicts !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Steps */}
      <div className="p-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left text-sm font-bold text-text-secondary mb-2 flex items-center gap-1"
        >
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
          {isExpanded ? 'Hide' : 'Show'} Steps
        </button>

        {isExpanded && (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {path.steps.map((step, idx) => {
              const isConflict = step.validation?.status === 'conflict';
              const isExists = step.validation?.status === 'exists';
              const conflict = step.validation?.conflict;

              return (
                <div key={idx} className="space-y-1">
                  <div
                    className={`flex items-center gap-2 text-sm bg-white dark:bg-gray-800 rounded-lg p-2 border-2 ${
                      isConflict
                        ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                        : isExists
                          ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-black/10 dark:border-white/10'
                    }`}
                  >
                    <span className="text-xs font-bold text-gray-400 w-5">{step.step}.</span>
                    <span className="text-lg">{step.emojiA}</span>
                    <span className="font-medium truncate max-w-[60px]" title={step.elementA}>
                      {step.elementA}
                    </span>
                    <span className="text-gray-400">+</span>
                    <span className="text-lg">{step.emojiB}</span>
                    <span className="font-medium truncate max-w-[60px]" title={step.elementB}>
                      {step.elementB}
                    </span>
                    <span className="text-gray-400">=</span>
                    <span className={`text-lg ${isConflict ? 'line-through opacity-50' : ''}`}>
                      {step.resultEmoji}
                    </span>
                    <span
                      className={`font-bold truncate flex-1 ${isConflict ? 'line-through opacity-50' : ''}`}
                      title={step.result}
                    >
                      {step.result}
                    </span>
                    <ValidationBadge validation={step.validation} />
                  </div>
                  {/* Show conflict details with delete option */}
                  {conflict && (
                    <div className="ml-6 text-xs p-2 bg-red-100 dark:bg-red-900/30 rounded border border-red-300 dark:border-red-700">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-red-600 dark:text-red-400">
                          <strong>Existing:</strong> {conflict.existingEmoji}{' '}
                          {conflict.existingResult}
                        </span>
                        {onDeleteConflict && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingConflict(idx);
                              onDeleteConflict(step.elementA, step.elementB, idx);
                            }}
                            disabled={deletingConflict === idx}
                            className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                            title="Delete existing combination to allow new one"
                          >
                            {deletingConflict === idx ? (
                              <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            Delete & Use New
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * PathwayBuilder - Build entire pathways manually with live search
 */
function PathwayBuilder() {
  const [rows, setRows] = useState([
    { id: 1, elementA: '', elementB: '', result: '', emojiA: '', emojiB: '', resultEmoji: '' },
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedPathway, setSavedPathway] = useState(null);
  const [isEditingEmojis, setIsEditingEmojis] = useState(false);

  // Add a new row
  const addRow = useCallback(() => {
    setRows((prev) => [
      ...prev,
      {
        id: Date.now(),
        elementA: '',
        elementB: '',
        result: '',
        emojiA: '',
        emojiB: '',
        resultEmoji: '',
      },
    ]);
  }, []);

  // Remove a row
  const removeRow = useCallback((id) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }, []);

  // Update a row field
  const updateRow = useCallback((id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }, []);

  // Check if pathway is valid
  const isValid = rows.every(
    (row) => row.elementA.trim() && row.elementB.trim() && row.result.trim()
  );

  // Get the final element (result of last row)
  const finalElement = rows[rows.length - 1]?.result?.trim() || '';

  // Save the pathway
  const savePathway = useCallback(async () => {
    if (!isValid || !finalElement) return;

    setIsSaving(true);
    setError(null);
    setSavedPathway(null);

    try {
      const token = await authService.getToken();
      const response = await fetch('/api/admin/daily-alchemy/manual-pathway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          steps: rows.map((row) => ({
            elementA: row.elementA.trim(),
            elementB: row.elementB.trim(),
            result: row.result.trim(),
            emojiA: row.emojiA || undefined,
            emojiB: row.emojiB || undefined,
            resultEmoji: row.resultEmoji || undefined,
          })),
          finalElement,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to save pathway');
      }

      logger.info('[PathwayBuilder] Pathway saved', data);
      setSavedPathway(data);
      setIsEditingEmojis(true);
    } catch (err) {
      logger.error('[PathwayBuilder] Save error', { error: err.message });
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [rows, isValid, finalElement]);

  // Reset to build a new pathway
  const resetPathway = useCallback(() => {
    setRows([
      { id: 1, elementA: '', elementB: '', result: '', emojiA: '', emojiB: '', resultEmoji: '' },
    ]);
    setSavedPathway(null);
    setIsEditingEmojis(false);
    setError(null);
  }, []);

  // If we have a saved pathway and are editing emojis, show that view
  if (savedPathway && isEditingEmojis) {
    return (
      <EmojiEditor
        pathway={savedPathway.pathway}
        saveResults={savedPathway}
        onDone={resetPathway}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border-[3px] border-purple-500 p-6">
        <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Build a Pathway
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Add rows to build a complete pathway. Start from starter elements and work toward your
          target. Emojis are optional - AI will generate them if needed.
        </p>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-[2px] border-red-500 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Pathway Rows */}
        <div className="space-y-3">
          {rows.map((row, idx) => (
            <PathwayRow
              key={row.id}
              row={row}
              index={idx}
              onUpdate={(field, value) => updateRow(row.id, field, value)}
              onRemove={() => removeRow(row.id)}
              canRemove={rows.length > 1}
            />
          ))}
        </div>

        {/* Add Row Button */}
        <button
          onClick={addRow}
          className="mt-4 px-4 py-2 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 font-bold rounded-lg border-[2px] border-purple-500 border-dashed hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Step
        </button>

        {/* Save Button */}
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            {rows.length} step{rows.length !== 1 ? 's' : ''}
            {finalElement && (
              <span>
                {' '}
                → <span className="font-bold text-purple-600">{finalElement}</span>
              </span>
            )}
          </div>
          <button
            onClick={savePathway}
            disabled={isSaving || !isValid}
            className="px-6 py-3 bg-purple-500 text-white font-bold rounded-lg border-[2px] border-black hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Pathway
              </>
            )}
          </button>
        </div>
      </div>

      {/* Starter Elements Reference */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border-[2px] border-dashed border-gray-300 dark:border-gray-600 p-4">
        <h4 className="font-bold text-text-secondary mb-2">Starter Elements</h4>
        <div className="flex flex-wrap gap-3">
          {STARTER_ELEMENTS.map((el) => (
            <span
              key={el.id}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 text-sm flex items-center gap-1.5"
            >
              <span>{el.emoji}</span>
              <span className="font-medium">{el.name}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * PathwayRow - A single row in the pathway builder with live search
 */
function PathwayRow({ row, index, onUpdate, onRemove, canRemove }) {
  const [suggestions, setSuggestions] = useState({ a: [], b: [], result: [] });
  const [showSuggestions, setShowSuggestions] = useState({ a: false, b: false, result: false });

  // Search for elements
  const searchElements = useCallback(async (query) => {
    if (!query || query.length < 1) return [];

    try {
      const token = await authService.getToken();
      const response = await fetch(
        `/api/admin/daily-alchemy/elements?q=${encodeURIComponent(query)}&limit=6`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.elements || [];
      }
    } catch (err) {
      logger.error('[PathwayRow] Search error', { error: err.message });
    }
    return [];
  }, []);

  // Handle element search
  const handleSearch = useCallback(
    async (field, value) => {
      onUpdate(field === 'a' ? 'elementA' : field === 'b' ? 'elementB' : 'result', value);

      if (value.length >= 1) {
        const results = await searchElements(value);
        // Include starter elements in suggestions
        const starters = STARTER_ELEMENTS.filter((s) =>
          s.name.toLowerCase().includes(value.toLowerCase())
        ).map((s) => ({ name: s.name, emoji: s.emoji }));
        const combined = [
          ...starters,
          ...results.filter((r) => !starters.find((s) => s.name === r.name)),
        ].slice(0, 6);
        setSuggestions((prev) => ({ ...prev, [field]: combined }));
        setShowSuggestions((prev) => ({ ...prev, [field]: true }));
      } else {
        setShowSuggestions((prev) => ({ ...prev, [field]: false }));
      }
    },
    [onUpdate, searchElements]
  );

  // Select suggestion
  const selectSuggestion = useCallback(
    (field, element) => {
      const fieldKey = field === 'a' ? 'elementA' : field === 'b' ? 'elementB' : 'result';
      const emojiKey = field === 'a' ? 'emojiA' : field === 'b' ? 'emojiB' : 'resultEmoji';
      onUpdate(fieldKey, element.name);
      onUpdate(emojiKey, element.emoji);
      setShowSuggestions((prev) => ({ ...prev, [field]: false }));
    },
    [onUpdate]
  );

  const closeSuggestions = useCallback((field) => {
    setTimeout(() => setShowSuggestions((prev) => ({ ...prev, [field]: false })), 200);
  }, []);

  return (
    <div className="flex items-center gap-2 p-3 bg-white dark:bg-gray-800 rounded-lg border-[2px] border-black/10 dark:border-white/10">
      {/* Step number */}
      <span className="text-xs font-bold text-gray-400 w-6">{index + 1}.</span>

      {/* Element A */}
      <div className="relative flex-1 min-w-[100px]">
        <div className="flex items-center gap-1">
          {row.emojiA && <span className="text-lg">{row.emojiA}</span>}
          <input
            type="text"
            value={row.elementA}
            onChange={(e) => handleSearch('a', e.target.value)}
            onFocus={() => row.elementA && handleSearch('a', row.elementA)}
            onBlur={() => closeSuggestions('a')}
            placeholder="Element A"
            className="w-full px-2 py-1.5 rounded border-[2px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-primary text-sm font-medium"
          />
        </div>
        {showSuggestions.a && suggestions.a.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-white rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {suggestions.a.map((s, i) => (
              <button
                key={i}
                onClick={() => selectSuggestion('a', s)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                <span>{s.emoji}</span>
                <span className="font-medium">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="text-lg font-bold text-purple-500">+</span>

      {/* Element B */}
      <div className="relative flex-1 min-w-[100px]">
        <div className="flex items-center gap-1">
          {row.emojiB && <span className="text-lg">{row.emojiB}</span>}
          <input
            type="text"
            value={row.elementB}
            onChange={(e) => handleSearch('b', e.target.value)}
            onFocus={() => row.elementB && handleSearch('b', row.elementB)}
            onBlur={() => closeSuggestions('b')}
            placeholder="Element B"
            className="w-full px-2 py-1.5 rounded border-[2px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-primary text-sm font-medium"
          />
        </div>
        {showSuggestions.b && suggestions.b.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-white rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {suggestions.b.map((s, i) => (
              <button
                key={i}
                onClick={() => selectSuggestion('b', s)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                <span>{s.emoji}</span>
                <span className="font-medium">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="text-lg font-bold text-purple-500">=</span>

      {/* Result */}
      <div className="relative flex-1 min-w-[120px]">
        <div className="flex items-center gap-1">
          {row.resultEmoji && <span className="text-lg">{row.resultEmoji}</span>}
          <input
            type="text"
            value={row.result}
            onChange={(e) => handleSearch('result', e.target.value)}
            onFocus={() => row.result && handleSearch('result', row.result)}
            onBlur={() => closeSuggestions('result')}
            placeholder="Result"
            className="w-full px-2 py-1.5 rounded border-[2px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-primary text-sm font-bold"
          />
        </div>
        {showSuggestions.result && suggestions.result.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-white rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {suggestions.result.map((s, i) => (
              <button
                key={i}
                onClick={() => selectSuggestion('result', s)}
                className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-sm"
              >
                <span>{s.emoji}</span>
                <span className="font-medium">{s.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Remove button */}
      {canRemove && (
        <button
          onClick={onRemove}
          className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
          title="Remove step"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

/**
 * EmojiEditor - Edit emojis for elements after saving a pathway
 */
function EmojiEditor({ pathway, saveResults, onDone }) {
  const [editedEmojis, setEditedEmojis] = useState(() => {
    // Build initial emoji map from pathway
    const map = {};
    for (const step of pathway.steps) {
      map[step.elementA] = step.emojiA;
      map[step.elementB] = step.emojiB;
      map[step.result] = step.resultEmoji;
    }
    return map;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Get unique elements
  const uniqueElements = [
    ...new Set(pathway.steps.flatMap((s) => [s.elementA, s.elementB, s.result])),
  ];

  // Update an emoji
  const updateEmoji = useCallback((elementName, newEmoji) => {
    setEditedEmojis((prev) => ({ ...prev, [elementName]: newEmoji }));
  }, []);

  // Save emoji updates
  const saveEmojis = useCallback(async () => {
    const updates = uniqueElements
      .filter(
        (name) =>
          editedEmojis[name] !==
          pathway.steps.find((s) => s.elementA === name || s.elementB === name || s.result === name)
            ?.resultEmoji
      )
      .map((name) => ({ elementName: name, newEmoji: editedEmojis[name] }));

    if (updates.length === 0) {
      onDone();
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const token = await authService.getToken();
      const response = await fetch('/api/admin/daily-alchemy/manual-pathway', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to update emojis');
      }

      logger.info('[EmojiEditor] Emojis updated', data);
      onDone();
    } catch (err) {
      logger.error('[EmojiEditor] Save error', { error: err.message });
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [editedEmojis, uniqueElements, pathway, onDone]);

  return (
    <div className="space-y-4">
      {/* Success Banner */}
      <div className="p-4 bg-green-50 dark:bg-green-900/20 border-[2px] border-green-500 rounded-lg flex items-start gap-3">
        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-green-600 dark:text-green-400">Pathway Saved!</p>
          <p className="text-sm text-green-600 dark:text-green-400">
            Created {saveResults.created} new combination{saveResults.created !== 1 ? 's' : ''}
            {saveResults.skipped > 0 && `, ${saveResults.skipped} already existed`}
          </p>
          {saveResults.conflicts && saveResults.conflicts.length > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              ⚠️ {saveResults.conflicts.length} conflict
              {saveResults.conflicts.length !== 1 ? 's' : ''} (kept existing)
            </p>
          )}
        </div>
      </div>

      {/* Emoji Editor */}
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border-[3px] border-purple-500 p-6">
        <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
          <Pencil className="w-5 h-5" />
          Edit Element Emojis
        </h3>
        <p className="text-sm text-text-secondary mb-4">
          Review and edit the emojis for each element in your pathway.
        </p>

        {saveError && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-[2px] border-red-500 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
          </div>
        )}

        {/* Elements Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {uniqueElements.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-lg border-[2px] border-black/10 dark:border-white/10"
            >
              <input
                type="text"
                value={editedEmojis[name] || ''}
                onChange={(e) => updateEmoji(name, e.target.value.slice(0, 4))}
                className="w-12 px-2 py-1 text-xl text-center rounded border-[2px] border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
                maxLength={4}
              />
              <span className="font-medium text-sm text-text-primary truncate" title={name}>
                {name}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={onDone}
            className="px-4 py-2 text-text-secondary font-bold hover:text-text-primary transition-colors"
          >
            Skip Editing
          </button>
          <button
            onClick={saveEmojis}
            disabled={isSaving}
            className="px-6 py-3 bg-purple-500 text-white font-bold rounded-lg border-[2px] border-black hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Save & Done
              </>
            )}
          </button>
        </div>
      </div>

      {/* Pathway Preview */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border-[2px] border-dashed border-gray-300 dark:border-gray-600 p-4">
        <h4 className="font-bold text-text-secondary mb-3 flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Pathway Preview
        </h4>
        <div className="space-y-2">
          {pathway.steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700"
            >
              <span className="text-xs font-bold text-gray-400 w-5">{step.step}.</span>
              <span className="text-lg">{editedEmojis[step.elementA] || step.emojiA}</span>
              <span className="font-medium">{step.elementA}</span>
              <span className="text-gray-400">+</span>
              <span className="text-lg">{editedEmojis[step.elementB] || step.emojiB}</span>
              <span className="font-medium">{step.elementB}</span>
              <span className="text-gray-400">=</span>
              <span className="text-lg">{editedEmojis[step.result] || step.resultEmoji}</span>
              <span className="font-bold">{step.result}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * SingleComboEntry - Form for manually adding a single element combination
 */
function SingleComboEntry() {
  const [elementA, setElementA] = useState('');
  const [elementB, setElementB] = useState('');
  const [result, setResult] = useState('');
  const [emoji, setEmoji] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState({ a: false, b: false, result: false });
  const [suggestions, setSuggestions] = useState([]);
  const [resultSuggestions, setResultSuggestions] = useState([]);

  // Conflict detection state
  const [existingCombo, setExistingCombo] = useState(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  // Search for elements
  const searchElements = useCallback(async (query) => {
    if (!query || query.length < 1) return [];

    try {
      const token = await authService.getToken();
      const response = await fetch(
        `/api/admin/daily-alchemy/elements?q=${encodeURIComponent(query)}&limit=8`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.elements || [];
      }
    } catch (err) {
      logger.error('[ManualComboEntry] Search error', { error: err.message });
    }
    return [];
  }, []);

  // Check if combination already exists
  const checkExistingCombination = useCallback(async (elA, elB) => {
    if (!elA?.trim() || !elB?.trim()) {
      setExistingCombo(null);
      return;
    }

    setIsCheckingConflict(true);
    try {
      const token = await authService.getToken();
      const response = await fetch(
        `/api/admin/daily-alchemy/check-combination?elementA=${encodeURIComponent(elA.trim())}&elementB=${encodeURIComponent(elB.trim())}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.exists) {
          setExistingCombo({
            result: data.result,
            emoji: data.emoji,
          });
        } else {
          setExistingCombo(null);
        }
      }
    } catch (err) {
      logger.error('[ManualComboEntry] Conflict check error', { error: err.message });
      setExistingCombo(null);
    } finally {
      setIsCheckingConflict(false);
    }
  }, []);

  const handleElementSearch = useCallback(
    async (field, value) => {
      if (field === 'a') {
        setElementA(value);
      } else {
        setElementB(value);
      }

      if (value.length >= 1) {
        const results = await searchElements(value);
        // Include starter elements in suggestions
        const starters = STARTER_ELEMENTS.filter((s) =>
          s.name.toLowerCase().includes(value.toLowerCase())
        ).map((s) => ({ name: s.name, emoji: s.emoji }));
        const combined = [
          ...starters,
          ...results.filter((r) => !starters.find((s) => s.name === r.name)),
        ];
        setSuggestions(combined.slice(0, 8));
        setShowSuggestions({ a: field === 'a', b: field === 'b' });
      } else {
        setShowSuggestions({ a: false, b: false });
      }
    },
    [searchElements]
  );

  const selectSuggestion = useCallback(
    (field, element) => {
      if (field === 'a') {
        setElementA(element.name);
        // Check for existing combination with current elementB
        checkExistingCombination(element.name, elementB);
      } else {
        setElementB(element.name);
        // Check for existing combination with current elementA
        checkExistingCombination(elementA, element.name);
      }
      setShowSuggestions({ a: false, b: false, result: false });
    },
    [elementA, elementB, checkExistingCombination]
  );

  // Search for result elements
  const handleResultSearch = useCallback(
    async (value) => {
      setResult(value);

      if (value.length >= 1) {
        const results = await searchElements(value);
        // Include starter elements in suggestions
        const starters = STARTER_ELEMENTS.filter((s) =>
          s.name.toLowerCase().includes(value.toLowerCase())
        ).map((s) => ({ name: s.name, emoji: s.emoji }));
        const combined = [
          ...starters,
          ...results.filter((r) => !starters.find((s) => s.name === r.name)),
        ];
        setResultSuggestions(combined.slice(0, 8));
        setShowSuggestions((prev) => ({ ...prev, result: true }));
      } else {
        setShowSuggestions((prev) => ({ ...prev, result: false }));
      }
    },
    [searchElements]
  );

  // Select result from suggestions
  const selectResultSuggestion = useCallback((element) => {
    setResult(element.name);
    setEmoji(element.emoji);
    setShowSuggestions((prev) => ({ ...prev, result: false }));
  }, []);

  // Debounced conflict check when typing (not selecting from dropdown)
  useEffect(() => {
    if (!elementA.trim() || !elementB.trim()) {
      setExistingCombo(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      checkExistingCombination(elementA, elementB);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [elementA, elementB, checkExistingCombination]);

  const handleSave = useCallback(async () => {
    // Validation - emoji is optional, AI will generate if needed
    if (!elementA.trim() || !elementB.trim() || !result.trim()) {
      setError('Please fill in element A, element B, and result');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await authService.getToken();

      // Use manual-pathway endpoint which auto-generates emojis if needed
      const response = await fetch('/api/admin/daily-alchemy/manual-pathway', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          steps: [
            {
              elementA: elementA.trim(),
              elementB: elementB.trim(),
              result: result.trim(),
              resultEmoji: emoji.trim() || undefined,
            },
          ],
          finalElement: result.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to save combination');
      }

      if (data.created > 0) {
        // Get the emoji from the response (which may have been AI-generated)
        const resultEmoji = data.pathway?.steps?.[0]?.resultEmoji || emoji || '✨';
        setSuccess(`Created: ${elementA} + ${elementB} = ${resultEmoji} ${result}`);
        // Clear form
        setElementA('');
        setElementB('');
        setResult('');
        setEmoji('');
        setExistingCombo(null);
      } else {
        setSuccess(`Combination already exists (${elementA} + ${elementB})`);
      }

      logger.info('[ManualComboEntry] Combination saved', {
        created: data.created,
        skipped: data.skipped,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }, [elementA, elementB, result, emoji]);

  return (
    <div className="space-y-6">
      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl border-[3px] border-purple-500 p-6">
        <h3 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-4 flex items-center gap-2">
          <Beaker className="w-5 h-5" />
          Add Element Combination
        </h3>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border-[2px] border-red-500 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border-[2px] border-green-500 rounded-lg flex items-center gap-2">
            <Check className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {/* Existing Combination Warning */}
        {existingCombo && (
          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border-[2px] border-amber-500 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                  Combination already exists
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  <span className="font-medium">{elementA}</span>
                  {' + '}
                  <span className="font-medium">{elementB}</span>
                  {' = '}
                  <span className="text-lg">{existingCombo.emoji}</span>{' '}
                  <span className="font-bold">{existingCombo.result}</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Checking indicator */}
        {isCheckingConflict && elementA && elementB && (
          <div className="mb-4 p-2 flex items-center gap-2 text-sm text-text-secondary">
            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            Checking for existing combination...
          </div>
        )}

        {/* Combination Formula */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Element A */}
          <div className="relative flex-1 min-w-[150px]">
            <input
              type="text"
              value={elementA}
              onChange={(e) => handleElementSearch('a', e.target.value)}
              onFocus={() => elementA && handleElementSearch('a', elementA)}
              onBlur={() =>
                setTimeout(() => setShowSuggestions({ ...showSuggestions, a: false }), 200)
              }
              placeholder="Element A"
              className="w-full px-4 py-3 rounded-lg border-[2px] border-black dark:border-white bg-white dark:bg-gray-700 text-text-primary font-medium"
            />
            {showSuggestions.a && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-white rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectSuggestion('a', s)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <span>{s.emoji}</span>
                    <span className="font-medium">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-2xl font-bold text-purple-600">+</span>

          {/* Element B */}
          <div className="relative flex-1 min-w-[150px]">
            <input
              type="text"
              value={elementB}
              onChange={(e) => handleElementSearch('b', e.target.value)}
              onFocus={() => elementB && handleElementSearch('b', elementB)}
              onBlur={() =>
                setTimeout(() => setShowSuggestions({ ...showSuggestions, b: false }), 200)
              }
              placeholder="Element B"
              className="w-full px-4 py-3 rounded-lg border-[2px] border-black dark:border-white bg-white dark:bg-gray-700 text-text-primary font-medium"
            />
            {showSuggestions.b && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-white rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectSuggestion('b', s)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <span>{s.emoji}</span>
                    <span className="font-medium">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span className="text-2xl font-bold text-purple-600">=</span>

          {/* Result Emoji - optional, AI will generate if empty */}
          <div className="w-20">
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
              placeholder="auto"
              title="Optional - AI will generate if empty"
              className="w-full px-3 py-3 rounded-lg border-[2px] border-dashed border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-700 text-text-primary text-2xl text-center placeholder:text-sm placeholder:text-gray-400"
              maxLength={4}
            />
          </div>

          {/* Result Name - Searchable */}
          <div className="relative flex-1 min-w-[150px]">
            <input
              type="text"
              value={result}
              onChange={(e) => handleResultSearch(e.target.value)}
              onFocus={() => result && handleResultSearch(result)}
              onBlur={() =>
                setTimeout(() => setShowSuggestions((prev) => ({ ...prev, result: false })), 200)
              }
              placeholder="Result Element (search or type new)"
              className="w-full px-4 py-3 rounded-lg border-[2px] border-black dark:border-white bg-white dark:bg-gray-700 text-text-primary font-bold"
            />
            {showSuggestions.result && resultSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-white rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {resultSuggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectResultSuggestion(s)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <span>{s.emoji}</span>
                    <span className="font-medium">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !elementA || !elementB || !result}
            className="px-6 py-3 bg-purple-500 text-white font-bold rounded-lg border-[2px] border-black hover:bg-purple-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
          >
            {isSaving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                Add Combination
              </>
            )}
          </button>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg border-[2px] border-dashed border-gray-300 dark:border-gray-600 p-4">
        <h4 className="font-bold text-text-secondary mb-2">Starter Elements</h4>
        <div className="flex flex-wrap gap-3">
          {STARTER_ELEMENTS.map((el) => (
            <span
              key={el.id}
              className="px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 text-sm flex items-center gap-1.5"
            >
              <span>{el.emoji}</span>
              <span className="font-medium">{el.name}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * ElementBrowser - Browse all elements with letter filtering, search, and pagination
 */
function ElementBrowser({ onSelectElement, externalSearch = '', onSearchChange }) {
  const [elements, setElements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLetter, setSelectedLetter] = useState('all');
  const [letterCounts, setLetterCounts] = useState({});
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [localSearch, setLocalSearch] = useState(externalSearch);

  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Sync local search with external
  useEffect(() => {
    setLocalSearch(externalSearch);
  }, [externalSearch]);

  // Handle search input change
  const handleSearchChange = useCallback(
    (value) => {
      setLocalSearch(value);
      onSearchChange?.(value);
    },
    [onSearchChange]
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Fetch elements
  const fetchElements = useCallback(async (letter = 'all', page = 1, search = '') => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await authService.getToken();
      const params = new URLSearchParams({
        letter,
        page: String(page),
        limit: '100',
      });
      if (search) {
        params.set('search', search);
      }

      const response = await fetch(`/api/admin/daily-alchemy/elements/browse?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to fetch elements');
      }

      setElements(data.elements || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      if (data.letterCounts) {
        setLetterCounts(data.letterCounts);
      }
    } catch (err) {
      logger.error('[ElementBrowser] Fetch error', { error: err.message });
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchElements('all', 1, '');
  }, [fetchElements]);

  // React to debounced search changes
  useEffect(() => {
    if (debouncedSearch) {
      setSelectedLetter('all');
      fetchElements('all', 1, debouncedSearch);
    } else if (debouncedSearch === '' && selectedLetter === 'all') {
      fetchElements('all', 1, '');
    }
  }, [debouncedSearch, fetchElements, selectedLetter]);

  // Handle letter filter change
  const handleLetterChange = useCallback(
    (letter) => {
      setSelectedLetter(letter);
      fetchElements(letter, 1, debouncedSearch);
    },
    [fetchElements, debouncedSearch]
  );

  // Handle page change
  const handlePageChange = useCallback(
    (newPage) => {
      fetchElements(selectedLetter, newPage, debouncedSearch);
    },
    [selectedLetter, debouncedSearch, fetchElements]
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-[3px] border-black dark:border-white p-6">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Grid3X3 className="w-5 h-5" />
          Element Library ({pagination.total})
        </h3>
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search elements..."
            className="w-full px-4 py-2 pl-10 rounded-lg border-[2px] border-black dark:border-white bg-white dark:bg-gray-700 text-text-primary"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          {localSearch && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Letter Filter Row */}
      <div className="flex flex-wrap gap-1 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => handleLetterChange('all')}
          className={`px-3 py-1.5 text-sm font-bold rounded-lg border-[2px] transition-all ${
            selectedLetter === 'all'
              ? 'bg-blue-500 text-white border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
              : 'bg-gray-100 dark:bg-gray-700 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          All
        </button>
        {LETTERS.map((letter) => {
          const count = letterCounts[letter] || 0;
          const hasElements = count > 0;
          return (
            <button
              key={letter}
              onClick={() => handleLetterChange(letter)}
              className={`w-8 h-8 text-sm font-bold rounded-lg border-[2px] transition-all ${
                selectedLetter === letter
                  ? 'bg-blue-500 text-white border-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                  : hasElements
                    ? 'bg-gray-100 dark:bg-gray-700 border-transparent hover:bg-gray-200 dark:hover:bg-gray-600'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={hasElements ? `${count} elements` : 'No elements starting with this letter'}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 border-[2px] border-red-500 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      )}

      {/* Element Grid */}
      {!isLoading && elements.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
          {elements.map((element) => (
            <button
              key={element.name}
              onClick={() => onSelectElement(element)}
              className="flex flex-col items-center p-2 rounded-lg border-[2px] border-black dark:border-white bg-gray-50 dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:border-blue-500 transition-all group"
              title={element.name}
            >
              <span className="text-2xl mb-1">{element.emoji}</span>
              <div className="w-full overflow-hidden">
                <span
                  className={`text-xs font-medium text-text-primary whitespace-nowrap block text-center group-hover:text-blue-600 dark:group-hover:text-blue-400 ${
                    element.name.length > 10 ? 'group-hover:animate-scroll-text' : ''
                  }`}
                  style={{
                    display: 'block',
                    animation: element.name.length > 10 ? undefined : 'none',
                  }}
                >
                  {element.name}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && elements.length === 0 && (
        <div className="py-12 text-center">
          <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-text-secondary font-medium">No elements found</p>
          <p className="text-sm text-gray-500 mt-1">
            {debouncedSearch ? 'Try a different search term' : 'No elements start with this letter'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-text-secondary">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} elements)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 text-sm font-bold rounded-lg border-[2px] border-black dark:border-white bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 text-sm font-bold rounded-lg border-[2px] border-black dark:border-white bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ElementDetailModal - Modal showing element details, combinations, and edit/delete options
 */
/**
 * ElementSearchInput - Live search input for selecting elements
 */
function ElementSearchInput({ value, onChange, onSelect, placeholder = 'Search elements...' }) {
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!value || value.length < 1) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const token = await authService.getToken();
        const response = await fetch(
          `/api/admin/daily-alchemy/elements?q=${encodeURIComponent(value)}&limit=10`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await response.json();
        if (response.ok) {
          setSearchResults(data.elements || []);
        }
      } catch (err) {
        logger.error('[ElementSearchInput] Search error', { error: err.message });
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border-[2px] border-black dark:border-white bg-white dark:bg-gray-700 text-sm"
      />
      {isSearching && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
      )}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-white rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {searchResults.map((el) => (
            <button
              key={el.name}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(el);
                setShowDropdown(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2"
            >
              <span>{el.emoji}</span>
              <span>{el.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * AddCombinationForm - Form for adding a new combination
 */
function AddCombinationForm({ elementName, elementEmoji, mode, onSave, onCancel }) {
  // mode: 'createdBy' (element is result) or 'usedIn' (element is input)
  const [elementA, setElementA] = useState(mode === 'usedIn' ? elementName : '');
  const [elementB, setElementB] = useState('');
  const [result, setResult] = useState(mode === 'createdBy' ? elementName : '');
  // For 'createdBy' mode, use the existing element's emoji as default
  const [emoji, setEmoji] = useState(mode === 'createdBy' && elementEmoji ? elementEmoji : '✨');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!elementA.trim() || !elementB.trim() || !result.trim()) {
      setError('All fields are required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = await authService.getToken();
      const response = await fetch('/api/admin/daily-alchemy/combinations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          elementA: elementA.trim(),
          elementB: elementB.trim(),
          result: result.trim(),
          emoji: emoji.trim() || '✨',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to create combination');
      }

      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-[2px] border-yellow-500">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {mode === 'createdBy' ? (
          <>
            <div className="flex-1 min-w-[100px]">
              <ElementSearchInput
                value={elementA}
                onChange={setElementA}
                onSelect={(el) => setElementA(el.name)}
                placeholder="Element A"
              />
            </div>
            <span className="text-blue-500 font-bold">+</span>
            <div className="flex-1 min-w-[100px]">
              <ElementSearchInput
                value={elementB}
                onChange={setElementB}
                onSelect={(el) => setElementB(el.name)}
                placeholder="Element B"
              />
            </div>
            <span className="text-gray-400">=</span>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-12 px-2 py-2 rounded-lg border-[2px] border-black dark:border-white text-center text-sm"
              placeholder="✨"
            />
            <span className="font-bold text-sm bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
              {result}
            </span>
          </>
        ) : (
          <>
            <span className="font-bold text-sm bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
              {elementA}
            </span>
            <span className="text-blue-500 font-bold">+</span>
            <div className="flex-1 min-w-[100px]">
              <ElementSearchInput
                value={elementB}
                onChange={setElementB}
                onSelect={(el) => setElementB(el.name)}
                placeholder="Other Element"
              />
            </div>
            <span className="text-gray-400">=</span>
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className="w-12 px-2 py-2 rounded-lg border-[2px] border-black dark:border-white text-center text-sm"
              placeholder="✨"
            />
            <div className="flex-1 min-w-[100px]">
              <ElementSearchInput
                value={result}
                onChange={setResult}
                onSelect={(el) => {
                  setResult(el.name);
                  setEmoji(el.emoji || '✨');
                }}
                placeholder="Result"
              />
            </div>
          </>
        )}
      </div>
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-3 py-1.5 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-text-primary text-sm font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * CombinationRowEditable - Single combination row with edit/delete capability
 */
function CombinationRowEditable({ combo, mode, onRefresh }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const token = await authService.getToken();
      const params = new URLSearchParams({
        elementA: combo.elementA,
        elementB: combo.elementB,
      });
      const response = await fetch(`/api/admin/daily-alchemy/combinations?${params}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }

      onRefresh();
    } catch (err) {
      logger.error('[CombinationRowEditable] Delete error', { error: err.message });
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">
        <span className="text-red-600 dark:text-red-400 font-medium">Delete this combination?</span>
        <div className="flex gap-2">
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded hover:bg-red-600 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Yes'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs font-bold rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            No
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm group">
      {mode === 'createdBy' ? (
        <>
          <span className="font-medium">{combo.elementA}</span>
          <span className="text-blue-500 font-bold">+</span>
          <span className="font-medium">{combo.elementB}</span>
        </>
      ) : (
        <>
          <span className="font-medium">{combo.elementA}</span>
          <span className="text-blue-500 font-bold">+</span>
          <span className="font-medium">{combo.elementB}</span>
          <span className="text-gray-400">=</span>
          <span className="text-lg">{combo.resultEmoji}</span>
          <span className="font-bold">{combo.result}</span>
        </>
      )}
      {combo.useCount > 0 && mode === 'createdBy' && (
        <span className="ml-auto text-xs text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">
          {combo.useCount}× used
        </span>
      )}
      <button
        onClick={() => setShowConfirm(true)}
        className="ml-auto p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete combination"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function ElementDetailModal({ element, onClose, onElementUpdated, onElementDeleted }) {
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(element.name);
  const [editEmoji, setEditEmoji] = useState(element.emoji);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showAddCreatedBy, setShowAddCreatedBy] = useState(false);
  const [showAddUsedIn, setShowAddUsedIn] = useState(false);

  // Fetch element details
  const fetchDetails = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await authService.getToken();
      const response = await fetch(
        `/api/admin/daily-alchemy/elements/${encodeURIComponent(element.name)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to fetch element details');
      }

      setDetails(data);
      setEditName(data.element?.name || element.name);
      setEditEmoji(data.element?.emoji || element.emoji);
    } catch (err) {
      logger.error('[ElementDetailModal] Fetch error', { error: err.message });
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [element.name, element.emoji]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Handle save edit
  const handleSaveEdit = async () => {
    if (!editName.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const token = await authService.getToken();
      const body = {};
      if (editName.trim() !== element.name) {
        body.newName = editName.trim();
      }
      if (editEmoji.trim() !== element.emoji) {
        body.newEmoji = editEmoji.trim();
      }

      if (Object.keys(body).length === 0) {
        setIsEditing(false);
        return;
      }

      const response = await fetch(
        `/api/admin/daily-alchemy/elements/${encodeURIComponent(element.name)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to update element');
      }

      logger.info('[ElementDetailModal] Element updated', { data });
      setIsEditing(false);
      onElementUpdated?.();
      // Refresh details with new name
      if (body.newName) {
        element.name = body.newName;
      }
      if (body.newEmoji) {
        element.emoji = body.newEmoji;
      }
      fetchDetails();
    } catch (err) {
      logger.error('[ElementDetailModal] Update error', { error: err.message });
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const token = await authService.getToken();
      const response = await fetch(
        `/api/admin/daily-alchemy/elements/${encodeURIComponent(element.name)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to delete element');
      }

      logger.info('[ElementDetailModal] Element deleted', { data });
      onElementDeleted?.();
    } catch (err) {
      logger.error('[ElementDetailModal] Delete error', { error: err.message });
      setError(err.message);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Close on escape
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !isEditing && !showDeleteConfirm) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, isEditing, showDeleteConfirm]);

  const isStarter = details?.element?.isStarter;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl border-4 border-black dark:border-white shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-[3px] border-black dark:border-white">
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={editEmoji}
                  onChange={(e) => setEditEmoji(e.target.value.slice(0, 4))}
                  className="w-16 px-2 py-1 text-3xl text-center rounded border-[2px] border-black dark:border-white bg-white dark:bg-gray-700"
                  maxLength={4}
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="px-3 py-1 text-xl font-bold rounded border-[2px] border-black dark:border-white bg-white dark:bg-gray-700"
                  placeholder="Element name"
                />
              </>
            ) : (
              <>
                <span className="text-4xl">{details?.element?.emoji || element.emoji}</span>
                <div>
                  <h2 className="text-xl font-bold text-text-primary">
                    {details?.element?.name || element.name}
                  </h2>
                  {isStarter && (
                    <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Starter Element
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editName.trim()}
                  className="px-3 py-1.5 bg-green-500 text-white text-sm font-bold rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditName(details?.element?.name || element.name);
                    setEditEmoji(details?.element?.emoji || element.emoji);
                  }}
                  disabled={isSaving}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-text-primary text-sm font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {!isStarter && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                      title="Edit element"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Delete element"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="p-4 bg-red-50 dark:bg-red-900/30 border-b-[2px] border-red-500">
            <p className="font-bold text-red-600 dark:text-red-400 mb-2">
              Delete &quot;{element.name}&quot;?
            </p>
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">
              This will delete {details?.stats?.waysToCreate || 0} combinations that create this
              element and {details?.stats?.usedInCombinations || 0} combinations that use it as an
              input. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Element
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-text-primary font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Error Display */}
          {error && (
            <div className="p-3 mb-4 bg-red-50 dark:bg-red-900/20 border-[2px] border-red-500 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          )}

          {/* Stats */}
          {!isLoading && details && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {details.stats?.waysToCreate || 0}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">Ways to Create</p>
              </div>
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {details.stats?.usedInCombinations || 0}
                </p>
                <p className="text-sm text-purple-600 dark:text-purple-400">Used In</p>
              </div>
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {details.stats?.totalUses || 0}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">Total Uses</p>
              </div>
            </div>
          )}

          {/* Combinations that create this element */}
          {!isLoading && !isStarter && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Created By ({details?.combinations?.length || 0})
                </h3>
                {!showAddCreatedBy && (
                  <button
                    onClick={() => setShowAddCreatedBy(true)}
                    className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    title="Add new combination"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {showAddCreatedBy && (
                  <AddCombinationForm
                    elementName={details?.element?.name || element.name}
                    elementEmoji={details?.element?.emoji || element.emoji}
                    mode="createdBy"
                    onSave={() => {
                      setShowAddCreatedBy(false);
                      fetchDetails();
                    }}
                    onCancel={() => setShowAddCreatedBy(false)}
                  />
                )}
                {details?.combinations?.map((combo, idx) => (
                  <CombinationRowEditable
                    key={idx}
                    combo={combo}
                    mode="createdBy"
                    onRefresh={fetchDetails}
                  />
                ))}
                {(!details?.combinations || details.combinations.length === 0) &&
                  !showAddCreatedBy && (
                    <p className="text-sm text-text-secondary text-center py-4">
                      No combinations create this element yet. Click + to add one.
                    </p>
                  )}
              </div>
            </div>
          )}

          {/* Starter element message */}
          {!isLoading && isStarter && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
              <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                This is a starter element. It cannot be created by combining other elements and
                cannot be edited or deleted.
              </p>
            </div>
          )}

          {/* Used in combinations */}
          {!isLoading && !isStarter && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Beaker className="w-5 h-5" />
                  Used to Create ({details?.usedIn?.length || 0})
                </h3>
                {!showAddUsedIn && (
                  <button
                    onClick={() => setShowAddUsedIn(true)}
                    className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                    title="Add new combination"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {showAddUsedIn && (
                  <AddCombinationForm
                    elementName={details?.element?.name || element.name}
                    elementEmoji={details?.element?.emoji || element.emoji}
                    mode="usedIn"
                    onSave={() => {
                      setShowAddUsedIn(false);
                      fetchDetails();
                    }}
                    onCancel={() => setShowAddUsedIn(false)}
                  />
                )}
                {details?.usedIn?.slice(0, 20).map((combo, idx) => (
                  <CombinationRowEditable
                    key={idx}
                    combo={combo}
                    mode="usedIn"
                    onRefresh={fetchDetails}
                  />
                ))}
                {details?.usedIn?.length > 20 && (
                  <p className="text-sm text-text-secondary text-center py-2">
                    And {details.usedIn.length - 20} more...
                  </p>
                )}
                {(!details?.usedIn || details.usedIn.length === 0) && !showAddUsedIn && (
                  <p className="text-sm text-text-secondary text-center py-4">
                    This element isn&apos;t used in any combinations yet. Click + to add one.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * FirstDiscoveriesSection - Display player-discovered elements grouped by week
 */
function FirstDiscoveriesSection() {
  const [discoveries, setDiscoveries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDiscovery, setSelectedDiscovery] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Fetch discoveries
  const fetchDiscoveries = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await authService.getToken();
      const response = await fetch(
        `/api/admin/daily-alchemy/first-discoveries?page=${page}&limit=200`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch discoveries');
      }

      setDiscoveries(data.discoveries || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      logger.error('[FirstDiscoveries] Fetch error', { error: err.message });
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscoveries();
  }, [fetchDiscoveries]);

  // Group discoveries by week
  const groupDiscoveriesByWeek = useCallback((items) => {
    if (!items || items.length === 0) return [];

    const groups = [];
    let currentWeekKey = null;
    let currentGroup = [];

    for (const discovery of items) {
      const date = new Date(discovery.discoveredAt);
      // Get start of week (Sunday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekKey = weekStart.toISOString().split('T')[0];

      if (currentWeekKey !== weekKey) {
        if (currentGroup.length > 0) {
          groups.push({ weekKey: currentWeekKey, discoveries: currentGroup });
        }
        currentWeekKey = weekKey;
        currentGroup = [discovery];
      } else {
        currentGroup.push(discovery);
      }
    }

    if (currentGroup.length > 0) {
      groups.push({ weekKey: currentWeekKey, discoveries: currentGroup });
    }

    return groups;
  }, []);

  // Format week label
  const formatWeekLabel = (weekStartStr) => {
    const weekStart = new Date(weekStartStr);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const format = (d) =>
      `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`;

    return `Week of ${format(weekStart)} - ${format(weekEnd)}`;
  };

  const weekGroups = groupDiscoveriesByWeek(discoveries);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border-[3px] border-black dark:border-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          Player First Discoveries
          {pagination.total > 0 && (
            <span className="text-sm font-normal text-text-secondary">({pagination.total})</span>
          )}
        </h3>
        <button
          onClick={() => fetchDiscoveries(pagination.page)}
          disabled={isLoading}
          className="px-3 py-1.5 text-sm font-medium rounded-lg border-[2px] border-black dark:border-white bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-1.5"
        >
          <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-[2px] border-red-500 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && discoveries.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-text-secondary">No player discoveries yet</p>
          <p className="text-sm text-text-secondary mt-1">
            First discoveries will appear here when players discover new elements
          </p>
        </div>
      )}

      {/* Discoveries grouped by week */}
      {!isLoading && !error && weekGroups.length > 0 && (
        <div className="space-y-8">
          {weekGroups.map(({ weekKey, discoveries: weekDiscoveries }) => (
            <div key={weekKey}>
              {/* Week separator */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent dark:via-amber-700" />
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 px-3 whitespace-nowrap">
                  {formatWeekLabel(weekKey)}
                </span>
                <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent dark:via-amber-700" />
              </div>

              {/* Grid for this week */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                {weekDiscoveries.map((discovery) => (
                  <button
                    key={discovery.id}
                    onClick={() => setSelectedDiscovery(discovery)}
                    className="flex flex-col items-center p-2 rounded-lg border-[2px] border-black dark:border-white bg-gray-50 dark:bg-gray-700 hover:bg-amber-50 dark:hover:bg-amber-900/30 hover:border-amber-500 transition-all group"
                    title={`${discovery.resultElement} - discovered by ${discovery.username || 'Anonymous'}`}
                  >
                    <span className="text-2xl mb-1">{discovery.resultEmoji}</span>
                    <div className="w-full overflow-hidden">
                      <span className="text-xs font-medium text-text-primary whitespace-nowrap block text-center group-hover:text-amber-600 dark:group-hover:text-amber-400 truncate">
                        {discovery.resultElement}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => fetchDiscoveries(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="p-2 rounded-lg border-[2px] border-black dark:border-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-medium text-text-secondary px-4">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchDiscoveries(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="p-2 rounded-lg border-[2px] border-black dark:border-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Discovery Detail Modal */}
      {selectedDiscovery && (
        <FirstDiscoveryDetailModal
          discovery={selectedDiscovery}
          onClose={() => setSelectedDiscovery(null)}
        />
      )}
    </div>
  );
}

/**
 * FirstDiscoveryDetailModal - Shows details of a first discovery
 */
function FirstDiscoveryDetailModal({ discovery, onClose }) {
  const cardRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSaveAsPng = async () => {
    if (!cardRef.current || isSaving) return;

    setIsSaving(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null, // Transparent to show the wrapper background
        scale: 2, // Higher resolution for social media
        useCORS: true,
        logging: false,
      });

      // Convert to base64 for sharing
      const dataUrl = canvas.toDataURL('image/png');

      // Try native share on iOS (allows saving to Photos)
      if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
        try {
          // Convert data URL to blob for sharing
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File(
            [blob],
            `first-discovery-${discovery.resultElement.toLowerCase().replace(/\s+/g, '-')}.png`,
            { type: 'image/png' }
          );

          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `First Discovery: ${discovery.resultElement}`,
            });
            return;
          }
        } catch (shareErr) {
          // If share fails, fall back to download
          logger.debug('[FirstDiscovery] Share failed, falling back to download', {
            error: shareErr.message,
          });
        }
      }

      // Fallback: download as file
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `first-discovery-${discovery.resultElement.toLowerCase().replace(/\s+/g, '-')}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (err) {
      logger.error('[FirstDiscovery] Failed to save PNG', { error: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl border-[3px] border-black dark:border-white p-6 max-w-md w-full shadow-[6px_6px_0px_rgba(0,0,0,1)] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Exportable card content - wrapper provides padding for shadow */}
        <div ref={cardRef} className="bg-white p-3 pb-[22px] pr-[22px]">
          {/* Outer card with fake shadow div for html2canvas compatibility */}
          <div className="relative">
            {/* Shadow element - positioned behind the card */}
            <div className="absolute top-[6px] left-[6px] right-[-6px] bottom-[-6px] bg-black rounded-xl" />
            {/* Main card */}
            <div className="relative bg-amber-50 rounded-xl border-[3px] border-black p-6">
              {/* Element display */}
              <div className="text-center mb-6">
                <span className="text-6xl mb-3 block">{discovery.resultEmoji}</span>
                <h3 className="text-2xl font-bold text-gray-900">{discovery.resultElement}</h3>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="text-amber-500">✨</span>
                  <span className="text-sm font-medium text-amber-600">First Discovery</span>
                </div>
              </div>

              {/* Combination that made it - with emojis and fake shadow */}
              <div className="relative mb-6">
                {/* Shadow element */}
                <div className="absolute top-[4px] left-[4px] right-[-4px] bottom-[-4px] bg-black rounded-xl" />
                {/* Main combining box */}
                <div className="relative bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-[2px] border-black p-4">
                  <p className="text-xs text-gray-500 mb-3 tracking-wide font-bold text-center">
                    Created By Combining
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-3xl mb-1">{discovery.elementAEmoji || '✨'}</span>
                      <span className="font-bold text-gray-900 text-sm">{discovery.elementA}</span>
                    </div>
                    <span className="text-blue-500 font-bold text-2xl">+</span>
                    <div className="flex flex-col items-center">
                      <span className="text-3xl mb-1">{discovery.elementBEmoji || '✨'}</span>
                      <span className="font-bold text-gray-900 text-sm">{discovery.elementB}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Discovery info - no time for export */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-200">
                  <span className="text-sm text-gray-500">Discovered by</span>
                  <span className="font-bold text-gray-900">
                    {discovery.username || 'Anonymous Player'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">Date</span>
                  <span className="font-medium text-gray-900">
                    {formatDate(discovery.discoveredAt)}
                  </span>
                </div>
              </div>

              {/* Branding */}
              <div className="mt-4 pt-4 border-t border-gray-200 text-center">
                <span className="text-xs font-bold text-gray-400">
                  tandemdaily.com/daily-alchemy
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSaveAsPng}
            disabled={isSaving}
            className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl border-[3px] border-black hover:bg-blue-600 transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            {isSaving ? 'Saving...' : 'Save as PNG'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-amber-500 text-white font-bold rounded-xl border-[3px] border-black hover:bg-amber-600 transition-colors shadow-[3px_3px_0px_rgba(0,0,0,1)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
