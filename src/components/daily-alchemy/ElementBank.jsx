'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown, ArrowUp, ArrowDown, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useHaptics } from '@/hooks/useHaptics';
import { SORT_OPTIONS, SORT_LABELS, SORT_DIRECTIONS } from '@/lib/daily-alchemy.constants';
import ElementChip from './ElementChip';
import FavoritesPanel from './FavoritesPanel';

/**
 * ElementBank - Flexbox flow layout for discovered elements (like Infinite Craft)
 * Elements are sized to their content and fill beside each other naturally
 * Supports drag-and-drop to add elements to favorites
 */
// Desktop breakpoint (matches Tailwind lg:)
const DESKTOP_BREAKPOINT = 1024;

// Touch drag threshold in pixels - movement beyond this initiates drag mode
const TOUCH_DRAG_THRESHOLD = 10;

export function ElementBank({
  elements,
  selectedA,
  selectedB,
  onSelect,
  sortOrder,
  onSortChange,
  sortDirection,
  onSortDirectionChange,
  onReshuffle,
  searchQuery,
  onSearchChange,
  targetElement,
  recentElements = [],
  firstDiscoveryElements = [],
  disabled = false,
  // Favorites
  favoriteElements = new Set(),
  onToggleFavorite,
  onClearAllFavorites,
  showFavoritesPanel = false,
  onToggleFavoritesPanel,
  maxFavorites = 12,
  allElements = [], // All elements for favorites panel (unfiltered)
  isDesktopSidePanel = false, // When true, enables desktop-optimized layout
  hideDesktopFavorites = false, // When true, hides favorites button on desktop (used when embedded favorites is shown)
  searchInputRef = null, // Ref forwarded from parent for keyboard shortcut (/ key)
  keyboardFocusIndex = -1, // Index of keyboard-focused element (-1 = none)
  ctrlHeld = false, // Whether Ctrl key is held for favorite shortcut badges
}) {
  const { highContrast } = useTheme();
  const { mediumTap } = useHaptics();
  const gridContainerRef = useRef(null);
  const favoritesButtonRef = useRef(null);
  const dropdownRef = useRef(null);
  const [isDraggingToFavorites, setIsDraggingToFavorites] = useState(false);
  const [draggedElementName, setDraggedElementName] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [gridMaxHeight, setGridMaxHeight] = useState(undefined);

  // Touch drag state for mobile
  const [touchDragElement, setTouchDragElement] = useState(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchOverFavorites, setTouchOverFavorites] = useState(false);

  // iOS WKWebView doesn't resolve CSS flex height chains properly, so
  // overflow-y-auto on a flex-1 container never constrains the content.
  // Fix: measure the grid's actual viewport position and set an explicit maxHeight.
  useEffect(() => {
    const el = gridContainerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      // Available height = viewport bottom minus grid top, minus small bottom margin
      const available = window.innerHeight - rect.top - 8;
      if (available > 100) {
        setGridMaxHeight(available);
      }
    };

    // Measure after layout settles
    requestAnimationFrame(update);

    // Recalculate on viewport resize (orientation changes, keyboard)
    window.addEventListener('resize', update);

    // Observe parent for layout shifts (e.g., content above changing size)
    const ro = new ResizeObserver(update);
    if (el.parentElement) {
      ro.observe(el.parentElement);
    }

    return () => {
      window.removeEventListener('resize', update);
      ro.disconnect();
    };
  }, []);

  // Detect desktop viewport
  useEffect(() => {
    if (!isDesktopSidePanel) {
      setIsDesktop(false);
      return;
    }

    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    setIsDesktop(mediaQuery.matches);

    const handleChange = (e) => setIsDesktop(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isDesktopSidePanel]);

  // Close sort dropdown on click outside
  useEffect(() => {
    if (!isSortDropdownOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsSortDropdownOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isSortDropdownOpen]);

  // Close sort dropdown on Escape
  useEffect(() => {
    if (!isSortDropdownOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsSortDropdownOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSortDropdownOpen]);

  // Drag handlers for adding to favorites
  const handleDragStart = (e, element) => {
    setDraggedElementName(element.name);
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        action: 'add-favorite',
        elementName: element.name,
      })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedElementName(null);
    setIsDraggingToFavorites(false);
  };

  const handleFavoritesDragOver = (e) => {
    e.preventDefault();
    if (favoriteElements.size < maxFavorites) {
      setIsDraggingToFavorites(true);
    }
  };

  const handleFavoritesDragLeave = () => {
    setIsDraggingToFavorites(false);
  };

  const handleFavoritesDrop = (e) => {
    e.preventDefault();
    setIsDraggingToFavorites(false);

    if (favoriteElements.size >= maxFavorites) return;

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.action === 'add-favorite' && data.elementName) {
        // Only add if not already a favorite
        if (!favoriteElements.has(data.elementName)) {
          onToggleFavorite?.(data.elementName);
        }
      }
    } catch {
      // Invalid data
    }
  };

  // Check if a point is over the favorites button
  const isOverFavoritesButton = useCallback((x, y) => {
    if (!favoritesButtonRef.current) return false;
    const rect = favoritesButtonRef.current.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }, []);

  // Touch drag handlers for mobile - these use a threshold to distinguish tap from drag
  const handleTouchDragStart = useCallback((element) => {
    setTouchDragElement(element);
  }, []);

  const handleTouchDragMove = useCallback(
    (x, y) => {
      if (!touchDragElement) return;
      setIsTouchDragging(true);
      setTouchOverFavorites(isOverFavoritesButton(x, y));
    },
    [touchDragElement, isOverFavoritesButton]
  );

  const handleTouchDragEnd = useCallback(
    (didDrag, x, y) => {
      if (didDrag && touchDragElement && isOverFavoritesButton(x, y)) {
        // Dropped on favorites button - add to favorites
        if (favoriteElements.size < maxFavorites && !favoriteElements.has(touchDragElement.name)) {
          onToggleFavorite?.(touchDragElement.name);
        }
      }
      // Reset touch drag state
      setTouchDragElement(null);
      setIsTouchDragging(false);
      setTouchOverFavorites(false);
    },
    [touchDragElement, isOverFavoritesButton, favoriteElements, maxFavorites, onToggleFavorite]
  );

  // Long press handler for adding/removing favorites
  const handleLongPress = useCallback(
    (element) => {
      // Toggle favorite - if already a favorite, remove it; otherwise add if not at max
      if (favoriteElements.has(element.name)) {
        onToggleFavorite?.(element.name);
        mediumTap();
      } else if (favoriteElements.size < maxFavorites) {
        onToggleFavorite?.(element.name);
        mediumTap();
      }
    },
    [favoriteElements, maxFavorites, onToggleFavorite, mediumTap]
  );

  // Memoize Set from firstDiscoveryElements array for O(1) lookups in render loop
  const firstDiscoverySet = useMemo(
    () => new Set(firstDiscoveryElements),
    [firstDiscoveryElements]
  );

  // Memoize enriched elements with isFirstDiscovery baked in.
  // This avoids creating { ...element, isFirstDiscovery } on every render,
  // which would defeat React.memo on ElementChip.
  const enrichedElements = useMemo(() => {
    return elements.map((el) => {
      const isFirstDiscovery = firstDiscoverySet.has(el.name);
      // Only create a new object if the flag actually changed
      if (el.isFirstDiscovery === isFirstDiscovery) return el;
      return { ...el, isFirstDiscovery };
    });
  }, [elements, firstDiscoverySet]);

  // Progressive rendering: only mount a limited number of elements to keep DOM size small.
  // Expands automatically as user scrolls, resets when elements change (sort/search).
  const RENDER_BATCH_SIZE = 60;
  const [renderLimit, setRenderLimit] = useState(RENDER_BATCH_SIZE);
  const sentinelRef = useRef(null);

  // Reset render limit when the element list changes (new sort, search, etc.)
  const elementsKey = elements.length + '-' + searchQuery + '-' + sortOrder;
  const prevElementsKey = useRef(elementsKey);
  useEffect(() => {
    if (prevElementsKey.current !== elementsKey) {
      setRenderLimit(RENDER_BATCH_SIZE);
      prevElementsKey.current = elementsKey;
    }
  }, [elementsKey]);

  // IntersectionObserver to load more elements as user scrolls near bottom
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRenderLimit((prev) => prev + RENDER_BATCH_SIZE);
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [elementsKey]); // Re-attach when list identity changes

  const visibleElements =
    enrichedElements.length > renderLimit
      ? enrichedElements.slice(0, renderLimit)
      : enrichedElements;
  const hasMore = enrichedElements.length > renderLimit;

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* Header row with title, direction toggle, and sort dropdown */}
      <div className="flex items-center justify-between">
        <h3
          className={cn(
            'font-bold text-sm tracking-wide',
            'text-gray-600 dark:text-gray-400',
            highContrast && 'text-hc-text'
          )}
        >
          Element Bank
        </h3>

        <div className="flex items-center gap-1">
          {/* Direction toggle / reshuffle button */}
          <button
            onClick={() => {
              if (sortOrder === SORT_OPTIONS.RANDOM) {
                onReshuffle?.();
              } else {
                onSortDirectionChange(
                  sortDirection === SORT_DIRECTIONS.ASC ? SORT_DIRECTIONS.DESC : SORT_DIRECTIONS.ASC
                );
              }
            }}
            className={cn(
              'p-1.5',
              'text-gray-500 dark:text-gray-400',
              'hover:text-gray-900 dark:hover:text-gray-200',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              'rounded-lg',
              'transition-colors'
            )}
            aria-label={
              sortOrder === SORT_OPTIONS.RANDOM
                ? 'Reshuffle'
                : `Sort direction: ${sortDirection === SORT_DIRECTIONS.ASC ? 'ascending' : 'descending'}`
            }
            title={
              sortOrder === SORT_OPTIONS.RANDOM
                ? 'Reshuffle'
                : sortDirection === SORT_DIRECTIONS.ASC
                  ? 'Ascending'
                  : 'Descending'
            }
          >
            {sortOrder === SORT_OPTIONS.RANDOM ? (
              <Shuffle className="w-3.5 h-3.5" />
            ) : sortDirection === SORT_DIRECTIONS.ASC ? (
              <ArrowUp className="w-3.5 h-3.5" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Sort dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              className={cn(
                'flex items-center gap-1',
                'px-2 py-1',
                'text-sm font-medium',
                'text-gray-600 dark:text-gray-400',
                'hover:text-gray-900 dark:hover:text-gray-200',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'rounded-lg',
                'transition-colors',
                isSortDropdownOpen &&
                  'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200'
              )}
              aria-haspopup="listbox"
              aria-expanded={isSortDropdownOpen}
              aria-label={`Sort by: ${SORT_LABELS[sortOrder]}`}
            >
              {SORT_LABELS[sortOrder]}
              <ChevronDown
                className={cn(
                  'w-3.5 h-3.5 transition-transform',
                  isSortDropdownOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Dropdown menu */}
            <AnimatePresence>
              {isSortDropdownOpen && (
                <motion.div
                  className={cn(
                    'absolute right-0 top-full mt-1 z-50',
                    'min-w-[140px]',
                    'py-1',
                    'bg-bg-card dark:bg-gray-800',
                    'dark:border-gray-600',
                    'rounded-xl',
                    'dark:',
                    highContrast && 'border-2 border-hc-border'
                  )}
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  role="listbox"
                  aria-label="Sort options"
                >
                  {Object.entries(SORT_LABELS).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        onSortChange(key);
                        setIsSortDropdownOpen(false);
                      }}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm',
                        'hover:bg-gray-100 dark:hover:bg-gray-700',
                        'transition-colors',
                        sortOrder === key
                          ? 'font-semibold text-soup-primary'
                          : 'text-gray-700 dark:text-gray-300',
                        highContrast && sortOrder === key && 'text-hc-text font-bold'
                      )}
                      role="option"
                      aria-selected={sortOrder === key}
                    >
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Search field and Favorites button */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search elements..."
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            className={cn(
              'w-full px-4 py-2 pl-10',
              'bg-bg-surface dark:bg-gray-800',
              'rounded-lg text-sm',
              'focus:outline-none focus:ring-2 focus:ring-soup-primary',
              'placeholder:text-gray-400',
              highContrast && 'border-2 border-hc-border'
            )}
            aria-label="Search elements"
          />
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            aria-hidden="true"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Favorites button - hidden on desktop when embedded favorites is shown */}
        {!(hideDesktopFavorites && isDesktop) && (
          <motion.button
            ref={favoritesButtonRef}
            onClick={onToggleFavoritesPanel}
            onDragOver={handleFavoritesDragOver}
            onDragLeave={handleFavoritesDragLeave}
            onDrop={handleFavoritesDrop}
            className={cn(
              'flex-shrink-0',
              'h-10 px-3',
              'flex items-center justify-center gap-1',
              'rounded-lg',
              'active:translate-y-0',
              // Background colors based on state — fill-based, no outlines
              !touchOverFavorites &&
                !isDraggingToFavorites &&
                !showFavoritesPanel &&
                'bg-bg-surface dark:bg-gray-800',
              showFavoritesPanel && !touchOverFavorites && 'bg-soup-primary/20',
              // Desktop drag feedback
              isDraggingToFavorites &&
                !touchOverFavorites &&
                'bg-yellow-100 dark:bg-yellow-900/30 scale-110',
              // Mobile touch drag feedback
              touchOverFavorites && 'bg-yellow-100 dark:bg-yellow-900/30',
              highContrast && 'border-2 border-hc-border'
            )}
            // Animate scale when touch dragging over
            initial={false}
            animate={touchOverFavorites ? { scale: 1.05 } : { scale: 1 }}
            transition={{
              scale: { type: 'spring', stiffness: 300, damping: 20 },
            }}
            aria-label="Open favorites"
            aria-expanded={showFavoritesPanel}
          >
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 whitespace-nowrap">
              Favorites
            </span>
          </motion.button>
        )}

        {/* Favorites Panel - positioned as dropdown from button (mobile only when hideDesktopFavorites) */}
        {showFavoritesPanel && !(hideDesktopFavorites && isDesktop) && (
          <FavoritesPanel
            elements={allElements}
            favoriteElements={favoriteElements}
            onToggleFavorite={onToggleFavorite}
            onClearAllFavorites={onClearAllFavorites}
            onSelectElement={onSelect}
            selectedA={selectedA}
            selectedB={selectedB}
            maxFavorites={maxFavorites}
            onClose={() => onToggleFavoritesPanel?.()}
            recentElements={recentElements}
            firstDiscoveryElements={firstDiscoveryElements}
            ctrlHeld={ctrlHeld}
          />
        )}
      </div>

      {/* Element grid - scrollable flex-wrap container */}
      {/* maxHeight set via JS to bypass iOS WKWebView flex height chain issues */}
      <div
        className={cn(
          'flex-1 min-h-0',
          // Flexbox flow layout (like Infinite Craft) - elements sized to content, fill beside each other
          'flex flex-row flex-wrap gap-2 content-start items-start',
          'overflow-y-auto overflow-x-hidden',
          'scrollable',
          'p-2',
          'bg-bg-surface dark:bg-gray-900/50',
          'rounded-lg',
          highContrast && 'border-2 border-hc-border'
        )}
        ref={gridContainerRef}
        style={gridMaxHeight ? { maxHeight: gridMaxHeight } : undefined}
        role="region"
        aria-label="Element bank"
      >
        {elements.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 w-full">
            {searchQuery ? 'No elements match your search' : 'No elements yet'}
          </div>
        ) : (
          visibleElements.map((element, index) => {
            const isSelected =
              (selectedA && selectedA.id === element.id) ||
              (selectedB && selectedB.id === element.id);
            const isTarget =
              targetElement && element.name.toLowerCase() === targetElement.toLowerCase();
            // Only show NEW badge for elements in the recent list (last 5 discovered)
            const showNewBadge = recentElements.includes(element.name);
            const isDragging = draggedElementName === element.name;
            const isFavorite = favoriteElements.has(element.name);

            return (
              <ElementChip
                key={element.id}
                element={element}
                isSelected={isSelected}
                isNew={showNewBadge}
                isTarget={isTarget}
                isFavorite={isFavorite}
                fromPartner={element.fromPartner || false}
                onClick={onSelect}
                disabled={disabled}
                draggable={!disabled}
                onDragStart={(e) => handleDragStart(e, element)}
                onDragEnd={handleDragEnd}
                isDragging={isDragging || (isTouchDragging && touchDragElement?.id === element.id)}
                // Long press to toggle favorites
                onLongPress={!disabled ? handleLongPress : undefined}
                // Touch drag handlers for mobile
                onTouchDragStart={() => handleTouchDragStart(element)}
                onTouchDragMove={handleTouchDragMove}
                onTouchDragEnd={handleTouchDragEnd}
                touchDragThreshold={TOUCH_DRAG_THRESHOLD}
                // Keyboard navigation
                kbIndex={index}
                isKeyboardFocused={keyboardFocusIndex === index}
              />
            );
          })
        )}
        {/* Sentinel element for infinite scroll — triggers loading more when visible */}
        {hasMore && <div ref={sentinelRef} className="w-full h-1" aria-hidden="true" />}
      </div>
    </div>
  );
}

export default ElementBank;
