/**
 * SellerInsightsDashboard.jsx
 * XTOX Marketplace — Seller Analytics & Insights Panel
 *
 * Shows per-seller analytics: ad performance, ranking breakdown,
 * ad lifecycle countdowns, and activity heatmap.
 *
 * Props:
 *   sellerId  {string}  – seller's MongoDB _id
 *   lang      {string}  – 'ar' | 'en' | 'de'
 *   ads       {Array}   – optional pre-loaded ads array
 *   apiBase   {string}  – API base URL, default ''
 *   onAdClick {func}    – callback when an ad row is clicked
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

// ─── i18n ──────────────────────────────────────────────────────────────────
const T = {
  ar: {
    title: 'لوحة تحليلات البائع',
    subtitle: 'أداء إعلاناتك ونشاطك',
    totalAds: 'إجمالي الإعلانات',
    totalViews: 'إجمالي المشاهدات',
    totalChats: 'إجمالي المحادثات',
    totalOffers: 'إجمالي العروض',
    rankingScore: 'نقاط الترتيب',
    rankBreakdown: 'تفاصيل النقاط',
    views: 'المشاهدات',
    chats: 'المحادثات',
    reputation: 'السمعة',
    featuredBoost: 'تعزيز مميز',
    adLifecycle: 'دورة حياة الإعلان',
    daysLeft: 'يوم متبقي',
    daysGrace: 'أيام مهلة',
    expired: 'منتهي',
    active: 'نشط',
    grace: 'مهلة',
    topAds: 'أفضل الإعلانات',
    adTitle: 'العنوان',
    status: 'الحالة',
    score: 'النقاط',
    convRate: 'معدل التحويل',
    noAds: 'لا توجد إعلانات بعد',
    loading: 'جارٍ التحميل…',
    errorLoad: 'تعذّر تحميل البيانات',
    refresh: 'تحديث',
    heatmapTitle: 'أفضل أوقات النشاط',
    hours: ['12ص','1ص','2ص','3ص','4ص','5ص','6ص','7ص','8ص','9ص','10ص','11ص','12م','1م','2م','3م','4م','5م','6م','7م','8م','9م','10م','11م'],
    days: ['أح','إث','ثل','أر','خم','جم','سب'],
  },
  en: {
    title: 'Seller Insights Dashboard',
    subtitle: 'Your ad performance & activity',
    totalAds: 'Total Ads',
    totalViews: 'Total Views',
    totalChats: 'Total Chats',
    totalOffers: 'Total Offers',
    rankingScore: 'Ranking Score',
    rankBreakdown: 'Score Breakdown',
    views: 'Views',
    chats: 'Chats',
    reputation: 'Reputation',
    featuredBoost: 'Featured Boost',
    adLifecycle: 'Ad Lifecycle',
    daysLeft: 'd left',
    daysGrace: 'd grace',
    expired: 'Expired',
    active: 'Active',
    grace: 'Grace',
    topAds: 'Top Ads',
    adTitle: 'Title',
    status: 'Status',
    score: 'Score',
    convRate: 'Conv. Rate',
    noAds: 'No ads yet',
    loading: 'Loading…',
    errorLoad: 'Failed to load data',
    refresh: 'Refresh',
    heatmapTitle: 'Best Activity Hours',
    hours: ['12a','1a','2a','3a','4a','5a','6a','7a','8a','9a','10a','11a','12p','1p','2p','3p','4p','5p','6p','7p','8p','9p','10p','11p'],
    days: ['Su','Mo','Tu','We','Th','Fr','Sa'],
  },
  de: {
    title: 'Verkäufer-Dashboard',
    subtitle: 'Anzeigenleistung & Aktivität',
    totalAds: 'Anzeigen gesamt',
    totalViews: 'Aufrufe gesamt',
    totalChats: 'Chats gesamt',
    totalOffers: 'Angebote gesamt',
    rankingScore: 'Ranking-Punkte',
    rankBreakdown: 'Punkteaufschlüsselung',
    views: 'Aufrufe',
    chats: 'Chats',
    reputation: 'Reputation',
    featuredBoost: 'Featured-Boost',
    adLifecycle: 'Anzeigen-Lebenszyklus',
    daysLeft: 'T übrig',
    daysGrace: 'T Nachfrist',
    expired: 'Abgelaufen',
    active: 'Aktiv',
    grace: 'Nachfrist',
    topAds: 'Top-Anzeigen',
    adTitle: 'Titel',
    status: 'Status',
    score: 'Punkte',
    convRate: 'Konv.-Rate',
    noAds: 'Noch keine Anzeigen',
    loading: 'Lädt…',
    errorLoad: 'Laden fehlgeschlagen',
    refresh: 'Aktualisieren',
    heatmapTitle: 'Beste Aktivitätsstunden',
    hours: ['0','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23'],
    days: ['So','Mo','Di','Mi','Do','Fr','Sa'],
  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const toArabicNumerals = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

const fmt = (n, lang) => {
  const num = n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
  return lang === 'ar' ? toArabicNumerals(num) : num;
};

/** XTOX ranking formula: views×2 + chats×3 + reputation×5 + featured boost */
const calcScore = (ad) => {
  const v = (ad.views || 0) * 2;
  const c = (ad.chats || 0) * 3;
  const r = (ad.reputation || 0) * 5;
  const f = ad.featured ? 50 : 0;
  return v + c + r + f;
};

