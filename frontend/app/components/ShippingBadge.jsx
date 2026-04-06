'use client';

/**
 * ShippingBadge — displays delivery/pickup option badge on marketplace ads.
 * Supports Arabic RTL, 4 locales (ar/en/de/fr), and shipping types:
 *   'shipping' | 'pickup' | 'both'
 *
 * Usage: <ShippingBadge type="shipping" locale="ar" />
 */

const LABELS = {
  ar: {
    shipping: 'شحن متاح',
    pickup:   'استلام فقط',
    both:     'شحن أو استلام',
  },
  en: {
    shipping: 'Shipping Available',
    pickup:   'Pickup Only',
    both:     'Shipping or Pickup',
  },
  de: {
    shipping: 'Versand möglich',
    pickup:   'Nur Abholung',
    both:     'Versand oder Abholung',
  },
  fr: {
    shipping: 'Livraison disponible',
    pickup:   'Retrait uniquement',
    both:     'Livraison ou retrait',
  },
};

const ICONS = {
  shipping: '🚚',
  pickup:   '📍',
  both:     '🚚📍',
};

const COLORS = {
  shipping: { bg: '#e6f4ff', text: '#0066cc', border: '#b3d9ff' },
  pickup:   { bg: '#fff7e6', text: '#b35900', border: '#ffd699' },
  both:     { bg: '#e6fff0', text: '#006633', border: '#99eebb' },
};

export default function ShippingBadge({ type = 'pickup', locale = 'ar' }) {
  const safeType   = ['shipping', 'pickup', 'both'].includes(type) ? type : 'pickup';
  const safeLocale = ['ar', 'en', 'de', 'fr'].includes(locale) ? locale : 'ar';
  const isRTL      = safeLocale === 'ar';
  const label      = (LABELS[safeLocale] || LABELS.en)[safeType];
  const icon       = ICONS[safeType];
  const colors     = COLORS[safeType];

  return (
    <span
      dir={isRTL ? 'rtl' : 'ltr'}
      title={label}
      aria-label={label}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '4px',
        padding:        '2px 8px',
        borderRadius:   '12px',
        fontSize:       '0.72rem',
        fontWeight:     '600',
        fontFamily:     isRTL ? '\'Cairo\', \'Tajawal\', sans-serif' : 'inherit',
        background:     colors.bg,
        color:          colors.text,
        border:         '1px solid ' + colors.border,
        whiteSpace:     'nowrap',
        userSelect:     'none',
        flexDirection:  isRTL ? 'row-reverse' : 'row',
        verticalAlign:  'middle',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: '0.85rem' }}>{icon}</span>
      <span>{label}</span>
    </span>
  );
}
