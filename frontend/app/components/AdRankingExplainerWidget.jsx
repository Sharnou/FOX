"use client";
import { useState } from "react";

/**
 * AdRankingExplainerWidget
 * Explains XTOX ad ranking score to sellers:
 *   score = views×2 + chats×3 + reputation×5 + featuredBoost
 * Shows breakdown, tips to improve, and comparison vs top ads.
 * Props: adStats, lang (default 'ar'), className
 */

const T = {
  ar: {
    title: "درجة ترتيب إعلانك",
    subtitle: "كيف يحسب XTOX مرتبة إعلانك",
    totalScore: "إجمالي الدرجات",
    breakdown: "تفصيل الدرجات",
    views: "المشاهدات",
    chats: "المحادثات",
    reputation: "السمعة",
    featured: "إعلان مميز",
    multiplier: "×",
    points: "نقطة",
    tipsTitle: "كيف ترفع ترتيبك؟",
    tips: [
      "أضف صوراً عالية الجودة لزيادة المشاهدات",
      "أجب على الرسائل بسرعة لرفع نقاط المحادثة",
      "حافظ على سمعة 5 نجوم لأعلى تأثير",
      "رقِّ إعلانك إلى مميز للحصول على دفعة +500",
      "شارك الإعلان على واتساب لجذب المزيد",
    ],
    rankLabel: "ترتيبك بين",
    topAds: "أفضل الإعلانات",
    rankHelp: "الإعلانات ذات الدرجات الأعلى تظهر أولاً للمشترين",
    featuredBadge: "مميز",
    notFeatured: "عادي",
    boostBtn: "رقِّ إعلانك الآن",
    shareBtn: "شارك الإعلان",
    formula: "المعادلة",
    formulaText: "مشاهدات×2 + محادثات×3 + سمعة×5 + دفعة مميزة",
    lang: "AR",
    switchEn: "EN",
    switchDe: "DE",
  },
  en: {
    title: "Your Ad Ranking Score",
    subtitle: "How XTOX calculates your ad position",
    totalScore: "Total Score",
    breakdown: "Score Breakdown",
    views: "Views",
    chats: "Chats",
    reputation: "Reputation",
    featured: "Featured Boost",
    multiplier: "×",
    points: "pts",
    tipsTitle: "How to improve your rank?",
    tips: [
      "Add high-quality photos to boost views",
      "Reply quickly to chats to earn chat points",
      "Maintain a 5-star reputation for max impact",
      "Upgrade to Featured for a +500 point boost",
      "Share on WhatsApp to attract more buyers",
    ],
    rankLabel: "Your rank among",
    topAds: "top ads",
    rankHelp: "Higher-scored ads appear first for buyers",
    featuredBadge: "Featured",
    notFeatured: "Standard",
    boostBtn: "Boost Ad Now",
    shareBtn: "Share Ad",
    formula: "Formula",
    formulaText: "views×2 + chats×3 + reputation×5 + featuredBoost",
    lang: "EN",
    switchAr: "AR",
    switchDe: "DE",
  },
  de: {
    title: "Dein Anzeigen-Ranking",
    subtitle: "So berechnet XTOX deine Anzeigeposition",
    totalScore: "Gesamtpunktzahl",
    breakdown: "Aufschlüsselung",
    views: "Aufrufe",
    chats: "Chats",
    reputation: "Reputation",
    featured: "Featured-Bonus",
    multiplier: "×",
    points: "Pkt",
    tipsTitle: "Wie verbesserst du dein Ranking?",
    tips: [
      "Hochwertige Fotos hinzufügen für mehr Aufrufe",
      "Schnell auf Nachrichten antworten",
      "5-Sterne-Reputation für maximale Wirkung",
      "Featured-Upgrade für +500 Punkte",
      "Anzeige auf WhatsApp teilen",
    ],
    rankLabel: "Dein Rang unter",
    topAds: "Top-Anzeigen",
    rankHelp: "Anzeigen mit höheren Punkten erscheinen zuerst",
    featuredBadge: "Featured",
    notFeatured: "Standard",
    boostBtn: "Jetzt boosten",
    shareBtn: "Anzeige teilen",
    formula: "Formel",
    formulaText: "Aufrufe×2 + Chats×3 + Reputation×5 + Featured-Bonus",
    lang: "DE",
    switchAr: "AR",
    switchEn: "EN",
  },
};

const toArabicNumerals = (num) =>
  String(num).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

const DEFAULT_STATS = {
  views: 148,
  chats: 37,
  reputation: 4.2,
  isFeatured: false,
  categoryRank: 12,
  categoryTotal: 340,
};

