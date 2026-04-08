'use client';
/**
 * FlashDealsBoard.jsx — XTOX Marketplace
 * Scrollable discovery board for time-limited flash deals.
 * Each deal card shows original/deal price, discount %, countdown, category badge.
 * Category filter chips + sort by discount/time-left/newest.
 * Arabic-Indic numerals. Cairo/Tajawal fonts. RTL-aware. Tailwind only, zero deps.
 * Props:
 *   deals   — array of { id, title, image, originalPrice, dealPrice, currency,
 *                        category, endTime, sellerId, sellerName }
 *   lang    — 'ar' | 'en' | 'de'  (default 'ar')
 *   className
 */

import { useState, useEffect, useCallback } from 'react';

// ─── i18n ────────────────────────────────────────────────────────────────────
const T = {
  ar: {
    title: 'عروض فلاش ⚡',
    all: 'الكل',
    sortDiscount: 'الأعلى خصمًا',
    sortTime: 'ينتهي قريبًا',
    sortNew: 'الأحدث',
    off: 'خصم',
    left: 'متبقي',
    buy: 'اشترِ الآن',
    expired: 'انتهى العرض',
    noDeals: 'لا توجد عروض فلاش حاليًا',
    days: 'ي',
    hours: 'س',
    mins: 'د',
    secs: 'ث',
    egp: 'ج.م',
    eur: '€',
    by: 'من',
  },
  en: {
    title: 'Flash Deals ⚡',
    all: 'All',
    sortDiscount: 'Best Discount',
    sortTime: 'Ending Soon',
    sortNew: 'Newest',
    off: 'OFF',
    left: 'left',
    buy: 'Buy Now',
    expired: 'Deal Expired',
    noDeals: 'No flash deals right now',
    days: 'd',
    hours: 'h',
    mins: 'm',
    secs: 's',
    egp: 'EGP',
    eur: '€',
    by: 'by',
  },
  de: {
    title: 'Blitzangebote ⚡',
    all: 'Alle',
    sortDiscount: 'Bester Rabatt',
    sortTime: 'Bald ablaufend',
    sortNew: 'Neueste',
    off: 'RABATT',
    left: 'übrig',
    buy: 'Jetzt kaufen',
    expired: 'Angebot abgelaufen',
    noDeals: 'Keine Blitzangebote',
    days: 'T',
    hours: 'S',
    mins: 'M',
    secs: 'S',
    egp: 'EGP',
    eur: '€',
    by: 'von',
  },
};

// Arabic-Indic numerals
const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const formatNum = (n, lang) => (lang === 'ar' ? toArabicIndic(n) : String(n));

const formatPrice = (price, currency, lang) => {
  const sym = currency === 'EUR' ? T[lang].eur : T[lang].egp;
  const num = formatNum(Math.round(price), lang);
  return lang === 'ar' ? `${num} ${sym}` : `${sym} ${num}`;
};

// ─── Countdown hook ───────────────────────────────────────────────────────────
function useCountdown(endTime) {
  const calc = useCallback(() => {
    const diff = Math.max(0, new Date(endTime) - Date.now());
    const totalSecs = Math.floor(diff / 1000);
    return {
      days: Math.floor(totalSecs / 86400),
      hours: Math.floor((totalSecs % 86400) / 3600),
      mins: Math.floor((totalSecs % 3600) / 60),
      secs: totalSecs % 60,
      expired: diff === 0,
    };
  }, [endTime]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [calc]);
  return time;
}

