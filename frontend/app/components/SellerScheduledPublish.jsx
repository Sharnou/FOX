'use client';
/**
 * SellerScheduledPublish.jsx
 * Arab marketplace — schedule ad publishing at peak browsing hours
 * Props: countryCode, category, lang, onSchedule, className
 * RTL-first | Cairo/Tajawal | Tailwind only | Zero deps | ~360 lines
 */

import { useState, useEffect, useMemo } from 'react';

const T = {
  ar: {
    title: 'جدولة نشر الإعلان',
    subtitle: 'اختر أفضل وقت للوصول لأكبر عدد من المشترين',
    heatmap: 'خريطة ساعات الذروة',
    bestTimes: 'أفضل أوقات النشر',
    schedule: 'جدولة النشر',
    publishNow: 'نشر الآن',
    scheduled: 'تم الجدولة!',
    days: ['ح','ن','ث','ر','خ','ج','س'],
    selectDate: 'اختر التاريخ',
    selectTime: 'اختر الوقت',
    quick: 'اقتراحات سريعة',
    tomorrowEvening: 'مساء الغد 8م',
    fridayNight: 'الجمعة 9م',
    saturdayEvening: 'السبت 7م',
    tips: 'نصائح الوقت المثالي',
    countdown: 'الوقت المتبقي للنشر',
    d: 'يوم', h: 'ساعة', m: 'دقيقة',
    peak: 'ذروة', high: 'عالي', mid: 'متوسط', low: 'منخفض',
    numerals: '١٢٣',
    changetime: 'تعديل الوقت',
  },
  en: {
    title: 'Schedule Ad Publishing',
    subtitle: 'Pick the best time to reach the most buyers',
    heatmap: 'Peak Hours Heatmap',
    bestTimes: 'Best Posting Times',
    schedule: 'Schedule',
    publishNow: 'Publish Now',
    scheduled: 'Scheduled!',
    days: ['Su','Mo','Tu','We','Th','Fr','Sa'],
    selectDate: 'Select Date',
    selectTime: 'Select Time',
    quick: 'Quick picks',
    tomorrowEvening: 'Tomorrow 8pm',
    fridayNight: 'Friday 9pm',
    saturdayEvening: 'Saturday 7pm',
    tips: 'Optimal Time Tips',
    countdown: 'Time Until Publish',
    d: 'd', h: 'h', m: 'm',
    peak: 'Peak', high: 'High', mid: 'Med', low: 'Low',
    numerals: '١٢٣',
    changetime: 'Change time',
  },
  de: {
    title: 'Anzeige planen',
    subtitle: 'Wählen Sie die beste Zeit für maximale Käuferreichweite',
    heatmap: 'Stoßzeiten-Heatmap',
    bestTimes: 'Beste Zeiten',
    schedule: 'Planen',
    publishNow: 'Jetzt veröffentlichen',
    scheduled: 'Geplant!',
    days: ['So','Mo','Di','Mi','Do','Fr','Sa'],
    selectDate: 'Datum wählen',
    selectTime: 'Uhrzeit wählen',
    quick: 'Schnellauswahl',
    tomorrowEvening: 'Morgen Abend 20h',
    fridayNight: 'Freitag 21h',
    saturdayEvening: 'Samstag 19h',
    tips: 'Tipps für optimale Zeiten',
    countdown: 'Zeit bis Veröffentlichung',
    d: 'T', h: 'Std', m: 'Min',
    peak: 'Spitze', high: 'Hoch', mid: 'Mittel', low: 'Niedrig',
    numerals: '١٢٣',
    changetime: 'Zeit ändern',
  },
};

// Peak heat: 0=low,1=mid,2=high,3=peak
// rows=days[0=Sun..6=Sat]  cols=4h-slots[0=midnight,1=4am,2=8am,3=noon,4=4pm,5=8pm]
const HEAT = {
  EG: [[0,0,1,2,2,3],[0,0,1,2,3,3],[0,0,1,2,3,3],[0,0,1,2,3,3],[0,0,1,3,3,2],[1,0,0,1,3,3],[1,0,0,1,2,3]],
  SA: [[0,0,1,1,2,3],[0,0,1,2,2,3],[0,0,1,2,2,3],[0,0,1,2,3,3],[0,0,1,3,3,2],[1,1,0,1,2,3],[1,0,0,1,2,2]],
  AE: [[0,0,2,2,3,3],[0,0,2,3,3,2],[0,0,2,2,3,3],[0,0,2,3,3,2],[0,0,2,3,2,1],[1,0,0,1,2,2],[1,0,1,2,2,2]],
  JO: [[0,0,1,2,2,2],[0,0,1,2,2,3],[0,0,1,2,3,3],[0,0,1,2,3,3],[0,0,1,2,2,2],[1,0,0,1,2,3],[1,0,0,1,2,2]],
  KW: [[0,0,1,1,2,3],[0,0,1,2,2,3],[0,0,1,2,3,3],[0,0,1,2,3,2],[0,0,1,3,2,2],[1,0,0,1,2,3],[1,0,0,1,2,2]],
  QA: [[0,0,1,1,2,3],[0,0,1,2,2,3],[0,0,1,2,2,3],[0,0,1,2,3,3],[0,0,1,2,3,2],[1,0,0,1,2,3],[1,0,0,1,2,2]],
  DEFAULT: [[0,0,1,2,2,3],[0,0,1,2,3,3],[0,0,1,2,3,3],[0,0,1,2,3,3],[0,0,1,3,3,2],[1,0,0,1,3,3],[1,0,0,1,2,3]],
};

