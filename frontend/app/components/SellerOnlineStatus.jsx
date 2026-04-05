'use client';
import { useState, useEffect } from 'react';

/**
 * SellerOnlineStatus
 * Shows whether a seller is currently online or their last seen time.
 * Supports Arabic RTL and multiple locales.
 *
 * Props:
 *   lastSeen {string|Date} - ISO date string of seller's last activity
 *   locale {string} - 'ar', 'de', 'en', etc. (default: 'ar')
 *   showLabel {boolean} - whether to show the text label (default: true)
 *   className {string} - additional CSS classes
 */
export default function SellerOnlineStatus({ lastSeen, locale = 'ar', showLabel = true, className = '' }) {
  const [label, setLabel] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [dotColor, setDotColor] = useState('bg-gray-400');

  const labels = {
    ar: {
      online: 'متصل الآن',
      minutesAgo: (n) => `آخر ظهور منذ ${n} ${n === 1 ? 'دقيقة' : 'دقائق'}`,
      hoursAgo: (n) => `آخر ظهور منذ ${n} ${n === 1 ? 'ساعة' : 'ساعات'}`,
      daysAgo: (n) => `آخر ظهور منذ ${n} ${n === 1 ? 'يوم' : 'أيام'}`,
      unknown: 'غير معروف',
    },
    en: {
      online: 'Online now',
      minutesAgo: (n) => `Last seen ${n} min ago`,
      hoursAgo: (n) => `Last seen ${n}h ago`,
      daysAgo: (n) => `Last seen ${n}d ago`,
      unknown: 'Unknown',
    },
    de: {
      online: 'Jetzt online',
      minutesAgo: (n) => `Zuletzt gesehen vor ${n} Min.`,
      hoursAgo: (n) => `Zuletzt gesehen vor ${n} Std.`,
      daysAgo: (n) => `Zuletzt gesehen vor ${n} Tag(en)`,
      unknown: 'Unbekannt',
    },
  };

  useEffect(() => {
    if (!lastSeen) {
      setLabel((labels[locale] || labels.en).unknown);
      setDotColor('bg-gray-400');
      setIsOnline(false);
      return;
    }

    const updateStatus = () => {
      const now = new Date();
      const seen = new Date(lastSeen);
      const diffMs = now - seen;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      const t = labels[locale] || labels.en;

      if (diffMin < 5) {
        setIsOnline(true);
        setDotColor('bg-green-500');
        setLabel(t.online);
      } else if (diffMin < 60) {
        setIsOnline(false);
        setDotColor('bg-yellow-400');
        setLabel(t.minutesAgo(diffMin));
      } else if (diffHrs < 24) {
        setIsOnline(false);
        setDotColor('bg-gray-400');
        setLabel(t.hoursAgo(diffHrs));
      } else {
        setIsOnline(false);
        setDotColor('bg-gray-300');
        setLabel(t.daysAgo(diffDays));
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [lastSeen, locale]);

  const isRTL = locale === 'ar';

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm ${isRTL ? 'flex-row-reverse' : 'flex-row'} ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      aria-label={label}
    >
      <span
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor} ${isOnline ? 'animate-pulse' : ''}`}
        role="img"
        aria-hidden="true"
      />
      {showLabel && (
        <span className={`text-gray-500 ${isRTL ? 'font-cairo' : ''}`}>{label}</span>
      )}
    </span>
  );
}
