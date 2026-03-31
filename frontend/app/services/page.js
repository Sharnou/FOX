'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import AdCardSkeleton from '../components/AdCardSkeleton';

const API = process.env.NEXT_PUBLIC_API_URL || '';

const WORKER_ICONS = {
  Plumber:      '🔧',
  Electrician:  '⚡',
  Carpenter:    '🪚',
  Cleaner:      '🧹',
  Painter:      '🎨',
  Delivery:     '🚚',
  Gardener:     '🌱',
  Driver:       '🚗',
};

const ARABIC_TYPES = {
  All:          'الكل',
  Plumber:      'سبّاك',
  Electrician:  'كهربائي',
  Carpenter:    'نجّار',
  Cleaner:      'عامل نظافة',
  Painter:      'دهّان',
  Delivery:     'توصيل',
  Gardener:     'حدّاد',
  Driver:       'سائق',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  return `منذ ${Math.floor(diff / 86400)} يوم`;
}

export default function ServicesPage() {
  const [services, setServices]   = useState([]);
  const [filter, setFilter]       = useState('All');
  const [types, setTypes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [citySearch, setCitySearch] = useState('');

  const country = typeof window !== 'undefined'
    ? localStorage.getItem('country') || 'EG'
    : 'EG';

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      axios.get(`${API}/api/services`, { params: { country } }),
      axios.get(`${API}/api/services/types`),
    ])
      .then(([r1, r2]) => {
        setServices(r1.data || []);
        setTypes(r2.data || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = filter === 'All' ? services : services.filter(s => s.subcategory === filter);
    if (citySearch.trim()) {
      const q = citySearch.trim().toLowerCase();
      list = list.filter(s => s.city?.toLowerCase().includes(q));
    }
    return list;
  }, [services, filter, citySearch]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "إعلانات الخدمات | XTOX",
    "description": "تصفح أحدث إعلانات الخدمات المحلية في منطقتك",
    "url": "https://xtox.app/services",
    "inLanguage": "ar",
    "isPartOf": { "@type": "WebSite", "name": "XTOX", "url": "https://xtox.app" },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://xtox.app" },
        { "@type": "ListItem", "position": 2, "name": "الخدمات", "item": "https://xtox.app/services" },
      ],
    },
  };

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
            <div>
              <h1 className="text-white text-2xl font-bold">🔨 الخدمات والعمال</h1>
              {!loading && !error && (
                <p className="text-teal-200 text-sm mt-0.5">
                  {filtered.length} خدمة متاحة
                </p>
              )}
            </div>
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

      {/* ─── Filter Tabs ─── */}
      <div className="max-w-3xl mx-auto px-4 mt-4">
        <div
          role="tablist"
          aria-label="تصفية نوع الخدمة"
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
        >
          {['All', ...types].map(t => (
            <button
              key={t}
              role="tab"
              aria-selected={filter === t}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-full text-sm whitespace-nowrap font-medium transition-colors duration-150 ${
                filter === t
                  ? 'bg-[#002f34] text-white shadow'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {WORKER_ICONS[t] || '👷'} {ARABIC_TYPES[t] || t}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="max-w-3xl mx-auto px-4 mt-4 pb-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <AdCardSkeleton key={i} />)}
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
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-600 text-lg font-semibold">
              {citySearch.trim()
                ? `لا توجد خدمات في "${citySearch.trim()}"`
                : 'لا توجد خدمات في هذه الفئة حالياً'}
            </p>
            <p className="text-gray-400 text-sm mt-1">جرّب تغيير الفلتر أو البحث بمدينة مختلفة</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map(s => (
              <article
                key={s._id}
                className="bg-white rounded-2xl shadow hover:shadow-md transition-shadow duration-200 p-4 flex flex-col gap-2"
                aria-label={s.title}
              >
                {/* Icon + Badge */}
                <div className="flex items-center justify-between">
                  <span className="text-4xl">{WORKER_ICONS[s.subcategory] || '👷'}</span>
                  <span className="bg-teal-50 text-teal-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                    {ARABIC_TYPES[s.subcategory] || s.subcategory}
                  </span>
                </div>

                {/* Title */}
                <p className="font-bold text-gray-800 text-base leading-snug line-clamp-2">{s.title}</p>

                {/* Description */}
                {s.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{s.description}</p>
                )}

                {/* Meta */}
                <div className="text-xs text-gray-400 flex flex-wrap gap-x-3 gap-y-1">
                  {s.city     && <span>📍 {s.city}</span>}
                  {s.price    && <span className="text-[#002f34] font-bold text-sm">💰 {s.price} {s.currency}</span>}
                  {s.createdAt && <span>🕐 {timeAgo(s.createdAt)}</span>}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-1">
                  <a
                    href={`/chat?target=${s.userId}`}
                    className="flex-1 bg-[#002f34] text-white text-center py-2 rounded-xl text-sm font-medium hover:opacity-90 transition"
                  >
                    💬 تواصل
                  </a>
                  {s.phone && (
                    <a
                      href={`https://wa.me/${s.phone.replace(/\D/g,'')}?text=${encodeURIComponent(`مرحباً، رأيت إعلانك "${s.title}" على XTOX`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="واتساب"
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
