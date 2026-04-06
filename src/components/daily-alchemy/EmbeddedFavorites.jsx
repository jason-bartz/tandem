'use client';

import { useState, useCallback } from 'react';
import { Trash2, BrushCleaning } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import ElementChip from './ElementChip';
import { FAVORITE_KEY_LABELS } from '@/hooks/useAlchemyKeyboard';

/**
 * EmbeddedFavorites - Embedded favorites section for desktop layout
 * Always visible, supports drag-and-drop to add/remove favorites
 */
export function EmbeddedFavorites({
  elements = [],
  favoriteElements = new Set(),
  onToggleFavorite,
  onClearAllFavorites,
  onSelectElement,
  selectedA,
  selectedB,
  maxFavorites = 12,
  recentElements = [],
  firstDiscoveryElements = [],
  ctrlHeld = false,
}) {
  const { highContrast } = useTheme();
  const [draggedElement, setDraggedElement] = useState(null);
  const [isOverDropZone, setIsOverDropZone] = useState(false);
  const [isOverAddZone, setIsOverAddZone] = useState(false);

  // Get favorite elements as array
  const favoritesList = elements.filter((el) => favoriteElements.has(el.name));

  const handleElementClick = (element) => {
    onSelectElement?.(element);
  };

  // Drag handlers for removing favorites (dragging out of favorites)
  const handleDragStart = (e, element) => {
    setDraggedElement(element);
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        action: 'remove-favorite',
        elementName: element.name,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedElement(null);
    setIsOverDropZone(false);
  };

  // Drop zone for removing favorites
  const handleDropZoneDragOver = (e) => {
    e.preventDefault();
    setIsOverDropZone(true);
  };

  const handleDropZoneDragLeave = () => {
    setIsOverDropZone(false);
  };

  const handleDropZoneDrop = (e) => {
    e.preventDefault();
    setIsOverDropZone(false);

    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.action === 'remove-favorite' && data.elementName) {
        onToggleFavorite?.(data.elementName);
      }
    } catch {
      // Invalid data
    }
  };

  // Handlers for adding favorites (dropping into the favorites area)
  const handleAddZoneDragOver = useCallback(
    (e) => {
      e.preventDefault();
      if (favoriteElements.size < maxFavorites) {
        setIsOverAddZone(true);
      }
    },
    [favoriteElements.size, maxFavorites]
  );

  const handleAddZoneDragLeave = () => {
    setIsOverAddZone(false);
  };

  const handleAddZoneDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsOverAddZone(false);

      if (favoriteElements.size >= maxFavorites) return;

      try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        // Handle both add-favorite and general element drops
        const elementName = data.elementName;
        if (elementName && !favoriteElements.has(elementName)) {
          onToggleFavorite?.(elementName);
        }
      } catch {
        // Invalid data
      }
    },
    [favoriteElements, maxFavorites, onToggleFavorite]
  );

  return (
    <div
      className={cn(
        'flex flex-col h-full lg:h-auto lg:max-h-full',
        'bg-bg-card dark:bg-gray-800',
        'dark:border-gray-600',
        'rounded-xl',
        'dark:',
        'overflow-hidden',
        highContrast && 'border-2 border-hc-border'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="font-bold text-sm dark:text-white">
          Favorites ({favoriteElements.size}/{maxFavorites})
        </h3>
        {/* Clear all button */}
        {favoriteElements.size > 0 && (
          <button
            onClick={onClearAllFavorites}
            className={cn(
              'p-1 rounded-lg',
              'hover:bg-red-100 dark:hover:bg-red-900/30',
              'transition-colors'
            )}
            aria-label="Clear all favorites"
            title="Clear all favorites"
          >
            <BrushCleaning className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </button>
        )}
      </div>

      {/* Favorites Content - scrollable area for favorites */}
      <div
        className={cn(
          'flex-1 min-h-0 overflow-y-auto p-3',
          isOverAddZone &&
            favoriteElements.size < maxFavorites &&
            'bg-yellow-50 dark:bg-yellow-900/20'
        )}
        onDragOver={handleAddZoneDragOver}
        onDragLeave={handleAddZoneDragLeave}
        onDrop={handleAddZoneDrop}
      >
        {favoritesList.length === 0 ? (
          <div
            className={cn(
              'flex flex-col items-center justify-center h-full text-center py-4',
              'border-2 border-dashed rounded-lg',
              isOverAddZone
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                : 'border-gray-200 dark:border-gray-700'
            )}
          >
            <p
              className={cn(
                'text-sm mb-1',
                isOverAddZone
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {isOverAddZone ? 'Drop to add!' : 'No favorites yet'}
            </p>
            {!isOverAddZone && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Drag elements here for quick access
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {favoritesList.map((element, index) => {
              const isSelected =
                (selectedA && selectedA.id === element.id) ||
                (selectedB && selectedB.id === element.id);
              const showNewBadge = recentElements.includes(element.name);
              const isFirstDiscovery = firstDiscoveryElements.includes(element.name);
              const isDragging = draggedElement?.id === element.id;
              const keyLabel = FAVORITE_KEY_LABELS[index];

              return (
                <div
                  key={element.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, element)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    'cursor-grab active:cursor-grabbing relative',
                    isDragging && 'opacity-50'
                  )}
                >
                  <ElementChip
                    element={{ ...element, isFirstDiscovery }}
                    isSelected={isSelected}
                    isNew={showNewBadge}
                    onClick={handleElementClick}
                    size="small"
                    disableAnimations
                  />
                  {/* Keyboard shortcut badge - shown while Ctrl is held */}
                  {ctrlHeld && keyLabel && (
                    <span
                      className={cn(
                        'absolute -top-1.5 -left-1.5 z-10',
                        'flex items-center justify-center',
                        'w-5 h-5 rounded-md',
                        'bg-gray-900 dark:bg-gray-100',
                        'text-white dark:text-gray-900',
                        'text-[10px] font-bold leading-none',
                        'shadow-[2px_2px_0px_rgba(0,0,0,0.2)]',
                        'pointer-events-none'
                      )}
                    >
                      {keyLabel}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Drop zone to remove - anchored at bottom */}
      {favoritesList.length > 0 && (
        <div className="flex-shrink-0 p-3 pt-0">
          <div
            onDragOver={handleDropZoneDragOver}
            onDragLeave={handleDropZoneDragLeave}
            onDrop={handleDropZoneDrop}
            className={cn(
              'flex items-center justify-center gap-2 p-2',
              'border-2 border-dashed rounded-lg',
              'transition-colors',
              isOverDropZone
                ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                : 'border-gray-300 dark:border-gray-600'
            )}
          >
            <Trash2 className={cn('w-4 h-4', isOverDropZone ? 'text-red-500' : 'text-gray-400')} />
            <span className={cn('text-xs', isOverDropZone ? 'text-red-500' : 'text-gray-400')}>
              Drag here to remove
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmbeddedFavorites;
