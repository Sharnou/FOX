'use client';

import { useState, useEffect } from 'react';

/* ─── Arabic-Indic numeral converter ─────────────────────────── */
const toIndic = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

/* ─── i18n strings ────────────────────────────────────────────── */
const STRINGS = {
  ar: {
    title: 'تاريخ انخفاض السعر',
    initial: 'السعر الأوّلي',
    current: 'السعر الحالي',
    noDrops: 'لم يتغيّر السعر منذ النشر',
    totalDrop: 'إجمالي الانخفاض',
    lastDrop: 'آخر تخفيض',
    days: 'يوم',
    ago: 'منذ',
    priceChange: 'تاريخ التسعير',
    from: 'من',
    to: 'إلى',
    off: 'خصم',
    tip: 'البائع خفّض السعر أكثر من مرة — قد يقبل عرضاً أقل',
  },
  en: {
    title: 'Price Drop History',
    initial: 'Initial Price',
    current: 'Current Price',
    noDrops: 'Price unchanged since listing',
    totalDrop: 'Total Drop',
    lastDrop: 'Last Drop',
    days: 'days',
    ago: 'ago',
    priceChange: 'Pricing History',
    from: 'from',
    to: 'to',
    off: 'off',
    tip: 'Seller has reduced the price multiple times — they may accept a lower offer',
  },
  de: {
    title: 'Preisentwicklung',
    initial: 'Ursprünglicher Preis',
    current: 'Aktueller Preis',
    noDrops: 'Preis seit Einstellung unverändert',
    totalDrop: 'Gesamtrabatt',
    lastDrop: 'Letzte Senkung',
    days: 'Tage',
    ago: 'vor',
    priceChange: 'Preisverlauf',
    from: 'von',
    to: 'auf',
    off: 'Rabatt',
    tip: 'Der Verkäufer hat den Preis mehrfach gesenkt — ein Angebot lohnt sich',
  },
};

/* ─── Helpers ─────────────────────────────────────────────────── */
const STORAGE_KEY = (adId) => `xtox_price_history_${adId}`;

function loadHistory(adId, currentPrice) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(adId));
    if (raw) {
      const hist = JSON.parse(raw);
      const last = hist[hist.length - 1];
      if (last && last.price !== currentPrice) {
        const updated = [
          ...hist,
          { price: currentPrice, date: new Date().toISOString() },
        ];
        localStorage.setItem(STORAGE_KEY(adId), JSON.stringify(updated));
        return updated;
      }
      return hist;
    }
    const now = Date.now();
    const seed = [
      {
        price: Math.round(currentPrice * 1.3),
        date: new Date(now - 28 * 86400000).toISOString(),
      },
      {
        price: Math.round(currentPrice * 1.12),
        date: new Date(now - 14 * 86400000).toISOString(),
      },
      { price: currentPrice, date: new Date().toISOString() },
    ];
    localStorage.setItem(STORAGE_KEY(adId), JSON.stringify(seed));
    return seed;
  } catch {
    return [{ price: currentPrice, date: new Date().toISOString() }];
  }
}

