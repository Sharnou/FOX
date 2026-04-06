'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * CountdownDealTimer
 * Flash-deal / limited-time countdown timer for XTOX marketplace.
 *
 * Props:
 *   expiresAt  {string|Date} — ISO date string or Date object when the deal ends
 *   lang       {string}      — 'ar' | 'en' | 'de'  (default 'ar')
 *   compact    {boolean}     — compact inline mode (default false = card mode)
 *   onExpire   {function}    — called when timer reaches zero
 *   labelKey   {string}      — 'deal'|'featured'|'offer' controls the badge label
 */

const LABELS = {
  ar: {
    deal:      '⚡ عرض محدود',
    featured:  '🌟 مميز لفترة محدودة',
    offer:     '🏷️ عرض خاص',
    days:      'يوم',
    hours:     'ساعة',
    minutes:   'دقيقة',
    seconds:   'ثانية',
    expired:   'انتهى العرض',
    ends_in:   'ينتهي خلال',
  },
  en: {
    deal:      '⚡ Flash Deal',
    featured:  '🌟 Featured',
    offer:     '🏷️ Special Offer',
    days:      'd',
    hours:     'h',
    minutes:   'm',
    seconds:   's',
    expired:   'Offer Ended',
    ends_in:   'Ends in',
  },
  de: {
    deal:      '⚡ Blitzangebot',
    featured:  '🌟 Hervorgehoben',
    offer:     '🏷️ Sonderangebot',
    days:      'T',
    hours:     'Std',
    minutes:   'Min',
    seconds:   'Sek',
    expired:   'Angebot beendet',
    ends_in:   'Endet in',
  },
};

// Convert to Arabic-Indic numerals for Arabic locale
function toArabicNumerals(num, lang) {
  if (lang !== 'ar') return String(num).padStart(2, '0');
  return String(num)
    .padStart(2, '0')
    .replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function calcTimeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return null;
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days:    Math.floor(totalSeconds / 86400),
    hours:   Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

// Urgency color based on remaining time
function urgencyColor(timeLeft) {
  if (!timeLeft) return 'bg-gray-400';
  const totalSecs =
    timeLeft.days * 86400 +
    timeLeft.hours * 3600 +
    timeLeft.minutes * 60 +
    timeLeft.seconds;
  if (totalSecs < 3600)   return 'bg-red-600 animate-pulse';   // < 1 hour: red pulse
  if (totalSecs < 86400)  return 'bg-orange-500';              // < 1 day: orange
  return 'bg-emerald-600';                                       // > 1 day: green
}

export default function CountdownDealTimer({
  expiresAt,
  lang      = 'ar',
  compact   = false,
  onExpire,
  labelKey  = 'deal',
}) {
  const isRTL = lang === 'ar';
  const t     = LABELS[lang] || LABELS.ar;
  const n     = (num) => toArabicNumerals(num, lang);

  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(expiresAt));

  const tick = useCallback(() => {
    const tl = calcTimeLeft(expiresAt);
    setTimeLeft(tl);
    if (!tl && onExpire) onExpire();
  }, [expiresAt, onExpire]);

  useEffect(() => {
    if (!timeLeft) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick, timeLeft]);

  const badgeColor = urgencyColor(timeLeft);

  // ── Compact inline badge ─────────────────────────────────────────────────
  if (compact) {
    if (!timeLeft) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-400">
          {t.expired}
        </span>
      );
    }
    return (
      <span
        dir={isRTL ? 'rtl' : 'ltr'}
        className={'inline-flex items-center gap-1 text-xs font-bold text-white px-2 py-0.5 rounded-full ' + badgeColor}
        style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : 'inherit' }}
      >
        {t.ends_in}{' '}
        {timeLeft.days > 0 && <>{n(timeLeft.days)}{t.days} </>}
        {n(timeLeft.hours)}{t.hours} {n(timeLeft.minutes)}{t.minutes}
      </span>
    );
  }

  // ── Full card mode ────────────────────────────────────────────────────────
  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-3 shadow-sm"
      style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : 'inherit' }}
    >
      {/* Badge label */}
      <div className={'inline-block text-xs font-bold text-white rounded-full px-3 py-1 mb-2 ' + badgeColor}>
        {t[labelKey] || t.deal}
      </div>

      {/* Expired state */}
      {!timeLeft ? (
        <p className="text-sm font-semibold text-gray-500">{t.expired}</p>
      ) : (
        <>
          <p className="text-xs text-gray-500 mb-1">{t.ends_in}</p>

          {/* Digit blocks */}
          <div className={'flex gap-2 ' + (isRTL ? 'flex-row-reverse justify-end' : '')}>
            {timeLeft.days > 0 && (
              <DigitBlock value={n(timeLeft.days)} label={t.days} color={badgeColor} />
            )}
            <DigitBlock value={n(timeLeft.hours)}   label={t.hours}   color={badgeColor} />
            <DigitBlock value={n(timeLeft.minutes)} label={t.minutes} color={badgeColor} />
            <DigitBlock value={n(timeLeft.seconds)} label={t.seconds} color={badgeColor} />
          </div>
        </>
      )}
    </div>
  );
}

function DigitBlock({ value, label, color }) {
  return (
    <div className="flex flex-col items-center min-w-[42px]">
      <div className={'text-xl font-black text-white rounded-xl px-2 py-1 min-w-[42px] text-center ' + color}>
        {value}
      </div>
      <span className="text-[10px] text-gray-500 mt-0.5">{label}</span>
    </div>
  );
}
