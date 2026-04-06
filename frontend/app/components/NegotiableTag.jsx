'use client';

/**
 * NegotiableTag — شارة قابل للتفاوض
 * Shows a "Negotiable" badge when ad.negotiable is true.
 * Supports Arabic RTL, English, German (auto-detects from locale prop).
 * Zero backend deps — reads directly from ad prop.
 * Added: Run 127
 */

const LABELS = {
  ar: 'قابل للتفاوض',
  de: 'Verhandelbar',
  en: 'Negotiable',
  fr: 'Négociable',
};

export default function NegotiableTag({ negotiable, locale = 'ar', className = '' }) {
  if (!negotiable) return null;

  const isRTL = locale === 'ar';
  const label = LABELS[locale] || LABELS['en'];

  return (
    <span
      dir={isRTL ? 'rtl' : 'ltr'}
      className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 select-none ' + className}
      title={label}
      aria-label={label}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-3 h-3 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Handshake icon paths */}
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      <span>{label}</span>
    </span>
  );
}
