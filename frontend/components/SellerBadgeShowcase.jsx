'use client';
/**
 * SellerBadgeShowcase — Gamification achievement badge widget
 * Shows earned badges + locked badges with progress towards unlock
 * Props: sellerId, totalAds, totalSales, responseRate, memberSinceMonths,
 *        verifiedPhone, verifiedId, avgRating, totalReviews,
 *        lang (default 'ar'), className
 * Arabic-Indic numerals · Tri-lingual AR/EN/DE · Cairo/Tajawal · Tailwind · RTL-aware
 */

import { useState, useEffect } from 'react';

// ── Arabic-Indic numeral formatter ──────────────────────────────────────────
const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const fmt = (n, lang) =>
  lang === 'ar' ? toArabicIndic(n) : String(n);

// ── i18n strings ────────────────────────────────────────────────────────────
const T = {
  ar: {
    title: 'شارات البائع',
    earned: 'مكتسبة',
    locked: 'مقفلة',
    progress: 'تقدم',
    unlockAt: 'يُفتح عند',
    collapse: 'إخفاء',
    expand: 'عرض الشارات',
    badges: {
      newcomer:     { name: 'قادم جديد',       desc: 'انضم للمتجر',                     emoji: '🌱' },
      firstSale:    { name: 'أول صفقة',         desc: 'أتمّ أول عملية بيع',             emoji: '🤝' },
      activeSeller: { name: 'بائع نشيط',        desc: 'نشر ١٠ إعلانات',                 emoji: '🔥' },
      centurySeller:{ name: 'بائع المئة',        desc: 'نشر ١٠٠ إعلان',                  emoji: '💯' },
      quickReply:   { name: 'رد سريع',           desc: 'معدل رد ≥ ٨٠٪',                  emoji: '⚡' },
      superSeller:  { name: 'بائع متميز',        desc: 'أتمّ ٥٠ صفقة',                   emoji: '🏆' },
      trustedSeller:{ name: 'بائع موثوق',        desc: 'تحقق من الهاتف والهوية',         emoji: '✅' },
      veteran:      { name: 'بائع عتيق',         desc: 'عضو منذ أكثر من سنة',            emoji: '🎖️' },
      topRated:     { name: 'الأعلى تقييماً',   desc: 'تقييم ≥ ٤.٨ من ١٠٠ تقييم',     emoji: '⭐' },
      dealMaker:    { name: 'صانع الصفقات',     desc: 'أتمّ ٢٠٠ صفقة',                  emoji: '💼' },
    },
  },
  en: {
    title: 'Seller Badges',
    earned: 'Earned',
    locked: 'Locked',
    progress: 'Progress',
    unlockAt: 'Unlock at',
    collapse: 'Hide',
    expand: 'Show Badges',
    badges: {
      newcomer:     { name: 'Newcomer',      desc: 'Joined the marketplace',           emoji: '🌱' },
      firstSale:    { name: 'First Deal',    desc: 'Completed first sale',             emoji: '🤝' },
      activeSeller: { name: 'Active Seller', desc: 'Posted 10 listings',               emoji: '🔥' },
      centurySeller:{ name: 'Century Seller',desc: 'Posted 100 listings',              emoji: '💯' },
      quickReply:   { name: 'Quick Reply',   desc: 'Response rate ≥ 80%',              emoji: '⚡' },
      superSeller:  { name: 'Super Seller',  desc: 'Completed 50 sales',               emoji: '🏆' },
      trustedSeller:{ name: 'Trusted Seller',desc: 'Verified phone & ID',              emoji: '✅' },
      veteran:      { name: 'Veteran',       desc: 'Member for over 1 year',           emoji: '🎖️' },
      topRated:     { name: 'Top Rated',     desc: 'Rating ≥ 4.8 from 100 reviews',   emoji: '⭐' },
      dealMaker:    { name: 'Deal Maker',    desc: 'Completed 200 sales',              emoji: '💼' },
    },
  },
  de: {
    title: 'Verkäufer-Abzeichen',
    earned: 'Verdient',
    locked: 'Gesperrt',
    progress: 'Fortschritt',
    unlockAt: 'Freischalten bei',
    collapse: 'Verbergen',
    expand: 'Abzeichen anzeigen',
    badges: {
      newcomer:     { name: 'Neuankömmling',  desc: 'Dem Marktplatz beigetreten',      emoji: '🌱' },
      firstSale:    { name: 'Erster Deal',    desc: 'Ersten Verkauf abgeschlossen',    emoji: '🤝' },
      activeSeller: { name: 'Aktiver Verkäufer', desc: '10 Anzeigen gepostet',         emoji: '🔥' },
      centurySeller:{ name: 'Jahrhundert-Verkäufer', desc: '100 Anzeigen gepostet',   emoji: '💯' },
      quickReply:   { name: 'Schnelle Antwort', desc: 'Rücklaufquote ≥ 80%',          emoji: '⚡' },
      superSeller:  { name: 'Super-Verkäufer', desc: '50 Verkäufe abgeschlossen',     emoji: '🏆' },
      trustedSeller:{ name: 'Vertrauenswürdiger Verkäufer', desc: 'Telefon & ID verifiziert', emoji: '✅' },
      veteran:      { name: 'Veteran',        desc: 'Seit über 1 Jahr Mitglied',       emoji: '🎖️' },
      topRated:     { name: 'Top-Bewertet',   desc: 'Bewertung ≥ 4,8 von 100 Rezensionen', emoji: '⭐' },
      dealMaker:    { name: 'Deal-Macher',    desc: '200 Verkäufe abgeschlossen',      emoji: '💼' },
    },
  },
};

