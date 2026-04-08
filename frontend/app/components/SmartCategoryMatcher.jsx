"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";

// ============================================================
// SmartCategoryMatcher
// AI-style client-side category suggestion widget for XTOX marketplace
// Helps sellers find the right category by typing their item description
// Arabic-first, RTL, Tailwind CSS only, zero external dependencies
// Supports AR / EN / DE with Arabic-Indic numerals in Arabic mode
// ============================================================

const LANG = {
  ar: {
    dir: "rtl",
    title: "مطابق الفئة الذكي",
    subtitle: "اكتب اسم منتجك وسنقترح الفئة المناسبة تلقائياً",
    placeholder: "مثال: آيفون ١٤ برو، سيارة تويوتا، شقة للإيجار...",
    suggestions: "الفئات المقترحة",
    confidence: "درجة التطابق",
    select: "اختر هذه الفئة",
    selected: "✓ تم الاختيار",
    noResults: "لم نجد فئة مطابقة. جرب وصفاً آخر.",
    typeToSearch: "ابدأ بكتابة وصف المنتج للحصول على اقتراحات...",
    subcategory: "التصنيف الفرعي",
    category: "الفئة",
    tips: "نصائح للبحث",
    tip1: "اكتب اسم المنتج باللغة العربية أو الإنجليزية",
    tip2: "أضف الماركة أو الموديل لنتائج أدق",
    tip3: "ذكر الحالة (جديد/مستعمل) يساعد في التصنيف",
    matchedKeywords: "كلمات مطابقة",
    clearSearch: "مسح البحث",
    searchLabel: "أدخل وصف المنتج",
    allCategories: "جميع الفئات",
    browse: "تصفح الفئات",
    popular: "الفئات الشائعة",
  },
  en: {
    dir: "ltr",
    title: "Smart Category Matcher",
    subtitle: "Type your item description and we'll suggest the right category automatically",
    placeholder: "e.g. iPhone 14 Pro, Toyota Corolla, apartment for rent...",
    suggestions: "Suggested Categories",
    confidence: "Match Score",
    select: "Select this Category",
    selected: "✓ Selected",
    noResults: "No matching category found. Try a different description.",
    typeToSearch: "Start typing your item description to get suggestions...",
    subcategory: "Subcategory",
    category: "Category",
    tips: "Search Tips",
    tip1: "Type product name in Arabic or English",
    tip2: "Add brand or model for more precise results",
    tip3: "Mention condition (new/used) to help classification",
    matchedKeywords: "Matched Keywords",
    clearSearch: "Clear Search",
    searchLabel: "Enter item description",
    allCategories: "All Categories",
    browse: "Browse Categories",
    popular: "Popular Categories",
  },
  de: {
    dir: "ltr",
    title: "Intelligenter Kategorie-Matcher",
    subtitle: "Tippen Sie Ihre Artikelbeschreibung ein und wir schlagen die richtige Kategorie vor",
    placeholder: "z.B. iPhone 14 Pro, Toyota Corolla, Wohnung zur Miete...",
    suggestions: "Vorgeschlagene Kategorien",
    confidence: "Übereinstimmungsgrad",
    select: "Diese Kategorie wählen",
    selected: "✓ Ausgewählt",
    noResults: "Keine passende Kategorie gefunden. Versuchen Sie eine andere Beschreibung.",
    typeToSearch: "Beginnen Sie mit der Eingabe einer Artikelbeschreibung...",
    subcategory: "Unterkategorie",
    category: "Kategorie",
    tips: "Suchtipps",
    tip1: "Produktname auf Arabisch oder Englisch eingeben",
    tip2: "Marke oder Modell für genauere Ergebnisse hinzufügen",
    tip3: "Zustand (neu/gebraucht) hilft bei der Klassifizierung",
    matchedKeywords: "Übereinstimmende Schlüsselwörter",
    clearSearch: "Suche löschen",
    searchLabel: "Artikelbeschreibung eingeben",
    allCategories: "Alle Kategorien",
    browse: "Kategorien durchsuchen",
    popular: "Beliebte Kategorien",
  },
};

// Arabic-Indic numeral converter
const toArabicIndic = (num) => {
  return String(num).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
};

// Format percentage with language-aware numerals
const formatPercent = (val, lang) => {
  const pct = Math.round(val * 100);
  return lang === "ar" ? `${toArabicIndic(pct)}٪` : `${pct}%`;
};

