'use client';
import { useState } from 'react';

// SellerMilestoneWidget.jsx
// Tracks and displays seller achievement milestones and badges
// Props: adsCount, salesCount, rating, ratingCount, responseRate, memberSince, lang, className

const TRANSLATIONS = {
  ar: {
    title: 'إنجازاتك',
    subtitle: 'مسيرة البائع',
    milestones: 'المراحل المحققة',
    upcoming: 'المراحل القادمة',
    progress: 'التقدم',
    ads: 'إعلان',
    sales: 'مبيعة',
    rating: 'تقييم',
    responseRate: 'معدل الرد',
    memberSince: 'عضو منذ',
    unlocked: 'محقق',
    locked: 'غير محقق',
    needed: 'متبقي',
    badges: {
      firstAd: 'أول إعلان',
      tenAds: '١٠ إعلانات',
      fiftyAds: '٥٠ إعلان',
      firstSale: 'أول بيع',
      fiveSales: '٥ مبيعات',
      twentySales: '٢٠ مبيعة',
      hundredSales: '١٠٠ مبيعة',
      topRated: 'الأعلى تقييماً',
      quickResponder: 'رد سريع',
      trustedSeller: 'بائع موثوق',
      powerSeller: 'بائع محترف',
      veteran: 'عضو متمرس',
    },
    badgeDesc: {
      firstAd: 'نشرت أول إعلان لك',
      tenAds: 'نشرت ١٠ إعلانات',
      fiftyAds: 'نشرت ٥٠ إعلاناً',
      firstSale: 'أتممت أول صفقة',
      fiveSales: 'أتممت ٥ صفقات',
      twentySales: 'أتممت ٢٠ صفقة',
      hundredSales: 'بائع محترف بـ ١٠٠ صفقة',
      topRated: 'تقييم ٤.٥+ من ١٠ تقييمات',
      quickResponder: 'معدل رد ٩٠٪+',
      trustedSeller: '٢٠+ بيعة وتقييم ٤.٥+',
      powerSeller: '١٠٠+ بيعة وتقييم ٤.٨+',
      veteran: 'عضو منذ أكثر من سنة',
    },
  },
  en: {
    title: 'Your Achievements',
    subtitle: 'Seller Journey',
    milestones: 'Unlocked Milestones',
    upcoming: 'Upcoming Milestones',
    progress: 'Progress',
    ads: 'ad',
    sales: 'sale',
    rating: 'rating',
    responseRate: 'Response Rate',
    memberSince: 'Member Since',
    unlocked: 'Unlocked',
    locked: 'Locked',
    needed: 'needed',
    badges: {
      firstAd: 'First Ad',
      tenAds: '10 Ads',
      fiftyAds: '50 Ads',
      firstSale: 'First Sale',
      fiveSales: '5 Sales',
      twentySales: '20 Sales',
      hundredSales: '100 Sales',
      topRated: 'Top Rated',
      quickResponder: 'Quick Responder',
      trustedSeller: 'Trusted Seller',
      powerSeller: 'Power Seller',
      veteran: 'Veteran Member',
    },
    badgeDesc: {
      firstAd: 'Posted your first ad',
      tenAds: 'Posted 10 ads',
      fiftyAds: 'Posted 50 ads',
      firstSale: 'Completed first deal',
      fiveSales: 'Completed 5 deals',
      twentySales: 'Completed 20 deals',
      hundredSales: 'Power seller with 100 deals',
      topRated: '4.5+ rating with 10+ reviews',
      quickResponder: '90%+ response rate',
      trustedSeller: '20+ sales & 4.5+ rating',
      powerSeller: '100+ sales & 4.8+ rating',
      veteran: 'Member for over 1 year',
    },
  },
  de: {
    title: 'Deine Erfolge',
    subtitle: 'Verkäufer-Reise',
    milestones: 'Freigeschaltete Meilensteine',
    upcoming: 'Kommende Meilensteine',
    progress: 'Fortschritt',
    ads: 'Anzeige',
    sales: 'Verkauf',
    rating: 'Bewertung',
    responseRate: 'Antwortrate',
    memberSince: 'Mitglied seit',
    unlocked: 'Freigeschaltet',
    locked: 'Gesperrt',
    needed: 'noch nötig',
    badges: {
      firstAd: 'Erste Anzeige',
      tenAds: '10 Anzeigen',
      fiftyAds: '50 Anzeigen',
      firstSale: 'Erster Verkauf',
      fiveSales: '5 Verkäufe',
      twentySales: '20 Verkäufe',
      hundredSales: '100 Verkäufe',
      topRated: 'Top Bewertet',
      quickResponder: 'Schnelle Antwort',
      trustedSeller: 'Vertrauenswürdig',
      powerSeller: 'Power-Verkäufer',
      veteran: 'Veteran-Mitglied',
    },
    badgeDesc: {
      firstAd: 'Erste Anzeige geschaltet',
      tenAds: '10 Anzeigen geschaltet',
      fiftyAds: '50 Anzeigen geschaltet',
      firstSale: 'Erster Handel abgeschlossen',
      fiveSales: '5 Händel abgeschlossen',
      twentySales: '20 Händel abgeschlossen',
      hundredSales: 'Power-Verkäufer mit 100 Deals',
      topRated: '4,5+ Bewertung mit 10+ Rezensionen',
      quickResponder: '90%+ Antwortrate',
      trustedSeller: '20+ Verkäufe & 4,5+ Bewertung',
      powerSeller: '100+ Verkäufe & 4,8+ Bewertung',
      veteran: 'Mitglied seit über 1 Jahr',
    },
  },
};

