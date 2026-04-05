'use client';

/**
 * InstallmentBadge
 * ----------------
 * Displays a "بالتقسيط / Installment" pill badge when an ad
 * is available for installment payments.
 *
 * Props:
 *   installment {boolean} - true → show badge, false/undefined → return null
 *   locale      {string}  - 'ar' | 'en' | 'de' | 'fr' (defaults to 'ar')
 *
 * Zero backend deps — reads only from props.
 * RTL-safe, Arabic-first.
 */

const LABELS = {
  ar: 'بالتقسيط',
  en: 'Installment',
  de: 'Ratenzahlung',
  fr: 'Paiement échelonné',
};

export default function InstallmentBadge({ installment, locale = 'ar' }) {
  if (!installment) return null;

  const isRTL = locale === 'ar';
  const label = LABELS[locale] ?? LABELS['ar'];

  return (
    <span
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '9999px',
        backgroundColor: '#ede9fe',
        color: '#5b21b6',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: isRTL ? 'Cairo, Tajawal, sans-serif' : 'inherit',
        lineHeight: '1.4',
        whiteSpace: 'nowrap',
        flexDirection: isRTL ? 'row-reverse' : 'row',
      }}
      aria-label={label}
    >
      {/* Credit card icon */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
      {label}
    </span>
  );
}
