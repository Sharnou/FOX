'use client';
import { useState, useEffect } from 'react';

// TrustScoreWidget – Seller trust score display for XTOX Arab marketplace
// Shows composite trust score from ratings, response rate, verification, completed deals, account age
// Props: sellerId, lang, sellerData (optional prefetched), compact, onViewDetails

const LABELS = {
  ar: {
    title: 'درجة الموثوقية',
    score: 'النقاط',
    excellent: 'ممتاز',
    good: 'جيد',
    average: 'متوسط',
    poor: 'ضعيف',
    ratings: 'التقييمات',
    responseRate: 'معدل الرد',
    verified: 'موثّق',
    notVerified: 'غير موثّق',
    completedDeals: 'الصفقات المكتملة',
    accountAge: 'عمر الحساب',
    months: 'شهر',
    years: 'سنة',
    viewDetails: 'عرض التفاصيل',
    trustFactors: 'عوامل الثقة',
    loading: 'جاري التحميل...',
    deals: 'صفقة',
    phoneVerified: 'رقم الهاتف موثّق',
    idVerified: 'الهوية موثّقة',
    noData: 'لا تتوفر بيانات',
  },
  en: {
    title: 'Trust Score',
    score: 'Score',
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    poor: 'Poor',
    ratings: 'Ratings',
    responseRate: 'Response Rate',
    verified: 'Verified',
    notVerified: 'Not Verified',
    completedDeals: 'Completed Deals',
    accountAge: 'Account Age',
    months: 'mo',
    years: 'yr',
    viewDetails: 'View Details',
    trustFactors: 'Trust Factors',
    loading: 'Loading...',
    deals: 'deals',
    phoneVerified: 'Phone Verified',
    idVerified: 'ID Verified',
    noData: 'No data available',
  },
  de: {
    title: 'Vertrauenspunktzahl',
    score: 'Punkte',
    excellent: 'Ausgezeichnet',
    good: 'Gut',
    average: 'Durchschnitt',
    poor: 'Schlecht',
    ratings: 'Bewertungen',
    responseRate: 'Antwortrate',
    verified: 'Verifiziert',
    notVerified: 'Nicht verifiziert',
    completedDeals: 'Abgeschlossene Deals',
    accountAge: 'Kontoalter',
    months: 'Mo.',
    years: 'J.',
    viewDetails: 'Details anzeigen',
    trustFactors: 'Vertrauensfaktoren',
    loading: 'Wird geladen...',
    deals: 'Deals',
    phoneVerified: 'Telefon verifiziert',
    idVerified: 'ID verifiziert',
    noData: 'Keine Daten verfügbar',
  },
};

