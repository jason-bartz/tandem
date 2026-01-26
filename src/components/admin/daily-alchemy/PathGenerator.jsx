'use client';

import { useState, useCallback } from 'react';
import { Search, Sparkles, RotateCcw, Check, AlertCircle, ChevronRight } from 'lucide-react';
import logger from '@/lib/logger';
import authService from '@/services/auth.service';

/**
 * PathGenerator - Admin tool for generating element combination paths
 * Generates 3 different paths from starter elements to a target element
 */
export default function PathGenerator({ onPathAccepted }) {
  // Input state
  const [targetInput, setTargetInput] = useState('');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [paths, setPaths] = useState(null);
  const [error, setError] = useState(null);

  // Saving state
  const [savingPathId, setSavingPathId] = useState(null);
  const [saveResult, setSaveResult] = useState(null);

  // Generate paths
  const generatePaths = useCallback(async () => {
    if (!targetInput.trim()) {
      setError('Please enter a target element name');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPaths(null);
    setSaveResult(null);

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
        logger.info('[PathGenerator] Paths received', { count: data.paths.length });
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      logger.error('[PathGenerator] Generation error', { error: err.message });
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  }, [targetInput]);

  // Save a selected path
  const savePath = useCallback(
    async (path) => {
      setSavingPathId(path.id);
      setSaveResult(null);
      setError(null);

      try {
        // Get the final step's result as the target
        const finalStep = path.steps[path.steps.length - 1];
        const targetElement = finalStep.result;
        const targetEmoji = finalStep.resultEmoji;

        const token = await authService.getToken();
        const response = await fetch('/api/admin/daily-alchemy/generate-path', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            path,
            targetElement,
            targetEmoji,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to save path');
        }

        setSaveResult({
          pathId: path.id,
          created: data.created,
          skipped: data.skipped,
          conflicts: data.conflicts || [],
        });

        logger.info('[PathGenerator] Path saved', {
          pathId: path.id,
          created: data.created,
          skipped: data.skipped,
          conflicts: data.conflicts?.length || 0,
        });

        // Notify parent component
        if (onPathAccepted) {
          onPathAccepted({
            targetElement,
            targetEmoji,
            parMoves: path.steps.length,
            solutionPath: path.steps.map((step, idx) => ({
              step: idx + 1,
              elementA: step.elementA,
              elementB: step.elementB,
              result: step.result,
              emoji: step.resultEmoji,
            })),
          });
        }
      } catch (err) {
        logger.error('[PathGenerator] Save error', { error: err.message });
        setError(err.message);
      } finally {
        setSavingPathId(null);
      }
    },
    [onPathAccepted]
  );

  // Regenerate paths
  const regenerate = useCallback(() => {
    setPaths(null);
    setSaveResult(null);
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
      {saveResult && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border-[2px] border-green-500 rounded-lg flex items-start gap-3">
          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-green-600 dark:text-green-400">Path Saved Successfully!</p>
            <p className="text-sm text-green-600 dark:text-green-400">
              Created {saveResult.created} new combination{saveResult.created !== 1 ? 's' : ''},{' '}
              {saveResult.skipped} already existed.
            </p>
            {saveResult.conflicts && saveResult.conflicts.length > 0 && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border-[2px] border-amber-500 rounded-lg">
                <p className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {saveResult.conflicts.length} Conflict
                  {saveResult.conflicts.length !== 1 ? 's' : ''} Detected
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                  These combinations already exist with different results (kept existing):
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {saveResult.conflicts.map((c, i) => (
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
          </div>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="p-8 text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-bold text-text-primary">
            Generating 3 paths to "{targetInput}"...
          </p>
          <p className="text-sm text-text-secondary mt-2">This may take a few moments</p>
        </div>
      )}

      {/* Paths Display */}
      {paths && paths.length > 0 && (
        <div className="space-y-4">
          {/* Header with Regenerate */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary">
              Generated Paths to "{targetInput}"
            </h3>
            <button
              onClick={regenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-orange-500 text-white font-bold rounded-lg border-[2px] border-black flex items-center gap-2 hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Regenerate All
            </button>
          </div>

          {/* Paths Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {paths.map((path) => (
              <PathCard
                key={path.id}
                path={path}
                onSave={() => savePath(path)}
                isSaving={savingPathId === path.id}
                isSaved={saveResult?.pathId === path.id}
              />
            ))}
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
 * PathCard - Displays a single path option
 */
function PathCard({ path, onSave, isSaving, isSaved }) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Get colors based on path type
  const getPathColors = (label) => {
    if (label.toLowerCase().includes('direct')) {
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-500',
        text: 'text-blue-600 dark:text-blue-400',
        button: 'bg-blue-500 hover:bg-blue-600',
      };
    }
    if (label.toLowerCase().includes('creative')) {
      return {
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-purple-500',
        text: 'text-purple-600 dark:text-purple-400',
        button: 'bg-purple-500 hover:bg-purple-600',
      };
    }
    // Thematic
    return {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-500',
      text: 'text-amber-600 dark:text-amber-400',
      button: 'bg-amber-500 hover:bg-amber-600',
    };
  };

  const colors = getPathColors(path.label);
  const finalStep = path.steps[path.steps.length - 1];

  return (
    <div className={`${colors.bg} border-[3px] ${colors.border} rounded-xl overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b-[2px] border-black/10 dark:border-white/10">
        <div className="flex items-center justify-between">
          <div>
            <h4 className={`font-bold ${colors.text}`}>{path.label}</h4>
            <p className="text-sm text-text-secondary">
              {path.steps.length} step{path.steps.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl">{path.targetEmoji}</span>
            <p className="text-xs text-text-secondary">{finalStep.result}</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="p-4">
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

      {/* Action Button */}
      <div className="p-4 pt-0">
        <button
          onClick={onSave}
          disabled={isSaving || isSaved}
          className={`w-full py-3 text-white font-bold rounded-lg border-[2px] border-black transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${
            isSaved ? 'bg-green-500' : colors.button
          }`}
          style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
        >
          {isSaving ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : isSaved ? (
            <>
              <Check className="w-5 h-5" />
              Saved!
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Select & Save
            </>
          )}
        </button>
      </div>
    </div>
  );
}
