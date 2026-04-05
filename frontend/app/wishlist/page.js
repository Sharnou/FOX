'use client';
export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

const T = {
  ar: {
    title: 'المفضلة',
    pageTitle: 'قائمة المفضلة | XTOX',
    savedOne: 'إعلان مفضل',
    savedMany: 'إعلانات مفضلة',
    empty: 'لا توجد إعلانات في المفضلة بعد',
    emptyDesc: 'أضف الإعلانات التي تعجبك إلى المفضلة وستظهر هنا',
    browse: 'تصفح الإعلانات',
    remove: 'إزالة من المفضلة',
    removing: 'جارٍ الإزالة...',
    noPrice: 'السعر غير محدد',
    loading: 'جاري التحميل...',
    loginRequired: 'يرجى تسجيل الدخول لعرض المفضلة',
    login: 'تسجيل الدخول',
    error: 'حدث خطأ أثناء التحميل، حاول مجدداً',
    retry: 'إعادة المحاولة',
    noTitle: 'بدون عنوان',
  },
  en: {
    title: 'Favorite Ads',
    pageTitle: 'Favorite Ads | XTOX',
    savedOne: 'favorite ad',
    savedMany: 'favorite ads',
    empty: 'No favorite ads yet',
    emptyDesc: 'Add ads you like to your favorites and they will appear here',
    browse: 'Browse Ads',
    remove: 'Remove from Favorites',
    removing: 'Removing...',
    noPrice: 'Price not set',
    loading: 'Loading...',
    loginRequired: 'Please log in to view your favorites',
    login: 'Log In',
    error: 'Failed to load favorites. Please try again.',
    retry: 'Retry',
    noTitle: 'No title',
  },
};

/* ── Skeleton card shown while loading ─────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
      <div className="h-44 bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
        <div className="h-3.5 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-8 bg-gray-100 rounded-lg mt-3" />
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function WishlistPage() {
  const [lang, setLang]       = useState('ar');
  const [token, setToken]     = useState('');
  const [ads, setAds]         = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [removing, setRemoving] = useState({});

  const t     = T[lang] || T.ar;
  const isRTL = lang === 'ar';

  /* Set page title */
  useEffect(() => {
    document.title = t.pageTitle;
  }, [t.pageTitle]);

  /* Read lang + token from localStorage once mounted */
  useEffect(() => {
    const storedLang  = localStorage.getItem('lang')  || 'ar';
    const storedToken = localStorage.getItem('token') || '';
    setLang(storedLang);
    setToken(storedToken);
    if (storedToken) {
      loadWishlist(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  async function loadWishlist(tkn) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/wishlist`, {
        headers: { Authorization: `Bearer ${tkn}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      /* API may return array directly or wrapped */
      const list = Array.isArray(data)
        ? data
        : data.wishlist || data.ads || data.data || [];
      setAds(list);
    } catch (e) {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(adId) {
    setRemoving(prev => ({ ...prev, [adId]: true }));
    try {
      const res = await fetch(`${API_BASE}/api/wishlist/${adId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAds(prev => prev.filter(a => (a._id || a.id) !== adId));
      }
    } catch (_) {}
    setRemoving(prev => ({ ...prev, [adId]: false }));
  }

  /* Count label */
  const countLabel = ads.length === 1
    ? `1 ${t.savedOne}`
    : `${ads.length} ${t.savedMany}`;

  return (
    <main
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-gray-50 pb-24"
      style={{ fontFamily: 'Cairo, Tajawal, Arial, sans-serif' }}
    >
      {/* ── Sticky Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>❤️</span>
            <span>{t.title}</span>
          </h1>
          {!loading && ads.length > 0 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
              {countLabel}
            </span>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-5">

        {/* ── Login required ──────────────────────────────────────────── */}
        {!token && !loading && (
          <div className="flex flex-col items-center justify-center py-28 text-center gap-4">
            <span className="text-6xl select-none">🔒</span>
            <p className="text-gray-600 text-base font-medium">{t.loginRequired}</p>
            <a
              href="/login"
              className="px-8 py-2.5 bg-[#002f34] text-white rounded-full font-bold hover:bg-[#004a52] transition-colors text-sm"
            >
              {t.login}
            </a>
          </div>
        )}

        {/* ── Loading skeletons ───────────────────────────────────────── */}
        {loading && (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {/* ── Error state ─────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <span className="text-5xl">⚠️</span>
            <p className="text-red-500 font-medium">{error}</p>
            <button
              onClick={() => loadWishlist(token)}
              className="px-6 py-2 bg-[#002f34] text-white rounded-full text-sm font-bold hover:bg-[#004a52] transition-colors"
            >
              {t.retry}
            </button>
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────── */}
        {!loading && !error && token && ads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <span className="text-7xl select-none">❤️</span>
            <h2 className="text-xl font-bold text-gray-700">{t.empty}</h2>
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed">{t.emptyDesc}</p>
            <a
              href="/"
              className="mt-2 px-7 py-2.5 bg-[#002f34] text-white rounded-full font-bold text-sm hover:bg-[#004a52] transition-colors"
            >
              {t.browse}
            </a>
          </div>
        )}

        {/* ── Ads grid ─────────────────────────────────────────────────── */}
        {!loading && !error && ads.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {ads.map(ad => {
              const adId       = ad._id || ad.id;
              const image      = ad.images?.[0] || ad.image || ad.thumbnail || null;
              const title      = ad.title || t.noTitle;
              const priceNum   = ad.price ?? ad.amount;
              const currency   = ad.currency || (isRTL ? '' : '');
              const price      = priceNum != null
                ? `${Number(priceNum).toLocaleString(isRTL ? 'ar-EG' : 'en-US')} ${currency}`.trim()
                : t.noPrice;
              const location   = ad.location || ad.city || ad.area || '';
              const isBusy     = !!removing[adId];

              return (
                <article
                  key={adId}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200 flex flex-col"
                >
                  {/* Image */}
                  <Link
                    href={`/ads/${adId}`}
                    className="block relative h-44 bg-gray-100 overflow-hidden"
                    aria-label={title}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <span className="text-4xl text-gray-300">🖼️</span>
                      </div>
                    )}
                  </Link>

                  {/* Card body */}
                  <div className="p-3 flex flex-col gap-1 flex-1">
                    <Link href={`/ads/${adId}`}>
                      <h3 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug hover:text-[#002f34] transition-colors">
                        {title}
                      </h3>
                    </Link>

                    <p className="text-[#002f34] font-extrabold text-sm">
                      {price}
                    </p>

                    {location && (
                      <p className="text-gray-400 text-xs flex items-center gap-1 truncate">
                        <span>📍</span>
                        <span className="truncate">{location}</span>
                      </p>
                    )}

                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(adId)}
                      disabled={isBusy}
                      aria-label={`${t.remove} ${title}`}
                      className={`
                        mt-auto w-full py-1.5 rounded-lg text-xs font-bold border transition-all
                        ${isBusy
                          ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                          : 'bg-white text-red-500 border-red-200 hover:bg-red-50 hover:border-red-400 active:scale-95'
                        }
                      `}
                    >
                      {isBusy ? t.removing : `❤️ ${t.remove}`}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
