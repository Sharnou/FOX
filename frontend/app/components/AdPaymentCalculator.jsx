'use client';
import { useState, useCallback } from 'react';

// ─── Arabic-Indic numeral converter ───────────────────────────────────────────
const toArabicIndic = (n) =>
  String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);

const formatNum = (n, lang) => {
  const fixed = Math.round(n).toLocaleString('en-EG');
  return lang === 'ar' ? toArabicIndic(fixed) : fixed;
};

// ─── Translations ─────────────────────────────────────────────────────────────
const LABELS = {
  ar: {
    title: 'حاسبة الأقساط الشهرية',
    subtitle: 'احسب قسطك الشهري بكل سهولة',
    itemPrice: 'سعر المنتج',
    downPayment: 'دفعة مقدمة',
    duration: 'مدة التمويل',
    interestRate: 'نسبة الفائدة السنوية',
    months: 'شهر',
    monthlyPayment: 'القسط الشهري',
    totalPayment: 'إجمالي المبلغ',
    totalInterest: 'إجمالي الفائدة',
    principal: 'المبلغ الأصلي',
    breakdown: 'تفاصيل الحساب',
    downAmt: 'الدفعة المقدمة',
    financed: 'المبلغ الممول',
    toggle: 'احسب الأقساط',
    close: 'إغلاق',
    of: 'من',
    disclaimer: '* الأرقام تقديرية. تواصل مع البنك للشروط الفعلية.',
  },
  en: {
    title: 'Monthly Payment Calculator',
    subtitle: 'Calculate your installment easily',
    itemPrice: 'Item Price',
    downPayment: 'Down Payment',
    duration: 'Loan Duration',
    interestRate: 'Annual Interest Rate',
    months: 'mo',
    monthlyPayment: 'Monthly Payment',
    totalPayment: 'Total Payment',
    totalInterest: 'Total Interest',
    principal: 'Principal',
    breakdown: 'Breakdown',
    downAmt: 'Down Payment',
    financed: 'Financed Amount',
    toggle: 'Calculate Installments',
    close: 'Close',
    of: 'of',
    disclaimer: '* Figures are estimates. Contact your bank for exact terms.',
  },
  de: {
    title: 'Ratenrechner',
    subtitle: 'Berechnen Sie Ihre Monatsrate',
    itemPrice: 'Artikelpreis',
    downPayment: 'Anzahlung',
    duration: 'Laufzeit',
    interestRate: 'Jährlicher Zinssatz',
    months: 'Mo',
    monthlyPayment: 'Monatsrate',
    totalPayment: 'Gesamtbetrag',
    totalInterest: 'Zinsen gesamt',
    principal: 'Hauptbetrag',
    breakdown: 'Aufschlüsselung',
    downAmt: 'Anzahlung',
    financed: 'Finanzierter Betrag',
    toggle: 'Raten berechnen',
    close: 'Schließen',
    of: 'von',
    disclaimer: '* Schätzwerte. Wenden Sie sich an Ihre Bank für genaue Konditionen.',
  },
};

