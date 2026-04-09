// LocalDeliveryEstimator.jsx
// Delivery time & cost estimator widget for Arab marketplace buyers/sellers
// RTL-first, Cairo/Tajawal fonts, Tailwind only, zero external deps
// Props: fromCity, toCity, lang, currency, className

"use client";
import { useState, useMemo } from "react";

/* ── DATA ─────────────────────────────────────────────────────────────────── */
const CITIES = [
  // Egypt
  { id: "cairo",      ar: "القاهرة",        en: "Cairo",           de: "Kairo",        country: "EG", zone: 1 },
  { id: "giza",       ar: "الجيزة",         en: "Giza",            de: "Gizeh",        country: "EG", zone: 1 },
  { id: "alexandria", ar: "الإسكندرية",     en: "Alexandria",      de: "Alexandria",   country: "EG", zone: 1 },
  { id: "mansoura",   ar: "المنصورة",       en: "Mansoura",        de: "Mansoura",     country: "EG", zone: 2 },
  { id: "tanta",      ar: "طنطا",           en: "Tanta",           de: "Tanta",        country: "EG", zone: 2 },
  { id: "aswan",      ar: "أسوان",          en: "Aswan",           de: "Assuan",       country: "EG", zone: 3 },
  { id: "luxor",      ar: "الأقصر",         en: "Luxor",           de: "Luxor",        country: "EG", zone: 3 },
  { id: "hurghada",   ar: "الغردقة",        en: "Hurghada",        de: "Hurghada",     country: "EG", zone: 3 },
  { id: "suez",       ar: "السويس",         en: "Suez",            de: "Suez",         country: "EG", zone: 2 },
  { id: "ismailia",   ar: "الإسماعيلية",   en: "Ismailia",        de: "Ismailia",     country: "EG", zone: 2 },
  { id: "port_said",  ar: "بور سعيد",       en: "Port Said",       de: "Port Said",    country: "EG", zone: 2 },
  { id: "zagazig",    ar: "الزقازيق",       en: "Zagazig",         de: "Zagazig",      country: "EG", zone: 2 },
  { id: "sohag",      ar: "سوهاج",          en: "Sohag",           de: "Sohag",        country: "EG", zone: 3 },
  { id: "qena",       ar: "قنا",            en: "Qena",            de: "Qena",         country: "EG", zone: 3 },
  { id: "minya",      ar: "المنيا",         en: "Minya",           de: "Minya",        country: "EG", zone: 3 },
  // Saudi Arabia
  { id: "riyadh",     ar: "الرياض",         en: "Riyadh",          de: "Riad",         country: "SA", zone: 4 },
  { id: "jeddah",     ar: "جدة",            en: "Jeddah",          de: "Dschidda",     country: "SA", zone: 4 },
  { id: "dammam",     ar: "الدمام",         en: "Dammam",          de: "Dammam",       country: "SA", zone: 4 },
  // UAE
  { id: "dubai",      ar: "دبي",            en: "Dubai",           de: "Dubai",        country: "AE", zone: 4 },
  { id: "abudhabi",   ar: "أبوظبي",         en: "Abu Dhabi",       de: "Abu Dhabi",    country: "AE", zone: 4 },
  // Jordan & Kuwait & Qatar
  { id: "amman",      ar: "عمّان",           en: "Amman",           de: "Amman",        country: "JO", zone: 4 },
  { id: "kuwait_city",ar: "مدينة الكويت",   en: "Kuwait City",     de: "Kuwait-Stadt", country: "KW", zone: 4 },
  { id: "doha",       ar: "الدوحة",         en: "Doha",            de: "Doha",         country: "QA", zone: 4 },
];

const CATEGORIES = [
  { id: "small",     ar: "طرد صغير",          en: "Small Parcel",       de: "Kleines Paket",   factor: 1.0 },
  { id: "medium",    ar: "صندوق متوسط",        en: "Medium Box",         de: "Mittelgroße Box", factor: 1.6 },
  { id: "large",     ar: "عنصر كبير",          en: "Large Item",         de: "Großer Gegenstand",factor: 2.5 },
  { id: "furniture", ar: "أثاث / جهاز كبير",  en: "Furniture/Appliance",de: "Möbel/Gerät",     factor: 5.0 },
];

const COURIERS = [
  { id: "bosta",     name: "Bosta",       logo: "🟣", eg: true,  intl: false },
  { id: "aramex",    name: "Aramex",      logo: "🔴", eg: true,  intl: true  },
  { id: "egypt_post",name: "Egypt Post",  logo: "🟡", eg: true,  intl: true  },
  { id: "dhl",       name: "DHL",         logo: "🟠", eg: true,  intl: true  },
];

