'use client';

import { useState } from 'react';

// Exchange rates relative to EGP (1 EGP = rate X of target currency)
const CURRENCIES = {
  EGP: { name: { ar: 'جنيه مصري', en: 'Egyptian Pound', de: 'Ägyptisches Pfund' }, symbol: 'ج.م', flag: '🇪🇬', rate: 1 },
  SAR: { name: { ar: 'ريال سعودي', en: 'Saudi Riyal', de: 'Saudischer Riyal' }, symbol: 'ر.س', flag: '🇸🇦', rate: 0.069 },
  AED: { name: { ar: 'درهم إماراتي', en: 'UAE Dirham', de: 'Dirham' }, symbol: 'د.إ', flag: '🇦🇪', rate: 0.068 },
  KWD: { name: { ar: 'دينار كويتي', en: 'Kuwaiti Dinar', de: 'Kuwaitischer Dinar' }, symbol: 'د.ك', flag: '🇰🇼', rate: 0.0057 },
  JOD: { name: { ar: 'دينار أردني', en: 'Jordanian Dinar', de: 'Jordanischer Dinar' }, symbol: 'د.أ', flag: '🇯🇴', rate: 0.013 },
  BHD: { name: { ar: 'دينار بحريني', en: 'Bahraini Dinar', de: 'Bahrain-Dinar' }, symbol: 'د.ب', flag: '🇧🇭', rate: 0.007 },
  QAR: { name: { ar: 'ريال قطري', en: 'Qatari Riyal', de: 'Katar-Riyal' }, symbol: 'ر.ق', flag: '🇶🇦', rate: 0.068 },
  MAD: { name: { ar: 'درهم مغربي', en: 'Moroccan Dirham', de: 'Marokkanischer Dirham' }, symbol: 'د.م', flag: '🇲🇦', rate: 0.183 },
  TND: { name: { ar: 'دينار تونسي', en: 'Tunisian Dinar', de: 'Tunesischer Dinar' }, symbol: 'د.ت', flag: '🇹🇳', rate: 0.057 },
  LYD: { name: { ar: 'دينار ليبي', en: 'Libyan Dinar', de: 'Libyscher Dinar' }, symbol: 'د.ل', flag: '🇱🇾', rate: 0.089 },
  DZD: { name: { ar: 'دينار جزائري', en: 'Algerian Dinar', de: 'Algerischer Dinar' }, symbol: 'د.ج', flag: '🇩🇿', rate: 2.51 },
  USD: { name: { ar: 'دولار أمريكي', en: 'US Dollar', de: 'US-Dollar' }, symbol: '$', flag: '🇺🇸', rate: 0.0186 },
  EUR: { name: { ar: 'يورو', en: 'Euro', de: 'Euro' }, symbol: '€', flag: '🇪🇺', rate: 0.0172 },
  GBP: { name: { ar: 'جنيه إسترليني', en: 'British Pound', de: 'Britisches Pfund' }, symbol: '£', flag: '🇬🇧', rate: 0.0147 },
};

const POPULAR = ['EGP', 'SAR', 'AED', 'KWD', 'USD', 'EUR'];

const LABELS = {
  ar: {
    title: 'محوّل العملات',
    subtitle: 'تحويل فوري بين عملات عربية وعالمية',
    from: 'من',
    to: 'إلى',
    rate: 'سعر الصرف التقريبي',
    disclaimer: '* الأسعار تقريبية للإرشاد فقط',
    lastUpdated: 'آخر تحديث: اليوم',
    popularCurrencies: 'الشائعة',
    allCurrencies: 'الكل',
    toggleNumerals: 'أرقام هندية',
    swap: 'تبديل',
    quickConvert: 'تحويل سريع',
  },
  en: {
    title: 'Currency Converter',
    subtitle: 'Instant conversion across Arab & world currencies',
    from: 'From',
    to: 'To',
    rate: 'Approximate Rate',
    disclaimer: '* Rates are approximate for guidance only',
    lastUpdated: 'Last updated: Today',
    popularCurrencies: 'Popular',
    allCurrencies: 'All',
    toggleNumerals: 'Arabic numerals',
    swap: 'Swap',
    quickConvert: 'Quick Convert',
  },
  de: {
    title: 'Währungsrechner',
    subtitle: 'Sofortumrechnung zwischen arabischen & Weltwährungen',
    from: 'Von',
    to: 'Nach',
    rate: 'Ungefährer Kurs',
    disclaimer: '* Kurse sind nur ungefähre Richtwerte',
    lastUpdated: 'Zuletzt aktualisiert: Heute',
    popularCurrencies: 'Beliebt',
    allCurrencies: 'Alle',
    toggleNumerals: 'Arabische Ziffern',
    swap: 'Tauschen',
    quickConvert: 'Schnell umrechnen',
  },
};

const toArabicNumerals = (str) =>
  String(str).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const fmt = (amount, useArabic, decimals = 2) => {
  const fixed =
    amount >= 100
      ? amount.toLocaleString('en-US', { maximumFractionDigits: decimals })
      : amount.toFixed(decimals);
  return useArabic ? toArabicNumerals(fixed) : fixed;
};

/**
 * LiveCurrencyConverterWidget
 *
 * Converts marketplace ad prices across major Arab and international currencies.
 *
 * Props:
 *   price        {number}  - Initial price to convert (default: 1000)
 *   fromCurrency {string}  - Source currency code (default: 'EGP')
 *   lang         {string}  - 'ar' | 'en' | 'de' (default: 'ar')
 *   className    {string}  - Additional Tailwind classes
 */