// ── Badge definitions (unlock criteria) ─────────────────────────────────────
const BADGE_DEFS = [
  {
    key: 'newcomer',
    unlocked: () => true, // always earned
    progressValue: () => 100,
    progressMax: 1,
    unlockHint: null,
    color: 'from-green-400 to-emerald-500',
    shadow: 'shadow-green-200',
  },
  {
    key: 'firstSale',
    unlocked: ({ totalSales }) => totalSales >= 1,
    progressValue: ({ totalSales }) => Math.min(totalSales, 1),
    progressMax: 1,
    unlockHint: { ar: 'إتمام صفقة واحدة', en: '1 sale', de: '1 Verkauf' },
    color: 'from-blue-400 to-cyan-500',
    shadow: 'shadow-blue-200',
  },
  {
    key: 'activeSeller',
    unlocked: ({ totalAds }) => totalAds >= 10,
    progressValue: ({ totalAds }) => Math.min(totalAds, 10),
    progressMax: 10,
    unlockHint: { ar: '١٠ إعلانات', en: '10 ads', de: '10 Anzeigen' },
    color: 'from-orange-400 to-red-500',
    shadow: 'shadow-orange-200',
  },
  {
    key: 'centurySeller',
    unlocked: ({ totalAds }) => totalAds >= 100,
    progressValue: ({ totalAds }) => Math.min(totalAds, 100),
    progressMax: 100,
    unlockHint: { ar: '١٠٠ إعلان', en: '100 ads', de: '100 Anzeigen' },
    color: 'from-purple-400 to-violet-500',
    shadow: 'shadow-purple-200',
  },
  {
    key: 'quickReply',
    unlocked: ({ responseRate }) => responseRate >= 80,
    progressValue: ({ responseRate }) => Math.min(responseRate, 80),
    progressMax: 80,
    unlockHint: { ar: 'معدل رد ٨٠٪', en: '80% reply rate', de: '80% Antwortrate' },
    color: 'from-yellow-400 to-amber-500',
    shadow: 'shadow-yellow-200',
  },
  {
    key: 'superSeller',
    unlocked: ({ totalSales }) => totalSales >= 50,
    progressValue: ({ totalSales }) => Math.min(totalSales, 50),
    progressMax: 50,
    unlockHint: { ar: '٥٠ صفقة', en: '50 sales', de: '50 Verkäufe' },
    color: 'from-pink-400 to-rose-500',
    shadow: 'shadow-pink-200',
  },
  {
    key: 'trustedSeller',
    unlocked: ({ verifiedPhone, verifiedId }) => verifiedPhone && verifiedId,
    progressValue: ({ verifiedPhone, verifiedId }) => (verifiedPhone ? 1 : 0) + (verifiedId ? 1 : 0),
    progressMax: 2,
    unlockHint: { ar: 'التحقق من الهاتف + الهوية', en: 'Phone + ID verified', de: 'Telefon + ID verifiziert' },
    color: 'from-teal-400 to-green-500',
    shadow: 'shadow-teal-200',
  },
  {
    key: 'veteran',
    unlocked: ({ memberSinceMonths }) => memberSinceMonths >= 12,
    progressValue: ({ memberSinceMonths }) => Math.min(memberSinceMonths, 12),
    progressMax: 12,
    unlockHint: { ar: '١٢ شهراً عضوية', en: '12 months membership', de: '12 Monate Mitgliedschaft' },
    color: 'from-indigo-400 to-blue-600',
    shadow: 'shadow-indigo-200',
  },
  {
    key: 'topRated',
    unlocked: ({ avgRating, totalReviews }) => avgRating >= 4.8 && totalReviews >= 100,
    progressValue: ({ totalReviews }) => Math.min(totalReviews, 100),
    progressMax: 100,
    unlockHint: { ar: 'تقييم ٤.٨+ من ١٠٠ مراجعة', en: '4.8+ rating from 100 reviews', de: '4,8+ Bewertung von 100 Rezensionen' },
    color: 'from-amber-400 to-yellow-500',
    shadow: 'shadow-amber-200',
  },
  {
    key: 'dealMaker',
    unlocked: ({ totalSales }) => totalSales >= 200,
    progressValue: ({ totalSales }) => Math.min(totalSales, 200),
    progressMax: 200,
    unlockHint: { ar: '٢٠٠ صفقة', en: '200 sales', de: '200 Verkäufe' },
    color: 'from-gray-600 to-gray-800',
    shadow: 'shadow-gray-300',
  },
];

