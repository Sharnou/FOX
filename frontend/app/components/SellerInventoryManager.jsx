'use client';
import { useState, useMemo } from 'react';

// Arabic-Indic numeral converter
const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const LABELS = {
  ar: {
    title: 'مخزون إعلاناتي',
    all: 'الكل',
    active: 'نشط',
    pending: 'قيد المراجعة',
    sold: 'مباع',
    expired: 'منتهي',
    sortBy: 'ترتيب حسب',
    newest: 'الأحدث',
    views: 'المشاهدات',
    price: 'السعر',
    selectAll: 'تحديد الكل',
    renew: 'تجديد',
    boost: 'تمييز',
    delete: 'حذف',
    bulkActions: 'إجراءات جماعية',
    noAds: 'لا توجد إعلانات',
    totalActive: 'إعلانات نشطة',
    soldThisMonth: 'مباع هذا الشهر',
    totalViews: 'إجمالي المشاهدات',
    totalChats: 'إجمالي المحادثات',
    viewsLabel: 'مشاهدة',
    chatsLabel: 'محادثة',
    daysLeft: 'يوم متبقي',
    egp: 'ج.م',
    featured: 'مميز',
    confirm: 'تأكيد الحذف؟',
    yes: 'نعم',
    no: 'لا',
    selectItems: 'حدد عناصر أولاً',
    numerals: 'أرقام عربية',
  },
  en: {
    title: 'My Ad Inventory',
    all: 'All',
    active: 'Active',
    pending: 'Pending',
    sold: 'Sold',
    expired: 'Expired',
    sortBy: 'Sort by',
    newest: 'Newest',
    views: 'Views',
    price: 'Price',
    selectAll: 'Select All',
    renew: 'Renew',
    boost: 'Boost',
    delete: 'Delete',
    bulkActions: 'Bulk Actions',
    noAds: 'No ads found',
    totalActive: 'Active Ads',
    soldThisMonth: 'Sold This Month',
    totalViews: 'Total Views',
    totalChats: 'Total Chats',
    viewsLabel: 'views',
    chatsLabel: 'chats',
    daysLeft: 'd left',
    egp: 'EGP',
    featured: 'Featured',
    confirm: 'Confirm delete?',
    yes: 'Yes',
    no: 'No',
    selectItems: 'Select items first',
    numerals: 'Arabic Numerals',
  },
  de: {
    title: 'Meine Anzeigen',
    all: 'Alle',
    active: 'Aktiv',
    pending: 'Ausstehend',
    sold: 'Verkauft',
    expired: 'Abgelaufen',
    sortBy: 'Sortieren nach',
    newest: 'Neueste',
    views: 'Aufrufe',
    price: 'Preis',
    selectAll: 'Alle wählen',
    renew: 'Erneuern',
    boost: 'Boosten',
    delete: 'Löschen',
    bulkActions: 'Massenaktionen',
    noAds: 'Keine Anzeigen',
    totalActive: 'Aktive Anzeigen',
    soldThisMonth: 'Diesen Monat verkauft',
    totalViews: 'Gesamtaufrufe',
    totalChats: 'Gesamtchats',
    viewsLabel: 'Aufrufe',
    chatsLabel: 'Chats',
    daysLeft: 'T. übrig',
    egp: 'EGP',
    featured: 'Empfohlen',
    confirm: 'Löschen bestätigen?',
    yes: 'Ja',
    no: 'Nein',
    selectItems: 'Erst Elemente auswählen',
    numerals: 'Arabische Ziffern',
  },
};

