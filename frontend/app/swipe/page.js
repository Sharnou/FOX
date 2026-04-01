'use client';
import { useState, useEffect, useCallback } from 'react';
import SwipeAdCard from '../components/SwipeAdCard';

const TRANSLATIONS = {
  ar: {
    title: 'تصفح الإعلانات',
    skip: 'تخطي',
    save: 'حفظ',
    noMore: 'لا يوجد المزيد',
    noMoreSub: 'شاهدت كل الإعلانات المتاحة',
    refresh: 'تحديث',
    loginPrompt: 'سجّل دخولك لحفظ الإعلانات في المفضلة',
    loginBtn: 'تسجيل الدخول',
    loading: 'جارٍ التحميل...',
    errorTitle: 'حدث خطأ في تحميل الإعلانات',
    retry: 'إعادة المحاولة',
    of: 'من',
    swipeHint: 'اسحب يميناً للحفظ • يساراً للتخطي',
    cardSwiped: 'انتهت البطاقة؟ اضغط زر التخطي للمتابعة',
  },
  en: {
    title: 'Browse Ads',
    skip: 'Skip',
    save: 'Save',
    noMore: 'No more ads',
    noMoreSub: "You've seen all available ads",
    refresh: 'Refresh',
    loginPrompt: 'Log in to save ads to your wishlist',
    loginBtn: 'Log In',
    loading: 'Loading...',
    errorTitle: 'Error loading ads',
    retry: 'Retry',
    of: 'of',
    swipeHint: 'Swipe right to save • left to skip',
    cardSwiped: 'Card gone? Press Skip to continue',
  },
};

