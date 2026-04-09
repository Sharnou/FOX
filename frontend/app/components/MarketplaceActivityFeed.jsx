'use client';
/**
 * MarketplaceActivityFeed — Real-time marketplace activity ticker
 * Shows recent activity: new ads, price drops, sales, trending searches
 * Supports: Arabic (RTL) | English (LTR) | German (LTR)
 * Uses: Cairo/Tajawal fonts, Tailwind CSS, Arabic-Indic numerals
 * Zero external dependencies — self-contained functional component
 */

import { useState, useEffect, useRef, useCallback } from "react";

// ─── Arabic-Indic numeral conversion ──────────────────────────────────────
const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

// ─── i18n strings ─────────────────────────────────────────────────────────
const t = {
  ar: {
    dir: "rtl",
    font: "'Tajawal', 'Cairo', sans-serif",
    title: "نشاط السوق",
    subtitle: "آخر الأحداث الآن",
    new: "إعلان جديد",
    priceDrop: "انخفاض السعر",
    sold: "تم البيع",
    trending: "الأكثر بحثاً",
    ago: "منذ",
    minutes: "دقيقة",
    seconds: "ثانية",
    hours: "ساعة",
    currency: "ر.س",
    viewAll: "عرض الكل",
    liveNow: "مباشر الآن",
    pauseLabel: "إيقاف مؤقت",
    resumeLabel: "استئناف",
    noActivity: "لا يوجد نشاط حتى الآن",
  },
  en: {
    dir: "ltr",
    font: "'Cairo', sans-serif",
    title: "Market Activity",
    subtitle: "What's happening now",
    new: "New Listing",
    priceDrop: "Price Drop",
    sold: "Sold",
    trending: "Trending",
    ago: "",
    minutes: "min ago",
    seconds: "sec ago",
    hours: "hr ago",
    currency: "SAR",
    viewAll: "View All",
    liveNow: "Live Now",
    pauseLabel: "Pause",
    resumeLabel: "Resume",
    noActivity: "No activity yet",
  },
  de: {
    dir: "ltr",
    font: "'Cairo', sans-serif",
    title: "Marktaktivität",
    subtitle: "Was gerade passiert",
    new: "Neu",
    priceDrop: "Preissenkung",
    sold: "Verkauft",
    trending: "Trending",
    ago: "vor",
    minutes: "Min.",
    seconds: "Sek.",
    hours: "Std.",
    currency: "SAR",
    viewAll: "Alle anzeigen",
    liveNow: "Live",
    pauseLabel: "Pause",
    resumeLabel: "Fortsetzen",
    noActivity: "Noch keine Aktivität",
  },
};

