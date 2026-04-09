'use client';
// CarPartsFinderWidget.jsx
// XTOX Arab Marketplace — Spare Car Parts Finder Widget
// Supports AR / EN / DE | RTL-first | Tailwind only | Cairo/Tajawal font

import { useState } from 'react';

// ─── Translations ────────────────────────────────────────────────────────────
const T = {
  ar: {
    title: 'بحث عن قطع غيار',
    subtitle: 'ابحث عن أفضل قطع الغيار في السوق العربي',
    selectMake: 'اختر الماركة',
    modelPlaceholder: 'الموديل (مثال: كورولا، إيلانترا)',
    year: 'سنة الصنع',
    partCategory: 'فئة القطعة',
    condition: 'الحالة',
    search: 'بحث',
    searching: 'جارٍ البحث...',
    results: 'نتائج البحث',
    contactSeller: 'تواصل مع البائع',
    new: 'جديد',
    used: 'مستعمل',
    oem: 'أصلي',
    aftermarket: 'بديل',
    city: 'المدينة',
    price: 'السعر',
    egp: 'ج.م',
    noResults: 'لا توجد نتائج، يرجى تعديل معايير البحث.',
    numerals: 'أرقام عربية',
    allYears: 'كل السنوات',
  },
  en: {
    title: 'Car Parts Finder',
    subtitle: 'Find the best spare parts across the Arab marketplace',
    selectMake: 'Select Make',
    modelPlaceholder: 'Model (e.g. Corolla, Elantra)',
    year: 'Year',
    partCategory: 'Part Category',
    condition: 'Condition',
    search: 'Search',
    searching: 'Searching...',
    results: 'Search Results',
    contactSeller: 'Contact Seller',
    new: 'New',
    used: 'Used',
    oem: 'OEM',
    aftermarket: 'Aftermarket',
    city: 'City',
    price: 'Price',
    egp: 'EGP',
    noResults: 'No results found. Please adjust your search criteria.',
    numerals: 'Arabic Numerals',
    allYears: 'All Years',
  },
  de: {
    title: 'Kfz-Teilefinder',
    subtitle: 'Finden Sie die besten Ersatzteile auf dem arabischen Markt',
    selectMake: 'Marke wählen',
    modelPlaceholder: 'Modell (z.B. Corolla, Elantra)',
    year: 'Baujahr',
    partCategory: 'Teilekategorie',
    condition: 'Zustand',
    search: 'Suchen',
    searching: 'Suche läuft...',
    results: 'Suchergebnisse',
    contactSeller: 'Verkäufer kontaktieren',
    new: 'Neu',
    used: 'Gebraucht',
    oem: 'Original',
    aftermarket: 'Nachbau',
    city: 'Stadt',
    price: 'Preis',
    egp: 'EGP',
    noResults: 'Keine Ergebnisse gefunden. Bitte Suchkriterien anpassen.',
    numerals: 'Arabische Ziffern',
    allYears: 'Alle Jahre',
  },
};

// ─── Static data ─────────────────────────────────────────────────────────────
const CAR_MAKES = [
  { id: 'toyota',     label: 'Toyota',      icon: '🚙' },
  { id: 'hyundai',    label: 'Hyundai',     icon: '🚘' },
  { id: 'kia',        label: 'Kia',         icon: '🚗' },
  { id: 'nissan',     label: 'Nissan',      icon: '🛻' },
  { id: 'bmw',        label: 'BMW',         icon: '🏎️' },
  { id: 'mercedes',   label: 'Mercedes',    icon: '🚐' },
  { id: 'chevrolet',  label: 'Chevrolet',   icon: '🚕' },
  { id: 'ford',       label: 'Ford',        icon: '🛺' },
  { id: 'volkswagen', label: 'VW',          icon: '🚌' },
  { id: 'honda',      label: 'Honda',       icon: '🏍️' },
];

const PART_CATEGORIES = [
  { id: 'engine',      ar: 'محرك',             en: 'Engine Parts',       de: 'Motorteile',         icon: '🔧' },
  { id: 'transmission',ar: 'ناقل الحركة',       en: 'Transmission',       de: 'Getriebe',           icon: '⚙️' },
  { id: 'brakes',      ar: 'فرامل وعجلات',     en: 'Brakes & Wheels',    de: 'Bremsen & Räder',    icon: '🛞' },
  { id: 'electrical',  ar: 'كهرباء',           en: 'Electrical',         de: 'Elektrik',           icon: '💡' },
  { id: 'ac',          ar: 'تكييف وتبريد',     en: 'AC & Cooling',       de: 'Klimaanlage',        icon: '❄️' },
  { id: 'body',        ar: 'هيكل خارجي',       en: 'Body & Exterior',    de: 'Karosserie',         icon: '🚗' },
  { id: 'interior',    ar: 'تجهيزات داخلية',   en: 'Interior',           de: 'Innenraum',          icon: '🛋️' },
  { id: 'suspension',  ar: 'تعليق',            en: 'Suspension',         de: 'Fahrwerk',           icon: '🔩' },
];

const CONDITIONS = ['new', 'used', 'oem', 'aftermarket'];

// Mock search results
const MOCK_RESULTS = [
  {
    id: 1,
    partAr: 'فلتر هواء — تويوتا كورولا',
    partEn: 'Air Filter — Toyota Corolla',
    seller: 'محمد للقطع الأصلية',
    price: 350,
    condition: 'oem',
    city: 'القاهرة',
  },
  {
    id: 2,
    partAr: 'طقم فرامل أمامية',
    partEn: 'Front Brake Pad Set',
    seller: 'الخليج لقطع السيارات',
    price: 1200,
    condition: 'new',
    city: 'الرياض',
  },
  {
    id: 3,
    partAr: 'مكثف تكييف — هيونداي',
    partEn: 'AC Condenser — Hyundai',
    seller: 'قطع غيار النيل',
    price: 890,
    condition: 'used',
    city: 'الإسكندرية',
  },
];

