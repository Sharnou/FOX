'use client';
/**
 * MarketInsightWidget.jsx
 * Market Intelligence Widget for XTOX Arab Marketplace
 * Shows category-level market data in Arabic-first RTL layout.
 *
 * Props:
 *   category  {string}  Default: 'إلكترونيات'
 *   country   {string}  Default: 'EG'
 *   lang      {string}  Default: 'ar'  ('ar' | 'en' | 'de')
 *   className {string}  Extra Tailwind classes
 */

import React, { useState, useMemo } from 'react';

// ─── Arabic-Indic numeral converter ───────────────────────────────────────────
const toArabicIndic = (n) =>
  String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const formatNum = (n, lang) =>
  lang === 'ar' ? toArabicIndic(n) : String(n);

// ─── Static mock data keyed by category ───────────────────────────────────────
const MARKET_DATA = {
  إلكترونيات: {
    avgPrice: { EG: 4200, SA: 850, AE: 900 },
    currency: { EG: 'ج.م', SA: 'ر.س', AE: 'د.إ' },
    trend: +8.3,
    activeListings: 14720,
    responseTime: 2.5,
    bestTimeToPost: {
      ar: 'الأحد مساءً — أعلى معدل مشاهدة',
      en: 'Sunday evening — highest visibility',
      de: 'Sonntagabend — höchste Sichtbarkeit',
    },
    demand: 3, // 0=Low 1=Medium 2=High 3=Very High
    priceRange: { min: 150, avg: 4200, max: 32000 },
    tips: {
      ar: [
        'أضف صوراً واضحة من زوايا متعددة لزيادة النقرات بنسبة ٧٠٪',
        'اذكر حالة الجهاز (جديد / مستعمل / مجدد) في العنوان مباشرةً',
        'انشر إعلانك بين ٨ مساءً و١٠ مساءً للحصول على أكبر تفاعل',
      ],
      en: [
        'Add clear multi-angle photos to increase clicks by 70%',
        'Mention device condition (new/used/refurb) directly in the title',
        'Post between 8 PM – 10 PM for maximum engagement',
      ],
      de: [
        'Füge klare Mehrwinkelfotos hinzu, um Klicks um 70 % zu steigern',
        'Gerätezustand (neu/gebraucht/aufgearbeitet) direkt im Titel erwähnen',
        'Zwischen 20:00 und 22:00 Uhr posten für maximales Engagement',
      ],
    },
  },
  سيارات: {
    avgPrice: { EG: 320000, SA: 55000, AE: 58000 },
    currency: { EG: 'ج.م', SA: 'ر.س', AE: 'د.إ' },
    trend: +3.1,
    activeListings: 8430,
    responseTime: 4.8,
    bestTimeToPost: {
      ar: 'الجمعة صباحاً — أعلى نسبة مشترين نشطين',
      en: 'Friday morning — most active buyers',
      de: 'Freitagmorgen — aktivste Käufer',
    },
    demand: 2,
    priceRange: { min: 15000, avg: 320000, max: 1200000 },
    tips: {
      ar: [
        'صوّر السيارة في ضوء النهار وضمّن صورة لوحة القيادة',
        'اذكر عدد الكيلومترات وتاريخ آخر صيانة في وصف الإعلان',
        'حدد سعرك على أساس متوسط السوق لجذب عروض أسرع',
      ],
      en: [
        'Photograph the car in daylight and include a dashboard photo',
        'Mention mileage and last service date in the description',
        'Price based on market average for faster offers',
      ],
      de: [
        'Auto bei Tageslicht fotografieren und Armaturenbrettfoto einschließen',
        'Kilometerstand und letztes Servicedatum in der Beschreibung angeben',
        'Preis am Marktdurchschnitt orientieren für schnellere Angebote',
      ],
    },
  },
  عقارات: {
    avgPrice: { EG: 2800000, SA: 480000, AE: 920000 },
    currency: { EG: 'ج.م', SA: 'ر.س', AE: 'د.إ' },
    trend: -1.4,
    activeListings: 5190,
    responseTime: 18,
    bestTimeToPost: {
      ar: 'الثلاثاء صباحاً — أعلى بحث من قِبَل المشترين الجادين',
      en: 'Tuesday morning — highest searches by serious buyers',
      de: 'Dienstagmorgen — höchste Suchen ernsthafter Käufer',
    },
    demand: 1,
    priceRange: { min: 250000, avg: 2800000, max: 12000000 },
    tips: {
      ar: [
        'أدرج مخطط الطابق ومساحة الوحدة بالمتر المربع لتمييز إعلانك',
        'صوّر في ساعات الذروة الضوئية وأبرز المطبخ والحمام',
        'فعّل الرد التلقائي للمهتمين — المشترون الجادون لا ينتظرون',
      ],
      en: [
        'Include floor plan and unit area in m² to stand out',
        'Shoot during golden hour and highlight kitchen and bathroom',
        'Enable auto-reply — serious buyers don\'t wait',
      ],
      de: [
        'Grundriss und Fläche in m² einschließen, um aufzufallen',
        'Während der goldenen Stunde fotografieren, Küche und Bad hervorheben',
        'Auto-Antwort aktivieren — ernsthafte Käufer warten nicht',
      ],
    },
  },
};

