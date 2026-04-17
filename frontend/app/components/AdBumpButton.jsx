'use client';
import { useState, useEffect } from 'react';

const i18n = {
  ar: {
    bump: 'رفع الإعلان للأعلى',
    bumped: 'تم الرفع!',
    cooldown: 'متاح بعد',
    hours: 'ساعة',
    minutes: 'دقيقة',
    free: 'مجاني مرة/يوم',
    tooltip: 'يعيد إعلانك إلى أعلى نتائج البحث',
    lastBump: 'آخر رفع',
  },
  en: {
    bump: 'Bump to Top',
    bumped: 'Bumped!',
    cooldown: 'Available in',
    hours: 'h',
    minutes: 'm',
    free: 'Free once/day',
    tooltip: 'Moves your ad back to the top of search results',
    lastBump: 'Last bump',
  },
  de: {
    bump: 'Nach oben',
    bumped: 'Hochgesetzt!',
    cooldown: 'Verfügbar in',
    hours: 'Std',
    minutes: 'Min',
    free: 'Kostenlos 1x/Tag',
    tooltip: 'Bringt Ihre Anzeige zurück an den Anfang',
    lastBump: 'Letztes Bump',
  },
};

function toArabicIndic(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

export default function AdBumpButton({ adId, lang = 'ar', onBump }) {
  const t = i18n[lang] || i18n.ar;
  const isRTL = lang === 'ar';
  const storageKey = 'xtox_bump_' + adId;

  const [lastBumpTime, setLastBumpTime] = useState(null);
  const [remaining, setRemaining] = useState(null);
  const [bumped, setBumped] = useState(false);
  const [launching, setLaunching] = useState(false);


  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) setLastBumpTime(Number(stored));
  }, [adId]);

  useEffect(() => {
    if (!lastBumpTime) { setRemaining(null); return; }
    const tick = () => {
      const diff = COOLDOWN_MS - (Date.now() - lastBumpTime);
      if (diff <= 0) { setRemaining(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining({ h, m });
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [lastBumpTime]);

  const handleBump = async () => {
    if (remaining || launching) return;
    setLaunching(true);
    await new Promise(r => setTimeout(r, 900));
    const now = Date.now();
    localStorage.setItem(storageKey, String(now));
    setLastBumpTime(now);
    setLaunching(false);
    setBumped(true);
    setTimeout(() => setBumped(false), 3000);
    if (onBump) onBump(adId);
  };

  const fmt = (n) => lang === 'ar' ? toArabicIndic(n) : String(n);
  const inCooldown = !!remaining;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : 'inherit',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: isRTL ? 'flex-end' : 'flex-start',
        gap: 4,
      }}
    >
      <button
        onClick={handleBump}
        disabled={inCooldown || launching}
        title={t.tooltip}
        aria-label={t.bump}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 999,
          border: 'none',
          cursor: inCooldown ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 700,
          transition: 'all 0.2s ease',
          background: bumped
            ? 'linear-gradient(135deg, #22c55e, #16a34a)'
            : inCooldown
              ? '#e5e7eb'
              : launching
                ? 'linear-gradient(135deg, #fb923c, #ea580c)'
                : 'linear-gradient(135deg, #f97316, #ea580c)',
          color: inCooldown ? '#9ca3af' : '#fff',
          boxShadow: inCooldown ? 'none' : '0 4px 14px rgba(249,115,22,0.4)',
          transform: launching ? 'translateY(-4px) scale(1.05)' : 'none',
        }}
      >
        <span
          style={{
            fontSize: 18,
            display: 'inline-block',
            transition: 'transform 0.4s ease',
            transform: launching ? 'translateY(-6px)' : 'none',
          }}
        >
          {bumped ? '✅' : inCooldown ? '⏳' : launching ? '🚀' : '⬆️'}
        </span>
        <span>
          {bumped ? t.bumped : inCooldown
            ? (t.cooldown + ' ' + fmt(remaining.h) + t.hours + ' ' + fmt(remaining.m) + t.minutes)
            : t.bump}
        </span>
      </button>

      <span style={{ fontSize: 11, color: '#9ca3af', paddingInlineStart: 4 }}>
        {inCooldown && lastBumpTime
          ? (t.lastBump + ': ' + new Date(lastBumpTime).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : lang === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' }))
          : t.free}
      </span>
    </div>
  );
}