// Category database with Arabic and English keywords
const CATEGORIES = [
  {
    id: "electronics",
    icon: "📱",
    color: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
    border: "border-blue-200",
    names: { ar: "إلكترونيات", en: "Electronics", de: "Elektronik" },
    subcategories: [
      {
        id: "phones",
        names: { ar: "هواتف ذكية", en: "Smartphones", de: "Smartphones" },
        keywords: ["هاتف", "موبايل", "جوال", "آيفون", "سامسونج", "شاومي", "هواوي", "أوبو", "ريلمي",
          "phone", "mobile", "iphone", "samsung", "xiaomi", "huawei", "oppo", "realme", "android",
          "smartphone", "handy", "telefon"],
      },
      {
        id: "laptops",
        names: { ar: "لابتوب وحاسوب", en: "Laptops & Computers", de: "Laptops & Computer" },
        keywords: ["لابتوب", "حاسوب", "كمبيوتر", "ماك بوك", "ديل", "لينوفو", "اتش بي",
          "laptop", "computer", "macbook", "dell", "lenovo", "hp", "asus", "acer", "pc",
          "notebook", "rechner"],
      },
      {
        id: "tablets",
        names: { ar: "أجهزة لوحية", en: "Tablets", de: "Tablets" },
        keywords: ["تابلت", "آيباد", "لوحي", "سامسونج تاب",
          "tablet", "ipad", "tab", "kindle"],
      },
      {
        id: "tvs",
        names: { ar: "تلفزيونات وشاشات", en: "TVs & Monitors", de: "Fernseher & Monitore" },
        keywords: ["تلفزيون", "شاشة", "تلفاز", "سمارت تيفي", "ال جي", "سوني", "سامسونج",
          "tv", "television", "monitor", "screen", "lg", "sony", "oled", "qled",
          "fernseher", "bildschirm"],
      },
    ],
  },
  {
    id: "cars",
    icon: "🚗",
    color: "from-red-500 to-orange-500",
    bg: "bg-red-50",
    border: "border-red-200",
    names: { ar: "سيارات", en: "Cars & Vehicles", de: "Autos & Fahrzeuge" },
    subcategories: [
      {
        id: "used_cars",
        names: { ar: "سيارات مستعملة", en: "Used Cars", de: "Gebrauchtwagen" },
        keywords: ["سيارة", "مركبة", "تويوتا", "نيسان", "هوندا", "كيا", "هيونداي", "بي إم دبليو", "مرسيدس",
          "car", "vehicle", "toyota", "nissan", "honda", "kia", "hyundai", "bmw", "mercedes", "audi",
          "auto", "wagen", "fahrzeug"],
      },
      {
        id: "motorcycles",
        names: { ar: "دراجات نارية", en: "Motorcycles", de: "Motorräder" },
        keywords: ["دراجة نارية", "موتو", "موتوسيكل",
          "motorcycle", "motorbike", "moto", "motorrad"],
      },
    ],
  },
  {
    id: "real_estate",
    icon: "🏠",
    color: "from-green-500 to-teal-500",
    bg: "bg-green-50",
    border: "border-green-200",
    names: { ar: "عقارات", en: "Real Estate", de: "Immobilien" },
    subcategories: [
      {
        id: "apartments",
        names: { ar: "شقق", en: "Apartments", de: "Wohnungen" },
        keywords: ["شقة", "للإيجار", "للبيع", "غرفة", "صالة", "سكن", "مسكن",
          "apartment", "flat", "rent", "sale", "room", "studio",
          "wohnung", "miete", "zimmer"],
      },
      {
        id: "villas",
        names: { ar: "فلل وبيوت", en: "Villas & Houses", de: "Villen & Häuser" },
        keywords: ["فيلا", "بيت", "منزل", "دوبلكس", "قصر",
          "villa", "house", "home", "duplex",
          "haus", "villa"],
      },
      {
        id: "lands",
        names: { ar: "أراضي", en: "Lands & Plots", de: "Grundstücke" },
        keywords: ["أرض", "قطعة أرض", "مزرعة",
          "land", "plot", "farm", "grundstück"],
      },
    ],
  },
  {
    id: "fashion",
    icon: "👗",
    color: "from-pink-500 to-rose-500",
    bg: "bg-pink-50",
    border: "border-pink-200",
    names: { ar: "أزياء وملابس", en: "Fashion & Clothing", de: "Mode & Kleidung" },
    subcategories: [
      {
        id: "mens",
        names: { ar: "ملابس رجالية", en: "Men's Clothing", de: "Herrenkleidung" },
        keywords: ["ثوب", "غترة", "بشت", "كندورة", "بنطال", "قميص", "رجالي",
          "shirt", "pants", "suit", "jacket", "men", "male",
          "hemd", "hose", "herren"],
      },
      {
        id: "womens",
        names: { ar: "ملابس نسائية", en: "Women's Clothing", de: "Damenkleidung" },
        keywords: ["عباية", "حجاب", "فستان", "بلوزة", "نسائي",
          "dress", "abaya", "hijab", "blouse", "women", "female",
          "kleid", "damen"],
      },
      {
        id: "shoes",
        names: { ar: "أحذية وشنط", en: "Shoes & Bags", de: "Schuhe & Taschen" },
        keywords: ["حذاء", "شنطة", "حقيبة", "نعال",
          "shoes", "bag", "purse", "sandals", "sneakers",
          "schuhe", "tasche"],
      },
    ],
  },
  {
    id: "home",
    icon: "🛋️",
    color: "from-yellow-500 to-amber-500",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    names: { ar: "أثاث ومنزل", en: "Furniture & Home", de: "Möbel & Haushalt" },
    subcategories: [
      {
        id: "furniture",
        names: { ar: "أثاث", en: "Furniture", de: "Möbel" },
        keywords: ["كنب", "سرير", "طاولة", "كرسي", "خزانة", "أثاث", "غرفة نوم", "صالة",
          "sofa", "bed", "table", "chair", "cabinet", "furniture", "bedroom",
          "sofa", "bett", "tisch", "stuhl", "möbel"],
      },
      {
        id: "appliances",
        names: { ar: "أجهزة منزلية", en: "Home Appliances", de: "Haushaltsgeräte" },
        keywords: ["ثلاجة", "غسالة", "مكيف", "بوتاجاز", "فرن", "مكنسة",
          "fridge", "washer", "air conditioner", "oven", "vacuum",
          "kühlschrank", "waschmaschine", "klimaanlage"],
      },
    ],
  },
  {
    id: "jobs",
    icon: "💼",
    color: "from-purple-500 to-violet-500",
    bg: "bg-purple-50",
    border: "border-purple-200",
    names: { ar: "وظائف", en: "Jobs", de: "Jobs" },
    subcategories: [
      {
        id: "full_time",
        names: { ar: "دوام كامل", en: "Full-time Jobs", de: "Vollzeitstellen" },
        keywords: ["وظيفة", "عمل", "مهنة", "راتب", "توظيف",
          "job", "work", "career", "salary", "employment", "hire",
          "stelle", "arbeit", "beruf"],
      },
      {
        id: "freelance",
        names: { ar: "عمل حر", en: "Freelance", de: "Freiberuflich" },
        keywords: ["فريلانس", "مستقل", "مشروع",
          "freelance", "freelancer", "project", "remote",
          "freiberuflich", "projekt"],
      },
    ],
  },
  {
    id: "services",
    icon: "🔧",
    color: "from-slate-500 to-gray-600",
    bg: "bg-slate-50",
    border: "border-slate-200",
    names: { ar: "خدمات", en: "Services", de: "Dienstleistungen" },
    subcategories: [
      {
        id: "repair",
        names: { ar: "صيانة وإصلاح", en: "Repair & Maintenance", de: "Reparatur & Wartung" },
        keywords: ["صيانة", "إصلاح", "تصليح", "فني",
          "repair", "fix", "maintenance", "technician",
          "reparatur", "wartung", "techniker"],
      },
      {
        id: "cleaning",
        names: { ar: "تنظيف", en: "Cleaning", de: "Reinigung" },
        keywords: ["تنظيف", "نظافة", "خادمة",
          "cleaning", "clean", "housekeeping",
          "reinigung", "putzen"],
      },
    ],
  },
];

