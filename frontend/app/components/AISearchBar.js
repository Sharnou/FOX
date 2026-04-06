'use client';
/**
 * XTOX AI Smart Search Bar
 * - Debounced Gemini API calls (500ms) for Arabic spell correction
 * - Auto-suggests related search terms in Arabic
 * - Detects category from query
 * - Shows RTL-friendly dropdown below search bar
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getSmartSearchSuggestions } from '../../lib/geminiAI';

const CATEGORY_ICONS = {
  'مركبات': '🚗',
  'إلكترونيات': '📱',
  'عقارات': '🏠',
  'وظائف': '💼',
  'خدمات': '🔧',
  'عام': '📦',
};

export default function AISearchBar({ onSearch, placeholder = 'ابحث عن أي شيء...', initialValue = '' }) {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState(null); // { corrected, suggestions, category }
  const [showDropdown, setShowDropdown] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Debounced Gemini call
  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.trim().length < 2) {
      setSuggestions(null);
      setShowDropdown(false);
      return;
    }

    setAiLoading(true);
    try {
      const result = await getSmartSearchSuggestions(q);
      if (result) {
        setSuggestions(result);
        setShowDropdown(true);
      }
    } catch {
      // Silently fail — don't block the search bar
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 500);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSubmit(e) {
    e?.preventDefault();
    if (query.trim()) {
      setShowDropdown(false);
      if (onSearch) onSearch(query.trim());
      else window.location.href = '/search?q=' + encodeURIComponent(query.trim());
    }
  }

  function selectSuggestion(term) {
    setQuery(term);
    setShowDropdown(false);
    if (onSearch) onSearch(term);
    else window.location.href = '/search?q=' + encodeURIComponent(term);
  }

  const catIcon = suggestions?.category ? (CATEGORY_ICONS[suggestions.category] || '🔍') : '🔍';

  return (
    <div style={{ position: 'relative', width: '100%', direction: 'rtl' }}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => suggestions && setShowDropdown(true)}
            placeholder={placeholder}
            dir="rtl"
            style={{
              width: '100%',
              padding: '12px 44px 12px 16px',
              borderRadius: 12,
              border: '2px solid #e0e0e0',
              fontSize: 15,
              fontFamily: 'Cairo, sans-serif',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = '#002f34')}
            onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
            aria-label="حقل البحث"
            aria-autocomplete="list"
            aria-expanded={showDropdown}
          />
          {/* AI loading indicator */}
          {aiLoading && (
            <span
              title="الذكاء الاصطناعي يحلل..."
              style={{
                position: 'absolute',
                top: '50%',
                right: 12,
                transform: 'translateY(-50%)',
                fontSize: 16,
                animation: 'spin 1s linear infinite',
              }}
            >
              ✨
            </span>
          )}
        </div>
        <button
          type="submit"
          style={{
            background: '#002f34',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: '12px 20px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif',
            flexShrink: 0,
          }}
          aria-label="بحث"
        >
          🔍 بحث
        </button>
      </form>

      {/* AI Suggestions Dropdown */}
      {showDropdown && suggestions && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="اقتراحات البحث"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            left: 0,
            background: '#fff',
            border: '1.5px solid #e0e0e0',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            zIndex: 9999,
            overflow: 'hidden',
            direction: 'rtl',
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          {/* Correction banner */}
          {suggestions.corrected && suggestions.corrected !== query.trim() && (
            <div
              style={{
                padding: '8px 14px',
                background: '#f0f7f4',
                borderBottom: '1px solid #e8f5e9',
                fontSize: 13,
                color: '#2e7d32',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>💡</span>
              <span>هل تقصد: </span>
              <button
                onClick={() => selectSuggestion(suggestions.corrected)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1b5e20',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontFamily: 'Cairo, sans-serif',
                  textDecoration: 'underline',
                }}
              >
                {suggestions.corrected}
              </button>
            </div>
          )}

          {/* Category detected */}
          {suggestions.category && (
            <div
              style={{
                padding: '6px 14px',
                background: '#fafafa',
                borderBottom: '1px solid #f0f0f0',
                fontSize: 12,
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>{catIcon}</span>
              <span>الفئة المكتشفة: <strong style={{ color: '#002f34' }}>{suggestions.category}</strong></span>
            </div>
          )}

          {/* Suggestion items */}
          {suggestions.suggestions?.map((s, i) => (
            <button
              key={i}
              role="option"
              onClick={() => selectSuggestion(s)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 14px',
                background: 'none',
                border: 'none',
                borderBottom: i < suggestions.suggestions.length - 1 ? '1px solid #f5f5f5' : 'none',
                textAlign: 'right',
                cursor: 'pointer',
                fontSize: 14,
                color: '#333',
                fontFamily: 'Cairo, sans-serif',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f9f9f9')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <span style={{ color: '#aaa', fontSize: 13 }}>🔍</span>
              <span>{s}</span>
            </button>
          ))}

          {/* AI badge */}
          <div
            style={{
              padding: '5px 14px',
              background: '#fafafa',
              borderTop: '1px solid #f0f0f0',
              fontSize: 10,
              color: '#bbb',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              justifyContent: 'flex-end',
            }}
          >
            ✨ مدعوم بالذكاء الاصطناعي
          </div>
        </div>
      )}

      <style>{'\n        @keyframes spin {\n          0% { transform: translateY(-50%) rotate(0deg); }\n          100% { transform: translateY(-50%) rotate(360deg); }\n        }\n      '}</style>
    </div>
  );
}
