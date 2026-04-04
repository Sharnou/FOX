'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AdCardSkeleton from '../components/AdCardSkeleton';

const AdCard = dynamic(() => import('../components/AdCard'), { ssr: false });

const BACKEND = 'https://xtox.up.railway.app';

const TRANSLATIONS = {
  ar: {
    title: 'إعلاناتي المحفوظة ❤️',
    clearAll: 'مسح الكل',
    sortLabel: 'ترتيب:',
    sortNewest: 'الأحدث أولاً',
    sortOldest: 'الأقدم أولاً',
    sortPriceLow: 'السعر: الأقل',
    sortPriceHigh: 'السعر: الأعلى',
    filterAll: 'الكل',
    count: (n) => `${n} إعلان محفوظ`,
    emptyTitle: 'لا توجد إعلانات محفوظة بعد',
    emptyDesc: 'احفظ الإعلانات التي تعجبك وستظهر هنا',
    browseCta: 'تصفح الإعلانات',
    removeLabel: 'إزالة من المحفوظات',
    langToggle: 'EN',
    confirmClear: 'هل تريد مسح كل الإعلانات المحفوظة؟',
    shareList: 'مشاركة القائمة',
    copiedToast: '✅ تم نسخ الرابط',
    noCategory: 'أخرى',
  },
  en: {
    title: 'My Saved Ads ❤️',
    clearAll: 'Clear All',
    sortLabel: 'Sort:',
    sortNewest: 'Newest First',
    sortOldest: 'Oldest First',
    sortPriceLow: 'Price: Low',
    sortPriceHigh: 'Price: High',
    filterAll: 'All',
    count: (n) => `${n} saved ad${n !== 1 ? 's' : ''}`,
    emptyTitle: 'No saved ads yet',
    emptyDesc: 'Save ads you like and they will appear here',
    browseCta: 'Browse Ads',
    removeLabel: 'Remove from saved',
    langToggle: 'عربي',
    confirmClear: 'Clear all saved ads?',
    shareList: 'Share List',
    copiedToast: '✅ Link copied',
    noCategory: 'Other',
  },
};

const SORT_OPTIONS = ['newest', 'oldest', 'priceLow', 'priceHigh'];

