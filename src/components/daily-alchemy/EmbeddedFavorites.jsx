'use client';

import { useState, useCallback } from 'react';
import { Trash2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import ElementChip from './ElementChip';

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
        'flex flex-col h-full',
        'bg-white dark:bg-gray-800',
        'border-[2px] border-black dark:border-gray-600',
        'rounded-xl',
        'shadow-[3px_3px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_rgba(75,85,99,1)]',
        'overflow-hidden',
        highContrast && 'border-[3px] border-hc-border'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b-2 border-black dark:border-gray-600 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Image
            src="/icons/ui/favorites.png"
            alt=""
            width={18}
            height={18}
            className="w-[18px] h-[18px]"
          />
          <h3 className="font-bold text-sm">
            Favorites ({favoriteElements.size}/{maxFavorites})
          </h3>
        </div>
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
            <Image
              src="/icons/ui/broom.png"
              alt="Clear all"
              width={18}
              height={18}
              className="w-[18px] h-[18px]"
            />
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
            <Image
              src="/icons/ui/favorites.png"
              alt=""
              width={32}
              height={32}
              className={cn('w-8 h-8 mb-2', isOverAddZone ? 'opacity-100' : 'opacity-30')}
            />
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
            {favoritesList.map((element) => {
              const isSelected =
                (selectedA && selectedA.id === element.id) ||
                (selectedB && selectedB.id === element.id);
              const showNewBadge = recentElements.includes(element.name);
              const isFirstDiscovery = firstDiscoveryElements.includes(element.name);
              const isDragging = draggedElement?.id === element.id;

              return (
                <div
                  key={element.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, element)}
                  onDragEnd={handleDragEnd}
                  className={cn('cursor-grab active:cursor-grabbing', isDragging && 'opacity-50')}
                >
                  <ElementChip
                    element={{ ...element, isFirstDiscovery }}
                    isSelected={isSelected}
                    isNew={showNewBadge}
                    onClick={handleElementClick}
                    size="small"
                    disableAnimations
                  />
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
