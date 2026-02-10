'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Pencil, Loader2, Download, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * SavesModal - Modal for managing 3 creative mode save slots
 * Shows slot summaries, allows switching, renaming, and clearing slots
 */
export function SavesModal({
  isOpen,
  onClose,
  slotSummaries,
  activeSaveSlot,
  onSwitchSlot,
  onRenameSlot,
  onClearSlot,
  onExportSlot,
  onImportSlot,
  isSlotSwitching,
}) {
  const { highContrast } = useTheme();
  const [editingSlot, setEditingSlot] = useState(null);
  const [editName, setEditName] = useState('');
  const [clearingSlot, setClearingSlot] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const [exportingSlot, setExportingSlot] = useState(null);
  const [importError, setImportError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importConfirmSlot, setImportConfirmSlot] = useState(null);
  const [pendingImportFile, setPendingImportFile] = useState(null);
  const editInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingSlot !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingSlot]);

  // Reset internal state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEditingSlot(null);
      setEditName('');
      setClearingSlot(null);
      setIsClearing(false);
      setExportingSlot(null);
      setImportError(null);
      setIsImporting(false);
      setImportConfirmSlot(null);
      setPendingImportFile(null);
    }
  }, [isOpen]);

  const handleRenameStart = (slotNum, currentName) => {
    setEditingSlot(slotNum);
    setEditName(currentName || `Save ${slotNum}`);
  };

  const handleRenameConfirm = async () => {
    if (editingSlot === null) return;
    const trimmed = editName.trim();
    // If name is "Save N" (default) or empty, save as null to use default
    const nameToSave = trimmed === '' || trimmed === `Save ${editingSlot}` ? null : trimmed;
    await onRenameSlot(editingSlot, nameToSave);
    setEditingSlot(null);
    setEditName('');
  };

  const handleRenameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleRenameConfirm();
    } else if (e.key === 'Escape') {
      setEditingSlot(null);
      setEditName('');
    }
  };

  const handleClearConfirm = async () => {
    if (clearingSlot === null) return;
    setIsClearing(true);
    await onClearSlot(clearingSlot);
    setIsClearing(false);
    setClearingSlot(null);
  };

  const handleSlotClick = (slotNum) => {
    if (slotNum === activeSaveSlot || isSlotSwitching || editingSlot !== null) return;
    onSwitchSlot(slotNum);
  };

  const getSlotName = (slot) => slot.name || `Save ${slot.slot}`;

  const handleExport = async (slotNum) => {
    setExportingSlot(slotNum);
    try {
      await onExportSlot(slotNum);
    } finally {
      setExportingSlot(null);
    }
  };

  const handleImportClick = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    const emptySlot = slotSummaries.find((s) => !s.hasSave);
    const targetSlot = emptySlot ? emptySlot.slot : activeSaveSlot;
    const targetHasSave = slotSummaries.find((s) => s.slot === targetSlot)?.hasSave;

    if (targetHasSave) {
      setPendingImportFile(file);
      setImportConfirmSlot(targetSlot);
    } else {
      await executeImport(targetSlot, file);
    }
  };

  const executeImport = async (slotNum, file) => {
    setIsImporting(true);
    setImportError(null);
    try {
      const result = await onImportSlot(slotNum, file);
      if (!result.success) {
        setImportError(result.error || 'Import failed.');
      }
    } catch {
      setImportError('Import failed unexpectedly.');
    } finally {
      setIsImporting(false);
      setPendingImportFile(null);
      setImportConfirmSlot(null);
    }
  };

  const handleImportConfirm = () => {
    if (importConfirmSlot !== null && pendingImportFile) {
      executeImport(importConfirmSlot, pendingImportFile);
    }
  };

  const handleImportCancel = () => {
    setImportConfirmSlot(null);
    setPendingImportFile(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

          {/* Modal Card */}
          <motion.div
            className={cn(
              'relative z-10 flex flex-col w-full max-w-sm mx-4',
              'bg-white dark:bg-gray-800',
              'border-[3px] border-black dark:border-gray-600',
              'rounded-2xl',
              'shadow-[4px_4px_0px_rgba(0,0,0,1)]',
              highContrast && 'border-hc-border'
            )}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Saves</h3>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Slot Cards */}
            <div className="flex flex-col gap-3 px-5 pb-5">
              {[1, 2, 3].map((slotNum) => {
                const slot = slotSummaries.find((s) => s.slot === slotNum) || {
                  slot: slotNum,
                  hasSave: false,
                  name: null,
                };
                const isActive = slotNum === activeSaveSlot;
                const isSwitchingToThis = isSlotSwitching && !isActive;

                return (
                  <div
                    key={slotNum}
                    onClick={() => handleSlotClick(slotNum)}
                    className={cn(
                      'relative p-3 rounded-xl transition-all duration-150',
                      'border-[2px] border-black dark:border-gray-600',
                      isActive && [
                        'bg-soup-primary/10 dark:bg-soup-primary/20',
                        'shadow-[2px_2px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_rgba(75,85,99,1)]',
                        highContrast && 'border-[3px] border-hc-border',
                      ],
                      !isActive &&
                        slot.hasSave && [
                          'cursor-pointer',
                          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                          'hover:shadow-[2px_2px_0px_rgba(0,0,0,1)]',
                        ],
                      !isActive &&
                        !slot.hasSave && [
                          'border-dashed',
                          'cursor-pointer',
                          'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                          'opacity-60 hover:opacity-80',
                        ],
                      isSlotSwitching && 'pointer-events-none opacity-50'
                    )}
                  >
                    {/* Slot name row */}
                    <div className="flex items-center gap-2 mb-1">
                      {editingSlot === slotNum ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onBlur={handleRenameConfirm}
                          onKeyDown={handleRenameKeyDown}
                          maxLength={30}
                          className={cn(
                            'flex-1 px-2 py-0.5 text-sm font-bold',
                            'bg-white dark:bg-gray-700',
                            'border-[2px] border-soup-primary',
                            'rounded-lg outline-none',
                            'text-gray-900 dark:text-white'
                          )}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <span
                            className={cn(
                              'text-sm font-bold',
                              isActive
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-700 dark:text-gray-300',
                              !slot.hasSave && !isActive && 'text-gray-400 dark:text-gray-500'
                            )}
                          >
                            {getSlotName(slot)}
                          </span>
                          {slot.hasSave && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameStart(slotNum, slot.name);
                                }}
                                className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExport(slotNum);
                                }}
                                disabled={exportingSlot !== null}
                                className="p-0.5 text-gray-400 hover:text-soup-primary dark:hover:text-soup-primary transition-colors disabled:opacity-30"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>

                    {/* Stats row */}
                    {slot.hasSave ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-gray-700 dark:text-gray-200">
                            {slot.elementCount}
                          </span>{' '}
                          elements
                          <span className="mx-1.5 text-gray-300 dark:text-gray-600">·</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400">
                            {slot.firstDiscoveries}
                          </span>{' '}
                          first
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setClearingSlot(slotNum);
                          }}
                          className={cn(
                            'px-2 py-0.5 text-xs font-medium',
                            'text-red-500 hover:text-red-600',
                            'hover:bg-red-50 dark:hover:bg-red-900/20',
                            'rounded-md transition-colors'
                          )}
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Empty</span>
                    )}

                    {/* Switching indicator */}
                    {isSwitchingToThis && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-800/60 rounded-xl">
                        <Loader2 className="w-5 h-5 animate-spin text-soup-primary" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Import button */}
              <button
                onClick={handleImportClick}
                disabled={isImporting || isSlotSwitching}
                className={cn(
                  'flex items-center justify-center gap-2 w-full py-2.5 mt-1',
                  'text-sm font-medium',
                  'text-gray-500 dark:text-gray-400',
                  'border-2 border-dashed border-gray-300 dark:border-gray-600',
                  'rounded-xl',
                  'hover:text-soup-primary hover:border-soup-primary/50',
                  'hover:bg-soup-primary/5',
                  'transition-all duration-150',
                  'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
              >
                <Upload className="w-4 h-4" />
                {isImporting ? 'Importing...' : 'Import Save'}
              </button>
              {importError && (
                <p className="text-xs text-red-500 text-center mt-1">{importError}</p>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".da,.json"
                className="hidden"
                onChange={handleFileSelected}
              />
            </div>
          </motion.div>

          {/* Import Overwrite Confirmation Sub-Modal */}
          <AnimatePresence>
            {importConfirmSlot !== null && (
              <motion.div
                className="fixed inset-0 z-[60] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className="absolute inset-0 bg-black/20"
                  onClick={() => !isImporting && handleImportCancel()}
                />
                <motion.div
                  className={cn(
                    'relative z-10 flex flex-col gap-4 p-6 mx-4 max-w-sm',
                    'bg-white dark:bg-gray-800',
                    'border-[3px] border-black dark:border-gray-600',
                    'rounded-2xl',
                    'shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  )}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    Overwrite Save?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    All elements in &ldquo;
                    {(() => {
                      const s = slotSummaries.find((s) => s.slot === importConfirmSlot);
                      return s?.name || `Save ${importConfirmSlot}`;
                    })()}
                    &rdquo; will be replaced with the imported save. This cannot be undone.
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={handleImportCancel}
                      disabled={isImporting}
                      className={cn(
                        'flex-1 px-4 py-2',
                        'text-sm font-medium',
                        'bg-gray-100 dark:bg-gray-700',
                        'text-gray-700 dark:text-gray-300',
                        'border-2 border-gray-300 dark:border-gray-600',
                        'rounded-xl',
                        'hover:bg-gray-200 dark:hover:bg-gray-600',
                        'transition-colors',
                        'disabled:opacity-50'
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleImportConfirm}
                      disabled={isImporting}
                      className={cn(
                        'flex-1 px-4 py-2',
                        'text-sm font-bold',
                        'bg-amber-500 text-white',
                        'border-2 border-amber-600',
                        'rounded-xl',
                        'shadow-[2px_2px_0px_rgba(0,0,0,1)]',
                        'hover:bg-amber-600',
                        'active:translate-y-[1px] active:shadow-none',
                        'transition-all duration-150',
                        'disabled:opacity-50'
                      )}
                    >
                      {isImporting ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Overwrite'
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clear Confirmation Sub-Modal */}
          <AnimatePresence>
            {clearingSlot !== null && (
              <motion.div
                className="fixed inset-0 z-[60] flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  className="absolute inset-0 bg-black/20"
                  onClick={() => !isClearing && setClearingSlot(null)}
                />
                <motion.div
                  className={cn(
                    'relative z-10 flex flex-col gap-4 p-6 mx-4 max-w-sm',
                    'bg-white dark:bg-gray-800',
                    'border-[3px] border-black dark:border-gray-600',
                    'rounded-2xl',
                    'shadow-[4px_4px_0px_rgba(0,0,0,1)]'
                  )}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Clear Save?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    All discovered elements in &ldquo;
                    {(() => {
                      const s = slotSummaries.find((s) => s.slot === clearingSlot);
                      return s?.name || `Save ${clearingSlot}`;
                    })()}
                    &rdquo; will be lost. This cannot be undone.
                  </p>
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => setClearingSlot(null)}
                      disabled={isClearing}
                      className={cn(
                        'flex-1 px-4 py-2',
                        'text-sm font-medium',
                        'bg-gray-100 dark:bg-gray-700',
                        'text-gray-700 dark:text-gray-300',
                        'border-2 border-gray-300 dark:border-gray-600',
                        'rounded-xl',
                        'hover:bg-gray-200 dark:hover:bg-gray-600',
                        'transition-colors',
                        'disabled:opacity-50'
                      )}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleClearConfirm}
                      disabled={isClearing}
                      className={cn(
                        'flex-1 px-4 py-2',
                        'text-sm font-bold',
                        'bg-red-500 text-white',
                        'border-2 border-red-600',
                        'rounded-xl',
                        'shadow-[2px_2px_0px_rgba(0,0,0,1)]',
                        'hover:bg-red-600',
                        'active:translate-y-[1px] active:shadow-none',
                        'transition-all duration-150',
                        'disabled:opacity-50'
                      )}
                    >
                      {isClearing ? (
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      ) : (
                        'Clear Save'
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
