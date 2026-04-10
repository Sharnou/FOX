/**
 * VehicleInspectionChecklist.jsx
 * Pre-purchase vehicle inspection checklist for Arab marketplace car buyers
 * XTOX Auto-Upgrade Agent — Run #242
 * Tailwind CSS only, zero external deps
 */

'use client';

import { useState, useCallback } from 'react';

// ── Google Fonts ────────────────────────────────────────────────────────────
const FONT_LINK = (
  <link
    href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap"
    rel="stylesheet"
  />
);

// ── i18n ────────────────────────────────────────────────────────────────────
const LABELS = {
  ar: {
    title: 'قائمة فحص السيارة قبل الشراء',
    subtitle: 'تحقق من حالة السيارة بدقة قبل إتمام الصفقة',
    pass: 'ممتاز ✅',
    issue: 'ملاحظة ⚠️',
    fail: 'مشكلة ❌',
    score: 'النتيجة الكلية',
    recommend_buy: '🟢 شرِ الآن',
    recommend_negotiate: '🟡 فاوض على السعر',
    recommend_avoid: '🔴 تجنّب',
    print: '🖨️ طباعة / حفظ التقرير',
    arabic_nums: 'أرقام عربية',
    latin_nums: 'أرقام لاتينية',
    of: 'من',
    pts: 'نقطة',
    legend_pass: 'ممتاز (نقطتان)',
    legend_issue: 'ملاحظة (نقطة)',
    legend_fail: 'مشكلة (صفر)',
    dir: 'rtl',
    font: "'Cairo', 'Tajawal', sans-serif",
  },
  en: {
    title: 'Pre-Purchase Vehicle Inspection',
    subtitle: 'Carefully verify the vehicle condition before closing the deal',
    pass: '✅ Pass',
    issue: '⚠️ Issue',
    fail: '❌ Fail',
    score: 'Overall Score',
    recommend_buy: '🟢 Buy Now',
    recommend_negotiate: '🟡 Negotiate Price',
    recommend_avoid: '🔴 Avoid',
    print: '🖨️ Print / Save Report',
    arabic_nums: 'Arabic Numerals',
    latin_nums: 'Latin Numerals',
    of: 'of',
    pts: 'pts',
    legend_pass: 'Pass (2 pts)',
    legend_issue: 'Issue (1 pt)',
    legend_fail: 'Fail (0 pts)',
    dir: 'ltr',
    font: "'Cairo', sans-serif",
  },
  de: {
    title: 'Fahrzeugprüfung vor dem Kauf',
    subtitle: 'Überprüfen Sie den Fahrzeugzustand sorgfältig vor dem Kauf',
    pass: '✅ Gut',
    issue: '⚠️ Hinweis',
    fail: '❌ Mangel',
    score: 'Gesamtergebnis',
    recommend_buy: '🟢 Kaufen',
    recommend_negotiate: '🟡 Preis verhandeln',
    recommend_avoid: '🔴 Vermeiden',
    print: '🖨️ Drucken / Bericht speichern',
    arabic_nums: 'Arabische Ziffern',
    latin_nums: 'Lateinische Ziffern',
    of: 'von',
    pts: 'Pkt',
    legend_pass: 'Gut (2 Pkt)',
    legend_issue: 'Hinweis (1 Pkt)',
    legend_fail: 'Mangel (0 Pkt)',
    dir: 'ltr',
    font: "'Cairo', sans-serif",
  },
};

