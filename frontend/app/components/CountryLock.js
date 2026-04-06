'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════════
   CountryLock — Full-screen country selection modal
   Replaces browser prompt() with a beautiful Arabic-first UI
   ═══════════════════════════════════════════════════════════════ */

const COUNTRIES = [
  // Arab countries (shown first)
  { code: 'EG', nameAr: 'مصر',           nameEn: 'Egypt',        flag: '🇪🇬', popular: true  },
  { code: 'SA', nameAr: 'السعودية',      nameEn: 'Saudi Arabia', flag: '🇸🇦', popular: true  },
  { code: 'AE', nameAr: 'الإمارات',      nameEn: 'UAE',          flag: '🇦🇪', popular: true  },
  { code: 'KW', nameAr: 'الكويت',        nameEn: 'Kuwait',       flag: '🇰🇼', popular: true  },
  { code: 'QA', nameAr: 'قطر',           nameEn: 'Qatar',        flag: '🇶🇦', popular: true  },
  { code: 'JO', nameAr: 'الأردن',        nameEn: 'Jordan',       flag: '🇯🇴', popular: false },
  { code: 'LB', nameAr: 'لبنان',         nameEn: 'Lebanon',      flag: '🇱🇧', popular: false },
  { code: 'MA', nameAr: 'المغرب',        nameEn: 'Morocco',      flag: '🇲🇦', popular: false },
  { code: 'LY', nameAr: 'ليبيا',         nameEn: 'Libya',        flag: '🇱🇾', popular: false },
  { code: 'TN', nameAr: 'تونس',          nameEn: 'Tunisia',      flag: '🇹🇳', popular: false },
  { code: 'DZ', nameAr: 'الجزائر',       nameEn: 'Algeria',      flag: '🇩🇿', popular: false },
  { code: 'IQ', nameAr: 'العراق',        nameEn: 'Iraq',         flag: '🇮🇶', popular: false },
  { code: 'SY', nameAr: 'سوريا',         nameEn: 'Syria',        flag: '🇸🇾', popular: false },
  { code: 'YE', nameAr: 'اليمن',         nameEn: 'Yemen',        flag: '🇾🇪', popular: false },
  { code: 'BH', nameAr: 'البحرين',       nameEn: 'Bahrain',      flag: '🇧🇭', popular: false },
  { code: 'OM', nameAr: 'عُمان',         nameEn: 'Oman',         flag: '🇴🇲', popular: false },
  { code: 'SD', nameAr: 'السودان',       nameEn: 'Sudan',        flag: '🇸🇩', popular: false },
  { code: 'PS', nameAr: 'فلسطين',        nameEn: 'Palestine',    flag: '🇵🇸', popular: false },
  // International
  { code: 'DE', nameAr: 'ألمانيا',       nameEn: 'Germany',      flag: '🇩🇪', popular: false },
  { code: 'GB', nameAr: 'بريطانيا',      nameEn: 'UK',           flag: '🇬🇧', popular: false },
  { code: 'US', nameAr: 'أمريكا',        nameEn: 'USA',          flag: '🇺🇸', popular: false },
  { code: 'TR', nameAr: 'تركيا',         nameEn: 'Turkey',       flag: '🇹🇷', popular: false },
  { code: 'FR', nameAr: 'فرنسا',         nameEn: 'France',       flag: '🇫🇷', popular: false },
  { code: 'CA', nameAr: 'كندا',          nameEn: 'Canada',       flag: '🇨🇦', popular: false },
];

const POPULAR = COUNTRIES.filter(c => c.popular);

// Minimal inline toast
function Toast({ msg, show }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed', bottom: 32, left: '50%',
        transform: 'translateX(-50%) translateY(' + (show ? '0' : '60px') + ')',
        opacity: show ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(.21,1.02,.73,1)',
        background: '#002f34', color: '#fff',
        padding: '12px 28px', borderRadius: 40,
        fontSize: 15, fontWeight: 700,
        boxShadow: '0 6px 24px rgba(0,0,0,0.22)',
        zIndex: 10001, whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
    >
      {msg}
    </div>
  );
}

