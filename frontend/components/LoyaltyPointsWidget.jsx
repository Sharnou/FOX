'use client';
import { useState, useEffect } from 'react';

const TIERS = {
  ar: ['برونزي', 'فضي', 'ذهبي', 'بلاتيني'],
  en: ['Bronze', 'Silver', 'Gold', 'Platinum'],
  de: ['Bronze', 'Silber', 'Gold', 'Platin'],
};

const TIER_COLORS = [
  { bg: 'from-amber-700 to-amber-500', text: 'text-amber-100', icon: '🥉' },
  { bg: 'from-slate-400 to-slate-300', text: 'text-slate-900', icon: '🥈' },
  { bg: 'from-yellow-500 to-yellow-300', text: 'text-yellow-900', icon: '🥇' },
  { bg: 'from-cyan-400 to-blue-500', text: 'text-white', icon: '💎' },
];

const TIER_THRESHOLDS = [0, 500, 1500, 3000];

const REWARDS = {
  ar: [
    { id: 1, name: 'تصدر مجاني', points: 200, icon: '⭐', desc: 'تصدر إعلانك لمدة 24 ساعة' },
    { id: 2, name: 'خصم ١٠٪', points: 350, icon: '🏷️', desc: 'خصم على رسوم الترويج' },
    { id: 3, name: 'شارة مميزة', points: 500, icon: '🏅', desc: 'شارة بائع مميز لأسبوع' },
    { id: 4, name: 'إعلان مجاني', points: 800, icon: '📢', desc: 'نشر إعلان مميز مجاناً' },
  ],
  en: [
    { id: 1, name: 'Free Boost', points: 200, icon: '⭐', desc: 'Boost your ad for 24 hours' },
    { id: 2, name: '10% Discount', points: 350, icon: '🏷️', desc: 'Discount on promotion fees' },
    { id: 3, name: 'Special Badge', points: 500, icon: '🏅', desc: 'Featured seller badge for a week' },
    { id: 4, name: 'Free Ad', points: 800, icon: '📢', desc: 'Post a featured ad for free' },
  ],
  de: [
    { id: 1, name: 'Gratis-Boost', points: 200, icon: '⭐', desc: 'Boost deine Anzeige für 24h' },
    { id: 2, name: '10% Rabatt', points: 350, icon: '🏷️', desc: 'Rabatt auf Werbegebühren' },
    { id: 3, name: 'Abzeichen', points: 500, icon: '🏅', desc: 'Top-Verkäufer-Abzeichen für 1 Woche' },
    { id: 4, name: 'Gratis-Anzeige', points: 800, icon: '📢', desc: 'Featured-Anzeige kostenlos' },
  ],
};

const HISTORY = {
  ar: [
    { id: 1, action: 'نشر إعلان', points: 50, time: 'منذ يومين' },
    { id: 2, action: 'إتمام صفقة', points: 150, time: 'منذ ٥ أيام' },
    { id: 3, action: 'تقييم مستلم', points: 30, time: 'منذ أسبوع' },
    { id: 4, action: 'استرداد مكافأة', points: -200, time: 'منذ أسبوعين' },
    { id: 5, action: 'تسجيل حساب', points: 100, time: 'منذ شهر' },
  ],
  en: [
    { id: 1, action: 'Ad posted', points: 50, time: '2 days ago' },
    { id: 2, action: 'Deal completed', points: 150, time: '5 days ago' },
    { id: 3, action: 'Review received', points: 30, time: '1 week ago' },
    { id: 4, action: 'Reward redeemed', points: -200, time: '2 weeks ago' },
    { id: 5, action: 'Account created', points: 100, time: '1 month ago' },
  ],
  de: [
    { id: 1, action: 'Anzeige erstellt', points: 50, time: 'vor 2 Tagen' },
    { id: 2, action: 'Deal abgeschlossen', points: 150, time: 'vor 5 Tagen' },
    { id: 3, action: 'Bewertung erhalten', points: 30, time: 'vor 1 Woche' },
    { id: 4, action: 'Prämie eingelöst', points: -200, time: 'vor 2 Wochen' },
    { id: 5, action: 'Konto erstellt', points: 100, time: 'vor 1 Monat' },
  ],
};