// Base cost in EGP for same-city (zone diff 0) small parcel
const BASE_EGP = 35;
const ZONE_COST = [0, 0, 20, 45, 180]; // index = zone diff

const CURRENCIES = {
  EGP: { symbol: "ج.م", rate: 1    },
  SAR: { symbol: "ر.س", rate: 0.063 },
  AED: { symbol: "د.إ", rate: 0.069 },
  USD: { symbol: "$",   rate: 0.021 },
};

const T = {
  ar: {
    title:      "تقدير تكلفة الشحن والتوصيل",
    from:       "من مدينة",
    to:         "إلى مدينة",
    category:   "نوع المنتج",
    estimate:   "احسب التوصيل",
    time:       "وقت التوصيل المتوقع",
    cost:       "التكلفة التقديرية",
    courier:    "شركات الشحن المتاحة",
    sameday:    "توصيل في نفس اليوم",
    nextday:    "توصيل في اليوم التالي",
    days23:     "٢-٣ أيام عمل",
    days35:     "٣-٥ أيام عمل",
    intl:       "دولي (٧-١٤ يوماً)",
    arabic_num: "أرقام عربية",
    select:     "اختر مدينة...",
    note:       "* التكاليف تقديرية وقد تختلف حسب الوزن والشركة",
    from_eg:    "يجب أن تكون مدينة الإرسال مصرية للشحن الداخلي",
  },
  en: {
    title:      "Delivery Time & Cost Estimator",
    from:       "From City",
    to:         "To City",
    category:   "Item Category",
    estimate:   "Estimate Delivery",
    time:       "Estimated Delivery Time",
    cost:       "Estimated Cost",
    courier:    "Available Couriers",
    sameday:    "Same-Day Delivery",
    nextday:    "Next-Day Delivery",
    days23:     "2-3 Business Days",
    days35:     "3-5 Business Days",
    intl:       "International (7-14 Days)",
    arabic_num: "Arabic-Indic Numerals",
    select:     "Select city...",
    note:       "* Costs are estimates and may vary by weight and courier",
    from_eg:    "Sender city must be Egyptian for domestic shipping",
  },
  de: {
    title:      "Lieferzeit- und Kostenschätzer",
    from:       "Von Stadt",
    to:         "Nach Stadt",
    category:   "Artikelkategorie",
    estimate:   "Lieferung schätzen",
    time:       "Voraussichtliche Lieferzeit",
    cost:       "Geschätzte Kosten",
    courier:    "Verfügbare Kuriere",
    sameday:    "Gleichtag-Lieferung",
    nextday:    "Nächsttag-Lieferung",
    days23:     "2-3 Werktage",
    days35:     "3-5 Werktage",
    intl:       "International (7-14 Tage)",
    arabic_num: "Arabisch-Indische Ziffern",
    select:     "Stadt auswählen...",
    note:       "* Kosten sind Schätzungen und können je nach Gewicht und Kurier variieren",
    from_eg:    "Absenderstadt muss ägyptisch sein für inländischen Versand",
  },
};