// ── Component ────────────────────────────────────────────────────────────────
export default function SellerBadgeShowcase({
  sellerId = 'demo',
  totalAds = 0,
  totalSales = 0,
  responseRate = 0,
  memberSinceMonths = 0,
  verifiedPhone = false,
  verifiedId = false,
  avgRating = 0,
  totalReviews = 0,
  lang = 'ar',
  className = '',
}) {
  const isRTL = lang === 'ar';
  const t = T[lang] || T.ar;
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState('earned');
  const [animate, setAnimate] = useState(false);

  const sellerData = {
    totalAds,
    totalSales,
    responseRate,
    memberSinceMonths,
    verifiedPhone,
    verifiedId,
    avgRating,
    totalReviews,
  };

  const earnedBadges = BADGE_DEFS.filter((b) => b.unlocked(sellerData));
  const lockedBadges = BADGE_DEFS.filter((b) => !b.unlocked(sellerData));

  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const BadgeCard = ({ badge, earned }) => {
    const def = badge;
    const info = t.badges[def.key];
    const progressVal = def.progressValue(sellerData);
    const progressPct = Math.round((progressVal / def.progressMax) * 100);

    return (
      <div
        className={`
          relative rounded-2xl p-4 border transition-all duration-500
          ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          ${earned
            ? `bg-gradient-to-br ${def.color} text-white shadow-lg ${def.shadow}`
            : 'bg-gray-50 border-gray-200 text-gray-400 grayscale'
          }
        `}
      >
        {/* Emoji icon */}
        <div className={`text-3xl mb-2 ${earned ? '' : 'opacity-40'}`}>
          {info.emoji}
        </div>

        {/* Badge name */}
        <div className={`font-bold text-sm leading-tight mb-1 ${isRTL ? 'font-[Cairo]' : 'font-[Tajawal]'}`}>
          {info.name}
        </div>

        {/* Badge desc */}
        <div className={`text-xs opacity-80 mb-3 leading-snug ${isRTL ? 'font-[Cairo]' : ''}`}>
          {info.desc}
        </div>

        {/* Progress bar (for locked badges) */}
        {!earned && def.progressMax > 1 && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">{t.progress}</span>
              <span className="text-xs text-gray-600 font-semibold">
                {fmt(progressVal, lang)}/{fmt(def.progressMax, lang)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 transition-all duration-700"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            {def.unlockHint && (
              <div className="text-xs text-gray-400 mt-1">
                {t.unlockAt}: {def.unlockHint[lang] || def.unlockHint.en}
              </div>
            )}
          </div>
        )}

        {/* Earned checkmark */}
        {earned && (
          <div className="absolute top-2 right-2 bg-white bg-opacity-30 rounded-full w-5 h-5 flex items-center justify-center">
            <span className="text-xs">✓</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden ${className}`}
    >
      {/* Header */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🏅</span>
          <span className="font-bold text-base">{t.title}</span>
          <span className="bg-white bg-opacity-20 text-white text-xs font-bold rounded-full px-2 py-0.5">
            {fmt(earnedBadges.length, lang)}/{fmt(BADGE_DEFS.length, lang)}
          </span>
        </div>
        <span className="text-sm opacity-80">{open ? t.collapse : t.expand}</span>
      </button>

      {/* Body */}
      {open && (
        <div className="p-4">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {['earned', 'locked'].map((tabKey) => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  tab === tabKey
                    ? 'bg-indigo-600 text-white shadow'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {t[tabKey]}{' '}
                <span className="opacity-70">
                  ({fmt(tabKey === 'earned' ? earnedBadges.length : lockedBadges.length, lang)})
                </span>
              </button>
            ))}
          </div>

          {/* Badge grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(tab === 'earned' ? earnedBadges : lockedBadges).map((badge) => (
              <BadgeCard key={badge.key} badge={badge} earned={tab === 'earned'} />
            ))}
            {(tab === 'earned' ? earnedBadges : lockedBadges).length === 0 && (
              <div className="col-span-3 text-center text-gray-400 py-8 text-sm">
                {tab === 'earned'
                  ? (lang === 'ar' ? 'لم يتم اكتساب أي شارة بعد' : lang === 'de' ? 'Noch keine Abzeichen verdient' : 'No badges earned yet')
                  : (lang === 'ar' ? 'جميع الشارات مكتسبة 🎉' : lang === 'de' ? 'Alle Abzeichen verdient 🎉' : 'All badges earned 🎉')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
