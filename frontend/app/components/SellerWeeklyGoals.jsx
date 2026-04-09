'use client';
import { useState, useEffect, useCallback } from 'react';

const TRANSLATIONS = {
  ar: {
    title: 'أهدافي الأسبوعية',
    subtitle: 'تابع تقدمك واحقق أهدافك',
    setGoals: 'تحديد الأهداف',
    progress: 'التقدم الحالي',
    listings: 'إعلانات جديدة',
    views: 'مشاهدات',
    chats: 'محادثات',
    sales: 'مبيعات',
    target: 'الهدف',
    achieved: 'المحقق',
    remaining: 'المتبقي',
    pct: 'نسبة الإنجاز',
    weekOf: 'أسبوع',
    hijriWeek: 'الأسبوع الهجري',
    save: 'حفظ الأهداف',
    reset: 'إعادة تعيين',
    congrats: '🎉 أحسنت! لقد حققت هدفك هذا الأسبوع',
    motivate: ['أنت على الطريق الصحيح!', 'استمر في العمل الجيد!', 'قريباً من هدفك!', 'لا تستسلم!'],
    tip: 'نصيحة',
    tips: [
      'انشر إعلاناتك في أوقات الذروة (8-10م)',
      'أضف صوراً عالية الجودة لزيادة المشاهدات',
      'رد على الرسائل بسرعة لزيادة المبيعات',
      'حدّث أسعارك أسبوعياً لتبقى منافساً',
    ],
    noData: 'لا توجد بيانات لهذا الأسبوع بعد',
    weekSummary: 'ملخص الأسبوع',
  },
  en: {
    title: 'Weekly Goals',
    subtitle: 'Track your progress & hit your targets',
    setGoals: 'Set Goals',
    progress: 'Current Progress',
    listings: 'New Listings',
    views: 'Views',
    chats: 'Chats',
    sales: 'Sales',
    target: 'Target',
    achieved: 'Achieved',
    remaining: 'Remaining',
    pct: 'Completion',
    weekOf: 'Week of',
    hijriWeek: 'Hijri Week',
    save: 'Save Goals',
    reset: 'Reset',
    congrats: '🎉 Well done! You\'ve hit your goal this week',
    motivate: ['You\'re on track!', 'Keep up the great work!', 'Almost there!', 'Don\'t give up!'],
    tip: 'Tip',
    tips: [
      'Post listings during peak hours (8–10pm)',
      'Add high-quality photos to boost views',
      'Reply quickly to messages to drive sales',
      'Update prices weekly to stay competitive',
    ],
    noData: 'No data for this week yet',
    weekSummary: 'Week Summary',
  },
  de: {
    title: 'Wochenziele',
    subtitle: 'Verfolge deinen Fortschritt',
    setGoals: 'Ziele setzen',
    progress: 'Aktueller Fortschritt',
    listings: 'Neue Anzeigen',
    views: 'Aufrufe',
    chats: 'Chats',
    sales: 'Verkäufe',
    target: 'Ziel',
    achieved: 'Erreicht',
    remaining: 'Verbleibend',
    pct: 'Abschluss',
    weekOf: 'Woche vom',
    hijriWeek: 'Hijri-Woche',
    save: 'Ziele speichern',
    reset: 'Zurücksetzen',
    congrats: '🎉 Gut gemacht! Du hast dein Ziel diese Woche erreicht',
    motivate: ['Du bist auf Kurs!', 'Weiter so!', 'Fast geschafft!', 'Nicht aufgeben!'],
    tip: 'Tipp',
    tips: [
      'Poste Anzeigen zu Stoßzeiten (20–22 Uhr)',
      'Füge hochwertige Fotos hinzu',
      'Antworte schnell auf Nachrichten',
      'Aktualisiere Preise wöchentlich',
    ],
    noData: 'Noch keine Daten für diese Woche',
    weekSummary: 'Wochenzusammenfassung',
  },
};

