'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import SwipeAdCard from '../components/SwipeAdCard';

const TRANSLATIONS = {
  ar: {
    title: 'تصفح الإعلانات', skip: 'تخطي', save: 'حفظ', noMore: 'لا يوجد المزيد',
    noMoreSub: 'شاهدت كل الإعلانات المتاحة', refresh: 'تحديث',
    loadMore: 'تحميل المزيد', loadingMore: 'جارٍ تحميل المزيد...',
    loginPrompt: 'سجّل دخولك لحفظ الإعلانات في المفضلة', loginBtn: 'تسجيل الدخول',
    loading: 'جارٍ التحميل...', errorTitle: 'حدث خطأ في تحميل الإعلانات', retry: 'إعادة المحاولة',
    of: 'من', swipeHint: 'اسحب يميناً للحفظ • يساراً للتخطي',
  },
  en: {
    title: 'Browse Ads', skip: 'Skip', save: 'Save', noMore: 'No more ads',
    noMoreSub: "You've seen all available ads", refresh: 'Refresh',
    loadMore: 'Load more', loadingMore: 'Loading more...',
    loginPrompt: 'Log in to save ads to your wishlist', loginBtn: 'Log In',
    loading: 'Loading...', errorTitle: 'Error loading ads', retry: 'Retry',
    of: 'of', swipeHint: 'Swipe right to save • left to skip',
  },
};

const PAGE_SIZE = 20;

