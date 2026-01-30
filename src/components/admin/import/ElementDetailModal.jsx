'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Edit2, Trash2, Save, ChevronDown, ChevronUp, AlertTriangle, Route } from 'lucide-react';
import authService from '@/services/auth.service';

/**
 * ElementDetailModal - Shows element details and combinations
 */
export default function ElementDetailModal({
  element,
  onClose,
  onUpdate,
  onDelete,
  onCombinationUpdate,
  onCombinationDelete,
}) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(element.name);
  const [editEmoji, setEditEmoji] = useState(element.emoji);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedSection, setExpandedSection] = useState('input'); // 'input' or 'result'
  const [pathData, setPathData] = useState(null);
  const [pathLoading, setPathLoading] = useState(false);
  const [showPath, setShowPath] = useState(false);

  // Fetch shortest path from starter elements
  const fetchShortestPath = useCallback(async () => {
    setPathLoading(true);
    try {
      const response = await fetch(
        `/api/admin/daily-alchemy/shortest-path?target=${encodeURIComponent(element.name)}`,
        {
          headers: await authService.getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPathData(data);
        setShowPath(true);
      } else {
        setError('Failed to load shortest path');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPathLoading(false);
    }
  }, [element.name]);

  // Fetch element details
  const fetchDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/import/elements/${encodeURIComponent(element.name)}`,
        {
          headers: await authService.getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setDetails(data);
      } else {
        setError('Failed to load element details');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [element.name]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Handle save
  const handleSave = async () => {
    if (!editName.trim()) {
      setError('Name cannot be empty');
      return;
    }

    setSaving(true);
    setError(null);

    const updates = {};
    if (editName.trim() !== element.name) {
      updates.newName = editName.trim();
    }
    if (editEmoji.trim() !== element.emoji) {
      updates.newEmoji = editEmoji.trim();
    }

    if (Object.keys(updates).length === 0) {
      setEditing(false);
      setSaving(false);
      return;
    }

    const result = await onUpdate(element.name, updates);

    if (result.success) {
      setEditing(false);
      // Update local state
      element.name = editName.trim();
      element.emoji = editEmoji.trim();
      // Refetch details
      fetchDetails();
    } else {
      setError(result.error || 'Failed to save changes');
    }

    setSaving(false);
  };

  // Handle delete
  const handleDelete = async () => {
    setSaving(true);
    const result = await onDelete(element.name);

    if (!result.success) {
      setError(result.error || 'Failed to delete element');
      setSaving(false);
    }
    // If successful, modal will be closed by parent
  };

  // Handle combination edit
  const handleCombinationEdit = async (combo, newResult, newEmoji) => {
    const result = await onCombinationUpdate(combo.element_a, combo.element_b, {
      newResult,
      newEmoji,
    });
    if (result.success) {
      fetchDetails();
    }
    return result;
  };

  // Handle combination delete
  const handleCombinationDeleteClick = async (combo) => {
    const result = await onCombinationDelete(combo.element_a, combo.element_b);
    if (result.success) {
      fetchDetails();
    }
    return result;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl border-4 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black bg-gray-50">
          <div className="flex items-center gap-3">
            {editing ? (
              <>
                <input
                  type="text"
                  value={editEmoji}
                  onChange={(e) => setEditEmoji(e.target.value)}
                  className="w-12 h-12 text-3xl text-center rounded-lg border-2 border-black"
                  placeholder="✨"
                />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xl font-bold px-3 py-1 rounded-lg border-2 border-black"
                />
              </>
            ) : (
              <>
                <span className="text-4xl">{element.emoji}</span>
                <span className="text-xl font-bold">{element.name}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="p-2 rounded-lg border-2 border-black bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditName(element.name);
                    setEditEmoji(element.emoji);
                    setError(null);
                  }}
                  className="p-2 rounded-lg border-2 border-black bg-gray-200 hover:bg-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="p-2 rounded-lg border-2 border-black bg-blue-500 text-white hover:bg-blue-600"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-lg border-2 border-black bg-red-500 text-white hover:bg-red-600"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg border-2 border-black bg-white hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-100 border-2 border-red-500 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-black border-t-transparent" />
            </div>
          ) : details ? (
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex gap-4 text-sm">
                <div className="px-3 py-1 bg-blue-100 rounded-lg border-2 border-black">
                  <span className="font-bold">{details.stats.asInputCount}</span> as input
                </div>
                <div className="px-3 py-1 bg-green-100 rounded-lg border-2 border-black">
                  <span className="font-bold">{details.stats.asResultCount}</span> as result
                </div>
              </div>

              {/* Shortest Path Section */}
              <div className="border-2 border-black rounded-xl overflow-hidden">
                <button
                  onClick={() => {
                    if (!showPath && !pathData) {
                      fetchShortestPath();
                    } else {
                      setShowPath(!showPath);
                    }
                  }}
                  disabled={pathLoading}
                  className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 transition-colors disabled:opacity-50"
                >
                  <span className="font-bold flex items-center gap-2">
                    <Route className="w-4 h-4" />
                    {pathLoading
                      ? 'Finding shortest path...'
                      : showPath
                        ? 'Hide Direct Path'
                        : 'Reveal Direct Path'}
                    {pathData && !pathData.isStarter && pathData.found && (
                      <span className="text-purple-600">({pathData.steps} steps)</span>
                    )}
                  </span>
                  {showPath ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>

                {showPath && pathData && (
                  <div className="p-4 bg-purple-50/50">
                    {pathData.isStarter ? (
                      <div className="text-center text-purple-700 font-medium">
                        {element.emoji} {element.name} is a starter element!
                      </div>
                    ) : pathData.found ? (
                      <div className="space-y-2">
                        <div className="text-xs text-purple-600 mb-3">
                          Shortest path from starter elements ({pathData.steps} combinations):
                        </div>
                        {pathData.path.map((step, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 text-sm p-2 bg-white rounded-lg border border-purple-200"
                          >
                            <span className="text-purple-500 font-mono text-xs w-6">
                              {index + 1}.
                            </span>
                            <span>{step.element_a}</span>
                            <span className="text-gray-400">+</span>
                            <span>{step.element_b}</span>
                            <span className="text-gray-400">=</span>
                            <span className="font-medium">{step.result_element}</span>
                            <span>{step.result_emoji}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-red-600">
                        {pathData.message || 'No path found from starter elements'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Combinations as Input */}
              <div className="border-2 border-black rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'input' ? null : 'input')}
                  className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <span className="font-bold">
                    Combinations with {element.name} ({details.stats.asInputCount})
                  </span>
                  {expandedSection === 'input' ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>

                {expandedSection === 'input' && (
                  <div className="max-h-64 overflow-y-auto">
                    {details.combinations.asInput.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No combinations found</div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {details.combinations.asInput.map((combo) => (
                          <CombinationRow
                            key={combo.id}
                            combo={combo}
                            highlightElement={element.name}
                            onEdit={handleCombinationEdit}
                            onDelete={handleCombinationDeleteClick}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Combinations as Result */}
              <div className="border-2 border-black rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === 'result' ? null : 'result')}
                  className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <span className="font-bold">
                    Creates {element.name} ({details.stats.asResultCount})
                  </span>
                  {expandedSection === 'result' ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </button>

                {expandedSection === 'result' && (
                  <div className="max-h-64 overflow-y-auto">
                    {details.combinations.asResult.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">No combinations found</div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {details.combinations.asResult.map((combo) => (
                          <CombinationRow
                            key={combo.id}
                            combo={combo}
                            highlightElement={element.name}
                            onEdit={handleCombinationEdit}
                            onDelete={handleCombinationDeleteClick}
                            isResult
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">Failed to load details</div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border-4 border-black p-6 max-w-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold">Delete Element?</h3>
              </div>

              <p className="text-gray-600 mb-4">
                This will delete <strong>{element.name}</strong> and{' '}
                <strong>all {details?.stats?.totalInvolved || 0} combinations</strong> where it
                appears. This cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-black bg-gray-100 hover:bg-gray-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg border-2 border-black bg-red-500 text-white hover:bg-red-600 font-bold disabled:opacity-50"
                >
                  {saving ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * CombinationRow - Single combination row with edit capability
 */
function CombinationRow({ combo, highlightElement, onEdit, onDelete, isResult }) {
  const [editing, setEditing] = useState(false);
  const [editResult, setEditResult] = useState(combo.result_element);
  const [editEmoji, setEditEmoji] = useState(combo.result_emoji);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    const result = await onEdit(
      combo,
      editResult !== combo.result_element ? editResult : null,
      editEmoji !== combo.result_emoji ? editEmoji : null
    );

    if (result.success) {
      setEditing(false);
    } else {
      setError(result.error);
    }

    setSaving(false);
  };

  const handleDelete = async () => {
    setSaving(true);
    const result = await onDelete(combo);
    if (!result.success) {
      setError(result.error);
    }
    setSaving(false);
  };

  if (editing) {
    return (
      <div className="p-3 bg-yellow-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">
            {combo.element_a} + {combo.element_b} =
          </span>
          <input
            type="text"
            value={editResult}
            onChange={(e) => setEditResult(e.target.value)}
            className="px-2 py-1 rounded border-2 border-black text-sm flex-1"
          />
          <input
            type="text"
            value={editEmoji}
            onChange={(e) => setEditEmoji(e.target.value)}
            className="px-2 py-1 rounded border-2 border-black text-sm w-12 text-center"
          />
        </div>
        {error && <div className="text-red-500 text-xs mb-2">{error}</div>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 rounded border-2 border-black bg-green-500 text-white text-xs font-bold disabled:opacity-50"
          >
            Save
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setEditResult(combo.result_element);
              setEditEmoji(combo.result_emoji);
              setError(null);
            }}
            className="px-3 py-1 rounded border-2 border-black bg-gray-200 text-xs font-bold"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between p-3 hover:bg-gray-50 group">
      <div className="flex items-center gap-2 text-sm">
        {isResult ? (
          <>
            <span
              className={
                combo.element_a.toLowerCase() === highlightElement.toLowerCase() ? 'font-bold' : ''
              }
            >
              {combo.element_a}
            </span>
            <span>+</span>
            <span
              className={
                combo.element_b.toLowerCase() === highlightElement.toLowerCase() ? 'font-bold' : ''
              }
            >
              {combo.element_b}
            </span>
          </>
        ) : (
          <>
            <span className="font-bold">{highlightElement}</span>
            <span>+</span>
            <span>{combo.otherElement}</span>
          </>
        )}
        <span>=</span>
        <span className={isResult ? 'font-bold' : ''}>{combo.result_element}</span>
        <span>{combo.result_emoji}</span>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setEditing(true)}
          className="p-1 rounded hover:bg-blue-100"
          title="Edit"
        >
          <Edit2 className="w-4 h-4 text-blue-600" />
        </button>
        <button
          onClick={handleDelete}
          disabled={saving}
          className="p-1 rounded hover:bg-red-100 disabled:opacity-50"
          title="Delete"
        >
          <Trash2 className="w-4 h-4 text-red-600" />
        </button>
      </div>
    </div>
  );
}
