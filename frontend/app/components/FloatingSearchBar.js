'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Detect RTL from browser language
function useRTL() {
  const [rtl, setRtl] = useState(true);
  useEffect(() => {
    const lang = navigator.language || 'ar';
    setRtl(['ar', 'he', 'fa', 'ur'].some(l => lang.startsWith(l)));
  }, []);
  return rtl;
}

/**
 * FloatingSearchBar — appears as a sticky top bar when the user scrolls
 * past 220px. Supports Arabic RTL and bilingual labels.
 */
export default function FloatingSearchBar() {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const rtl = useRTL();
  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 220);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const q = query.trim();
      if (q) router.push('/search?q=' + encodeURIComponent(q));
    },
    [query, router]
  );

  if (!visible) return null;

  const placeholder = rtl ? '\u0627\u0628\u062d\u062b \u0639\u0646 \u0623\u064a \u0634\u064a\u0621...' : 'Search anything...';
  const btnLabel   = rtl ? '\u0628\u062d\u062b' : 'Search';
  const ariaLabel  = rtl ? '\u0634\u0631\u064a\u0637 \u0627\u0644\u0628\u062d\u062b \u0627\u0644\u0633\u0631\u064a\u0639' : 'Quick search bar';

  return (
    <div
      role="search"
      aria-label={ariaLabel}
      dir={rtl ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 900,
        background: 'rgba(0, 47, 52, 0.97)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '10px 16px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.28)',
        animation: 'xtox-fsb-slide 0.25s ease-out both',
      }}
    >
      <style>{'\n        @keyframes xtox-fsb-slide {\n          from { transform: translateY(-100%); opacity: 0; }\n          to   { transform: translateY(0);    opacity: 1; }\n        }\n        .xtox-fsb-input::placeholder { color: rgba(255,255,255,0.45); }\n        .xtox-fsb-input:focus { box-shadow: 0 0 0 2px #23e5db; }\n        .xtox-fsb-btn:hover  { background: #1bc8bf !important; }\n      '}</style>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          maxWidth: 640,
          margin: '0 auto',
        }}
      >
        <span aria-hidden="true" style={{ color: '#9ca3af', fontSize: 18, flexShrink: 0, lineHeight: 1 }}>
          &#128269;
        </span>

        <input
          id="floating-search-input"
          name="floating-search-query"
          className="xtox-fsb-input"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
            borderRadius: 22,
            padding: '9px 16px',
            fontSize: 16,
            fontFamily: "inherit",
            textAlign: rtl ? 'right' : 'left',
            direction: rtl ? 'rtl' : 'ltr',
            caretColor: '#23e5db',
            transition: 'box-shadow 0.2s',
          }}
        />

        <button
          type="submit"
          className="xtox-fsb-btn"
          aria-label={btnLabel}
          style={{
            background: '#23e5db',
            color: '#002f34',
            border: 'none',
            borderRadius: 20,
            padding: '8px 18px',
            fontWeight: 700,
            fontSize: 15,
            fontFamily: "inherit",
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background 0.2s',
          }}
        >
          {btnLabel}
        </button>
      </form>
    </div>
  );
}
