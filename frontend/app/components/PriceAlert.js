'use client';
import { useState, useEffect } from 'react';

const t = {
  ar: {
    btn: 'تنبيه السعر',
    title: 'تنبيهات السعر',
    add: 'إضافة تنبيه جديد',
    keyword: 'الكلمة المفتاحية',
    keywordPh: 'مثال: آيفون 14',
    maxPrice: 'السعر الأقصى',
    currency: 'العملة',
    save: 'حفظ التنبيه',
    cancel: 'إلغاء',
    myAlerts: 'تنبيهاتي',
    noAlerts: 'لا توجد تنبيهات حتى الآن',
    delete: 'حذف',
    added: 'تم إضافة التنبيه',
    below: 'أقل من',
  },
  en: {
    btn: 'Price Alert',
    title: 'Price Alerts',
    add: 'Add New Alert',
    keyword: 'Keyword',
    keywordPh: 'e.g. iPhone 14',
    maxPrice: 'Max Price',
    currency: 'Currency',
    save: 'Save Alert',
    cancel: 'Cancel',
    myAlerts: 'My Alerts',
    noAlerts: 'No alerts yet',
    delete: 'Delete',
    added: 'Alert added',
    below: 'below',
  },
};

const CURRENCIES = ['EGP', 'USD', 'EUR', 'SAR', 'AED'];
const STORAGE_KEY = 'xtox_price_alerts';

export default function PriceAlert({ lang = 'ar', keyword = '' }) {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState({ keyword: keyword || '', maxPrice: '', currency: 'EGP' });
  const [saved, setSaved] = useState(false);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const tx = t[lang] || t.ar;

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setAlerts(stored);
    } catch { setAlerts([]); }
  }, []);

  useEffect(() => {
    if (keyword) setForm(f => ({ ...f, keyword }));
  }, [keyword]);

  const saveAlerts = (updated) => {
    setAlerts(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.keyword.trim() || !form.maxPrice) return;
    const newAlert = {
      id: Date.now(),
      keyword: form.keyword.trim(),
      maxPrice: Number(form.maxPrice),
      currency: form.currency,
      createdAt: new Date().toISOString(),
      lang,
    };
    saveAlerts([newAlert, ...alerts]);
    setForm({ keyword: keyword || '', maxPrice: '', currency: 'EGP' });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleDelete = (id) => {
    saveAlerts(alerts.filter(a => a.id !== id));
  };

  return (
    <div dir={dir} className="relative inline-block">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 text-yellow-300 text-sm font-medium transition-all"
        aria-label={tx.btn}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {tx.btn}
        {alerts.length > 0 && (
          <span className="bg-yellow-400 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6"
            dir={dir}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-bold text-lg">{tx.title}</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            {/* Add form */}
            <form onSubmit={handleAdd} className="bg-white/5 rounded-xl p-4 mb-5 space-y-3">
              <p className="text-gray-300 text-sm font-medium">{tx.add}</p>
              <div>
                <label className="text-gray-400 text-xs mb-1 block">{tx.keyword}</label>
                <input
                  type="text"
                  value={form.keyword}
                  onChange={e => setForm(f => ({ ...f, keyword: e.target.value }))}
                  placeholder={tx.keywordPh}
                  required
                  className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-yellow-400/50"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-gray-400 text-xs mb-1 block">{tx.maxPrice}</label>
                  <input
                    type="number"
                    min="0"
                    value={form.maxPrice}
                    onChange={e => setForm(f => ({ ...f, maxPrice: e.target.value }))}
                    required
                    className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50"
                  />
                </div>
                <div className="w-24">
                  <label className="text-gray-400 text-xs mb-1 block">{tx.currency}</label>
                  <select
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full bg-white/10 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:outline-none focus:border-yellow-400/50"
                  >
                    {CURRENCIES.map(c => <option key={c} value={c} className="bg-gray-800">{c}</option>)}
                  </select>
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-sm transition-all"
              >
                {saved ? '✓ ' + tx.added : tx.save}
              </button>
            </form>

            {/* Alert list */}
            <div>
              <p className="text-gray-400 text-xs mb-2 font-medium">{tx.myAlerts}</p>
              {alerts.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">{tx.noAlerts}</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {alerts.map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-white text-sm font-medium">{a.keyword}</p>
                        <p className="text-yellow-400 text-xs">{tx.below} {a.maxPrice.toLocaleString()} {a.currency}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded-lg hover:bg-red-400/10 transition-all"
                      >
                        {tx.delete}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