const MOCK_ADS = [
  { id: 'a1', title: 'آيفون 15 برو ماكس - حالة ممتازة', price: 45000, currency: 'EGP', status: 'active', views: 1240, chats: 18, daysLeft: 22, featured: true, image: '📱', category: 'إلكترونيات', createdAt: '2026-03-19' },
  { id: 'a2', title: 'شقة للإيجار - المعادي، القاهرة', price: 8500, currency: 'EGP', status: 'active', views: 870, chats: 11, daysLeft: 15, featured: false, image: '🏠', category: 'عقارات', createdAt: '2026-03-26' },
  { id: 'a3', title: 'سيارة هيونداي إيلانترا 2022', price: 420000, currency: 'EGP', status: 'pending', views: 0, chats: 0, daysLeft: 30, featured: false, image: '🚗', category: 'سيارات', createdAt: '2026-04-09' },
  { id: 'a4', title: 'لابتوب ديل XPS 15 - جيل 13', price: 32000, currency: 'EGP', status: 'sold', views: 540, chats: 9, daysLeft: 0, featured: false, image: '💻', category: 'إلكترونيات', createdAt: '2026-02-10' },
  { id: 'a5', title: 'دراجة هوائية جبلية احترافية', price: 7800, currency: 'EGP', status: 'expired', views: 210, chats: 3, daysLeft: 0, featured: false, image: '🚲', category: 'رياضة', createdAt: '2026-01-05' },
  { id: 'a6', title: 'تابلت سامسونج S9 Ultra', price: 18500, currency: 'EGP', status: 'active', views: 330, chats: 5, daysLeft: 8, featured: false, image: '📟', category: 'إلكترونيات', createdAt: '2026-04-01' },
  { id: 'a7', title: 'غرفة نوم كاملة - خشب زان', price: 12000, currency: 'EGP', status: 'active', views: 95, chats: 2, daysLeft: 26, featured: false, image: '🛏️', category: 'أثاث', createdAt: '2026-04-03' },
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  sold: 'bg-blue-100 text-blue-700',
  expired: 'bg-red-100 text-red-700',
};

