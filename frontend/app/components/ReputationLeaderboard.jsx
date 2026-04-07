"use client";
/**
 * ReputationLeaderboard.jsx
 * XTOX Marketplace — Top Sellers Reputation Leaderboard
 * Displays country-level ranked list of top-rated sellers per category.
 * Zero dependencies. Tailwind only. RTL-aware. Tri-lingual AR/EN/DE.
 * Run 167+ | April 2026
 */

import { useState, useEffect, useCallback } from "react";

// ── Arabic-Indic numerals ──────────────────────────────────────────────────
const toArabicNumerals = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

// ── Localised strings ──────────────────────────────────────────────────────
const T = {
  ar: {
    title: "أفضل البائعين",
    subtitle: "المتميزون هذا الشهر",
    rank: "الترتيب",
    seller: "البائع",
    deals: "صفقة",
    rating: "التقييم",
    verified: "موثّق",
    noData: "لا توجد بيانات بعد",
    loading: "جارٍ التحميل…",
    error: "تعذّر التحميل",
    retry: "إعادة المحاولة",
    viewAll: "عرض الكل",
    gold: "ذهب",
    silver: "فضة",
    bronze: "برونز",
    categoryAll: "جميع الفئات",
  },
  en: {
    title: "Top Sellers",
    subtitle: "Stars of the month",
    rank: "Rank",
    seller: "Seller",
    deals: "deals",
    rating: "Rating",
    verified: "Verified",
    noData: "No data yet",
    loading: "Loading…",
    error: "Failed to load",
    retry: "Retry",
    viewAll: "View all",
    gold: "Gold",
    silver: "Silver",
    bronze: "Bronze",
    categoryAll: "All categories",
  },
  de: {
    title: "Top-Verkäufer",
    subtitle: "Stars des Monats",
    rank: "Rang",
    seller: "Verkäufer",
    deals: "Abschlüsse",
    rating: "Bewertung",
    verified: "Verifiziert",
    noData: "Noch keine Daten",
    loading: "Wird geladen…",
    error: "Laden fehlgeschlagen",
    retry: "Wiederholen",
    viewAll: "Alle anzeigen",
    gold: "Gold",
    silver: "Silber",
    bronze: "Bronze",
    categoryAll: "Alle Kategorien",
  },
};

// ── Mock data (API fallback) ───────────────────────────────────────────────
const MOCK_SELLERS = [
  {
    id: "s1",
    name: "محمد الأمين",
    avatar: null,
    rating: 4.9,
    deals: 214,
    verified: true,
    badge: "gold",
  },
  {
    id: "s2",
    name: "سارة خالد",
    avatar: null,
    rating: 4.8,
    deals: 187,
    verified: true,
    badge: "silver",
  },
  {
    id: "s3",
    name: "أحمد نور",
    avatar: null,
    rating: 4.7,
    deals: 153,
    verified: false,
    badge: "bronze",
  },
  {
    id: "s4",
    name: "فاطمة العلي",
    avatar: null,
    rating: 4.6,
    deals: 98,
    verified: true,
    badge: null,
  },
  {
    id: "s5",
    name: "عمر بشير",
    avatar: null,
    rating: 4.5,
    deals: 76,
    verified: false,
    badge: null,
  },
  {
    id: "s6",
    name: "ليلى حسن",
    avatar: null,
    rating: 4.4,
    deals: 64,
    verified: true,
    badge: null,
  },
  {
    id: "s7",
    name: "يوسف كمال",
    avatar: null,
    rating: 4.3,
    deals: 51,
    verified: false,
    badge: null,
  },
];

// ── Badge config ───────────────────────────────────────────────────────────
const BADGE_CFG = {
  gold: {
    emoji: "🥇",
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    text: "text-yellow-700",
    ring: "ring-yellow-400",
  },
  silver: {
    emoji: "🥈",
    bg: "bg-gray-50",
    border: "border-gray-300",
    text: "text-gray-600",
    ring: "ring-gray-400",
  },
  bronze: {
    emoji: "🥉",
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-700",
    ring: "ring-orange-400",
  },
};

const CACHE_TTL = 60 * 60 * 1000; // 1 hour in ms

