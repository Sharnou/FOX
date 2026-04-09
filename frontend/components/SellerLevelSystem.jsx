'use client';
import { useState, useEffect } from 'react';

const LEVELS = [
  { key:'bronze', ar:'برونزي', en:'Bronze', de:'Bronze',  min:0,    max:499,      badge:'🥉', bg:'from-amber-700 to-amber-500',   ring:'ring-amber-400'  },
  { key:'silver', ar:'فضي',    en:'Silver', de:'Silber',  min:500,  max:1499,     badge:'🥈', bg:'from-slate-400 to-slate-300',   ring:'ring-slate-400'  },
  { key:'gold',   ar:'ذهبي',   en:'Gold',   de:'Gold',    min:1500, max:3499,     badge:'🥇', bg:'from-yellow-500 to-yellow-300', ring:'ring-yellow-400' },
  { key:'plat',   ar:'بلاتيني',en:'Platinum',de:'Platin', min:3500, max:7499,     badge:'💎', bg:'from-cyan-500 to-cyan-300',     ring:'ring-cyan-400'   },
  { key:'diamond',ar:'ماسي',   en:'Diamond', de:'Diamant',min:7500, max:Infinity, badge:'🌟', bg:'from-violet-600 to-pink-400',   ring:'ring-violet-400' },
];

const DEFAULT_ACHIEVEMENTS = [
  { id:'first_sale', icon:'🎉', ar:'أول بيعة',      en:'First Sale',      de:'Erster Verkauf',   xp:50,  done:true  },
  { id:'ten_sales',  icon:'🔟', ar:'١٠ مبيعات',     en:'10 Sales',        de:'10 Verkäufe',      xp:100, done:true  },
  { id:'top_rated',  icon:'⭐', ar:'بائع مميز',      en:'Top Rated',       de:'Bestbewertet',     xp:200, done:true  },
  { id:'fast_reply', icon:'⚡', ar:'رد سريع',        en:'Fast Replier',    de:'Schnelle Antwort', xp:75,  done:true  },
  { id:'hundred',    icon:'💯', ar:'١٠٠ مبيعة',     en:'100 Sales',       de:'100 Verkäufe',     xp:500, done:false },
  { id:'verified',   icon:'✅', ar:'موثوق',          en:'Verified',        de:'Verifiziert',      xp:150, done:false },
  { id:'one_year',   icon:'🗓️', ar:'١ سنة نشاط',   en:'1 Year Active',   de:'1 Jahr Aktiv',     xp:300, done:false },
  { id:'power',      icon:'🚀', ar:'بائع نشيط',      en:'Power Seller',    de:'Power-Verkäufer',  xp:400, done:false },
];

const DEFAULT_LOG = [
  { id:1, icon:'💬', ar:'رد على مشتري', en:'Replied to buyer',  xp:5,  ago:'١٠د' },
  { id:2, icon:'📦', ar:'إتمام بيع',    en:'Completed sale',    xp:30, ago:'٢س'  },
  { id:3, icon:'⭐', ar:'تقييم ٥ نجوم', en:'5-star rating',     xp:20, ago:'أمس'  },
  { id:4, icon:'🖼️', ar:'إضافة صورة',  en:'Added photo',       xp:5,  ago:'أمس'  },
  { id:5, icon:'🎯', ar:'إعلان مميز',   en:'Featured ad',       xp:15, ago:'٢ ي' },
];

const toAInd = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

/**
 * SellerLevelSystem — XP-based gamification level widget for XTOX sellers.
 *
 * Props:
 *   xp           {number}  — current seller XP (default 1820)
 *   sellerName   {string}  — seller display name
 *   sellerAvatar {string}  — avatar image URL
 *   lang         {string}  — 'ar' | 'en' | 'de'  (default 'ar')
 *   achievements {array}   — array of achievement objects (see DEFAULT_ACHIEVEMENTS)
 *   xpLog        {array}   — recent XP events (see DEFAULT_LOG)
 *   className    {string}  — extra Tailwind classes
 *
 * Usage:
 *   <SellerLevelSystem xp={seller.xp} sellerName={seller.name} sellerAvatar={seller.avatar} lang={lang} />
 */
