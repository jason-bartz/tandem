'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { SORT_OPTIONS } from '@/lib/daily-alchemy.constants';
import ElementChip from './ElementChip';
import FavoritesPanel from './FavoritesPanel';

/**
 * ElementBank - Horizontally scrollable grid of discovered elements
 * Elements flow in columns: top to bottom, then continue to the right
 * Supports drag-and-drop to add elements to favorites
 */
// Row height: ~40px chip + 8px gap = 48px per row
const ROW_HEIGHT = 48;
const MIN_ROWS = 3;
const MAX_ROWS = 10;

// Touch drag threshold in pixels - movement beyond this initiates drag mode
const TOUCH_DRAG_THRESHOLD = 10;

export function ElementBank({
  elements,
  selectedA,
  selectedB,
  onSelect,
  sortOrder,
  onSortChange,
  searchQuery,
  onSearchChange,
  targetElement,
  recentElements = [],
  firstDiscoveryElements = [],
  disabled = false,
  discoveredCount = null, // Number of discovered elements (excluding starters) for Creative Mode
  // Favorites
  favoriteElements = new Set(),
  onToggleFavorite,
  onClearAllFavorites,
  showFavoritesPanel = false,
  onToggleFavoritesPanel,
  maxFavorites = 12,
  allElements = [], // All elements for favorites panel (unfiltered)
}) {
  const { highContrast } = useTheme();
  const gridContainerRef = useRef(null);
  const favoritesButtonRef = useRef(null);
  const [rowCount, setRowCount] = useState(7);
  const [isDraggingToFavorites, setIsDraggingToFavorites] = useState(false);
  const [draggedElementName, setDraggedElementName] = useState(null);

  // Touch drag state for mobile
  const [touchDragElement, setTouchDragElement] = useState(null);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchOverFavorites, setTouchOverFavorites] = useState(false);

  // Calculate how many rows can fit in available space
  const calculateRows = useCallback(() => {
    if (!gridContainerRef.current) return;

    const containerHeight = gridContainerRef.current.clientHeight;
    // Subtract padding (16px = p-2 * 2)
    const availableHeight = containerHeight - 16;
    const calculatedRows = Math.floor(availableHeight / ROW_HEIGHT);
    const clampedRows = Math.max(MIN_ROWS, Math.min(MAX_ROWS, calculatedRows));

    setRowCount(clampedRows);
  }, []);

  // Set up ResizeObserver to detect container size changes
  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;

    // Initial calculation
    calculateRows();

    const resizeObserver = new ResizeObserver(() => {
      calculateRows();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateRows]);

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

  return (
    <div className="flex flex-col gap-2 flex-1 min-h-0">
      {/* Header row with title and sort */}
      <div className="flex items-center justify-between">
        <h3
          className={cn(
            'font-bold text-sm tracking-wide',
            'text-gray-600 dark:text-gray-400',
            highContrast && 'text-hc-text'
          )}
        >
          Element Bank
          {discoveredCount !== null && (
            <span className="ml-1.5 font-normal text-soup-primary dark:text-soup-primary">
              ({discoveredCount})
            </span>
          )}
        </h3>
        <button
          onClick={() => {
            const order = [
              SORT_OPTIONS.NEWEST,
              SORT_OPTIONS.ALPHABETICAL,
              SORT_OPTIONS.MOST_USED,
              SORT_OPTIONS.FIRST_DISCOVERIES,
            ];
            const currentIndex = order.indexOf(sortOrder);
            const nextIndex = (currentIndex + 1) % order.length;
            onSortChange(order[nextIndex]);
          }}
          className={cn(
            'px-2 py-1',
            'text-sm font-medium',
            'text-gray-600 dark:text-gray-400',
            'hover:text-gray-900 dark:hover:text-gray-200',
            'transition-colors'
          )}
          aria-label="Toggle sort order"
        >
          Sort:{' '}
          {sortOrder === SORT_OPTIONS.NEWEST
            ? 'Newest'
            : sortOrder === SORT_OPTIONS.ALPHABETICAL
              ? 'A-Z'
              : sortOrder === SORT_OPTIONS.MOST_USED
                ? 'Most Used'
                : '1st Disc.'}
        </button>
      </div>

      {/* Search field and Favorites button */}
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search elements..."
            className={cn(
              'w-full px-4 py-2 pl-10',
              'bg-white dark:bg-gray-800',
              'border-[2px] border-black dark:border-gray-600',
              'rounded-xl text-sm',
              'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(75,85,99,1)]',
              'focus:outline-none focus:ring-2 focus:ring-soup-primary',
              'placeholder:text-gray-400',
              highContrast && 'border-[3px] border-hc-border'
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

        {/* Favorites button - also a drop zone for adding favorites */}
        <button
          ref={favoritesButtonRef}
          onClick={onToggleFavoritesPanel}
          onDragOver={handleFavoritesDragOver}
          onDragLeave={handleFavoritesDragLeave}
          onDrop={handleFavoritesDrop}
          className={cn(
            'flex-shrink-0',
            'w-10 h-10',
            'flex items-center justify-center',
            'bg-white dark:bg-gray-800',
            'border-[2px] border-black dark:border-gray-600',
            'rounded-xl',
            'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(75,85,99,1)]',
            'hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_rgba(0,0,0,1)]',
            'active:translate-y-0 active:shadow-none',
            'transition-all duration-150',
            showFavoritesPanel && 'bg-soup-primary/20 ring-2 ring-soup-primary',
            // Desktop drag feedback
            isDraggingToFavorites &&
              'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-500 scale-110',
            // Mobile touch drag feedback
            touchOverFavorites &&
              'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-500 scale-110',
            highContrast && 'border-[3px] border-hc-border'
          )}
          aria-label="Open favorites"
          aria-expanded={showFavoritesPanel}
        >
          <Image src="/icons/ui/favorites.png" alt="" width={24} height={24} className="w-6 h-6" />
        </button>

        {/* Favorites Panel - positioned as dropdown from button */}
        {showFavoritesPanel && (
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
          />
        )}
      </div>

      {/* Element grid wrapper - dynamic rows based on available space, horizontal scroll */}
      <div className="flex-1 min-h-0" ref={gridContainerRef}>
        <div
          className={cn(
            'grid gap-2',
            'grid-flow-col auto-cols-min content-start',
            'h-full overflow-x-auto overflow-y-hidden scrollable',
            'p-2',
            'bg-gray-50 dark:bg-gray-900/50',
            'border-[2px] border-gray-200 dark:border-gray-700',
            'rounded-xl',
            highContrast && 'border-hc-border'
          )}
          style={{ gridTemplateRows: `repeat(${rowCount}, min-content)` }}
          role="region"
          aria-label="Element bank"
        >
          {elements.length === 0 ? (
            <div
              className="text-center py-8 text-gray-500 dark:text-gray-400"
              style={{ gridColumn: '1 / -1', gridRow: '1 / -1' }}
            >
              {searchQuery ? 'No elements match your search' : 'No elements yet'}
            </div>
          ) : (
            elements.map((element) => {
              const isSelected =
                (selectedA && selectedA.id === element.id) ||
                (selectedB && selectedB.id === element.id);
              const isTarget =
                targetElement && element.name.toLowerCase() === targetElement.toLowerCase();
              // Only show NEW badge for elements in the recent list (last 5 discovered)
              const showNewBadge = recentElements.includes(element.name);
              // Check if this element was a first discovery
              const isFirstDiscovery = firstDiscoveryElements.includes(element.name);
              const isDragging = draggedElementName === element.name;
              const isFavorite = favoriteElements.has(element.name);

              return (
                <ElementChip
                  key={element.id}
                  element={{ ...element, isFirstDiscovery }}
                  isSelected={isSelected}
                  isNew={showNewBadge}
                  isTarget={isTarget}
                  isFavorite={isFavorite}
                  onClick={onSelect}
                  disabled={disabled}
                  draggable={!disabled}
                  onDragStart={(e) => handleDragStart(e, element)}
                  onDragEnd={handleDragEnd}
                  isDragging={
                    isDragging || (isTouchDragging && touchDragElement?.id === element.id)
                  }
                  // Touch drag handlers for mobile
                  onTouchDragStart={() => handleTouchDragStart(element)}
                  onTouchDragMove={handleTouchDragMove}
                  onTouchDragEnd={handleTouchDragEnd}
                  touchDragThreshold={TOUCH_DRAG_THRESHOLD}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default ElementBank;
