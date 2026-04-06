'use client';
// BuyerProtectionBadge.jsx
// XTOX Buyer Protection Badge - Run 134
// Shows a trust shield badge for high-value ads to reassure Arab marketplace users.
// Supports Arabic (RTL), English, German, French.


import { useState } from 'react';

const labels = {
  ar: {
    title: 'محمي بضمان XTOX',
    subtitle: 'مدفوعاتك آمنة حتى التسليم',
    tooltip: 'XTOX تحمي المشترين في حالة عدم استلام البضاعة أو وجود مشكلة في المنتج.',
  },
  en: {
    title: 'Protected by XTOX',
    subtitle: 'Your payment is safe until delivery',
    tooltip: 'XTOX protects buyers if the item is not received or has issues.',
  },
  de: {
    title: 'Geschützt durch XTOX',
    subtitle: 'Ihre Zahlung ist bis zur Lieferung sicher',
    tooltip: 'XTOX schützt Käufer, wenn der Artikel nicht ankommt oder Probleme hat.',
  },
  fr: {
    title: 'Protégé par XTOX',
    subtitle: 'Votre paiement est sécurisé jusqu\'à la livraison',
    tooltip: 'XTOX protège les acheteurs si l\'article n\'est pas reçu ou présente des problèmes.',
  },
};

export default function BuyerProtectionBadge({ lang = 'ar', priceThreshold = 500, price = 0 }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isRTL = lang === 'ar';

  // Only show for ads above price threshold
  if (price < priceThreshold) return null;

  const t = labels[lang] || labels['ar'];

  return (
    <div
      className={'relative inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2 cursor-pointer select-none ' + (isRTL ? 'flex-row-reverse' : 'flex-row')}
      dir={isRTL ? 'rtl' : 'ltr'}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((v) => !v)}
      role="status"
      aria-label={t.title}
    >
      {/* Shield icon SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-5 h-5 text-green-600 flex-shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M12 1.5a.75.75 0 01.696.47l2.08 5.2a.75.75 0 00.604.46l5.621.493a.75.75 0 01.42 1.314l-4.24 3.66a.75.75 0 00-.237.73l1.247 5.5a.75.75 0 01-1.11.814l-4.88-2.9a.75.75 0 00-.782 0l-4.88 2.9a.75.75 0 01-1.11-.814l1.247-5.5a.75.75 0 00-.237-.73l-4.24-3.66a.75.75 0 01.42-1.314l5.621-.493a.75.75 0 00.604-.46l2.08-5.2A.75.75 0 0112 1.5z"
          clipRule="evenodd"
        />
      </svg>

      <div className="flex flex-col">
        <span className="text-sm font-bold text-green-800">{t.title}</span>
        <span className="text-xs font-normal text-green-600">{t.subtitle}</span>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className={'absolute z-50 bottom-full mb-2 ' + (isRTL ? 'right-0' : 'left-0') + ' bg-white border border-green-200 rounded-lg shadow-lg p-3 text-xs text-gray-700 w-64'}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          {t.tooltip}
        </div>
      )}
    </div>
  );
}
