'use client';
/**
 * SellerEarningsEstimator.jsx
 * XTOX Marketplace — Seller Potential Earnings Estimator
 * Helps sellers estimate earnings from their listed items
 * considering Arab market bargaining norms and payment methods.
 *
 * Props:
 *   items          Array of { title, price (number in EGP), category }
 *   currency       'EGP' | 'SAR' | 'AED' (default 'EGP')
 *   lang           'ar' | 'en' | 'de' (default 'ar')
 *   platformFeeRate  number 0-1, default 0 (free marketplace)
 *   className      string
 */

import { useState, useMemo } from 'react';

/* ── Exchange rates (static fallback, EGP base) ───────────────── */
const FX = { EGP: 1, SAR: 0.19, AED: 0.2 };
const CURRENCY_SYMBOLS = { EGP: 'ج.م', SAR: 'ر.س', AED: 'د.إ' };

/* ── Arabic-Indic numerals ────────────────────────────────────── */
const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const fmt = (amount, currency, lang) => {
  const converted = Math.round(amount * FX[currency]);
  const numStr =
    lang === 'ar'
      ? toArabicIndic(converted.toLocaleString('en'))
      : converted.toLocaleString('en');
  return `${CURRENCY_SYMBOLS[currency]} ${numStr}`;
};

/* ── Category bargaining norms for Arab markets ───────────────── */
const BARGAIN_RATES = {
  electronics: 0.08,
  furniture: 0.18,
  vehicles: 0.12,
  clothing: 0.15,
  real_estate: 0.05,
  appliances: 0.10,
  books: 0.20,
  jewelry: 0.07,
  other: 0.15,
};

