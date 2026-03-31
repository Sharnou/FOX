'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import AdCardSkeleton from '../components/AdCardSkeleton';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const CATEGORY_ICONS = {
  All:        '🛒',
  Vegetables: '🥦',
  Fruits:     '🍎',
  Meat:       '🥩',
  Dairy:      '🥛',
  Bakery:     '🥖',
  Beverages:  '🧃',
  Cleaning:   '🧴',
  Grocery:    '🧺',
};

const ARABIC_CATS = {
  All:        'الكل',
  Vegetables: 'خضار',
  Fruits:     'فواكه',
  Meat:       'لحوم',
  Dairy:      'ألبان',
  Bakery:     'مخبوزات',
  Beverages:  'مشروبات',
  Cleaning:   'منظفات',
  Grocery:    'بقالة',
};

const CAT_COLORS = {
  Vegetables: 'bg-green-50 text-green-700',
  Fruits:     'bg-orange-50 text-orange-700',
  Meat:       'bg-red-50 text-red-700',
  Dairy:      'bg-blue-50 text-blue-700',
  Bakery:     'bg-yellow-50 text-yellow-800',
  Beverages:  'bg-purple-50 text-purple-700',
  Cleaning:   'bg-cyan-50 text-cyan-700',
  Grocery:    'bg-gray-50 text-gray-700',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://fox-kohl-eight.vercel.app/supermarket",
      "url": "https://fox-kohl-eight.vercel.app/supermarket",
      "name": "سوبرماركت XTOX",
      "description": "تصفح إعلانات السوبرماركت والمنتجات الغذائية في منطقتك",
      "inLanguage": "ar",
      "isPartOf": { "@id": "https://fox-kohl-eight.vercel.app" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://fox-kohl-eight.vercel.app" },
        { "@type": "ListItem", "position": 2, "name": "سوبرماركت", "item": "https://fox-kohl-eight.vercel.app/supermarket" }
      ]
    }
  ]
};

export default function SupermarketPage() {
  const [items, setItems]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter]         = useState('All');
  const [cart, setCart]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const country = typeof window !== 'undefined'
    ? localStorage.getItem('country') || 'EG'
    : 'EG';

  useEffect(() => {
    setLoading(true);
    setError(false);
    axios
      .get(`${API}/api/supermarket`, { params: { country } })
      .then(r => {
        const data = Array.isArray(r.data) ? r.data : [];
        setItems(data);
        const cats = [...new Set(data.map(i => i.subcategory).filter(Boolean))];
        setCategories(cats);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = filter === 'All' ? items : items.filter(i => i.subcategory === filter);
    if (citySearch.trim()) {
      const q = citySearch.trim().toLowerCase();
      list = list.filter(i => i.city?.toLowerCase().includes(q));
    }
    return list;
  }, [items, filter, citySearch]);

  const addToCart = (item) => setCart(c => [...c, item]);
  const cartCount = cart.length;

  return (
    <div dir="rtl" lang="ar" className="min-h-screen bg-gray-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* ─── Gradient Header ─── */}
      <div style={{ background: 'linear-gradient(135deg,#002f34 0%,#005c5c 100%)' }} className="px-4 pt-6 pb-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => history.back()}
              aria-label="رجوع"
              className="text-white text-2xl font-bold leading-none"
            >
              →
            </button>
            <div className="flex-1">
              <h1 className="text-white text-2xl font-bold">🛒 السوبرماركت</h1>
              {!loading && !error && (
                <p className="text-teal-200 text-sm mt-0.5">
                  {filtered.length} منتج متاح
                </p>
              )}
            </div>
            {/* Cart Badge */}
            <button
              aria-label={`السلة: ${cartCount} منتج`}
              className="relative bg-white/10 border border-white/20 text-white px-3 py-1.5 rounded-full text-sm font-medium"
            >
              🛒
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -left-1.5 bg-yellow-400 text-[#002f34] text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>

          {/* City Search */}
          <div className="relative">
            <span className="absolute top-1/2 -translate-y-1/2 right-3 text-gray-400 pointer-events-none">🔍</span>
            <input
              type="search"
              value={citySearch}
              onChange={e => setCitySearch(e.target.value)}
              placeholder="ابحث بالمدينة…"
              aria-label="بحث بالمدينة"
              className="w-full bg-white rounded-xl py-2.5 pr-10 pl-4 text-sm text-gray-800 shadow focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
        </div>
      </div>

      {/* ─── Category Filter Tabs ─── */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        <div
          role="tablist"
          aria-label="تصفية حسب الفئة"
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        >
          {['All', ...categories].map(cat => (
            <button
              key={cat}
              role="tab"
              aria-selected={filter === cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap font-medium transition-colors duration-150 ${
                filter === cat
                  ? 'bg-[#002f34] text-white shadow'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {CATEGORY_ICONS[cat] || '📦'} {ARABIC_CATS[cat] || cat}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="max-w-3xl mx-auto px-4 mt-4 pb-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <AdCardSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="text-center py-16" role="alert">
            <p className="text-4xl mb-3">⚠️</p>
            <p className="text-gray-600 text-lg font-semibold">حدث خطأ في التحميل</p>
            <p className="text-gray-400 text-sm mt-1">تحقق من اتصالك وأعد المحاولة</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-[#002f34] text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-gray-600 text-lg font-semibold">
              {citySearch.trim()
                ? `لا توجد منتجات في "${citySearch.trim()}"`
                : filter !== 'All'
                  ? `لا توجد منتجات في فئة "${ARABIC_CATS[filter] || filter}"`
                  : 'لا توجد منتجات متاحة حالياً'}
            </p>
            <p className="text-gray-400 text-sm mt-1">جرّب تغيير الفئة أو البحث بمدينة أخرى</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map(item => (
              <article
                key={item._id}
                className="bg-white rounded-2xl shadow hover:shadow-md transition-shadow duration-200 p-4 flex flex-col gap-2"
                aria-label={item.title}
              >
                {/* Icon + Category Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{CATEGORY_ICONS[item.subcategory] || '📦'}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CAT_COLORS[item.subcategory] || 'bg-gray-100 text-gray-600'}`}>
                    {ARABIC_CATS[item.subcategory] || item.subcategory || 'بقالة'}
                  </span>
                </div>

                {/* Title */}
                <p className="font-bold text-gray-800 text-sm leading-snug line-clamp-2">{item.title}</p>

                {/* Description */}
                {item.description && (
                  <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
                )}

                {/* Meta */}
                <div className="text-xs text-gray-400 flex flex-wrap gap-x-2 gap-y-1">
                  {item.city      && <span>📍 {item.city}</span>}
                  {item.createdAt && <span>🕐 {timeAgo(item.createdAt)}</span>}
                </div>

                {/* Price */}
                {item.price && (
                  <p className="text-[#002f34] font-bold text-base">
                    💰 {item.price} {item.currency || ''}
                  </p>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 mt-auto pt-1">
                  <button
                    onClick={() => addToCart(item)}
                    aria-label={`أضف ${item.title} للسلة`}
                    className="flex-1 bg-[#002f34] text-white text-center py-2 rounded-xl text-xs font-medium hover:opacity-90 transition"
                  >
                    🛒 أضف للسلة
                  </button>
                  {item.phone && (
                    <a
                      href={`https://wa.me/${item.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`مرحباً، رأيت منتجك "${item.title}" على XTOX`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="تواصل عبر واتساب"
                      className="px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition"
                    >
                      📱
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
