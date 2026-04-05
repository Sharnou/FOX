'use client';

import { useState } from 'react';

// ── Translations ────────────────────────────────────────────────────────────
const T = {
  ar: {
    toggle:    'تحويل السعر لعملات أخرى',
    note:      '⚠️ الأسعار تقريبية بناءً على أسعار صرف ثابتة',
    collapse:  'إخفاء',
    baseCurrency: 'العملة الأصلية',
  },
  en: {
    toggle:    'Convert price to other currencies',
    note:      '⚠️ Approximate prices based on fixed exchange rates',
    collapse:  'Hide',
    baseCurrency: 'Base currency',
  },
  de: {
    toggle:    'Preis in andere Währungen umrechnen',
    note:      '⚠️ Näherungspreise basierend auf festen Wechselkursen',
    collapse:  'Ausblenden',
    baseCurrency: 'Basiswährung',
  },
  fr: {
    toggle:    'Convertir le prix dans d\'autres devises',
    note:      '⚠️ Prix approximatifs basés sur des taux de change fixes',
    collapse:  'Masquer',
    baseCurrency: 'Devise de base',
  },
};

// ── Currency metadata ───────────────────────────────────────────────────────
const CURRENCIES = {
  SAR: { flag: '🇸🇦', ar: 'ريال سعودي',    en: 'Saudi Riyal',        de: 'Saudi-Riyal',           fr: 'Riyal saoudien',       usd: 0.2667 },
  AED: { flag: '🇦🇪', ar: 'درهم إماراتي',  en: 'UAE Dirham',          de: 'Emirat. Dirham',        fr: 'Dirham émirati',       usd: 0.2723 },
  KWD: { flag: '🇰🇼', ar: 'دينار كويتي',   en: 'Kuwaiti Dinar',       de: 'Kuwait. Dinar',         fr: 'Dinar koweïtien',      usd: 3.259  },
  QAR: { flag: '🇶🇦', ar: 'ريال قطري',     en: 'Qatari Riyal',        de: 'Katar. Riyal',          fr: 'Riyal qatarien',       usd: 0.2747 },
  BHD: { flag: '🇧🇭', ar: 'دينار بحريني',  en: 'Bahraini Dinar',      de: 'Bahrein. Dinar',        fr: 'Dinar bahreïnien',     usd: 2.6596 },
  OMR: { flag: '🇴🇲', ar: 'ريال عماني',    en: 'Omani Rial',          de: 'Omanischer Rial',       fr: 'Rial omanais',         usd: 2.5974 },
  JOD: { flag: '🇯🇴', ar: 'دينار أردني',   en: 'Jordanian Dinar',     de: 'Jordan. Dinar',         fr: 'Dinar jordanien',      usd: 1.4117 },
  EGP: { flag: '🇪🇬', ar: 'جنيه مصري',    en: 'Egyptian Pound',      de: 'Ägyptisches Pfund',     fr: 'Livre égyptienne',     usd: 0.0323 },
  MAD: { flag: '🇲🇦', ar: 'درهم مغربي',   en: 'Moroccan Dirham',     de: 'Marokk. Dirham',        fr: 'Dirham marocain',      usd: 0.0979 },
  TND: { flag: '🇹🇳', ar: 'دينار تونسي',  en: 'Tunisian Dinar',      de: 'Tunesischer Dinar',     fr: 'Dinar tunisien',       usd: 0.3196 },
  DZD: { flag: '🇩🇿', ar: 'دينار جزائري', en: 'Algerian Dinar',      de: 'Algerischer Dinar',     fr: 'Dinar algérien',       usd: 0.0074 },
  USD: { flag: '🇺🇸', ar: 'دولار أمريكي', en: 'US Dollar',           de: 'US-Dollar',             fr: 'Dollar américain',     usd: 1.0    },
  EUR: { flag: '🇪🇺', ar: 'يورو',          en: 'Euro',                de: 'Euro',                  fr: 'Euro',                 usd: 1.085  },
};