export default function LiveCurrencyConverterWidget({
  price = 1000,
  fromCurrency = 'EGP',
  lang = 'ar',
  className = '',
}) {
  const isRTL = lang === 'ar';
  const t = LABELS[lang] || LABELS.ar;

  const [from, setFrom] = useState(fromCurrency);
  const [to, setTo] = useState(fromCurrency === 'EGP' ? 'SAR' : 'EGP');
  const [inputPrice, setInputPrice] = useState(price);
  const [arabicNums, setArabicNums] = useState(isRTL);
  const [showAll, setShowAll] = useState(false);
  const [langState, setLangState] = useState(lang);

  const tCurrent = LABELS[langState] || LABELS.ar;
  const isRTLCurrent = langState === 'ar';

  // Convert: price in `from` → EGP equivalent → `to`
  const priceInEGP = inputPrice / CURRENCIES[from].rate;
  const converted = priceInEGP * CURRENCIES[to].rate;
  const exchangeRate = CURRENCIES[to].rate / CURRENCIES[from].rate;

  const handleSwap = () => {
    const prev = from;
    setFrom(to);
    setTo(prev);
  };

  const quickList = showAll
    ? Object.keys(CURRENCIES).filter((c) => c !== from)
    : POPULAR.filter((c) => c !== from);

  return (
    <div
      dir={isRTLCurrent ? 'rtl' : 'ltr'}
      className={`bg-white rounded-2xl shadow-md p-5 font-[Cairo,Tajawal,sans-serif] max-w-sm w-full ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{tCurrent.title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{tCurrent.subtitle}</p>
        </div>
        <span className="text-3xl select-none">💱</span>
      </div>

      {/* Language switcher */}
      <div className="flex gap-1 mb-4 justify-end">
        {['ar', 'en', 'de'].map((l) => (
          <button
            key={l}
            onClick={() => setLangState(l)}
            className={`text-xs px-2 py-1 rounded-lg border font-semibold transition-all ${
              langState === l
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'text-gray-500 border-gray-200 hover:border-emerald-300'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* From input */}
      <div className="mb-3">
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          {tCurrent.from}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={inputPrice}
            onChange={(e) => setInputPrice(Math.max(0, Number(e.target.value)))}
            className="flex-1 min-w-0 border border-gray-200 rounded-xl px-3 py-2 text-base font-bold text-gray-800 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            min={0}
          />
          <select
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              if (e.target.value === to) setTo(from);
            }}
            className="border border-gray-200 rounded-xl px-2 py-2 text-sm bg-gray-50 focus:outline-none cursor-pointer"
          >
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <option key={code} value={code}>
                {info.flag} {code}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {CURRENCIES[from].name[langState] || CURRENCIES[from].name.en}
        </p>
      </div>

      {/* Swap button */}
      <div className="flex justify-center my-3">
        <button
          onClick={handleSwap}
          title={tCurrent.swap}
          className="w-10 h-10 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-xl font-bold shadow-sm transition-all border border-emerald-200 hover:scale-105"
        >
          ⇅
        </button>
      </div>

      {/* To output */}
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          {tCurrent.to}
        </label>
        <div className="flex gap-2">
          <div className="flex-1 min-w-0 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-base font-bold text-emerald-700 flex items-center">
            {fmt(converted, arabicNums)}
          </div>
          <select
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              if (e.target.value === from) setFrom(to);
            }}
            className="border border-gray-200 rounded-xl px-2 py-2 text-sm bg-gray-50 focus:outline-none cursor-pointer"
          >
            {Object.entries(CURRENCIES).map(([code, info]) => (
              <option key={code} value={code}>
                {info.flag} {code}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {CURRENCIES[to].name[langState] || CURRENCIES[to].name.en}
        </p>
      </div>

      {/* Exchange rate display */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-3 mb-4 text-center border border-emerald-100">
        <p className="text-xs text-gray-500 mb-0.5">{tCurrent.rate}</p>
        <p className="text-sm font-semibold text-gray-800">
          1 {CURRENCIES[from].symbol}{' '}
          <span className="text-emerald-600">=</span>{' '}
          {fmt(exchangeRate, arabicNums, exchangeRate < 0.01 ? 4 : 3)}{' '}
          {CURRENCIES[to].symbol}
        </p>
      </div>

      {/* Quick convert grid */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-600">
            {tCurrent.quickConvert} — {fmt(inputPrice, arabicNums)}{' '}
            {CURRENCIES[from].symbol}
          </span>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-emerald-600 hover:underline font-medium"
          >
            {showAll ? tCurrent.popularCurrencies : tCurrent.allCurrencies}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-1">
          {quickList.map((code) => {
            const val = priceInEGP * CURRENCIES[code].rate;
            const isSelected = code === to;
            return (
              <button
                key={code}
                onClick={() => setTo(code)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-start transition-all w-full ${
                  isSelected
                    ? 'bg-emerald-100 border border-emerald-300 shadow-sm'
                    : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                }`}
              >
                <span className="text-sm text-gray-600 flex items-center gap-1.5">
                  <span>{CURRENCIES[code].flag}</span>
                  <span>{CURRENCIES[code].name[langState] || CURRENCIES[code].name.en}</span>
                </span>
                <span className="text-sm font-bold text-gray-800">
                  {fmt(val, arabicNums)}{' '}
                  <span className="text-xs text-gray-400 font-normal">
                    {CURRENCIES[code].symbol}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-400">{tCurrent.disclaimer}</p>
        <button
          onClick={() => setArabicNums(!arabicNums)}
          className={`text-xs px-2 py-1 rounded-lg border transition-all ${
            arabicNums
              ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
              : 'bg-gray-100 border-gray-200 text-gray-500'
          }`}
        >
          {tCurrent.toggleNumerals}
        </button>
      </div>
      <p className="text-xs text-gray-300 text-center mt-2">{tCurrent.lastUpdated}</p>
    </div>
  );
}