const CATEGORY_TIPS = {
  cars: {
    ar: '🚗 السيارات: الخميس والجمعة مساءً أفضل وقت — نشاط المشترين 3× أعلى',
    en: '🚗 Cars: Thu/Fri evening = 3× more buyer activity',
    de: '🚗 Autos: Do/Fr Abend = 3× mehr Käuferaktivität',
  },
  electronics: {
    ar: '📱 إلكترونيات: الجمعة مساءً والعطلات — أعلى طلب في الأسبوع',
    en: '📱 Electronics: Friday evening & holidays = peak demand',
    de: '📱 Elektronik: Freitagabend = Spitzennachfrage',
  },
  furniture: {
    ar: '🛋️ أثاث: أول الشهر بعد الراتب — المشترون يبحثون أكثر',
    en: '🛋️ Furniture: Post-salary (1st–5th) = buyers have budget',
    de: '🛋️ Möbel: Monatsbeginn = Käufer haben Budget',
  },
  fashion: {
    ar: '👗 ملابس: قبل الأعياد والمواسم — إشعل الاهتمام مبكراً',
    en: '👗 Fashion: Pre-holiday & seasonal peaks = highest traffic',
    de: '👗 Mode: Vor Feiertagen = höchster Traffic',
  },
  default: {
    ar: '💡 نشر مساءً بين 8–10م يصل لأكبر عدد من المشترين في السوق العربي',
    en: '💡 Evening posts (8–10pm) reach the most buyers in Arab markets',
    de: '💡 Abendposts (20–22 Uhr) erreichen die meisten Käufer',
  },
};

const SLOT_LABELS = ['12a','4a','8a','12p','4p','8p'];
const heatBg = v => ['bg-slate-700','bg-blue-500/60','bg-orange-400/80','bg-rose-500'][v] ?? 'bg-slate-700';
const heatRing = v => v === 3 ? 'ring-1 ring-rose-400' : '';
const toAr = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const fmt = (n, ar) => ar ? toAr(n) : String(n);

function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function nextWeekday(wd) { const t = new Date(); const diff = (wd - t.getDay() + 7) % 7 || 7; return addDays(t, diff); }
function toDateStr(d) { return d.toISOString().split('T')[0]; }

function CountdownDisplay({ target, t, useAr }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, new Date(target) - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return (
    <div className="flex gap-2 justify-center mt-3">
      {[[days, t.d],[hours, t.h],[mins, t.m]].map(([v, lbl]) => (
        <div key={lbl} className="flex flex-col items-center bg-indigo-900 rounded-xl px-4 py-2 min-w-[56px]">
          <span className="text-white text-xl font-bold">{fmt(v, useAr)}</span>
          <span className="text-indigo-300 text-[10px]">{lbl}</span>
        </div>
      ))}
    </div>
  );
}

