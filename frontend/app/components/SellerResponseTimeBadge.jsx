'use client';

import { useState, useEffect } from 'react';

/**
 * SellerResponseTimeBadge
 * Displays seller's typical response time as a trust-signal badge.
 *
 * Props:
 *  - avgResponseMinutes  {number}  avg response time in minutes (default 120)
 *  - isOnline            {boolean} whether seller is currently online (default false)
 *  - lang                {string}  'ar' | 'en' (default 'ar')
 *  - className           {string}  extra Tailwind classes
 *
 * Arabic-first · RTL-safe · Cairo font · Tailwind-only · Zero deps
 */

const LABELS = {
  ar: {
    online: 'متصل الآن',
    offline: 'غير متصل',
    usuallyResponds: 'عادةً يرد',
    within: 'خلال',
    fewMinutes: 'دقائق',
    hour: 'ساعة',
    hours: 'ساعات',
    day: 'يوم',
    days: 'أيام',
    moreThan: 'أكثر من',
    fastResponder: 'بائع سريع الرد',
    goodResponder: 'يرد بانتظام',
    slowResponder: 'قد يتأخر في الرد',
    verySlowResponder: 'رد بطيء',
    tooltipFast: 'هذا البائع يرد على الرسائل بسرعة',
    tooltipGood: 'يرد البائع عادةً خلال بضع ساعات',
    tooltipSlow: 'قد يستغرق البائع يوماً أو أكثر للرد',
    tooltipVerySlow: 'البائع بطيء في الرد — كن صبوراً',
  },
  en: {
    online: 'Online Now',
    offline: 'Offline',
    usuallyResponds: 'Usually responds',
    within: 'within',
    fewMinutes: 'minutes',
    hour: 'hour',
    hours: 'hours',
    day: 'day',
    days: 'days',
    moreThan: 'more than',
    fastResponder: 'Fast Responder',
    goodResponder: 'Reliable Responder',
    slowResponder: 'Slow to Respond',
    verySlowResponder: 'Very Slow Responder',
    tooltipFast: 'This seller typically replies very quickly',
    tooltipGood: 'Seller usually replies within a few hours',
    tooltipSlow: 'Seller may take a day or more to reply',
    tooltipVerySlow: 'Seller is slow to respond — be patient',
  },
};

function formatResponseTime(minutes, lang) {
  const t = LABELS[lang] || LABELS.ar;
  if (minutes <= 30) return `${t.within} ${minutes} ${t.fewMinutes}`;
  if (minutes < 60) return `${t.within} ${minutes} ${t.fewMinutes}`;
  if (minutes === 60) return `${t.within} ${t.hour}`;
  if (minutes < 120) return `${t.within} ${Math.round(minutes / 60)} ${t.hour}`;
  if (minutes < 1440) {
    const h = Math.round(minutes / 60);
    return `${t.within} ${h} ${lang === 'ar' ? (h <= 10 ? t.hours : t.hour) : t.hours}`;
  }
  if (minutes < 2880) return `${t.within} ${t.day}`;
  const d = Math.round(minutes / 1440);
  return `${t.moreThan} ${d} ${lang === 'ar' ? (d <= 10 ? t.days : t.day) : t.days}`;
}

function getBadgeConfig(avgResponseMinutes) {
  if (avgResponseMinutes <= 60) {
    return {
      tier: 'fast',
      color: 'bg-green-100 text-green-800 border-green-300',
      iconColor: 'text-green-500',
      barColor: 'bg-green-500',
      barWidth: '100%',
      icon: '⚡',
    };
  }
  if (avgResponseMinutes <= 240) {
    return {
      tier: 'good',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
      iconColor: 'text-blue-500',
      barColor: 'bg-blue-500',
      barWidth: '70%',
      icon: '✅',
    };
  }
  if (avgResponseMinutes <= 1440) {
    return {
      tier: 'slow',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      iconColor: 'text-yellow-500',
      barColor: 'bg-yellow-400',
      barWidth: '40%',
      icon: '🕐',
    };
  }
  return {
    tier: 'verySlow',
    color: 'bg-red-100 text-red-800 border-red-300',
    iconColor: 'text-red-500',
    barColor: 'bg-red-400',
    barWidth: '15%',
    icon: '⏳',
  };
}