// ─── Label maps ───────────────────────────────────────────────────────────────
const LABELS = {
  ar: {
    title: 'رؤية السوق',
    subtitle: 'بيانات ذكاء السوق للفئة',
    avgPrice: 'متوسط السعر',
    trend: 'اتجاه السعر',
    listings: 'إعلان نشط',
    responseTime: 'وقت الاستجابة',
    hours: 'ساعة',
    bestTime: 'أفضل وقت للنشر',
    demand: 'مؤشر الطلب',
    demandLevels: ['منخفض', 'متوسط', 'مرتفع', 'مرتفع جداً'],
    priceRange: 'نطاق السعر',
    min: 'الأدنى',
    avg: 'المتوسط',
    max: 'الأعلى',
    tips: 'نصائح للبيع الأسرع',
    up: 'ارتفاع',
    down: 'انخفاض',
    langLabel: 'اللغة',
  },
  en: {
    title: 'Market Insight',
    subtitle: 'Category market intelligence data',
    avgPrice: 'Average Price',
    trend: 'Price Trend',
    listings: 'Active Listings',
    responseTime: 'Response Time',
    hours: 'hrs',
    bestTime: 'Best Time to Post',
    demand: 'Demand Indicator',
    demandLevels: ['Low', 'Medium', 'High', 'Very High'],
    priceRange: 'Price Range',
    min: 'Min',
    avg: 'Avg',
    max: 'Max',
    tips: 'Sell Faster Tips',
    up: '↑ Up',
    down: '↓ Down',
    langLabel: 'Language',
  },
  de: {
    title: 'Markteinblick',
    subtitle: 'Kategorie-Marktdaten',
    avgPrice: 'Durchschnittspreis',
    trend: 'Preistrend',
    listings: 'Aktive Anzeigen',
    responseTime: 'Antwortzeit',
    hours: 'Std.',
    bestTime: 'Beste Postingzeit',
    demand: 'Nachfrageindikator',
    demandLevels: ['Niedrig', 'Mittel', 'Hoch', 'Sehr hoch'],
    priceRange: 'Preisspanne',
    min: 'Min',
    avg: 'Durchschn.',
    max: 'Max',
    tips: 'Schneller verkaufen',
    up: '↑ Steigend',
    down: '↓ Fallend',
    langLabel: 'Sprache',
  },
};

const DEMAND_COLORS = [
  'bg-blue-300',
  'bg-yellow-400',
  'bg-orange-400',
  'bg-red-500',
];

const DEMAND_TEXT_COLORS = [
  'text-blue-700',
  'text-yellow-700',
  'text-orange-700',
  'text-red-700',
];

// ─── Sub-components ────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, icon }) => (
  <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col gap-1">
    <div className="flex items-center gap-1 text-gray-500 text-xs font-medium">
      <span>{icon}</span>
      <span>{label}</span>
    </div>
    <div className="text-gray-900 font-bold text-lg leading-tight">{value}</div>
    {sub && <div className="text-gray-400 text-xs">{sub}</div>}
  </div>
);

const DemandBar = ({ level, labels }) => (
  <div className="flex gap-1 items-center mt-1">
    {[0, 1, 2, 3].map((i) => (
      <div
        key={i}
        className={`h-3 flex-1 rounded-full transition-all duration-300 ${
          i <= level ? DEMAND_COLORS[level] : 'bg-gray-200'
        }`}
      />
    ))}
    <span className={`text-sm font-bold ms-2 ${DEMAND_TEXT_COLORS[level]}`}>
      {labels[level]}
    </span>
  </div>
);

