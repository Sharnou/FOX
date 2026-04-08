'use client';
import { useState, useEffect } from 'react';

// Hijri calendar approximation
function toHijri(date) {
  const jd = Math.floor((date.getTime() / 86400000) + 2440587.5);
  const z = jd;
  const a = Math.floor((z - 1867216.25) / 36524.25);
  const b = z + 1 + a - Math.floor(a / 4);
  const c = b + 1524;
  const d = Math.floor((c - 122.1) / 365.25);
  const e = Math.floor(365.25 * d);
  const f = Math.floor((c - e) / 30.6001);
  const day = c - e - Math.floor(30.6001 * f);
  const month = f < 14 ? f - 1 : f - 13;
  const year = month > 2 ? d - 4716 : d - 4715;
  // Convert to Hijri
  const jdEpoch = 1948438.5;
  const hijriJD = jd - jdEpoch;
  const hCycle = Math.floor((hijriJD - 1) / 10631);
  const hYear = hCycle * 30 + Math.floor(((hijriJD - hCycle * 10631) * 30) / 10631) + 1;
  const hMonth = Math.floor(((hijriJD - Math.floor((hYear - 1) * 10631 / 30)) * 12) / 354) + 1;
  const hDay = hijriJD - Math.floor((hYear - 1) * 10631 / 30) - Math.floor((hMonth - 1) * 354 / 12) + 1;
  return { year: Math.floor(hYear), month: Math.floor(hMonth), day: Math.floor(hDay) };
}

function getRamadanInfo(now) {
  const h = toHijri(now);
  const isRamadan = h.month === 9;
  const daysIntoRamadan = isRamadan ? h.day : 0;
  const daysUntilEid = isRamadan ? 30 - h.day : null;
  // Estimate days until next Ramadan (approx 354-day Hijri year)
  let daysUntilRamadan = null;
  if (!isRamadan) {
    const monthsUntil = h.month < 9 ? 9 - h.month : 12 - h.month + 9;
    daysUntilRamadan = monthsUntil * 29 - h.day + 1;
  }
  return { isRamadan, daysIntoRamadan, daysUntilEid, daysUntilRamadan, hijriDay: h.day, hijriMonth: h.month };
}

