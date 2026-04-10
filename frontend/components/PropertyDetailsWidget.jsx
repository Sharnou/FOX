/**
 * PropertyDetailsWidget.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * XTOX Arab Marketplace — Real Estate Property Details Panel
 *
 * Displays structured property information for real estate ad listings.
 * Features:
 *   • Property type, area (sqm), bedrooms, bathrooms, floor, furnishing
 *   • Amenities checklist (parking, elevator, pool, gym, security, balcony)
 *   • Nearby facilities section (school, hospital, mall, metro) with km distance
 *   • AR / EN / DE language switcher
 *   • Arabic-Indic numeral toggle (١٢٣ ↔ 123)
 *   • RTL-first layout using Tailwind CSS only
 *   • Cairo / Tajawal Google Fonts via className
 *   • Zero external dependencies beyond React
 *
 * Usage:
 *   <PropertyDetailsWidget property={propertyData} />
 *
 * Run 239 — XTOX Auto-Upgrade Agent
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";

// ─── i18n Translations ────────────────────────────────────────────────────────
const TRANSLATIONS = {
  ar: {
    title: "تفاصيل العقار",
    propertyType: "نوع العقار",
    area: "المساحة",
    sqm: "م²",
    bedrooms: "غرف النوم",
    bathrooms: "الحمامات",
    floor: "الطابق",
    furnishing: "الأثاث",
    furnished: "مفروش",
    semiFurnished: "نصف مفروش",
    unfurnished: "غير مفروش",
    amenities: "المرافق والخدمات",
    parking: "موقف سيارات",
    elevator: "مصعد",
    pool: "حمام سباحة",
    gym: "صالة رياضية",
    security: "أمن وحراسة",
    balcony: "شرفة",
    internet: "إنترنت عالي السرعة",
    centralAC: "تكييف مركزي",
    nearbyFacilities: "المرافق القريبة",
    school: "مدرسة",
    hospital: "مستشفى",
    mall: "مول تجاري",
    metro: "محطة مترو",
    mosque: "مسجد",
    km: "كم",
    available: "متوفر",
    notAvailable: "غير متوفر",
    arabicNumerals: "أرقام عربية",
    groundFloor: "الدور الأرضي",
    floorNum: "الدور",
    types: {
      apartment: "شقة",
      villa: "فيلا",
      studio: "استوديو",
      duplex: "دوبلكس",
      townhouse: "تاون هاوس",
      penthouse: "بنتهاوس",
      chalet: "شاليه",
      office: "مكتب",
    },
    langLabel: "اللغة",
  },
  en: {
    title: "Property Details",
    propertyType: "Property Type",
    area: "Area",
    sqm: "sqm",
    bedrooms: "Bedrooms",
    bathrooms: "Bathrooms",
    floor: "Floor",
    furnishing: "Furnishing",
    furnished: "Furnished",
    semiFurnished: "Semi-Furnished",
    unfurnished: "Unfurnished",
    amenities: "Amenities & Features",
    parking: "Parking",
    elevator: "Elevator",
    pool: "Swimming Pool",
    gym: "Gym",
    security: "Security",
    balcony: "Balcony",
    internet: "High-Speed Internet",
    centralAC: "Central A/C",
    nearbyFacilities: "Nearby Facilities",
    school: "School",
    hospital: "Hospital",
    mall: "Shopping Mall",
    metro: "Metro Station",
    mosque: "Mosque",
    km: "km",
    available: "Available",
    notAvailable: "Not Available",
    arabicNumerals: "Arabic Numerals",
    groundFloor: "Ground Floor",
    floorNum: "Floor",
    types: {
      apartment: "Apartment",
      villa: "Villa",
      studio: "Studio",
      duplex: "Duplex",
      townhouse: "Townhouse",
      penthouse: "Penthouse",
      chalet: "Chalet",
      office: "Office",
    },
    langLabel: "Language",
  },
  de: {
    title: "Immobiliendetails",
    propertyType: "Immobilientyp",
    area: "Fläche",
    sqm: "m²",
    bedrooms: "Schlafzimmer",
    bathrooms: "Badezimmer",
    floor: "Etage",
    furnishing: "Einrichtung",
    furnished: "Möbliert",
    semiFurnished: "Teilmöbliert",
    unfurnished: "Unmöbliert",
    amenities: "Ausstattung",
    parking: "Parkplatz",
    elevator: "Aufzug",
    pool: "Schwimmbad",
    gym: "Fitnessstudio",
    security: "Sicherheit",
    balcony: "Balkon",
    internet: "Highspeed-Internet",
    centralAC: "Klimaanlage",
    nearbyFacilities: "In der Nähe",
    school: "Schule",
    hospital: "Krankenhaus",
    mall: "Einkaufszentrum",
    metro: "U-Bahn-Station",
    mosque: "Moschee",
    km: "km",
    available: "Verfügbar",
    notAvailable: "Nicht verfügbar",
    arabicNumerals: "Arabische Ziffern",
    groundFloor: "Erdgeschoss",
    floorNum: "Etage",
    types: {
      apartment: "Wohnung",
      villa: "Villa",
      studio: "Studio",
      duplex: "Duplex",
      townhouse: "Reihenhaus",
      penthouse: "Penthouse",
      chalet: "Chalet",
      office: "Büro",
    },
    langLabel: "Sprache",
  },
};

// ─── Arabic-Indic numeral converter ──────────────────────────────────────────
const toArabicIndic = (num) =>
  String(num).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

const formatNum = (num, useArabicIndic) =>
  useArabicIndic ? toArabicIndic(num) : String(num);

// ─── Amenity Icon (SVG inline, no deps) ──────────────────────────────────────
const AmenityIcon = ({ type }) => {
  const icons = {
    parking: "🚗",
    elevator: "🛗",
    pool: "🏊",
    gym: "🏋️",
    security: "🔒",
    balcony: "🌿",
    internet: "📶",
    centralAC: "❄️",
  };
  return (
    <span className="text-lg leading-none" aria-hidden="true">
      {icons[type] || "✓"}
    </span>
  );
};

// ─── Facility Icon ────────────────────────────────────────────────────────────
const FacilityIcon = ({ type }) => {
  const icons = {
    school: "🏫",
    hospital: "🏥",
    mall: "🏬",
    metro: "🚇",
    mosque: "🕌",
  };
  return (
    <span className="text-xl leading-none" aria-hidden="true">
      {icons[type] || "📍"}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PropertyDetailsWidget = ({ property = {} }) => {
  // ── State ──
  const [lang, setLang] = useState("ar");
  const [useArabicIndic, setUseArabicIndic] = useState(true);

  const t = TRANSLATIONS[lang];
  const isRTL = lang === "ar";

  // ── Default property data (demo / fallback) ──
  const p = {
    type: "apartment",
    area: 120,
    bedrooms: 3,
    bathrooms: 2,
    floor: 5,
    furnishing: "furnished",
    amenities: {
      parking: true,
      elevator: true,
      pool: false,
      gym: true,
      security: true,
      balcony: true,
      internet: true,
      centralAC: false,
    },
    nearby: [
      { type: "school", distanceKm: 0.4 },
      { type: "hospital", distanceKm: 1.2 },
      { type: "mall", distanceKm: 0.8 },
      { type: "metro", distanceKm: 0.3 },
      { type: "mosque", distanceKm: 0.1 },
    ],
    ...property,
  };

  // ── Floor label helper ──
  const floorLabel = (n) => {
    if (n === 0) return t.groundFloor;
    return `${t.floorNum} ${formatNum(n, useArabicIndic)}`;
  };

  // ── Furnishing label ──
  const furnishingLabel = {
    furnished: t.furnished,
    semiFurnished: t.semiFurnished,
    unfurnished: t.unfurnished,
  }[p.furnishing] || t.unfurnished;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`
        font-sans bg-white rounded-2xl shadow-md border border-gray-100
        overflow-hidden max-w-xl w-full mx-auto
        ${isRTL ? "font-[Cairo,Tajawal,sans-serif]" : ""}
      `}
      style={isRTL ? { fontFamily: "Cairo, Tajawal, sans-serif" } : {}}
    >
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-4 flex items-center justify-between">
        <h2 className="text-white font-bold text-lg tracking-wide">{t.title}</h2>

        {/* Language + Numeral controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Arabic numeral toggle */}
          <button
            onClick={() => setUseArabicIndic((v) => !v)}
            title={t.arabicNumerals}
            className={`
              text-xs px-2 py-1 rounded-full font-mono transition-all
              ${useArabicIndic
                ? "bg-white text-emerald-700 font-bold"
                : "bg-emerald-700 text-white border border-white/40"}
            `}
          >
            {useArabicIndic ? "١٢٣" : "123"}
          </button>

          {/* Language switcher */}
          {["ar", "en", "de"].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`
                text-xs px-2 py-1 rounded-full transition-all uppercase font-semibold
                ${lang === l
                  ? "bg-white text-emerald-700"
                  : "bg-emerald-700 text-white border border-white/40 hover:bg-emerald-800"}
              `}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* ── Core Specs Grid ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {/* Property Type */}
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
            <span className="text-2xl">🏠</span>
            <span className="text-[11px] text-gray-400 font-medium">{t.propertyType}</span>
            <span className="text-sm font-bold text-gray-800">
              {t.types[p.type] || p.type}
            </span>
          </div>

          {/* Area */}
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
            <span className="text-2xl">📐</span>
            <span className="text-[11px] text-gray-400 font-medium">{t.area}</span>
            <span className="text-sm font-bold text-gray-800">
              {formatNum(p.area, useArabicIndic)} {t.sqm}
            </span>
          </div>

          {/* Bedrooms */}
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
            <span className="text-2xl">🛏</span>
            <span className="text-[11px] text-gray-400 font-medium">{t.bedrooms}</span>
            <span className="text-sm font-bold text-gray-800">
              {formatNum(p.bedrooms, useArabicIndic)}
            </span>
          </div>

          {/* Bathrooms */}
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
            <span className="text-2xl">🚿</span>
            <span className="text-[11px] text-gray-400 font-medium">{t.bathrooms}</span>
            <span className="text-sm font-bold text-gray-800">
              {formatNum(p.bathrooms, useArabicIndic)}
            </span>
          </div>

          {/* Floor */}
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
            <span className="text-2xl">🏢</span>
            <span className="text-[11px] text-gray-400 font-medium">{t.floor}</span>
            <span className="text-sm font-bold text-gray-800">{floorLabel(p.floor)}</span>
          </div>

          {/* Furnishing */}
          <div className="bg-gray-50 rounded-xl p-3 flex flex-col items-center gap-1 text-center">
            <span className="text-2xl">🛋️</span>
            <span className="text-[11px] text-gray-400 font-medium">{t.furnishing}</span>
            <span className="text-sm font-bold text-gray-800">{furnishingLabel}</span>
          </div>
        </div>

        {/* ── Amenities ── */}
        <div>
          <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-emerald-500 rounded inline-block" />
            {t.amenities}
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(p.amenities).map(([key, available]) => (
              <div
                key={key}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                  ${available
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-gray-50 border border-gray-200 text-gray-400"}
                `}
              >
                <AmenityIcon type={key} />
                <span className="flex-1 font-medium text-xs">{t[key] || key}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    available
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {available ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Nearby Facilities ── */}
        <div>
          <h3 className="text-sm font-bold text-gray-600 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-teal-500 rounded inline-block" />
            {t.nearbyFacilities}
          </h3>
          <div className="space-y-2">
            {p.nearby.map((f, i) => {
              const distKm = f.distanceKm;
              /* Color distance bar: green < 0.5km, yellow < 1.5km, red > 1.5km */
              const barColor =
                distKm < 0.5
                  ? "bg-emerald-400"
                  : distKm < 1.5
                  ? "bg-amber-400"
                  : "bg-red-400";
              const barWidth = Math.min(100, Math.round((distKm / 3) * 100));

              return (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2"
                >
                  <FacilityIcon type={f.type} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">
                        {t[f.type] || f.type}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {formatNum(distKm, useArabicIndic)} {t.km}
                      </span>
                    </div>
                    {/* Distance bar */}
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer note ── */}
        <p className="text-[10px] text-gray-400 text-center">
          {lang === "ar"
            ? "المعلومات مقدمة من البائع — يُرجى التحقق عند المعاينة"
            : lang === "de"
            ? "Angaben des Verkäufers — bitte beim Besichtigungstermin prüfen"
            : "Details provided by seller — please verify on viewing"}
        </p>
      </div>
    </div>
  );
};

export default PropertyDetailsWidget;