const PriceRangeBar = ({ min, avg, max, currency, lang }) => {
  const pct = ((avg - min) / (max - min)) * 100;
  const fmt = (n) =>
    lang === 'ar'
      ? toArabicIndic(n.toLocaleString('ar-EG'))
      : n.toLocaleString('en-US');
  return (
    <div className="mt-2">
      <div className="relative h-3 bg-gray-200 rounded-full">
        <div
          className="absolute top-0 start-0 h-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow"
          style={{ left: `calc(${pct}% - 8px)` }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-500">
        <span>{fmt(min)} {currency}</span>
        <span className="font-semibold text-indigo-700">{fmt(avg)} {currency}</span>
        <span>{fmt(max)} {currency}</span>
      </div>
    </div>
  );
};

const TipItem = ({ index, tip, lang }) => (
  <li className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-0">
    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">
      {formatNum(index + 1, lang)}
    </span>
    <span className="text-gray-700 text-sm leading-snug">{tip}</span>
  </li>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const MarketInsightWidget = ({
  category = 'إلكترونيات',
  country = 'EG',
  lang: initialLang = 'ar',
  className = '',
}) => {
  const [lang, setLang] = useState(initialLang);

  const data = useMemo(
    () => MARKET_DATA[category] || MARKET_DATA['إلكترونيات'],
    [category]
  );

  const L = LABELS[lang] || LABELS['ar'];
  const isRtl = lang === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';

  const currency = data.currency[country] || data.currency['EG'];
  const avgPrice = data.avgPrice[country] || data.avgPrice['EG'];
  const { trend, activeListings, responseTime, demand, priceRange } = data;

  const fmtPrice = (n) =>
    lang === 'ar'
      ? toArabicIndic(n.toLocaleString('ar-EG'))
      : n.toLocaleString('en-US');

  const fmtListings = (n) =>
    lang === 'ar' ? toArabicIndic(n.toLocaleString('ar-EG')) : n.toLocaleString('en-US');

  const trendPositive = trend >= 0;
  const trendDisplay =
    lang === 'ar'
      ? `${trendPositive ? '▲' : '▼'} ${toArabicIndic(Math.abs(trend).toFixed(1))}٪`
      : `${trendPositive ? '▲' : '▼'} ${Math.abs(trend).toFixed(1)}%`;

  const tips = data.tips[lang] || data.tips['ar'];

  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700&display=swap');
        .miw-font { font-family: ${isRtl ? "'Cairo', 'Tajawal'" : "'Cairo', sans-serif"}, system-ui, sans-serif; }
      `}</style>

      <div
        dir={dir}
        className={`miw-font w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-gray-200 ${className}`}
      >
        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-white text-xl font-extrabold tracking-tight">{L.title}</h2>
            <p className="text-blue-200 text-xs mt-0.5">{L.subtitle}</p>
          </div>
          <div className="flex items-center gap-1 bg-white/15 rounded-full px-3 py-1">
            {['ar', 'en', 'de'].map((code) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={`text-xs font-bold px-2 py-0.5 rounded-full transition-all duration-200 ${
                  lang === code
                    ? 'bg-white text-indigo-700 shadow'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ── Category Badge ── */}
        <div className="bg-indigo-50 px-5 py-2 flex items-center gap-2 border-b border-indigo-100">
          <span className="text-indigo-600 text-lg">🏷️</span>
          <span className="text-indigo-800 font-bold text-sm">{category}</span>
          <span className="ms-auto text-xs bg-indigo-100 text-indigo-600 rounded-full px-2 py-0.5 font-medium">
            {country}
          </span>
        </div>

        <div className="bg-gray-50 px-4 py-4 flex flex-col gap-4">

          {/* ── Stat Grid ── */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label={L.avgPrice}
              value={`${fmtPrice(avgPrice)} ${currency}`}
              icon="💰"
            />
            <StatCard
              label={L.trend}
              value={trendDisplay}
              sub={trendPositive ? L.up : L.down}
              icon={trendPositive ? '📈' : '📉'}
            />
            <StatCard
              label={L.listings}
              value={fmtListings(activeListings)}
              icon="📋"
            />
            <StatCard
              label={L.responseTime}
              value={`${formatNum(responseTime, lang)} ${L.hours}`}
              icon="⏱️"
            />
          </div>

          {/* ── Best Time to Post ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-2xl flex-shrink-0 mt-0.5">📅</span>
            <div>
              <div className="text-amber-800 font-bold text-sm mb-0.5">{L.bestTime}</div>
              <div className="text-amber-700 text-sm">{data.bestTimeToPost[lang] || data.bestTimeToPost['ar']}</div>
            </div>
          </div>

          {/* ── Demand Indicator ── */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-600 text-sm font-semibold mb-2 flex items-center gap-1">
              <span>📊</span>
              <span>{L.demand}</span>
            </div>
            <DemandBar level={demand} labels={L.demandLevels} />
          </div>

          {/* ── Price Range ── */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-600 text-sm font-semibold mb-2 flex items-center gap-1">
              <span>📏</span>
              <span>{L.priceRange}</span>
            </div>
            <PriceRangeBar
              min={priceRange.min}
              avg={avgPrice}
              max={priceRange.max}
              currency={currency}
              lang={lang}
            />
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>{L.min}</span>
              <span className="font-semibold text-indigo-600">{L.avg}</span>
              <span>{L.max}</span>
            </div>
          </div>

          {/* ── Sell Faster Tips ── */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="text-gray-700 font-bold text-sm mb-2 flex items-center gap-1">
              <span>⚡</span>
              <span>{L.tips}</span>
            </div>
            <ul className="flex flex-col">
              {tips.map((tip, i) => (
                <TipItem key={i} index={i} tip={tip} lang={lang} />
              ))}
            </ul>
          </div>

          {/* ── Footer ── */}
          <div className="text-center text-gray-400 text-xs pb-1">
            {lang === 'ar'
              ? 'البيانات تقديرية بناءً على نشاط السوق · XTOX Marketplace'
              : lang === 'de'
              ? 'Daten sind Schätzungen basierend auf Marktaktivität · XTOX Marketplace'
              : 'Data is estimated based on market activity · XTOX Marketplace'}
          </div>

        </div>
      </div>
    </>
  );
};

export default MarketInsightWidget;