// Scoring function
function scoreCategory(query, category, subcategory) {
  if (!query.trim()) return 0;
  const q = query.toLowerCase();
  const words = q.split(/\s+/);
  let matchCount = 0;
  const matched = [];
  for (const kw of subcategory.keywords) {
    const kwLower = kw.toLowerCase();
    if (words.some((w) => kwLower.includes(w) || w.includes(kwLower))) {
      matchCount++;
      matched.push(kw);
    }
  }
  const score = matchCount / Math.max(subcategory.keywords.length, 1);
  return { score: Math.min(score * 2.5, 1), matched };
}

// Popular categories shown before user types
const POPULAR = ["electronics", "cars", "real_estate", "fashion"];

export default function SmartCategoryMatcher({ onCategorySelected, initialQuery = "" }) {
  const [lang, setLang] = useState("ar");
  const [query, setQuery] = useState(initialQuery);
  const [selected, setSelected] = useState(null);
  const [showBrowse, setShowBrowse] = useState(false);
  const inputRef = useRef(null);
  const t = LANG[lang];
  const isRTL = lang === "ar";

  // Compute suggestions
  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const results = [];
    for (const cat of CATEGORIES) {
      for (const sub of cat.subcategories) {
        const { score, matched } = scoreCategory(query, cat, sub);
        if (score > 0.05) {
          results.push({ cat, sub, score, matched });
        }
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [query]);

  const popularCategories = useMemo(
    () => CATEGORIES.filter((c) => POPULAR.includes(c.id)),
    []
  );

  const handleSelect = useCallback(
    (cat, sub) => {
      setSelected({ catId: cat.id, subId: sub.id });
      onCategorySelected?.({ category: cat, subcategory: sub });
    },
    [onCategorySelected]
  );

  const isSelected = (catId, subId) =>
    selected?.catId === catId && selected?.subId === subId;

  // Score bar color
  const scoreColor = (score) => {
    if (score >= 0.7) return "bg-green-500";
    if (score >= 0.4) return "bg-yellow-500";
    return "bg-orange-400";
  };

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`font-[Tajawal,Cairo,sans-serif] w-full max-w-2xl mx-auto select-none`}
      style={{ fontFamily: "Tajawal, Cairo, sans-serif" }}
    >
      {/* Google Font Import via style tag */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;500;700&display=swap');`}</style>

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-5 mb-4 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <h2 className="text-lg font-bold">{t.title}</h2>
          </div>
          {/* Language Switcher */}
          <div className="flex gap-1 bg-white/20 rounded-xl p-1">
            {["ar", "en", "de"].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 ${
                  lang === l
                    ? "bg-white text-purple-700 shadow"
                    : "text-white/80 hover:text-white hover:bg-white/20"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-white/80">{t.subtitle}</p>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {t.searchLabel}
        </label>
        <div className="relative flex items-center">
          <span className={`absolute ${isRTL ? "right-3" : "left-3"} text-gray-400 text-xl pointer-events-none`}>
            🔍
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.placeholder}
            className={`w-full border-2 border-gray-200 rounded-xl py-3.5 text-gray-800 bg-white shadow-sm
              focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all
              placeholder:text-gray-400 text-sm
              ${isRTL ? "pr-10 pl-12" : "pl-10 pr-12"}`}
            dir={isRTL ? "rtl" : "ltr"}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setSelected(null); inputRef.current?.focus(); }}
              className={`absolute ${isRTL ? "left-3" : "right-3"} w-7 h-7 rounded-full bg-gray-200 
                hover:bg-gray-300 flex items-center justify-center text-gray-500 transition-colors text-sm`}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Suggestions Area */}
      {query.trim() ? (
        <div className="mb-4">
          {suggestions.length > 0 ? (
            <>
              <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                {t.suggestions}
              </h3>
              <div className="space-y-3">
                {suggestions.map(({ cat, sub, score, matched }, idx) => (
                  <div
                    key={`${cat.id}-${sub.id}`}
                    className={`rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer
                      ${isSelected(cat.id, sub.id)
                        ? "border-purple-500 bg-purple-50 shadow-md"
                        : `${cat.border} ${cat.bg} hover:shadow-md hover:border-opacity-80`
                      }`}
                    onClick={() => handleSelect(cat, sub)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Rank badge */}
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br ${cat.color}
                        flex items-center justify-center text-white text-xs font-bold shadow`}>
                        {lang === "ar" ? toArabicIndic(idx + 1) : idx + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Category & Subcategory */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-lg">{cat.icon}</span>
                          <span className="text-xs text-gray-500 font-medium">{cat.names[lang]}</span>
                          <span className="text-gray-300">›</span>
                          <span className="font-bold text-gray-800 text-sm">{sub.names[lang]}</span>
                          {idx === 0 && (
                            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-semibold">
                              {lang === "ar" ? "الأفضل" : lang === "de" ? "Beste" : "Best"}
                            </span>
                          )}
                        </div>

                        {/* Score bar */}
                        <div className="mb-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">{t.confidence}</span>
                            <span className={`text-xs font-bold ${
                              score >= 0.7 ? "text-green-600" : score >= 0.4 ? "text-yellow-600" : "text-orange-500"
                            }`}>
                              {formatPercent(score, lang)}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${scoreColor(score)}`}
                              style={{ width: `${Math.round(score * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Matched keywords */}
                        {matched.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            <span className="text-xs text-gray-400">{t.matchedKeywords}:</span>
                            {matched.slice(0, 4).map((kw) => (
                              <span
                                key={kw}
                                className="text-xs bg-white border border-purple-200 text-purple-700 px-2 py-0.5 rounded-full"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Select button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSelect(cat, sub); }}
                          className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-all duration-200
                            ${isSelected(cat.id, sub.id)
                              ? "bg-purple-600 text-white shadow"
                              : `bg-gradient-to-r ${cat.color} text-white hover:shadow-md hover:opacity-90`
                            }`}
                        >
                          {isSelected(cat.id, sub.id) ? t.selected : t.select}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
              <span className="text-4xl mb-3 block">🔎</span>
              <p className="text-gray-500 text-sm">{t.noResults}</p>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Popular Categories */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
              <span className="text-base">⭐</span>
              {t.popular}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {popularCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setQuery(cat.names[lang]);
                    inputRef.current?.focus();
                  }}
                  className={`${cat.bg} ${cat.border} border-2 rounded-xl p-3 text-start
                    hover:shadow-md transition-all duration-200 group`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{cat.names[lang]}</p>
                      <p className="text-xs text-gray-500">
                        {lang === "ar"
                          ? `${toArabicIndic(cat.subcategories.length)} تصنيفات`
                          : lang === "de"
                          ? `${cat.subcategories.length} Kategorien`
                          : `${cat.subcategories.length} subcategories`}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Empty State Tip */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-indigo-800 text-xs font-semibold mb-1">💡 {t.typeToSearch}</p>
          </div>
        </>
      )}

      {/* Browse all categories toggle */}
      <div className="mt-4">
        <button
          onClick={() => setShowBrowse((v) => !v)}
          className="w-full py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold
            text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50
            transition-all duration-200 flex items-center justify-center gap-2"
        >
          <span>{showBrowse ? "▲" : "▼"}</span>
          {showBrowse ? t.allCategories : t.browse}
        </button>

        {showBrowse && (
          <div className="mt-3 border-2 border-gray-100 rounded-xl overflow-hidden">
            {CATEGORIES.map((cat, ci) => (
              <div key={cat.id} className={ci > 0 ? "border-t border-gray-100" : ""}>
                <div className={`${cat.bg} px-4 py-2.5 flex items-center gap-2`}>
                  <span>{cat.icon}</span>
                  <span className="font-bold text-gray-700 text-sm">{cat.names[lang]}</span>
                </div>
                <div className="px-4 py-2 flex flex-wrap gap-2">
                  {cat.subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => handleSelect(cat, sub)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-150
                        ${isSelected(cat.id, sub.id)
                          ? "bg-purple-600 text-white border-purple-600"
                          : `${cat.border} text-gray-700 hover:bg-gray-50`
                        }`}
                    >
                      {isSelected(cat.id, sub.id) ? "✓ " : ""}{sub.names[lang]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-amber-800 font-bold text-sm mb-2">💡 {t.tips}</p>
        <ul className="space-y-1">
          {[t.tip1, t.tip2, t.tip3].map((tip, i) => (
            <li key={i} className={`flex items-start gap-2 text-xs text-amber-700 ${isRTL ? "" : ""}`}>
              <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-200 flex items-center justify-center text-xs font-bold">
                {lang === "ar" ? toArabicIndic(i + 1) : i + 1}
              </span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Selected Result Display */}
      {selected && (
        <div className="mt-4 bg-green-50 border-2 border-green-400 rounded-xl p-4 animate-pulse-once">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-xl">✅</span>
            <div>
              <p className="text-green-800 font-bold text-sm">
                {lang === "ar" ? "تم اختيار الفئة" : lang === "de" ? "Kategorie ausgewählt" : "Category Selected"}
              </p>
              <p className="text-green-600 text-xs">
                {CATEGORIES.find((c) => c.id === selected.catId)?.names[lang]}
                {" › "}
                {CATEGORIES.find((c) => c.id === selected.catId)
                  ?.subcategories.find((s) => s.id === selected.subId)
                  ?.names[lang]}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