/* ── HELPERS ──────────────────────────────────────────────────────────────── */
function toArabicIndic(n) {
  return String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function fmtNum(n, arabicNumerals) {
  const rounded = Math.round(n);
  return arabicNumerals ? toArabicIndic(rounded) : String(rounded);
}

function calcResult(fromId, toId, catId) {
  const from = CITIES.find(c => c.id === fromId);
  const to   = CITIES.find(c => c.id === toId);
  const cat  = CATEGORIES.find(c => c.id === catId);
  if (!from || !to || !cat) return null;

  const sameCity    = fromId === toId;
  const sameCountry = from.country === to.country;
  const zoneDiff    = Math.abs(from.zone - to.zone);
  const international = !sameCountry;

  let timeKey;
  if (international)        timeKey = "intl";
  else if (sameCity)        timeKey = "sameday";
  else if (zoneDiff <= 1)   timeKey = "nextday";
  else if (zoneDiff <= 2)   timeKey = "days23";
  else                      timeKey = "days35";

  const zoneIdx   = Math.min(zoneDiff + (international ? 4 : 0), 4);
  const baseEGP   = BASE_EGP + ZONE_COST[zoneIdx];
  const costEGP   = baseEGP * cat.factor;

  // Available couriers
  const couriers = COURIERS.filter(courier => {
    if (!courier.eg) return false;
    if (international && !courier.intl) return false;
    return true;
  });

  return { timeKey, costEGP, couriers, international };
}

/* ── COMPONENT ────────────────────────────────────────────────────────────── */
export default function LocalDeliveryEstimator({
  fromCity    = "",
  toCity      = "",
  lang        = "ar",
  currency    = "EGP",
  className   = "",
}) {
  const [activeLang, setActiveLang]       = useState(lang);
  const [activeCurrency, setActiveCurrency] = useState(currency);
  const [from, setFrom]                   = useState(fromCity || "");
  const [to, setTo]                       = useState(toCity   || "");
  const [category, setCategory]           = useState("small");
  const [arabicNumerals, setArabicNumerals] = useState(activeLang === "ar");
  const [result, setResult]               = useState(null);
  const [estimated, setEstimated]         = useState(false);

  const t   = T[activeLang] || T.ar;
  const rtl = activeLang === "ar";
  const cur = CURRENCIES[activeCurrency] || CURRENCIES.EGP;

  const cityLabel = (city) =>
    activeLang === "ar" ? city.ar :
    activeLang === "de" ? city.de :
    city.en;

  const catLabel = (cat) =>
    activeLang === "ar" ? cat.ar :
    activeLang === "de" ? cat.de :
    cat.en;

  const handleEstimate = () => {
    const r = calcResult(from, to, category);
    setResult(r);
    setEstimated(true);
  };

  const costDisplay = useMemo(() => {
    if (!result) return "";
    const converted = result.costEGP * cur.rate;
    return `${fmtNum(converted, arabicNumerals)} ${cur.symbol}`;
  }, [result, activeCurrency, arabicNumerals, cur]);

  const timeDisplay = (key) => t[key] || key;

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-lg border border-gray-100 p-6 max-w-xl mx-auto ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5 gap-2 flex-wrap">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="text-2xl">🚚</span>
          {t.title}
        </h2>
        {/* Language switcher */}
        <div className="flex gap-1 text-xs font-semibold">
          {["ar","en","de"].map(l => (
            <button
              key={l}
              onClick={() => { setActiveLang(l); setArabicNumerals(l === "ar"); }}
              className={`px-2 py-1 rounded-md border transition ${
                activeLang === l
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-indigo-50"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Form ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {/* From */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t.from}</label>
          <select
            value={from}
            onChange={e => { setFrom(e.target.value); setEstimated(false); }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">{t.select}</option>
            {CITIES.map(c => (
              <option key={c.id} value={c.id}>{cityLabel(c)}</option>
            ))}
          </select>
        </div>

        {/* To */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t.to}</label>
          <select
            value={to}
            onChange={e => { setTo(e.target.value); setEstimated(false); }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">{t.select}</option>
            {CITIES.map(c => (
              <option key={c.id} value={c.id}>{cityLabel(c)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 mb-2">{t.category}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.id); setEstimated(false); }}
              className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${
                category === cat.id
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-indigo-50"
              }`}
            >
              {catLabel(cat)}
            </button>
          ))}
        </div>
      </div>

      {/* Currency & Arabic numeral toggles */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 text-xs">
          {Object.keys(CURRENCIES).map(c => (
            <button
              key={c}
              onClick={() => setActiveCurrency(c)}
              className={`px-2 py-1 rounded-lg border font-semibold transition ${
                activeCurrency === c
                  ? "bg-emerald-500 text-white border-emerald-500"
                  : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-emerald-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={arabicNumerals}
            onChange={e => setArabicNumerals(e.target.checked)}
            className="accent-indigo-500"
          />
          {t.arabic_num}
        </label>
      </div>

      {/* Estimate button */}
      <button
        onClick={handleEstimate}
        disabled={!from || !to}
        className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition mb-5"
      >
        {t.estimate}
      </button>

      {/* ── Results ── */}
      {estimated && result && (
        <div className="bg-indigo-50 rounded-2xl p-4 space-y-4 border border-indigo-100">
          {/* Time */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">⏱️</span>
            <div>
              <p className="text-xs text-gray-500 font-medium">{t.time}</p>
              <p className="text-base font-bold text-indigo-700">{timeDisplay(result.timeKey)}</p>
            </div>
          </div>

          {/* Cost */}
          <div className="flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div>
              <p className="text-xs text-gray-500 font-medium">{t.cost}</p>
              <p className="text-xl font-extrabold text-emerald-600">{costDisplay}</p>
            </div>
          </div>

          {/* Couriers */}
          <div>
            <p className="text-xs text-gray-500 font-medium mb-2">{t.courier}</p>
            <div className="flex flex-wrap gap-2">
              {result.couriers.map(courier => (
                <span
                  key={courier.id}
                  className="flex items-center gap-1 px-3 py-1 bg-white rounded-full border border-gray-200 text-xs font-semibold text-gray-700 shadow-sm"
                >
                  {courier.logo} {courier.name}
                </span>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-gray-400 mt-1">{t.note}</p>
        </div>
      )}

      {estimated && !result && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 font-medium">
          ⚠️ {t.from_eg}
        </div>
      )}
    </div>
  );
}