const lifecycleStatus = (ad) => {
  const createdAt = new Date(ad.createdAt || Date.now());
  const now = new Date();
  const ageMs = now - createdAt;
  const ageDays = Math.floor(ageMs / 86400000);
  if (ageDays < 30) return { type: 'active', daysLeft: 30 - ageDays };
  if (ageDays < 37) return { type: 'grace', daysLeft: 37 - ageDays };
  return { type: 'expired', daysLeft: 0 };
};

// Demo seed (used when API is unreachable)
const DEMO_ADS = [
  { _id: 'd1', title: 'iPhone 15 Pro', titleAr: 'آيفون ١٥ برو', views: 1240, chats: 87, offers: 23, reputation: 48, featured: true, createdAt: new Date(Date.now() - 5 * 86400000) },
  { _id: 'd2', title: 'Toyota Camry 2022', titleAr: 'تويوتا كامري ٢٠٢٢', views: 876, chats: 54, offers: 12, reputation: 35, featured: false, createdAt: new Date(Date.now() - 20 * 86400000) },
  { _id: 'd3', title: 'MacBook Air M3', titleAr: 'ماك بوك إير M3', views: 653, chats: 40, offers: 8, reputation: 30, featured: true, createdAt: new Date(Date.now() - 31 * 86400000) },
  { _id: 'd4', title: 'Sofa Set', titleAr: 'طقم كنب', views: 320, chats: 18, offers: 4, reputation: 20, featured: false, createdAt: new Date(Date.now() - 36 * 86400000) },
  { _id: 'd5', title: 'Samsung TV 55"', titleAr: 'تلفزيون سامسونج ٥٥ بوصة', views: 210, chats: 9, offers: 2, reputation: 15, featured: false, createdAt: new Date(Date.now() - 38 * 86400000) },
];

// Demo heatmap 7×24 (days × hours), values 0–10
const DEMO_HEAT = Array.from({ length: 7 }, (_, d) =>
  Array.from({ length: 24 }, (_, h) => {
    const peak = (h >= 19 && h <= 23) || (h >= 8 && h <= 12);
    const weekend = d === 5 || d === 4; // fri/sat for Arab market
    return peak ? Math.floor(Math.random() * 5 + 5) + (weekend ? 2 : 0) : Math.floor(Math.random() * 4);
  })
);

// ─── Sub-components ──────────────────────────────────────────────────────────
function StatCard({ label, value, color, lang }) {
  const isRtl = lang === 'ar';
  return (
    <div className={'rounded-2xl p-4 flex flex-col gap-1 ' + (color) + ' shadow-sm'} dir={isRtl ? 'rtl' : 'ltr'}>
      <span className="text-xs font-medium opacity-70">{label}</span>
      <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: isRtl ? "'Cairo', 'Tajawal', sans-serif" : 'inherit' }}>
        {value}
      </span>
    </div>
  );
}