export default function SwipePage() {
  const [lang, setLang] = useState('ar');
  const [token, setToken] = useState(null);
  const [ads, setAds] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);

  // Init lang and token from localStorage
  useEffect(() => {
    const storedLang = (typeof window !== 'undefined' && localStorage.getItem('lang')) || 'ar';
    const storedToken = (typeof window !== 'undefined' && localStorage.getItem('token')) || null;
    setLang(storedLang);
    setToken(storedToken);
  }, []);

  const fetchAds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const res = await fetch(`${apiUrl}/api/ads?page=1&limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.ads || data.data || []);
      setAds(list);
      setCurrentIndex(0);
      setSavedIds(new Set());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    if (typeof window !== 'undefined') localStorage.setItem('lang', next);
  };

  const handleSkip = useCallback(() => {
    setCurrentIndex(prev => prev + 1);
  }, []);

  const handleSave = useCallback(async () => {
    if (!token) return;
    const ad = ads[currentIndex];
    if (!ad) return;
    setSavingId(ad._id);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      await fetch(`${apiUrl}/api/wishlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ adId: ad._id }),
      });
      setSavedIds(prev => new Set([...prev, ad._id]));
    } catch (_) {
      // silently fail
    } finally {
      setSavingId(null);
      setCurrentIndex(prev => prev + 1);
    }
  }, [ads, currentIndex, token]);

  // Called by SwipeAdCard when internal right-swipe saves to wishlist
  const handleWishlistUpdate = useCallback((adId) => {
    setSavedIds(prev => new Set([...prev, adId]));
    setCurrentIndex(prev => prev + 1);
  }, []);

  const tr = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  const currentAd = ads[currentIndex];
  const isExhausted = !loading && !error && ads.length > 0 && currentIndex >= ads.length;
  const isAlreadySaved = currentAd && savedIds.has(currentAd._id);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100"
      dir={dir}
      style={{ fontFamily: isRTL ? 'Tahoma, Arial, sans-serif' : 'Arial, sans-serif' }}
    >
      {/* ── Header ── */}
      <header
        style={{
          background: '#fff',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
          {tr.title}
        </h1>
        <button
          onClick={toggleLang}
          style={{
            fontSize: 13,
            color: '#2563eb',
            border: '1px solid #93c5fd',
            borderRadius: 20,
            padding: '4px 12px',
            background: '#eff6ff',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          {lang === 'ar' ? 'EN' : 'عربي'}
        </button>
      </header>

      <main style={{ maxWidth: 400, margin: '0 auto', padding: '24px 16px' }}>

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <div
              style={{
                width: 56,
                height: 56,
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #2563eb',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: 16,
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#6b7280', fontSize: 15 }}>{tr.loading}</p>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div style={{ textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
            <p style={{ color: '#dc2626', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{tr.errorTitle}</p>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 24 }}>{error}</p>
            <button
              onClick={fetchAds}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 24,
                padding: '10px 28px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔄 {tr.retry}
            </button>
          </div>
        )}

        {/* ── Auth notice (non-blocking) ── */}
        {!token && !loading && !error && ads.length > 0 && (
          <div
            style={{
              background: '#fffbeb',
              border: '1px solid #fcd34d',
              borderRadius: 12,
              padding: '12px 16px',
              marginBottom: 16,
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#92400e', fontSize: 13, marginBottom: 6 }}>{tr.loginPrompt}</p>
            <a
              href="/login"
              style={{ color: '#2563eb', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
            >
              {tr.loginBtn} →
            </a>
          </div>
        )}

        {/* ── Swipe area ── */}
        {!loading && !error && ads.length > 0 && !isExhausted && (
          <>
            {/* Counter */}
            <div style={{ textAlign: 'center', marginBottom: 12 }}>
              <span
                style={{
                  background: '#e0e7ff',
                  color: '#3730a3',
                  borderRadius: 20,
                  padding: '4px 14px',
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: 0.5,
                }}
              >
                {isRTL
                  ? `${currentIndex + 1} / ${ads.length}`
                  : `${currentIndex + 1} ${tr.of} ${ads.length}`}
              </span>
            </div>

            {/* Swipe hint */}
            <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, marginBottom: 12 }}>
              {tr.swipeHint}
            </p>

            {/* SwipeAdCard — one card at a time, re-keyed on index change */}
            <SwipeAdCard
              key={`swipe-card-${currentIndex}`}
              ads={currentAd ? [currentAd] : []}
              token={token}
              onWishlistUpdate={handleWishlistUpdate}
            />

            {/* External action buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 40,
                marginTop: 24,
              }}
            >
              {/* Skip */}
              <button
                onClick={handleSkip}
                aria-label={tr.skip}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: '#fef2f2',
                  border: '2px solid #fca5a5',
                  cursor: 'pointer',
                  fontSize: 24,
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(239,68,68,0.15)',
                  transition: 'transform 0.1s, background 0.1s',
                }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.92)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
              >
                ❌
              </button>

              {/* Save / Wishlist */}
              <button
                onClick={handleSave}
                disabled={!token || savingId === currentAd?._id}
                aria-label={tr.save}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 4,
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: isAlreadySaved ? '#dcfce7' : (token ? '#f0fdf4' : '#f9fafb'),
                  border: `2px solid ${isAlreadySaved ? '#4ade80' : (token ? '#86efac' : '#e5e7eb')}`,
                  cursor: token ? 'pointer' : 'not-allowed',
                  fontSize: 24,
                  justifyContent: 'center',
                  boxShadow: token ? '0 4px 12px rgba(34,197,94,0.15)' : 'none',
                  opacity: savingId === currentAd?._id ? 0.7 : 1,
                  transition: 'transform 0.1s, background 0.1s',
                }}
                onMouseDown={e => token && (e.currentTarget.style.transform = 'scale(0.92)')}
                onMouseUp={e => token && (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={e => token && (e.currentTarget.style.transform = 'scale(1)')}
              >
                {isAlreadySaved ? '✅' : '❤️'}
              </button>
            </div>

            {/* Button labels */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 6 }}>
              <span style={{ width: 64, textAlign: 'center', fontSize: 11, color: '#ef4444', fontWeight: 600 }}>
                {tr.skip}
              </span>
              <span style={{ width: 64, textAlign: 'center', fontSize: 11, color: token ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
                {tr.save}
              </span>
            </div>

            {/* Hint for when internal card swipe empties the card */}
            <p style={{ textAlign: 'center', color: '#d1d5db', fontSize: 11, marginTop: 16 }}>
              {tr.cardSwiped}
            </p>
          </>
        )}

        {/* ── Exhausted state ── */}
        {isExhausted && (
          <div
            style={{
              textAlign: 'center',
              minHeight: 400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>
              {tr.noMore}
            </h2>
            <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 32 }}>{tr.noMoreSub}</p>
            <button
              onClick={fetchAds}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: '#fff',
                border: 'none',
                borderRadius: 28,
                padding: '14px 36px',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 6px 20px rgba(37,99,235,0.35)',
              }}
            >
              🔄 {tr.refresh}
            </button>
          </div>
        )}

        {/* ── Empty API response ── */}
        {!loading && !error && ads.length === 0 && (
          <div style={{ textAlign: 'center', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📭</div>
            <p style={{ color: '#6b7280', fontSize: 16, fontWeight: 600 }}>
              {lang === 'ar' ? 'لا توجد إعلانات حالياً' : 'No ads available right now'}
            </p>
            <button
              onClick={fetchAds}
              style={{
                marginTop: 20,
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 20,
                padding: '10px 24px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {tr.refresh}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}