/* ── Translations ─────────────────────────────────────────────── */
const T = {
  ar: {
    title: 'تقدير الأرباح المحتملة',
    subtitle: 'احسب أرباحك المتوقعة من إعلاناتك',
    listed: 'الإجمالي المُدرج',
    afterBargain: 'بعد المساومة العادية',
    cashEarnings: 'التحصيل نقداً',
    installEarnings: 'التحصيل بالتقسيط',
    platformFee: 'رسوم المنصة',
    netEarnings: 'صافي الأرباح',
    items: 'إعلان',
    bargainNote: 'يُحسب بمتوسط خصم المساومة الشائع في الأسواق العربية لكل فئة',
    paymentSplit: 'توزيع طرق الدفع المتوقع',
    cashPct: '٦٥٪ نقداً',
    installPct: '٣٥٪ تقسيط',
    installSurcharge: 'زيادة التقسيط ١٢٪',
    tips: 'نصائح لزيادة أرباحك',
    tip1: 'ضع سعراً أعلى بـ١٠٪ لتترك هامش مساومة مريح',
    tip2: 'الإلكترونيات والسيارات: المساومة أقل — اثبت على سعرك',
    tip3: 'عرض التقسيط يزيد المبيعات بـ٤٠٪ في مصر',
    tip4: 'أفضل وقت نشر: بعد ٨ مساءً — ذروة الزيارات',
    currency: 'العملة',
    scenarioBest: 'أفضل حالة',
    scenarioRealistic: 'الحالة الواقعية',
    scenarioWorst: 'أسوأ حالة',
    scenarios: 'سيناريوهات الأرباح',
    noItems: 'أضف إعلانات لرؤية تقدير أرباحك',
    addItem: 'إضافة إعلان',
    removeItem: 'حذف',
    itemTitle: 'عنوان الإعلان',
    itemPrice: 'السعر (ج.م)',
    itemCategory: 'الفئة',
    categories: {
      electronics: 'إلكترونيات',
      furniture: 'أثاث',
      vehicles: 'سيارات',
      clothing: 'ملابس',
      real_estate: 'عقارات',
      appliances: 'أجهزة منزلية',
      books: 'كتب',
      jewelry: 'مجوهرات',
      other: 'أخرى',
    },
  },
  en: {
    title: 'Earnings Estimator',
    subtitle: 'Estimate your potential earnings from listed ads',
    listed: 'Total Listed',
    afterBargain: 'After Bargaining',
    cashEarnings: 'Cash Earnings',
    installEarnings: 'Installment Earnings',
    platformFee: 'Platform Fee',
    netEarnings: 'Net Earnings',
    items: 'ad',
    bargainNote: 'Based on typical Arab market bargaining discounts per category',
    paymentSplit: 'Expected Payment Method Split',
    cashPct: '65% Cash',
    installPct: '35% Installment',
    installSurcharge: '+12% installment surcharge',
    tips: 'Tips to Maximize Earnings',
    tip1: 'Price 10% higher to leave comfortable bargaining room',
    tip2: 'Electronics & vehicles: less bargaining — hold your price',
    tip3: 'Offering installments increases sales by 40% in Egypt',
    tip4: 'Best posting time: after 8 PM — peak traffic hours',
    currency: 'Currency',
    scenarioBest: 'Best Case',
    scenarioRealistic: 'Realistic',
    scenarioWorst: 'Worst Case',
    scenarios: 'Earnings Scenarios',
    noItems: 'Add items to see your earnings estimate',
    addItem: 'Add Item',
    removeItem: 'Remove',
    itemTitle: 'Item Title',
    itemPrice: 'Price (EGP)',
    itemCategory: 'Category',
    categories: {
      electronics: 'Electronics',
      furniture: 'Furniture',
      vehicles: 'Vehicles',
      clothing: 'Clothing',
      real_estate: 'Real Estate',
      appliances: 'Appliances',
      books: 'Books',
      jewelry: 'Jewelry',
      other: 'Other',
    },
  },
  de: {
    title: 'Gewinnschätzer',
    subtitle: 'Schätzen Sie Ihren potenziellen Gewinn aus Anzeigen',
    listed: 'Gesamtpreis',
    afterBargain: 'Nach Verhandlung',
    cashEarnings: 'Bareinnahmen',
    installEarnings: 'Rateneinnahmen',
    platformFee: 'Plattformgebühr',
    netEarnings: 'Nettogewinn',
    items: 'Anzeige',
    bargainNote: 'Basierend auf typischen arabischen Marktverhandlungsrabatten',
    paymentSplit: 'Erwartete Zahlungsaufteilung',
    cashPct: '65% Bar',
    installPct: '35% Rate',
    installSurcharge: '+12% Ratenaufschlag',
    tips: 'Tipps zur Gewinnmaximierung',
    tip1: '10% höher ansetzen für Verhandlungsspielraum',
    tip2: 'Elektronik & Fahrzeuge: weniger Verhandlung — Preis halten',
    tip3: 'Ratenangebot steigert Verkäufe um 40% in Ägypten',
    tip4: 'Beste Posting-Zeit: nach 20 Uhr — Hauptverkehrszeit',
    currency: 'Währung',
    scenarioBest: 'Bester Fall',
    scenarioRealistic: 'Realistisch',
    scenarioWorst: 'Schlechtester Fall',
    scenarios: 'Gewinnszenarien',
    noItems: 'Fügen Sie Artikel hinzu, um Ihre Gewinnschätzung zu sehen',
    addItem: 'Artikel hinzufügen',
    removeItem: 'Entfernen',
    itemTitle: 'Artikelbezeichnung',
    itemPrice: 'Preis (EGP)',
    itemCategory: 'Kategorie',
    categories: {
      electronics: 'Elektronik',
      furniture: 'Möbel',
      vehicles: 'Fahrzeuge',
      clothing: 'Kleidung',
      real_estate: 'Immobilien',
      appliances: 'Haushaltsgeräte',
      books: 'Bücher',
      jewelry: 'Schmuck',
      other: 'Sonstiges',
    },
  },
};

