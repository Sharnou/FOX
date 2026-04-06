'use client';
/**
 * RecentSearchesWidget
 * Stores and displays the user's recent searches in localStorage.
 * RTL-first, Arabic UX. No backend dependency.
 * Usage:
 *   import RecentSearchesWidget, { addRecentSearch } from '@/components/RecentSearchesWidget';
 *   // On search submit: addRecentSearch(query);
 *   // In JSX: <RecentSearchesWidget onSelect={(q) => setQuery(q)} />
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'xtox_recent_searches';
const MAX_SEARCHES = 8;

/** Read recent searches from localStorage */
export function getRecentSearches() {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Add a search term to recent searches (deduped, newest first) */
export function addRecentSearch(term) {
  if (!term || typeof window === 'undefined') return;
  const cleaned = term.trim();
  if (!cleaned) return;
  const existing = getRecentSearches().filter(
    (s) => s.toLowerCase() !== cleaned.toLowerCase()
  );
  const updated = [cleaned, ...existing].slice(0, MAX_SEARCHES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/** Clear all recent searches */
export function clearRecentSearches() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * RecentSearchesWidget component
 * @param {function} onSelect - called with the search term when a chip is clicked
 * @param {string} locale - 'ar' (default) or 'de' / other for LTR
 */
export default function RecentSearchesWidget({ onSelect, locale = 'ar' }) {
  const [searches, setSearches] = useState([]);

  const isRTL = locale === 'ar';

  const load = useCallback(() => {
    setSearches(getRecentSearches());
  }, []);

  useEffect(() => {
    load();
    // Refresh whenever localStorage changes (other tabs)
    const handler = (e) => {
      if (e.key === STORAGE_KEY) load();
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [load]);

  if (searches.length === 0) return null;

  const handleClear = () => {
    clearRecentSearches();
    setSearches([]);
  };

  const handleSelect = (term) => {
    onSelect?.(term);
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full px-3 py-2"
      aria-label={isRTL ? 'عمليات البحث الأخيرة' : 'Recent Searches'}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500 flex items-center gap-1">
          {/* Clock icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {isRTL ? 'عمليات البحث الأخيرة' : 'Recent Searches'}
        </span>
        <button
          onClick={handleClear}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
          aria-label={isRTL ? 'مسح الكل' : 'Clear all'}
        >
          {isRTL ? 'مسح الكل' : 'Clear all'}
        </button>
      </div>

      {/* Chips */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}
      >
        {searches.map((term, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(term)}
            className="flex-shrink-0 flex items-center gap-1 bg-gray-100 hover:bg-orange-100 text-gray-700 hover:text-orange-700 text-sm rounded-full px-3 py-1 transition-colors border border-transparent hover:border-orange-300"
            aria-label={isRTL ? 'ابحث عن ' + term : 'Search ' + term}
          >
            {/* Search icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="max-w-[120px] truncate">{term}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