const LABELS = {
  ar: {
    title: 'نقاط الولاء',
    points: 'نقطة',
    tier: 'المستوى',
    nextTier: 'للمستوى التالي',
    rewards: 'المكافآت',
    history: 'السجل',
    redeem: 'استبدال',
    notEnough: 'نقاط غير كافية',
    tabs: ['المكافآت', 'السجل'],
    howToEarn: 'كيف تكسب نقاطاً؟',
    tips: ['نشر إعلان: +٥٠', 'إتمام صفقة: +١٥٠', 'تقييم: +٣٠', 'دعوة صديق: +١٠٠'],
  },
  en: {
    title: 'Loyalty Points',
    points: 'pts',
    tier: 'Tier',
    nextTier: 'to next tier',
    rewards: 'Rewards',
    history: 'History',
    redeem: 'Redeem',
    notEnough: 'Not enough points',
    tabs: ['Rewards', 'History'],
    howToEarn: 'How to earn points?',
    tips: ['Post an ad: +50', 'Complete a deal: +150', 'Receive review: +30', 'Refer a friend: +100'],
  },
  de: {
    title: 'Treuepunkte',
    points: 'Pkt.',
    tier: 'Stufe',
    nextTier: 'zur nächsten Stufe',
    rewards: 'Prämien',
    history: 'Verlauf',
    redeem: 'Einlösen',
    notEnough: 'Nicht genug Punkte',
    tabs: ['Prämien', 'Verlauf'],
    howToEarn: 'Wie Punkte sammeln?',
    tips: ['Anzeige erstellen: +50', 'Deal abschließen: +150', 'Bewertung erhalten: +30', 'Freund einladen: +100'],
  },
};

