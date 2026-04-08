'use client';
import { useState, useCallback } from 'react';

const LANGS = {
  ar: {
    title: 'حاسبة التمويل الإسلامي',
    subtitle: 'احسب أقساطك وفق صيغة المرابحة الإسلامية بدون فوائد ربوية',
    itemPrice: 'سعر السلعة',
    downPayment: 'الدفعة المقدمة',
    profitRate: 'نسبة الربح السنوية',
    months: 'مدة التقسيط (أشهر)',
    calculate: 'احسب التمويل',
    result: 'نتيجة التمويل',
    totalCost: 'إجمالي التكلفة',
    monthlyPayment: 'القسط الشهري',
    profitAmount: 'مبلغ الربح',
    financedAmount: 'المبلغ الممول',
    halal: '✓ تمويل حلال — بدون فوائد ربوية',
    currency: 'العملة',
    tip: '💡 المرابحة: البنك يشتري السلعة ويبيعها لك بسعر أعلى مع تقسيط مريح',
    currencies: { EGP: 'جنيه مصري', SAR: 'ريال سعودي', AED: 'درهم إماراتي', KWD: 'دينار كويتي' },
    monthsOptions: { 6: '٦ أشهر', 12: '١٢ شهراً', 18: '١٨ شهراً', 24: '٢٤ شهراً', 36: '٣٦ شهراً', 48: '٤٨ شهراً', 60: '٦٠ شهراً' },
    resetLabel: 'إعادة الحساب',
    breakdown: 'تفاصيل الأقساط',
    month: 'الشهر',
    payment: 'القسط',
    balance: 'الرصيد المتبقي',
  },
  en: {
    title: 'Islamic Finance Calculator',
    subtitle: 'Calculate installments via Murabaha — zero interest (halal)',
    itemPrice: 'Item Price',
    downPayment: 'Down Payment',
    profitRate: 'Annual Profit Rate',
    months: 'Installment Period (months)',
    calculate: 'Calculate',
    result: 'Finance Summary',
    totalCost: 'Total Cost',
    monthlyPayment: 'Monthly Payment',
    profitAmount: 'Profit Amount',
    financedAmount: 'Financed Amount',
    halal: '✓ Halal Finance — No Riba (Interest)',
    currency: 'Currency',
    tip: '💡 Murabaha: seller discloses cost + profit margin, you pay in installments',
    currencies: { EGP: 'EGP', SAR: 'SAR', AED: 'AED', KWD: 'KWD' },
    monthsOptions: { 6: '6 mo', 12: '12 mo', 18: '18 mo', 24: '24 mo', 36: '36 mo', 48: '48 mo', 60: '60 mo' },
    resetLabel: 'Reset',
    breakdown: 'Payment Breakdown',
    month: 'Month',
    payment: 'Payment',
    balance: 'Balance',
  },
  de: {
    title: 'Islamischer Finanzrechner',
    subtitle: 'Berechnen Sie Ratenzahlungen via Murabaha — zinsfrei',
    itemPrice: 'Artikelpreis',
    downPayment: 'Anzahlung',
    profitRate: 'Jährliche Gewinnrate',
    months: 'Laufzeit (Monate)',
    calculate: 'Berechnen',
    result: 'Finanzierungsübersicht',
    totalCost: 'Gesamtkosten',
    monthlyPayment: 'Monatliche Rate',
    profitAmount: 'Gewinnbetrag',
    financedAmount: 'Finanzierter Betrag',
    halal: '✓ Halal-Finanzierung — Kein Riba (Zins)',
    currency: 'Währung',
    tip: '💡 Murabaha: Kosten + Gewinnmarge werden offengelegt, Zahlung in Raten',
    currencies: { EGP: 'EGP', SAR: 'SAR', AED: 'AED', KWD: 'KWD' },
    monthsOptions: { 6: '6 Mo', 12: '12 Mo', 18: '18 Mo', 24: '24 Mo', 36: '36 Mo', 48: '48 Mo', 60: '60 Mo' },
    resetLabel: 'Zurücksetzen',
    breakdown: 'Ratendetails',
    month: 'Monat',
    payment: 'Rate',
    balance: 'Restbetrag',
  },
};

const toArabicIndic = (num, lang) => {
  if (lang !== 'ar') return num.toString();
  return num.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
};

const fmt = (n, lang, currency) => {
  const fixed = Math.round(n).toLocaleString('en-US');
  return lang === 'ar' ? toArabicIndic(fixed.replace(/,/g, '،'), lang) + ' ' + currency : fixed + ' ' + currency;
};