// ── Inspection Categories & Items ───────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'exterior',
    icon: '🚗',
    label: { ar: 'الهيكل الخارجي', en: 'Exterior', de: 'Außenbereich' },
    items: [
      { id: 'ext_paint',    ar: 'الطلاء ودرجة اللون', en: 'Paint & Color Consistency', de: 'Lackierung & Farbe' },
      { id: 'ext_dents',    ar: 'الخدوش والحفر', en: 'Dents & Scratches', de: 'Beulen & Kratzer' },
      { id: 'ext_glass',    ar: 'الزجاج الأمامي والخلفي', en: 'Windshield & Windows', de: 'Windschutzscheibe & Fenster' },
      { id: 'ext_tires',    ar: 'الإطارات والجنوط', en: 'Tires & Rims', de: 'Reifen & Felgen' },
      { id: 'ext_lights',   ar: 'الإضاءة الأمامية والخلفية', en: 'Headlights & Taillights', de: 'Scheinwerfer & Rücklichter' },
      { id: 'ext_rust',     ar: 'علامات الصدأ', en: 'Rust Signs', de: 'Rostspuren' },
    ],
  },
  {
    id: 'engine',
    icon: '⚙️',
    label: { ar: 'المحرك', en: 'Engine', de: 'Motor' },
    items: [
      { id: 'eng_start',    ar: 'سهولة التشغيل', en: 'Startup & Idle', de: 'Start & Leerlauf' },
      { id: 'eng_smoke',    ar: 'الدخان من العادم', en: 'Exhaust Smoke', de: 'Abgasrauch' },
      { id: 'eng_leaks',    ar: 'تسريبات الزيت أو السوائل', en: 'Oil / Fluid Leaks', de: 'Öl- / Flüssigkeitslecks' },
      { id: 'eng_noise',    ar: 'أصوات غريبة من المحرك', en: 'Unusual Engine Noises', de: 'Ungewöhnliche Geräusche' },
      { id: 'eng_belt',     ar: 'حالة السيور والتبريد', en: 'Belts & Cooling System', de: 'Riemen & Kühlsystem' },
    ],
  },
  {
    id: 'interior',
    icon: '🪑',
    label: { ar: 'المقصورة الداخلية', en: 'Interior', de: 'Innenraum' },
    items: [
      { id: 'int_seats',    ar: 'حالة المقاعد والتنجيد', en: 'Seats & Upholstery', de: 'Sitze & Polsterung' },
      { id: 'int_dash',     ar: 'لوحة القيادة والشاشة', en: 'Dashboard & Screen', de: 'Armaturenbrett & Bildschirm' },
      { id: 'int_ac',       ar: 'نظام التكييف', en: 'Air Conditioning', de: 'Klimaanlage' },
      { id: 'int_odor',     ar: 'الروائح (رطوبة / حريق)', en: 'Odors (Damp / Burn)', de: 'Gerüche (Feuchtigkeit / Brand)' },
      { id: 'int_carpet',   ar: 'البساط والأرضيات', en: 'Carpet & Floor', de: 'Teppich & Boden' },
    ],
  },
  {
    id: 'electrical',
    icon: '⚡',
    label: { ar: 'الكهرباء', en: 'Electrical', de: 'Elektrik' },
    items: [
      { id: 'elec_battery', ar: 'البطارية وشحنها', en: 'Battery & Charge', de: 'Batterie & Ladung' },
      { id: 'elec_windows', ar: 'النوافذ الكهربائية', en: 'Power Windows', de: 'Elektrische Fenster' },
      { id: 'elec_locks',   ar: 'أقفال المركزية', en: 'Central Locking', de: 'Zentralverriegelung' },
      { id: 'elec_sensors', ar: 'أجهزة الاستشعار والتحذيرات', en: 'Sensors & Warning Lights', de: 'Sensoren & Warnleuchten' },
    ],
  },
  {
    id: 'documents',
    icon: '📄',
    label: { ar: 'الأوراق والمستندات', en: 'Documents', de: 'Dokumente' },
    items: [
      { id: 'doc_registration', ar: 'رخصة السير / التسجيل', en: 'Registration / License', de: 'Zulassung / Kennzeichen' },
      { id: 'doc_ownership',    ar: 'وثيقة الملكية', en: 'Ownership Certificate', de: 'Eigentumsnachweis' },
      { id: 'doc_insurance',    ar: 'وثيقة التأمين', en: 'Insurance Document', de: 'Versicherungsdokument' },
      { id: 'doc_service',      ar: 'سجل الصيانة', en: 'Service History', de: 'Wartungsprotokoll' },
      { id: 'doc_accident',     ar: 'خلو من الحوادث المسجلة', en: 'No Recorded Accidents', de: 'Keine gemeldeten Unfälle' },
    ],
  },
];

// ── Arabic-Indic numerals ────────────────────────────────────────────────────
const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