export default function SellerScheduledPublish({
  countryCode = 'EG',
  category = 'default',
  lang = 'ar',
  onSchedule,
  className = '',
}) {
  const [activeLang, setActiveLang] = useState(lang);
  const [useAr, setUseAr] = useState(lang === 'ar');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('20:00');
  const [done, setDone] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(null);

  const t = T[activeLang] || T.ar;
  const isRTL = activeLang === 'ar';
  const heat = HEAT[countryCode] || HEAT.DEFAULT;
  const tip = (CATEGORY_TIPS[category] || CATEGORY_TIPS.default)[activeLang] ?? '';

  const minDate = useMemo(() => toDateStr(new Date()), []);
  const maxDate = useMemo(() => toDateStr(addDays(new Date(), 30)), []);

  const quickPicks = useMemo(() => [
    { label: t.tomorrowEvening, date: toDateStr(addDays(new Date(), 1)), time: '20:00' },
    { label: t.fridayNight,     date: toDateStr(nextWeekday(5)),          time: '21:00' },
    { label: t.saturdayEvening, date: toDateStr(nextWeekday(6)),          time: '19:00' },
  ], [activeLang]);

  const handleSchedule = () => {
    if (!date) return;
    const dt = new Date(`${date}T${time}:00`);
    setScheduledAt(dt.toISOString());
    setDone(true);
    onSchedule && onSchedule(dt.toISOString());
  };

  const handleNow = () => {
    const dt = new Date();
    setScheduledAt(dt.toISOString());
    setDone(true);
    onSchedule && onSchedule(dt.toISOString());
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`w-full max-w-lg mx-auto rounded-2xl shadow-2xl overflow-hidden ${className}`}
      style={{ fontFamily: "'Cairo','Tajawal',sans-serif", background: 'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)' }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-white text-lg font-bold">{t.title}</h2>
            <p className="text-blue-200 text-xs mt-0.5 opacity-75">{t.subtitle}</p>
          </div>
          <span className="text-3xl">📅</span>
        </div>
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {['ar','en','de'].map(l => (
            <button key={l} onClick={() => setActiveLang(l)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${activeLang===l?'bg-indigo-500 text-white':'bg-white/10 text-white/60 hover:bg-white/20'}`}>
              {l.toUpperCase()}
            </button>
          ))}
          <button onClick={() => setUseAr(v=>!v)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ms-auto ${useAr?'bg-amber-400 text-black':'bg-white/10 text-white/60'}`}>
            {t.numerals}
          </button>
        </div>
      </div>

      {/* Category tip */}
      <div className="mx-5 mb-4 rounded-xl bg-indigo-900/50 px-4 py-2.5">
        <p className="text-indigo-200 text-xs leading-relaxed">{tip}</p>
      </div>

      {/* Heatmap */}
      <div className="px-5 mb-4">
        <h3 className="text-white/70 text-[11px] font-semibold uppercase tracking-wider mb-2">{t.heatmap}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="w-6" />
                {SLOT_LABELS.map(s => (
                  <th key={s} className="text-white/40 text-[9px] font-normal pb-1 text-center">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heat.map((row, di) => (
                <tr key={di}>
                  <td className="text-white/50 text-[10px] font-semibold pe-1.5 whitespace-nowrap">{t.days[di]}</td>
                  {row.map((v, si) => (
                    <td key={si} className="p-0.5">
                      <div className={`h-4 rounded ${heatBg(v)} ${heatRing(v)}`} title={[t.low,t.mid,t.high,t.peak][v]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3 mt-2 flex-wrap">
          {[t.low,t.mid,t.high,t.peak].map((lbl,i) => (
            <span key={lbl} className="flex items-center gap-1">
              <span className={`w-3 h-3 rounded ${['bg-slate-700','bg-blue-500/60','bg-orange-400/80','bg-rose-500'][i]}`} />
              <span className="text-white/40 text-[10px]">{lbl}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Scheduler or Confirmation */}
      {!done ? (
        <div className="px-5 pb-5">
          <h3 className="text-white/70 text-[11px] font-semibold uppercase tracking-wider mb-2">{t.bestTimes}</h3>
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="text-white/50 text-[11px] block mb-1">{t.selectDate}</label>
              <input type="date" min={minDate} max={maxDate} value={date}
                onChange={e=>setDate(e.target.value)}
                className="w-full rounded-xl bg-white/10 text-white text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 border border-white/10"
                style={{colorScheme:'dark'}} />
            </div>
            <div className="flex-1">
              <label className="text-white/50 text-[11px] block mb-1">{t.selectTime}</label>
              <input type="time" value={time} onChange={e=>setTime(e.target.value)}
                className="w-full rounded-xl bg-white/10 text-white text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 border border-white/10"
                style={{colorScheme:'dark'}} />
            </div>
          </div>
          <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1.5">{t.quick}</p>
          <div className="flex gap-2 flex-wrap mb-4">
            {quickPicks.map(q => (
              <button key={q.label} onClick={() => { setDate(q.date); setTime(q.time); }}
                className="bg-white/10 hover:bg-indigo-500/40 text-white/75 text-xs rounded-full px-3 py-1 transition border border-white/10">
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={handleSchedule} disabled={!date}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${date?'bg-indigo-500 hover:bg-indigo-600 text-white':'bg-white/10 text-white/30 cursor-not-allowed'}`}>
              📅 {t.schedule}
            </button>
            <button onClick={handleNow}
              className="flex-1 py-3 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-600 text-white transition">
              ⚡ {t.publishNow}
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 pb-6 text-center">
          <div className="text-5xl mb-2">✅</div>
          <h3 className="text-white font-bold text-lg">{t.scheduled}</h3>
          {scheduledAt && (
            <p className="text-indigo-200 text-xs mt-1 mb-2">
              {new Date(scheduledAt).toLocaleString(
                activeLang==='ar'?'ar-EG':activeLang==='de'?'de-DE':'en-US'
              )}
            </p>
          )}
          {scheduledAt && new Date(scheduledAt) > new Date() && (
            <>
              <p className="text-white/50 text-xs">{t.countdown}</p>
              <CountdownDisplay target={scheduledAt} t={t} useAr={useAr} />
            </>
          )}
          <button onClick={() => { setDone(false); setScheduledAt(null); }}
            className="mt-4 bg-white/10 hover:bg-white/20 text-white text-xs rounded-full px-5 py-2 transition">
            {t.changetime}
          </button>
        </div>
      )}
    </div>
  );
}