export default function IslamicFinanceCalculator({ itemPrice = 10000, currency = 'EGP', lang = 'ar', className = '' }) {
  const [activeLang, setActiveLang] = useState(lang);
  const [cur, setCur] = useState(currency);
  const [price, setPrice] = useState(itemPrice);
  const [down, setDown] = useState(Math.round(itemPrice * 0.2));
  const [profitRate, setProfitRate] = useState(8);
  const [months, setMonths] = useState(12);
  const [result, setResult] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const t = LANGS[activeLang] || LANGS.ar;
  const isRTL = activeLang === 'ar';

  const calculate = useCallback(() => {
    const financed = price - down;
    if (financed <= 0) return;
    const totalProfit = financed * (profitRate / 100) * (months / 12);
    const totalCost = financed + totalProfit;
    const monthly = totalCost / months;
    setResult({ financed, totalProfit, totalCost: price - down + totalProfit, monthly, months });
    setShowBreakdown(false);
  }, [price, down, profitRate, months]);

  const reset = () => { setResult(null); setShowBreakdown(false); };

  const breakdownRows = result
    ? Array.from({ length: Math.min(result.months, 6) }, (_, i) => {
        const paid = result.monthly * (i + 1);
        const remaining = Math.max(0, result.totalCost - paid);
        return { month: i + 1, payment: result.monthly, balance: remaining };
      })
    : [];

  return (
    <div
      className={`font-[Cairo,Tajawal,sans-serif] rounded-2xl shadow-xl overflow-hidden max-w-md w-full mx-auto ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-lg leading-tight">{t.title}</div>
            <div className="text-emerald-200 text-xs mt-1">{t.subtitle}</div>
          </div>
          {/* Lang switcher */}
          <div className="flex gap-1">
            {['ar', 'en', 'de'].map(l => (
              <button
                key={l}
                onClick={() => setActiveLang(l)}
                className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${activeLang === l ? 'bg-white text-emerald-800' : 'bg-emerald-600/50 text-white hover:bg-emerald-500/60'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 text-xs bg-emerald-800/50 rounded-lg px-3 py-2 text-emerald-100">{t.tip}</div>
      </div>

      <div className="bg-white dark:bg-gray-900 p-5 space-y-4">
        {/* Currency selector */}
        <div>
          <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">{t.currency}</label>
          <div className="flex gap-2 flex-wrap">
            {Object.keys(t.currencies).map(c => (
              <button
                key={c}
                onClick={() => setCur(c)}
                className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${cur === c ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-emerald-400'}`}
              >
                {t.currencies[c]}
              </button>
            ))}
          </div>
        </div>

        {/* Item Price */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-1">{t.itemPrice}</label>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(Number(e.target.value))}
            className="w-full border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Down Payment */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t.downPayment}</label>
            <span className="text-xs text-emerald-600 font-bold">
              {price > 0 ? toArabicIndic(Math.round((down / price) * 100), activeLang) : '0'}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={price}
            step={100}
            value={down}
            onChange={e => setDown(Number(e.target.value))}
            className="w-full accent-emerald-600"
            dir="ltr"
          />
          <div className="text-center text-sm font-bold text-emerald-700 dark:text-emerald-400 mt-1">
            {fmt(down, activeLang, cur)}
          </div>
        </div>

        {/* Profit Rate */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">{t.profitRate}</label>
            <span className="text-xs text-emerald-600 font-bold">{toArabicIndic(profitRate, activeLang)}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={25}
            step={0.5}
            value={profitRate}
            onChange={e => setProfitRate(Number(e.target.value))}
            className="w-full accent-emerald-600"
            dir="ltr"
          />
        </div>

        {/* Months */}
        <div>
          <label className="text-xs font-semibold text-gray-600 dark:text-gray-300 block mb-2">{t.months}</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(t.monthsOptions).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMonths(Number(m))}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${months === Number(m) ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-400'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Calculate Button */}
        <button
          onClick={calculate}
          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 rounded-xl transition-all shadow-md text-sm"
        >
          {t.calculate}
        </button>

        {/* Results */}
        {result && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 space-y-3 border border-emerald-200 dark:border-emerald-800">
            <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300 border-b border-emerald-200 dark:border-emerald-700 pb-2">{t.result}</div>

            {/* Halal badge */}
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-800/40 px-3 py-1.5 rounded-full inline-block">
              {t.halal}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.monthlyPayment}</div>
                <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">{fmt(result.monthly, activeLang, cur)}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.totalCost}</div>
                <div className="text-lg font-extrabold text-gray-800 dark:text-gray-100">{fmt(result.totalCost + down, activeLang, cur)}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.financedAmount}</div>
                <div className="text-base font-bold text-gray-700 dark:text-gray-200">{fmt(result.financed, activeLang, cur)}</div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t.profitAmount}</div>
                <div className="text-base font-bold text-amber-600">{fmt(result.totalProfit, activeLang, cur)}</div>
              </div>
            </div>

            {/* Breakdown toggle */}
            <button
              onClick={() => setShowBreakdown(v => !v)}
              className="w-full text-xs text-emerald-600 dark:text-emerald-400 font-semibold py-1 hover:underline"
            >
              {showBreakdown ? '▲' : '▼'} {t.breakdown}
            </button>

            {showBreakdown && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                      <th className="p-2 font-bold">{t.month}</th>
                      <th className="p-2 font-bold">{t.payment}</th>
                      <th className="p-2 font-bold">{t.balance}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdownRows.map(row => (
                      <tr key={row.month} className="border-b border-emerald-100 dark:border-emerald-900/30">
                        <td className="p-2 text-center font-semibold">{toArabicIndic(row.month, activeLang)}</td>
                        <td className="p-2 text-center">{fmt(row.payment, activeLang, cur)}</td>
                        <td className="p-2 text-center text-gray-500">{fmt(row.balance, activeLang, cur)}</td>
                      </tr>
                    ))}
                    {result.months > 6 && (
                      <tr><td colSpan={3} className="text-center text-gray-400 p-2">...</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <button onClick={reset} className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 pt-1">
              ↩ {t.resetLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
