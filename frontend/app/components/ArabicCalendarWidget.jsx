"use client";
import { useState, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
//  ArabicCalendarWidget
//  Dual Hijri / Gregorian marketplace calendar
//  Shows Islamic holidays, Arab shopping seasons, optimal selling windows
//  Props:
//    lang       – "ar" | "en" | "de"  (default "ar")
//    className  – extra Tailwind classes
// ─────────────────────────────────────────────────────────────────────────────

const I18N = {
  ar: {
    title: "تقويم السوق العربي",
    hijri: "هجري",
    gregorian: "ميلادي",
    bestSell: "أفضل وقت للبيع",
    upcoming: "المناسبات القادمة",
    countdown: "باقي",
    days: "أيام",
    hours: "ساعات",
    mins: "دقائق",
    tips: "نصائح البيع",
    seasons: "مواسم التسوق",
    today: "اليوم",
    months: [
      "محرم","صفر","ربيع الأول","ربيع الثاني",
      "جمادى الأولى","جمادى الثانية","رجب","شعبان",
      "رمضان","شوال","ذو القعدة","ذو الحجة",
    ],
    gregorianMonths: [
      "يناير","فبراير","مارس","أبريل","مايو","يونيو",
      "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
    ],
    weekDays: ["أح","إث","ث","أر","خ","ج","س"],
  },
  en: {
    title: "Arab Market Calendar",
    hijri: "Hijri",
    gregorian: "Gregorian",
    bestSell: "Best Selling Window",
    upcoming: "Upcoming Events",
    countdown: "Remaining",
    days: "d",
    hours: "h",
    mins: "m",
    tips: "Selling Tips",
    seasons: "Shopping Seasons",
    today: "Today",
    months: [
      "Muharram","Safar","Rabi I","Rabi II",
      "Jumada I","Jumada II","Rajab","Sha'ban",
      "Ramadan","Shawwal","Dhu al-Qi'dah","Dhu al-Hijjah",
    ],
    gregorianMonths: [
      "January","February","March","April","May","June",
      "July","August","September","October","November","December",
    ],
    weekDays: ["Su","Mo","Tu","We","Th","Fr","Sa"],
  },
  de: {
    title: "Arabischer Marktkalender",
    hijri: "Hijri",
    gregorian: "Gregorianisch",
    bestSell: "Bestes Verkaufsfenster",
    upcoming: "Kommende Ereignisse",
    countdown: "Verbleibend",
    days: "T",
    hours: "Std",
    mins: "Min",
    tips: "Verkaufstipps",
    seasons: "Einkaufssaisons",
    today: "Heute",
    months: [
      "Muharram","Safar","Rabi I","Rabi II",
      "Jumada I","Jumada II","Rajab","Sha'ban",
      "Ramadan","Schawwal","Dhu al-Qi'dah","Dhu al-Hijjah",
    ],
    gregorianMonths: [
      "Januar","Februar","März","April","Mai","Juni",
      "Juli","August","September","Oktober","November","Dezember",
    ],
    weekDays: ["So","Mo","Di","Mi","Do","Fr","Sa"],
  },
};

// ── Hijri conversion (Kuwaiti algorithm) ──────────────────────────────────────
function toHijri(gDate) {
  let Y = gDate.getFullYear();
  let M = gDate.getMonth() + 1;
  let D = gDate.getDate();
  if (M < 3) { Y--; M += 12; }
  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const JD = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + D + B - 1524.5;
  const Z = Math.floor(JD + 0.5);
  const F = JD + 0.5 - Z;
  const alpha = Math.floor((Z - 1867216.25) / 36524.25);
  const A2 = Z + 1 + alpha - Math.floor(alpha / 4);
  const B2 = A2 + 1524;
  const C = Math.floor((B2 - 122.1) / 365.25);
  const D2 = Math.floor(365.25 * C);
  const E = Math.floor((B2 - D2) / 30.6001);
  const day = B2 - D2 - Math.floor(30.6001 * E);
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  // Hijri
  const jdh = JD - 1948439.5 + 32167;
  const n = Math.floor(jdh);
  const q = n - 29;
  const nMod = ((q % 10631) + 10631) % 10631;
  const hYear = Math.floor((30 * n + 10646) / 10631);
  const nY = n - Math.floor((10631 * hYear - 10616) / 30);
  const hMonth = Math.min(Math.floor((11 * nY + 330) / 325), 12);
  const hDay = nY - Math.floor((325 * hMonth - 320) / 11);
  return { day: hDay, month: hMonth, year: hYear };
}

// ── Market events (fixed Gregorian dates with yearly recurrence) ──────────────
const MARKET_EVENTS = [
  // Islamic holidays (approximate 2026 Gregorian dates – update yearly)
  { key: "ramadan",   month: 2,  day: 18, label: { ar: "رمضان 1447", en: "Ramadan 1447", de: "Ramadan 1447" }, color: "emerald", tip: { ar: "أعلى موسم تسوق – رفع أسعار الملابس والإلكترونيات", en: "Peak shopping – boost clothing & electronics prices", de: "Höchste Einkaufszeit – Preise für Kleidung & Elektronik erhöhen" } },
  { key: "eid_fitr",  month: 3,  day: 20, label: { ar: "عيد الفطر", en: "Eid al-Fitr", de: "Eid al-Fitr" }, color: "green", tip: { ar: "بيع الملابس الجديدة والهدايا – أسعار مرتفعة", en: "Sell new clothes & gifts – high prices", de: "Neue Kleidung & Geschenke verkaufen – hohe Preise" } },
  { key: "eid_adha",  month: 5,  day: 27, label: { ar: "عيد الأضحى", en: "Eid al-Adha", de: "Eid al-Adha" }, color: "teal", tip: { ar: "الأجهزة المنزلية والملابس تُباع جيداً", en: "Home appliances & clothes sell well", de: "Haushaltsgeräte & Kleidung gut verkäuflich" } },
  { key: "national_eg", month: 7, day: 23, label: { ar: "ثورة يوليو – مصر", en: "Egypt Revolution Day", de: "Ägypten Revolutionstag" }, color: "red", tip: { ar: "موسم الأجهزة والمفروشات في مصر", en: "Egyptian appliances & furniture season", de: "Ägyptische Haushalts & Möbelsaison" } },
  { key: "back_school", month: 9, day: 1, label: { ar: "العودة للمدارس", en: "Back to School", de: "Schulbeginn" }, color: "blue", tip: { ar: "القرطاسية والكتب والحقائب تُباع بسرعة", en: "Stationery, books & bags sell fast", de: "Schreibwaren, Bücher & Taschen schnell verkäuflich" } },
  { key: "national_sa", month: 9, day: 23, label: { ar: "اليوم الوطني السعودي", en: "Saudi National Day", de: "Saudi Nationalfeiertag" }, color: "yellow", tip: { ar: "إلكترونيات وإكسسوارات السيارات – موسم ذهبي في السعودية", en: "Electronics & car accessories – golden season in KSA", de: "Elektronik & Autozubehör – goldene Saison in Saudi-Arabien" } },
  { key: "new_year",  month: 1,  day: 1,  label: { ar: "رأس السنة", en: "New Year", de: "Neujahr" }, color: "purple", tip: { ar: "مبيعات التصفية – خفّض السعر واستقطب المشترين", en: "Clearance sales – lower prices to attract buyers", de: "Ausverkauf – Preissenkung zieht Käufer an" } },
];

// ── Arabic-Indic numerals ─────────────────────────────────────────────────────
function toArabicIndic(n) {
  return String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

// ── Countdown ─────────────────────────────────────────────────────────────────
function useCountdown(target) {
  const [diff, setDiff] = useState(0);
  useEffect(() => {
    const calc = () => setDiff(Math.max(0, target - Date.now()));
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [target]);
  return diff;
}

// ── Calendar grid helpers ─────────────────────────────────────────────────────
function getMonthGrid(year, month) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < first; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  return cells;
}

function formatNum(n, arabicIndic, pad = false) {
  const s = pad ? String(n).padStart(2, "0") : String(n);
  return arabicIndic ? toArabicIndic(s) : s;
}

// ── Color map ─────────────────────────────────────────────────────────────────
const COLOR = {
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-400", dot: "bg-emerald-500" },
  green:   { bg: "bg-green-100",   text: "text-green-700",   border: "border-green-400",   dot: "bg-green-500" },
  teal:    { bg: "bg-teal-100",    text: "text-teal-700",    border: "border-teal-400",    dot: "bg-teal-500" },
  red:     { bg: "bg-red-100",     text: "text-red-700",     border: "border-red-400",     dot: "bg-red-500" },
  blue:    { bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-400",    dot: "bg-blue-500" },
  yellow:  { bg: "bg-yellow-100",  text: "text-yellow-700",  border: "border-yellow-400",  dot: "bg-yellow-500" },
  purple:  { bg: "bg-purple-100",  text: "text-purple-700",  border: "border-purple-400",  dot: "bg-purple-500" },
};

// ── CountdownCard ─────────────────────────────────────────────────────────────
function CountdownCard({ event, lang, arabicIndic, t }) {
  const now = new Date();
  let target = new Date(now.getFullYear(), event.month - 1, event.day);
  if (target < now) target.setFullYear(target.getFullYear() + 1);
  const diff = useCountdown(target.getTime());
  const totalMins = Math.floor(diff / 60000);
  const mins  = totalMins % 60;
  const totalHours = Math.floor(totalMins / 60);
  const hours = totalHours % 24;
  const days  = Math.floor(totalHours / 24);
  const c = COLOR[event.color] || COLOR.blue;
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-3 flex flex-col gap-1.5`}>
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${c.dot} shrink-0`} />
        <span className={`font-semibold text-sm ${c.text}`}>{event.label[lang] || event.label.en}</span>
      </div>
      <div className={`flex gap-2 text-xs font-mono ${c.text} font-bold`}>
        <span>{formatNum(days, arabicIndic)} {t.days}</span>
        <span>{formatNum(hours, arabicIndic, true)} {t.hours}</span>
        <span>{formatNum(mins, arabicIndic, true)} {t.mins}</span>
      </div>
      <p className={`text-xs ${c.text} opacity-80 leading-relaxed`}>{event.tip[lang] || event.tip.en}</p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ArabicCalendarWidget({ lang = "ar", className = "" }) {
  const isRTL = lang === "ar";
  const t = I18N[lang] || I18N.ar;
  const [arabicIndic, setArabicIndic] = useState(lang === "ar");
  const [currentLang, setCurrentLang] = useState(lang);
  const T = I18N[currentLang] || I18N.ar;
  const rtl = currentLang === "ar";

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const hijriToday = toHijri(now);
  const hijriView = toHijri(new Date(viewYear, viewMonth, 15));

  const grid = getMonthGrid(viewYear, viewMonth);
  const today = now.getDate();
  const isCurrentMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();

  // events in this view month
  const monthEvents = MARKET_EVENTS.filter(e => e.month === viewMonth + 1);

  const upcomingEvents = [...MARKET_EVENTS]
    .map(e => {
      const now2 = new Date();
      let t2 = new Date(now2.getFullYear(), e.month - 1, e.day);
      if (t2 < now2) t2.setFullYear(t2.getFullYear() + 1);
      return { ...e, target: t2, diff: t2 - now2 };
    })
    .sort((a, b) => a.diff - b.diff)
    .slice(0, 3);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  return (
    <div
      className={`font-['Cairo','Tajawal',sans-serif] bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden ${className}`}
      dir={rtl ? "rtl" : "ltr"}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between">
        <span className="text-white font-bold text-base">🗓 {T.title}</span>
        {/* Lang/numeral switchers */}
        <div className="flex gap-1.5 items-center">
          {["ar","en","de"].map(l => (
            <button
              key={l}
              onClick={() => setCurrentLang(l)}
              className={`px-2 py-0.5 rounded text-xs font-semibold transition ${currentLang === l ? "bg-white text-emerald-700" : "bg-emerald-700 text-white hover:bg-emerald-500"}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
          <button
            onClick={() => setArabicIndic(v => !v)}
            className="px-2 py-0.5 rounded text-xs font-semibold bg-teal-700 text-white hover:bg-teal-500 transition ml-1"
          >
            {arabicIndic ? "123" : "١٢٣"}
          </button>
        </div>
      </div>

      {/* Hijri date strip */}
      <div className="bg-emerald-50 px-4 py-1.5 flex gap-4 text-xs text-emerald-700 border-b border-emerald-100">
        <span>
          {T.hijri}: {formatNum(hijriToday.day, arabicIndic)} {T.months[hijriToday.month - 1]} {formatNum(hijriToday.year, arabicIndic)}
        </span>
        <span className="text-gray-400">|</span>
        <span>
          {T.gregorian}: {formatNum(now.getDate(), arabicIndic)} {T.gregorianMonths[now.getMonth()]} {formatNum(now.getFullYear(), arabicIndic)}
        </span>
      </div>

      {/* Calendar nav */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold text-lg">
          {rtl ? "›" : "‹"}
        </button>
        <div className="text-center">
          <div className="font-bold text-gray-800 text-sm">
            {T.gregorianMonths[viewMonth]} {formatNum(viewYear, arabicIndic)}
          </div>
          <div className="text-xs text-emerald-600">
            {T.hijri}: {T.months[hijriView.month - 1]} {formatNum(hijriView.year, arabicIndic)}
          </div>
        </div>
        <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 font-bold text-lg">
          {rtl ? "‹" : "›"}
        </button>
      </div>

      {/* Day grid */}
      <div className="px-4 pb-2">
        <div className="grid grid-cols-7 gap-0.5 mb-1">
          {T.weekDays.map(d => (
            <div key={d} className="text-center text-xs text-gray-400 font-semibold py-0.5">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {grid.map((d, i) => {
            if (!d) return <div key={`e${i}`} />;
            const isToday = isCurrentMonth && d === today;
            const hasEvent = monthEvents.some(e => e.day === d);
            return (
              <div
                key={d}
                className={`relative aspect-square flex items-center justify-center rounded-full text-xs font-medium
                  ${isToday ? "bg-emerald-600 text-white font-bold shadow" : "text-gray-700 hover:bg-gray-50"}
                  ${hasEvent && !isToday ? "ring-2 ring-emerald-400 ring-offset-1" : ""}
                `}
              >
                {formatNum(d, arabicIndic)}
                {hasEvent && (
                  <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isToday ? "bg-white" : "bg-emerald-500"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Events in this month */}
      {monthEvents.length > 0 && (
        <div className="px-4 pb-2 border-t border-gray-100 pt-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{T.seasons}</p>
          <div className="flex flex-col gap-1">
            {monthEvents.map(e => {
              const c = COLOR[e.color] || COLOR.blue;
              return (
                <div key={e.key} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${c.bg}`}>
                  <span className={`w-2 h-2 rounded-full ${c.dot} shrink-0`} />
                  <span className={`text-xs font-semibold ${c.text}`}>{e.label[currentLang] || e.label.en}</span>
                  <span className={`text-xs ${c.text} opacity-70 ms-auto`}>{T.gregorianMonths[e.month - 1]} {formatNum(e.day, arabicIndic)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming events with countdown */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{T.upcoming}</p>
        <div className="flex flex-col gap-2">
          {upcomingEvents.map(e => (
            <CountdownCard key={e.key} event={e} lang={currentLang} arabicIndic={arabicIndic} t={T} />
          ))}
        </div>
      </div>
    </div>
  );
}
