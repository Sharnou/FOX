'use client';

import { useState, useEffect } from 'react';

// Arabic-Indic numeral converter
const toArabicIndic = (n) =>
  String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const i18n = {
  ar: {
    dir: 'rtl',
    title: 'صفقة جماعية',
    subtitle: 'انضم مع مشترين آخرين لتفعيل هذا السعر الخاص',
    originalPrice: 'السعر الأصلي',
    dealPrice: 'سعر الصفقة',
    savings: 'توفير',
    members: 'عضو',
    joined: 'انضم',
    target: 'المطلوب',
    joinBtn: 'انضم للصفقة',
    joinedBtn: 'أنت مشترك',
    leaveBtn: 'إلغاء الاشتراك',
    endsIn: 'تنتهي خلال',
    days: 'يوم',
    hours: 'ساعة',
    mins: 'دقيقة',
    secs: 'ثانية',
    activated: '🎉 تم تفعيل الصفقة!',
    activatedSub: 'وصلنا للعدد المطلوب! السعر الجديد مفعّل للجميع.',
    expired: 'انتهت الصفقة',
    progress: 'التقدم',
    waitingFor: 'ننتظر',
    moreMembers: 'عضو إضافي',
    shareToFill: 'شارك الإعلان لجذب المزيد من المشترين',
    percent: '٪',
  },
  en: {
    dir: 'ltr',
    title: 'Group Deal',
    subtitle: 'Join with other buyers to unlock this special price',
    originalPrice: 'Original Price',
    dealPrice: 'Deal Price',
    savings: 'Save',
    members: 'members',
    joined: 'joined',
    target: 'needed',
    joinBtn: 'Join Deal',
    joinedBtn: "You're In",
    leaveBtn: 'Leave Deal',
    endsIn: 'Ends in',
    days: 'd',
    hours: 'h',
    mins: 'm',
    secs: 's',
    activated: '🎉 Deal Activated!',
    activatedSub: 'Target reached! The deal price is now unlocked for all.',
    expired: 'Deal Expired',
    progress: 'Progress',
    waitingFor: 'Waiting for',
    moreMembers: 'more members',
    shareToFill: 'Share the ad to attract more buyers',
    percent: '%',
  },
  de: {
    dir: 'ltr',
    title: 'Gruppendeal',
    subtitle: 'Schließ dich anderen Käufern an, um diesen Sonderpreis freizuschalten',
    originalPrice: 'Originalpreis',
    dealPrice: 'Dealpreis',
    savings: 'Sparen',
    members: 'Mitglieder',
    joined: 'beigetreten',
    target: 'benötigt',
    joinBtn: 'Deal beitreten',
    joinedBtn: 'Du bist dabei',
    leaveBtn: 'Deal verlassen',
    endsIn: 'Endet in',
    days: 'T',
    hours: 'Std',
    mins: 'Min',
    secs: 'Sek',
    activated: '🎉 Deal aktiviert!',
    activatedSub: 'Ziel erreicht! Der Dealpreis ist jetzt für alle freigeschaltet.',
    expired: 'Deal abgelaufen',
    progress: 'Fortschritt',
    waitingFor: 'Warten auf',
    moreMembers: 'weitere Mitglieder',
    shareToFill: 'Teile die Anzeige, um mehr Käufer anzuziehen',
    percent: '%',
  },
};

const fmt = (num, lang) => {
  if (lang === 'ar') return toArabicIndic(num);
  return String(num);
};

const fmtPrice = (price, currency, lang) => {
  const p = lang === 'ar' ? toArabicIndic(Math.round(price)) : Math.round(price);
  return `${p} ${currency}`;
};

// Seed pseudo-random members count based on adId (stable across renders, social proof)
const seedMembers = (adId, target) => {
  let hash = 0;
  for (const c of String(adId)) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff;
  const base = Math.abs(hash) % Math.max(1, target - 1);
  return Math.max(1, base);
};

const AVATARS = ['👤', '🧑', '👩', '🧔', '👨', '👧', '🧒', '👦'];
const AVATAR_COLORS = [
  'bg-violet-500', 'bg-purple-500', 'bg-indigo-500', 'bg-fuchsia-500',
  'bg-pink-500', 'bg-sky-500', 'bg-teal-500', 'bg-orange-500',
];

