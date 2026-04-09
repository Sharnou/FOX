'use client';
import { useState, useCallback } from 'react';

const LABELS = {
  ar: {
    title: 'مخطط ميزانية المشتري',
    subtitle: 'خطط لمشترياتك بذكاء',
    totalBudget: 'الميزانية الإجمالية',
    addItem: 'إضافة بند',
    itemName: 'اسم المنتج',
    itemPrice: 'السعر المتوقع',
    category: 'الفئة',
    priority: 'الأولوية',
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
    spent: 'المصروف',
    remaining: 'المتبقي',
    savings: 'المدخرات المقترحة',
    overBudget: 'تجاوزت الميزانية',
    items: 'البنود',
    remove: 'حذف',
    total: 'الإجمالي',
    budgetHealth: 'صحة الميزانية',
    excellent: 'ممتاز',
    good: 'جيد',
    fair: 'مقبول',
    tight: 'ضيق',
    overLimit: 'تجاوز الحد',
    tip: 'نصيحة',
    tips: [
      'قارن الأسعار بين البائعين قبل الشراء',
      'اسأل البائع عن إمكانية التفاوض على السعر',
      'تحقق من حالة المنتج قبل الشراء',
      'احتفظ بـ 10% من الميزانية للطوارئ',
    ],
    categories: ['إلكترونيات', 'أثاث', 'ملابس', 'سيارات', 'عقارات', 'أخرى'],
    currency: 'العملة',
    arabicNums: 'أرقام عربية',
    addBtn: 'إضافة',
    clearAll: 'مسح الكل',
    summary: 'ملخص',
    priorityBreakdown: 'توزيع الأولويات',
    highItems: 'بنود عالية الأولوية',
    medItems: 'بنود متوسطة',
    lowItems: 'بنود منخفضة',
  },
  en: {
    title: 'Buyer Budget Planner',
    subtitle: 'Plan your purchases smartly',
    totalBudget: 'Total Budget',
    addItem: 'Add Item',
    itemName: 'Product Name',
    itemPrice: 'Expected Price',
    category: 'Category',
    priority: 'Priority',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    spent: 'Spent',
    remaining: 'Remaining',
    savings: 'Suggested Savings',
    overBudget: 'Over Budget',
    items: 'Items',
    remove: 'Remove',
    total: 'Total',
    budgetHealth: 'Budget Health',
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    tight: 'Tight',
    overLimit: 'Over Limit',
    tip: 'Tip',
    tips: [
      'Compare prices between sellers before buying',
      'Ask the seller about negotiating the price',
      'Check the product condition before buying',
      'Keep 10% of budget for emergencies',
    ],
    categories: ['Electronics', 'Furniture', 'Clothing', 'Cars', 'Real Estate', 'Other'],
    currency: 'Currency',
    arabicNums: 'Arabic numerals',
    addBtn: 'Add',
    clearAll: 'Clear All',
    summary: 'Summary',
    priorityBreakdown: 'Priority Breakdown',
    highItems: 'High priority items',
    medItems: 'Medium priority',
    lowItems: 'Low priority',
  },
  de: {
    title: 'Käufer-Budgetplaner',
    subtitle: 'Planen Sie Ihre Einkäufe clever',
    totalBudget: 'Gesamtbudget',
    addItem: 'Artikel hinzufügen',
    itemName: 'Produktname',
    itemPrice: 'Erwarteter Preis',
    category: 'Kategorie',
    priority: 'Priorität',
    high: 'Hoch',
    medium: 'Mittel',
    low: 'Niedrig',
    spent: 'Ausgegeben',
    remaining: 'Verbleibend',
    savings: 'Empfohlene Ersparnis',
    overBudget: 'Budget überschritten',
    items: 'Artikel',
    remove: 'Entfernen',
    total: 'Gesamt',
    budgetHealth: 'Budget-Gesundheit',
    excellent: 'Ausgezeichnet',
    good: 'Gut',
    fair: 'Akzeptabel',
    tight: 'Knapp',
    overLimit: 'Überschritten',
    tip: 'Tipp',
    tips: [
      'Vergleichen Sie Preise zwischen Verkäufern',
      'Fragen Sie nach Verhandlungsmöglichkeiten',
      'Prüfen Sie den Produktzustand vor dem Kauf',
      'Halten Sie 10% des Budgets für Notfälle',
    ],
    categories: ['Elektronik', 'Möbel', 'Kleidung', 'Autos', 'Immobilien', 'Sonstiges'],
    currency: 'Währung',
    arabicNums: 'Arab. Ziffern',
    addBtn: 'Hinzufügen',
    clearAll: 'Alles löschen',
    summary: 'Zusammenfassung',
    priorityBreakdown: 'Prioritätsverteilung',
    highItems: 'Hohe Priorität',
    medItems: 'Mittlere Priorität',
    lowItems: 'Niedrige Priorität',
  },
};

