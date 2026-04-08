"use client";
import { useState, useMemo } from "react";

// AdBoostROICalculator — XTOX Marketplace
// Helps sellers estimate ROI of boosting/featuring their ads
// Arabic-first RTL. Cairo/Tajawal fonts. Tailwind only. Zero deps.
// Props: currentStats, category, price, lang, className

const TRANSLATIONS = {
  ar: {
    title: "حاسبة عائد ترقية الإعلان",
    subtitle: "احسب العائد المتوقع من ترقية إعلانك",
    currentStats: "إحصائيات إعلانك الحالية",
    dailyViews: "المشاهدات اليومية",
    dailyChats: "المحادثات اليومية",
    category: "الفئة",
    adPrice: "سعر المنتج",
    currency: "العملة",
    boostDays: "مدة الترقية (أيام)",
    boostCost: "تكلفة الترقية",
    calculate: "احسب العائد",
    results: "نتائج الترقية المتوقعة",
    extraViews: "مشاهدات إضافية متوقعة",
    extraChats: "محادثات إضافية متوقعة",
    saleChance: "احتمالية البيع",
    expectedRevenue: "العائد المتوقع",
    netROI: "صافي العائد على الاستثمار",
    breakEven: "نقطة التعادل",
    boostMultiplier: "مضاعف الظهور",
    conversionRate: "معدل التحويل",
    verdict: "الحكم",
    verdictExcellent: "ممتاز — الترقية مربحة جداً",
    verdictGood: "جيد — الترقية مربحة",
    verdictFair: "مقبول — الترقية قد تكون مجدية",
    verdictPoor: "غير مجدي — السعر مرتفع مقارنة بالعائد",
    tip: "نصيحة",
    tipText: "الإعلانات المميزة تحصل على ١٦ مرة أكثر مشاهدة في أوقات الذروة (٨-١٠ م)",
    days: "يوم",
    times: "×",
    views: "مشاهدة",
    chats: "محادثة",
    categories: {
      electronics: "إلكترونيات",
      vehicles: "سيارات ومركبات",
      realestate: "عقارات",
      furniture: "أثاث ومنزل",
      fashion: "ملابس وأزياء",
      phones: "هواتف وأجهزة",
      jobs: "وظائف",
      services: "خدمات",
    },
    currencies: { EGP: "جنيه مصري", SAR: "ريال سعودي", AED: "درهم إماراتي", USD: "دولار" },
  },
  en: {
    title: "Ad Boost ROI Calculator",
    subtitle: "Estimate the return on investing in your ad boost",
    currentStats: "Your Current Ad Stats",
    dailyViews: "Daily Views",
    dailyChats: "Daily Chats",
    category: "Category",
    adPrice: "Product Price",
    currency: "Currency",
    boostDays: "Boost Duration (days)",
    boostCost: "Boost Cost",
    calculate: "Calculate ROI",
    results: "Expected Boost Results",
    extraViews: "Extra Views Expected",
    extraChats: "Extra Chats Expected",
    saleChance: "Sale Probability",
    expectedRevenue: "Expected Revenue",
    netROI: "Net ROI",
    breakEven: "Break-Even Point",
    boostMultiplier: "Visibility Multiplier",
    conversionRate: "Conversion Rate",
    verdict: "Verdict",
    verdictExcellent: "Excellent — Very profitable boost",
    verdictGood: "Good — Profitable boost",
    verdictFair: "Fair — May be worthwhile",
    verdictPoor: "Poor — Cost outweighs benefit",
    tip: "Tip",
    tipText: "Featured ads get up to 16× more views during peak hours (8–10 PM)",
    days: "days",
    times: "×",
    views: "views",
    chats: "chats",
    categories: {
      electronics: "Electronics",
      vehicles: "Vehicles",
      realestate: "Real Estate",
      furniture: "Furniture & Home",
      fashion: "Fashion",
      phones: "Phones & Devices",
      jobs: "Jobs",
      services: "Services",
    },
    currencies: { EGP: "Egyptian Pound", SAR: "Saudi Riyal", AED: "UAE Dirham", USD: "US Dollar" },
  },
  de: {
    title: "ROI-Rechner für Anzeigen-Boost",
    subtitle: "Schätzen Sie den ROI Ihres Anzeigen-Boosts",
    currentStats: "Aktuelle Anzeigenstatistiken",
    dailyViews: "Tägliche Aufrufe",
    dailyChats: "Tägliche Chats",
    category: "Kategorie",
    adPrice: "Produktpreis",
    currency: "Währung",
    boostDays: "Boost-Dauer (Tage)",
    boostCost: "Boost-Kosten",
    calculate: "ROI berechnen",
    results: "Erwartete Boost-Ergebnisse",
    extraViews: "Zusätzliche Aufrufe",
    extraChats: "Zusätzliche Chats",
    saleChance: "Verkaufswahrscheinlichkeit",
    expectedRevenue: "Erwarteter Umsatz",
    netROI: "Netto-ROI",
    breakEven: "Break-Even-Punkt",
    boostMultiplier: "Sichtbarkeitsmultiplikator",
    conversionRate: "Konversionsrate",
    verdict: "Bewertung",
    verdictExcellent: "Ausgezeichnet — Sehr rentabler Boost",
    verdictGood: "Gut — Rentabler Boost",
    verdictFair: "Akzeptabel — Könnte sich lohnen",
    verdictPoor: "Schlecht — Kosten überwiegen Nutzen",
    tip: "Tipp",
    tipText: "Gesponserte Anzeigen erhalten bis zu 16× mehr Aufrufe zu Stoßzeiten (20–22 Uhr)",
    days: "Tage",
    times: "×",
    views: "Aufrufe",
    chats: "Chats",
    categories: {
      electronics: "Elektronik",
      vehicles: "Fahrzeuge",
      realestate: "Immobilien",
      furniture: "Möbel & Haushalt",
      fashion: "Mode",
      phones: "Handys & Geräte",
      jobs: "Jobs",
      services: "Dienstleistungen",
    },
    currencies: { EGP: "Ägyptisches Pfund", SAR: "Saudischer Riyal", AED: "VAE-Dirham", USD: "US-Dollar" },
  },
};

