'use client';
import { useMemo } from 'react';

/**
 * PriceComparisonMeter
 * Shows how a listing's price compares to market average for similar items.
 *
 * Props:
 *   price        {number}  - This listing's price
 *   avgPrice     {number}  - Market average price for the category
 *   currency     {string}  - Currency code: 'EGP' | 'EUR' | 'USD' | 'SAR' | 'AED' | 'MAD'
 *   lang         {string}  - 'ar' | 'en' | 'de'
 *   compact      {boolean} - Compact inline badge mode (default false)
 */

const LABELS = {
  ar: {
    belowMarket: '\u0623\u0642\u0644 \u0645\u0646 \u0627\u0644\u0633\u0648\u0642',
    fairPrice:   '\u0633\u0639\u0631 \u0639\u0627\u062f\u0644',
    aboveMarket: '\u0623\u0639\u0644\u0649 \u0645\u0646 \u0627\u0644\u0633\u0648\u0642',
    marketAvg:   '\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u0633\u0648\u0642',
    thisListing: '\u0647\u0630\u0627 \u0627\u0644\u0625\u0639\u0644\u0627\u0646',
    saving:      '\u0648\u0641\u0651\u0631',
    extra:       '\u0632\u064a\u0627\u062f\u0629 \u0628\u0640',
    vs:          '\u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0633\u0648\u0642',
  },
  en: {
    belowMarket: 'Below Market',
    fairPrice:   'Fair Price',
    aboveMarket: 'Above Market',
    marketAvg:   'Market Avg',
    thisListing: 'This Listing',
    saving:      'Save',
    extra:       'Extra',
    vs:          'vs market',
  },
  de: {
    belowMarket: 'Unter Marktpreis',
    fairPrice:   'Fairer Preis',
    aboveMarket: '\u00dcber Marktpreis',
    marketAvg:   'Marktdurchschnitt',
    thisListing: 'Dieses Angebot',
    saving:      'Ersparnis',
    extra:       'Aufpreis',
    vs:          'vs. Markt',
  },
};

const CURRENCY_SYMBOLS = {
  EGP: '\u062c.\u0645', SAR: '\u0631.\u0633', AED: '\u062f.\u0625', KWD: '\u062f.\u0643',
  MAD: '\u062f.\u0645', JOD: '\u062f.\u0623', EUR: '\u20ac', USD: '$', GBP: '\u00a3',
};

function toArabicNumerals(num) {
  return String(num).replace(/\d/g, d => '\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'[d]);
}

function formatPrice(amount, currency, lang) {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const formatted = Math.round(amount).toLocaleString('en');
  const numStr = lang === 'ar' ? toArabicNumerals(formatted) : formatted;
  return lang === 'ar' ? `${numStr} ${symbol}` : `${symbol}${numStr}`;
}

export default function PriceComparisonMeter({
  price,
  avgPrice,
  currency = 'EGP',
  lang = 'ar',
  compact = false,
}) {
  const isRTL = lang === 'ar';
  const t = LABELS[lang] || LABELS.ar;

  const { diff, pct, zone, meterPct } = useMemo(() => {
    if (!price || !avgPrice || avgPrice === 0) return { diff: 0, pct: 0, zone: 'fair', meterPct: 50 };
    const d = price - avgPrice;
    const p = Math.round((d / avgPrice) * 100);
    let zone = 'fair';
    if (p < -10) zone = 'below';
    else if (p > 10) zone = 'above';
    const clamped = Math.max(-50, Math.min(50, p));
    const meter = Math.round(50 + clamped);
    return { diff: d, pct: p, zone, meterPct: meter };
  }, [price, avgPrice]);

  const zoneConfig = {
    below: { label: t.belowMarket, emoji: '\ud83d\udc9a', textClass: 'text-emerald-600', bgClass: 'bg-emerald-50 border-emerald-200' },
    fair:  { label: t.fairPrice,   emoji: '\u2705',       textClass: 'text-blue-600',   bgClass: 'bg-blue-50 border-blue-200' },
    above: { label: t.aboveMarket, emoji: '\ud83d\udd34', textClass: 'text-rose-600',   bgClass: 'bg-rose-50 border-rose-200' },
  };
  const cfg = zoneConfig[zone];
  const absPct = Math.abs(pct);
  const absDiff = Math.abs(diff);

  if (compact) {
    return (
      <span
        dir={isRTL ? 'rtl' : 'ltr'}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bgClass} ${cfg.textClass}`}
        style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : 'inherit' }}
        title={`${formatPrice(price, currency, lang)} (${pct > 0 ? '+' : ''}${lang === 'ar' ? toArabicNumerals(pct) : pct}%)`}
      >
        <span>{cfg.emoji}</span>
        <span>{cfg.label}</span>
        {absPct > 0 && (
          <span className="opacity-75">
            ({pct > 0 ? '+' : ''}{lang === 'ar' ? toArabicNumerals(absPct) : absPct}%)
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`rounded-2xl border p-4 ${cfg.bgClass}`}
      style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : 'inherit' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-bold ${cfg.textClass} flex items-center gap-1.5`}>
          <span className="text-base">{cfg.emoji}</span>
          {cfg.label}
        </span>
        <span className="text-xs text-gray-500">{t.vs}</span>
      </div>

      <div className="relative mb-3">
        <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(to right, #10b981, #3b82f6, #f43f5e)',
              opacity: 0.3,
              width: '100%',
            }}
          />
        </div>
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md"
          style={{
            left: isRTL ? 'auto' : `calc(${meterPct}% - 8px)`,
            right: isRTL ? `calc(${100 - meterPct}% - 8px)` : 'auto',
            backgroundColor: zone === 'below' ? '#10b981' : zone === 'above' ? '#f43f5e' : '#3b82f6',
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-400 mb-3 px-1">
        <span>{LABELS[lang].belowMarket}</span>
        <span>{LABELS[lang].fairPrice}</span>
        <span>{LABELS[lang].aboveMarket}</span>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex flex-col items-center bg-white rounded-xl px-3 py-2 border border-gray-100 flex-1 shadow-sm">
          <span className="text-xs text-gray-400 mb-0.5">{t.thisListing}</span>
          <span className={`font-bold text-base ${cfg.textClass}`}>
            {formatPrice(price, currency, lang)}
          </span>
        </div>
        <div className="text-gray-300 text-lg font-thin">|</div>
        <div className="flex flex-col items-center bg-white rounded-xl px-3 py-2 border border-gray-100 flex-1 shadow-sm">
          <span className="text-xs text-gray-400 mb-0.5">{t.marketAvg}</span>
          <span className="font-bold text-base text-gray-700">
            {formatPrice(avgPrice, currency, lang)}
          </span>
        </div>
      </div>

      {absDiff > 0 && (
        <div className={`mt-3 text-xs text-center font-semibold ${cfg.textClass}`}>
          {zone === 'below'
            ? `${t.saving} ${formatPrice(absDiff, currency, lang)} (${lang === 'ar' ? toArabicNumerals(absPct) : absPct}%)`
            : zone === 'above'
              ? `${t.extra} ${formatPrice(absDiff, currency, lang)} (${lang === 'ar' ? toArabicNumerals(absPct) : absPct}%)`
              : null
          }
        </div>
      )}
    </div>
  );
}
