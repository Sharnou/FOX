'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const t = {
  ar: {
    save: 'حفظ البحث',
    saved: 'تم الحفظ ✓',
    savedSearches: 'البحوث المحفوظة',
    noSaved: 'لا توجد بحوث محفوظة',
    clear: 'حذف الكل',
    delete: 'حذف',
    hint: 'احفظ بحثك الحالي للرجوع إليه لاحقًا',
    maxReached: 'تم الوصول للحد الأقصى (10 بحوث)',
    unnamed: 'بحث بدون عنوان',
    justNow: 'الآن',
    minutesAgo: 'دقيقة مضت',
    hoursAgo: 'ساعة مضت',
    daysAgo: 'يوم مضى',
  },
  en: {
    save: 'Save Search',
    saved: 'Saved ✓',
    savedSearches: 'Saved Searches',
    noSaved: 'No saved searches yet',
    clear: 'Clear All',
    delete: 'Delete',
    hint: 'Save your current search to revisit later',
    maxReached: 'Max 10 searches reached',
    unnamed: 'Untitled Search',
    justNow: 'Just now',
    minutesAgo: 'min ago',
    hoursAgo: 'hr ago',
    daysAgo: 'd ago',
  },
};

function timeAgo(timestamp, lang) {
  const s = t[lang];
  const diff = (Date.now() - timestamp) / 1000;
  if (diff < 60) return s.justNow;
  if (diff < 3600) return `${Math.floor(diff / 60)} ${s.minutesAgo}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${s.hoursAgo}`;
  return `${Math.floor(diff / 86400)} ${s.daysAgo}`;
}

const MAX_SEARCHES = 10;
const LS_KEY = 'xtox_saved_searches';

export default function SaveSearch({ searchParams = {}, lang = 'ar' }) {
  const router = useRouter();
  const [saved, setSaved] = useState([]);
  const [justSaved, setJustSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [maxMsg, setMaxMsg] = useState(false);
  const panelRef = useRef(null);
  const isRTL = lang === 'ar';
  const T = t[lang] || t.ar;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      setSaved(Array.isArray(stored) ? stored : []);
    } catch { setSaved([]); }
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const getCurrentQuery = () => {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const result = {};
    params.forEach((v, k) => { result[k] = v; });
    return result;
  };

  const handleSave = () => {
    const query = { ...searchParams, ...getCurrentQuery() };
    const label = query.q || query.query || query.search || T.unnamed;
    const existing = JSON.parse(localStorage.getItem(LS_KEY) || '[]');

    // Avoid exact duplicates
    const isDupe = existing.some(
      (s) => JSON.stringify(s.query) === JSON.stringify(query)
    );
    if (isDupe) {
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
      return;
    }

    let updated = [{ id: Date.now(), label, query, timestamp: Date.now() }, ...existing];
    if (updated.length > MAX_SEARCHES) {
      setMaxMsg(true);
      setTimeout(() => setMaxMsg(false), 2000);
      updated = updated.slice(0, MAX_SEARCHES);
    }
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    setSaved(updated);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  };

  const handleDelete = (id) => {
    const updated = saved.filter((s) => s.id !== id);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    setSaved(updated);
  };

  const handleClear = () => {
    localStorage.setItem(LS_KEY, '[]');
    setSaved([]);
  };

  const handleNavigate = (query) => {
    const params = new URLSearchParams(query).toString();
    router.push(`/search?${params}`);
    setOpen(false);
  };

  return (
    <div className={`relative inline-flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Save button */}
      <button
        onClick={handleSave}
        title={T.hint}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-200
          ${justSaved
            ? 'bg-green-50 border-green-400 text-green-700'
            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
          }`}
      >
        <span>{justSaved ? '✓' : '💾'}</span>
        <span>{justSaved ? T.saved : T.save}</span>
      </button>

      {/* Saved searches toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
      >
        <span>🔖</span>
        {saved.length > 0 && (
          <span className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
            {saved.length}
          </span>
        )}
      </button>

      {/* Max message */}
      {maxMsg && (
        <span className="text-xs text-orange-500">{T.maxReached}</span>
      )}

      {/* Saved searches panel */}
      {open && (
        <div
          ref={panelRef}
          className={`absolute top-10 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden
            ${isRTL ? 'right-0' : 'left-0'}`}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="font-semibold text-gray-800 text-sm">{T.savedSearches}</span>
            {saved.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                {T.clear}
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {saved.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-6">{T.noSaved}</p>
            ) : (
              saved.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 group"
                >
                  <button
                    onClick={() => handleNavigate(s.query)}
                    className={`flex-1 text-sm text-gray-700 hover:text-blue-600 ${isRTL ? 'text-right' : 'text-left'} truncate`}
                  >
                    <div className="font-medium truncate">{s.label}</div>
                    <div className="text-xs text-gray-400">{timeAgo(s.timestamp, lang)}</div>
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="ml-2 text-xs text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    title={T.delete}
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