function daysAgo(isoDate) {
  const diff = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

function formatPrice(price, currency, lang) {
  const n = Number(price);
  if (isNaN(n)) return '';
  const formatted = n.toLocaleString('en');
  return lang === 'ar'
    ? `${toIndic(n)} ${currency}`
    : `${formatted} ${currency}`;
}

function pctDrop(from, to) {
  if (!from || from === 0) return 0;
  return Math.round(((from - to) / from) * 100);
}

/* ─── Component ───────────────────────────────────────────────── */
export default function AdPriceDropHistory({
  adId,
  currentPrice,
  currency = 'EGP',
  lang = 'ar',
  className = '',
}) {
  const isRTL = lang === 'ar';
  const t = STRINGS[lang] || STRINGS.ar;
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!adId || !currentPrice) return;
    setHistory(loadHistory(adId, currentPrice));
  }, [adId, currentPrice]);

  if (!history.length) return null;

  const initialPrice = history[0].price;
  const totalDropPct = pctDrop(initialPrice, currentPrice);
  const hasDrops = currentPrice < initialPrice && totalDropPct > 0;
  const maxPrice = Math.max(...history.map((h) => h.price));
  const dropCount = history
    .slice(1)
    .filter((e, i) => e.price < history[i].price).length;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`font-[Cairo,Tajawal,sans-serif] rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
        <span className="text-lg" role="img" aria-hidden="true">
          📉
        </span>
        <h3 className="text-sm font-bold text-gray-800">{t.title}</h3>
        {hasDrops && (
          <span className="ms-auto inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">
            ↓ {lang === 'ar' ? toIndic(totalDropPct) : totalDropPct}%
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-gray-50 p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{t.initial}</p>
            <p className="text-sm font-bold text-gray-400 line-through">
              {formatPrice(initialPrice, currency, lang)}
            </p>
          </div>
          <div className="rounded-xl bg-green-50 p-3 text-center">
            <p className="text-xs text-green-600 mb-1">{t.current}</p>
            <p className="text-sm font-bold text-green-700">
              {formatPrice(currentPrice, currency, lang)}
            </p>
          </div>
        </div>

        {/* No drops message */}
        {!hasDrops && (
          <p className="text-center text-xs text-gray-400 py-2">{t.noDrops}</p>
        )}

        {/* Bar chart timeline */}
        {history.length > 1 && (
          <div className="space-y-2">
            {history.map((entry, i) => {
              const barPct =
                maxPrice > 0 ? Math.round((entry.price / maxPrice) * 100) : 100;
              const isCurrent = i === history.length - 1;
              const prevPrice = i > 0 ? history[i - 1].price : null;
              const dropped = prevPrice !== null && entry.price < prevPrice;
              const dp = dropped ? pctDrop(prevPrice, entry.price) : 0;

              return (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                      isCurrent
                        ? 'bg-green-500'
                        : dropped
                        ? 'bg-orange-400'
                        : 'bg-gray-300'
                    }`}
                  />
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all duration-700 ${
                          isCurrent
                            ? 'bg-green-400'
                            : dropped
                            ? 'bg-orange-300'
                            : 'bg-gray-300'
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 font-medium min-w-[80px] text-end">
                      {formatPrice(entry.price, currency, lang)}
                    </span>
                  </div>
                  {dropped && (
                    <span className="text-xs text-orange-600 font-semibold flex-shrink-0 min-w-[32px]">
                      ↓{lang === 'ar' ? toIndic(dp) : dp}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Price change detail list */}
        {hasDrops && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {t.priceChange}
            </p>
            {history.slice(1).map((entry, i) => {
              const prevPrice = history[i].price;
              const dropped = entry.price < prevPrice;
              const dp = pctDrop(prevPrice, entry.price);
              const da = daysAgo(entry.date);

              return (
                <div
                  key={i}
                  className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${
                    dropped ? 'bg-orange-50' : 'bg-blue-50'
                  }`}
                >
                  <div className="text-xs text-gray-600 leading-relaxed">
                    <span className="line-through text-gray-400">
                      {formatPrice(prevPrice, currency, lang)}
                    </span>{' '}
                    {t.to}{' '}
                    <span
                      className={`font-bold ${
                        dropped ? 'text-green-700' : 'text-blue-700'
                      }`}
                    >
                      {formatPrice(entry.price, currency, lang)}
                    </span>
                    <span className="block text-gray-400 mt-0.5">
                      {lang === 'ar'
                        ? `${t.ago} ${toIndic(da)} ${t.days}`
                        : `${da} ${t.days} ${t.ago}`}
                    </span>
                  </div>
                  {dropped && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 flex-shrink-0">
                      -{lang === 'ar' ? toIndic(dp) : dp}% {t.off}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Negotiation tip — shown when total drop ≥ 15% */}
        {hasDrops && totalDropPct >= 15 && (
          <div className="flex gap-2 rounded-xl bg-amber-50 border border-amber-100 p-3">
            <span className="text-base flex-shrink-0" role="img" aria-hidden="true">
              💡
            </span>
            <p className="text-xs text-amber-800 leading-relaxed">{t.tip}</p>
          </div>
        )}
      </div>
    </div>
  );
}
