"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// Arabic-Indic numerals helper
const toArabicNumerals = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

const TRANSLATIONS = {
  ar: {
    placeholder: "ابحث في إكس توكس...",
    noResults: "لا توجد نتائج",
    popular: "البحث الشائع",
    results: "نتيجة",
    clear: "مسح",
    recentSearches: "عمليات البحث الأخيرة",
  },
  en: {
    placeholder: "Search XTOX...",
    noResults: "No results found",
    popular: "Popular searches",
    results: "results",
    clear: "Clear",
    recentSearches: "Recent searches",
  },
  de: {
    placeholder: "XTOX durchsuchen...",
    noResults: "Keine Ergebnisse",
    popular: "Beliebte Suchen",
    results: "Ergebnisse",
    clear: "Löschen",
    recentSearches: "Letzte Suchen",
  },
};

// Static popular searches per language for fallback
const POPULAR_SEARCHES = {
  ar: [
    "جوال ايفون",
    "سيارة للبيع",
    "شقة للإيجار",
    "لابتوب",
    "تلفزيون",
    "موتوسيكل",
    "غسالة",
    "ملابس اطفال",
  ],
  en: [
    "iPhone mobile",
    "car for sale",
    "apartment rent",
    "laptop",
    "television",
    "motorcycle",
    "washing machine",
    "kids clothes",
  ],
  de: [
    "iPhone Handy",
    "Auto kaufen",
    "Wohnung mieten",
    "Laptop",
    "Fernseher",
    "Motorrad",
    "Waschmaschine",
    "Kinderkleidung",
  ],
};

const RECENT_SEARCHES_KEY = "xtox_recent_searches";

function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(query) {
  try {
    const recent = getRecentSearches().filter((s) => s !== query);
    recent.unshift(query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, 8)));
  } catch {}
}

function removeRecentSearch(query) {
  try {
    const recent = getRecentSearches().filter((s) => s !== query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent));
  } catch {}
}

/**
 * ArabicSearchSuggestions
 * Debounced autocomplete with RTL support, recent searches, and fallback popular queries.
 *
 * Props:
 *   lang          - "ar" | "en" | "de" (default: "ar")
 *   onSearch      - callback(query: string) when user submits
 *   onSelect      - callback(query: string) when suggestion selected
 *   apiEndpoint   - API URL prefix, e.g. "/api/search/suggestions"
 *   className     - extra CSS classes for the wrapper
 *   autoFocus     - boolean
 */