// ─── Arabic-Indic numeral converter ─────────────────────────────────────────
const toArabicIndic = (num) =>
  String(num).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const formatNum = (num, useArabicIndic) =>
  useArabicIndic ? toArabicIndic(num) : String(num);

// ─── Condition badge colours ─────────────────────────────────────────────────
const CONDITION_COLORS = {
  new:         'bg-green-100 text-green-800',
  used:        'bg-yellow-100 text-yellow-800',
  oem:         'bg-blue-100  text-blue-800',
  aftermarket: 'bg-purple-100 text-purple-800',
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function CarPartsFinderWidget({
  lang: propLang = 'ar',
  onContactSeller,
  className = '',
}) {
  // ── State ──
  const [lang, setLang]             = useState(propLang);
  const [arabicNumerals, setArabicNumerals] = useState(lang === 'ar');
  const [selectedMake, setSelectedMake]     = useState('');
  const [model, setModel]                   = useState('');
  const [year, setYear]                     = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [loading, setLoading]               = useState(false);
  const [results, setResults]               = useState(null);

  const t   = T[lang] || T.ar;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  // ── Handlers ──
  const handleSearch = () => {
    setLoading(true);
    setResults(null);
    setTimeout(() => {
      setLoading(false);
      setResults(MOCK_RESULTS);
    }, 1200);
  };

  const handleLangChange = (l) => {
    setLang(l);
    setArabicNumerals(l === 'ar');
  };

  // ── Year options 1990–2026 ──
  const years = Array.from({ length: 2026 - 1990 + 1 }, (_, i) => 2026 - i);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      dir={dir}
      className={`font-sans bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', 'Segoe UI', sans-serif" }}
    >
      {/* ── Header & Lang Switcher ── */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t.title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex gap-1">
          {['ar', 'en', 'de'].map((l) => (
            <button
              key={l}
              onClick={() => handleLangChange(l)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                lang === l
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Arabic-Indic numeral toggle ── */}
      <div className="flex items-center gap-2 mb-5 mt-2">
        <button
          onClick={() => setArabicNumerals((v) => !v)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            arabicNumerals ? 'bg-orange-400' : 'bg-gray-300'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
              arabicNumerals ? (dir === 'rtl' ? 'right-0.5' : 'left-5') : (dir === 'rtl' ? 'right-5' : 'left-0.5')
            }`}
          />
        </button>
        <span className="text-xs text-gray-500">
          {t.numerals} — {arabicNumerals ? '١٢٣' : '123'}
        </span>
      </div>

      {/* ── Car Make Grid ── */}
      <label className="block text-sm font-semibold text-gray-700 mb-2">{t.selectMake}</label>
      <div className="grid grid-cols-5 gap-2 mb-4">
        {CAR_MAKES.map((make) => (
          <button
            key={make.id}
            onClick={() => setSelectedMake(make.id === selectedMake ? '' : make.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 text-xs font-medium transition-all ${
              selectedMake === make.id
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-300'
            }`}
          >
            <span className="text-xl mb-0.5">{make.icon}</span>
            {make.label}
          </button>
        ))}
      </div>

      {/* ── Model & Year row ── */}
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={t.modelPlaceholder}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="w-32 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">{t.allYears}</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {formatNum(y, arabicNumerals)}
            </option>
          ))}
        </select>
      </div>

      {/* ── Part Category Grid ── */}
      <label className="block text-sm font-semibold text-gray-700 mb-2">{t.partCategory}</label>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {PART_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id === selectedCategory ? '' : cat.id)}
            className={`flex flex-col items-center p-2 rounded-xl border-2 text-xs font-medium transition-all ${
              selectedCategory === cat.id
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-orange-300'
            }`}
          >
            <span className="text-lg mb-0.5">{cat.icon}</span>
            {cat[lang] || cat.en}
          </button>
        ))}
      </div>

      {/* ── Condition Filter ── */}
      <label className="block text-sm font-semibold text-gray-700 mb-2">{t.condition}</label>
      <div className="flex flex-wrap gap-2 mb-5">
        {CONDITIONS.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedCondition(c === selectedCondition ? '' : c)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${
              selectedCondition === c
                ? 'border-orange-500 bg-orange-500 text-white'
                : 'border-gray-200 text-gray-600 hover:border-orange-300'
            }`}
          >
            {t[c]}
          </button>
        ))}
      </div>

      {/* ── Search Button ── */}
      <button
        onClick={handleSearch}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold text-base transition-colors shadow-md"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {t.searching}
          </span>
        ) : (
          t.search
        )}
      </button>

      {/* ── Results ── */}
      {results !== null && (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-3">{t.results}</h3>
          {results.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">{t.noResults}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="border border-gray-200 rounded-xl p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {lang === 'ar' ? r.partAr : r.partEn}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.seller}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONDITION_COLORS[r.condition]}`}>
                        {t[r.condition]}
                      </span>
                      <span className="text-xs text-gray-400">📍 {r.city}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-lg font-bold text-orange-600">
                      {formatNum(r.price, arabicNumerals)} {t.egp}
                    </span>
                    <button
                      onClick={() => onContactSeller && onContactSeller(r)}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {t.contactSeller}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
