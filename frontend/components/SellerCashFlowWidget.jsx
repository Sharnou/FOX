'use client';
import { useState, useMemo } from 'react';

// SellerCashFlowWidget — Monthly cash flow & earnings dashboard for XTOX sellers
// Props: transactions (array), currency ('EGP'|'SAR'|'AED'|'USD'), lang ('ar'|'en'|'de'), className

const LABELS = {
  ar: {
    title: 'التدفق المالي',
    subtitle: 'أرباحك الشهرية من الإعلانات المباعة',
    totalEarned: 'إجمالي المكتسب',
    pending: 'في الانتظار',
    received: 'تم الاستلام',
    thisMonth: 'هذا الشهر',
    lastMonth: 'الشهر الماضي',
    trend: 'الاتجاه',
    byCategory: 'حسب الفئة',
    noData: 'لا توجد معاملات بعد',
    noDataSub: 'ابدأ بنشر إعلاناتك لتتبع أرباحك',
    growth: 'نمو',
    decline: 'انخفاض',
    stable: 'مستقر',
    vehicles: 'مركبات',
    electronics: 'إلكترونيات',
    realestate: 'عقارات',
    furniture: 'أثاث',
    clothing: 'ملابس',
    other: 'أخرى',
    months: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    tips: 'نصائح لزيادة أرباحك',
    tip1: 'أضف صوراً عالية الجودة لإعلاناتك',
    tip2: 'فعّل الإعلانات المميزة في أوقات الذروة',
    tip3: 'رد على المشترين خلال ساعة لزيادة فرص البيع',
    avgPerSale: 'متوسط قيمة البيع',
    totalSales: 'إجمالي المبيعات',
    projectedMonth: 'توقع الشهر الحالي',
  },
  en: {
    title: 'Cash Flow',
    subtitle: 'Your monthly earnings from sold ads',
    totalEarned: 'Total Earned',
    pending: 'Pending',
    received: 'Received',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    trend: 'Trend',
    byCategory: 'By Category',
    noData: 'No transactions yet',
    noDataSub: 'Start listing your ads to track earnings',
    growth: 'Growth',
    decline: 'Decline',
    stable: 'Stable',
    vehicles: 'Vehicles',
    electronics: 'Electronics',
    realestate: 'Real Estate',
    furniture: 'Furniture',
    clothing: 'Clothing',
    other: 'Other',
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    tips: 'Tips to increase earnings',
    tip1: 'Add high-quality photos to your ads',
    tip2: 'Use featured ads during peak hours',
    tip3: 'Reply to buyers within 1 hour to boost sales',
    avgPerSale: 'Avg. per Sale',
    totalSales: 'Total Sales',
    projectedMonth: 'Month Projection',
  },
  de: {
    title: 'Cashflow',
    subtitle: 'Ihre monatlichen Einnahmen aus verkauften Anzeigen',
    totalEarned: 'Gesamt verdient',
    pending: 'Ausstehend',
    received: 'Erhalten',
    thisMonth: 'Diesen Monat',
    lastMonth: 'Letzten Monat',
    trend: 'Trend',
    byCategory: 'Nach Kategorie',
    noData: 'Noch keine Transaktionen',
    noDataSub: 'Schalten Sie Anzeigen, um Einnahmen zu verfolgen',
    growth: 'Wachstum',
    decline: 'Rückgang',
    stable: 'Stabil',
    vehicles: 'Fahrzeuge',
    electronics: 'Elektronik',
    realestate: 'Immobilien',
    furniture: 'Möbel',
    clothing: 'Kleidung',
    other: 'Sonstiges',
    months: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
    tips: 'Tipps zur Steigerung der Einnahmen',
    tip1: 'Fügen Sie hochwertige Fotos zu Ihren Anzeigen hinzu',
    tip2: 'Nutzen Sie Featured-Anzeigen zu Stoßzeiten',
    tip3: 'Antworten Sie Käufern innerhalb 1 Stunde',
    avgPerSale: 'Ø pro Verkauf',
    totalSales: 'Gesamtverkäufe',
    projectedMonth: 'Monatsprognose',
  },
};

const CURRENCY_SYMBOLS = { EGP: 'ج.م', SAR: 'ر.س', AED: 'د.إ', USD: '$' };
const EXCHANGE = { EGP: 1, SAR: 0.087, AED: 0.079, USD: 0.021 };

const CATEGORY_COLORS = {
  vehicles: 'bg-blue-500',
  electronics: 'bg-purple-500',
  realestate: 'bg-emerald-500',
  furniture: 'bg-amber-500',
  clothing: 'bg-pink-500',
  other: 'bg-gray-400',
};

