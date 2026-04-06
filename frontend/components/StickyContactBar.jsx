/**
 * StickyContactBar.jsx
 * Sticky bottom contact action bar for ad pages (RTL, bilingual AR/EN/DE)
 * Zero external dependencies — pure React + inline styles
 */

import { useState, useEffect } from 'react';

/* ── Arabic-Indic numeral converter ─────────────────────────────────────── */
const toArabicIndic = (str) =>
  String(str).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

/* ── Translations ────────────────────────────────────────────────────────── */
const i18n = {
  ar: {
    chat: 'تواصل عبر التطبيق',
    whatsapp: 'واتساب',
    call: 'اتصال',
    reveal: 'أظهر الرقم',
    waMsg: (title) => 'السلام عليكم، رأيت إعلانك على اكستوكس: ' + title,
  },
  en: {
    chat: 'Chat in-app',
    whatsapp: 'WhatsApp',
    call: 'Call',
    reveal: 'Show number',
    waMsg: (title) => 'Hello, I saw your ad on XTOX: ' + title,
  },
  de: {
    chat: 'Im App chatten',
    whatsapp: 'WhatsApp',
    call: 'Anrufen',
    reveal: 'Nummer anzeigen',
    waMsg: (title) => 'Hallo, ich habe Ihre Anzeige auf XTOX gesehen: ' + title,
  },
};

/* ── Slide-up keyframe (injected once) ───────────────────────────────────── */
const SLIDE_UP_CSS = '\n@keyframes stickySlideUp {\n  from { transform: translateY(100%); opacity: 0; }\n  to   { transform: translateY(0);   opacity: 1; }\n}\n@import url(\'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap\');\n';

let styleInjected = false;
function injectStyle() {
  if (styleInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = SLIDE_UP_CSS;
  document.head.appendChild(el);
  styleInjected = true;
}

/* ── Main Component ──────────────────────────────────────────────────────── */
export default function StickyContactBar({
  adId = '',
  adTitle = '',
  sellerPhone = '',
  lang = 'ar',
}) {
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const t = i18n[lang] || i18n.ar;
  const isRTL = lang === 'ar';

  useEffect(() => {
    injectStyle();
  }, []);

  /* WhatsApp deep-link */
  const cleanPhone = sellerPhone.replace(/\D/g, '');
  const waMessage = encodeURIComponent(t.waMsg(adTitle));
  const waHref = 'https://wa.me/' + cleanPhone + '?text=' + waMessage;

  /* Phone: first tap reveals, second tap calls */
  const handlePhone = () => {
    if (!phoneRevealed) {
      setPhoneRevealed(true);
    } else {
      window.location.href = 'tel:' + cleanPhone;
    }
  };

  const displayPhone = phoneRevealed
    ? toArabicIndic(sellerPhone)
    : null;

  /* ── Styles ── */
  const barStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    display: 'flex',
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '10px 12px',
    paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderTop: '1px solid rgba(0,0,0,0.08)',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
    fontFamily: "'Cairo', 'Tajawal', sans-serif",
    direction: isRTL ? 'rtl' : 'ltr',
    animation: 'stickySlideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
  };

  const btnBase = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    flex: 1,
    margin: '0 4px',
    padding: '10px 6px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '700',
    fontFamily: "'Cairo', 'Tajawal', sans-serif",
    lineHeight: 1.2,
    transition: 'transform 0.15s, box-shadow 0.15s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  };

  const chatBtn = { ...btnBase, background: '#FF6B00', color: '#fff' };
  const waBtn   = { ...btnBase, background: '#25D366', color: '#fff' };
  const phoneBtn = {
    ...btnBase,
    background: phoneRevealed ? '#0066CC' : '#1A73E8',
    color: '#fff',
    minWidth: phoneRevealed ? '120px' : undefined,
  };

  const iconStyle = { fontSize: '22px', lineHeight: 1 };
  const labelStyle = { fontSize: '11px', fontWeight: '600', letterSpacing: '0.01em' };

  return (
    <nav style={barStyle} role="navigation" aria-label="خيارات التواصل مع البائع">
      {/* ── Chat button ── */}
      <a
        href={'/chat?ad=' + adId}
        style={{ ...chatBtn, textDecoration: 'none' }}
        aria-label={t.chat + ' — ' + adTitle}
        role="button"
      >
        <span style={iconStyle} aria-hidden="true">💬</span>
        <span style={labelStyle}>{t.chat}</span>
      </a>

      {/* ── WhatsApp button ── */}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...waBtn, textDecoration: 'none' }}
        aria-label={t.whatsapp + ' — ' + adTitle}
        role="button"
      >
        <span style={iconStyle} aria-hidden="true">
          {/* Inline WhatsApp SVG — zero dependency */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.137.565 4.147 1.55 5.888L.057 23.571a.5.5 0 0 0 .612.612l5.683-1.493A11.951 11.951 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.898 0-3.673-.524-5.189-1.432l-.372-.222-3.853 1.011 1.011-3.853-.222-.372A9.957 9.957 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
        </span>
        <span style={labelStyle}>{t.whatsapp}</span>
      </a>

      {/* ── Phone / Tap-to-reveal button ── */}
      <button
        onClick={handlePhone}
        style={phoneBtn}
        aria-label={
          phoneRevealed
            ? t.call + ': ' + displayPhone
            : t.reveal
        }
        aria-live="polite"
      >
        <span style={iconStyle} aria-hidden="true">
          {phoneRevealed ? '📞' : '📱'}
        </span>
        <span style={labelStyle}>
          {phoneRevealed ? displayPhone : t.reveal}
        </span>
      </button>
    </nav>
  );
}