export default function SwipePage() {
  const [lang, setLang] = useState('ar');
  const isRtl = lang === 'ar';
  const t = TRANSLATIONS[lang];

  const [token, setToken] = useState(null);
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const autoLoadTriggered = useRef(false);

  useEffect(() => {
    const storedLang = (typeof window !== 'undefined' && localStorage.getItem('lang')) || 'ar';
    const storedToken = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('authToken'))) || null;
    setLang(storedLang);
    setToken(storedToken);
  }, []);

  // Fetch a specific page of ads and optionally append to existing list
  const fetchAds = useCallback(async (page = 1, append = false) => {
    if (page === 1) { setLoading(true); setError(null); }
    else setLoadingMore(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/ads?page=${page}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.ads || data.data || []);
      if (append) {
        setAds(prev => [...prev, ...list]);
      } else {
        setAds(list);
        setCurrentIndex(0);
        setSavedIds(new Set());
      }
      setCurrentPage(page);
      // If fewer than PAGE_SIZE returned, no more pages
      setHasMore(list.length >= PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      autoLoadTriggered.current = false;
    }
  }, []);

  useEffect(() => { fetchAds(1, false); }, [fetchAds]);

  // Auto-load next page when within 3 cards of exhaustion
  useEffect(() => {
    if (!ads.length || loadingMore || !hasMore || autoLoadTriggered.current) return;
    const remaining = ads.length - currentIndex;
    if (remaining <= 3) {
      autoLoadTriggered.current = true;
      fetchAds(currentPage + 1, true);
    }
  }, [currentIndex, ads.length, loadingMore, hasMore, currentPage, fetchAds]);

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    if (typeof window !== 'undefined') localStorage.setItem('lang', next);
  };

  const handleSkip = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
  }, []);

  const handleSave = useCallback(async () => {
    const ad = ads[currentIndex];
    if (!ad) return;

    if (!token) {
      // Guest: save to localStorage
      try {
        const wishlist = JSON.parse(localStorage.getItem('xtox_wishlist') || '[]');
        if (!wishlist.includes(String(ad._id))) {
          wishlist.push(String(ad._id));
          localStorage.setItem('xtox_wishlist', JSON.stringify(wishlist));
        }
        setSavedIds(prev => new Set([...prev, ad._id]));
      } catch (_) {}
      setCurrentIndex(prev => prev + 1);
      return;
    }

    setSavingId(ad._id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/wishlist/${ad._id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSavedIds(prev => new Set([...prev, ad._id]));
        // Sync localStorage
        try {
          const wishlist = JSON.parse(localStorage.getItem('xtox_wishlist') || '[]');
          if (!wishlist.includes(String(ad._id))) {
            wishlist.push(String(ad._id));
            localStorage.setItem('xtox_wishlist', JSON.stringify(wishlist));
          }
        } catch (_) {}
      }
    } catch (_) {}
    finally {
      setSavingId(null);
      setCurrentIndex(prev => prev + 1);
    }
  }, [ads, currentIndex, token]);

  const handleWishlistUpdate = useCallback((adId) => {
    setSavedIds(prev => new Set([...prev, adId]));
    setCurrentIndex(prev => prev + 1);
  }, []);

  const ad = ads[currentIndex];
  const remaining = ads.length - currentIndex;
  const isExhausted = !ad && !loading && !loadingMore;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: isRtl ? 'Cairo, sans-serif' : 'Inter, sans-serif' }}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">{t.title}</h1>
        <button
          onClick={toggleLang}
          className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full font-medium text-gray-700 transition"
        >
          {lang === 'ar' ? 'EN' : 'عربي'}
        </button>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Loading initial */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-500 text-sm">{t.loading}</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="text-gray-600 font-medium mb-4">{t.errorTitle}</p>
            <p className="text-red-400 text-xs mb-4">{error}</p>
            <button
              onClick={() => fetchAds(1, false)}
              className="bg-blue-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-600 transition"
            >
              {t.retry}
            </button>
          </div>
        )}

        {/* Login prompt (non-blocking) */}
        {!loading && !error && !token && ads.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-2">
            <p className="text-blue-700 text-xs font-medium flex-1">{t.loginPrompt}</p>
            <a
              href="/login"
              className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-blue-600 transition whitespace-nowrap"
            >
              {t.loginBtn}
            </a>
          </div>
        )}

        {/* Swipe area */}
        {!loading && !error && ad && (
          <>
            {/* Counter */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">
                {currentIndex + 1} {t.of} {ads.length}{hasMore ? '+' : ''}
              </p>
              <p className="text-xs text-gray-400">{t.swipeHint}</p>
            </div>

            {/* Card */}
            <SwipeAdCard
              key={ad._id || currentIndex}
              ad={ad}
              token={token}
              lang={lang}
              onSave={handleWishlistUpdate}
              onSkip={handleSkip}
              isSaved={savedIds.has(ad._id)}
            />

            {/* Loading more indicator (auto-load) */}
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-400">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                {t.loadingMore}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-6 mt-6">
              {/* Skip */}
              <button
                onClick={handleSkip}
                className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 shadow-md flex items-center justify-center text-2xl hover:border-red-300 hover:bg-red-50 active:scale-95 transition-all"
                aria-label={t.skip}
              >
                ❌
              </button>
              {/* Save */}
              <button
                onClick={handleSave}
                disabled={savingId === ad._id}
                className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 shadow-md flex items-center justify-center text-2xl hover:border-green-300 hover:bg-green-50 active:scale-95 transition-all disabled:opacity-60"
                aria-label={t.save}
              >
                {savingId === ad._id ? (
                  <div className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                ) : savedIds.has(ad._id) ? '💚' : '❤️'}
              </button>
            </div>
          </>
        )}

        {/* Exhausted state */}
        {isExhausted && !error && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-gray-800 font-bold text-lg mb-1">{t.noMore}</p>
            <p className="text-gray-400 text-sm mb-6">{t.noMoreSub}</p>
            <div className="flex flex-col gap-3 items-center">
              {hasMore && (
                <button
                  onClick={() => fetchAds(currentPage + 1, true)}
                  disabled={loadingMore}
                  className="bg-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition disabled:opacity-60"
                >
                  {loadingMore ? t.loadingMore : t.loadMore}
                </button>
              )}
              <button
                onClick={() => fetchAds(1, false)}
                className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                {t.refresh}
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && ads.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 font-medium">لا توجد إعلانات متاحة حالياً</p>
            <button
              onClick={() => fetchAds(1, false)}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-600 transition"
            >
              {t.retry}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