// ── State values ─────────────────────────────────────────────────────────────
const STATES = ['pass', 'issue', 'fail'];
const STATE_SCORES = { pass: 2, issue: 1, fail: 0 };
const STATE_COLORS = {
  pass:  { active: 'bg-emerald-500 text-white border-emerald-500', idle: 'border-gray-300 text-gray-400 hover:border-emerald-400' },
  issue: { active: 'bg-amber-400 text-white border-amber-400',     idle: 'border-gray-300 text-gray-400 hover:border-amber-400' },
  fail:  { active: 'bg-red-500 text-white border-red-500',         idle: 'border-gray-300 text-gray-400 hover:border-red-400' },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function buildInitial(initialData = {}) {
  const state = {};
  CATEGORIES.forEach((cat) =>
    cat.items.forEach((item) => {
      state[item.id] = initialData[item.id] ?? null;
    })
  );
  return state;
}

function calcScore(checks) {
  const all = Object.values(checks);
  const answered = all.filter((v) => v !== null);
  if (!answered.length) return { pct: 0, earned: 0, total: 0, answered: 0 };
  const total = answered.length * 2;
  const earned = answered.reduce((s, v) => s + (STATE_SCORES[v] ?? 0), 0);
  return { pct: Math.round((earned / total) * 100), earned, total, answered: answered.length };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function VehicleInspectionChecklist({
  initialData = {},
  lang: defaultLang = 'ar',
  className = '',
}) {
  const [lang, setLang] = useState(defaultLang);
  const [arabicNums, setArabicNums] = useState(defaultLang === 'ar');
  const [checks, setChecks] = useState(() => buildInitial(initialData));
  const [expanded, setExpanded] = useState(() => Object.fromEntries(CATEGORIES.map((c) => [c.id, true])));

  const t = LABELS[lang] ?? LABELS.ar;

  const fmt = useCallback(
    (n) => (arabicNums ? toArabicIndic(n) : String(n)),
    [arabicNums]
  );

  const setCheck = useCallback((id, val) => {
    setChecks((prev) => ({ ...prev, [id]: prev[id] === val ? null : val }));
  }, []);

  const toggleCat = useCallback((id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const { pct, earned, total, answered } = calcScore(checks);

  const recommendation =
    pct >= 90 ? t.recommend_buy
    : pct >= 70 ? t.recommend_negotiate
    : t.recommend_avoid;

  const recColor =
    pct >= 90 ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
    : pct >= 70 ? 'bg-amber-50 border-amber-400 text-amber-800'
    : 'bg-red-50 border-red-400 text-red-800';

  const allItems = CATEGORIES.flatMap((c) => c.items).length;

  return (
    <>
      {FONT_LINK}
      <div
        dir={t.dir}
        className={`min-h-screen bg-gray-50 py-6 px-4 print:bg-white ${className}`}
        style={{ fontFamily: t.font }}
      >
        <div className="max-w-2xl mx-auto">

          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t.title}</h1>
                <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
              </div>
              {/* Lang switcher */}
              <div className="flex gap-1 print:hidden">
                {['ar', 'en', 'de'].map((l) => (
                  <button
                    key={l}
                    onClick={() => { setLang(l); setArabicNums(l === 'ar'); }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${lang === l ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-500 hover:border-blue-400'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Numeral toggle */}
            <div className="flex items-center gap-2 print:hidden mt-2">
              <span className="text-xs text-gray-500">{arabicNums ? t.latin_nums : t.arabic_nums}:</span>
              <button
                onClick={() => setArabicNums((p) => !p)}
                className={`relative w-10 h-5 rounded-full transition-colors ${arabicNums ? 'bg-blue-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${arabicNums ? (t.dir === 'rtl' ? 'right-0.5' : 'left-5') : (t.dir === 'rtl' ? 'right-5' : 'left-0.5')}`} />
              </button>
              <span className="text-xs font-mono text-gray-400">{arabicNums ? '١٢٣' : '123'}</span>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-4 text-xs text-gray-500">
              {STATES.map((s) => (
                <span key={s} className={`px-2 py-0.5 rounded-full border ${STATE_COLORS[s].active}`}>
                  {t[s === 'pass' ? 'legend_pass' : s === 'issue' ? 'legend_issue' : 'legend_fail']}
                </span>
              ))}
            </div>
          </div>

          {/* ── Categories ─────────────────────────────────────────── */}
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-3 overflow-hidden">
              <button
                onClick={() => toggleCat(cat.id)}
                className="w-full flex items-center justify-between px-5 py-4 font-bold text-gray-800 hover:bg-gray-50 transition-colors print:cursor-default"
              >
                <span>{cat.icon} {cat.label[lang] ?? cat.label.ar}</span>
                <span className="text-gray-400 print:hidden">{expanded[cat.id] ? '▲' : '▼'}</span>
              </button>

              {expanded[cat.id] && (
                <ul className="divide-y divide-gray-50 pb-2">
                  {cat.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between px-5 py-3 gap-3 flex-wrap">
                      <span className="text-sm text-gray-700 flex-1 min-w-0">
                        {item[lang] ?? item.ar}
                      </span>
                      <div className="flex gap-1.5 shrink-0">
                        {STATES.map((s) => (
                          <button
                            key={s}
                            onClick={() => setCheck(item.id, s)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${checks[item.id] === s ? STATE_COLORS[s].active : STATE_COLORS[s].idle}`}
                          >
                            {t[s]}
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* ── Score Card ──────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{t.score}</h2>

            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-4 mb-3 overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${pct >= 90 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex items-baseline justify-between mb-4">
              <span className={`text-4xl font-black ${pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                {fmt(pct)}%
              </span>
              <span className="text-sm text-gray-500">
                {fmt(earned)} {t.pts} {t.of} {fmt(total)} — {fmt(answered)}/{fmt(allItems)}
              </span>
            </div>

            {/* Recommendation */}
            {answered > 0 && (
              <div className={`rounded-xl border-2 px-5 py-3 text-center text-lg font-bold ${recColor}`}>
                {recommendation}
              </div>
            )}
          </div>

          {/* ── Actions ─────────────────────────────────────────────── */}
          <div className="flex gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors shadow-sm"
            >
              {t.print}
            </button>
            <button
              onClick={() => setChecks(buildInitial())}
              className="px-5 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 font-semibold transition-colors"
              title="Reset"
            >
              🔄
            </button>
          </div>

        </div>
      </div>
    </>
  );
}