export default function AdRankingExplainerWidget({
  adStats = DEFAULT_STATS,
  lang: initialLang = "ar",
  className = "",
}) {
  const [lang, setLang] = useState(initialLang);
  const [arabicNumerals, setArabicNumerals] = useState(initialLang === "ar");
  const [showFormula, setShowFormula] = useState(false);

  const t = T[lang] || T["ar"];
  const isRtl = lang === "ar";

  const {
    views = 0,
    chats = 0,
    reputation = 0,
    isFeatured = false,
    categoryRank = 1,
    categoryTotal = 100,
  } = adStats;

  const viewsScore = views * 2;
  const chatsScore = chats * 3;
  const repScore = Math.round(reputation * 5 * 10);
  const featuredBoost = isFeatured ? 500 : 0;
  const totalScore = viewsScore + chatsScore + repScore + featuredBoost;

  const fmt = (n) =>
    arabicNumerals ? toArabicNumerals(n) : n.toLocaleString();

  const rankPct = Math.round(((categoryTotal - categoryRank) / categoryTotal) * 100);

  const breakdown = [
    {
      label: t.views,
      raw: views,
      mult: 2,
      score: viewsScore,
      color: "bg-blue-500",
      icon: "👁",
    },
    {
      label: t.chats,
      raw: chats,
      mult: 3,
      score: chatsScore,
      color: "bg-green-500",
      icon: "💬",
    },
    {
      label: t.reputation,
      raw: reputation.toFixed(1),
      mult: 5,
      score: repScore,
      color: "bg-yellow-500",
      icon: "⭐",
    },
    {
      label: t.featured,
      raw: isFeatured ? "✓" : "✗",
      mult: null,
      score: featuredBoost,
      color: isFeatured ? "bg-purple-500" : "bg-gray-300",
      icon: "🚀",
    },
  ];

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-lg overflow-hidden max-w-md w-full ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-l from-indigo-600 to-purple-600 p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-bold">{t.title}</h2>
            <p className="text-indigo-200 text-sm mt-0.5">{t.subtitle}</p>
          </div>
          <div className="text-center bg-white/20 rounded-xl px-4 py-2">
            <div className="text-3xl font-black">{fmt(totalScore)}</div>
            <div className="text-xs text-indigo-200">{t.totalScore}</div>
          </div>
        </div>

        {/* Lang + numeral toggles */}
        <div className="flex gap-2 flex-wrap">
          {["ar", "en", "de"].map((l) => (
            <button
              key={l}
              onClick={() => {
                setLang(l);
                setArabicNumerals(l === "ar");
              }}
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition ${
                lang === l
                  ? "bg-white text-indigo-700"
                  : "bg-white/20 text-white hover:bg-white/30"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
          <button
            onClick={() => setArabicNumerals((p) => !p)}
            className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white hover:bg-white/30 transition"
          >
            {arabicNumerals ? "١٢٣" : "123"}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Featured badge */}
        <div className="flex items-center justify-between">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${
              isFeatured
                ? "bg-purple-100 text-purple-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            🚀 {isFeatured ? t.featuredBadge : t.notFeatured}
          </span>
          <span className="text-xs text-gray-400">{t.rankHelp}</span>
        </div>

        {/* Rank meter */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-1.5">
            <span>
              {t.rankLabel} {fmt(categoryTotal)} {t.topAds}
            </span>
            <span className="font-bold text-indigo-600">
              #{fmt(categoryRank)}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
              style={{ width: `${rankPct}%` }}
            />
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {fmt(rankPct)}% above other ads
          </div>
        </div>

        {/* Breakdown */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">
            {t.breakdown}
          </h3>
          <div className="space-y-2.5">
            {breakdown.map((item) => {
              const maxScore =
                item.label === t.featured
                  ? 500
                  : item.label === t.views
                  ? Math.max(viewsScore, 1) * 1.5
                  : item.label === t.chats
                  ? Math.max(chatsScore, 1) * 1.5
                  : Math.max(repScore, 1) * 1.5;
              const pct = Math.min(100, (item.score / (maxScore || 1)) * 100);

              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <div className="flex items-center gap-1.5">
                      <span>{item.icon}</span>
                      <span className="text-gray-700">{item.label}</span>
                      {item.mult && (
                        <span className="text-gray-400 text-xs">
                          ({fmt(item.raw)} {t.multiplier} {item.mult})
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-gray-800">
                      +{fmt(item.score)} {t.points}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${item.color} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Formula toggle */}
        <button
          onClick={() => setShowFormula((p) => !p)}
          className="w-full text-sm text-indigo-600 hover:text-indigo-800 font-medium text-center"
        >
          {showFormula ? "▲" : "▼"} {t.formula}
        </button>
        {showFormula && (
          <div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-800 text-center font-mono">
            {t.formulaText}
          </div>
        )}

        {/* Tips */}
        <div className="bg-amber-50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-amber-800 mb-2.5">
            💡 {t.tipsTitle}
          </h3>
          <ul className="space-y-1.5">
            {t.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                <span className="mt-0.5 text-amber-500">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action buttons */}
        {!isFeatured && (
          <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:opacity-90 transition">
            🚀 {t.boostBtn}
          </button>
        )}
        <button className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition">
          📤 {t.shareBtn}
        </button>
      </div>
    </div>
  );
}
