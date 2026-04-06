"use client";
import { useEffect, useState } from "react";

const LABELS = {
  ar: {
    analyzing: "جاري تحليل الأسعار...",
    insight: (city, count) => '💡 تحليل السعر — بناءً على ' + count + ' إعلان مشابه في ' + city,
    avg: "متوسط",
    low: "منخفض",
    high: "مرتفع",
    good: "✅ سعر تنافسي",
    warning: "⚠️ سعر مرتفع قد يُبطئ البيع",
  },
  en: {
    analyzing: "Analyzing prices...",
    insight: (city, count) => '💡 Price insight — based on ' + count + ' similar listings in ' + city,
    avg: "Avg",
    low: "Low",
    high: "High",
    good: "✅ Competitive price",
    warning: "⚠️ Price is high, may slow sale",
  },
  de: {
    analyzing: "Preise werden analysiert...",
    insight: (city, count) => '💡 Preisanalyse — basierend auf ' + count + ' ähnlichen Anzeigen in ' + city,
    avg: "Mittel",
    low: "Niedrig",
    high: "Hoch",
    good: "✅ Wettbewerbsfähiger Preis",
    warning: "⚠️ Preis hoch, könnte Verkauf verlangsamen",
  },
  fr: {
    analyzing: "Analyse des prix...",
    insight: (city, count) => '💡 Analyse du prix — basé sur ' + count + ' annonces similaires à ' + city,
    avg: "Moy",
    low: "Bas",
    high: "Élevé",
    good: "✅ Prix compétitif",
    warning: "⚠️ Prix élevé, peut ralentir la vente",
  },
};

export default function SmartPriceSuggester({ category, city, currentPrice, lang = "ar" }) {
  const [range, setRange] = useState(null);
  const [loading, setLoading] = useState(false);
  const t = LABELS[lang] || LABELS.ar;
  const isRTL = lang === "ar";

  useEffect(() => {
    if (!category || !city) return;
    const controller = new AbortController();
    setLoading(true);
    fetch('/api/price-suggest?category=' + encodeURIComponent(category) + '&city=' + encodeURIComponent(city), {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setRange(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [category, city]);

  if (!category || !city) return null;
  if (loading)
    return (
      <p className="text-sm text-gray-400 mt-2" dir={isRTL ? "rtl" : "ltr"}>
        {t.analyzing}
      </p>
    );
  if (!range) return null;

  const price = Number(currentPrice) || 0;
  const span = range.max - range.min || 1;
  const position = Math.min(100, Math.max(0, ((price - range.min) / span) * 100));
  const isHigh = price > range.avg * 1.25;
  const currency = range.currency || "ج.م";

  return (
    <div
      className="mt-3 p-3 bg-blue-50 rounded-xl border border-blue-200"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <p className="text-xs text-blue-700 font-bold mb-2">
        {t.insight(city, range.count)}
      </p>

      {/* Gradient Bar */}
      <div className="relative h-3 bg-gradient-to-r from-green-400 via-yellow-300 to-red-400 rounded-full mb-1">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-blue-600 rounded-full shadow-md transition-all duration-500"
          style={{ left: position + '%', transform: "translate(-50%, -50%)" }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500">
        <span>{range.min.toLocaleString()} {currency}</span>
        <span className="text-blue-700 font-semibold">
          {t.avg}: {range.avg.toLocaleString()} {currency}
        </span>
        <span>{range.max.toLocaleString()} {currency}</span>
      </div>

      {/* Advice */}
      {price > 0 && (
        <p className={'text-xs mt-2 font-medium ' + (isHigh ? "text-orange-600" : "text-green-700")}>
          {isHigh ? t.warning : t.good}
        </p>
      )}
    </div>
  );
}
