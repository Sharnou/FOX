'use client';
import { useState, useEffect } from 'react';
import { detectLang } from '../../lib/lang';

/**
 * UnifiedNotificationPrompt — Full Bilingual RTL Overhaul [run 72]
 *
 * Features:
 *  - Language detection: localStorage 'lang' | document.documentElement.lang | default 'ar'
 *  - Fully bilingual: Arabic (RTL) + English (LTR) for ALL text
 *  - dir={isArabic ? 'rtl' : 'ltr'} on root element
 *  - Cairo font for Arabic, system-ui for others
 *  - 3 states: prompt | granted | denied
 *  - Persist dismissed: localStorage 'notif_prompt_dismissed'
 *  - 7-day throttle: localStorage 'notif_prompt_last_shown'
 *  - Smooth slide-up animation from bottom
 *  - Fully accessible (aria-labels in Arabic + English)
 *  - z-index 9999, fixed bottom-center
 *  - SSR-safe (no window access outside useEffect)
 *  - Notification.requestPermission() API
 */

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const strings = {
  ar: {
    title: 'تفعيل الإشعارات',
    description: 'كن أول من يعلم بأحدث الإعلانات في منطقتك',
    allowBtn: 'السماح 🔔',
    laterBtn: 'ربما لاحقاً',
    deniedMsg:
      'تم تعطيل الإشعارات. يمكنك تفعيلها من إعدادات المتصفح',
    successMsg: 'تم تفعيل الإشعارات بنجاح! 🎉',
    notifBody: 'ستصلك إشعارات عند رد البائع أو وصول إعلانات جديدة!',
    ariaLabel: 'مطالبة الإشعارات',
    ariaAllow: 'السماح بالإشعارات',
    ariaLater: 'تجاهل مطالبة الإشعارات الآن',
    ariaClose: 'إغلاق',
  },
  en: {
    title: 'Enable Notifications',
    description: 'Be the first to know about the latest ads in your area',
    allowBtn: 'Allow 🔔',
    laterBtn: 'Maybe Later',
    deniedMsg:
      'Notifications blocked. Enable them in browser settings',
    successMsg: 'Notifications enabled successfully! 🎉',
    notifBody: "You'll get notified when sellers reply or new ads arrive!",
    ariaLabel: 'Notification permission prompt',
    ariaAllow: 'Allow notifications',
    ariaLater: 'Dismiss notification prompt for now',
    ariaClose: 'Close',
  },
};

/* ─── Slide-up keyframe injected once ────────────────────────────────────── */
const SLIDE_UP_STYLE = '\n@keyframes xtox-slide-up {\n  from { transform: translateY(110%); opacity: 0; }\n  to   { transform: translateY(0);    opacity: 1; }\n}\n.xtox-slide-up {\n  animation: xtox-slide-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;\n}\n';

