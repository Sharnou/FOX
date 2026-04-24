'use client';
import { useState, useEffect, useCallback } from 'react';

// Supported languages with their display labels
const LANGS = [
  { code: 'ar', label: 'عر', dir: 'rtl', name: 'العربية' },
  { code: 'en', label: 'EN', dir: 'ltr', name: 'English' },
  { code: 'fr', label: 'FR', dir: 'ltr', name: 'Français' },
];

const STORAGE_KEY = 'xtox_lang';
const CACHE_KEY = 'xtox_translations';

// Auto-learning: tracks which language the user switches to most
const LEARN_KEY = 'xtox_lang_learn';

function learnLanguage(code) {
  try {
    const raw = localStorage.getItem(LEARN_KEY);
    const counts = raw ? JSON.parse(raw) : {};
    counts[code] = (counts[code] || 0) + 1;
    localStorage.setItem(LEARN_KEY, JSON.stringify(counts));
  } catch {}
}

function getPreferredLanguage() {
  try {
    // 1. Explicit user choice
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    // 2. Auto-learned preference
    const raw = localStorage.getItem(LEARN_KEY);
    if (raw) {
      const counts = JSON.parse(raw);
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ar';
    }
  } catch {}
  // 3. Browser language
  const browser = navigator?.language?.slice(0, 2) || 'ar';
  return LANGS.find(l => l.code === browser) ? browser : 'ar';
}

export default function LangToggle() {
  const [lang, setLang] = useState('ar');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const preferred = getPreferredLanguage();
    setLang(preferred);
    applyLanguage(preferred);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyLanguage = useCallback((code) => {
    const found = LANGS.find(l => l.code === code);
    if (!found) return;
    document.documentElement.lang = code;
    document.documentElement.dir = found.dir;
    localStorage.setItem(STORAGE_KEY, code);
    // Dispatch event so other components can react
    window.dispatchEvent(new CustomEvent('xtox:lang', { detail: { code, dir: found.dir } }));
  }, []);

  const switchTo = useCallback((code) => {
    setLang(code);
    setOpen(false);
    learnLanguage(code);
    applyLanguage(code);
  }, [applyLanguage]);

  const current = LANGS.find(l => l.code === lang) || LANGS[0];
  const nextLang = lang === 'ar' ? 'en' : 'ar'; // quick toggle

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Quick toggle button */}
      <button
        onClick={() => switchTo(nextLang)}
        onContextMenu={(e) => { e.preventDefault(); setOpen(o => !o); }}
        title="Switch language (right-click for more)"
        aria-label="Switch language"
        style={{
          background: 'transparent',
          border: '1.5px solid rgba(255,255,255,0.55)',
          borderRadius: '8px',
          padding: '4px 10px',
          fontSize: '13px',
          fontWeight: '700',
          cursor: 'pointer',
          fontFamily: 'inherit',
          lineHeight: '1.4',
          minWidth: '36px',
          color: 'white',
          transition: 'opacity 0.15s, border-color 0.15s',
          flexShrink: 0,
        }}
      >
        {current.label}
      </button>

      {/* Dropdown for more languages */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '110%',
          right: 0,
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '6px',
          zIndex: 9999,
          minWidth: '120px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => switchTo(l.code)}
              style={{
                background: l.code === lang ? 'rgba(99,102,241,0.3)' : 'transparent',
                border: 'none',
                borderRadius: '7px',
                padding: '6px 10px',
                color: '#e2e8f0',
                fontSize: '13px',
                fontWeight: l.code === lang ? '700' : '400',
                cursor: 'pointer',
                textAlign: 'right',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: '700', minWidth: '24px' }}>{l.label}</span>
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
