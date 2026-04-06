'use client';
// ConditionBadge — RTL-aware item condition display for XTOX marketplace
// Shows 'جديد' / 'مستعمل' / 'ممتاز' / 'جيد' / 'مقبول' based on condition prop

const CONDITIONS = {
  new:       { ar: 'جديد',   en: 'New',       color: '#22c55e', bg: '#dcfce7' },
  excellent: { ar: 'ممتاز',  en: 'Excellent',  color: '#3b82f6', bg: '#dbeafe' },
  good:      { ar: 'جيد',    en: 'Good',       color: '#f59e0b', bg: '#fef3c7' },
  fair:      { ar: 'مقبول',  en: 'Fair',       color: '#f97316', bg: '#ffedd5' },
  used:      { ar: 'مستعمل', en: 'Used',       color: '#6b7280', bg: '#f3f4f6' },
};

export default function ConditionBadge({ condition = 'used', lang = 'ar', className = '' }) {
  const info = CONDITIONS[condition] || CONDITIONS.used;
  const isRTL = lang === 'ar';

  return (
    <span
      dir={isRTL ? 'rtl' : 'ltr'}
      className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ' + className}
      style={{ color: info.color, backgroundColor: info.bg, border: '1px solid ' + info.color + '33' }}
      aria-label={info.en + ' condition'}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.color }} />
      {isRTL ? info.ar : info.en}
    </span>
  );
}

// Usage:
// <ConditionBadge condition="new" lang="ar" />
// <ConditionBadge condition="excellent" lang="ar" />
// <ConditionBadge condition="good" lang="ar" />
// <ConditionBadge condition="fair" lang="en" />
// <ConditionBadge condition="used" lang="ar" />