export default function SavedPage() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('ar');
  const [sort, setSort] = useState('newest');
  const [activeCategory, setActiveCategory] = useState('all');
  const [toast, setToast] = useState('');

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    const stored = localStorage.getItem('xtox_lang');
    if (stored === 'en' || stored === 'ar') setLang(stored);
  }, []);

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    setLang(next);
    localStorage.setItem('xtox_lang', next);
  };

  useEffect(() => {
    const savedIds = JSON.parse(localStorage.getItem('xtox_saved_ads') || '[]');
    if (savedIds.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      savedIds.map(id =>
        fetch(`${BACKEND}/api/ads/${id}`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      setAds(results.filter(Boolean));
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(ads.map(ad => ad.category || t.noCategory));
    return ['all', ...Array.from(cats)];
  }, [ads, t.noCategory]);

  const filtered = useMemo(() => {
    let list = activeCategory === 'all'
      ? [...ads]
      : ads.filter(ad => (ad.category || t.noCategory) === activeCategory);

    if (sort === 'newest') list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    else if (sort === 'oldest') list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    else if (sort === 'priceLow') list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    else if (sort === 'priceHigh') list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));

    return list;
  }, [ads, sort, activeCategory, t.noCategory]);

  const removeAd = (id) => {
    const savedIds = JSON.parse(localStorage.getItem('xtox_saved_ads') || '[]');
    const updated = savedIds.filter(savedId => savedId !== id);
    localStorage.setItem('xtox_saved_ads', JSON.stringify(updated));
    setAds(prev => prev.filter(ad => (ad._id || ad.id) !== id));
  };

  const clearAll = () => {
    if (!window.confirm(t.confirmClear)) return;
    localStorage.setItem('xtox_saved_ads', JSON.stringify([]));
    setAds([]);
    setActiveCategory('all');
  };

  const shareList = async () => {
    const ids = JSON.parse(localStorage.getItem('xtox_saved_ads') || '[]');
    const url = `${window.location.origin}/saved?ids=${ids.join(',')}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t.copiedToast);
    } catch {
      showToast(t.copiedToast);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const sortKeyMap = {
    newest: t.sortNewest,
    oldest: t.sortOldest,
    priceLow: t.sortPriceLow,
    priceHigh: t.sortPriceHigh,
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        maxWidth: 640,
        margin: '0 auto',
        padding: '16px 12px',
        minHeight: '100vh',
        background: '#f4f4f8',
        fontFamily: "'Cairo', 'Segoe UI', sans-serif",
      }}
    >
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a2e', color: '#fff', borderRadius: 12, padding: '10px 20px',
          fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ fontSize: 22, color: '#333', textDecoration: 'none', lineHeight: 1 }}>
            {isRtl ? '→' : '←'}
          </Link>
          <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: '#1a1a2e' }}>{t.title}</h1>
        </div>
        <button
          onClick={toggleLang}
          style={{
            fontSize: 12, fontWeight: 700, padding: '4px 10px',
            borderRadius: 20, border: '1.5px solid #6B21A8',
            background: '#fff', color: '#6B21A8', cursor: 'pointer',
          }}
        >
          {t.langToggle}
        </button>
      </div>

      {/* Controls bar */}
      {!loading && ads.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#888' }}>{t.sortLabel}</span>
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              style={{
                fontSize: 12, border: '1px solid #ddd', borderRadius: 8,
                padding: '4px 8px', background: '#fff', color: '#333', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {SORT_OPTIONS.map(s => <option key={s} value={s}>{sortKeyMap[s]}</option>)}
            </select>
          </div>
          {/* Actions */}
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={shareList}
              style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 20,
                background: '#EDE9FE', border: 'none', color: '#6B21A8',
                cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
              }}
            >
              🔗 {t.shareList}
            </button>
            <button
              onClick={clearAll}
              style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 20,
                background: '#FFF0F0', border: 'none', color: '#e53e3e',
                cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
              }}
            >
              🗑 {t.clearAll}
            </button>
          </div>
        </div>
      )}

      {/* Category tabs */}
      {!loading && ads.length > 0 && categories.length > 2 && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 12, scrollbarWidth: 'none' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0, fontSize: 12, padding: '5px 12px', borderRadius: 20,
                border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                background: activeCategory === cat ? '#6B21A8' : '#fff',
                color: activeCategory === cat ? '#fff' : '#555',
                boxShadow: activeCategory === cat ? '0 2px 8px rgba(107,33,168,0.2)' : '0 1px 4px rgba(0,0,0,0.08)',
                transition: 'all 0.2s',
              }}
            >
              {cat === 'all' ? t.filterAll : cat}
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      {!loading && ads.length > 0 && (
        <p style={{ fontSize: 13, color: '#888', marginBottom: 10 }}>{t.count(filtered.length)}</p>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[0, 1, 2, 3].map(i => <AdCardSkeleton key={i} />)}
        </div>
      ) : ads.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🤍</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>{t.emptyTitle}</p>
          <p style={{ fontSize: 14, color: '#888', margin: '0 0 28px' }}>{t.emptyDesc}</p>
          <Link
            href="/"
            style={{
              display: 'inline-block', background: 'linear-gradient(135deg, #6B21A8, #3B0764)',
              color: '#fff', borderRadius: 14, padding: '12px 32px',
              textDecoration: 'none', fontWeight: 700, fontSize: 15,
              boxShadow: '0 4px 16px rgba(107,33,168,0.3)',
            }}
          >
            {t.browseCta}
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
          <p style={{ color: '#888', fontSize: 14 }}>{t.emptyTitle}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {filtered.map(ad => (
            <div key={ad._id || ad.id} style={{ position: 'relative' }}>
              <AdCard ad={ad} />
              <button
                onClick={() => removeAd(ad._id || ad.id)}
                aria-label={t.removeLabel}
                style={{
                  position: 'absolute', top: 6, left: isRtl ? 6 : 'auto', right: isRtl ? 'auto' : 6,
                  zIndex: 20, width: 28, height: 28, borderRadius: '50%',
                  background: '#fff', border: '1px solid #ddd',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)', cursor: 'pointer',
                  fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: 0, color: '#e53e3e', lineHeight: 1, transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