function toArabicNumerals(n) {
  return String(Math.abs(Math.floor(n))).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

const LANGS = {
  ar: {
    title: 'رمضان كريم 🌙',
    subtitleActive: 'نحن في شهر رمضان المبارك',
    subtitleUpcoming: 'رمضان قادم قريباً',
    dayOf: 'اليوم',
    daysLeft: 'يوم متبقي على العيد',
    daysUntil: 'يوم على رمضان',
    peakTime: 'أوقات التسوق الذروة',
    peakDesc: 'معظم المتسوقين نشطون بعد الإفطار (٨م - ١ص)',
    nowPeak: 'الآن وقت ذروة التسوق! 🔥',
    categories: 'تسوق رمضان',
    tips: 'نصائح البائع',
    tip1: 'انشر إعلانك بعد الإفطار لأعلى مشاهدات',
    tip2: 'أضف "هدية رمضان" في العنوان لزيادة النقرات',
    tip3: 'خفّض السعر قرب العيد لبيع أسرع',
    eidCountdown: 'العد التنازلي لعيد الفطر',
    days: 'أيام',
    hours: 'ساعات',
    minutes: 'دقائق',
    outside: 'رمضان لم يبدأ بعد',
    cats: ['مواد غذائية', 'ملابس العيد', 'هدايا', 'إلكترونيات', 'عطور', 'مفروشات'],
    catEmojis: ['🍽️', '👗', '🎁', '📱', '🌹', '🛋️'],
    dir: 'rtl',
    font: 'Cairo',
  },
  en: {
    title: 'Ramadan Kareem 🌙',
    subtitleActive: 'We are in the blessed month of Ramadan',
    subtitleUpcoming: 'Ramadan is coming soon',
    dayOf: 'Day',
    daysLeft: 'days until Eid',
    daysUntil: 'days to Ramadan',
    peakTime: 'Peak Shopping Times',
    peakDesc: 'Most shoppers are active after Iftar (8PM – 1AM)',
    nowPeak: 'Now is peak shopping time! 🔥',
    categories: 'Ramadan Shopping',
    tips: 'Seller Tips',
    tip1: 'Post your ad after Iftar for maximum views',
    tip2: 'Add "Ramadan gift" in title to increase clicks',
    tip3: 'Reduce price near Eid for faster sales',
    eidCountdown: 'Eid Al-Fitr Countdown',
    days: 'Days',
    hours: 'Hours',
    minutes: 'Minutes',
    outside: 'Ramadan has not started yet',
    cats: ['Food & Groceries', 'Eid Outfits', 'Gifts', 'Electronics', 'Perfumes', 'Furniture'],
    catEmojis: ['🍽️', '👗', '🎁', '📱', '🌹', '🛋️'],
    dir: 'ltr',
    font: 'Inter',
  },
  de: {
    title: 'Ramadan Kareem 🌙',
    subtitleActive: 'Wir befinden uns im gesegneten Ramadan',
    subtitleUpcoming: 'Ramadan kommt bald',
    dayOf: 'Tag',
    daysLeft: 'Tage bis Eid',
    daysUntil: 'Tage bis Ramadan',
    peakTime: 'Haupteinkaufszeiten',
    peakDesc: 'Die meisten Käufer sind nach Iftar aktiv (20–01 Uhr)',
    nowPeak: 'Jetzt ist Hochsaison! 🔥',
    categories: 'Ramadan-Einkäufe',
    tips: 'Verkäufer-Tipps',
    tip1: 'Schalte deine Anzeige nach Iftar für max. Sichtbarkeit',
    tip2: 'Füge "Ramadan-Geschenk" im Titel hinzu',
    tip3: 'Reduziere den Preis vor Eid für schnellere Verkäufe',
    eidCountdown: 'Eid Al-Fitr Countdown',
    days: 'Tage',
    hours: 'Std.',
    minutes: 'Min.',
    outside: 'Ramadan hat noch nicht begonnen',
    cats: ['Lebensmittel', 'Eid-Outfits', 'Geschenke', 'Elektronik', 'Parfüm', 'Möbel'],
    catEmojis: ['🍽️', '👗', '🎁', '📱', '🌹', '🛋️'],
    dir: 'ltr',
    font: 'Inter',
  },
};

function PeakTimeBar({ lang }) {
  const t = LANGS[lang] || LANGS.ar;
  const hour = new Date().getHours();
  const isPeak = hour >= 20 || hour < 1;
  const isDir = t.dir === 'rtl';
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-amber-700 mb-1" dir={t.dir}>{t.peakTime}</p>
      <p className="text-xs text-amber-600 mb-2" dir={t.dir}>{t.peakDesc}</p>
      <div className="flex gap-0.5 rounded overflow-hidden" dir="ltr">
        {hours.map(h => {
          const peak = h >= 20 || h < 1;
          const active = h === hour;
          return (
            <div
              key={h}
              title={`${h}:00`}
              className={`h-6 flex-1 rounded-sm transition-all ${
                active ? 'bg-amber-500 ring-1 ring-amber-700' :
                peak ? 'bg-amber-300' : 'bg-gray-200'
              }`}
            />
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-0.5" dir="ltr">
        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
      </div>
      {isPeak && (
        <div className="mt-2 text-center text-sm font-bold text-amber-700 animate-pulse" dir={t.dir}>
          {t.nowPeak}
        </div>
      )}
    </div>
  );
}

function EidCountdown({ daysUntilEid, lang }) {
  const t = LANGS[lang] || LANGS.ar;
  const isAr = lang === 'ar';
  const totalMs = daysUntilEid * 24 * 3600 * 1000;
  const [ms, setMs] = useState(totalMs);
  useEffect(() => {
    const iv = setInterval(() => setMs(m => Math.max(0, m - 1000)), 1000);
    return () => clearInterval(iv);
  }, [daysUntilEid]);
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const fmt = v => isAr ? toArabicNumerals(v) : String(v).padStart(2, '0');
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-purple-700 mb-2" dir={t.dir}>{t.eidCountdown}</p>
      <div className="flex gap-2 justify-center" dir="ltr">
        {[{ v: d, l: t.days }, { v: h, l: t.hours }, { v: m, l: t.minutes }].map(({ v, l }) => (
          <div key={l} className="flex flex-col items-center bg-purple-100 rounded-xl px-4 py-2 min-w-16">
            <span className="text-2xl font-bold text-purple-700" style={{ fontFamily: isAr ? 'Cairo' : 'Inter' }}>
              {fmt(v)}
            </span>
            <span className="text-xs text-purple-500" dir={t.dir}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryChips({ lang }) {
  const t = LANGS[lang] || LANGS.ar;
  const isAr = lang === 'ar';
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-green-700 mb-2" dir={t.dir}>{t.categories}</p>
      <div className={`flex flex-wrap gap-2 ${isAr ? 'flex-row-reverse' : ''}`}>
        {t.cats.map((cat, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer hover:bg-green-200 transition-colors" dir={t.dir}>
            <span>{t.catEmojis[i]}</span>
            <span>{cat}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function SellerTips({ lang }) {
  const t = LANGS[lang] || LANGS.ar;
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold text-blue-700 mb-2" dir={t.dir}>{t.tips}</p>
      <ul className={`space-y-1 ${t.dir === 'rtl' ? 'text-right' : 'text-left'}`}>
        {[t.tip1, t.tip2, t.tip3].map((tip, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-blue-600" dir={t.dir}>
            <span className="text-amber-500 mt-0.5">⭐</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RamadanFeaturesWidget({ lang = 'ar', country = 'EG', className = '' }) {
  const [activeLang, setActiveLang] = useState(lang);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(iv);
  }, []);
  const t = LANGS[activeLang] || LANGS.ar;
  const isAr = activeLang === 'ar';
  const info = getRamadanInfo(now);
  const fontFamily = isAr ? "'Cairo', 'Tajawal', sans-serif" : "'Inter', sans-serif";
  return (
    <div
      className={`bg-white rounded-2xl shadow-md border border-amber-100 overflow-hidden ${className}`}
      style={{ fontFamily, direction: t.dir }}
      dir={t.dir}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 px-4 py-4">
        <div className="flex items-center justify-between" dir="ltr">
          <div className={`flex-1 ${isAr ? 'text-right' : 'text-left'}`} dir={t.dir}>
            <h2 className="text-xl font-black text-white drop-shadow">{t.title}</h2>
            <p className="text-amber-100 text-sm mt-0.5">
              {info.isRamadan ? t.subtitleActive : t.subtitleUpcoming}
            </p>
          </div>
          <span className="text-4xl ml-2">🌙</span>
        </div>
        {/* Lang switcher */}
        <div className="flex gap-1 mt-3" dir="ltr">
          {Object.keys(LANGS).map(l => (
            <button
              key={l}
              onClick={() => setActiveLang(l)}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                activeLang === l
                  ? 'bg-white text-amber-600 shadow'
                  : 'bg-amber-400/50 text-white hover:bg-amber-400/80'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-1">
        {info.isRamadan ? (
          <>
            {/* Day indicator */}
            <div className="flex items-center justify-center gap-3 bg-amber-50 rounded-xl py-3" dir="ltr">
              <div className="text-center">
                <div className="text-3xl font-black text-amber-600" style={{ fontFamily }}>
                  {isAr ? toArabicNumerals(info.daysIntoRamadan) : info.daysIntoRamadan}
                </div>
                <div className="text-xs text-amber-500" dir={t.dir}>{t.dayOf}</div>
              </div>
              <div className="text-amber-300 text-2xl">✦</div>
              <div className="text-center">
                <div className="text-3xl font-black text-purple-600" style={{ fontFamily }}>
                  {isAr ? toArabicNumerals(info.daysUntilEid) : info.daysUntilEid}
                </div>
                <div className="text-xs text-purple-500" dir={t.dir}>{t.daysLeft}</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden" dir="ltr">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all"
                  style={{ width: `${(info.daysIntoRamadan / 30) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1" dir={t.dir === 'rtl' ? 'rtl' : 'ltr'}>
                <span>{isAr ? 'بداية رمضان' : 'Start'}</span>
                <span>{isAr ? 'عيد الفطر' : 'Eid'}</span>
              </div>
            </div>
            <EidCountdown daysUntilEid={info.daysUntilEid} lang={activeLang} />
            <PeakTimeBar lang={activeLang} />
            <CategoryChips lang={activeLang} />
            <SellerTips lang={activeLang} />
          </>
        ) : (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">🌙</div>
            <p className="text-gray-500 text-sm mb-2" dir={t.dir}>{t.outside}</p>
            {info.daysUntilRamadan !== null && (
              <div className="bg-amber-50 rounded-xl py-3 px-4 inline-block">
                <span className="text-3xl font-black text-amber-600" style={{ fontFamily }}>
                  {isAr ? toArabicNumerals(info.daysUntilRamadan) : info.daysUntilRamadan}
                </span>
                <span className="text-amber-500 text-sm mr-2 ml-2" dir={t.dir}>{t.daysUntil}</span>
              </div>
            )}
            <PeakTimeBar lang={activeLang} />
            <CategoryChips lang={activeLang} />
            <SellerTips lang={activeLang} />
          </div>
        )}
      </div>
    </div>
  );
}