export default function CountryLock({ children }) {
  const [ready, setReady]     = useState(false);
  const [show, setShow]       = useState(false);
  const [search, setSearch]   = useState('');
  const [hovered, setHovered] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState({ msg: '', show: false });
  const [detected, setDetected] = useState(null);
  const searchRef = useRef(null);
  const modalRef  = useRef(null);

  /* ── Show toast helper ── */
  const showToast = useCallback((msg) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2800);
  }, []);

  /* ── Try geo-detect country on first mount ── */
  useEffect(() => {
    const stored = localStorage.getItem('country');
    if (stored) { setReady(true); return; }

    // Attempt detection via free IP API
    fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.country_code) {
          const match = COUNTRIES.find(c => c.code === data.country_code);
          if (match) setDetected(match);
        }
      })
      .catch(() => {})
      .finally(() => setShow(true));
  }, []);

  /* ── Focus search when modal opens ── */
  useEffect(() => {
    if (show) {
      setTimeout(() => searchRef.current?.focus(), 120);
    }
  }, [show]);

  /* ── Keyboard: Escape to close (if already picked), Tab trap ── */
  useEffect(() => {
    if (!show) return;
    const handle = (e) => {
      if (e.key === 'Escape' && localStorage.getItem('country')) {
        setShow(false);
        setReady(true);
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [show]);

  /* ── Filter countries by search ── */
  const filtered = search.trim()
    ? COUNTRIES.filter(c =>
        c.nameAr.includes(search) ||
        c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES;

  /* ── Select country ── */
  const selectCountry = useCallback(async (country) => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 320)); // brief feedback delay
    localStorage.setItem('country', country.code);
    // Also persist lang preference
    const arabCodes = ['EG','SA','AE','KW','QA','JO','LB','MA','LY','TN','DZ','IQ','SY','YE','BH','OM','SD','PS'];
    localStorage.setItem('lang', arabCodes.includes(country.code) ? 'ar' : 'en');
    setSaving(false);
    setShow(false);
    setReady(true);
    showToast(country.flag + ' تم اختيار ' + country.nameAr);
  }, [showToast]);

  /* ── Keyboard navigation within list ── */
  const handleListKey = useCallback((e, country) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      selectCountry(country);
    }
  }, [selectCountry]);

  /* ── Loading spinner while not ready ── */
  if (!ready && !show) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: 16,
        fontFamily: 'Cairo, Tajawal, sans-serif',
        background: '#f5f5f5',
      }}>
        <div style={{ fontSize: 48 }}>🌍</div>
        <div style={{
          width: 40, height: 40, border: '3px solid #e0e0e0',
          borderTopColor: '#002f34', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: '#002f34', fontWeight: 700, fontSize: 16 }}>جار التحميل...</p>
        <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      </div>
    );
  }

  return (
    <>
      {/* ── Children (app content) ── */}
      {ready && children}

      {/* ── Toast notification ── */}
      <Toast msg={toast.msg} show={toast.show} />

      {/* ── Country Selection Modal ── */}
      {show && (
        <>
          {/* Backdrop */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 9998,
            }}
          />

          {/* Modal */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="اختر دولتك"
            style={{
              position: 'fixed', inset: 0,
              display: 'flex', alignItems: 'flex-end',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '0 0 0 0',
            }}
          >
            <div style={{
              width: '100%', maxWidth: 520,
              background: '#fff',
              borderRadius: '28px 28px 0 0',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
              maxHeight: '92vh',
              display: 'flex', flexDirection: 'column',
              direction: 'rtl',
              fontFamily: 'Cairo, Tajawal, system-ui, sans-serif',
              animation: 'slideUp 0.4s cubic-bezier(.21,1.02,.73,1) both',
              overflow: 'hidden',
            }}>
              <style>{'\r\n                @keyframes slideUp {\r\n                  from { transform: translateY(100%); opacity: 0; }\r\n                  to   { transform: translateY(0);    opacity: 1; }\r\n                }\r\n                @keyframes pulse {\r\n                  0%,100% { transform: scale(1); }\r\n                  50%     { transform: scale(1.04); }\r\n                }\r\n                .country-item:hover,\r\n                .country-item:focus {\r\n                  background: #f0f7f7 !important;\r\n                  outline: none;\r\n                }\r\n                .country-item:focus-visible {\r\n                  outline: 2px solid #002f34;\r\n                  outline-offset: -2px;\r\n                  border-radius: 14px;\r\n                }\r\n              '}</style>

              {/* ── Drag handle ── */}
              <div style={{ display: 'flex', justifyContent: 'center', padding: '14px 0 4px' }}>
                <div style={{ width: 44, height: 4, borderRadius: 4, background: '#e0e0e0' }} />
              </div>

              {/* ── Header ── */}
              <div style={{ padding: '8px 24px 16px', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    fontSize: 36,
                    animation: 'pulse 2.5s ease-in-out infinite',
                  }}>🌍</div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#002f34' }}>
                      مرحباً بك في XTOX!
                    </h2>
                    <p style={{ margin: '3px 0 0', fontSize: 13, color: '#777' }}>
                      اختر دولتك لرؤية الإعلانات المحلية
                    </p>
                  </div>
                </div>

                {/* ── Geo-detected suggestion ── */}
                {detected && (
                  <button
                    onClick={() => selectCountry(detected)}
                    disabled={saving}
                    aria-label={'استخدام موقعك المكتشف: ' + detected.nameAr}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', marginTop: 14,
                      background: 'linear-gradient(135deg, #002f34, #1a5c63)',
                      color: '#fff', border: 'none',
                      borderRadius: 14, padding: '12px 16px',
                      cursor: saving ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                      textAlign: 'right',
                    }}
                  >
                    <span style={{ fontSize: 26 }}>{detected.flag}</span>
                    <span style={{ flex: 1 }}>
                      استخدام موقعك: <strong>{detected.nameAr}</strong>
                    </span>
                    <span style={{ fontSize: 12, opacity: 0.8 }}>✓ موصى به</span>
                  </button>
                )}

                {/* ── Search box ── */}
                <div style={{ position: 'relative', marginTop: 12 }}>
                  <span style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 16, color: '#999', pointerEvents: 'none',
                  }}>🔍</span>
                  <input
                    ref={searchRef}
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="ابحث عن دولتك..."
                    aria-label="بحث عن دولة"
                    style={{
                      width: '100%', padding: '11px 44px 11px 14px',
                      borderRadius: 12, border: '1.5px solid #e0e0e0',
                      fontSize: 15, fontFamily: 'inherit',
                      direction: 'rtl', outline: 'none',
                      background: '#f8f8f8', color: '#222',
                      boxSizing: 'border-box',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#002f34'}
                    onBlur={e  => e.target.style.borderColor = '#e0e0e0'}
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      aria-label="مسح البحث"
                      style={{
                        position: 'absolute', left: 12, top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none', border: 'none',
                        cursor: 'pointer', color: '#aaa', fontSize: 18,
                        padding: 0, lineHeight: 1,
                      }}
                    >×</button>
                  )}
                </div>
              </div>

              {/* ── Country list ── */}
              <div
                role="listbox"
                aria-label="قائمة الدول"
                style={{
                  overflowY: 'auto', flex: 1,
                  padding: '10px 12px 20px',
                }}
              >
                {/* Popular section (only when no search) */}
                {!search.trim() && (
                  <>
                    <p style={{ fontSize: 11, color: '#aaa', fontWeight: 700, margin: '4px 8px 8px', letterSpacing: 0.5 }}>
                      الأكثر شيوعاً
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8, marginBottom: 16 }}>
                      {POPULAR.map(c => (
                        <button
                          key={c.code}
                          role="option"
                          aria-selected={false}
                          aria-label={c.nameAr + ' ' + c.flag}
                          className="country-item"
                          onClick={() => !saving && selectCountry(c)}
                          onKeyDown={e => handleListKey(e, c)}
                          disabled={saving}
                          style={{
                            display: 'flex', flexDirection: 'column',
                            alignItems: 'center', gap: 4,
                            background: hovered === c.code ? '#f0f7f7' : '#f8f8f8',
                            border: '1.5px solid #e8e8e8',
                            borderRadius: 14, padding: '12px 8px',
                            cursor: saving ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={() => setHovered(c.code)}
                          onMouseLeave={() => setHovered(null)}
                        >
                          <span style={{ fontSize: 30 }}>{c.flag}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#002f34' }}>{c.nameAr}</span>
                        </button>
                      ))}
                    </div>

                    <p style={{ fontSize: 11, color: '#aaa', fontWeight: 700, margin: '4px 8px 8px', letterSpacing: 0.5 }}>
                      جميع الدول
                    </p>
                  </>
                )}

                {/* Full list */}
                {filtered.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: '#999' }}>
                    <div style={{ fontSize: 36 }}>🔍</div>
                    <p style={{ marginTop: 8, fontSize: 14 }}>لا توجد نتائج لـ "{search}"</p>
                    <button
                      onClick={() => setSearch('')}
                      style={{ marginTop: 8, background: 'none', border: 'none', color: '#002f34', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textDecoration: 'underline' }}
                    >
                      عرض جميع الدول
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {filtered.map(c => (
                      <button
                        key={c.code}
                        role="option"
                        aria-selected={false}
                        aria-label={'اختر ' + c.nameAr}
                        className="country-item"
                        onClick={() => !saving && selectCountry(c)}
                        onKeyDown={e => handleListKey(e, c)}
                        disabled={saving}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          background: hovered === 'list-' + c.code ? '#f0f7f7' : 'transparent',
                          border: 'none',
                          borderRadius: 14, padding: '12px 14px',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          fontFamily: 'inherit',
                          transition: 'background 0.15s ease',
                          width: '100%', textAlign: 'right',
                        }}
                        onMouseEnter={() => setHovered('list-' + c.code)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        <span style={{ fontSize: 28, flexShrink: 0 }}>{c.flag}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ display: 'block', fontSize: 15, fontWeight: 700, color: '#222' }}>{c.nameAr}</span>
                          <span style={{ display: 'block', fontSize: 11, color: '#aaa' }}>{c.nameEn} · {c.code}</span>
                        </div>
                        <span style={{ fontSize: 16, color: '#ccc' }}>›</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* ── Saving overlay ── */}
              {saving && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(255,255,255,0.88)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: 'inherit',
                  gap: 14, zIndex: 10,
                }}>
                  <div style={{
                    width: 44, height: 44,
                    border: '4px solid #e0e0e0',
                    borderTopColor: '#002f34',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                  <p style={{ color: '#002f34', fontWeight: 700, fontSize: 16, margin: 0 }}>جار الحفظ...</p>
                  <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
