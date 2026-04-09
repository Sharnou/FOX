"use client";
import { useState, useEffect, useCallback } from "react";

const TEXTS = {
  ar: {
    title: "أسعار الذهب اليوم",
    subtitle: "السعر لكل جرام",
    karat24: "ذهب 24 قيراط",
    karat21: "ذهب 21 قيراط",
    karat18: "ذهب 18 قيراط",
    karat14: "ذهب 14 قيراط",
    calculator: "حاسبة الذهب",
    grams: "الوزن بالجرام",
    totalValue: "القيمة الإجمالية",
    refresh: "تحديث",
    lastUpdated: "آخر تحديث",
    nextRefresh: "تحديث خلال",
    seconds: "ث",
    trending: { up: "ارتفاع", down: "انخفاض", stable: "مستقر" },
    currencies: { EGP: "جنيه مصري", SAR: "ريال سعودي", AED: "درهم إماراتي", USD: "دولار أمريكي" },
  },
  en: {
    title: "Gold Prices Today",
    subtitle: "Price per gram",
    karat24: "24K Gold",
    karat21: "21K Gold",
    karat18: "18K Gold",
    karat14: "14K Gold",
    calculator: "Gold Calculator",
    grams: "Weight (grams)",
    totalValue: "Total Value",
    refresh: "Refresh",
    lastUpdated: "Last updated",
    nextRefresh: "Next refresh in",
    seconds: "s",
    trending: { up: "Rising", down: "Falling", stable: "Stable" },
    currencies: { EGP: "Egyptian Pound", SAR: "Saudi Riyal", AED: "UAE Dirham", USD: "US Dollar" },
  },
  de: {
    title: "Goldpreise Heute",
    subtitle: "Preis pro Gramm",
    karat24: "24K Gold",
    karat21: "21K Gold",
    karat18: "18K Gold",
    karat14: "14K Gold",
    calculator: "Gold Rechner",
    grams: "Gewicht (Gramm)",
    totalValue: "Gesamtwert",
    refresh: "Aktualisieren",
    lastUpdated: "Zuletzt aktualisiert",
    nextRefresh: "Nächste Aktualisierung in",
    seconds: "s",
    trending: { up: "Steigend", down: "Fallend", stable: "Stabil" },
    currencies: { EGP: "Ägyptisches Pfund", SAR: "Saudi Riyal", AED: "VAE Dirham", USD: "US Dollar" },
  },
};

const BASE_USD_PER_OZ = 2340;
const TROY_OZ_TO_GRAM = 31.1035;
const EXCHANGE_RATES = { EGP: 48.5, SAR: 3.75, AED: 3.67, USD: 1 };
const KARAT_FACTORS = { 24: 1.0, 21: 0.875, 18: 0.75, 14: 0.585 };