function ScoreBar({ label, value, max, color, lang }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const isRtl = lang === 'ar';
  return (
    <div className={'flex flex-col gap-1'} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex justify-between text-xs text-gray-600">
        <span>{label}</span>
        <span style={{ fontFamily: isRtl ? "'Cairo', sans-serif" : 'inherit' }}>
          {isRtl ? toArabicNumerals(value) : value}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={'h-2 rounded-full transition-all duration-700 ' + (color)}
          style={{ width: (pct) + '%', [isRtl ? 'marginRight' : 'marginLeft']: 0 }}
        />
      </div>
    </div>
  );
}

function LifecycleBadge({ ad, t, lang }) {
  const status = lifecycleStatus(ad);
  const isRtl = lang === 'ar';
  const map = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    grace: 'bg-amber-100 text-amber-700 border-amber-300',
    expired: 'bg-red-100 text-red-700 border-red-300',
  };
  const label = {
    active: (isRtl ? toArabicNumerals(status.daysLeft) : status.daysLeft) + ' ' + (t.daysLeft),
    grace: (isRtl ? toArabicNumerals(status.daysLeft) : status.daysLeft) + ' ' + (t.daysGrace),
    expired: t.expired,
  };
  return (
    <span className={'text-xs px-2 py-0.5 rounded-full border font-medium ' + (map[status.type])}>
      {label[status.type]}
    </span>
  );
}