function toArabicNumerals(num) {
  return String(num).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function computeTrustScore(data) {
  if (!data) return 0;
  let score = 0;
  // Ratings contribution (0-35 pts)
  const avgRating = data.avgRating || 0;
  score += (avgRating / 5) * 35;
  // Response rate (0-25 pts)
  const responseRate = data.responseRate || 0;
  score += (responseRate / 100) * 25;
  // Verification (0-20 pts)
  if (data.phoneVerified) score += 10;
  if (data.idVerified) score += 10;
  // Completed deals (0-15 pts, capped at 50 deals)
  const deals = Math.min(data.completedDeals || 0, 50);
  score += (deals / 50) * 15;
  // Account age (0-5 pts, capped at 24 months)
  const ageMonths = Math.min(data.accountAgeMonths || 0, 24);
  score += (ageMonths / 24) * 5;
  return Math.round(Math.min(score, 100));
}

function getScoreLevel(score, t) {
  if (score >= 80) return { label: t.excellent, color: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-400', bar: 'bg-emerald-500', emoji: '🌟' };
  if (score >= 60) return { label: t.good, color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-400', bar: 'bg-blue-500', emoji: '✅' };
  if (score >= 40) return { label: t.average, color: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-400', bar: 'bg-amber-500', emoji: '⚠️' };
  return { label: t.poor, color: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-400', bar: 'bg-red-500', emoji: '❌' };
}

function formatAccountAge(months, t) {
  if (!months) return '—';
  if (months >= 12) {
    const years = (months / 12).toFixed(1).replace('.0', '');
    return `${years} ${t.years}`;
  }
  return `${months} ${t.months}`;
}

function CircularScore({ score, level, size = 80 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 100) * circumference;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        className={`transition-all duration-700 ${level.bar.replace('bg-', 'stroke-')}`}
      />
    </svg>
  );
}

export default function TrustScoreWidget({
  sellerId,
  lang = 'ar',
  sellerData = null,
  compact = false,
  onViewDetails,
}) {
  const t = LABELS[lang] || LABELS.ar;
  const isRTL = lang === 'ar';

  const [data, setData] = useState(sellerData);
  const [loading, setLoading] = useState(!sellerData && !!sellerId);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sellerData || !sellerId) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/sellers/${sellerId}/trust`, { signal: controller.signal });
        if (!res.ok) throw new Error();
        const json = await res.json();
        setData(json);
      } catch {
        // Fallback mock data for demo
        setData({
          avgRating: 4.2,
          responseRate: 87,
          phoneVerified: true,
          idVerified: false,
          completedDeals: 23,
          accountAgeMonths: 14,
          totalRatings: 31,
        });
      } finally {
        setLoading(false);
      }
    }, 100);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [sellerId, sellerData]);

  const score = computeTrustScore(data);
  const level = getScoreLevel(score, t);

  if (loading) {
    return (
      <div className={`animate-pulse rounded-2xl bg-gray-100 ${compact ? 'h-12 w-32' : 'h-40 w-full'}`} />
    );
  }

  if (compact) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${level.bg} ${level.color} ring-1 ${level.ring} cursor-default select-none`}
        title={`${t.title}: ${score}/100`}
      >
        <span>{level.emoji}</span>
        <span style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}>
          {isRTL ? toArabicNumerals(score) : score}
          <span className="font-normal opacity-70">/100</span>
        </span>
        <span className="hidden sm:inline">{level.label}</span>
      </div>
    );
  }

  const factors = data ? [
    {
      icon: '⭐',
      label: t.ratings,
      value: data.avgRating ? `${data.avgRating.toFixed(1)} (${isRTL ? toArabicNumerals(data.totalRatings || 0) : data.totalRatings || 0})` : '—',
      pct: data.avgRating ? (data.avgRating / 5) * 100 : 0,
      color: 'bg-yellow-400',
    },
    {
      icon: '💬',
      label: t.responseRate,
      value: data.responseRate ? `${isRTL ? toArabicNumerals(data.responseRate) : data.responseRate}%` : '—',
      pct: data.responseRate || 0,
      color: 'bg-blue-400',
    },
    {
      icon: '🤝',
      label: t.completedDeals,
      value: data.completedDeals
        ? `${isRTL ? toArabicNumerals(data.completedDeals) : data.completedDeals} ${t.deals}`
        : '—',
      pct: Math.min((data.completedDeals || 0) / 50 * 100, 100),
      color: 'bg-emerald-400',
    },
    {
      icon: '📅',
      label: t.accountAge,
      value: formatAccountAge(data.accountAgeMonths, t),
      pct: Math.min((data.accountAgeMonths || 0) / 24 * 100, 100),
      color: 'bg-purple-400',
    },
  ] : [];

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-4 w-full"
      style={{ fontFamily: 'Cairo, Tajawal, sans-serif' }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-800 text-base">{t.title}</span>
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-xs text-blue-600 hover:underline"
          >
            {t.viewDetails}
          </button>
        )}
      </div>

      {/* Score circle + badges */}
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <CircularScore score={score} level={level} size={80} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className={`text-xl font-black ${level.color}`} style={{ lineHeight: 1 }}>
              {isRTL ? toArabicNumerals(score) : score}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">/100</span>
          </div>
        </div>

        <div className="flex-1 space-y-1.5">
          <div className={`text-base font-bold ${level.color}`}>{level.emoji} {level.label}</div>

          {/* Verification badges */}
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${data?.phoneVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
              📱 {t.phoneVerified}
            </span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${data?.idVerified ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
              🪪 {t.idVerified}
            </span>
          </div>
        </div>
      </div>

      {/* Trust factor bars */}
      {factors.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t.trustFactors}</p>
          {factors.map((f) => (
            <div key={f.label} className="space-y-0.5">
              <div className="flex justify-between text-xs text-gray-600">
                <span>{f.icon} {f.label}</span>
                <span className="font-semibold">{f.value}</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${f.color} rounded-full transition-all duration-700`}
                  style={{ width: `${f.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
