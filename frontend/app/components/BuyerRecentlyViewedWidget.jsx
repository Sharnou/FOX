'use client';

import { useState, useEffect, useCallback } from 'react';

// Google Fonts loaded via style tag
const fontStyle = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap');
`;

// Mock recently viewed ads data for demo display
const MOCK_ADS = [
  {
    id: 'ad001',
    title_ar: 'آيفون 14 برو ماكس 256 جيجا - حالة ممتازة',
    title_en: 'iPhone 14 Pro Max 256GB - Excellent Condition',
    price: 3200,
    currency_ar: 'ر.س',
    currency_en: 'SAR',
    category_ar: 'إلكترونيات',
    category_en: 'Electronics',
    location_ar: 'الرياض',
    location_en: 'Riyadh',
    image: 'https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?w=120&h=90&fit=crop',
    viewedAt: Date.now() - 1000 * 60 * 5,
    isNew: false,
    isSold: false,
  },
  {
    id: 'ad002',
    title_ar: 'شقة للإيجار في حي النرجس - 3 غرف',
    title_en: '3-Room Apartment for Rent - Al Narjis District',
    price: 45000,
    currency_ar: 'ر.س/سنة',
    currency_en: 'SAR/yr',
    category_ar: 'عقارات',
    category_en: 'Real Estate',
    location_ar: 'الرياض، النرجس',
    location_en: 'Riyadh, Al Narjis',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=120&h=90&fit=crop',
    viewedAt: Date.now() - 1000 * 60 * 18,
    isNew: false,
    isSold: false,
  },
  {
    id: 'ad003',
    title_ar: 'تويوتا كامري 2022 - فل أوبشن',
    title_en: 'Toyota Camry 2022 - Full Option',
    price: 98000,
    currency_ar: 'ر.س',
    currency_en: 'SAR',
    category_ar: 'سيارات',
    category_en: 'Cars',
    location_ar: 'جدة',
    location_en: 'Jeddah',
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=120&h=90&fit=crop',
    viewedAt: Date.now() - 1000 * 60 * 45,
    isNew: true,
    isSold: false,
  },
  {
    id: 'ad004',
    title_ar: 'طقم كنب مودرن خشب زان - 7 مقاعد',
    title_en: 'Modern Beechwood Sofa Set - 7 Seater',
    price: 5500,
    currency_ar: 'ر.س',
    currency_en: 'SAR',
    category_ar: 'أثاث',
    category_en: 'Furniture',
    location_ar: 'الدمام',
    location_en: 'Dammam',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=120&h=90&fit=crop',
    viewedAt: Date.now() - 1000 * 60 * 90,
    isNew: false,
    isSold: true,
  },
  {
    id: 'ad005',
    title_ar: 'لابتوب ديل XPS 15 - Core i9 - نظيف',
    title_en: 'Dell XPS 15 - Core i9 - Clean',
    price: 4800,
    currency_ar: 'ر.س',
    currency_en: 'SAR',
    category_ar: 'إلكترونيات',
    category_en: 'Electronics',
    location_ar: 'الرياض',
    location_en: 'Riyadh',
    image: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=120&h=90&fit=crop',
    viewedAt: Date.now() - 1000 * 60 * 120,
    isNew: false,
    isSold: false,
  },
  {
    id: 'ad006',
    title_ar: 'دراجة هوائية كانونديل - مقاس 26',
    title_en: 'Cannondale Bicycle - 26 Inch',
    price: 1200,
    currency_ar: 'ر.س',
    currency_en: 'SAR',
    category_ar: 'رياضة وترفيه',
    category_en: 'Sports & Leisure',
    location_ar: 'أبو ظبي',
    location_en: 'Abu Dhabi',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=120&h=90&fit=crop',
    viewedAt: Date.now() - 1000 * 60 * 200,
    isNew: false,
    isSold: false,
  },
  {
    id: 'ad007',
    title_ar: 'كاميرا سوني A7 IV مع عدسة 24-70mm',
    title_en: 'Sony A7 IV Camera with 24-70mm Lens',
    price: 12500,
    currency_ar: 'ر.س',
    currency_en: 'SAR',
    category_ar: 'إلكترونيات',
    category_en: 'Electronics',
    location_ar: 'القاهرة',
    location_en: 'Cairo',
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=120&h=90&fit=crop',
    viewedAt: Date.now() - 1000 * 60 * 60 * 3,
    isNew: true,
    isSold: false,
  },
  {
    id: 'ad008',
    title_ar: 'غسالة LG 7 كيلو تلوديو - مستعملة سنة',
    title_en: 'LG 7Kg Washing Machine - 1 Year Used',
    price: 750,
    currency_ar: 'ر.س',
    currency_en: 'SAR',
    category_ar: 'أجهزة منزلية',
    category_en: 'Home Appliances',
    location_ar: 'الكويت',
    location_en: 'Kuwait City',
    image: 'https://images.unsplash.com/photo-1558618047-f4e73c8f0ab4?w=120&h=90&fit=crop',
    viewedAt: Date.now() - 1000 * 60 * 60 * 5,
    isNew: false,
    isSold: false,
  },
];

const STORAGE_KEY = 'xtox_recently_viewed';

function getTimeAgo(timestamp, lang) {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (lang === 'ar') {
    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  } else {
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}

function formatPrice(price, lang) {
  return price.toLocaleString(lang === 'ar' ? 'ar-SA' : 'en-US');
}

export default function BuyerRecentlyViewedWidget() {
  const [lang, setLang] = useState('ar');
  const isRTL = lang === 'ar';

  // Load from localStorage (or use mock data for demo)
  const [viewedAds, setViewedAds] = useState([]);
  const [removingId, setRemovingId] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setViewedAds(parsed.length ? parsed : MOCK_ADS.slice(0, 10));
      } else {
        // Demo mode: preload mock data
        setViewedAds(MOCK_ADS.slice(0, 10));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_ADS.slice(0, 10)));
      }
    } catch {
      setViewedAds(MOCK_ADS.slice(0, 10));
    }
  }, []);

  useEffect(() => {
    setIsEmpty(viewedAds.length === 0);
  }, [viewedAds]);

  const removeAd = useCallback((id) => {
    setRemovingId(id);
    setTimeout(() => {
      setViewedAds((prev) => {
        const updated = prev.filter((ad) => ad.id !== id);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
        return updated;
      });
      setRemovingId(null);
    }, 300);
  }, []);

  const clearAll = useCallback(() => {
    setViewedAds([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setShowClearConfirm(false);
  }, []);

  const t = {
    title: lang === 'ar' ? 'شاهدتها مؤخراً' : 'Recently Viewed',
    subtitle: lang === 'ar' ? 'آخر الإعلانات التي زرتها' : 'Ads you recently visited',
    clearAll: lang === 'ar' ? 'مسح الكل' : 'Clear All',
    clearConfirm: lang === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?',
    yes: lang === 'ar' ? 'نعم، امسح' : 'Yes, Clear',
    cancel: lang === 'ar' ? 'إلغاء' : 'Cancel',
    remove: lang === 'ar' ? 'إزالة' : 'Remove',
    empty: lang === 'ar' ? 'لم تشاهد أي إعلانات بعد' : 'No recently viewed ads yet',
    emptyHint: lang === 'ar' ? 'تصفح الإعلانات لتظهر هنا' : 'Browse listings to see them here',
    sold: lang === 'ar' ? 'مُباع' : 'Sold',
    newBadge: lang === 'ar' ? 'جديد' : 'New',
    viewAd: lang === 'ar' ? 'عرض الإعلان' : 'View Ad',
    count: (n) => lang === 'ar' ? `${n} إعلانات` : `${n} ads`,
  };

  return (
    <>
      <style>{fontStyle}</style>
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 flex items-start justify-center"
        style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      >
        <div className="w-full max-w-xl">
          {/* Header Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-4">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                {/* Clock icon */}
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 3" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">{t.title}</h2>
                  <p className="text-xs text-gray-400">{t.subtitle}</p>
                </div>
              </div>

              {/* Language Toggle */}
              <button
                onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 transition-all text-xs font-semibold text-gray-600"
              >
                <span className="text-base leading-none">{lang === 'ar' ? '🇬🇧' : '🇸🇦'}</span>
                {lang === 'ar' ? 'EN' : 'عربي'}
              </button>
            </div>

            {/* Count + Clear */}
            {!isEmpty && (
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                  {t.count(viewedAds.length)}
                </span>
                {!showClearConfirm ? (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs text-red-400 hover:text-red-600 font-medium flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t.clearAll}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 animate-pulse-once">
                    <span className="text-xs text-gray-500">{t.clearConfirm}</span>
                    <button
                      onClick={clearAll}
                      className="text-xs bg-red-500 text-white px-2.5 py-1 rounded-lg hover:bg-red-600 transition-colors font-medium"
                    >
                      {t.yes}
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      {t.cancel}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Empty State */}
          {isEmpty && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-gray-700 font-semibold text-base mb-1">{t.empty}</p>
              <p className="text-gray-400 text-sm">{t.emptyHint}</p>
            </div>
          )}

          {/* Ad List */}
          {!isEmpty && (
            <div className="space-y-3">
              {viewedAds.map((ad, index) => (
                <div
                  key={ad.id}
                  className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${
                    removingId === ad.id ? 'opacity-0 scale-95 -translate-y-1' : 'opacity-100 scale-100'
                  }`}
                >
                  <div className="flex items-start p-3 gap-3">
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={ad.image}
                        alt={lang === 'ar' ? ad.title_ar : ad.title_en}
                        className={`w-20 h-16 object-cover rounded-xl ${ad.isSold ? 'grayscale opacity-60' : ''}`}
                        onError={(e) => {
                          e.target.src = `https://placehold.co/80x64/e2e8f0/94a3b8?text=${index + 1}`;
                        }}
                      />
                      {ad.isSold && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                          <span className="text-white text-xs font-bold px-1.5 py-0.5 bg-red-500 rounded-md">
                            {t.sold}
                          </span>
                        </div>
                      )}
                      {ad.isNew && !ad.isSold && (
                        <span className="absolute top-1 start-1 text-white text-xs font-bold px-1.5 py-0.5 bg-emerald-500 rounded-md leading-none">
                          {t.newBadge}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold leading-snug line-clamp-2 ${ad.isSold ? 'text-gray-400' : 'text-gray-800'}`}>
                            {lang === 'ar' ? ad.title_ar : ad.title_en}
                          </p>
                          {/* Category + Location */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            <span className="inline-flex items-center gap-0.5 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                              {lang === 'ar' ? ad.category_ar : ad.category_en}
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-xs text-gray-400">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {lang === 'ar' ? ad.location_ar : ad.location_en}
                            </span>
                          </div>
                        </div>

                        {/* Remove button */}
                        <button
                          onClick={() => removeAd(ad.id)}
                          className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 hover:bg-red-100 hover:text-red-500 text-gray-400 flex items-center justify-center transition-all"
                          title={t.remove}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Price + Time + View Button */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
                        <div>
                          <span className={`text-base font-bold ${ad.isSold ? 'text-gray-400 line-through' : 'text-blue-700'}`}>
                            {formatPrice(ad.price, lang)}
                          </span>
                          <span className="text-xs text-gray-400 ms-1">
                            {lang === 'ar' ? ad.currency_ar : ad.currency_en}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 3" />
                            </svg>
                            {getTimeAgo(ad.viewedAt, lang)}
                          </span>
                          {!ad.isSold && (
                            <button className="text-xs text-blue-600 hover:text-blue-800 font-semibold hover:underline transition-colors">
                              {t.viewAd} ←
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer note */}
          {!isEmpty && (
            <p className="text-center text-xs text-gray-400 mt-4 pb-2">
              {lang === 'ar'
                ? '💡 يتم حفظ سجل المشاهدة على جهازك فقط'
                : '💡 Viewing history is saved on your device only'}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