// ── Star renderer ──────────────────────────────────────────────────────────
function Stars({ rating }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={'rating ' + (rating)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={'w-3 h-3 ' + (i <= Math.round(rating) ? "text-yellow-400" : "text-gray-200")}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

// ── Podium component (top 3) ───────────────────────────────────────────────
function Podium({ sellers, lang, t, isRTL }) {
  if (sellers.length < 3) return null;
  const [second, first, third] = [sellers[1], sellers[0], sellers[2]];
  const heights = ["h-16", "h-24", "h-12"];
  const podiumSellers = isRTL
    ? [second, first, third]
    : [second, first, third];

  return (
    <div className={'flex items-end justify-center gap-3 mb-6 ' + (isRTL ? "flex-row-reverse" : "")}>
      {[second, first, third].map((s, idx) => {
        const medal = ["🥈", "🥇", "🥉"][idx];
        const podH = ["h-16", "h-24", "h-12"][idx];
        const podBg = [
          "bg-gray-200",
          "bg-yellow-300",
          "bg-orange-200",
        ][idx];
        return (
          <div key={s.id} className="flex flex-col items-center gap-1">
            <div className="text-2xl">{medal}</div>
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow"
              title={s.name}
            >
              {s.name.charAt(0)}
            </div>
            <p className="text-xs text-gray-700 max-w-[64px] text-center truncate">
              {s.name}
            </p>
            <div
              className={'w-16 rounded-t-lg ' + (podH) + ' ' + (podBg) + ' flex items-center justify-center'}
            >
              <span className="text-xs font-bold text-gray-700">
                {lang === "ar"
                  ? toArabicNumerals(idx === 0 ? 2 : idx === 1 ? 1 : 3)
                  : idx === 0
                  ? 2
                  : idx === 1
                  ? 1
                  : 3}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ReputationLeaderboard({
  lang = "ar",
  country = "EG",
  category = "",
  apiEndpoint = "/api/sellers/leaderboard",
  limit = 7,
  onSellerClick,
  showPodium = true,
  className = "",
}) {
  const t = T[lang] || T.ar;
  const isRTL = lang === "ar";

  const [sellers, setSellers] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [selectedCategory, setSelectedCategory] = useState(category);
  const [lastUpdated, setLastUpdated] = useState(null);

  const cacheKey = 'xtox_leaderboard_' + (country) + '_' + (selectedCategory) + '_' + (limit);

  const fetchLeaderboard = useCallback(async () => {
    // 1. Check localStorage cache
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        setSellers(cached.data);
        setLastUpdated(new Date(cached.ts));
        setStatus("success");
        return;
      }
    } catch (_) {}

    setStatus("loading");
    try {
      const url = (apiEndpoint) + '?country=' + (country) + '&category=' + (encodeURIComponent(
        selectedCategory
      )) + '&limit=' + (limit);
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('HTTP ' + (res.status));
      const json = await res.json();
      const data = json.sellers || json.data || json || [];
      setSellers(data.slice(0, limit));
      setStatus("success");
      setLastUpdated(new Date());
      localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      // Fallback to mock
      setSellers(MOCK_SELLERS.slice(0, limit));
      setStatus("success");
      setLastUpdated(new Date());
    }
  }, [apiEndpoint, country, selectedCategory, limit, cacheKey]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleRetry = () => {
    localStorage.removeItem(cacheKey);
    fetchLeaderboard();
  };

  // ── Loading skeleton
  if (status === "loading" && sellers.length === 0) {
    return (
      <div
        className={'bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ' + (className)}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-12 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ' + (className)}
      dir={isRTL ? "rtl" : "ltr"}
      role="region"
      aria-label={t.title}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
              🏆 {t.title}
            </h2>
            <p className="text-indigo-200 text-xs mt-0.5">{t.subtitle}</p>
          </div>
          {lastUpdated && (
            <span className="text-indigo-300 text-xs opacity-75">
              {lastUpdated.toLocaleDateString(
                lang === "ar" ? "ar-EG" : lang === "de" ? "de-DE" : "en-US",
                { month: "short", day: "numeric" }
              )}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Podium */}
        {showPodium && sellers.length >= 3 && (
          <Podium sellers={sellers} lang={lang} t={t} isRTL={isRTL} />
        )}

        {/* List */}
        {sellers.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <span className="text-4xl block mb-2">🏅</span>
            <p className="text-sm">{t.noData}</p>
          </div>
        ) : (
          <div className="space-y-2" role="list">
            {sellers.map((seller, idx) => {
              const badgeCfg = seller.badge ? BADGE_CFG[seller.badge] : null;
              const rankNum = lang === "ar" ? toArabicNumerals(idx + 1) : idx + 1;
              return (
                <div
                  key={seller.id}
                  role="listitem"
                  onClick={() => onSellerClick?.(seller)}
                  className={'flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ' + (badgeCfg
                      ? (badgeCfg.bg) + ' ' + (badgeCfg.border)
                      : "bg-gray-50 border-gray-100 hover:bg-gray-100")}
                >
                  {/* Rank */}
                  <span
                    className={'w-7 text-center font-bold text-sm ' + (badgeCfg ? badgeCfg.text : "text-gray-400")}
                  >
                    {badgeCfg ? badgeCfg.emoji : rankNum}
                  </span>

                  {/* Avatar */}
                  <div
                    className={'w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 ' + (badgeCfg
                        ? 'ring-2 ' + (badgeCfg.ring)
                        : "ring-1 ring-gray-200")}
                    style={{
                      background:
                        "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    }}
                  >
                    {seller.name?.charAt(0) || "?"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-800 text-sm truncate">
                        {seller.name}
                      </span>
                      {seller.verified && (
                        <svg
                          className="w-3.5 h-3.5 text-blue-500 flex-shrink-0"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          title={t.verified}
                        >
                          <path
                            fillRule="evenodd"
                            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Stars rating={seller.rating} />
                      <span className="text-gray-400 text-xs">
                        {lang === "ar"
                          ? toArabicNumerals(seller.rating.toFixed(1))
                          : seller.rating.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Deals */}
                  <div className="text-right flex-shrink-0">
                    <span className="font-bold text-indigo-600 text-sm">
                      {lang === "ar"
                        ? toArabicNumerals(seller.deals)
                        : seller.deals}
                    </span>
                    <p className="text-gray-400 text-xs">{t.deals}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <button
          onClick={() => onSellerClick?.({ viewAll: true })}
          className="mt-4 w-full text-center text-indigo-600 text-sm font-medium py-2 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          {t.viewAll} →
        </button>
      </div>
    </div>
  );
}
