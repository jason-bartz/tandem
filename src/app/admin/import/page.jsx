'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import ElementGrid from '@/components/admin/import/ElementGrid';
import ElementDetailModal from '@/components/admin/import/ElementDetailModal';
import authService from '@/services/auth.service';
import logger from '@/lib/logger';

export default function ImportAdminPage() {
  const [stats, setStats] = useState(null);
  const [elements, setElements] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, totalPages: 1 });
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedElement, setSelectedElement] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/import/stats', {
        headers: await authService.getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      logger.error('Error fetching stats', error);
    }
  }, []);

  // Fetch elements
  const fetchElements = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '100',
        });

        if (selectedLetter) {
          params.set('letter', selectedLetter);
        }

        if (debouncedSearch) {
          params.set('search', debouncedSearch);
        }

        const response = await fetch(`/api/admin/import/elements?${params}`, {
          headers: await authService.getAuthHeaders(),
        });

        if (response.ok) {
          const data = await response.json();
          setElements(data.elements);
          setPagination(data.pagination);
        }
      } catch (error) {
        logger.error('Error fetching elements', error);
      } finally {
        setLoading(false);
      }
    },
    [selectedLetter, debouncedSearch]
  );

  // Initial load
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reload elements when filters change
  useEffect(() => {
    fetchElements(1);
  }, [fetchElements]);

  // Handle element selection
  const handleElementClick = (element) => {
    setSelectedElement(element);
    setShowModal(true);
  };

  // Handle element update
  const handleElementUpdate = async (currentName, updates) => {
    try {
      const response = await fetch('/api/admin/import/elements', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(await authService.getAuthHeaders()),
        },
        body: JSON.stringify({ currentName, ...updates }),
      });

      if (response.ok) {
        // Refresh data
        await fetchStats();
        await fetchElements(pagination.page);
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Handle element delete
  const handleElementDelete = async (name) => {
    try {
      const response = await fetch(`/api/admin/import/elements?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: await authService.getAuthHeaders(),
      });

      if (response.ok) {
        setShowModal(false);
        setSelectedElement(null);
        await fetchStats();
        await fetchElements(pagination.page);
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Handle combination update
  const handleCombinationUpdate = async (elementA, elementB, updates) => {
    try {
      const response = await fetch('/api/admin/import/combinations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(await authService.getAuthHeaders()),
        },
        body: JSON.stringify({ elementA, elementB, ...updates }),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // Handle combination delete
  const handleCombinationDelete = async (elementA, elementB) => {
    try {
      const params = new URLSearchParams({ elementA, elementB });
      const response = await fetch(`/api/admin/import/combinations?${params}`, {
        method: 'DELETE',
        headers: await authService.getAuthHeaders(),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const error = await response.json();
        return { success: false, error: error.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin"
            className="p-2 rounded-xl border-2 border-black bg-white hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black">Import Elements Manager</h1>
            <p className="text-sm text-gray-600">
              Manage imported Infinite Snake elements and combinations
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex gap-4 text-sm">
            <div className="px-4 py-2 bg-blue-100 rounded-xl border-2 border-black">
              <span className="font-bold">{stats.totalElements.toLocaleString()}</span> elements
            </div>
            <div className="px-4 py-2 bg-green-100 rounded-xl border-2 border-black">
              <span className="font-bold">{stats.totalCombinations.toLocaleString()}</span>{' '}
              combinations
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search elements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl border-2 border-black focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Alphabet Filter */}
        {stats && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedLetter(null)}
              className={`px-3 py-1.5 rounded-lg border-2 border-black font-bold text-sm transition-colors ${
                selectedLetter === null ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'
              }`}
            >
              All
            </button>
            {stats.alphabet.map(({ letter, count }) => (
              <button
                key={letter}
                onClick={() => setSelectedLetter(letter)}
                disabled={count === 0}
                className={`px-3 py-1.5 rounded-lg border-2 border-black font-bold text-sm transition-colors ${
                  selectedLetter === letter
                    ? 'bg-black text-white'
                    : count === 0
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-100'
                }`}
                title={`${count} elements`}
              >
                {letter === 'OTHER' ? '#' : letter}
                {count > 0 && <span className="ml-1 text-xs opacity-60">({count})</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Element Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent" />
        </div>
      ) : elements.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          {debouncedSearch || selectedLetter
            ? 'No elements match your filters'
            : 'No elements found. Run the import script first.'}
        </div>
      ) : (
        <>
          <ElementGrid elements={elements} onElementClick={handleElementClick} />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => fetchElements(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 rounded-xl border-2 border-black bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-bold">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchElements(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 rounded-xl border-2 border-black bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Element Detail Modal */}
      {showModal && selectedElement && (
        <ElementDetailModal
          element={selectedElement}
          onClose={() => {
            setShowModal(false);
            setSelectedElement(null);
          }}
          onUpdate={handleElementUpdate}
          onDelete={handleElementDelete}
          onCombinationUpdate={handleCombinationUpdate}
          onCombinationDelete={handleCombinationDelete}
        />
      )}
    </div>
  );
}