function toArabicNumerals(num, lang) {
  if (lang !== 'ar') return String(num);
  return String(num).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

const BADGE_ICONS = {
  firstAd: '📝',
  tenAds: '📋',
  fiftyAds: '🗂️',
  firstSale: '🤝',
  fiveSales: '⭐',
  twentySales: '🌟',
  hundredSales: '💎',
  topRated: '🏆',
  quickResponder: '⚡',
  trustedSeller: '🛡️',
  powerSeller: '🚀',
  veteran: '🎖️',
};

const BADGE_COLORS = {
  firstAd: 'from-blue-400 to-blue-600',
  tenAds: 'from-cyan-400 to-cyan-600',
  fiftyAds: 'from-teal-400 to-teal-600',
  firstSale: 'from-green-400 to-green-600',
  fiveSales: 'from-emerald-400 to-emerald-600',
  twentySales: 'from-violet-400 to-violet-600',
  hundredSales: 'from-purple-500 to-purple-700',
  topRated: 'from-yellow-400 to-amber-500',
  quickResponder: 'from-orange-400 to-orange-600',
  trustedSeller: 'from-indigo-400 to-indigo-600',
  powerSeller: 'from-rose-500 to-pink-600',
  veteran: 'from-amber-500 to-yellow-600',
};

function getMilestones(t, adsCount, salesCount, rating, ratingCount, responseRate, memberSinceDate) {
  const monthsAsMember = memberSinceDate
    ? Math.floor((Date.now() - new Date(memberSinceDate).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  return [
    { key: 'firstAd',       unlocked: adsCount >= 1,   progress: Math.min(adsCount, 1),       total: 1,   needed: Math.max(0, 1 - adsCount) },
    { key: 'tenAds',        unlocked: adsCount >= 10,  progress: Math.min(adsCount, 10),      total: 10,  needed: Math.max(0, 10 - adsCount) },
    { key: 'fiftyAds',      unlocked: adsCount >= 50,  progress: Math.min(adsCount, 50),      total: 50,  needed: Math.max(0, 50 - adsCount) },
    { key: 'firstSale',     unlocked: salesCount >= 1,  progress: Math.min(salesCount, 1),     total: 1,   needed: Math.max(0, 1 - salesCount) },
    { key: 'fiveSales',     unlocked: salesCount >= 5,  progress: Math.min(salesCount, 5),     total: 5,   needed: Math.max(0, 5 - salesCount) },
    { key: 'twentySales',   unlocked: salesCount >= 20, progress: Math.min(salesCount, 20),    total: 20,  needed: Math.max(0, 20 - salesCount) },
    { key: 'hundredSales',  unlocked: salesCount >= 100, progress: Math.min(salesCount, 100),  total: 100, needed: Math.max(0, 100 - salesCount) },
    { key: 'topRated',      unlocked: rating >= 4.5 && ratingCount >= 10, progress: ratingCount >= 10 ? Math.min(rating * 2, 10) : Math.min(ratingCount, 10), total: 10, needed: ratingCount < 10 ? Math.max(0, 10 - ratingCount) : 0 },
    { key: 'quickResponder', unlocked: responseRate >= 90, progress: Math.min(responseRate, 90), total: 90, needed: Math.max(0, 90 - responseRate) },
    { key: 'trustedSeller', unlocked: salesCount >= 20 && rating >= 4.5, progress: Math.min(salesCount, 20), total: 20, needed: Math.max(0, 20 - salesCount) },
    { key: 'powerSeller',   unlocked: salesCount >= 100 && rating >= 4.8, progress: Math.min(salesCount, 100), total: 100, needed: Math.max(0, 100 - salesCount) },
    { key: 'veteran',       unlocked: monthsAsMember >= 12, progress: Math.min(monthsAsMember, 12), total: 12, needed: Math.max(0, 12 - monthsAsMember) },
  ];
}

function BadgeCard({ badgeKey, unlocked, progress, total, needed, t, lang }) {
  const pct = Math.round((progress / total) * 100);
  return (
    <div className={`rounded-2xl border p-4 transition-all ${unlocked ? 'border-transparent shadow-md' : 'border-gray-200 bg-gray-50 opacity-70'}`}>
      <div className="flex items-start gap-3" style={{ flexDirection: lang === 'ar' ? 'row-reverse' : 'row' }}>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${unlocked ? BADGE_COLORS[badgeKey] : 'from-gray-300 to-gray-400'} flex items-center justify-center text-2xl shadow`}>
          {BADGE_ICONS[badgeKey]}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center justify-between ${lang === 'ar' ? 'flex-row-reverse' : ''}`}>
            <p className={`font-bold text-sm ${unlocked ? 'text-gray-800' : 'text-gray-500'}`}>
              {t.badges[badgeKey]}
            </p>
            {unlocked && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✓ {t.unlocked}</span>
            )}
          </div>
          <p className={`text-xs text-gray-400 mt-0.5 ${lang === 'ar' ? 'text-right' : 'text-left'}`}>
            {t.badgeDesc[badgeKey]}
          </p>
          {!unlocked && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1" style={{ flexDirection: lang === 'ar' ? 'row-reverse' : 'row' }}>
                <span>{toArabicNumerals(progress, lang)} / {toArabicNumerals(total, lang)}</span>
                {needed > 0 && <span>{toArabicNumerals(needed, lang)} {t.needed}</span>}
              </div>
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${BADGE_COLORS[badgeKey]} transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SellerMilestoneWidget({
  adsCount = 3,
  salesCount = 1,
  rating = 4.2,
  ratingCount = 4,
  responseRate = 75,
  memberSince = null,
  lang: initialLang = 'ar',
  className = '',
}) {
  const [lang, setLang] = useState(initialLang);
  const t = TRANSLATIONS[lang] || TRANSLATIONS['ar'];
  const isRTL = lang === 'ar';

  const milestones = getMilestones(t, adsCount, salesCount, rating, ratingCount, responseRate, memberSince);
  const unlocked = milestones.filter(m => m.unlocked);
  const locked = milestones.filter(m => !m.unlocked);
  const totalPct = Math.round((unlocked.length / milestones.length) * 100);

  return (
    <div
      className={`bg-white rounded-3xl shadow-lg overflow-hidden font-[Cairo,Tajawal,sans-serif] ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      lang={lang}
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 px-6 py-5 text-white">
        <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div>
            <h2 className="text-xl font-extrabold">{t.title}</h2>
            <p className="text-indigo-200 text-sm">{t.subtitle}</p>
          </div>
          {/* Lang switcher */}
          <div className="flex gap-1 bg-white/20 rounded-xl p-1">
            {['ar', 'en', 'de'].map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold transition-all ${lang === l ? 'bg-white text-indigo-700' : 'text-white/70 hover:text-white'}`}
              >
                {l === 'ar' ? 'ع' : l === 'en' ? 'EN' : 'DE'}
              </button>
            ))}
          </div>
        </div>

        {/* Overall progress */}
        <div className="mt-3">
          <div className={`flex justify-between text-xs text-indigo-200 mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span>{t.progress}</span>
            <span>{toArabicNumerals(unlocked.length, lang)} / {toArabicNumerals(milestones.length, lang)}</span>
          </div>
          <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full transition-all"
              style={{ width: `${totalPct}%` }}
            />
          </div>
          <p className="text-xs text-indigo-200 mt-1 text-center">
            {toArabicNumerals(totalPct, lang)}%
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 bg-indigo-50 text-center" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
        {[
          { label: t.ads, value: adsCount },
          { label: t.sales, value: salesCount },
          { label: t.rating, value: rating.toFixed(1) },
        ].map(({ label, value }) => (
          <div key={label} className="py-3 px-2">
            <p className="text-xl font-extrabold text-indigo-700">{toArabicNumerals(value, lang)}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="p-5 space-y-6">
        {/* Unlocked */}
        {unlocked.length > 0 && (
          <section>
            <h3 className={`text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              🏅 {t.milestones} ({toArabicNumerals(unlocked.length, lang)})
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {unlocked.map(m => (
                <BadgeCard key={m.key} badgeKey={m.key} {...m} t={t} lang={lang} />
              ))}
            </div>
          </section>
        )}

        {/* Locked / upcoming */}
        {locked.length > 0 && (
          <section>
            <h3 className={`text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              🎯 {t.upcoming} ({toArabicNumerals(locked.length, lang)})
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {locked.map(m => (
                <BadgeCard key={m.key} badgeKey={m.key} {...m} t={t} lang={lang} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
