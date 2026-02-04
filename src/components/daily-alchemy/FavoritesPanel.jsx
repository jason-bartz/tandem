'use client';

import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import ElementChip from './ElementChip';

/**
 * FavoritesPanel - Panel showing favorite elements
 * Drag elements out to remove them from favorites
 */
export function FavoritesPanel({
  elements = [],
  favoriteElements = new Set(),
  onToggleFavorite,
  onClearAllFavorites,
  onSelectElement,
  selectedA,
  selectedB,
  maxFavorites = 12,
  onClose,
  recentElements = [],
  firstDiscoveryElements = [],
}) {
  const { highContrast } = useTheme();
  const [draggedElement, setDraggedElement] = useState(null);
  const [isOverDropZone, setIsOverDropZone] = useState(false);

  // Get favorite elements as array
  const favoritesList = elements.filter((el) => favoriteElements.has(el.name));

  const handleElementClick = (element) => {
    onSelectElement?.(element);
    // Close the panel after selecting an element to prevent backdrop from blocking the game
    // This fixes a mobile bug where the invisible backdrop blocks touch events
    onClose?.();
  };

  // Drag handlers for removing favorites
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

  return (
    <>
      {/* Click-outside backdrop - bg-black/0 makes it "visible" to mobile touch events */}
      <div className="fixed inset-0 z-40 bg-black/0" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'absolute left-0 right-0 top-full mt-2 z-50',
          'bg-white dark:bg-gray-800',
          'border-[2px] border-black dark:border-gray-600',
          'rounded-xl',
          'shadow-[4px_4px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_rgba(75,85,99,1)]',
          'overflow-hidden flex flex-col',
          highContrast && 'border-[3px] border-hc-border'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b-2 border-black dark:border-gray-600">
          <div className="flex items-center gap-2">
            <Image
              src="/icons/ui/favorites.png"
              alt=""
              width={20}
              height={20}
              className="w-5 h-5"
            />
            <h3 className="font-bold text-sm">
              Favorites ({favoriteElements.size}/{maxFavorites})
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {/* Clear all button */}
            {favoriteElements.size > 0 && (
              <button
                onClick={onClearAllFavorites}
                className={cn(
                  'p-1.5 rounded-lg',
                  'hover:bg-red-100 dark:hover:bg-red-900/30',
                  'transition-colors'
                )}
                aria-label="Clear all favorites"
                title="Clear all favorites"
              >
                <Image
                  src="/icons/ui/broom.png"
                  alt="Clear all"
                  width={20}
                  height={20}
                  className="w-5 h-5"
                />
              </button>
            )}
            <button
              onClick={onClose}
              className={cn(
                'p-1.5 rounded-lg',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors'
              )}
              aria-label="Close favorites panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Favorites Grid */}
        <div className="p-3">
          {favoritesList.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">No favorites yet</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
                <span>Long press any element to add to</span>
                <Image
                  src="/icons/ui/favorites.png"
                  alt="favorites"
                  width={16}
                  height={16}
                  className="w-4 h-4 inline-block"
                />
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 mb-3">
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
                      className={cn(
                        'cursor-grab active:cursor-grabbing',
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
                    </div>
                  );
                })}
              </div>

              {/* Drop zone to remove */}
              <div
                onDragOver={handleDropZoneDragOver}
                onDragLeave={handleDropZoneDragLeave}
                onDrop={handleDropZoneDrop}
                className={cn(
                  'flex items-center justify-center gap-2 p-3',
                  'border-2 border-dashed rounded-lg',
                  'transition-colors',
                  isOverDropZone
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                )}
              >
                <Trash2
                  className={cn('w-4 h-4', isOverDropZone ? 'text-red-500' : 'text-gray-400')}
                />
                <span className={cn('text-xs', isOverDropZone ? 'text-red-500' : 'text-gray-400')}>
                  Drag here to remove
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default FavoritesPanel;