export default function SellerInventoryManager({ ads: propAds, lang: propLang = 'ar', className = '' }) {
  const [lang, setLang] = useState(propLang);
  const [arabicNumerals, setArabicNumerals] = useState(propLang === 'ar');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('newest');
  const [selected, setSelected] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [localAds, setLocalAds] = useState(propAds && propAds.length ? propAds : MOCK_ADS);

  const t = LABELS[lang] || LABELS.ar;
  const isRtl = lang === 'ar';
  const n = (val) => arabicNumerals ? toArabicIndic(val) : String(val);

  const filtered = useMemo(() => {
    let list = statusFilter === 'all' ? localAds : localAds.filter((a) => a.status === statusFilter);
    if (sortKey === 'views') list = [...list].sort((a, b) => b.views - a.views);
    else if (sortKey === 'price') list = [...list].sort((a, b) => b.price - a.price);
    else list = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }, [localAds, statusFilter, sortKey]);

  const stats = useMemo(() => ({
    active: localAds.filter((a) => a.status === 'active').length,
    sold: localAds.filter((a) => a.status === 'sold').length,
    totalViews: localAds.reduce((s, a) => s + a.views, 0),
    totalChats: localAds.reduce((s, a) => s + a.chats, 0),
  }), [localAds]);

  const toggleSelect = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const selectAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map((a) => a.id));

  const handleDelete = () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setLocalAds((prev) => prev.filter((a) => !selected.includes(a.id)));
    setSelected([]);
    setDeleteConfirm(false);
  };

  const handleRenew = () => {
    setLocalAds((prev) => prev.map((a) =>
      selected.includes(a.id) ? { ...a, daysLeft: 30, status: 'active' } : a
    ));
    setSelected([]);
  };

  const handleBoost = () => {
    setLocalAds((prev) => prev.map((a) =>
      selected.includes(a.id) ? { ...a, featured: true } : a
    ));
    setSelected([]);
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-lg p-4 max-w-3xl mx-auto ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">{t.title}</h2>
        <div className="flex gap-2 flex-wrap">
          {['ar', 'en', 'de'].map((l) => (
            <button key={l} onClick={() => { setLang(l); setArabicNumerals(l === 'ar'); }}
              className={`px-3 py-1 rounded-full text-sm font-semibold border ${lang === l ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-300 hover:bg-orange-50'}`}>
              {l.toUpperCase()}
            </button>
          ))}
          <button onClick={() => setArabicNumerals((v) => !v)}
            className={`px-3 py-1 rounded-full text-sm border ${arabicNumerals ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
            {t.numerals}
          </button>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: t.totalActive, val: stats.active, color: 'text-green-600' },
          { label: t.soldThisMonth, val: stats.sold, color: 'text-blue-600' },
          { label: t.totalViews, val: stats.totalViews, color: 'text-purple-600' },
          { label: t.totalChats, val: stats.totalChats, color: 'text-orange-600' },
        ].map(({ label, val, color }) => (
          <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${color}`}>{n(val)}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters & Sort */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <div className="flex gap-1 flex-wrap">
          {['all', 'active', 'pending', 'sold', 'expired'].map((s) => (
            <button key={s} onClick={() => { setStatusFilter(s); setSelected([]); }}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${statusFilter === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-orange-50'}`}>
              {t[s]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 ms-auto">
          <span className="text-xs text-gray-500">{t.sortBy}:</span>
          <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300">
            <option value="newest">{t.newest}</option>
            <option value="views">{t.views}</option>
            <option value="price">{t.price}</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.length > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-orange-50 rounded-xl border border-orange-200 flex-wrap">
          <span className="text-sm font-semibold text-orange-700">{t.bulkActions} ({n(selected.length)})</span>
          <button onClick={handleRenew} className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600">{t.renew}</button>
          <button onClick={handleBoost} className="px-3 py-1 bg-yellow-500 text-white rounded-lg text-sm hover:bg-yellow-600">{t.boost}</button>
          {!deleteConfirm
            ? <button onClick={handleDelete} className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">{t.delete}</button>
            : <span className="flex items-center gap-2 text-sm text-red-600 font-semibold">
                {t.confirm}
                <button onClick={handleDelete} className="px-2 py-0.5 bg-red-600 text-white rounded">{t.yes}</button>
                <button onClick={() => setDeleteConfirm(false)} className="px-2 py-0.5 bg-gray-300 text-gray-700 rounded">{t.no}</button>
              </span>
          }
        </div>
      )}

      {/* Select All */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <input type="checkbox" checked={filtered.length > 0 && selected.length === filtered.length}
          onChange={selectAll} className="w-4 h-4 accent-orange-500" />
        <span className="text-sm text-gray-500">{t.selectAll}</span>
      </div>

      {/* Ad List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-lg">{t.noAds}</div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((ad) => (
            <div key={ad.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition ${selected.includes(ad.id) ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-white hover:bg-gray-50'}`}>
              <input type="checkbox" checked={selected.includes(ad.id)} onChange={() => toggleSelect(ad.id)}
                className="mt-1 w-4 h-4 accent-orange-500 shrink-0" />
              <div className="text-3xl shrink-0">{ad.image}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-800 truncate">{ad.title}</span>
                  {ad.featured && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-semibold">⭐ {t.featured}</span>
                  )}
                  <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${STATUS_COLORS[ad.status]}`}>{t[ad.status]}</span>
                </div>
                <div className="text-sm text-gray-500 mt-0.5">{ad.category}</div>
                <div className="flex items-center gap-4 mt-1 flex-wrap">
                  <span className="font-bold text-orange-600 text-sm">{n(ad.price.toLocaleString())} {t.egp}</span>
                  <span className="text-xs text-gray-400">👁 {n(ad.views)} {t.viewsLabel}</span>
                  <span className="text-xs text-gray-400">💬 {n(ad.chats)} {t.chatsLabel}</span>
                  {ad.daysLeft > 0 && (
                    <span className={`text-xs font-medium ${ad.daysLeft <= 7 ? 'text-red-500' : 'text-green-600'}`}>
                      ⏰ {n(ad.daysLeft)} {t.daysLeft}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