// Category-specific data: [boostMultiplier, chatConversionRate, saleConversionRate]
const CATEGORY_DATA = {
  electronics: [4.2, 0.18, 0.07],
  vehicles:    [5.1, 0.12, 0.04],
  realestate:  [3.8, 0.09, 0.02],
  furniture:   [3.5, 0.15, 0.06],
  fashion:     [4.8, 0.22, 0.10],
  phones:      [4.5, 0.20, 0.09],
  jobs:        [3.2, 0.25, 0.15],
  services:    [3.6, 0.17, 0.08],
};

const CURRENCY_RATES = { EGP: 1, SAR: 8.5, AED: 8.2, USD: 50 };

function toArabicIndic(n, lang) {
  if (lang !== "ar") return n;
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function formatNum(val, lang, decimals = 0) {
  const fixed = Number(val).toFixed(decimals);
  return toArabicIndic(Number(fixed).toLocaleString(), lang);
}

export default function AdBoostROICalculator({
  currentStats = {},
  category: initCategory = "electronics",
  price: initPrice = 0,
  lang: initLang = "ar",
  className = "",
}) {
  const [lang, setLang] = useState(initLang);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRTL = lang === "ar";

  const [dailyViews, setDailyViews] = useState(currentStats.dailyViews ?? 20);
  const [dailyChats, setDailyChats] = useState(currentStats.dailyChats ?? 3);
  const [category, setCategory] = useState(initCategory);
  const [adPrice, setAdPrice] = useState(initPrice || 1000);
  const [currency, setCurrency] = useState("EGP");
  const [boostDays, setBoostDays] = useState(7);
  const [boostCost, setBoostCost] = useState(50);
  const [calculated, setCalculated] = useState(false);

  const results = useMemo(() => {
    if (!calculated) return null;
    const [multiplier, chatRate, saleRate] = CATEGORY_DATA[category] || CATEGORY_DATA.electronics;
    const rate = CURRENCY_RATES[currency] || 1;
    const priceEGP = adPrice * rate;

    const baseViews = dailyViews * boostDays;
    const extraViews = Math.round(baseViews * (multiplier - 1));
    const totalViews = baseViews + extraViews;

    const baseChats = dailyChats * boostDays;
    const extraChats = Math.round(extraViews * chatRate);
    const totalChats = baseChats + extraChats;

    const saleChance = Math.min(99, Math.round((totalChats * saleRate) * 100));
    const expectedRevenue = (saleChance / 100) * priceEGP;
    const netROI = expectedRevenue - boostCost;
    const roiPercent = boostCost > 0 ? ((netROI / boostCost) * 100) : 0;
    const breakEven = boostCost > 0 ? Math.ceil(boostCost / (priceEGP * saleRate * 0.01)) : 0;

    let verdict, verdictColor;
    if (roiPercent >= 200) { verdict = t.verdictExcellent; verdictColor = "text-emerald-600"; }
    else if (roiPercent >= 50) { verdict = t.verdictGood; verdictColor = "text-blue-600"; }
    else if (roiPercent >= 0) { verdict = t.verdictFair; verdictColor = "text-amber-600"; }
    else { verdict = t.verdictPoor; verdictColor = "text-red-600"; }

    return { multiplier, extraViews, extraChats, saleChance, expectedRevenue, netROI, roiPercent, breakEven, verdict, verdictColor };
  }, [calculated, category, adPrice, currency, boostDays, boostCost, dailyViews, dailyChats, lang, t]);

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`font-sans bg-white rounded-2xl shadow-lg overflow-hidden max-w-lg mx-auto ${className}`}
      style={{ fontFamily: lang === "ar" ? "'Cairo', 'Tajawal', sans-serif" : "sans-serif" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-l from-emerald-600 to-teal-500 px-5 py-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-white font-bold text-base leading-tight">{t.title}</h2>
          {/* Lang switcher */}
          <div className="flex gap-1">
            {["ar", "en", "de"].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition ${lang === l ? "bg-white text-emerald-700" : "bg-emerald-700 text-white opacity-70 hover:opacity-100"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <p className="text-emerald-100 text-xs">{t.subtitle}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Current Stats */}
        <section>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t.currentStats}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t.dailyViews}</label>
              <input
                type="number"
                min="0"
                value={dailyViews}
                onChange={(e) => { setDailyViews(Number(e.target.value)); setCalculated(false); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t.dailyChats}</label>
              <input
                type="number"
                min="0"
                value={dailyChats}
                onChange={(e) => { setDailyChats(Number(e.target.value)); setCalculated(false); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-center"
              />
            </div>
          </div>
        </section>

        {/* Ad Details */}
        <section>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t.category}</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setCalculated(false); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {Object.entries(t.categories).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t.currency}</label>
              <select
                value={currency}
                onChange={(e) => { setCurrency(e.target.value); setCalculated(false); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {Object.entries(t.currencies).map(([k, v]) => (
                  <option key={k} value={k}>{k} — {v}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-xs text-gray-500 mb-1 block">{t.adPrice} ({currency})</label>
            <input
              type="number"
              min="0"
              value={adPrice}
              onChange={(e) => { setAdPrice(Number(e.target.value)); setCalculated(false); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </section>

        {/* Boost Settings */}
        <section className="bg-emerald-50 rounded-xl p-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t.boostDays}</label>
              <div className="flex gap-1 flex-wrap">
                {[3, 7, 14, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => { setBoostDays(d); setCalculated(false); }}
                    className={`flex-1 min-w-0 py-1.5 rounded-lg text-xs font-bold transition ${boostDays === d ? "bg-emerald-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-emerald-400"}`}
                  >
                    {toArabicIndic(d, lang)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{t.boostCost} (EGP)</label>
              <input
                type="number"
                min="0"
                value={boostCost}
                onChange={(e) => { setBoostCost(Number(e.target.value)); setCalculated(false); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
              />
            </div>
          </div>
        </section>

        {/* Calculate Button */}
        <button
          onClick={() => setCalculated(true)}
          className="w-full bg-gradient-to-l from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold py-3 rounded-xl text-sm transition active:scale-95"
        >
          {t.calculate} 📊
        </button>

        {/* Results */}
        {results && (
          <section className="space-y-3 pt-1">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.results}</h3>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t.boostMultiplier, value: `${toArabicIndic(results.multiplier.toFixed(1), lang)}×`, color: "bg-purple-50 border-purple-200 text-purple-700" },
                { label: t.saleChance, value: `${toArabicIndic(results.saleChance, lang)}%`, color: "bg-blue-50 border-blue-200 text-blue-700" },
                { label: t.extraViews, value: `+${formatNum(results.extraViews, lang)}`, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
                { label: t.extraChats, value: `+${formatNum(results.extraChats, lang)}`, color: "bg-teal-50 border-teal-200 text-teal-700" },
              ].map(({ label, value, color }) => (
                <div key={label} className={`border rounded-xl p-3 text-center ${color}`}>
                  <div className="text-xl font-bold">{value}</div>
                  <div className="text-xs opacity-70 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Revenue & ROI */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-2">
              {[
                { label: t.expectedRevenue, value: `${formatNum(results.expectedRevenue, lang, 0)} EGP` },
                { label: t.netROI, value: `${results.netROI >= 0 ? "+" : ""}${formatNum(results.netROI, lang, 0)} EGP (${formatNum(results.roiPercent, lang, 0)}%)` },
                { label: t.breakEven, value: `${formatNum(results.breakEven, lang)} ${t.days}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 text-xs">{label}</span>
                  <span className="font-bold text-gray-800">{value}</span>
                </div>
              ))}
            </div>

            {/* ROI Bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{t.netROI}</span>
                <span className="font-bold">{formatNum(Math.max(0, Math.min(100, results.roiPercent / 3)), lang, 0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${results.netROI >= 0 ? "bg-emerald-500" : "bg-red-400"}`}
                  style={{ width: `${Math.max(2, Math.min(100, results.roiPercent / 3))}%` }}
                />
              </div>
            </div>

            {/* Verdict */}
            <div className={`rounded-xl p-3 text-center border-2 ${results.verdictColor.replace("text-", "border-")} bg-gray-50`}>
              <div className="text-xs text-gray-500 mb-1">{t.verdict}</div>
              <div className={`font-bold text-sm ${results.verdictColor}`}>{results.verdict}</div>
            </div>

            {/* Tip */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start">
              <span className="text-lg">💡</span>
              <div>
                <div className="text-xs font-bold text-amber-700">{t.tip}</div>
                <div className="text-xs text-amber-600 mt-0.5">{t.tipText}</div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