/* ── Stat Card ────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, color = 'gray', isRTL }) => {
  const colors = {
    green: 'bg-green-50 border-green-200 text-green-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    gray: 'bg-gray-50 border-gray-200 text-gray-800',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-xs opacity-70 mb-1">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-1">{sub}</p>}
    </div>
  );
};

/* ── Main Component ───────────────────────────────────────────── */
export default function SellerEarningsEstimator({
  items: initialItems = [],
  currency: initialCurrency = 'EGP',
  lang: initialLang = 'ar',
  platformFeeRate = 0,
  className = '',
}) {
  const [lang, setLang] = useState(initialLang);
  const [currency, setCurrency] = useState(initialCurrency);
  const [items, setItems] = useState(
    initialItems.length > 0
      ? initialItems
      : [{ id: 1, title: '', price: '', category: 'electronics' }]
  );
  const t = T[lang] || T.ar;
  const isRTL = lang === 'ar';

  /* ── Add / Remove items ─────────────────────────────────────── */
  const addItem = () =>
    setItems((prev) => [
      ...prev,
      { id: Date.now(), title: '', price: '', category: 'other' },
    ]);

  const removeItem = (id) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const updateItem = (id, field, value) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );

  /* ── Calculations ────────────────────────────────────────────── */
  const calc = useMemo(() => {
    const validItems = items.filter((i) => Number(i.price) > 0);
    if (validItems.length === 0)
      return { totalListed: 0, afterBargain: 0, cashEarnings: 0, installEarnings: 0, netEarnings: 0, best: 0, realistic: 0, worst: 0 };

    const totalListed = validItems.reduce((s, i) => s + Number(i.price), 0);

    // Weighted bargain reduction
    const afterBargain = validItems.reduce((s, i) => {
      const rate = BARGAIN_RATES[i.category] || 0.15;
      return s + Number(i.price) * (1 - rate);
    }, 0);

    // Payment method split
    const cashPortion = afterBargain * 0.65;
    const installPortion = afterBargain * 0.35 * 1.12; // 12% surcharge on installments

    const grossEarnings = cashPortion + installPortion;
    const feeDeduction = grossEarnings * platformFeeRate;
    const netEarnings = grossEarnings - feeDeduction;

    // Scenarios
    const best = totalListed * (1 - 0.05); // 5% discount
    const realistic = netEarnings;
    const worst = totalListed * (1 - 0.30); // 30% discount

    return {
      totalListed,
      afterBargain,
      cashEarnings: cashPortion,
      installEarnings: installPortion,
      netEarnings,
      best,
      realistic,
      worst,
    };
  }, [items, platformFeeRate]);

  const validCount = items.filter((i) => Number(i.price) > 0).length;

  const fmtN = (n) => fmt(n, currency, lang);

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`rounded-2xl overflow-hidden shadow-lg font-sans ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-bold">{t.title}</h2>
            <p className="text-sm opacity-80 mt-0.5">{t.subtitle}</p>
          </div>
          {/* Language + Currency switcher */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex rounded-lg overflow-hidden text-xs">
              {['ar', 'en', 'de'].map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 font-semibold transition-colors ${
                    lang === l ? 'bg-white text-emerald-700' : 'bg-emerald-700 hover:bg-emerald-600'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg overflow-hidden text-xs">
              {['EGP', 'SAR', 'AED'].map((c) => (
                <button
                  key={c}
                  onClick={() => setCurrency(c)}
                  className={`px-2 py-1 font-semibold transition-colors ${
                    currency === c ? 'bg-white text-emerald-700' : 'bg-emerald-700 hover:bg-emerald-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Net earnings hero */}
        {validCount > 0 && (
          <div className="mt-4 bg-white/15 rounded-xl p-4 text-center">
            <p className="text-sm opacity-80">{t.netEarnings}</p>
            <p className="text-4xl font-extrabold mt-1">{fmtN(calc.netEarnings)}</p>
            <p className="text-xs opacity-70 mt-1">
              {lang === 'ar'
                ? `من ${toArabicIndic(validCount)} ${t.items}`
                : `from ${validCount} ${t.items}${validCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white p-5 space-y-5">
        {/* Items input */}
        <div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row gap-2 p-3 bg-gray-50 rounded-xl"
              >
                <input
                  type="text"
                  placeholder={t.itemTitle}
                  value={item.title}
                  onChange={(e) => updateItem(item.id, 'title', e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-400"
                  dir={isRTL ? 'rtl' : 'ltr'}
                />
                <input
                  type="number"
                  placeholder={t.itemPrice}
                  value={item.price}
                  onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                  className="w-32 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-400"
                  min="0"
                />
                <select
                  value={item.category}
                  onChange={(e) => updateItem(item.id, 'category', e.target.value)}
                  className="w-36 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-emerald-400"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {Object.entries(t.categories).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(item.id)}
                    className="text-red-400 hover:text-red-600 text-xs font-semibold px-2"
                  >
                    {t.removeItem}
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addItem}
            className="mt-3 w-full border-2 border-dashed border-emerald-300 text-emerald-600 rounded-xl py-2 text-sm font-semibold hover:bg-emerald-50 transition-colors"
          >
            + {t.addItem}
          </button>
        </div>

        {validCount === 0 ? (
          <div className="text-center text-gray-400 py-6 text-sm">{t.noItems}</div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard
                label={t.listed}
                value={fmtN(calc.totalListed)}
                color="gray"
                isRTL={isRTL}
              />
              <StatCard
                label={t.afterBargain}
                value={fmtN(calc.afterBargain)}
                sub={t.bargainNote}
                color="blue"
                isRTL={isRTL}
              />
              <StatCard
                label={t.cashEarnings}
                value={fmtN(calc.cashEarnings)}
                sub={t.cashPct}
                color="green"
                isRTL={isRTL}
              />
              <StatCard
                label={t.installEarnings}
                value={fmtN(calc.installEarnings)}
                sub={t.installSurcharge}
                color="purple"
                isRTL={isRTL}
              />
              {platformFeeRate > 0 && (
                <StatCard
                  label={t.platformFee}
                  value={`-${fmtN(calc.netEarnings * platformFeeRate / (1 - platformFeeRate))}`}
                  color="red"
                  isRTL={isRTL}
                />
              )}
              <StatCard
                label={t.netEarnings}
                value={fmtN(calc.netEarnings)}
                color="green"
                isRTL={isRTL}
              />
            </div>

            {/* Scenarios */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 mb-3">{t.scenarios}</h3>
              <div className="space-y-2">
                {[
                  { label: t.scenarioBest, value: calc.best, color: 'bg-green-500', pct: 100 },
                  { label: t.scenarioRealistic, value: calc.realistic, color: 'bg-blue-500', pct: Math.round((calc.realistic / calc.best) * 100) },
                  { label: t.scenarioWorst, value: calc.worst, color: 'bg-orange-400', pct: Math.round((calc.worst / calc.best) * 100) },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-24 shrink-0">{s.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${s.color} transition-all duration-500`}
                        style={{ width: `${s.pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-gray-700 w-28 text-right shrink-0">
                      {fmtN(s.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment split */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-700 mb-3">{t.paymentSplit}</h3>
              <div className="flex gap-2 mb-2">
                <div className="h-4 bg-emerald-500 rounded-l-full" style={{ width: '65%' }} />
                <div className="h-4 bg-purple-400 rounded-r-full flex-1" />
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-emerald-500" />
                  {t.cashPct} — {fmtN(calc.cashEarnings)}
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-3 h-3 rounded-full bg-purple-400" />
                  {t.installPct} — {fmtN(calc.installEarnings)}
                </span>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-amber-800 mb-2">💡 {t.tips}</h3>
              <ul className="space-y-1">
                {[t.tip1, t.tip2, t.tip3, t.tip4].map((tip, i) => (
                  <li key={i} className="text-xs text-amber-700 flex gap-2">
                    <span className="shrink-0">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-5 py-3 text-center">
        <p className="text-xs text-gray-400">
          {lang === 'ar'
            ? 'التقديرات مبنية على متوسطات السوق العربي — النتائج الفعلية قد تختلف'
            : lang === 'de'
            ? 'Schätzungen basieren auf arabischen Marktdurchschnittswerten'
            : 'Estimates based on Arab market averages — actual results may vary'}
        </p>
      </div>
    </div>
  );
}