// Hijri conversion via Julian Day Number
function gregorianToHijri(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const jd = Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4)
    + Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12)
    - Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4)
    + d - 32075;
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719)
    + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return { year: hYear, month: hMonth, day: hDay };
}

const HIJRI_MONTHS_AR = ['محرم','صفر','ربيع الأول','ربيع الثاني','جمادى الأولى','جمادى الثانية','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];

function toArabicIndic(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0,0,0,0);
  return d;
}

function formatDate(date, lang) {
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  const locale = lang === 'ar' ? 'ar-EG' : lang === 'de' ? 'de-DE' : 'en-US';
  return date.toLocaleDateString(locale, opts);
}

const METRICS = [
  { key: 'listings', color: 'blue', icon: '📝', defaultTarget: 5 },
  { key: 'views', color: 'purple', icon: '👁', defaultTarget: 500 },
  { key: 'chats', color: 'green', icon: '💬', defaultTarget: 20 },
  { key: 'sales', color: 'amber', icon: '🛒', defaultTarget: 3 },
];

const COLOR_MAP = {
  blue: { bar: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  purple: { bar: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  green: { bar: 'bg-green-500', light: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  amber: { bar: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
};

export default function SellerWeeklyGoals({
  weekData = {},
  lang = 'ar',
  onSaveGoals,
  className = '',
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRTL = lang === 'ar';
  const [arabicNums, setArabicNums] = useState(isRTL);
  const [tab, setTab] = useState('progress'); // 'progress' | 'goals'
  const [tipIdx, setTipIdx] = useState(0);

  const today = new Date();
  const weekStart = getWeekStart(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const hijriStart = gregorianToHijri(weekStart);
  const hijriEnd = gregorianToHijri(weekEnd);

  const [goals, setGoals] = useState(() => {
    const g = {};
    METRICS.forEach(m => { g[m.key] = m.defaultTarget; });
    return g;
  });

  const [achieved, setAchieved] = useState(() => {
    const a = {};
    METRICS.forEach(m => { a[m.key] = weekData[m.key] ?? 0; });
    return a;
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIdx(i => (i + 1) % t.tips.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [t.tips.length]);

  const fmt = useCallback((n) => arabicNums ? toArabicIndic(n) : String(n), [arabicNums]);

  const overallPct = Math.round(
    METRICS.reduce((sum, m) => sum + Math.min(100, goals[m.key] ? (achieved[m.key] / goals[m.key]) * 100 : 0), 0) / METRICS.length
  );

  const allGoalsMet = METRICS.every(m => achieved[m.key] >= goals[m.key]);

  const motivateMsg = t.motivate[Math.min(Math.floor(overallPct / 25), 3)];

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`font-sans bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden max-w-lg w-full ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">{t.title}</h2>
            <p className="text-xs text-indigo-200 mt-0.5">{t.subtitle}</p>
          </div>
          <div className="text-center">
            <div className="relative w-14 h-14">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
                <circle
                  cx="28" cy="28" r="24" fill="none" stroke="white" strokeWidth="5"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - overallPct / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {fmt(overallPct)}%
              </span>
            </div>
          </div>
        </div>

        {/* Week dates */}
        <div className="mt-3 flex gap-4 text-xs text-indigo-100">
          <span>{t.weekOf}: {formatDate(weekStart, lang)} — {formatDate(weekEnd, lang)}</span>
        </div>
        <div className="mt-1 text-xs text-indigo-200">
          {t.hijriWeek}: {fmt(hijriStart.day)} {HIJRI_MONTHS_AR[hijriStart.month-1]} — {fmt(hijriEnd.day)} {HIJRI_MONTHS_AR[hijriEnd.month-1]} {fmt(hijriStart.year)}هـ
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pt-3 flex items-center justify-between">
        <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
          {['progress','goals'].map(tab_ => (
            <button
              key={tab_}
              onClick={() => setTab(tab_)}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${tab === tab_ ? 'bg-white shadow text-indigo-700' : 'text-gray-500'}`}
            >
              {tab_ === 'progress' ? t.progress : t.setGoals}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setArabicNums(a => !a)}
            className="px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
            title="Toggle numeral style"
          >
            {arabicNums ? '123' : '١٢٣'}
          </button>
          <select
            value={lang}
            onChange={e => window.location?.assign?.('?lang=' + e.target.value)}
            className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs border-0 outline-none"
          >
            <option value="ar">AR</option>
            <option value="en">EN</option>
            <option value="de">DE</option>
          </select>
        </div>
      </div>

      {/* Congrats banner */}
      {allGoalsMet && (
        <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm font-semibold text-center">
          {t.congrats}
        </div>
      )}

      {/* Progress Tab */}
      {tab === 'progress' && (
        <div className="px-4 py-3 space-y-3">
          {METRICS.map(metric => {
            const pct = goals[metric.key] ? Math.min(100, Math.round((achieved[metric.key] / goals[metric.key]) * 100)) : 0;
            const c = COLOR_MAP[metric.color];
            const rem = Math.max(0, goals[metric.key] - achieved[metric.key]);
            return (
              <div key={metric.key} className={`rounded-xl border ${c.border} ${c.light} p-3`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{metric.icon}</span>
                    <span className={`font-semibold text-sm ${c.text}`}>{t[metric.key]}</span>
                  </div>
                  <span className={`text-xs font-bold ${c.text}`}>{fmt(pct)}%</span>
                </div>
                <div className="w-full bg-white rounded-full h-2.5 mb-2 overflow-hidden">
                  <div
                    className={`${c.bar} h-2.5 rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{t.achieved}: <strong className={c.text}>{fmt(achieved[metric.key])}</strong></span>
                  <span>{t.target}: <strong>{fmt(goals[metric.key])}</strong></span>
                  <span>{t.remaining}: <strong>{fmt(rem)}</strong></span>
                </div>
                {/* Achieved input */}
                <input
                  type="number"
                  min={0}
                  value={achieved[metric.key]}
                  onChange={e => setAchieved(a => ({ ...a, [metric.key]: Number(e.target.value) }))}
                  className="mt-2 w-full text-xs border border-gray-200 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-300"
                  placeholder={t.achieved}
                />
              </div>
            );
          })}

          {/* Motivational message */}
          {!allGoalsMet && (
            <div className="text-center py-2 text-sm text-gray-500 italic">{motivateMsg}</div>
          )}
        </div>
      )}

      {/* Goals Tab */}
      {tab === 'goals' && (
        <div className="px-4 py-3 space-y-3">
          {METRICS.map(metric => {
            const c = COLOR_MAP[metric.color];
            return (
              <div key={metric.key} className={`rounded-xl border ${c.border} ${c.light} p-3`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{metric.icon}</span>
                  <span className={`font-semibold text-sm ${c.text}`}>{t[metric.key]}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 whitespace-nowrap">{t.target}:</span>
                  <input
                    type="number"
                    min={1}
                    value={goals[metric.key]}
                    onChange={e => setGoals(g => ({ ...g, [metric.key]: Number(e.target.value) }))}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>
            );
          })}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                onSaveGoals?.(goals);
                setTab('progress');
              }}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              {t.save}
            </button>
            <button
              onClick={() => {
                const g = {};
                METRICS.forEach(m => { g[m.key] = m.defaultTarget; });
                setGoals(g);
              }}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-medium transition-colors"
            >
              {t.reset}
            </button>
          </div>
        </div>
      )}

      {/* Rotating Tip */}
      <div className="mx-4 mb-4 mt-1 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-2">
          <span className="text-amber-500 text-lg mt-0.5">💡</span>
          <div>
            <span className="text-xs font-bold text-amber-700">{t.tip}: </span>
            <span className="text-xs text-amber-800">{t.tips[tipIdx]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