// ─── Sample activity data ──────────────────────────────────────────────────
const SAMPLE_ACTIVITIES = [
  {
    id: 1,
    type: "new",
    title: { ar: "آيفون ١٥ برو ماكس - حالة ممتازة", en: "iPhone 15 Pro Max - Excellent Condition", de: "iPhone 15 Pro Max - Ausgezeichneter Zustand" },
    price: 3200,
    location: { ar: "الرياض", en: "Riyadh", de: "Riad" },
    category: { ar: "هواتف", en: "Phones", de: "Handys" },
    timestamp: 45,
    unit: "seconds",
    color: "emerald",
    icon: "✨",
  },
  {
    id: 2,
    type: "priceDrop",
    title: { ar: "سيارة تويوتا كامري ٢٠٢٢", en: "Toyota Camry 2022", de: "Toyota Camry 2022" },
    oldPrice: 95000,
    price: 82000,
    location: { ar: "جدة", en: "Jeddah", de: "Dschidda" },
    category: { ar: "سيارات", en: "Cars", de: "Autos" },
    timestamp: 3,
    unit: "minutes",
    color: "amber",
    icon: "📉",
  },
  {
    id: 3,
    type: "sold",
    title: { ar: "شقة ٣ غرف - حي النرجس", en: "3-Room Apartment - Al-Narjis", de: "3-Zimmer-Wohnung - Al-Narjis" },
    price: 850000,
    location: { ar: "الرياض", en: "Riyadh", de: "Riad" },
    category: { ar: "عقارات", en: "Real Estate", de: "Immobilien" },
    timestamp: 8,
    unit: "minutes",
    color: "rose",
    icon: "🏠",
  },
  {
    id: 4,
    type: "trending",
    title: { ar: "لابتوب ماك بوك برو", en: "MacBook Pro", de: "MacBook Pro" },
    price: null,
    location: null,
    category: { ar: "إلكترونيات", en: "Electronics", de: "Elektronik" },
    timestamp: 1,
    unit: "hours",
    color: "violet",
    icon: "🔥",
  },
  {
    id: 5,
    type: "new",
    title: { ar: "دراجة نارية هوندا CB500 موديل ٢٠٢٣", en: "Honda CB500 Motorcycle 2023", de: "Honda CB500 Motorrad 2023" },
    price: 18500,
    location: { ar: "الدمام", en: "Dammam", de: "Dammam" },
    category: { ar: "مركبات", en: "Vehicles", de: "Fahrzeuge" },
    timestamp: 12,
    unit: "minutes",
    color: "emerald",
    icon: "🏍️",
  },
  {
    id: 6,
    type: "priceDrop",
    title: { ar: "تلفزيون سامسونج ٧٥ بوصة QLED", en: "Samsung 75\" QLED TV", de: "Samsung 75\" QLED TV" },
    oldPrice: 7800,
    price: 5999,
    location: { ar: "أبوظبي", en: "Abu Dhabi", de: "Abu Dhabi" },
    category: { ar: "إلكترونيات", en: "Electronics", de: "Elektronik" },
    timestamp: 20,
    unit: "minutes",
    color: "amber",
    icon: "📺",
  },
  {
    id: 7,
    type: "sold",
    title: { ar: "كاميرا كانون EOS R5", en: "Canon EOS R5 Camera", de: "Canon EOS R5 Kamera" },
    price: 12000,
    location: { ar: "الكويت", en: "Kuwait", de: "Kuwait" },
    category: { ar: "كاميرات", en: "Cameras", de: "Kameras" },
    timestamp: 35,
    unit: "minutes",
    color: "rose",
    icon: "📷",
  },
  {
    id: 8,
    type: "trending",
    title: { ar: "شاليه للإيجار اليومي", en: "Chalet Daily Rental", de: "Ferienhaus Tagesmiete" },
    price: null,
    location: null,
    category: { ar: "عقارات", en: "Real Estate", de: "Immobilien" },
    timestamp: 2,
    unit: "hours",
    color: "violet",
    icon: "🏖️",
  },
];

// ─── Color map ─────────────────────────────────────────────────────────────
const COLOR_MAP = {
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    dot: "bg-emerald-500",
    text: "text-emerald-600",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
    text: "text-amber-600",
  },
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    badge: "bg-rose-100 text-rose-700",
    dot: "bg-rose-500",
    text: "text-rose-600",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-700",
    dot: "bg-violet-500",
    text: "text-violet-600",
  },
};

// ─── Utility: format timestamp ─────────────────────────────────────────────
const formatTime = (timestamp, unit, lang) => {
  const L = t[lang];
  const num = lang === "ar" ? toArabicIndic(timestamp) : timestamp;
  if (unit === "seconds") {
    if (lang === "ar") return `${L.ago} ${num} ${L.seconds}`;
    if (lang === "de") return `${L.ago} ${num} ${L.seconds}`;
    return `${num} ${L.seconds}`;
  }
  if (unit === "minutes") {
    if (lang === "ar") return `${L.ago} ${num} ${L.minutes}`;
    if (lang === "de") return `${L.ago} ${num} ${L.minutes}`;
    return `${num} ${L.minutes}`;
  }
  if (unit === "hours") {
    if (lang === "ar") return `${L.ago} ${num} ${L.hours}`;
    if (lang === "de") return `${L.ago} ${num} ${L.hours}`;
    return `${num} ${L.hours}`;
  }
  return "";
};

// ─── Utility: format price ─────────────────────────────────────────────────
const formatPrice = (price, lang, currency) => {
  if (!price && price !== 0) return null;
  const num = lang === "ar"
    ? toArabicIndic(price.toLocaleString("ar-SA"))
    : price.toLocaleString("en-US");
  return lang === "ar" ? `${num} ${currency}` : `${currency} ${num}`;
};