function toArabicNumerals(num) {
  return String(num).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function formatPrice(price, useArabic) {
  const str = price.toFixed(2);
  return useArabic ? toArabicNumerals(str) : str;
}

function formatInt(n, useArabic) {
  return useArabic ? toArabicNumerals(n) : String(n);
}

const TREND_ICONS = { up: "▲", down: "▼", stable: "●" };

export default function GoldPriceTrackerWidget({
  lang = "ar",
  currency = "EGP",
  className = "",
}) {
  const [activeLang, setActiveLang] = useState(lang);
  const [activeCurrency, setActiveCurrency] = useState(currency);
  const [useArabicNumerals, setUseArabicNumerals] = useState(lang === "ar");
  const [variation, setVariation] = useState(0);
  const [trend, setTrend] = useState("stable");
  const [countdown, setCountdown] = useState(30);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [grams, setGrams] = useState("");

  const tx = TEXTS[activeLang] || TEXTS.ar;
  const rtl = activeLang === "ar";

  const refreshPrices = useCallback(() => {
    const delta = (Math.random() - 0.45) * 20;
    setVariation((v) => {
      setTrend(delta > 1 ? "up" : delta < -1 ? "down" : "stable");
      return v + delta;
    });
    setLastUpdated(new Date());
    setCountdown(30);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { refreshPrices(); return 30; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [refreshPrices]);

  const usdPerGram = (BASE_USD_PER_OZ + variation) / TROY_OZ_TO_GRAM;
  const rate = EXCHANGE_RATES[activeCurrency] || 1;
  const localPerGram = usdPerGram * rate;

  const karatPrices = Object.entries(KARAT_FACTORS).map(([k, f]) => ({
    karat: Number(k),
    price: localPerGram * f,
    label: tx[`karat${k}`],
  }));

  const calcValue =
    grams && !isNaN(Number(grams)) ? localPerGram * Number(grams) : null;

  const formatTime = (d) => {
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, "0");
    const hStr = useArabicNumerals ? toArabicNumerals(h) : h;
    const mStr = useArabicNumerals ? toArabicNumerals(m) : m;
    return `${hStr}:${mStr}`;
  };

  const currencies = ["EGP", "SAR", "AED", "USD"];
  const langs = ["ar", "en", "de"];

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-lg border border-yellow-100 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-white font-bold text-lg leading-tight">{tx.title}</div>
          <div className="text-yellow-100 text-xs mt-0.5">{tx.subtitle}</div>
        </div>
        <div className="text-4xl">🥇</div>
      </div>

      {/* Controls */}
      <div className="px-4 pt-3 pb-2 flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1">
          {langs.map((l) => (
            <button
              key={l}
              onClick={() => { setActiveLang(l); setUseArabicNumerals(l === "ar"); }}
              className={`px-2 py-0.5 rounded text-xs font-semibold border transition ${
                activeLang === l
                  ? "bg-yellow-500 text-white border-yellow-500"
                  : "bg-white text-gray-500 border-gray-200 hover:border-yellow-300"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
        <button
          onClick={() => setUseArabicNumerals((v) => !v)}
          className={`px-2 py-0.5 rounded text-xs border transition ${
            useArabicNumerals
              ? "bg-yellow-100 text-yellow-700 border-yellow-300"
              : "bg-white text-gray-400 border-gray-200"
          }`}
        >
          {useArabicNumerals ? "١٢٣" : "123"}
        </button>
      </div>

      {/* Currency tabs */}
      <div className="px-4 pb-3 flex gap-1.5 flex-wrap">
        {currencies.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCurrency(c)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
              activeCurrency === c
                ? "bg-yellow-500 text-white border-yellow-500 shadow"
                : "bg-gray-50 text-gray-500 border-gray-200 hover:border-yellow-300"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Trend banner */}
      <div
        className={`mx-4 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold ${
          trend === "up"
            ? "bg-red-50 text-red-600"
            : trend === "down"
            ? "bg-green-50 text-green-600"
            : "bg-gray-50 text-gray-500"
        }`}
      >
        <span className="text-base">{TREND_ICONS[trend]}</span>
        <span>{tx.trending[trend]}</span>
        <span className="ms-auto text-xs font-normal opacity-70">
          {tx.lastUpdated}: {formatTime(lastUpdated)}
        </span>
      </div>

      {/* Karat price cards */}
      <div className="px-4 grid grid-cols-2 gap-2 mb-4">
        {karatPrices.map(({ karat, price, label }) => (
          <div
            key={karat}
            className={`rounded-xl border p-3 ${
              karat === 24
                ? "border-yellow-300 bg-yellow-50"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <div className="text-xs text-gray-500 mb-0.5">{label}</div>
            <div className="text-lg font-bold text-gray-800">
              {formatPrice(price, useArabicNumerals)}
            </div>
            <div className="text-xs text-yellow-600 font-medium">{activeCurrency}</div>
          </div>
        ))}
      </div>

      {/* Calculator */}
      <div className="mx-4 mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
        <div className="text-sm font-semibold text-yellow-800 mb-2">
          ⚖️ {tx.calculator}
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            step="0.1"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            placeholder={tx.grams}
            className="flex-1 border border-yellow-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300"
          />
          <span className="text-xs text-gray-500">g</span>
        </div>
        {calcValue !== null && (
          <div className="mt-2 text-sm font-bold text-yellow-800">
            {tx.totalValue}:{" "}
            <span className="text-yellow-600">
              {formatPrice(calcValue, useArabicNumerals)} {activeCurrency}
            </span>
          </div>
        )}
      </div>

      {/* Footer refresh */}
      <div className="px-4 pb-4 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {tx.nextRefresh} {formatInt(countdown, useArabicNumerals)}
          {tx.seconds}
        </span>
        <button
          onClick={refreshPrices}
          className="px-3 py-1.5 rounded-lg bg-yellow-500 text-white text-xs font-semibold hover:bg-yellow-600 transition shadow"
        >
          🔄 {tx.refresh}
        </button>
      </div>
    </div>
  );
}