export default function SellerResponseTimeBadge({
  avgResponseMinutes = 120,
  isOnline = false,
  lang = 'ar',
  className = '',
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [activeLang, setActiveLang] = useState(lang);
  const [pulse, setPulse] = useState(true);

  const t = LABELS[activeLang] || LABELS.ar;
  const isRTL = activeLang === 'ar';
  const badge = getBadgeConfig(avgResponseMinutes);
  const tierLabel =
    badge.tier === 'fast'
      ? t.fastResponder
      : badge.tier === 'good'
      ? t.goodResponder
      : badge.tier === 'slow'
      ? t.slowResponder
      : t.verySlowResponder;

  const tierTooltip =
    badge.tier === 'fast'
      ? t.tooltipFast
      : badge.tier === 'good'
      ? t.tooltipGood
      : badge.tier === 'slow'
      ? t.tooltipSlow
      : t.tooltipVerySlow;

  // Pulse the online indicator every 2s
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => setPulse((p) => !p), 2000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const dir = isRTL ? 'rtl' : 'ltr';
  const fontClass = isRTL ? "font-['Cairo',sans-serif]" : "font-['Tajawal',sans-serif]";

  return (
    <div
      className={`relative inline-flex flex-col gap-2 ${fontClass} ${className}`}
      dir={dir}
    >
      {/* Online / Offline status row */}
      <div className="flex items-center gap-2">
        <span
          className={`relative flex h-3 w-3 ${isOnline ? '' : 'opacity-30'}`}
        >
          {isOnline && pulse && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex h-3 w-3 rounded-full ${
              isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
        </span>
        <span className={`text-xs font-semibold ${isOnline ? 'text-green-700' : 'text-gray-500'}`}>
          {isOnline ? t.online : t.offline}
        </span>
        {/* Language toggle */}
        <button
          onClick={() => setActiveLang((l) => (l === 'ar' ? 'en' : 'ar'))}
          className="ms-auto text-xs text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
          aria-label="Toggle language"
        >
          {activeLang === 'ar' ? 'EN' : 'عربي'}
        </button>
      </div>

      {/* Main badge */}
      <div
        className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm cursor-pointer select-none transition-all
          ${badge.color}`}
        onClick={() => setShowTooltip((v) => !v)}
        role="button"
        aria-label={tierLabel}
      >
        <span className="text-base">{badge.icon}</span>
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-bold leading-tight">{tierLabel}</span>
          <span className="text-xs opacity-80 leading-tight">
            {t.usuallyResponds} {formatResponseTime(avgResponseMinutes, activeLang)}
          </span>
        </div>
        <span className={`ms-auto text-xs opacity-50 ${badge.iconColor}`}>ⓘ</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={`absolute z-20 top-full mt-2 ${isRTL ? 'right-0' : 'left-0'} w-56
            bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs text-gray-700`}
        >
          <p className="font-semibold mb-1">{tierLabel}</p>
          <p className="text-gray-500">{tierTooltip}</p>
          <div className="mt-2">
            <div className="flex justify-between text-gray-400 text-xs mb-1">
              <span>{activeLang === 'ar' ? 'سرعة الرد' : 'Response speed'}</span>
              <span>
                {badge.tier === 'fast'
                  ? '🔥'
                  : badge.tier === 'good'
                  ? '👍'
                  : badge.tier === 'slow'
                  ? '🐢'
                  : '😴'}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${badge.barColor}`}
                style={{ width: badge.barWidth }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Compact time display */}
      <p className="text-xs text-gray-400 text-center">
        {activeLang === 'ar' ? 'متوسط وقت الرد:' : 'Avg. response time:'}{' '}
        <strong className="text-gray-600">
          {formatResponseTime(avgResponseMinutes, activeLang)}
        </strong>
      </p>
    </div>
  );
}