const CURRENCIES = {
  EGP: { symbol: 'ج.م', rate: 1 },
  SAR: { symbol: 'ر.س', rate: 0.083 },
  AED: { symbol: 'د.إ', rate: 0.076 },
  USD: { symbol: '$', rate: 0.021 },
};

const PRIORITY_COLORS = {
  high: 'bg-red-100 border-red-400 text-red-700',
  medium: 'bg-yellow-100 border-yellow-400 text-yellow-700',
  low: 'bg-green-100 border-green-400 text-green-700',
};

const PRIORITY_BAR = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

function toArabicNums(n, use) {
  if (!use) return n;
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function fmt(n, currency, useAr) {
  const { symbol, rate } = CURRENCIES[currency] || CURRENCIES.EGP;
  const val = Math.round(n * rate);
  const s = val.toLocaleString('en');
  const display = useAr ? s.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : s;
  return `${display} ${symbol}`;
}

export default function BuyerBudgetPlanner({
  initialBudget = 0,
  currency: initCurrency = 'EGP',
  lang: initLang = 'ar',
  className = '',
}) {
  const [lang, setLang] = useState(initLang);
  const [currency, setCurrency] = useState(initCurrency);
  const [useArabicNums, setUseArabicNums] = useState(initLang === 'ar');
  const [budget, setBudget] = useState(initialBudget || '');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ name: '', price: '', category: '', priority: 'medium' });
  const [tipIdx, setTipIdx] = useState(0);

  const L = LABELS[lang] || LABELS.ar;
  const isRtl = lang === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';

  const totalSpent = items.reduce((s, i) => s + Number(i.price || 0), 0);
  const budgetNum = Number(budget) || 0;
  const remaining = budgetNum - totalSpent;
  const pct = budgetNum > 0 ? Math.min((totalSpent / budgetNum) * 100, 100) : 0;
  const overBudget = totalSpent > budgetNum && budgetNum > 0;

  const healthLabel = () => {
    if (!budgetNum) return '';
    const ratio = totalSpent / budgetNum;
    if (ratio <= 0.7) return L.excellent;
    if (ratio <= 0.85) return L.good;
    if (ratio <= 1.0) return L.fair;
    return L.overLimit;
  };

  const healthColor = () => {
    if (!budgetNum) return 'text-gray-500';
    const ratio = totalSpent / budgetNum;
    if (ratio <= 0.7) return 'text-green-600';
    if (ratio <= 0.85) return 'text-blue-600';
    if (ratio <= 1.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const barColor = () => {
    if (!budgetNum) return 'bg-gray-300';
    const ratio = totalSpent / budgetNum;
    if (ratio <= 0.7) return 'bg-green-500';
    if (ratio <= 0.85) return 'bg-blue-500';
    if (ratio <= 1.0) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const addItem = useCallback(() => {
    if (!form.name.trim() || !form.price) return;
    setItems(prev => [...prev, { ...form, id: Date.now() }]);
    setForm({ name: '', price: '', category: '', priority: 'medium' });
  }, [form]);

  const removeItem = useCallback(id => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const priorityCounts = {
    high: items.filter(i => i.priority === 'high').length,
    medium: items.filter(i => i.priority === 'medium').length,
    low: items.filter(i => i.priority === 'low').length,
  };

  const suggestedSavings = budgetNum > 0 ? Math.round(budgetNum * 0.1) : 0;
  const nextTip = () => setTipIdx(i => (i + 1) % L.tips.length);

  return (
    <div
      dir={dir}
      className={`font-[Cairo,Tajawal,sans-serif] bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl shadow-xl p-5 max-w-lg mx-auto ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-indigo-800">{L.title}</h2>
          <p className="text-xs text-indigo-500">{L.subtitle}</p>
        </div>
        <div className="flex gap-1 flex-wrap justify-end">
          {['ar', 'en', 'de'].map(l => (
            <button
              key={l}
              onClick={() => { setLang(l); setUseArabicNums(l === 'ar'); }}
              className={`text-xs px-2 py-0.5 rounded-full border transition ${lang === l ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-300'}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Currency + Arabic nums row */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.keys(CURRENCIES).map(c => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`text-xs px-3 py-1 rounded-full border transition ${currency === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-indigo-600 border-indigo-200'}`}
          >
            {c}
          </button>
        ))}
        <button
          onClick={() => setUseArabicNums(v => !v)}
          className={`text-xs px-3 py-1 rounded-full border transition ms-auto ${useArabicNums ? 'bg-indigo-100 text-indigo-700 border-indigo-400' : 'bg-white text-gray-500 border-gray-200'}`}
        >
          {L.arabicNums}
        </button>
      </div>

      {/* Budget input */}
      <div className="mb-5">
        <label className="text-sm font-semibold text-gray-700 block mb-1">{L.totalBudget}</label>
        <div className="relative">
          <input
            type="number"
            min="0"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            placeholder="0"
            className="w-full border-2 border-indigo-200 rounded-xl px-4 py-2 text-lg font-bold text-indigo-800 focus:border-indigo-500 outline-none bg-white"
          />
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            {CURRENCIES[currency]?.symbol}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      {budgetNum > 0 && (
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">{L.spent}: {fmt(totalSpent, currency, useArabicNums)}</span>
            <span className={overBudget ? 'text-red-600 font-bold' : 'text-green-600'}>
              {overBudget ? `${L.overBudget}!` : `${L.remaining}: ${fmt(remaining, currency, useArabicNums)}`}
            </span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor()}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1">
            <span>{L.budgetHealth}: <span className={`font-bold ${healthColor()}`}>{healthLabel()}</span></span>
            <span className="text-gray-400">{toArabicNums(Math.round(pct), useArabicNums)}%</span>
          </div>
        </div>
      )}

      {/* Add item form */}
      <div className="bg-white rounded-xl border border-indigo-100 p-3 mb-4">
        <p className="text-sm font-semibold text-indigo-700 mb-2">{L.addItem}</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            placeholder={L.itemName}
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="col-span-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-400 outline-none"
          />
          <input
            type="number"
            min="0"
            placeholder={L.itemPrice}
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-400 outline-none"
          />
          <select
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-indigo-400 outline-none"
          >
            <option value="high">{L.high}</option>
            <option value="medium">{L.medium}</option>
            <option value="low">{L.low}</option>
          </select>
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="col-span-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:border-indigo-400 outline-none"
          >
            <option value="">{L.category}...</option>
            {L.categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={addItem}
            disabled={!form.name.trim() || !form.price}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-bold py-1.5 rounded-lg transition"
          >
            {L.addBtn}
          </button>
          {items.length > 0 && (
            <button
              onClick={() => setItems([])}
              className="px-3 py-1.5 text-xs border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition"
            >
              {L.clearAll}
            </button>
          )}
        </div>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">{L.items} ({toArabicNums(items.length, useArabicNums)})</p>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {items.map(item => (
              <div
                key={item.id}
                className={`flex items-center gap-2 border rounded-xl px-3 py-2 ${PRIORITY_COLORS[item.priority]}`}
              >
                <div className={`w-2 h-8 rounded-full flex-shrink-0 ${PRIORITY_BAR[item.priority]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.name}</p>
                  {item.category && <p className="text-xs opacity-70">{item.category}</p>}
                </div>
                <span className="text-sm font-bold flex-shrink-0">{fmt(Number(item.price), currency, useArabicNums)}</span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-xs opacity-60 hover:opacity-100 flex-shrink-0 px-1"
                  aria-label={L.remove}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 px-1">
            <span className="text-sm font-bold text-gray-700">{L.total}</span>
            <span className={`text-sm font-bold ${overBudget ? 'text-red-600' : 'text-indigo-700'}`}>
              {fmt(totalSpent, currency, useArabicNums)}
            </span>
          </div>
        </div>
      )}

      {/* Summary & Priority Breakdown */}
      {items.length > 0 && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-3 mb-4">
          <p className="text-sm font-semibold text-indigo-800 mb-2">{L.priorityBreakdown}</p>
          <div className="space-y-1">
            {[['high', L.highItems], ['medium', L.medItems], ['low', L.lowItems]].map(([p, label]) => (
              <div key={p} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${PRIORITY_BAR[p]}`} />
                <span className="text-xs flex-1">{label}</span>
                <span className="text-xs font-bold">{toArabicNums(priorityCounts[p], useArabicNums)}</span>
              </div>
            ))}
          </div>
          {suggestedSavings > 0 && (
            <div className="mt-2 pt-2 border-t border-indigo-200 flex justify-between">
              <span className="text-xs text-indigo-600">{L.savings} (10%)</span>
              <span className="text-xs font-bold text-indigo-700">{fmt(suggestedSavings, currency, useArabicNums)}</span>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      <div
        onClick={nextTip}
        className="bg-amber-50 border border-amber-200 rounded-xl p-3 cursor-pointer hover:bg-amber-100 transition"
      >
        <p className="text-xs font-bold text-amber-700 mb-0.5">💡 {L.tip}</p>
        <p className="text-xs text-amber-800">{L.tips[tipIdx]}</p>
        <p className="text-xs text-amber-400 mt-1 text-end">← {lang === 'ar' ? 'انقر للتالي' : lang === 'en' ? 'Click for next' : 'Klicken'}</p>
      </div>
    </div>
  );
}