// ─── Activity Card ─────────────────────────────────────────────────────────
const ActivityCard = ({ activity, lang, isNew }) => {
  const L = t[lang];
  const c = COLOR_MAP[activity.color];
  const typeLabel = {
    new: L.new,
    priceDrop: L.priceDrop,
    sold: L.sold,
    trending: L.trending,
  }[activity.type];

  return (
    <div
      dir={L.dir}
      className={`
        flex items-start gap-3 p-3 rounded-xl border
        ${c.bg} ${c.border}
        transition-all duration-500
        ${isNew ? "animate-pulse" : ""}
      `}
      style={{ fontFamily: L.font, animationDuration: "1.5s", animationIterationCount: "2" }}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center text-lg">
        {activity.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className={`flex items-center gap-2 flex-wrap mb-1 ${L.dir === "rtl" ? "flex-row-reverse justify-end" : ""}`}>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
            {typeLabel}
          </span>
          {activity.category && (
            <span className="text-xs text-gray-400 font-medium">
              {activity.category[lang] || activity.category.en}
            </span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-semibold text-gray-800 truncate leading-snug">
          {activity.title[lang] || activity.title.en}
        </p>

        {/* Price row */}
        {activity.type === "priceDrop" && activity.oldPrice && (
          <div className={`flex items-center gap-2 mt-1 ${L.dir === "rtl" ? "flex-row-reverse" : ""}`}>
            <span className="text-xs text-gray-400 line-through">
              {formatPrice(activity.oldPrice, lang, L.currency)}
            </span>
            <span className={`text-sm font-bold ${c.text}`}>
              {formatPrice(activity.price, lang, L.currency)}
            </span>
            <span className="text-xs bg-amber-500 text-white px-1.5 py-0.5 rounded font-bold">
              {lang === "ar"
                ? `-${toArabicIndic(Math.round(((activity.oldPrice - activity.price) / activity.oldPrice) * 100))}٪`
                : `-${Math.round(((activity.oldPrice - activity.price) / activity.oldPrice) * 100)}%`}
            </span>
          </div>
        )}
        {activity.type !== "priceDrop" && activity.price && (
          <p className={`text-sm font-bold mt-0.5 ${c.text}`}>
            {formatPrice(activity.price, lang, L.currency)}
          </p>
        )}

        {/* Footer */}
        <div className={`flex items-center gap-2 mt-1.5 ${L.dir === "rtl" ? "flex-row-reverse" : ""}`}>
          {activity.location && (
            <span className="text-xs text-gray-400 flex items-center gap-0.5">
              <span>📍</span>
              {activity.location[lang] || activity.location.en}
            </span>
          )}
          <span className="text-xs text-gray-400">
            {formatTime(activity.timestamp, activity.unit, lang)}
          </span>
        </div>
      </div>

      {/* Live dot */}
      <div className="flex-shrink-0 mt-1">
        <span className={`block w-2 h-2 rounded-full ${c.dot} ${isNew ? "animate-ping" : ""}`} />
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────
export default function MarketplaceActivityFeed({ lang = "ar", maxItems = 6, autoPlay = true }) {
  const [language, setLanguage] = useState(lang);
  const [activities, setActivities] = useState(SAMPLE_ACTIVITIES.slice(0, maxItems));
  const [newItemId, setNewItemId] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const intervalRef = useRef(null);
  const counterRef = useRef(SAMPLE_ACTIVITIES.length);

  const L = t[language];

  // Simulate new activity arriving
  const addNewActivity = useCallback(() => {
    const templates = [
      {
        type: "new",
        color: "emerald",
        icon: "🛒",
        title: { ar: "منتج جديد في السوق", en: "New product listed", de: "Neues Produkt gelistet" },
        price: Math.floor(Math.random() * 5000) + 100,
        location: { ar: "الرياض", en: "Riyadh", de: "Riad" },
        category: { ar: "متفرقات", en: "Misc", de: "Sonstiges" },
        timestamp: Math.floor(Math.random() * 59) + 1,
        unit: "seconds",
      },
      {
        type: "priceDrop",
        color: "amber",
        icon: "⬇️",
        title: { ar: "تخفيض سعر حصري", en: "Exclusive price drop", de: "Exklusiver Preisverfall" },
        oldPrice: 2000,
        price: Math.floor(Math.random() * 800) + 1000,
        location: { ar: "جدة", en: "Jeddah", de: "Dschidda" },
        category: { ar: "إلكترونيات", en: "Electronics", de: "Elektronik" },
        timestamp: Math.floor(Math.random() * 5) + 1,
        unit: "minutes",
      },
      {
        type: "sold",
        color: "rose",
        icon: "✅",
        title: { ar: "تمت الصفقة بنجاح", en: "Deal completed successfully", de: "Deal erfolgreich abgeschlossen" },
        price: Math.floor(Math.random() * 10000) + 500,
        location: { ar: "المدينة المنورة", en: "Medina", de: "Medina" },
        category: { ar: "متفرقات", en: "Misc", de: "Sonstiges" },
        timestamp: Math.floor(Math.random() * 30) + 5,
        unit: "minutes",
      },
    ];
    const template = templates[Math.floor(Math.random() * templates.length)];
    const newItem = { ...template, id: ++counterRef.current };
    setActivities((prev) => [newItem, ...prev.slice(0, maxItems - 1)]);
    setNewItemId(newItem.id);
    setTimeout(() => setNewItemId(null), 3000);
  }, [maxItems]);

  useEffect(() => {
    if (!autoPlay || isPaused) return;
    intervalRef.current = setInterval(addNewActivity, 4500);
    return () => clearInterval(intervalRef.current);
  }, [autoPlay, isPaused, addNewActivity]);

  const displayedActivities = isExpanded ? activities : activities.slice(0, 4);

  return (
    <>
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Cairo:wght@400;600;700;800&display=swap"
        rel="stylesheet"
      />

      <div
        dir={L.dir}
        className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        style={{ fontFamily: L.font }}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-3">
          <div className={`flex items-center justify-between ${L.dir === "rtl" ? "flex-row-reverse" : ""}`}>
            {/* Title */}
            <div className={`flex items-center gap-2 ${L.dir === "rtl" ? "flex-row-reverse" : ""}`}>
              <div className="relative">
                <span className="block w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                <span className="absolute inset-0 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping opacity-75" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base leading-tight">{L.title}</h2>
                <p className="text-slate-300 text-xs">{L.subtitle}</p>
              </div>
            </div>

            {/* Language switcher + controls */}
            <div className={`flex items-center gap-2 ${L.dir === "rtl" ? "flex-row-reverse" : ""}`}>
              {/* Language pills */}
              <div className="flex gap-1">
                {["ar", "en", "de"].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
                      language === l
                        ? "bg-white text-slate-800"
                        : "bg-slate-600 text-slate-300 hover:bg-slate-500"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Pause/Resume */}
              {autoPlay && (
                <button
                  onClick={() => setIsPaused((p) => !p)}
                  title={isPaused ? L.resumeLabel : L.pauseLabel}
                  className="text-slate-300 hover:text-white transition-colors text-sm"
                >
                  {isPaused ? "▶" : "⏸"}
                </button>
              )}
            </div>
          </div>

          {/* Live badge */}
          <div className={`mt-2 flex items-center gap-1.5 ${L.dir === "rtl" ? "justify-end" : ""}`}>
            <span className="inline-flex items-center gap-1 bg-emerald-500 bg-opacity-20 border border-emerald-400 border-opacity-40 text-emerald-300 text-xs font-semibold px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              {L.liveNow}
            </span>
            <span className="text-slate-400 text-xs">
              {language === "ar"
                ? `${toArabicIndic(activities.length)} نشاط`
                : language === "de"
                ? `${activities.length} Aktivitäten`
                : `${activities.length} activities`}
            </span>
          </div>
        </div>

        {/* ── Activity List ───────────────────────────────────────────── */}
        <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
          {displayedActivities.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">{L.noActivity}</div>
          ) : (
            displayedActivities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                lang={language}
                isNew={activity.id === newItemId}
              />
            ))
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        {activities.length > 4 && (
          <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50">
            <button
              onClick={() => setIsExpanded((e) => !e)}
              className={`w-full text-center text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors flex items-center justify-center gap-1.5 ${
                L.dir === "rtl" ? "flex-row-reverse" : ""
              }`}
            >
              {isExpanded
                ? (language === "ar" ? "عرض أقل ▲" : language === "de" ? "Weniger ▲" : "Show Less ▲")
                : `${L.viewAll} ▼`}
            </button>
          </div>
        )}

        {/* ── Ticker bar ─────────────────────────────────────────────── */}
        <div className="bg-slate-800 overflow-hidden py-1.5 px-4">
          <div
            className={`flex items-center gap-6 text-xs text-slate-300 whitespace-nowrap animate-marquee ${
              L.dir === "rtl" ? "flex-row-reverse" : ""
            }`}
            style={{
              animation: "marquee 18s linear infinite",
              direction: L.dir,
            }}
          >
            {activities.map((a) => (
              <span key={a.id} className="flex items-center gap-1.5">
                <span>{a.icon}</span>
                <span className="text-slate-200 font-medium">
                  {a.title[language] || a.title.en}
                </span>
                {a.price && (
                  <span className="text-emerald-400">
                    {formatPrice(a.price, language, t[language].currency)}
                  </span>
                )}
                <span className="text-slate-500 mx-2">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Keyframe animation ───────────────────────────────────────── */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}
