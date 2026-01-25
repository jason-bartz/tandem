'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Trash2, RotateCcw, Sparkles, Plus, Check, Wand2 } from 'lucide-react';
import logger from '@/lib/logger';
import { STARTER_ELEMENTS, normalizeKey } from '@/lib/element-soup.constants';
import PathGenerator from './PathGenerator';

/**
 * ElementSoupPuzzleEditor - Admin editor for Element Soup puzzles
 * Features: target selection, sandbox mode for testing, par calculator
 */
export default function ElementSoupPuzzleEditor({ puzzle, date, onSave, onCancel, loading }) {
  // Form data
  const [formData, setFormData] = useState({
    date: date || '',
    targetElement: '',
    targetEmoji: '✨',
    parMoves: 8,
    difficulty: 'medium',
    solutionPath: [],
    published: true,
  });

  // Target element search state
  const [targetSearch, setTargetSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newElementName, setNewElementName] = useState('');
  const [newElementEmoji, setNewElementEmoji] = useState('');
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);

  // Sandbox state
  const [sandboxMode, setSandboxMode] = useState(false);
  const [elementBank, setElementBank] = useState([...STARTER_ELEMENTS]);
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [moveCount, setMoveCount] = useState(0);
  const [solutionPath, setSolutionPath] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCombining, setIsCombining] = useState(false);
  const [targetReached, setTargetReached] = useState(false);

  // UI state
  const [errors, setErrors] = useState({});

  // Load puzzle data if editing
  useEffect(() => {
    if (puzzle) {
      const targetEl = puzzle.target_element || puzzle.targetElement || '';
      const targetEm = puzzle.target_emoji || puzzle.targetEmoji || '✨';
      setFormData({
        date: puzzle.date,
        targetElement: targetEl,
        targetEmoji: targetEm,
        parMoves: puzzle.par_moves || puzzle.parMoves || 8,
        difficulty: puzzle.difficulty || 'medium',
        solutionPath: puzzle.solution_path || puzzle.solutionPath || [],
        published: puzzle.published !== false,
      });
      setTargetSearch(targetEl ? `${targetEm} ${targetEl}` : '');
    } else if (date) {
      setFormData((prev) => ({ ...prev, date }));
    }
  }, [puzzle, date]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for elements as user types
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!targetSearch || targetSearch.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    // Extract just the text part if it contains an emoji prefix
    const searchText = targetSearch.replace(/^[\p{Emoji}\s]+/u, '').trim() || targetSearch;

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/admin/element-soup/elements?q=${encodeURIComponent(searchText)}&limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.elements || []);
        } else {
          // On error, clear results but still show dropdown for add option
          logger.error('[SoupEditor] Element search API error:', response.status);
          setSearchResults([]);
        }
        // Always show dropdown so user can add new elements even if search fails
        setShowDropdown(true);
      } catch (error) {
        logger.error('[SoupEditor] Element search error:', error);
        // Still show dropdown on network error so user can add new elements
        setSearchResults([]);
        setShowDropdown(true);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [targetSearch]);

  // Check if target is reached
  useEffect(() => {
    if (formData.targetElement && sandboxMode) {
      const found = elementBank.some(
        (el) => el.name.toLowerCase() === formData.targetElement.toLowerCase()
      );
      if (found && !targetReached) {
        setTargetReached(true);
      }
    }
  }, [elementBank, formData.targetElement, sandboxMode, targetReached]);

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Select an element from search results
  const selectTargetElement = (element) => {
    setFormData((prev) => ({
      ...prev,
      targetElement: element.name,
      targetEmoji: element.emoji,
    }));
    setTargetSearch(`${element.emoji} ${element.name}`);
    setShowDropdown(false);
    setSearchResults([]);
    if (errors.targetElement) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.targetElement;
        return newErrors;
      });
    }
  };

  // Clear target element
  const clearTargetElement = () => {
    setFormData((prev) => ({
      ...prev,
      targetElement: '',
      targetEmoji: '✨',
    }));
    setTargetSearch('');
    setSearchResults([]);
  };

  // Open add element modal
  const openAddModal = () => {
    // Extract the search text as the initial name
    const searchText = targetSearch.replace(/^[\p{Emoji}\s]+/u, '').trim() || targetSearch;
    setNewElementName(searchText);
    setNewElementEmoji('');
    setShowAddModal(true);
    setShowDropdown(false);
  };

  // Add new element
  const addNewElement = async () => {
    if (!newElementName || !newElementEmoji) {
      return;
    }

    try {
      const response = await fetch('/api/admin/element-soup/elements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newElementName,
          emoji: newElementEmoji,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          selectTargetElement(data.element);
          setShowAddModal(false);
        }
      }
    } catch (error) {
      logger.error('[SoupEditor] Add element error:', error);
    }
  };

  // Start sandbox mode (no target required)
  const startSandbox = () => {
    setSandboxMode(true);
    setElementBank([...STARTER_ELEMENTS]);
    setSelectedA(null);
    setSelectedB(null);
    setMoveCount(0);
    setSolutionPath([]);
    setTargetReached(false);
  };

  // Reset sandbox
  const resetSandbox = () => {
    setElementBank([...STARTER_ELEMENTS]);
    setSelectedA(null);
    setSelectedB(null);
    setMoveCount(0);
    setSolutionPath([]);
    setTargetReached(false);
  };

  // Exit sandbox mode
  const exitSandbox = () => {
    setSandboxMode(false);
  };

  // Select element for combination
  const selectElement = (element) => {
    if (isCombining) return;

    if (!selectedA) {
      setSelectedA(element);
    } else if (!selectedB) {
      setSelectedB(element);
    } else {
      // Replace second selection
      setSelectedB(element);
    }
  };

  // Clear selections
  const clearSelection = () => {
    setSelectedA(null);
    setSelectedB(null);
  };

  // Combine elements
  const combineElements = useCallback(async () => {
    if (!selectedA || !selectedB || isCombining) return;

    setIsCombining(true);

    try {
      const response = await fetch('/api/element-soup/combine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          elementA: selectedA.name,
          elementB: selectedB.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to combine elements');
      }

      const data = await response.json();

      if (data.success && data.result) {
        const newElement = {
          id: normalizeKey(selectedA.name, selectedB.name),
          name: data.result.element,
          emoji: data.result.emoji,
          isStarter: false,
        };

        // Add to path
        const step = {
          step: moveCount + 1,
          elementA: selectedA.name,
          elementB: selectedB.name,
          result: data.result.element,
          emoji: data.result.emoji,
        };
        setSolutionPath((prev) => [...prev, step]);

        // Increment move count
        setMoveCount((prev) => prev + 1);

        // Add to bank if not already there
        const alreadyExists = elementBank.some(
          (el) => el.name.toLowerCase() === newElement.name.toLowerCase()
        );

        if (!alreadyExists) {
          setElementBank((prev) => [newElement, ...prev]);
        }

        // Clear selection
        setSelectedA(null);
        setSelectedB(null);
      }
    } catch (error) {
      logger.error('[SoupEditor] Combine error:', error);
      alert('Failed to combine elements. Please try again.');
    } finally {
      setIsCombining(false);
    }
  }, [selectedA, selectedB, isCombining, moveCount, elementBank]);

  // Set current moves as par
  const setAsPar = () => {
    setFormData((prev) => ({
      ...prev,
      parMoves: moveCount,
      solutionPath: solutionPath,
    }));
  };

  // Set target from sandbox discovery
  const setAsTarget = (element) => {
    setFormData((prev) => ({
      ...prev,
      targetElement: element.name,
      targetEmoji: element.emoji,
    }));
    setTargetSearch(`${element.emoji} ${element.name}`);
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.targetElement) newErrors.targetElement = 'Target element is required';
    if (!formData.parMoves || formData.parMoves < 1) newErrors.parMoves = 'Par must be at least 1';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        date: formData.date,
        targetElement: formData.targetElement,
        targetEmoji: formData.targetEmoji,
        parMoves: formData.parMoves,
        solutionPath: formData.solutionPath,
        difficulty: formData.difficulty,
        published: formData.published,
      });
    }
  };

  // Filter elements by search
  const filteredElements = searchQuery
    ? elementBank.filter((el) => el.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : elementBank;

  // Check if search matches any result exactly
  const searchText = targetSearch.replace(/^[\p{Emoji}\s]+/u, '').trim() || targetSearch;
  const exactMatch = searchResults.some((el) => el.name.toLowerCase() === searchText.toLowerCase());

  return (
    <div className="bg-ghost-white dark:bg-gray-800 rounded-2xl border-[3px] border-black dark:border-white p-4 sm:p-6 overflow-visible">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-text-primary">
          {puzzle ? 'Edit' : 'Create'} Element Soup Puzzle
        </h2>
        {sandboxMode && (
          <button
            onClick={exitSandbox}
            className="px-3 py-1.5 text-sm font-bold bg-gray-500 text-white rounded-lg border-[2px] border-black"
          >
            Exit Sandbox
          </button>
        )}
      </div>

      {!sandboxMode ? (
        // Configuration Form
        <form onSubmit={handleSubmit} className="space-y-6 overflow-visible">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">Date *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary"
                disabled={loading}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary"
                disabled={loading}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          {/* Target Element - Searchable */}
          <div ref={dropdownRef} className="relative z-20">
            <label className="block text-sm font-bold text-text-primary mb-2">
              Target Element *
            </label>
            <div className="relative">
              <input
                type="text"
                value={targetSearch}
                onChange={(e) => {
                  setTargetSearch(e.target.value);
                  // Clear the selected element if user starts typing something different
                  if (formData.targetElement) {
                    const currentDisplay = `${formData.targetEmoji} ${formData.targetElement}`;
                    if (e.target.value !== currentDisplay) {
                      setFormData((prev) => ({
                        ...prev,
                        targetElement: '',
                        targetEmoji: '✨',
                      }));
                    }
                  }
                }}
                onFocus={() => {
                  if (targetSearch.length >= 1) {
                    setShowDropdown(true);
                  }
                }}
                placeholder="Search for an element..."
                className="w-full px-4 py-3 pl-10 rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary text-lg"
                disabled={loading}
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              {targetSearch && (
                <button
                  type="button"
                  onClick={clearTargetElement}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              {isSearching && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Selected Element Indicator */}
            {formData.targetElement && (
              <div className="mt-2 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  Selected: {formData.targetEmoji} {formData.targetElement}
                </span>
              </div>
            )}

            {/* Search Results Dropdown */}
            {showDropdown && (
              <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-white rounded-lg shadow-xl max-h-64 overflow-y-auto">
                {searchResults.length > 0 ? (
                  <>
                    {searchResults.map((element, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectTargetElement(element)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <span className="text-2xl">{element.emoji}</span>
                        <span className="text-text-primary font-medium">{element.name}</span>
                      </button>
                    ))}
                    {/* Add Element Option - show if no exact match */}
                    {!exactMatch && searchText.length >= 2 && (
                      <button
                        type="button"
                        onClick={openAddModal}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors text-left border-t-2 border-gray-200 dark:border-gray-700"
                      >
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                          <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          + Add "{searchText}" as new element
                        </span>
                      </button>
                    )}
                  </>
                ) : (
                  // No results - show add option
                  searchText.length >= 2 && (
                    <button
                      type="button"
                      onClick={openAddModal}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors text-left"
                    >
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                        <Plus className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        + Add "{searchText}" as new element
                      </span>
                    </button>
                  )
                )}
              </div>
            )}

            {errors.targetElement && (
              <p className="text-red-500 text-xs mt-1">{errors.targetElement}</p>
            )}
          </div>

          {/* Par Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">Par Moves *</label>
              <input
                type="number"
                value={formData.parMoves}
                onChange={(e) => handleChange('parMoves', parseInt(e.target.value, 10) || 0)}
                min="1"
                className="w-full px-3 py-2 rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary"
                disabled={loading}
              />
              {errors.parMoves && <p className="text-red-500 text-xs mt-1">{errors.parMoves}</p>}
              <p className="text-xs text-text-secondary mt-1">
                Use sandbox mode to determine optimal par value
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">Published</label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.published}
                  onChange={(e) => handleChange('published', e.target.checked)}
                  className="w-5 h-5 rounded border-2 border-black"
                  disabled={loading}
                />
                <span className="text-sm text-text-primary">Make puzzle available to players</span>
              </label>
            </div>
          </div>

          {/* Solution Path Display */}
          {formData.solutionPath.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-text-primary mb-2">
                Saved Solution Path ({formData.solutionPath.length} moves)
              </label>
              <div className="bg-green-50 dark:bg-green-900/20 border-[2px] border-green-500 rounded-lg p-3 max-h-[150px] overflow-y-auto">
                <div className="space-y-1 text-sm font-mono">
                  {formData.solutionPath.map((step, i) => (
                    <div key={i} className="text-text-primary">
                      {step.step}. {step.elementA} + {step.elementB} → {step.emoji} {step.result}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sandbox Button */}
          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border-[3px] border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-green-500" />
                  Sandbox Mode
                </h3>
                <p className="text-sm text-text-secondary">
                  Experiment with combinations - find a target or test paths
                </p>
              </div>
              <button
                type="button"
                onClick={startSandbox}
                disabled={loading}
                className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg border-[2px] border-black hover:bg-green-600 transition-colors"
                style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
              >
                Start Sandbox
              </button>
            </div>
          </div>

          {/* Path Generator */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg border-[3px] border-purple-500">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-purple-500" />
                Path Generator
              </h3>
              <p className="text-sm text-text-secondary">
                Enter a target element and AI will generate 3 different paths to reach it
              </p>
            </div>
            <PathGenerator
              onPathAccepted={(result) => {
                setFormData((prev) => ({
                  ...prev,
                  targetElement: result.targetElement,
                  targetEmoji: result.targetEmoji,
                  parMoves: result.parMoves,
                  solutionPath: result.solutionPath,
                }));
                setTargetSearch(`${result.targetEmoji} ${result.targetElement}`);
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t-2 border-black dark:border-white">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 font-bold bg-green-500 text-white rounded-lg border-[3px] border-black hover:translate-y-[-2px] transition-all disabled:opacity-50"
              style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
            >
              {loading ? 'Saving...' : puzzle ? 'Update Puzzle' : 'Create Puzzle'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-6 py-3 font-bold bg-ghost-white dark:bg-gray-700 text-text-primary rounded-lg border-[3px] border-black dark:border-white hover:translate-y-[-2px] transition-all"
              style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        // Sandbox Mode
        <div className="space-y-4">
          {/* Target and Stats */}
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex items-center gap-3">
              {formData.targetElement ? (
                <div className="px-4 py-2 bg-green-500 text-white rounded-xl border-[3px] border-black">
                  <div className="text-xs font-bold opacity-80">TARGET</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{formData.targetEmoji}</span>
                    <span className="font-bold">{formData.targetElement}</span>
                  </div>
                </div>
              ) : (
                <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-xl border-[3px] border-dashed border-gray-400">
                  <div className="text-xs font-bold text-gray-500">NO TARGET</div>
                  <div className="text-sm text-gray-500">Explore freely</div>
                </div>
              )}

              <div className="px-4 py-2 bg-white dark:bg-gray-700 rounded-xl border-[3px] border-black dark:border-white">
                <div className="text-xs font-bold text-gray-500">MOVES</div>
                <div className="text-2xl font-black text-text-primary">{moveCount}</div>
              </div>

              <div className="px-4 py-2 bg-white dark:bg-gray-700 rounded-xl border-[3px] border-black dark:border-white">
                <div className="text-xs font-bold text-gray-500">CURRENT PAR</div>
                <div className="text-2xl font-black text-text-primary">{formData.parMoves}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={resetSandbox}
                className="px-3 py-2 bg-orange-500 text-white font-bold rounded-lg border-[2px] border-black flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              {targetReached && (
                <button
                  onClick={setAsPar}
                  className="px-3 py-2 bg-green-500 text-white font-bold rounded-lg border-[2px] border-black"
                >
                  Set {moveCount} as Par
                </button>
              )}
            </div>
          </div>

          {/* Target Reached Celebration */}
          {targetReached && (
            <div className="p-4 bg-gradient-to-r from-yellow-100 to-green-100 dark:from-yellow-900/30 dark:to-green-900/30 rounded-xl border-[3px] border-green-500">
              <div className="text-center">
                <span className="text-3xl">🎉</span>
                <h3 className="text-xl font-black text-green-600 dark:text-green-400">
                  Target Reached!
                </h3>
                <p className="text-sm text-text-secondary">
                  Completed in {moveCount} moves. Click "Set {moveCount} as Par" to save this as the
                  par value.
                </p>
              </div>
            </div>
          )}

          {/* Combination Area */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border-[3px] border-black rounded-xl">
            <div className="flex items-center justify-center gap-4 mb-4">
              {/* Slot A */}
              <div
                className={`w-28 h-28 flex flex-col items-center justify-center rounded-xl border-[3px] transition-all cursor-pointer ${
                  selectedA
                    ? 'bg-green-100 dark:bg-green-800 border-green-500'
                    : 'bg-white dark:bg-gray-700 border-dashed border-gray-400'
                }`}
                onClick={() => selectedA && setSelectedA(null)}
              >
                {selectedA ? (
                  <>
                    <span className="text-3xl mb-1">{selectedA.emoji}</span>
                    <span className="text-sm font-medium truncate max-w-[90%]">
                      {selectedA.name}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400 text-sm">Select</span>
                )}
              </div>

              <span className="text-2xl font-bold text-gray-400">+</span>

              {/* Slot B */}
              <div
                className={`w-28 h-28 flex flex-col items-center justify-center rounded-xl border-[3px] transition-all cursor-pointer ${
                  selectedB
                    ? 'bg-green-100 dark:bg-green-800 border-green-500'
                    : 'bg-white dark:bg-gray-700 border-dashed border-gray-400'
                }`}
                onClick={() => selectedB && setSelectedB(null)}
              >
                {selectedB ? (
                  <>
                    <span className="text-3xl mb-1">{selectedB.emoji}</span>
                    <span className="text-sm font-medium truncate max-w-[90%]">
                      {selectedB.name}
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400 text-sm">Select</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={clearSelection}
                disabled={!selectedA && !selectedB}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-600 text-text-primary font-bold rounded-xl border-[3px] border-black dark:border-white disabled:opacity-50"
              >
                Clear
              </button>
              <button
                onClick={combineElements}
                disabled={!selectedA || !selectedB || isCombining}
                className="px-6 py-3 bg-green-500 text-white font-bold rounded-xl border-[3px] border-black disabled:opacity-50"
                style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
              >
                {isCombining ? 'Combining...' : 'Combine'}
              </button>
            </div>
          </div>

          {/* Element Bank */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600 dark:text-gray-400">
                Element Bank ({elementBank.length})
              </h3>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <input
                type="text"
                placeholder="Search elements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-700 border-[2px] border-black dark:border-white rounded-xl text-sm"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Elements Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[300px] overflow-y-auto p-2 bg-gray-50 dark:bg-gray-900 rounded-xl border-[2px] border-black dark:border-white">
              {filteredElements.map((element) => {
                const isSelected =
                  selectedA?.name === element.name || selectedB?.name === element.name;
                const isTarget =
                  formData.targetElement &&
                  element.name.toLowerCase() === formData.targetElement.toLowerCase();

                return (
                  <div key={element.id || element.name} className="relative group">
                    <button
                      onClick={() => selectElement(element)}
                      className={`w-full flex flex-col items-center justify-center p-2 rounded-lg border-[2px] transition-all text-center ${
                        isTarget
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 ring-2 ring-yellow-400'
                          : isSelected
                            ? 'bg-green-100 dark:bg-green-800 border-green-500'
                            : 'bg-white dark:bg-gray-800 border-black dark:border-white hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-xl">{element.emoji}</span>
                      <span className="text-xs font-medium truncate w-full">{element.name}</span>
                    </button>
                    {/* Set as Target button - only show for non-starter, non-target elements */}
                    {!element.isStarter && !isTarget && (
                      <button
                        onClick={() => setAsTarget(element)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs"
                        title="Set as target"
                      >
                        🎯
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Path */}
          {solutionPath.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-sm uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  Current Path
                </h3>
                <button
                  onClick={() => setSolutionPath([])}
                  className="text-xs text-red-500 hover:underline flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Path
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 border-[2px] border-black dark:border-white rounded-lg p-3 max-h-[150px] overflow-y-auto">
                <div className="space-y-1 text-sm font-mono">
                  {solutionPath.map((step, i) => (
                    <div key={i} className="text-text-primary">
                      {step.step}. {step.elementA} + {step.elementB} → {step.emoji} {step.result}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Back to Config */}
          <div className="pt-4 border-t-2 border-black dark:border-white">
            <button
              onClick={exitSandbox}
              className="px-6 py-3 font-bold bg-ghost-white dark:bg-gray-700 text-text-primary rounded-lg border-[3px] border-black dark:border-white"
              style={{ boxShadow: '3px 3px 0px rgba(0, 0, 0, 1)' }}
            >
              ← Back to Configuration
            </button>
          </div>
        </div>
      )}

      {/* Add Element Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border-[3px] border-black dark:border-white p-6 max-w-md w-full">
            <h3 className="text-xl font-black text-text-primary mb-4">Add New Element</h3>
            <p className="text-sm text-text-secondary mb-4">
              This element doesn't exist yet. Add it with an emoji to use as a target.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-text-primary mb-2">
                  Element Name
                </label>
                <input
                  type="text"
                  value={newElementName}
                  onChange={(e) => setNewElementName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary"
                  placeholder="e.g., Volcano"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-text-primary mb-2">
                  Element Emoji *
                </label>
                <input
                  type="text"
                  value={newElementEmoji}
                  onChange={(e) => setNewElementEmoji(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary text-center text-2xl"
                  placeholder="🌋"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={addNewElement}
                disabled={!newElementName || !newElementEmoji}
                className="flex-1 px-4 py-2 bg-green-500 text-white font-bold rounded-lg border-[2px] border-black disabled:opacity-50"
              >
                Add Element
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-text-primary font-bold rounded-lg border-[2px] border-black dark:border-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
