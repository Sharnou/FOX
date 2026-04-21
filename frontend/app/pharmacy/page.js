'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import AdCardSkeleton from '../components/AdCardSkeleton';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const CATEGORIES = [
  { id: 'all',      label: 'الكل 💊',          en: null },
  { id: 'drugs',    label: 'أدوية 💉',           en: 'drugs' },
  { id: 'medical',  label: 'مستلزمات طبية 🩺',   en: 'medical' },
  { id: 'vitamins', label: 'مكملات غذائية 🌿',   en: 'vitamins' },
  { id: 'beauty',   label: 'مستحضرات تجميل 💄',  en: 'beauty' },
  { id: 'devices',  label: 'أجهزة طبية 🔬',       en: 'devices' },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://xtox.app/pharmacy",
      "url": "https://xtox.app/pharmacy",
      "name": "صيدلية XTOX",
      "description": "تصفح إعلانات الأدوية والمنتجات الصحية في منطقتك",
      "isPartOf": { "@id": "https://xtox.app" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://xtox.app" },
        { "@type": "ListItem", "position": 2, "name": "صيدلية", "item": "https://xtox.app/pharmacy" }
      ]
    }
  ]
};

export default function PharmacyPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const [country, setCountry] = useState('EG');

  // Read country from localStorage only on client to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCountry(localStorage.getItem('country') || 'EG');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    axios.get(API + '/api/pharmacy', { params: { country }, signal: controller.signal })
      .then(r => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(e => { if (!axios.isCancel(e)) setItems([]); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [country]);

  const filtered = useMemo(() => {
    let result = items;
    if (activeCategory !== 'all') {
      result = result.filter(item =>
        (item.category || '').toLowerCase() === activeCategory
      );
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(item =>
        (item.title || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, activeCategory, search]);

  return (
    <div dir="rtl" lang="ar" className="max-w-3xl mx-auto p-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => history.back()}
          aria-label="رجوع"
          className="text-brand text-xl font-bold leading-none"
        >
          ←
        </button>
        <h1 className="text-2xl font-bold text-brand">💊 الصيدلية</h1>
        <span className="mr-auto text-sm text-gray-400" suppressHydrationWarning>{country}</span>
      </div>

      {/* Warning banner */}
      <div
        role="alert"
        className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 mb-4 text-sm text-yellow-800 flex items-center gap-2"
      >
        <span>⚠️</span>
        <span>تحقق دائمًا من تاريخ الانتهاء قبل الشراء</span>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">🔍</span>
        <input
          type="search"
          dir="rtl"
          placeholder="ابحث عن دواء أو منتج..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="البحث في الصيدلية"
          className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            aria-label="مسح البحث"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>

      {/* Category tabs */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide"
        role="tablist"
        aria-label="تصنيفات الصيدلية"
      >
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            role="tab"
            aria-selected={activeCategory === cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={'flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap border\r\n              ' + (activeCategory === cat.id
                ? 'bg-brand text-white border-brand'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand')}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results count */}
      {!loading && (
        <p className="text-xs text-gray-400 mb-3">
          {filtered.length === 0
            ? 'لا توجد نتائج'
            : filtered.length + ' نتيجة'}
          {search ? ' لـ "' + search + '"' : ''}
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <AdCardSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">💊</p>
          <p className="text-base font-medium text-gray-500 mb-1">
            {search
              ? 'لا توجد نتائج لـ "' + search + '"'
              : 'لا توجد منتجات في الصيدلية الآن'}
          </p>
          <p className="text-sm">جرب تصنيفًا آخر أو ابحث بكلمة مختلفة</p>
          {(search || activeCategory !== 'all') && (
            <button
              onClick={() => { setSearch(''); setActiveCategory('all'); }}
              className="mt-4 text-brand text-sm underline"
            >
              إعادة ضبط الفلاتر
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(item => (
            <div
              key={item._id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-2 hover:shadow-md transition-shadow"
            >
              {/* Category badge */}
              {item.category && (
                <span className="text-xs text-brand bg-brand/10 rounded-full px-2 py-0.5 self-start">
                  {CATEGORIES.find(c => c.en === item.category)?.label || item.category}
                </span>
              )}

              <p className="font-bold text-gray-800 text-sm leading-snug line-clamp-2">{item.title}</p>
              <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
              <p className="text-brand font-bold text-sm mt-auto">
                {item.price} {item.currency}
              </p>

              {/* Action buttons */}
              <div className="flex gap-2 mt-1">
                <a
                  href={'/chat?target=' + (item.userId?._id || item.userId?.id || (typeof item.userId === 'string' ? item.userId : ''))}
                  className="flex-1 bg-brand text-white text-center py-2 rounded-xl text-xs font-medium hover:opacity-90 transition-opacity"
                  aria-label={'تواصل بخصوص ' + item.title}
                  onClick={(e) => {
                    const token = localStorage.getItem('xtox_token') || localStorage.getItem('token');
                    if (!token) {
                      e.preventDefault();
                      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                    }
                  }}
                >
                  💬 تواصل
                </a>
                {item.phone && (
                  <a
                    href={'https://wa.me/' + String(item.phone).replace(/\D/g, '') + '?text=' + encodeURIComponent('أريد الاستفسار عن: ' + item.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={'واتساب بخصوص ' + item.title}
                    className="flex-shrink-0 bg-green-500 text-white text-center px-3 py-2 rounded-xl text-xs font-medium hover:bg-green-600 transition-colors"
                  >
                    واتساب
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
