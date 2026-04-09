/**
 * SellerEarningsCalendar.jsx
 * XTOX Arab Marketplace — Monthly Earnings Heatmap Calendar
 *
 * Props:
 *   earningsData  – array of { date: 'YYYY-MM-DD', amount: number, deals: [{name, price, buyerCity}] }
 *   currency      – 'EGP' | 'SAR' | 'AED' | 'USD'  (default 'EGP')
 *   lang          – 'ar' | 'en' | 'de'              (default 'ar')
 *   className     – extra Tailwind classes
 */

import React, { useState, useMemo } from 'react';

/* ─── Google Fonts ──────────────────────────────────────────────────────── */
const FONT_STYLE = `@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');`;

/* ─── Exchange Rates (base: EGP) ────────────────────────────────────────── */
const FX = { EGP: 1, USD: 0.032, SAR: 0.12, AED: 0.117 };
const CCY_SYMBOL = { EGP: 'ج.م', SAR: 'ر.س', AED: 'د.إ', USD: '$' };

/* ─── Arabic-Indic numerals ─────────────────────────────────────────────── */
const AR_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
function toArIndic(n) {
  return String(n).replace(/\d/g, d => AR_DIGITS[+d]);
}
function fmt(n, useAr) {
  const s = Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
  return useAr ? toArIndic(s.replace(/,/g, '٬')) : s;
}

/* ─── Simple Hijri offset conversion ───────────────────────────────────── */
function gregorianToHijri(year, month, day) {
  // Julian Day Number
  const jd = Math.floor((1461 * (year + 4800 + Math.floor((month - 14) / 12))) / 4)
    + Math.floor((367 * (month - 2 - 12 * Math.floor((month - 14) / 12))) / 12)
    - Math.floor((3 * Math.floor((year + 4900 + Math.floor((month - 14) / 12)) / 100)) / 4)
    + day - 32075;
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j = Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17718)
    + Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17718 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return { hYear, hMonth, hDay };
}