function injectStyles() {
  if (
    typeof document !== 'undefined' &&
    !document.getElementById('xtox-notif-style')
  ) {
    const el = document.createElement('style');
    el.id = 'xtox-notif-style';
    el.textContent = SLIDE_UP_STYLE;
    document.head.appendChild(el);
  }
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function UnifiedNotificationPrompt() {
  const [phase, setPhase] = useState('idle'); // 'idle' | 'prompt' | 'granted' | 'denied'
  const [lang, setLang] = useState('ar');

  /* Detect language */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedLang =
      localStorage.getItem('lang') ||
      document.documentElement.lang ||
      'ar';
    setLang(storedLang.startsWith('ar') ? 'ar' : 'en');
  }, []);

  /* Decide whether to show the prompt */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('Notification' in window)) return; // SSR-safe / unsupported

    const permission = Notification.permission;

    if (permission === 'denied') {
      setPhase('denied');
      return;
    }
    if (permission === 'granted') return; // already granted, nothing to do

    /* 7-day throttle */
    const dismissed = localStorage.getItem('notif_prompt_dismissed');
    if (dismissed === 'true') return;

    const lastShown = localStorage.getItem('notif_prompt_last_shown');
    if (lastShown && Date.now() - parseInt(lastShown, 10) < SEVEN_DAYS_MS) {
      return;
    }

    /* Inject animation styles & show after short delay */
    injectStyles();
    const timer = setTimeout(() => {
      setPhase('prompt');
      localStorage.setItem('notif_prompt_last_shown', String(Date.now()));
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const t = strings[lang] || strings.ar;
  const isArabic = lang === 'ar';

  /* ── Allow handler ────────────────────────────────────────────────────── */
  const handleAllow = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      if (result === 'granted') {
        setPhase('granted');
        localStorage.removeItem('notif_prompt_dismissed');
        /* Show native notification */
        try {
          new Notification('XTOX 🔔', {
            body: t.notifBody,
            icon: '/logo192.png',
          });
        } catch (_) {/* ignore */}
        /* Auto-dismiss success toast after 4 s */
        setTimeout(() => setPhase('idle'), 4000);
      } else if (result === 'denied') {
        setPhase('denied');
      } else {
        setPhase('idle');
      }
      localStorage.setItem('xtox_notif_pref', result);
    } catch (err) {
      console.error('[UnifiedNotificationPrompt] requestPermission error:', err);
      setPhase('idle');
    }
  };

  /* ── Dismiss handler ──────────────────────────────────────────────────── */
  const handleDismiss = () => {
    setPhase('idle');
    localStorage.setItem('notif_prompt_dismissed', 'true');
    localStorage.setItem('xtox_notif_pref', 'dismissed');
  };

  /* ── Shared container styles ──────────────────────────────────────────── */
  const containerBase = {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 9999,
    fontFamily: isArabic
      ? "'Cairo', 'Segoe UI', system-ui, sans-serif"
      : "system-ui, -apple-system, 'Segoe UI', sans-serif",
    direction: isArabic ? 'rtl' : 'ltr',
    width: 'min(92vw, 420px)',
    borderRadius: '20px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
    overflow: 'hidden',
  };

  /* ── IDLE — render nothing ────────────────────────────────────────────── */
  if (phase === 'idle') return null;

  /* ── GRANTED — success toast ──────────────────────────────────────────── */
  if (phase === 'granted') {
    return (
      <div
        dir={isArabic ? 'rtl' : 'ltr'}
        role="status"
        aria-live="polite"
        aria-label={t.ariaLabel}
        className="xtox-slide-up"
        style={{
          ...containerBase,
          background: '#f0fdf4',
          border: '1.5px solid #86efac',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span style={{ fontSize: '22px', flexShrink: 0 }} aria-hidden="true">✅</span>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 700,
            color: '#15803d',
            lineHeight: 1.4,
          }}
        >
          {t.successMsg}
        </p>
      </div>
    );
  }

  /* ── DENIED — info banner ─────────────────────────────────────────────── */
  if (phase === 'denied') {
    return (
      <div
        dir={isArabic ? 'rtl' : 'ltr'}
        role="alert"
        aria-live="assertive"
        aria-label={t.ariaLabel}
        className="xtox-slide-up"
        style={{
          ...containerBase,
          background: '#fff7ed',
          border: '1.5px solid #fed7aa',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span style={{ fontSize: '22px', flexShrink: 0 }} aria-hidden="true">🚫</span>
        <p
          style={{
            margin: 0,
            flex: 1,
            fontSize: '13px',
            fontWeight: 600,
            color: '#9a3412',
            lineHeight: 1.5,
          }}
        >
          {t.deniedMsg}
        </p>
        <button
          onClick={() => setPhase('idle')}
          aria-label={t.ariaClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: '#9a3412',
            lineHeight: 1,
            padding: '2px',
            flexShrink: 0,
          }}
        >
          ×
        </button>
      </div>
    );
  }

  /* ── PROMPT — main permission request UI ─────────────────────────────── */
  return (
    <div
      dir={isArabic ? 'rtl' : 'ltr'}
      role="dialog"
      aria-modal="false"
      aria-label={t.ariaLabel}
      aria-live="polite"
      className="xtox-slide-up"
      style={{
        ...containerBase,
        background: '#ffffff',
        border: '1.5px solid #fed7aa',
        padding: '20px',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '12px',
        }}
      >
        {/* Bell SVG icon */}
        <div
          aria-hidden="true"
          style={{
            flexShrink: 0,
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: '#fff7ed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FF6B35"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>

        {/* Title + Description */}
        <div style={{ flex: 1 }}>
          <h3
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 800,
              color: '#1a1a1a',
              lineHeight: 1.3,
            }}
          >
            {t.title}
          </h3>
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '12px',
              color: '#6b7280',
              lineHeight: 1.5,
            }}
          >
            {t.description}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexDirection: isArabic ? 'row' : 'row-reverse',
          justifyContent: 'flex-start',
        }}
      >
        {/* Allow */}
        <button
          onClick={handleAllow}
          aria-label={t.ariaAllow}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '50px',
            border: 'none',
            background: '#FF6B35',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {t.allowBtn}
        </button>

        {/* Maybe Later */}
        <button
          onClick={handleDismiss}
          aria-label={t.ariaLater}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '50px',
            border: '1.5px solid #e5e7eb',
            background: '#f9fafb',
            color: '#6b7280',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s',
            fontFamily: 'inherit',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#f3f4f6')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#f9fafb')}
        >
          {t.laterBtn}
        </button>
      </div>
    </div>
  );
}