function toArabicIndic(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function formatAmount(amount, currency, lang) {
  const converted = (amount * EXCHANGE[currency]).toFixed(0);
  const sym = CURRENCY_SYMBOLS[currency];
  const formatted = Number(converted).toLocaleString('en');
  if (lang === 'ar') return `${toArabicIndic(formatted)} ${sym}`;
  return `${sym} ${formatted}`;
}

function generateDemoTransactions() {
  const categories = ['vehicles','electronics','realestate','furniture','clothing','other'];
  const now = new Date();
  const txs = [];
  for (let i = 0; i < 5; i++) {
    const d = new Date(now);
    d.setMonth(d.getMonth() - i);
    const count = Math.floor(Math.random() * 6) + 1;
    for (let j = 0; j < count; j++) {
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const prices = { vehicles: 50000, electronics: 3000, realestate: 200000, furniture: 5000, clothing: 500, other: 1000 };
      const base = prices[cat];
      txs.push({
        id: `tx-${i}-${j}`,
        date: new Date(d.getFullYear(), d.getMonth(), Math.floor(Math.random() * 28) + 1).toISOString(),
        amount: Math.floor(base * (0.5 + Math.random())),
        category: cat,
        status: Math.random() > 0.2 ? 'received' : 'pending',
        title: cat,
      });
    }
  }
  return txs;
}

export default function SellerCashFlowWidget({
  transactions,
  currency = 'EGP',
  lang = 'ar',
  className = '',
}) {
  const [activeLang, setActiveLang] = useState(lang);
  const [activeCurrency, setActiveCurrency] = useState(currency);
  const t = LABELS[activeLang] || LABELS.ar;
  const isRTL = activeLang === 'ar';

  const txData = transactions && transactions.length > 0 ? transactions : generateDemoTransactions();

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const stats = useMemo(() => {
    const thisMonthTxs = txData.filter(tx => {
      const d = new Date(tx.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const lastMonthTxs = txData.filter(tx => {
      const d = new Date(tx.date);
      const lm = currentMonth === 0 ? 11 : currentMonth - 1;
      const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
      return d.getMonth() === lm && d.getFullYear() === ly;
    });

    const sumReceived = arr => arr.filter(x => x.status === 'received').reduce((a, x) => a + x.amount, 0);
    const sumPending = arr => arr.filter(x => x.status === 'pending').reduce((a, x) => a + x.amount, 0);
    const sumAll = arr => arr.reduce((a, x) => a + x.amount, 0);

    const thisReceived = sumReceived(thisMonthTxs);
    const thisPending = sumPending(thisMonthTxs);
    const lastReceived = sumReceived(lastMonthTxs);

    const growthPct = lastReceived > 0
      ? Math.round(((thisReceived - lastReceived) / lastReceived) * 100)
      : thisReceived > 0 ? 100 : 0;

    const totalEarned = sumReceived(txData);
    const totalSales = txData.filter(x => x.status === 'received').length;
    const avgPerSale = totalSales > 0 ? Math.round(totalEarned / totalSales) : 0;

    // By category
    const byCat = {};
    txData.filter(x => x.status === 'received').forEach(tx => {
      byCat[tx.category] = (byCat[tx.category] || 0) + tx.amount;
    });

    // Monthly totals for mini chart (last 5 months)
    const monthlyTotals = [];
    for (let i = 4; i >= 0; i--) {
      const mIdx = ((currentMonth - i) % 12 + 12) % 12;
      const yr = currentMonth - i < 0 ? currentYear - 1 : currentYear;
      const mTotal = txData.filter(tx => {
        const d = new Date(tx.date);
        return d.getMonth() === mIdx && d.getFullYear() === yr && tx.status === 'received';
      }).reduce((a, x) => a + x.amount, 0);
      monthlyTotals.push({ month: mIdx, total: mTotal });
    }

    // Projection: avg of last 3 months * (days in month / days elapsed)
    const elapsed = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const last3Avg = monthlyTotals.slice(-3).reduce((a, x) => a + x.total, 0) / 3;
    const projected = elapsed > 0 ? Math.round((thisReceived / elapsed) * daysInMonth) : 0;

    return {
      thisReceived, thisPending, lastReceived,
      growthPct, totalEarned, totalSales, avgPerSale,
      byCat, monthlyTotals, projected,
    };
  }, [txData, currentMonth, currentYear, now]);

  const maxMonthly = Math.max(...stats.monthlyTotals.map(m => m.total), 1);

  const fmt = (n) => formatAmount(n, activeCurrency, activeLang);
  const num = (n) => activeLang === 'ar' ? toArabicIndic(n) : String(n);

  const trendLabel = stats.growthPct > 5
    ? t.growth
    : stats.growthPct < -5
      ? t.decline
      : t.stable;
  const trendColor = stats.growthPct > 5
    ? 'text-emerald-600'
    : stats.growthPct < -5
      ? 'text-red-500'
      : 'text-amber-500';
  const trendIcon = stats.growthPct > 5 ? '↑' : stats.growthPct < -5 ? '↓' : '→';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`bg-white rounded-2xl shadow-lg overflow-hidden font-sans ${className}`}
      style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-xl font-bold">{t.title}</h2>
            <p className="text-emerald-100 text-sm mt-0.5">{t.subtitle}</p>
          </div>
          <div className="text-4xl opacity-80">💰</div>
        </div>

        {/* Lang / Currency Switchers */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {['ar','en','de'].map(l => (
            <button
              key={l}
              onClick={() => setActiveLang(l)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeLang === l
                  ? 'bg-white text-emerald-700'
                  : 'bg-emerald-500 bg-opacity-50 text-white hover:bg-opacity-70'
              }`}
            >
              {l === 'ar' ? 'العربية' : l === 'en' ? 'EN' : 'DE'}
            </button>
          ))}
          <div className="mx-2 border-l border-emerald-400 opacity-50" />
          {['EGP','SAR','AED','USD'].map(c => (
            <button
              key={c}
              onClick={() => setActiveCurrency(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCurrency === c
                  ? 'bg-white text-emerald-700'
                  : 'bg-emerald-500 bg-opacity-50 text-white hover:bg-opacity-70'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <div className="text-xs text-emerald-600 font-medium mb-1">{t.thisMonth}</div>
            <div className="text-lg font-bold text-emerald-700">{fmt(stats.thisReceived)}</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <div className="text-xs text-amber-600 font-medium mb-1">{t.pending}</div>
            <div className="text-lg font-bold text-amber-600">{fmt(stats.thisPending)}</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <div className="text-xs text-blue-600 font-medium mb-1">{t.totalEarned}</div>
            <div className="text-base font-bold text-blue-700 leading-tight">{fmt(stats.totalEarned)}</div>
          </div>
        </div>

        {/* Trend + Stats Row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">{t.trend}</div>
            <div className={`text-2xl font-bold ${trendColor}`}>
              {trendIcon} {num(Math.abs(stats.growthPct))}%
            </div>
            <div className={`text-xs font-medium ${trendColor}`}>{trendLabel}</div>
            <div className="text-xs text-gray-400 mt-1">{t.lastMonth}: {fmt(stats.lastReceived)}</div>
          </div>
          <div className="flex-1 bg-gray-50 rounded-xl p-3">
            <div className="text-xs text-gray-500 mb-1">{t.totalSales}</div>
            <div className="text-2xl font-bold text-gray-700">{num(stats.totalSales)}</div>
            <div className="text-xs text-gray-500 mt-1">{t.avgPerSale}: {fmt(stats.avgPerSale)}</div>
            <div className="text-xs text-emerald-600 mt-1 font-medium">{t.projectedMonth}: {fmt(stats.projected)}</div>
          </div>
        </div>

        {/* Mini Bar Chart */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>📈</span> {t.trend}
          </div>
          <div className="flex items-end gap-2 h-20">
            {stats.monthlyTotals.map((m, i) => {
              const pct = maxMonthly > 0 ? (m.total / maxMonthly) * 100 : 0;
              const isCurrentMonth = i === stats.monthlyTotals.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full relative" style={{ height: '60px' }}>
                    <div
                      className={`w-full rounded-t absolute bottom-0 transition-all duration-500 ${
                        isCurrentMonth ? 'bg-emerald-500' : 'bg-emerald-200'
                      }`}
                      style={{ height: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 text-center" style={{ fontSize: '10px' }}>
                    {t.months[m.month]}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Category */}
        {Object.keys(stats.byCat).length > 0 && (
          <div>
            <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>📊</span> {t.byCategory}
            </div>
            <div className="space-y-2">
              {Object.entries(stats.byCat)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([cat, amount]) => {
                  const total = Object.values(stats.byCat).reduce((a, v) => a + v, 0);
                  const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>{t[cat] || cat}</span>
                        <span className="font-medium">{fmt(amount)} ({num(pct)}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${CATEGORY_COLORS[cat] || 'bg-gray-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
          <div className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
            <span>💡</span> {t.tips}
          </div>
          <ul className="space-y-1">
            {[t.tip1, t.tip2, t.tip3].map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-emerald-700">
                <span className="mt-0.5 shrink-0">✓</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