export default function SellerLevelSystem({
  xp           = 1820,
  sellerName   = '',
  sellerAvatar = '',
  lang: initLang = 'ar',
  achievements = DEFAULT_ACHIEVEMENTS,
  xpLog        = DEFAULT_LOG,
  className    = '',
}) {
  const [lang,      setLang]   = useState(initLang);
  const [arabicNums,setArNums] = useState(initLang === 'ar');
  const [barW,      setBarW]   = useState(0);
  const [flash,     setFlash]  = useState(true);

  const isRTL = lang === 'ar';
  const fmt   = n => arabicNums ? toAInd(n) : String(n);
  const tr    = obj => obj[lang] ?? obj.ar;

  const lvlIdx = LEVELS.findIndex(l => xp >= l.min && xp <= l.max);
  const lvl    = LEVELS[Math.max(0, lvlIdx)];
  const next   = LEVELS[lvlIdx + 1];
  const pct    = next ? Math.round(((xp - lvl.min) / (next.min - lvl.min)) * 100) : 100;

  useEffect(() => {
    const t = setTimeout(() => setBarW(pct), 400);
    return () => clearTimeout(t);
  }, [pct]);

  useEffect(() => {
    const t = setTimeout(() => setFlash(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const UI = {
    title:  { ar:'مستوى البائع',          en:'Seller Level',        de:'Verkäuferlevel'      },
    pts:    { ar:'نقطة خبرة',             en:'XP Points',           de:'XP-Punkte'           },
    toNext: { ar:'نقطة للمستوى التالي',   en:'XP to next level',    de:'XP bis nächstes Lv.' },
    maxLv:  { ar:'أعلى مستوى!',           en:'Max Level!',          de:'Höchstes Level!'     },
    achiev: { ar:'الإنجازات',             en:'Achievements',         de:'Errungenschaften'    },
    recent: { ar:'نقاط حديثة',            en:'Recent XP',            de:'Aktuelle XP'         },
  };

  return (
    <div
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-lg overflow-hidden select-none ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Hero banner ── */}
      <div className={`relative bg-gradient-to-br ${lvl.bg} p-5 overflow-hidden`}>
        {flash && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <span className="text-6xl animate-ping opacity-20">{lvl.badge}</span>
          </div>
        )}

        {/* Avatar + level info */}
        <div className="relative z-10 flex items-center gap-4">
          {sellerAvatar
            ? <img src={sellerAvatar} alt="" className={`w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg ring-4 ${lvl.ring}`} />
            : <div className={`w-16 h-16 rounded-full bg-white/25 flex items-center justify-center text-4xl border-4 border-white shadow-lg ring-4 ${lvl.ring}`}>{lvl.badge}</div>
          }
          <div className="text-white">
            {sellerName && <p className="font-bold text-base leading-tight opacity-90">{sellerName}</p>}
            <p className="font-black text-2xl leading-tight">{tr(lvl)}</p>
            <p className="text-sm opacity-80">{fmt(xp)} {tr(UI.pts)}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative z-10 mt-4">
          <div className="flex justify-between text-xs text-white/75 mb-1">
            <span>{tr(lvl)}</span>
            <span>{next ? tr(next) : tr(UI.maxLv)}</span>
          </div>
          <div className="w-full h-3 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${barW}%` }}
            />
          </div>
          {next && (
            <p className="text-xs text-white/70 mt-1 text-center">
              {fmt(next.min - xp)} {tr(UI.toNext)}
            </p>
          )}
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50">
        <span className="text-sm font-bold text-gray-600">{tr(UI.title)}</span>
        <div className="flex gap-1">
          <button
            onClick={() => setArNums(p => !p)}
            className="text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-white transition-colors"
          >
            {arabicNums ? '123' : '١٢٣'}
          </button>
          {['ar', 'en', 'de'].map(l => (
            <button
              key={l}
              onClick={() => { setLang(l); setArNums(l === 'ar'); }}
              className={`text-xs px-2 py-1 rounded-full border transition-colors
                ${lang === l
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 text-gray-500 hover:bg-white'}`}
            >
              {l === 'ar' ? 'ع' : l === 'en' ? 'EN' : 'DE'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Level ladder ── */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          {LEVELS.map((lv, i) => (
            <div
              key={lv.key}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl border-2 transition-all
                ${i === lvlIdx  ? 'border-indigo-400 bg-indigo-50'
                : i < lvlIdx   ? 'border-green-200 bg-green-50'
                               : 'border-gray-100 bg-gray-50 opacity-40'}`}
            >
              <span className="text-xl">{lv.badge}</span>
              <span className={`text-xs font-semibold
                ${i === lvlIdx ? 'text-indigo-700' : i < lvlIdx ? 'text-green-700' : 'text-gray-400'}`}>
                {tr(lv)}
              </span>
              <span className="text-xs text-gray-400">{fmt(lv.min)}+</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Achievements grid ── */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h4 className="text-xs font-bold text-gray-500 mb-2">{tr(UI.achiev)}</h4>
        <div className="grid grid-cols-4 gap-2">
          {achievements.map(a => (
            <div
              key={a.id}
              title={tr(a)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all
                ${a.done
                  ? 'border-amber-200 bg-amber-50'
                  : 'border-gray-100 bg-gray-50 opacity-35 grayscale'}`}
            >
              <span className="text-xl">{a.icon}</span>
              <span className="text-xs text-gray-600 leading-tight line-clamp-1">{tr(a)}</span>
              <span className="text-xs font-bold text-amber-600">+{fmt(a.xp)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent XP log ── */}
      <div className="px-4 py-3">
        <h4 className="text-xs font-bold text-gray-500 mb-2">{tr(UI.recent)}</h4>
        <div className="space-y-2">
          {xpLog.map(e => (
            <div key={e.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">{e.icon}</span>
                <span className="text-sm text-gray-700">{tr(e)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{e.ago}</span>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  +{fmt(e.xp)} XP
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