export default function ArabicSearchSuggestions({
  lang = "ar",
  onSearch,
  onSelect,
  apiEndpoint = "/api/search/suggestions",
  className = "",
  autoFocus = false,
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRtl = lang === "ar";

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, [open]);

  const fetchSuggestions = useCallback(
    async (q) => {
      if (!q || q.length < 2) {
        setSuggestions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(
          `${apiEndpoint}?q=${encodeURIComponent(q)}&lang=${lang}&limit=8`,
          { signal: controller.signal }
        );
        clearTimeout(timeout);
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch {
        // Fallback: filter popular searches locally
        const pop = POPULAR_SEARCHES[lang] || POPULAR_SEARCHES.ar;
        setSuggestions(
          pop
            .filter((s) => s.includes(q) || q.includes(s.slice(0, 3)))
            .slice(0, 5)
        );
      } finally {
        setLoading(false);
      }
    },
    [apiEndpoint, lang]
  );

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setActiveIdx(-1);
    clearTimeout(debounceRef.current);
    if (val.length >= 2) {
      debounceRef.current = setTimeout(() => fetchSuggestions(val), 320);
    } else {
      setSuggestions([]);
      setLoading(false);
    }
  };

  const handleSelect = (value) => {
    setQuery(value);
    saveRecentSearch(value);
    setRecentSearches(getRecentSearches());
    setSuggestions([]);
    setOpen(false);
    onSelect && onSelect(value);
    onSearch && onSearch(value);
  };

  const handleSubmit = (e) => {
    e && e.preventDefault();
    if (!query.trim()) return;
    saveRecentSearch(query.trim());
    setRecentSearches(getRecentSearches());
    setOpen(false);
    onSearch && onSearch(query.trim());
  };

  const handleKeyDown = (e) => {
    const items =
      suggestions.length > 0
        ? suggestions
        : query.length < 2
        ? recentSearches.length > 0
          ? recentSearches
          : POPULAR_SEARCHES[lang] || []
        : [];

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIdx >= 0 && items[activeIdx]) {
        handleSelect(items[activeIdx]);
      } else {
        handleSubmit(e);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleFocus = () => setOpen(true);

  const handleBlur = (e) => {
    if (!listRef.current?.contains(e.relatedTarget)) {
      setTimeout(() => setOpen(false), 150);
    }
  };

  const showPopular = open && query.length < 2 && recentSearches.length === 0;
  const showRecent = open && query.length < 2 && recentSearches.length > 0;
  const showSuggestions = open && query.length >= 2;

  const renderItems = (items, type) =>
    items.map((item, idx) => {
      const isActive = activeIdx === idx;
      return (
        <li key={item + idx}>
          <button
            type="button"
            onMouseDown={() => handleSelect(item)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
              isRtl ? "text-right flex-row-reverse" : "text-left"
            } ${
              isActive
                ? "bg-emerald-50 text-emerald-800"
                : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            {/* Icon */}
            {type === "recent" ? (
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : type === "popular" ? (
              <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
            <span className={`flex-1 ${isRtl ? "font-cairo" : ""}`}>{item}</span>
            {type === "recent" && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  removeRecentSearch(item);
                  setRecentSearches(getRecentSearches());
                }}
                className="text-gray-300 hover:text-gray-500 p-0.5 rounded"
                tabIndex={-1}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </button>
        </li>
      );
    });

  return (
    <div
      className={`relative w-full font-sans ${className}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600&family=Tajawal:wght@400;500&display=swap');`}</style>

      {/* Search Input */}
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          placeholder={t.placeholder}
          className={`w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm outline-none ring-0 transition-all focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 ${
            isRtl ? "text-right pr-12 pl-4 font-cairo" : "text-left pl-12 pr-4"
          }`}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Search icon */}
        <span
          className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${
            isRtl ? "right-4" : "left-4"
          }`}
        >
          {loading ? (
            <svg className="w-5 h-5 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </span>

        {/* Clear button */}
        {query.length > 0 && (
          <button
            type="button"
            onClick={() => { setQuery(""); setSuggestions([]); inputRef.current?.focus(); }}
            className={`absolute top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 px-2 py-0.5 rounded ${
              isRtl ? "left-2" : "right-2"
            }`}
          >
            {t.clear}
          </button>
        )}
      </form>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden"
          role="listbox"
          aria-label={t.placeholder}
        >
          {/* Recent Searches */}
          {showRecent && (
            <div>
              <div className={`px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide ${isRtl ? "text-right" : "text-left"}`}>
                {t.recentSearches}
              </div>
              <ul>{renderItems(recentSearches.slice(0, 5), "recent")}</ul>
            </div>
          )}

          {/* Popular Searches */}
          {showPopular && (
            <div>
              <div className={`px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide ${isRtl ? "text-right" : "text-left"}`}>
                {t.popular}
              </div>
              <ul>{renderItems((POPULAR_SEARCHES[lang] || []).slice(0, 6), "popular")}</ul>
            </div>
          )}

          {/* API/Fallback Suggestions */}
          {showSuggestions && (
            <ul>
              {suggestions.length === 0 && !loading && (
                <li className={`px-4 py-3 text-sm text-gray-400 ${isRtl ? "text-right" : "text-left"}`}>
                  {t.noResults}
                </li>
              )}
              {renderItems(suggestions, "suggestion")}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