/* ─── i18n strings ──────────────────────────────────────────────────────── */
const T = {
  ar: {
    days: ['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],
    daysShort: ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'],
    months: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    totalEarnings: 'إجمالي الأرباح',
    projected: 'المتوقع الشهر القادم',
    bestDay: 'أفضل يوم',
    avgDaily: 'متوسط يومي',
    totalDeals: 'إجمالي الصفقات',
    deals: 'صفقات',
    deal: 'صفقة',
    noDayData: 'لا توجد مبيعات في هذا اليوم',
    buyer: 'المشتري من',
    price: 'السعر',
    item: 'المنتج',
    closeDetail: 'إغلاق',
    arNumerals: 'أرقام عربية',
    prev: '‹',
    next: '›',
    dir: 'rtl',
    font: "'Cairo', 'Tajawal', sans-serif",
    hijriMonths: ['محرم','صفر','ربيع الأول','ربيع الثاني','جمادى الأولى','جمادى الثانية','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'],
  },
  en: {
    days: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    daysShort: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    totalEarnings: 'Total Earnings',
    projected: 'Next Month Projected',
    bestDay: 'Best Day',
    avgDaily: 'Avg Daily',
    totalDeals: 'Total Deals',
    deals: 'deals',
    deal: 'deal',
    noDayData: 'No sales on this day',
    buyer: 'Buyer City',
    price: 'Price',
    item: 'Item',
    closeDetail: 'Close',
    arNumerals: 'Arabic Digits',
    prev: '‹',
    next: '›',
    dir: 'ltr',
    font: "'Cairo', sans-serif",
    hijriMonths: ['Muharram','Safar','Rabi I','Rabi II','Jumada I','Jumada II','Rajab','Sha\'ban','Ramadan','Shawwal','Dhu al-Qa\'dah','Dhu al-Hijjah'],
  },
  de: {
    days: ['So','Mo','Di','Mi','Do','Fr','Sa'],
    daysShort: ['So','Mo','Di','Mi','Do','Fr','Sa'],
    months: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    totalEarnings: 'Gesamteinnahmen',
    projected: 'Nächster Monat (Prognose)',
    bestDay: 'Bester Tag',
    avgDaily: 'Tagesdurchschnitt',
    totalDeals: 'Transaktionen gesamt',
    deals: 'Deals',
    deal: 'Deal',
    noDayData: 'Keine Verkäufe an diesem Tag',
    buyer: 'Käuferstadt',
    price: 'Preis',
    item: 'Artikel',
    closeDetail: 'Schließen',
    arNumerals: 'Arab. Ziffern',
    prev: '‹',
    next: '›',
    dir: 'ltr',
    font: "'Cairo', sans-serif",
    hijriMonths: ['Muharram','Safar','Rabi I','Rabi II','Dschumada I','Dschumada II','Radschab','Scha\'ban','Ramadan','Schawwal','Dhu l-Qa\'da','Dhu l-Hijja'],
  },
};

/* ─── Mock data generator ───────────────────────────────────────────────── */
function generateMockData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cities = ['القاهرة','الرياض','دبي','الإسكندرية','جدة','أبوظبي','الشارقة','المنصورة'];
  const items = ['هاتف سامسونج','لابتوب لينوفو','سماعات سوني','شاشة LG','كاميرا كانون','ساعة أبل','جهاز تابلت','سماعة جي بي إل'];
  const data = [];
  for (let d = 1; d <= daysInMonth; d++) {
    if (Math.random() > 0.25) {
      const dealCount = Math.floor(Math.random() * 6) + 1;
      const deals = Array.from({ length: dealCount }, () => ({
        name: items[Math.floor(Math.random() * items.length)],
        price: Math.floor(Math.random() * 3500) + 200,
        buyerCity: cities[Math.floor(Math.random() * cities.length)],
      }));
      data.push({
        date: `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
        amount: deals.reduce((s, x) => s + x.price, 0),
        deals,
      });
    }
  }
  // add 2 previous months for projection
  for (let mo = 1; mo <= 2; mo++) {
    const pm = new Date(year, month - mo, 1);
    const pYear = pm.getFullYear();
    const pMonth = pm.getMonth();
    const pDays = new Date(pYear, pMonth + 1, 0).getDate();
    for (let d = 1; d <= pDays; d++) {
      if (Math.random() > 0.3) {
        const dealCount = Math.floor(Math.random() * 5) + 1;
        const deals = Array.from({ length: dealCount }, () => ({
          name: items[Math.floor(Math.random() * items.length)],
          price: Math.floor(Math.random() * 3000) + 200,
          buyerCity: cities[Math.floor(Math.random() * cities.length)],
        }));
        data.push({
          date: `${pYear}-${String(pMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,
          amount: deals.reduce((s, x) => s + x.price, 0),
          deals,
        });
      }
    }
  }
  return data;
}

/* ─── Heatmap colour scale (white → green) ──────────────────────────────── */
function heatColour(amount, maxAmount) {
  if (!amount || maxAmount === 0) return '#f8fafc';
  const ratio = Math.min(amount / maxAmount, 1);
  if (ratio < 0.2) return '#dcfce7';
  if (ratio < 0.4) return '#86efac';
  if (ratio < 0.6) return '#4ade80';
  if (ratio < 0.8) return '#22c55e';
  return '#15803d';
}
function textColour(amount, maxAmount) {
  if (!amount || maxAmount === 0) return '#94a3b8';
  const ratio = Math.min(amount / maxAmount, 1);
  return ratio >= 0.6 ? '#fff' : '#1e293b';
}

/* ─── Main Component ────────────────────────────────────────────────────── */
export default function SellerEarningsCalendar({
  earningsData,
  currency = 'EGP',
  lang = 'ar',
  className = '',
}) {
  const t = T[lang] || T.ar;
  const isAr = lang === 'ar';

  /* State */
  const [currentDate, setCurrentDate] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [activeCurrency, setActiveCurrency] = useState(currency);
  const [activeLang, setActiveLang] = useState(lang);
  const [useArDigits, setUseArDigits] = useState(lang === 'ar');
  const [selectedDay, setSelectedDay] = useState(null);

  const tL = T[activeLang] || T.ar;
  const dir = tL.dir;

  /* Data */
  const allData = useMemo(() => {
    const raw = (!earningsData || earningsData.length === 0) ? generateMockData() : earningsData;
    const map = {};
    raw.forEach(entry => { map[entry.date] = entry; });
    return map;
  }, [earningsData]);

  /* Current month info */
  const { year, month } = currentDate;
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  /* Monthly earnings */
  const monthPrefix = `${year}-${String(month + 1).padStart(2,'0')}`;
  const monthEntries = useMemo(() =>
    Object.entries(allData).filter(([k]) => k.startsWith(monthPrefix)).map(([, v]) => v),
    [allData, monthPrefix]
  );
  const totalEGP = monthEntries.reduce((s, e) => s + e.amount, 0);
  const totalConverted = totalEGP * FX[activeCurrency];
  const maxDayAmount = Math.max(...monthEntries.map(e => e.amount), 0);
  const totalDeals = monthEntries.reduce((s, e) => s + e.deals.length, 0);
  const avgDaily = monthEntries.length ? totalEGP / daysInMonth : 0;
  const bestDayEntry = monthEntries.reduce((best, e) => (!best || e.amount > best.amount) ? e : best, null);
  const bestDayAmt = bestDayEntry ? bestDayEntry.amount * FX[activeCurrency] : 0;

  /* 3-month projection */
  const projection = useMemo(() => {
    const totals = [];
    for (let mo = 1; mo <= 3; mo++) {
      const pm = new Date(year, month - mo, 1);
      const pPrefix = `${pm.getFullYear()}-${String(pm.getMonth() + 1).padStart(2,'0')}`;
      const pDays = new Date(pm.getFullYear(), pm.getMonth() + 1, 0).getDate();
      const pEntries = Object.entries(allData).filter(([k]) => k.startsWith(pPrefix));
      const pTotal = pEntries.reduce((s, [, v]) => s + v.amount, 0);
      const pAvg = pTotal / pDays;
      const nextDays = new Date(year, month + 2, 0).getDate();
      totals.push(pAvg * nextDays);
    }
    return (totals.reduce((s, x) => s + x, 0) / totals.length) * FX[activeCurrency];
  }, [allData, year, month, activeCurrency]);

  /* Calendar grid cells */
  const cells = useMemo(() => {
    const grid = [];
    for (let i = 0; i < firstDayOfMonth; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const entry = allData[dateStr] || null;
      const { hDay, hMonth } = gregorianToHijri(year, month + 1, d);
      grid.push({ day: d, dateStr, entry, hDay, hMonth });
    }
    return grid;
  }, [allData, year, month, firstDayOfMonth, daysInMonth]);

  /* Helpers */
  const N = (n, dec = 0) => {
    const val = Number(n).toFixed(dec);
    return useArDigits ? toArIndic(val) : val;
  };
  const fmtMoney = (n) => `${CCY_SYMBOL[activeCurrency]} ${N(n)}`;
  const prevMonth = () => setCurrentDate(({ year: y, month: m }) =>
    m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
  );
  const nextMonth = () => setCurrentDate(({ year: y, month: m }) =>
    m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
  );

  /* Selected day data */
  const selectedEntry = selectedDay ? allData[selectedDay] || null : null;

  return (
    <>
      <style>{FONT_STYLE}</style>
      <div
        className={`rounded-2xl shadow-xl bg-white overflow-hidden ${className}`}
        style={{ fontFamily: tL.font, direction: dir }}
        dir={dir}
      >
        {/* ── Top bar: lang / currency / numerals ─────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs">
          {/* Language switcher */}
          <div className="flex gap-1">
            {['ar','en','de'].map(l => (
              <button
                key={l}
                onClick={() => { setActiveLang(l); setUseArDigits(l === 'ar'); }}
                className={`px-2 py-1 rounded font-semibold transition-colors ${activeLang === l ? 'bg-green-600 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-green-50'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          {/* Currency switcher */}
          <div className="flex gap-1">
            {['EGP','SAR','AED','USD'].map(c => (
              <button
                key={c}
                onClick={() => setActiveCurrency(c)}
                className={`px-2 py-1 rounded font-semibold transition-colors ${activeCurrency === c ? 'bg-green-600 text-white' : 'bg-white text-slate-600 border border-slate-300 hover:bg-green-50'}`}
              >
                {c}
              </button>
            ))}
          </div>
          {/* Arabic numeral toggle */}
          <button
            onClick={() => setUseArDigits(p => !p)}
            className={`px-2 py-1 rounded border transition-colors ${useArDigits ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-green-50'}`}
          >
            {tL.arNumerals} ٣٦٥
          </button>
        </div>

        {/* ── Header: month nav + earnings summary ────────────────────── */}
        <div className="px-5 pt-4 pb-3 bg-gradient-to-br from-green-700 to-green-500 text-white">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="text-2xl font-bold hover:text-green-200 transition-colors w-8 text-center">{tL.prev}</button>
            <h2 className="text-lg font-bold tracking-wide">
              {tL.months[month]} {useArDigits ? toArIndic(year) : year}
            </h2>
            <button onClick={nextMonth} className="text-2xl font-bold hover:text-green-200 transition-colors w-8 text-center">{tL.next}</button>
          </div>

          {/* Earnings cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 rounded-xl p-3">
              <div className="text-xs text-green-100 mb-1">{tL.totalEarnings}</div>
              <div className="text-2xl font-bold">{fmtMoney(totalConverted)}</div>
            </div>
            <div className="bg-white/20 rounded-xl p-3">
              <div className="text-xs text-green-100 mb-1">{tL.projected}</div>
              <div className="text-2xl font-bold">{fmtMoney(projection)}</div>
            </div>
          </div>
        </div>

        {/* ── Stats row ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200 text-center text-xs">
          <div className="py-2 px-1">
            <div className="text-slate-500">{tL.bestDay}</div>
            <div className="font-bold text-green-700">{fmtMoney(bestDayAmt)}</div>
          </div>
          <div className="py-2 px-1">
            <div className="text-slate-500">{tL.avgDaily}</div>
            <div className="font-bold text-green-700">{fmtMoney(avgDaily * FX[activeCurrency])}</div>
          </div>
          <div className="py-2 px-1">
            <div className="text-slate-500">{tL.totalDeals}</div>
            <div className="font-bold text-green-700">{N(totalDeals)}</div>
          </div>
        </div>

        {/* ── Calendar grid ────────────────────────────────────────────── */}
        <div className="p-3">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 mb-1">
            {tL.daysShort.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-slate-500 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, idx) => {
              if (!cell) return <div key={`empty-${idx}`} />;
              const { day, dateStr, entry, hDay, hMonth } = cell;
              const bg = heatColour(entry?.amount, maxDayAmount);
              const fg = textColour(entry?.amount, maxDayAmount);
              const isSelected = selectedDay === dateStr;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  className={`rounded-lg p-1 flex flex-col items-center transition-all hover:scale-105 hover:shadow-md ${isSelected ? 'ring-2 ring-green-600 ring-offset-1' : ''}`}
                  style={{ background: bg, color: fg, minHeight: '52px' }}
                  title={entry ? `${fmtMoney(entry.amount * FX[activeCurrency])} — ${entry.deals.length} ${tL.deals}` : ''}
                >
                  <span className="text-xs font-bold leading-tight">{N(day)}</span>
                  <span className="text-[9px] opacity-70 leading-tight">
                    {useArDigits ? toArIndic(hDay) : hDay}/{useArDigits ? toArIndic(hMonth) : hMonth}هـ
                  </span>
                  {entry && (
                    <span className="text-[9px] font-semibold mt-auto leading-tight">
                      {N(Math.round(entry.amount * FX[activeCurrency] / 1000), 0)}k
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Heatmap legend */}
          <div className={`flex items-center gap-1 mt-3 text-[10px] text-slate-500 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            {['#f8fafc','#dcfce7','#86efac','#4ade80','#22c55e','#15803d'].map((c, i) => (
              <div key={i} className="w-4 h-3 rounded" style={{ background: c, border: '1px solid #e2e8f0' }} />
            ))}
            <span className="mx-1">0</span>
            <span>→</span>
            <span>{fmtMoney(maxDayAmount * FX[activeCurrency])}</span>
          </div>
        </div>

        {/* ── Day detail panel ─────────────────────────────────────────── */}
        {selectedDay && (
          <div className="mx-3 mb-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-green-800">{selectedDay}</span>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs text-slate-500 hover:text-red-500 border border-slate-300 rounded px-2 py-0.5"
              >
                {tL.closeDetail}
              </button>
            </div>
            {selectedEntry ? (
              <>
                <div className="font-bold text-green-700 mb-2">
                  {fmtMoney(selectedEntry.amount * FX[activeCurrency])} — {N(selectedEntry.deals.length)} {selectedEntry.deals.length === 1 ? tL.deal : tL.deals}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs" style={{ direction: dir }}>
                    <thead>
                      <tr className="border-b border-green-200 text-slate-600">
                        <th className="py-1 px-1 text-start font-semibold">{tL.item}</th>
                        <th className="py-1 px-1 text-start font-semibold">{tL.price}</th>
                        <th className="py-1 px-1 text-start font-semibold">{tL.buyer}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedEntry.deals.map((deal, i) => (
                        <tr key={i} className="border-b border-green-100 hover:bg-green-100/50">
                          <td className="py-1 px-1">{deal.name}</td>
                          <td className="py-1 px-1 font-semibold text-green-700">
                            {CCY_SYMBOL[activeCurrency]} {N(Math.round(deal.price * FX[activeCurrency]))}
                          </td>
                          <td className="py-1 px-1 text-slate-500">{deal.buyerCity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-xs">{tL.noDayData}</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
