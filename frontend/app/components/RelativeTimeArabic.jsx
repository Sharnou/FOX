'use client';

/**
 * RelativeTimeArabic — RTL-aware relative time display
 * Shows how long ago an ad was posted in Arabic
 * e.g. "منذ لحظات"، "منذ دقيقتين"، "منذ 5 دقائق"، "منذ ساعة"، "منذ يومين"
 * 
 * Usage:
 *   import RelativeTimeArabic, { getRelativeTimeArabic } from '@/components/RelativeTimeArabic';
 *   <RelativeTimeArabic date={ad.createdAt} />
 */

/**
 * Returns a human-readable Arabic relative time string.
 * @param {string|Date|number} dateInput
 * @returns {string}
 */
export function getRelativeTimeArabic(dateInput) {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 30)  return 'منذ لحظات';
  if (diffSec < 60)  return `منذ ${diffSec} ثانية`;
  if (diffMin === 1) return 'منذ دقيقة';
  if (diffMin === 2) return 'منذ دقيقتين';
  if (diffMin < 11)  return `منذ ${diffMin} دقائق`;
  if (diffMin < 60)  return `منذ ${diffMin} دقيقة`;
  if (diffHour === 1) return 'منذ ساعة';
  if (diffHour === 2) return 'منذ ساعتين';
  if (diffHour < 11)  return `منذ ${diffHour} ساعات`;
  if (diffHour < 24)  return `منذ ${diffHour} ساعة`;
  if (diffDay === 1) return 'منذ يوم';
  if (diffDay === 2) return 'منذ يومين';
  if (diffDay < 11)  return `منذ ${diffDay} أيام`;
  if (diffDay < 30)  return `منذ ${diffDay} يوماً`;
  if (diffMonth === 1) return 'منذ شهر';
  if (diffMonth === 2) return 'منذ شهرين';
  if (diffMonth < 11)  return `منذ ${diffMonth} أشهر`;
  if (diffMonth < 12)  return `منذ ${diffMonth} شهراً`;
  if (diffYear === 1) return 'منذ سنة';
  if (diffYear === 2) return 'منذ سنتين';
  return `منذ ${diffYear} سنوات`;
}

/**
 * RelativeTimeArabic component — renders Arabic relative time in an RTL <time> element.
 * Shows the full date as a tooltip on hover.
 *
 * @param {{ date: string|Date|number, className?: string }} props
 */
export default function RelativeTimeArabic({ date, className = '' }) {
  if (!date) return null;

  const label = getRelativeTimeArabic(date);

  const fullDate = new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <time
      dateTime={new Date(date).toISOString()}
      className={`text-xs text-gray-400 font-arabic select-none ${className}`}
      dir="rtl"
      title={fullDate}
      aria-label={`نُشر ${label}`}
    >
      {label}
    </time>
  );
}