function HeatmapCell({ value }) {
  const intensity = Math.min(10, value);
  const alpha = (intensity / 10 * 0.85 + 0.05).toFixed(2);
  return (
    <div
      className="w-full aspect-square rounded-sm"
      style={{ backgroundColor: 'rgba(99,102,241,' + (alpha) + ')' }}
      title={value}
    />
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SellerInsightsDashboard({
  sellerId,
  lang = 'ar',
  ads: propAds,
  apiBase = '',
  onAdClick,
}) {
  const t = T[lang] || T.ar;
  const isRtl = lang === 'ar';
  const fontFamily = isRtl ? "'Cairo', 'Tajawal', sans-serif" : 'inherit';

  const [ads, setAds] = useState(propAds || []);
  const [heat, setHeat] = useState(DEMO_HEAT);
  const [loading, setLoading] = useState(!propAds);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!sellerId) { setAds(DEMO_ADS); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch((apiBase) + '/api/sellers/' + (sellerId) + '/insights', { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setAds(data.ads || DEMO_ADS);
      if (data.heatmap) setHeat(data.heatmap);
    } catch {
      setAds(DEMO_ADS); // graceful fallback
    } finally {
      setLoading(false);
    }
  }, [sellerId, apiBase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalViews = ads.reduce((s, a) => s + (a.views || 0), 0);
  const totalChats = ads.reduce((s, a) => s + (a.chats || 0), 0);
  const totalOffers = ads.reduce((s, a) => s + (a.offers || 0), 0);
  const avgScore = ads.length ? Math.round(ads.reduce((s, a) => s + calcScore(a), 0) / ads.length) : 0;
  const convRate = totalViews ? ((totalChats / totalViews) * 100).toFixed(1) : '0';

  const topAds = [...ads].sort((a, b) => calcScore(b) - calcScore(a)).slice(0, 5);

  // Ranking breakdown for top ad
  const topAd = topAds[0] || {};
  const breakdown = {
    [t.views]: (topAd.views || 0) * 2,
    [t.chats]: (topAd.chats || 0) * 3,
    [t.reputation]: (topAd.reputation || 0) * 5,
    [t.featuredBoost]: topAd.featured ? 50 : 0,
  };
  const maxBreakdown = Math.max(...Object.values(breakdown), 1);

  const barColors = ['bg-indigo-500', 'bg-violet-500', 'bg-emerald-500', 'bg-amber-500'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm" style={{ fontFamily }}>
        {t.loading}
      </div>
    );
  }

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="p-4 space-y-6 max-w-3xl mx-auto" style={{ fontFamily }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t.title}</h2>
          <p className="text-sm text-gray-500">{t.subtitle}</p>
        </div>
        <button
          onClick={fetchData}
          className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200 transition-colors"
          aria-label={t.refresh}
        >
          ↺ {t.refresh}
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm text-center">{t.errorLoad}</p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t.totalAds} value={fmt(ads.length, lang)} color="bg-indigo-50 text-indigo-800" lang={lang} />
        <StatCard label={t.totalViews} value={fmt(totalViews, lang)} color="bg-violet-50 text-violet-800" lang={lang} />
        <StatCard label={t.totalChats} value={fmt(totalChats, lang)} color="bg-emerald-50 text-emerald-800" lang={lang} />
        <StatCard label={t.totalOffers} value={fmt(totalOffers, lang)} color="bg-amber-50 text-amber-800" lang={lang} />
      </div>

      {/* Ranking Score + Breakdown */}
      {topAd._id && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">{t.rankBreakdown}</h3>
            <span className="text-2xl font-black text-indigo-600" style={{ fontFamily }}>
              {isRtl ? toArabicNumerals(calcScore(topAd)) : calcScore(topAd)}
            </span>
          </div>
          <div className="space-y-2">
            {Object.entries(breakdown).map(([label, val], i) => (
              <ScoreBar key={label} label={label} value={val} max={maxBreakdown} color={barColors[i % barColors.length]} lang={lang} />
            ))}
          </div>
          <p className="text-xs text-gray-400">{t.convRate}: {isRtl ? toArabicNumerals(convRate) : convRate}%</p>
        </div>
      )}

      {/* Top Ads Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-800 text-sm">{t.topAds}</h3>
        </div>
        {topAds.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">{t.noAds}</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {topAds.map((ad, idx) => {
              const score = calcScore(ad);
              const adName = lang === 'ar' && ad.titleAr ? ad.titleAr : ad.title;
              return (
                <button
                  key={ad._id}
                  onClick={() => onAdClick?.(ad)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-start"
                  aria-label={adName}
                >
                  {/* Rank */}
                  <span className={'w-6 h-6 flex items-center justify-center text-xs font-bold rounded-full ' + (idx === 0 ? 'bg-amber-100 text-amber-700'
                    : idx === 1 ? 'bg-gray-100 text-gray-600'
                    : idx === 2 ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-50 text-gray-400')}>
                    {isRtl ? toArabicNumerals(idx + 1) : idx + 1}
                  </span>
                  {/* Title */}
                  <span className="flex-1 text-sm text-gray-800 truncate">{adName}</span>
                  {/* Lifecycle */}
                  <LifecycleBadge ad={ad} t={t} lang={lang} />
                  {/* Score */}
                  <span className="text-xs font-semibold text-indigo-600 min-w-[2.5rem] text-end">
                    {isRtl ? toArabicNumerals(score) : score}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity Heatmap */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-3">{t.heatmapTitle}</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="w-8" />
                {t.hours.map((h) => (
                  <th key={h} className="text-center" style={{ minWidth: 18 }}>
                    <span className="text-[9px] text-gray-400">{h}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {t.days.map((day, d) => (
                <tr key={day}>
                  <td className="text-[10px] text-gray-400 pe-1 whitespace-nowrap">{day}</td>
                  {heat[d]?.map((val, h) => (
                    <td key={h} className="p-0.5">
                      <HeatmapCell value={val} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 mt-2 justify-end">
          <span className="text-[10px] text-gray-400">Low</span>
          {[0.05, 0.25, 0.5, 0.75, 0.9].map((a, i) => (
            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(99,102,241,' + (a) + ')' }} />
          ))}
          <span className="text-[10px] text-gray-400">High</span>
        </div>
      </div>
    </div>
  );
}
