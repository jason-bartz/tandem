'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, Plus, Check, Route, Loader2 } from 'lucide-react';
import logger from '@/lib/logger';
import authService from '@/services/auth.service';

/**
 * DailyAlchemyPuzzleEditor - Admin editor for Daily Alchemy puzzles
 * Simplified flow: select target element, generate path, set par, save
 */
export default function DailyAlchemyPuzzleEditor({ puzzle, date, onSave, onCancel, loading }) {
  // Form data
  const [formData, setFormData] = useState({
    date: date || '',
    targetElement: '',
    targetEmoji: '✨',
    parMoves: '',
    difficulty: 'medium',
    solutionPath: [],
    published: true,
  });

  // Target element search state
  const [targetSearch, setTargetSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newElementName, setNewElementName] = useState('');
  const [newElementEmoji, setNewElementEmoji] = useState('');
  const searchTimeoutRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Path generation state
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const [pathError, setPathError] = useState(null);

  // UI state
  const [errors, setErrors] = useState({});

  // Load puzzle data if editing
  useEffect(() => {
    if (puzzle) {
      const targetEl = puzzle.target_element || puzzle.targetElement || '';
      const targetEm = puzzle.target_emoji || puzzle.targetEmoji || '✨';
      const parMoves = puzzle.par_moves || puzzle.parMoves || '';
      setFormData({
        date: puzzle.date,
        targetElement: targetEl,
        targetEmoji: targetEm,
        parMoves: parMoves,
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
      setSearchError(null);
      return;
    }

    // Extract just the text part if it contains an emoji prefix
    const searchText = targetSearch.replace(/^[\p{Emoji}\s]+/u, '').trim() || targetSearch;

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const token = await authService.getToken();
        const response = await fetch(
          `/api/admin/daily-alchemy/elements?q=${encodeURIComponent(searchText)}&limit=15`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await response.json();

        if (response.ok) {
          setSearchResults(data.elements || []);
        } else {
          logger.error('[SoupEditor] Element search API error:', response.status, data);
          setSearchError(data.message || 'Search failed');
          setSearchResults([]);
        }
        setShowDropdown(true);
      } catch (error) {
        logger.error('[SoupEditor] Element search error:', error);
        setSearchError('Failed to connect to search API');
        setSearchResults([]);
        setShowDropdown(true);
      } finally {
        setIsSearching(false);
      }
    }, 150); // Slightly faster debounce for better responsiveness

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [targetSearch]);

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

  // Handle par moves change - allow empty string
  const handleParChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setFormData((prev) => ({ ...prev, parMoves: '' }));
    } else {
      const parsed = parseInt(value, 10);
      if (!isNaN(parsed)) {
        setFormData((prev) => ({ ...prev, parMoves: parsed }));
      }
    }
    if (errors.parMoves) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.parMoves;
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
      // Clear existing path when target changes
      solutionPath: [],
      parMoves: '',
    }));
    setTargetSearch(`${element.emoji} ${element.name}`);
    setShowDropdown(false);
    setSearchResults([]);
    setPathError(null);
    setSearchError(null);
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
      solutionPath: [],
      parMoves: '',
    }));
    setTargetSearch('');
    setSearchResults([]);
    setPathError(null);
    setSearchError(null);
    // Focus back on input after clearing
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Open add element modal
  const openAddModal = () => {
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
      const response = await fetch('/api/admin/daily-alchemy/elements', {
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

  // Generate shortest path to target element
  const generatePath = useCallback(async () => {
    if (!formData.targetElement) {
      setPathError('Please select a target element first');
      return;
    }

    setIsGeneratingPath(true);
    setPathError(null);

    try {
      const token = await authService.getToken();
      const response = await fetch(
        `/api/admin/daily-alchemy/shortest-path?target=${encodeURIComponent(formData.targetElement)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to generate path');
      }

      if (data.isStarter) {
        setPathError(`${formData.targetElement} is a starter element - no path needed`);
        return;
      }

      if (!data.found) {
        setPathError(data.message || 'No path found from starter elements');
        return;
      }

      // Convert path format to solution path format
      const solutionPath = data.path.map((step, index) => ({
        step: index + 1,
        elementA: step.element_a,
        elementB: step.element_b,
        result: step.result_element,
        emoji: step.result_emoji,
      }));

      setFormData((prev) => ({
        ...prev,
        solutionPath,
        parMoves: data.steps, // Auto-set par to path length
      }));
    } catch (error) {
      logger.error('[SoupEditor] Path generation error:', error);
      setPathError(error.message);
    } finally {
      setIsGeneratingPath(false);
    }
  }, [formData.targetElement]);

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = 'Date is required';
    if (!formData.targetElement) newErrors.targetElement = 'Target element is required';
    if (!formData.parMoves || formData.parMoves < 1) newErrors.parMoves = 'Par must be at least 1';
    if (formData.solutionPath.length === 0) newErrors.solutionPath = 'Please generate a path first';

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

  // Check if search matches any result exactly
  const searchText = targetSearch.replace(/^[\p{Emoji}\s]+/u, '').trim() || targetSearch;
  const exactMatch = searchResults.some((el) => el.name.toLowerCase() === searchText.toLowerCase());

  return (
    <div className="bg-ghost-white dark:bg-gray-800 rounded-2xl border-[3px] border-black dark:border-white p-3 sm:p-4 overflow-visible">
      <div className="mb-4">
        <h2 className="text-lg font-black text-text-primary">
          {puzzle ? 'Edit puzzle' : 'Create new puzzle'}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 overflow-visible">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">Date *</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleChange('date', e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary"
              disabled={loading}
            />
            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">Difficulty</label>
            <select
              value={formData.difficulty}
              onChange={(e) => handleChange('difficulty', e.target.value)}
              className="w-full px-2 py-1.5 text-sm rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary"
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
          <label className="block text-xs font-bold text-text-primary mb-1">Target Element *</label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={targetSearch}
              onChange={(e) => {
                setTargetSearch(e.target.value);
                if (formData.targetElement) {
                  const currentDisplay = `${formData.targetEmoji} ${formData.targetElement}`;
                  if (e.target.value !== currentDisplay) {
                    setFormData((prev) => ({
                      ...prev,
                      targetElement: '',
                      targetEmoji: '✨',
                      solutionPath: [],
                      parMoves: '',
                    }));
                  }
                }
              }}
              onFocus={() => {
                if (targetSearch.length >= 1) {
                  setShowDropdown(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchResults.length > 0 && !formData.targetElement) {
                  e.preventDefault();
                  selectTargetElement(searchResults[0]);
                }
                if (e.key === 'Escape') {
                  setShowDropdown(false);
                }
              }}
              placeholder="Search for an element..."
              className={`w-full px-3 py-1.5 pl-8 text-sm rounded-lg border-[2px] ${
                formData.targetElement
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-black dark:border-white bg-ghost-white dark:bg-gray-700'
              } text-text-primary`}
              disabled={loading}
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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

          {/* Search Error Display */}
          {searchError && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded text-sm text-red-600 dark:text-red-400">
              {searchError}
            </div>
          )}

          {/* Search Results Dropdown */}
          {showDropdown && !formData.targetElement && (
            <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-white rounded-lg shadow-xl max-h-80 overflow-y-auto">
              {isSearching && searchResults.length === 0 ? (
                <div className="px-4 py-3 text-text-secondary flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                  Searching...
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-xs font-bold text-text-secondary uppercase tracking-wide border-b border-gray-200 dark:border-gray-600">
                    {searchResults.length} element{searchResults.length !== 1 ? 's' : ''} found
                  </div>
                  {searchResults.map((element, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => selectTargetElement(element)}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors text-left ${
                        index === 0 ? 'bg-green-50/50 dark:bg-green-900/10' : ''
                      }`}
                    >
                      <span className="text-2xl">{element.emoji}</span>
                      <span className="text-text-primary font-medium flex-1">{element.name}</span>
                      {index === 0 && (
                        <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          Enter ↵
                        </span>
                      )}
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
                // No results - show add option or searching message
                searchText.length >= 2 &&
                !isSearching && (
                  <>
                    <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-700 dark:text-amber-300 border-b border-amber-200 dark:border-amber-700">
                      No elements found matching "{searchText}"
                    </div>
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
                  </>
                )
              )}
            </div>
          )}

          {errors.targetElement && (
            <p className="text-red-500 text-xs mt-1">{errors.targetElement}</p>
          )}
        </div>

        {/* Generate Path Button */}
        <div className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border-[3px] border-orange-500">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
              <Route className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              Solution Path
            </h3>
            <button
              type="button"
              onClick={generatePath}
              disabled={loading || isGeneratingPath || !formData.targetElement}
              className="px-3 py-1.5 text-sm bg-orange-500 text-white font-bold rounded-md border-[2px] border-black hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0"
              style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
            >
              {isGeneratingPath ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate'
              )}
            </button>
          </div>
          <p className="text-xs text-text-secondary mt-1.5">
            Generate the shortest path from starter elements to your target
          </p>

          {/* Path Error */}
          {pathError && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{pathError}</p>
            </div>
          )}

          {/* Solution Path Display */}
          {formData.solutionPath.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-orange-700 dark:text-orange-300">
                  Path Generated ({formData.solutionPath.length} steps)
                </span>
              </div>
              <div className="bg-white dark:bg-gray-800 border-[2px] border-orange-300 dark:border-orange-700 rounded-lg p-3 max-h-[200px] overflow-y-auto">
                <div className="space-y-2">
                  {formData.solutionPath.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-sm p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                    >
                      <span className="text-orange-500 font-mono text-xs w-6">{step.step}.</span>
                      <span className="text-text-primary">{step.elementA}</span>
                      <span className="text-gray-400">+</span>
                      <span className="text-text-primary">{step.elementB}</span>
                      <span className="text-gray-400">=</span>
                      <span className="font-medium text-text-primary">{step.result}</span>
                      <span>{step.emoji}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {errors.solutionPath && (
            <p className="text-red-500 text-xs mt-2">{errors.solutionPath}</p>
          )}
        </div>

        {/* Par Value and Published */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-text-primary mb-1">Par Moves *</label>
            <input
              type="number"
              value={formData.parMoves}
              onChange={handleParChange}
              min="1"
              placeholder="Auto-set from path"
              className="w-full px-2 py-1.5 text-sm rounded-lg border-[2px] border-black dark:border-white bg-ghost-white dark:bg-gray-700 text-text-primary"
              disabled={loading}
            />
            {errors.parMoves && <p className="text-red-500 text-xs mt-1">{errors.parMoves}</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-3 border-t-2 border-black dark:border-white">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold bg-ghost-white dark:bg-gray-700 text-text-primary rounded-md sm:rounded-lg border-[2px] border-black dark:border-white hover:translate-y-[-1px] transition-all"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          >
            <span className="sm:hidden">Back</span>
            <span className="hidden sm:inline">Back to Calendar</span>
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold bg-green-500 text-white rounded-md sm:rounded-lg border-[2px] border-black hover:translate-y-[-1px] transition-all disabled:opacity-50"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          >
            <span className="sm:hidden">{loading ? 'Saving...' : 'Save'}</span>
            <span className="hidden sm:inline">{loading ? 'Saving...' : 'Save Puzzle'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                date: formData.date,
                targetElement: '',
                targetEmoji: '✨',
                parMoves: '',
                difficulty: 'medium',
                solutionPath: [],
                published: true,
              });
              setTargetSearch('');
              setSearchResults([]);
              setPathError(null);
              setErrors({});
            }}
            disabled={loading}
            className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-bold bg-accent-orange text-white rounded-md sm:rounded-lg border-[2px] border-black hover:translate-y-[-1px] transition-all disabled:opacity-50"
            style={{ boxShadow: '2px 2px 0px rgba(0, 0, 0, 1)' }}
          >
            Clear
          </button>
        </div>
      </form>

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