function toArabicIndic(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function formatPts(n, lang) {
  const abs = lang === 'ar' ? toArabicIndic(Math.abs(n)) : Math.abs(n);
  return n >= 0 ? `+${abs}` : `-${abs}`;
}

/**
 * LoyaltyPointsWidget
 *
 * Gamified loyalty points and rewards panel for XTOX marketplace.
 *
 * Props:
 *   userId    - unique user identifier (for localStorage key)
 *   lang      - 'ar' | 'en' | 'de'  (default: 'ar')
 *   className - extra Tailwind classes
 *
 * Usage:
 *   <LoyaltyPointsWidget userId={user._id} lang={lang} />
 */
export default function LoyaltyPointsWidget({ userId = 'guest', lang = 'ar', className = '' }) {
  const storageKey = `xtox_loyalty_${userId}`;
  const [points, setPoints] = useState(130);
  const [tab, setTab] = useState(0);
  const [redeemed, setRedeemed] = useState({});
  const [flash, setFlash] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const [currentLang, setCurrentLang] = useState(lang);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (saved.points !== undefined) setPoints(saved.points);
      if (saved.redeemed) setRedeemed(saved.redeemed);
    } catch (_) {}
  }, [storageKey]);

  const save = (newPoints, newRedeemed) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ points: newPoints, redeemed: newRedeemed }));
    } catch (_) {}
  };

  const Ll = LABELS[currentLang] || LABELS.ar;
  const isRTLc = currentLang === 'ar';

  const tierIdx = TIER_THRESHOLDS.reduce((acc, t, i) => (points >= t ? i : acc), 0);
  const nextTierPts = tierIdx < 3 ? TIER_THRESHOLDS[tierIdx + 1] : null;
  const tierPts = TIER_THRESHOLDS[tierIdx];
  const progress = nextTierPts
    ? Math.min(100, ((points - tierPts) / (nextTierPts - tierPts)) * 100)
    : 100;
  const tierColor = TIER_COLORS[tierIdx];
  const tierName = TIERS[currentLang]?.[tierIdx] || TIERS.ar[tierIdx];

  const handleRedeem = (reward) => {
    if (points < reward.points) return;
    const newPoints = points - reward.points;
    const newRedeemed = { ...redeemed, [reward.id]: (redeemed[reward.id] || 0) + 1 };
    setPoints(newPoints);
    setRedeemed(newRedeemed);
    save(newPoints, newRedeemed);
    setFlash(reward.id);
    setTimeout(() => setFlash(null), 1500);
  };

  const displayNum = (n) => (currentLang === 'ar' ? toArabicIndic(n) : n);

  return (
    <div
      dir={isRTLc ? 'rtl' : 'ltr'}
      className={`bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Gradient Header */}
      <div className={`bg-gradient-to-r ${tierColor.bg} p-5`}>
        <div className="flex items-center justify-between mb-3">
          <div className={`flex items-center gap-2 ${tierColor.text}`}>
            <span className="text-2xl">{tierColor.icon}</span>
            <div>
              <div className="text-xs opacity-80">{Ll.tier}</div>
              <div className="font-bold text-lg leading-tight">{tierName}</div>
            </div>
          </div>
          {/* Language switcher */}
          <div className="flex gap-1">
            {['ar', 'en', 'de'].map((l) => (
              <button
                key={l}
                onClick={() => setCurrentLang(l)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                  currentLang === l
                    ? 'bg-white/30 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {l === 'ar' ? 'ع' : l === 'en' ? 'EN' : 'DE'}
              </button>
            ))}
          </div>
        </div>

        {/* Points */}
        <div className={`text-center ${tierColor.text}`}>
          <div className="text-5xl font-black tracking-tight">{displayNum(points)}</div>
          <div className="text-sm opacity-80 mt-1">{Ll.points}</div>
        </div>

        {/* Progress bar to next tier */}
        {nextTierPts && (
          <div className="mt-4">
            <div className="flex justify-between text-xs opacity-80 mb-1">
              <span>{displayNum(points)}</span>
              <span>
                {displayNum(nextTierPts - points)} {Ll.nextTier}
              </span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/70 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {Ll.tabs.map((t, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              tab === i
                ? 'text-emerald-600 border-b-2 border-emerald-500'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Rewards Tab */}
      {tab === 0 && (
        <div className="p-4 space-y-3">
          {REWARDS[currentLang]?.map((reward) => {
            const canRedeem = points >= reward.points;
            const isFlash = flash === reward.id;
            return (
              <div
                key={reward.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isFlash
                    ? 'bg-emerald-50 border-emerald-300 scale-[1.02]'
                    : canRedeem
                    ? 'bg-white border-gray-200 hover:border-emerald-200'
                    : 'bg-gray-50 border-gray-100 opacity-60'
                }`}
              >
                <div className="text-2xl">{reward.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-800 text-sm">{reward.name}</div>
                  <div className="text-xs text-gray-500 truncate">{reward.desc}</div>
                  <div className="text-xs font-bold text-emerald-600 mt-0.5">
                    {displayNum(reward.points)} {Ll.points}
                  </div>
                </div>
                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={!canRedeem}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    canRedeem
                      ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {canRedeem ? Ll.redeem : Ll.notEnough}
                </button>
              </div>
            );
          })}

          {/* How to earn */}
          <button
            onClick={() => setShowTips((v) => !v)}
            className="w-full text-center text-sm text-emerald-600 font-semibold py-2 hover:underline"
          >
            {Ll.howToEarn} {showTips ? '▲' : '▼'}
          </button>
          {showTips && (
            <div className="bg-emerald-50 rounded-xl p-3 space-y-1">
              {Ll.tips.map((tip, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-emerald-700">
                  <span className="text-emerald-400">•</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 1 && (
        <div className="p-4 space-y-2">
          {HISTORY[currentLang]?.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
            >
              <div>
                <div className="font-semibold text-gray-800 text-sm">{item.action}</div>
                <div className="text-xs text-gray-400">{item.time}</div>
              </div>
              <span
                className={`font-bold text-sm ${
                  item.points >= 0 ? 'text-emerald-600' : 'text-rose-500'
                }`}
              >
                {formatPts(item.points, currentLang)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
