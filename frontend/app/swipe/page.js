'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import SwipeAdCard from '../components/SwipeAdCard';
import { useLanguage } from '../context/LanguageContext';

const PAGE_SIZE = 20;

export default function SwipePage() {
  const { language, isRTL, t } = useLanguage();

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
    const storedToken = (typeof window !== 'undefined' && (localStorage.getItem('token') || localStorage.getItem('authToken'))) || null;
    setToken(storedToken);
  }, []);

  const fetchAds = useCallback(async (page = 1, append = false) => {
    if (page === 1) { setLoading(true); setError(null); }
    else setLoadingMore(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
      const res = await fetch(apiUrl + '/api/ads?page=' + page + '&limit=' + PAGE_SIZE);
      if (!res.ok) throw new Error('HTTP ' + res.status);
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

  useEffect(() => {
    if (!ads.length || loadingMore || !hasMore || autoLoadTriggered.current) return;
    const remaining = ads.length - currentIndex;
    if (remaining <= 3) {
      autoLoadTriggered.current = true;
      fetchAds(currentPage + 1, true);
    }
  }, [currentIndex, ads.length, loadingMore, hasMore, currentPage, fetchAds]);

  const handleSkip = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
  }, []);

  const handleSave = useCallback(async () => {
    const ad = ads[currentIndex];
    if (!ad) return;

    if (!token) {
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
      const res = await fetch(apiUrl + '/api/wishlist', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adId: ad._id }),
      });
      if (res.ok) {
        setSavedIds(prev => new Set([...prev, ad._id]));
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
  const isExhausted = !ad && !loading && !loadingMore;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif' }}
    >
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">{t('swipe_title')}</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Loading initial */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-gray-500 text-sm">{t('swipe_loading')}</p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-2xl mb-2">⚠️</p>
            <p className="text-gray-600 font-medium mb-4">{t('swipe_error')}</p>
            <p className="text-red-400 text-xs mb-4">{error}</p>
            <button
              onClick={() => fetchAds(1, false)}
              className="bg-blue-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-600 transition"
            >
              {t('swipe_retry')}
            </button>
          </div>
        )}

        {/* Login prompt (non-blocking) */}
        {!loading && !error && !token && ads.length > 0 && (
          <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center justify-between gap-2">
            <p className="text-blue-700 text-xs font-medium flex-1">{t('swipe_login_prompt')}</p>
            <Link
              href="/login"
              className="bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold hover:bg-blue-600 transition whitespace-nowrap"
            >
              {t('swipe_login_btn')}
            </Link>
          </div>
        )}

        {/* Swipe area */}
        {!loading && !error && ad && (
          <>
            {/* Counter */}
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-400">
                {currentIndex + 1} {t('swipe_of')} {ads.length}{hasMore ? '+' : ''}
              </p>
              <p className="text-xs text-gray-400">{t('swipe_hint')}</p>
            </div>

            {/* Card */}
            <SwipeAdCard
              key={ad._id || currentIndex}
              ad={ad}
              token={token}
              lang={language}
              onSave={handleWishlistUpdate}
              onSkip={handleSkip}
              isSaved={savedIds.has(ad._id)}
            />

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-400">
                <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                {t('swipe_loading_more')}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-6 mt-6">
              <button
                onClick={handleSkip}
                className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 shadow-md flex items-center justify-center text-2xl hover:border-red-300 hover:bg-red-50 active:scale-95 transition-all"
                aria-label={t('swipe_skip')}
              >
                ❌
              </button>
              <button
                onClick={handleSave}
                disabled={savingId === ad._id}
                className="w-16 h-16 rounded-full bg-white border-2 border-gray-200 shadow-md flex items-center justify-center text-2xl hover:border-green-300 hover:bg-green-50 active:scale-95 transition-all disabled:opacity-60"
                aria-label={t('swipe_save')}
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
            <p className="text-gray-800 font-bold text-lg mb-1">{t('swipe_no_more')}</p>
            <p className="text-gray-400 text-sm mb-6">{t('swipe_no_more_sub')}</p>
            <div className="flex flex-col gap-3 items-center">
              {hasMore && (
                <button
                  onClick={() => fetchAds(currentPage + 1, true)}
                  disabled={loadingMore}
                  className="bg-blue-500 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-600 transition disabled:opacity-60"
                >
                  {loadingMore ? t('swipe_loading_more') : t('swipe_load_more')}
                </button>
              )}
              <button
                onClick={() => fetchAds(1, false)}
                className="bg-gray-100 text-gray-700 px-8 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
              >
                {t('swipe_refresh')}
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && ads.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 font-medium">{t('swipe_no_ads')}</p>
            <button
              onClick={() => fetchAds(1, false)}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-600 transition"
            >
              {t('swipe_retry')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