const PRESET_DURATIONS = [3, 6, 12, 24];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdPaymentCalculator({
  price = 0,
  currency = 'EGP',
  lang = 'ar',
  className = '',
}) {
  const t = LABELS[lang] || LABELS['ar'];
  const isRTL = lang === 'ar';

  const [open, setOpen] = useState(false);
  const [downPct, setDownPct] = useState(20);     // percent
  const [duration, setDuration] = useState(12);   // months
  const [rate, setRate] = useState(25);            // annual %
  const [animated, setAnimated] = useState(false);

  // ── Derived values ──────────────────────────────────────────────────────────
  const downAmount  = (price * downPct) / 100;
  const principal   = price - downAmount;
  const monthlyRate = rate / 100 / 12;

  let monthly = 0;
  if (monthlyRate === 0) {
    monthly = duration > 0 ? principal / duration : 0;
  } else {
    monthly =
      (principal * monthlyRate * Math.pow(1 + monthlyRate, duration)) /
      (Math.pow(1 + monthlyRate, duration) - 1);
  }

  const totalPayment  = monthly * duration + downAmount;
  const totalInterest = totalPayment - price;

  // ── Toggle accordion ────────────────────────────────────────────────────────
  const handleToggle = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        setTimeout(() => setAnimated(true), 50);
      } else {
        setAnimated(false);
      }
      return !prev;
    });
  }, []);

  // ── Percentage bar helper ───────────────────────────────────────────────────
  const principalPct = price > 0 ? ((price - downAmount) / totalPayment) * 100 : 0;
  const interestPct  = price > 0 ? (totalInterest / totalPayment) * 100 : 0;
  const downPctBar   = price > 0 ? (downAmount / totalPayment) * 100 : 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={`font-cairo rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Header / Toggle ── */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 text-white hover:from-emerald-700 hover:to-teal-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-inset"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3">
          {/* Calculator icon */}
          <span className="text-2xl select-none" aria-hidden>🧮</span>
          <div className={`text-${isRTL ? 'right' : 'left'}`}>
            <p className="font-bold text-base leading-tight">{t.title}</p>
            <p className="text-emerald-100 text-xs mt-0.5">{t.subtitle}</p>
          </div>
        </div>
        {/* Chevron */}
        <span
          className={`transition-transform duration-300 text-xl ${open ? 'rotate-180' : 'rotate-0'}`}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {/* ── Collapsible body ── */}
      <div
        className={`transition-all duration-400 ease-in-out overflow-hidden ${open ? 'max-h-[900px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-5 py-5 space-y-5">

          {/* Item price display */}
          <div className="bg-emerald-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">{t.itemPrice}</span>
            <span className="font-bold text-emerald-700 text-lg">
              {formatNum(price, lang)} {currency}
            </span>
          </div>

          {/* ── Controls ── */}

          {/* Down payment slider */}
          <div
            className={`transition-all duration-500 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transitionDelay: '50ms' }}
          >
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{t.downPayment}</span>
              <span className="font-semibold text-emerald-700">
                {formatNum(downPct, lang)}% — {formatNum(downAmount, lang)} {currency}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={downPct}
              onChange={(e) => setDownPct(Number(e.target.value))}
              className="w-full h-2 rounded-full accent-emerald-500 cursor-pointer"
              aria-label={t.downPayment}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>{formatNum(0, lang)}%</span>
              <span>{formatNum(50, lang)}%</span>
            </div>
          </div>

          {/* Preset duration buttons */}
          <div
            className={`transition-all duration-500 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transitionDelay: '120ms' }}
          >
            <p className="text-sm text-gray-600 mb-2">{t.duration}</p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`rounded-xl py-2 text-sm font-semibold border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-400
                    ${duration === d
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
                    }`}
                  aria-pressed={duration === d}
                >
                  {formatNum(d, lang)} {t.months}
                </button>
              ))}
            </div>
          </div>

          {/* Interest rate slider */}
          <div
            className={`transition-all duration-500 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            style={{ transitionDelay: '190ms' }}
          >
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{t.interestRate}</span>
              <span className="font-semibold text-amber-600">
                {formatNum(rate, lang)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="w-full h-2 rounded-full accent-amber-500 cursor-pointer"
              aria-label={t.interestRate}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>{formatNum(0, lang)}%</span>
              <span>{formatNum(40, lang)}%</span>
            </div>
          </div>

          {/* ── Results Card ── */}
          <div
            className={`transition-all duration-500 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
            style={{ transitionDelay: '270ms' }}
          >
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-100 space-y-4">

              {/* Monthly payment hero */}
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-1">{t.monthlyPayment}</p>
                <p className="text-4xl font-extrabold text-emerald-700 tracking-tight">
                  {formatNum(monthly, lang)}
                  <span className="text-base font-semibold text-gray-500 ms-1">{currency}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  × {formatNum(duration, lang)} {t.months}
                </p>
              </div>

              {/* Summary grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: t.downAmt,      value: downAmount,    color: 'text-blue-600' },
                  { label: t.totalPayment, value: totalPayment,  color: 'text-emerald-700' },
                  { label: t.totalInterest,value: totalInterest, color: 'text-amber-600' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white rounded-xl py-2 px-1 shadow-sm">
                    <p className={`text-sm font-bold ${color}`}>{formatNum(value, lang)}</p>
                    <p className="text-[10px] text-gray-500 leading-tight mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Stacked bar breakdown */}
              <div>
                <p className="text-xs text-gray-500 mb-2">{t.breakdown}</p>
                <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                  <div
                    className="bg-blue-400 transition-all duration-700"
                    style={{ width: `${downPctBar}%` }}
                    title={t.downAmt}
                  />
                  <div
                    className="bg-emerald-500 transition-all duration-700"
                    style={{ width: `${principalPct}%` }}
                    title={t.principal}
                  />
                  <div
                    className="bg-amber-400 transition-all duration-700"
                    style={{ width: `${interestPct}%` }}
                    title={t.totalInterest}
                  />
                </div>
                <div className="flex gap-3 mt-1.5 text-[10px] text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>{t.downAmt}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>{t.financed}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>{t.totalInterest}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-gray-400 text-center">{t.disclaimer}</p>

        </div>
      </div>
    </div>
  );
}