export default function GroupDealWidget({
  adId,
  originalPrice = 1000,
  dealPrice = 750,
  currency = 'EGP',
  targetMembers = 5,
  endTime,
  lang: initialLang = 'ar',
  className = '',
}) {
  const [lang, setLang] = useState(initialLang);
  const t = i18n[lang] || i18n.ar;

  const storageKey = `xtox_groupdeal_${adId}`;
  const seedCount = seedMembers(adId, targetMembers);

  const [joined, setJoined] = useState(false);
  const [joinFlash, setJoinFlash] = useState(false);
  const [currentMembers, setCurrentMembers] = useState(seedCount);

  // End timestamp: provided endTime or 72 hours from now
  const endTs = endTime ? new Date(endTime).getTime() : Date.now() + 72 * 3600 * 1000;
  const [timeLeft, setTimeLeft] = useState(Math.max(0, endTs - Date.now()));

  // Load persisted join state
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
      if (saved.joined) {
        setJoined(true);
        setCurrentMembers(saved.members ?? seedCount + 1);
      }
    } catch { /* ignore */ }
  }, [adId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown ticker
  useEffect(() => {
    const iv = setInterval(() => {
      setTimeLeft(Math.max(0, endTs - Date.now()));
    }, 1000);
    return () => clearInterval(iv);
  }, [endTs]);

  const expired = timeLeft <= 0;
  const activated = currentMembers >= targetMembers;

  const totalSecs = Math.floor(timeLeft / 1000);
  const secs = totalSecs % 60;
  const mins = Math.floor(totalSecs / 60) % 60;
  const hours = Math.floor(totalSecs / 3600) % 24;
  const days = Math.floor(totalSecs / 86400);

  const progress = Math.min(100, Math.round((currentMembers / targetMembers) * 100));
  const savingsPct = Math.round(((originalPrice - dealPrice) / originalPrice) * 100);
  const needMore = Math.max(0, targetMembers - currentMembers);

  const handleJoin = () => {
    if (expired || joined) return;
    const newCount = Math.min(currentMembers + 1, targetMembers);
    setCurrentMembers(newCount);
    setJoined(true);
    setJoinFlash(true);
    setTimeout(() => setJoinFlash(false), 600);
    try {
      localStorage.setItem(storageKey, JSON.stringify({ joined: true, members: newCount }));
    } catch { /* ignore */ }
  };

  const handleLeave = () => {
    const newCount = Math.max(currentMembers - 1, 1);
    setCurrentMembers(newCount);
    setJoined(false);
    try {
      localStorage.removeItem(storageKey);
    } catch { /* ignore */ }
  };

  const pad2 = (n) => fmt(String(n).padStart(2, '0'), lang);

  return (
    <div
      dir={t.dir}
      className={`rounded-2xl overflow-hidden shadow-lg bg-white border border-gray-100 ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700&display=swap');`}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-5 py-4 text-white">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤝</span>
            <h3 className="text-lg font-extrabold tracking-wide">{t.title}</h3>
          </div>
          {/* Language switcher */}
          <div className="flex gap-1">
            {['ar', 'en', 'de'].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2 py-0.5 rounded-full text-xs transition-all ${
                  lang === l
                    ? 'bg-white text-purple-700 font-bold'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <p className="text-purple-200 text-xs">{t.subtitle}</p>
      </div>

      {/* Price Comparison Row */}
      <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100" style={{ direction: 'ltr' }}>
        <div className="py-3 px-4 text-center">
          <p className="text-xs text-gray-400 mb-0.5">{t.originalPrice}</p>
          <p className="text-sm font-bold text-gray-400 line-through">{fmtPrice(originalPrice, currency, lang)}</p>
        </div>
        <div className="py-3 px-4 text-center bg-violet-50">
          <p className="text-xs text-violet-500 font-bold mb-0.5">{t.dealPrice}</p>
          <p className="text-base font-extrabold text-violet-700">{fmtPrice(dealPrice, currency, lang)}</p>
        </div>
        <div className="py-3 px-4 text-center">
          <p className="text-xs text-emerald-500 font-bold mb-0.5">{t.savings}</p>
          <p className="text-base font-extrabold text-emerald-600">
            {fmt(savingsPct, lang)}{t.percent}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-4">

        {/* Activated Banner */}
        {activated && !expired && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-center">
            <p className="font-extrabold text-emerald-700 text-base">{t.activated}</p>
            <p className="text-emerald-600 text-xs mt-0.5">{t.activatedSub}</p>
          </div>
        )}

        {/* Expired Banner */}
        {expired && (
          <div className="rounded-xl bg-gray-100 border border-gray-200 px-4 py-3 text-center">
            <p className="font-bold text-gray-500 text-base">⏰ {t.expired}</p>
          </div>
        )}

        {/* Members Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">{t.progress}</span>
            <span className="text-xs font-bold text-violet-600">
              {fmt(currentMembers, lang)} / {fmt(targetMembers, lang)} {t.members}
            </span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden relative">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                activated
                  ? 'bg-emerald-500'
                  : 'bg-gradient-to-r from-violet-500 to-purple-500'
              }`}
              style={{ width: `${progress}%` }}
            />
            {/* Milestone markers at 25%, 50%, 75% */}
            {[25, 50, 75].map((m) => (
              <div
                key={m}
                className="absolute top-0 bottom-0 w-px bg-white/60"
                style={{ left: `${m}%` }}
              />
            ))}
          </div>
          {!activated && !expired && (
            <p className="text-xs text-gray-400 mt-1">
              {t.waitingFor} {fmt(needMore, lang)} {t.moreMembers} — {t.shareToFill}
            </p>
          )}
        </div>

        {/* Avatars Row */}
        <div className="flex items-center gap-1 flex-wrap">
          {Array.from({ length: Math.min(currentMembers, 8) }).map((_, i) => (
            <div
              key={i}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm text-white border-2 border-white shadow ${AVATAR_COLORS[i % 8]}`}
            >
              {AVATARS[i % 8]}
            </div>
          ))}
          {currentMembers > 8 && (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 border-2 border-white shadow">
              +{fmt(currentMembers - 8, lang)}
            </div>
          )}
          <span className="text-xs text-gray-400 ms-1">
            {fmt(currentMembers, lang)} {t.joined}
          </span>
        </div>

        {/* Countdown Timer */}
        {!expired && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
            <p className="text-xs text-gray-400 mb-2 text-center">{t.endsIn}</p>
            <div className="flex items-end justify-center gap-1" style={{ direction: 'ltr' }}>
              {[
                { val: days, label: t.days },
                { val: hours, label: t.hours },
                { val: mins, label: t.mins },
                { val: secs, label: t.secs },
              ].map(({ val, label }, i) => (
                <div key={i} className="flex items-end gap-1">
                  {i > 0 && <span className="text-gray-300 font-bold pb-5">:</span>}
                  <div className="text-center">
                    <div className="bg-violet-600 text-white rounded-lg px-2.5 py-1.5 min-w-[2.5rem]">
                      <span className="text-lg font-extrabold tabular-nums">{pad2(val)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join / Leave Button */}
        {!expired && (
          <div className="space-y-2">
            {!joined ? (
              <button
                onClick={handleJoin}
                className={`w-full py-3 rounded-xl font-extrabold text-base text-white transition-all duration-200 shadow-md active:scale-95 ${
                  joinFlash ? 'scale-95' : 'scale-100'
                } ${
                  activated
                    ? 'bg-emerald-500 hover:bg-emerald-600'
                    : 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700'
                }`}
              >
                {joinFlash ? '✓' : `🤝 ${t.joinBtn}`}
              </button>
            ) : (
              <div className="space-y-2">
                <div className="w-full py-3 rounded-xl font-extrabold text-base text-center bg-emerald-500 text-white shadow">
                  ✅ {t.joinedBtn}
                </div>
                <button
                  onClick={handleLeave}
                  className="w-full py-2 rounded-xl text-sm text-gray-400 hover:text-rose-500 hover:bg-rose-50 border border-gray-200 transition-all"
                >
                  {t.leaveBtn}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
