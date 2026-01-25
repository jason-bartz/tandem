'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Search,
  Sparkles,
  RotateCcw,
  Check,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  Plus,
  Beaker,
  BookOpen,
  GitBranch,
} from 'lucide-react';
import logger from '@/lib/logger';
import authService from '@/services/auth.service';
import { STARTER_ELEMENTS } from '@/lib/element-soup.constants';

/**
 * ElementManager - Standalone admin tool for managing element combinations
 * Features:
 * - Generate paths with multi-select (save multiple paths at once)
 * - Manually add individual combinations
 */
export default function ElementManager() {
  const [activeSection, setActiveSection] = useState('generator'); // 'generator', 'manual', or 'review'

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveSection('generator')}
          className={`px-4 py-2 font-bold rounded-lg border-[2px] border-black dark:border-white transition-all flex items-center gap-2 ${
            activeSection === 'generator'
              ? 'bg-green-500 text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-bg-card text-text-secondary hover:bg-green-100 dark:hover:bg-green-900/20'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Path Generator
        </button>
        <button
          onClick={() => setActiveSection('manual')}
          className={`px-4 py-2 font-bold rounded-lg border-[2px] border-black dark:border-white transition-all flex items-center gap-2 ${
            activeSection === 'manual'
              ? 'bg-purple-500 text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-bg-card text-text-secondary hover:bg-purple-100 dark:hover:bg-purple-900/20'
          }`}
        >
          <Beaker className="w-4 h-4" />
          Manual Entry
        </button>
        <button
          onClick={() => setActiveSection('review')}
          className={`px-4 py-2 font-bold rounded-lg border-[2px] border-black dark:border-white transition-all flex items-center gap-2 ${
            activeSection === 'review'
              ? 'bg-blue-500 text-white shadow-[3px_3px_0px_rgba(0,0,0,1)]'
              : 'bg-bg-card text-text-secondary hover:bg-blue-100 dark:hover:bg-blue-900/20'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Review
        </button>
      </div>

      {/* Content */}
      {activeSection === 'generator' && <MultiPathGenerator />}
      {activeSection === 'manual' && <ManualComboEntry />}
      {activeSection === 'review' && <CombinationReview />}
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
      const response = await fetch('/api/admin/element-soup/generate-path', {
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
          const response = await fetch('/api/admin/element-soup/generate-path', {
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
 * PathCardWithCheckbox - Path card with selection checkbox
 */
function PathCardWithCheckbox({ path, isSelected, onToggle }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getPathColors = (label) => {
    if (label.toLowerCase().includes('direct')) {
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-500',
        text: 'text-blue-600 dark:text-blue-400',
        checkbox: 'accent-blue-500',
      };
    }
    if (label.toLowerCase().includes('creative')) {
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-500',
        text: 'text-purple-600 dark:text-purple-400',
        checkbox: 'accent-purple-500',
      };
    }
    return {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      checkbox: 'accent-amber-500',
    };
  };

  const colors = getPathColors(path.label);
  const finalStep = path.steps[path.steps.length - 1];

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
            {path.steps.map((step, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 rounded-lg p-2 border border-black/10 dark:border-white/10"
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
                <span className="text-lg">{step.resultEmoji}</span>
                <span className="font-bold truncate flex-1" title={step.result}>
                  {step.result}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ManualComboEntry - Form for manually adding element combinations
 */
function ManualComboEntry() {
  const [elementA, setElementA] = useState('');
  const [elementB, setElementB] = useState('');
  const [result, setResult] = useState('');
  const [emoji, setEmoji] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Autocomplete state
  const [showSuggestions, setShowSuggestions] = useState({ a: false, b: false });
  const [suggestions, setSuggestions] = useState([]);

  // Conflict detection state
  const [existingCombo, setExistingCombo] = useState(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  // Search for elements
  const searchElements = useCallback(async (query) => {
    if (!query || query.length < 1) return [];

    try {
      const token = await authService.getToken();
      const response = await fetch(
        `/api/admin/element-soup/elements?q=${encodeURIComponent(query)}&limit=8`,
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
        `/api/admin/element-soup/check-combination?elementA=${encodeURIComponent(elA.trim())}&elementB=${encodeURIComponent(elB.trim())}`,
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
      setShowSuggestions({ a: false, b: false });
    },
    [elementA, elementB, checkExistingCombination]
  );

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
    // Validation
    if (!elementA.trim() || !elementB.trim() || !result.trim() || !emoji.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await authService.getToken();

      // Create a single-step path to save
      const path = {
        id: 'manual',
        steps: [
          {
            step: 1,
            elementA: elementA.trim(),
            emojiA: '?',
            elementB: elementB.trim(),
            emojiB: '?',
            result: result.trim(),
            resultEmoji: emoji.trim(),
          },
        ],
      };

      const response = await fetch('/api/admin/element-soup/generate-path', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          path,
          targetElement: result.trim(),
          targetEmoji: emoji.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to save combination');
      }

      if (data.created > 0) {
        setSuccess(`Created: ${elementA} + ${elementB} = ${emoji} ${result}`);
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

          {/* Result Emoji */}
          <div className="w-20">
            <input
              type="text"
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
              placeholder="🎯"
              className="w-full px-3 py-3 rounded-lg border-[2px] border-black dark:border-white bg-white dark:bg-gray-700 text-text-primary text-2xl text-center"
              maxLength={4}
            />
          </div>

          {/* Result Name */}
          <div className="flex-1 min-w-[150px]">
            <input
              type="text"
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="Result Element"
              className="w-full px-4 py-3 rounded-lg border-[2px] border-black dark:border-white bg-white dark:bg-gray-700 text-text-primary font-bold"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !elementA || !elementB || !result || !emoji}
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
 * CombinationReview - Search and view existing combinations with pathways
 */
function CombinationReview() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState(null);
  const [expandedPathways, setExpandedPathways] = useState(new Set());
  const [loadingPathways, setLoadingPathways] = useState(false);

  // Search for element and its combinations
  const searchElement = useCallback(async () => {
    if (!searchQuery.trim()) {
      setError('Please enter an element name to search');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResults(null);
    setExpandedPathways(new Set());

    try {
      const token = await authService.getToken();
      const response = await fetch(
        `/api/admin/element-soup/review?element=${encodeURIComponent(searchQuery.trim())}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Search failed');
      }

      setSearchResults(data);
      logger.info('[CombinationReview] Search results', {
        element: data.element,
        combinations: data.combinations?.length || 0,
      });
    } catch (err) {
      logger.error('[CombinationReview] Search error', { error: err.message });
      setError(err.message);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Load pathways for a specific combination
  const loadPathways = useCallback(async () => {
    if (!searchResults?.element) return;

    setLoadingPathways(true);
    setError(null);

    try {
      const token = await authService.getToken();
      const response = await fetch(
        `/api/admin/element-soup/review?element=${encodeURIComponent(searchResults.element)}&pathways=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to load pathways');
      }

      setSearchResults((prev) => ({
        ...prev,
        pathways: data.pathways,
      }));
    } catch (err) {
      logger.error('[CombinationReview] Pathway error', { error: err.message });
      setError(err.message);
    } finally {
      setLoadingPathways(false);
    }
  }, [searchResults?.element]);

  const togglePathway = useCallback(
    (idx) => {
      setExpandedPathways((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) {
          next.delete(idx);
        } else {
          next.add(idx);
          // Load pathways if not already loaded
          if (!searchResults?.pathways) {
            loadPathways();
          }
        }
        return next;
      });
    },
    [searchResults?.pathways, loadPathways]
  );

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border-[3px] border-blue-500 p-6">
        <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Review Combinations & Pathways
        </h3>

        <p className="text-sm text-text-secondary mb-4">
          Search for any element to see how it can be created and trace the pathway back to starter
          elements.
        </p>

        {/* Search Input */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isSearching && searchElement()}
              placeholder="Search for an element (e.g., Batman, Robot, Pizza)"
              className="w-full px-4 py-3 pl-10 rounded-lg border-[2px] border-black dark:border-white bg-white dark:bg-gray-700 text-text-primary text-lg"
              disabled={isSearching}
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
          <button
            onClick={searchElement}
            disabled={isSearching || !searchQuery.trim()}
            className="px-6 py-3 bg-blue-500 text-white font-bold rounded-lg border-[2px] border-black hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
          >
            {isSearching ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Search
              </>
            )}
          </button>
        </div>
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

      {/* Search Results */}
      {searchResults && (
        <div className="space-y-4">
          {/* Element Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border-[3px] border-black dark:border-white p-6">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{searchResults.emoji || '✨'}</span>
              <div>
                <h2 className="text-2xl font-bold text-text-primary">{searchResults.element}</h2>
                {searchResults.isStarter ? (
                  <p className="text-sm text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    Starter Element
                  </p>
                ) : (
                  <p className="text-sm text-text-secondary">
                    {searchResults.combinations?.length || 0} way
                    {searchResults.combinations?.length !== 1 ? 's' : ''} to create this element
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Combinations List */}
          {searchResults.combinations && searchResults.combinations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <GitBranch className="w-5 h-5" />
                Combinations
              </h3>

              {searchResults.combinations.map((combo, idx) => (
                <CombinationCard
                  key={idx}
                  combo={combo}
                  result={searchResults.element}
                  resultEmoji={searchResults.emoji}
                  pathway={searchResults.pathways?.[idx]}
                  isExpanded={expandedPathways.has(idx)}
                  isLoading={loadingPathways && expandedPathways.has(idx)}
                  onToggle={() => togglePathway(idx)}
                />
              ))}
            </div>
          )}

          {/* No Combinations Message */}
          {!searchResults.isStarter && searchResults.combinations?.length === 0 && (
            <div className="p-6 text-center bg-gray-50 dark:bg-gray-900 rounded-lg border-[2px] border-dashed border-gray-300 dark:border-gray-600">
              <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
              <p className="text-text-secondary font-medium">
                No combinations found for &quot;{searchResults.element}&quot;
              </p>
              <p className="text-sm text-gray-500 mt-1">
                This element may not exist in the database yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isSearching && !searchResults && !error && (
        <div className="p-8 text-center bg-gray-50 dark:bg-gray-900 rounded-lg border-[2px] border-dashed border-gray-300 dark:border-gray-600">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-lg font-bold text-text-secondary">Search for an element</p>
          <p className="text-sm text-gray-500 mt-1">
            Enter an element name to see all the ways it can be created
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * CombinationCard - Display a single combination with expandable pathway
 */
function CombinationCard({ combo, result, resultEmoji, pathway, isExpanded, isLoading, onToggle }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border-[2px] border-black dark:border-white overflow-hidden">
      {/* Combination Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3 text-lg">
          <span className="font-bold text-text-primary">{combo.elementA}</span>
          <span className="text-blue-500 font-bold">+</span>
          <span className="font-bold text-text-primary">{combo.elementB}</span>
          <span className="text-blue-500 font-bold">=</span>
          <span className="text-2xl">{resultEmoji}</span>
          <span className="font-bold text-text-primary">{result}</span>
        </div>
        <div className="flex items-center gap-3">
          {combo.useCount > 0 && (
            <span className="text-xs text-text-secondary bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
              Used {combo.useCount}×
            </span>
          )}
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : isExpanded ? (
            <ChevronDown className="w-5 h-5 text-blue-500" />
          ) : (
            <ChevronRight className="w-5 h-5 text-text-secondary" />
          )}
        </div>
      </button>

      {/* Expanded Pathway */}
      {isExpanded && (
        <div className="border-t-[2px] border-black/10 dark:border-white/10 p-4 bg-blue-50 dark:bg-blue-900/20">
          <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Pathway to Starter Elements
          </h4>

          {isLoading ? (
            <div className="flex items-center gap-2 text-text-secondary">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Loading pathway...
            </div>
          ) : pathway?.steps && pathway.steps.length > 0 ? (
            <div className="space-y-2">
              {pathway.steps.map((step, idx) => (
                <PathwayStep key={idx} step={step} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Both {combo.elementA} and {combo.elementB} are starter elements or their pathways
              could not be traced.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PathwayStep - Display a single step in the pathway
 */
function PathwayStep({ step }) {
  const starterNames = new Set(['earth', 'water', 'fire', 'wind']);
  const isAStarter = starterNames.has(step.elementA.toLowerCase());
  const isBStarter = starterNames.has(step.elementB.toLowerCase());

  return (
    <div className="flex items-center gap-2 text-sm bg-white dark:bg-gray-800 rounded-lg p-3 border border-black/10 dark:border-white/10">
      <span className="text-xs font-bold text-gray-400 w-6">{step.step}.</span>
      <span className="text-lg">{step.emojiA}</span>
      <span
        className={`font-medium ${isAStarter ? 'text-green-600 dark:text-green-400' : 'text-text-primary'}`}
      >
        {step.elementA}
        {isAStarter && <span className="text-xs ml-1">★</span>}
      </span>
      <span className="text-gray-400">+</span>
      <span className="text-lg">{step.emojiB}</span>
      <span
        className={`font-medium ${isBStarter ? 'text-green-600 dark:text-green-400' : 'text-text-primary'}`}
      >
        {step.elementB}
        {isBStarter && <span className="text-xs ml-1">★</span>}
      </span>
      <span className="text-gray-400">=</span>
      <span className="text-lg">{step.resultEmoji}</span>
      <span className="font-bold text-text-primary">{step.result}</span>
    </div>
  );
}