// ─── Deal Card ────────────────────────────────────────────────────────────────
function DealCard({ deal, lang }) {
  const t = T[lang];
  const discount = Math.round(
    ((deal.originalPrice - deal.dealPrice) / deal.originalPrice) * 100
  );
  const { days, hours, mins, secs, expired } = useCountdown(deal.endTime);

  const pad = (n) => formatNum(String(n).padStart(2, '0'), lang);

  return (
    <div className="relative flex flex-col bg-white rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-violet-100 group">
      {/* Discount badge */}
      <div className="absolute top-2 start-2 z-10 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
        {formatNum(discount, lang)}% {t.off}
      </div>

      {/* Category badge */}
      <div className="absolute top-2 end-2 z-10 bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full">
        {deal.category}
      </div>

      {/* Image */}
      <div className="relative h-40 bg-gradient-to-br from-violet-50 to-indigo-100 overflow-hidden">
        {deal.image ? (
          <img
            src={deal.image}
            alt={deal.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-4xl">🛒</div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 p-3 flex-1">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2 font-[Cairo,Tajawal,sans-serif]">
          {deal.title}
        </h3>

        {/* Prices */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-bold text-violet-700">
            {formatPrice(deal.dealPrice, deal.currency || 'EGP', lang)}
          </span>
          <span className="text-xs line-through text-gray-400">
            {formatPrice(deal.originalPrice, deal.currency || 'EGP', lang)}
          </span>
        </div>

        {/* Seller */}
        {deal.sellerName && (
          <p className="text-xs text-gray-500">
            {t.by} <span className="text-violet-600 font-medium">{deal.sellerName}</span>
          </p>
        )}

        {/* Countdown */}
        <div className="mt-auto">
          {expired ? (
            <div className="text-center text-xs text-rose-500 font-bold py-1">
              {t.expired}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1 bg-gray-50 rounded-xl p-2">
              {[
                days > 0 && [pad(days), t.days],
                [pad(hours), t.hours],
                [pad(mins), t.mins],
                [pad(secs), t.secs],
              ]
                .filter(Boolean)
                .map(([val, label], i) => (
                  <div key={i} className="flex items-center gap-0.5">
                    {i > 0 && <span className="text-violet-400 font-bold text-xs">:</span>}
                    <div className="flex flex-col items-center">
                      <span className="bg-violet-600 text-white text-xs font-mono font-bold rounded px-1.5 py-0.5 min-w-[1.6rem] text-center">
                        {val}
                      </span>
                      <span className="text-[9px] text-gray-400 mt-0.5">{label}</span>
                    </div>
                  </div>
                ))}
              <span className="text-xs text-gray-400 ms-1">{t.left}</span>
            </div>
          )}
        </div>

        {/* CTA */}
        {!expired && (
          <a
            href={`/ads/${deal.id}`}
            className="mt-2 block text-center bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold py-2 rounded-xl transition-colors"
          >
            {t.buy}
          </a>
        )}
      </div>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────
export default function FlashDealsBoard({ deals = [], lang = 'ar', className = '' }) {
  const t = T[lang];
  const isRTL = lang === 'ar';

  // Demo data when no deals prop provided
  const defaultDeals = Array.from({ length: 6 }, (_, i) => ({
    id: `demo-${i}`,
    title: ['آيفون ١٤ برو ماكس', 'لاب توب ديل XPS', 'تلفزيون سامسونج ٥٥"', 'كاميرا سوني A7III', 'عطر شانيل N°5', 'ساعة أبل Watch 9'][i],
    image: null,
    originalPrice: [25000, 35000, 8000, 18000, 3500, 12000][i],
    dealPrice: [18000, 27000, 5500, 13000, 2200, 8500][i],
    currency: 'EGP',
    category: ['إلكترونيات', 'حواسيب', 'إلكترونيات', 'كاميرات', 'عطور', 'ساعات'][i],
    endTime: new Date(Date.now() + (i + 1) * 3600000 * 4).toISOString(),
    sellerId: `seller-${i}`,
    sellerName: ['محمد أحمد', 'Tech Store', 'Galaxy Shop', 'CameraWorld', 'Parfum Elite', 'Watch Hub'][i],
  }));

  const allDeals = deals.length > 0 ? deals : defaultDeals;

  // Categories
  const categories = [t.all, ...new Set(allDeals.map((d) => d.category))];
  const [activeCategory, setActiveCategory] = useState(t.all);
  const [sortBy, setSortBy] = useState('discount');
  const [lang2, setLang2] = useState(lang);

  const t2 = T[lang2];
  const isRTL2 = lang2 === 'ar';

  const filtered = allDeals
    .filter((d) => activeCategory === t2.all || activeCategory === T[lang].all || d.category === activeCategory)
    .sort((a, b) => {
      if (sortBy === 'discount') {
        const da = (a.originalPrice - a.dealPrice) / a.originalPrice;
        const db = (b.originalPrice - b.dealPrice) / b.originalPrice;
        return db - da;
      }
      if (sortBy === 'time') return new Date(a.endTime) - new Date(b.endTime);
      return new Date(b.endTime) - new Date(a.endTime);
    });

  return (
    <div
      dir={isRTL2 ? 'rtl' : 'ltr'}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-white text-lg font-bold">{T[lang2].title}</h2>
        {/* Lang switcher */}
        <div className="flex gap-1">
          {['ar', 'en', 'de'].map((l) => (
            <button
              key={l}
              onClick={() => setLang2(l)}
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                lang2 === l ? 'bg-white text-violet-700' : 'bg-violet-500 text-white hover:bg-violet-400'
              }`}
            >
              {l === 'ar' ? 'ع' : l === 'en' ? 'EN' : 'DE'}
            </button>
          ))}
        </div>
      </div>

      {/* Sort + Filter bar */}
      <div className="px-4 py-3 border-b border-violet-50 space-y-2">
        {/* Sort */}
        <div className="flex gap-2 flex-wrap">
          {[
            ['discount', T[lang2].sortDiscount],
            ['time', T[lang2].sortTime],
            ['new', T[lang2].sortNew],
          ].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setSortBy(val)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                sortBy === val
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Category chips */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Deals grid */}
      <div className="p-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-2">⚡</div>
            <p>{T[lang2].noDeals}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((deal) => (
              <DealCard key={deal.id} deal={deal} lang={lang2} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