// Default currencies to show when expanded
const DEFAULT_DISPLAY = ['AED', 'EGP', 'KWD', 'MAD', 'USD', 'EUR'];

// ── Conversion helper ────────────────────────────────────────────────────────
function convert(amount, fromCurrency, toCurrency) {
  if (!CURRENCIES[fromCurrency] || !CURRENCIES[toCurrency]) return null;
  const inUSD = amount * CURRENCIES[fromCurrency].usd;
  return inUSD / CURRENCIES[toCurrency].usd;
}

function formatAmount(value, locale) {
  if (value == null) return '—';
  const numberLocale = locale === 'ar' ? 'ar-SA' : locale === 'de' ? 'de-DE' : locale === 'fr' ? 'fr-FR' : 'en-US';
  if (value >= 1000) {
    return value.toLocaleString(numberLocale, { maximumFractionDigits: 0 });
  }
  return value.toLocaleString(numberLocale, { maximumFractionDigits: 2, minimumFractionDigits: value < 10 ? 2 : 0 });
}

// ── Component ────────────────────────────────────────────────────────────────
/**
 * MultiCurrencyDisplay
 *
 * Shows an ad price converted to multiple Arab & international currencies.
 * Supports RTL (Arabic) and 4 locales: ar | en | de | fr.
 *
 * Props:
 *   price       {number}  – The numeric price (e.g. 1500)
 *   currency    {string}  – ISO code of the source currency (default: 'SAR')
 *   locale      {string}  – UI locale: 'ar' | 'en' | 'de' | 'fr' (default: 'ar')
 *   showCurrencies {string[]} – Which target currencies to show (default: DEFAULT_DISPLAY)
 */
export default function MultiCurrencyDisplay({
  price,
  currency = 'SAR',
  locale = 'ar',
  showCurrencies = DEFAULT_DISPLAY,
}) {
  const [open, setOpen] = useState(false);

  const t         = T[locale] ?? T.ar;
  const isRTL     = locale === 'ar';
  const dir       = isRTL ? 'rtl' : 'ltr';
  const baseMeta  = CURRENCIES[currency];

  // Don't render if price or currency is invalid
  if (!price || price <= 0 || !baseMeta) return null;

  // Currencies to convert to (exclude the source currency)
  const targets = showCurrencies.filter(c => c !== currency && CURRENCIES[c]);

  return (
    <div dir={dir} className={`font-sans ${isRTL ? 'text-right' : 'text-left'}`}>
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
          border border-blue-200 bg-blue-50 text-blue-700
          hover:bg-blue-100 active:scale-95 transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-blue-400
        `}
      >
        <span aria-hidden="true">💱</span>
        <span>{open ? t.collapse : t.toggle}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" clipRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
          />
        </svg>
      </button>

      {/* Expanded panel */}
      {open && (
        <div
          className="mt-2 rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden animate-fade-in"
          role="region"
          aria-label={t.toggle}
        >
          {/* Header strip */}
          <div className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">{baseMeta.flag}</span>
              <span className="text-white text-sm font-semibold">
                {formatAmount(price, locale)} {currency}
              </span>
            </div>
            <span className="text-blue-100 text-xs">{baseMeta[locale] ?? baseMeta.en}</span>
          </div>

          {/* Currency grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-px bg-gray-100">
            {targets.map(code => {
              const meta      = CURRENCIES[code];
              const converted = convert(price, currency, code);
              const label     = meta[locale] ?? meta.en;

              return (
                <div
                  key={code}
                  className="bg-white px-3 py-2.5 flex flex-col gap-0.5 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-base leading-none" aria-hidden="true">{meta.flag}</span>
                    <span className="text-[11px] text-gray-500 truncate">{label}</span>
                  </div>
                  <div className={`text-sm font-bold text-gray-800 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {formatAmount(converted, locale)}
                    <span className="text-gray-400 font-normal text-xs ms-1">{code}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Disclaimer footer */}
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
            <p className="text-[11px] text-amber-700">{t.note}</p>
          </div>
        </div>
      )}
    </div>
  );
}
