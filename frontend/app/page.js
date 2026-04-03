'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { detectAndSetLocale, getT, COUNTRY_CONFIG } from './lib/locale';
import AdCardSkeleton from './components/AdCardSkeleton';
import CartoonMoodPopup from './components/CartoonMoodPopup';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const CAT_KEYS = ['all', 'vehicles', 'electronics', 'realEstate', 'jobs', 'services', 'supermarket', 'pharmacy', 'food', 'fashion'];
const CAT_VALS = ['', 'Vehicles', 'Electronics', 'Real Estate', 'Jobs', 'Services', 'Supermarket', 'Pharmacy', 'Fast Food', 'Fashion'];
const CAT_ICONS = ['🌐', '🚗', '📱', '🏠', '💼', '🔧', '🛒', '💊', '🍕', '👗'];

const CAT_NAMES_AR = {
  all: 'جميع الإعلانات',
  vehicles: 'سيارات',
  electronics: 'إلكترونيات',
  realEstate: 'عقارات',
  jobs: 'وظائف',
  services: 'خدمات',
  supermarket: 'سوبرماركت',
  pharmacy: 'صيدلية',
  food: 'طعام سريع',
  fashion: 'موضة وأزياء',
};

const EMPTY_STATE_ICONS = {
  all: '🏪',
  vehicles: '🚗',
  electronics: '📱',
  realEstate: '🏠',
  jobs: '💼',
  services: '🔧',
  supermarket: '🛒',
  pharmacy: '💊',
  food: '🍕',
  fashion: '👗',
};

const POPUP_INTERVAL = 4 * 60 * 60 * 1000;
const CARTOONS = ['🦊', '🐨', '🦁', '🐸', '🦝', '🐙', '🦄', '🐼'];

export default function Home() {
  const [ads, setAds] = useState([]);
  const [catIdx, setCatIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [locale, setLocale] = useState({ lang: 'ar', dir: 'rtl', country: 'EG', currency: 'EGP' });
  const [t, setT] = useState(getT('ar'));
  const [user, setUser] = useState(null);
  const [popup, setPopup] = useState(null);
  const [popupMuted, setPopupMuted] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [scrollY, setScrollY] = useState(0);
  const searchRef = useRef(null);
  const catScrollRef = useRef(null);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    async function init() {
      const loc = await detectAndSetLocale();
      setLocale(loc);
      setT(getT(loc.lang));
      document.documentElement.lang = loc.lang;
      document.documentElement.dir = loc.dir;
      document.body.style.direction = loc.dir;
      document.body.style.fontFamily = loc.lang === 'ar'
        ? "'Cairo', 'Noto Sans Arabic', 'Tajawal', system-ui, sans-serif"
        : "'Inter', system-ui, sans-serif";
      try {
        const u = localStorage.getItem('user');
        if (u) setUser(JSON.parse(u));
      } catch {}
      try {
        const saved = JSON.parse(localStorage.getItem('xtox_saved_ads') || '[]');
        setSavedCount(Array.isArray(saved) ? saved.length : 0);
      } catch {}
      await fetchAds(CAT_VALS[0], loc.country);
      const lastPopup = localStorage.getItem('lastPopup');
      if (!lastPopup || Date.now() - Number(lastPopup) > POPUP_INTERVAL) {
        setTimeout(() => showPopup(loc.country), 5000);
      }
    }
    init();

    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function fetchAds(category, country) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ country: country || locale.country });
      if (category) params.append('category', category);
      const res = await fetch(`${API}/api/ads?${params}`);
      if (res.ok) setAds(await res.json());
      else {
        setAds([]);
        setError(locale.lang === 'ar' ? 'تعذّر تحميل الإعلانات. حاول مجدداً.' : 'Failed to load ads. Please try again.');
      }
    } catch {
      setAds([]);
      setError(locale.lang === 'ar' ? 'لا يوجد اتصال بالإنترنت. تحقق من الشبكة.' : 'No internet connection. Check your network.');
    }
    setLoading(false);
  }

  function selectCat(idx) {
    setCatIdx(idx);
    fetchAds(CAT_VALS[idx], locale.country);
    // Scroll selected category into view
    const el = catScrollRef.current?.children[idx];
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  async function showPopup(country) {
    try {
      const res = await fetch(`${API}/api/ads?country=${country}`);
      if (!res.ok) return;
      const all = await res.json();
      const featured = all.filter(a => a.isFeatured);
      if (featured.length > 0) {
        setPopup({ ad: featured[Math.floor(Math.random() * featured.length)], cartoon: CARTOONS[Math.floor(Math.random() * CARTOONS.length)] });
        localStorage.setItem('lastPopup', Date.now().toString());
      }
    } catch {}
  }

  const handleSearchSubmit = useCallback((e) => {
    e.preventDefault();
    if (search.trim()) window.location.href = `/search?q=${encodeURIComponent(search.trim())}`;
  }, [search]);

  const handleRetry = useCallback(() => {
    fetchAds(CAT_VALS[catIdx], locale.country);
  }, [catIdx, locale.country]);

  const isRTL = locale.dir === 'rtl';
  const lang = locale.lang;
  const featured = ads.filter(a => a.isFeatured);
  const regular = ads.filter(a => !a.isFeatured).filter(ad => !search || ad.title?.toLowerCase().includes(search.toLowerCase()));
  const currentCatKey = CAT_KEYS[catIdx];
  const currentCatNameAr = CAT_NAMES_AR[currentCatKey] || 'جميع الإعلانات';

  // ── JSON-LD: AggregateOffer ────────────────────────────────────────────────
  const prices = ads.map(a => Number(a.price)).filter(p => p > 0);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `إعلانات XTOX - ${currentCatNameAr}`,
    description: `سوق XTOX للإعلانات المبوبة - ${currentCatNameAr}`,
    numberOfItems: ads.length,
    ...(prices.length > 0 && {
      offers: {
        '@type': 'AggregateOffer',
        offerCount: ads.length,
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        priceCurrency: locale.currency || 'EGP',
      },
    }),
    itemListElement: ads.slice(0, 10).map((ad, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: ad.title,
        url: `https://xtox.app/ads/${ad._id}`,
        image: ad.media?.[0] || undefined,
        offers: {
          '@type': 'Offer',
          price: ad.price,
          priceCurrency: ad.currency || locale.currency || 'EGP',
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/UsedCondition',
        },
      },
    })),
  };

  // ── JSON-LD: BreadcrumbList ───────────────────────────────────────────────
  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://xtox.app' },
  ];
  if (catIdx !== 0) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: currentCatNameAr,
      item: `https://xtox.app/?cat=${CAT_VALS[catIdx]}`,
    });
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  const loginLabel = lang === 'ar' ? 'دخول' : lang === 'de' ? 'Einloggen' : lang === 'fr' ? 'Connexion' : 'Login';
  const savedLabel = lang === 'ar' ? 'المحفوظات' : lang === 'de' ? 'Gespeichert' : lang === 'fr' ? 'Favoris' : 'Saved';

  return (
    <div
      dir={locale.dir}
      lang={locale.lang}
      style={{
        minHeight: '100dvh',
        background: '#f5f5f5',
        fontFamily: lang === 'ar'
          ? "'Cairo', 'Noto Sans Arabic', 'Tajawal', system-ui, sans-serif"
          : "'Inter', system-ui, sans-serif",
        direction: locale.dir,
        textAlign: isRTL ? 'right' : 'left',
        overflowX: 'hidden',
      }}
    >
      {/* Google Fonts: Cairo + Noto Sans Arabic */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Noto+Sans+Arabic:wght@400;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; }

        body { margin: 0; padding: 0; }

        :focus-visible {
          outline: 2px solid #00b09b;
          outline-offset: 2px;
          border-radius: 4px;
        }

        .cat-scroll::-webkit-scrollbar { display: none; }
        .cat-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        .feat-scroll::-webkit-scrollbar { display: none; }
        .feat-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        .quick-scroll::-webkit-scrollbar { display: none; }
        .quick-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        .slide-in {
          animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        .ad-card {
          background: white;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
          text-decoration: none;
          color: inherit;
          display: block;
          transition: transform 0.18s ease, box-shadow 0.18s ease;
        }
        .ad-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(0,0,0,0.12);
        }
        .ad-card:active { transform: translateY(0); }

        .cat-btn {
          padding: 7px 16px;
          border-radius: 20px;
          border: none;
          cursor: pointer;
          white-space: nowrap;
          font-size: 13px;
          transition: background 0.18s, color 0.18s, transform 0.12s;
          flex-shrink: 0;
        }
        .cat-btn:active { transform: scale(0.95); }

        .toast {
          position: fixed;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          padding: 10px 20px;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          animation: fadeInUp 0.3s ease forwards;
          pointer-events: none;
          max-width: 90vw;
          text-align: center;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        .loading-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }

        @media (max-width: 480px) {
          .header-brand { font-size: 18px !important; }
          .header-sell  { padding: 7px 12px !important; font-size: 13px !important; }
          .ads-grid     { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }
        }

        @media (min-width: 768px) {
          .ads-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important; }
        }
      `}</style>

      {/* JSON-LD Structured Data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* ── Header ── */}
      <header
        role="banner"
        aria-label={lang === 'ar' ? 'رأس الصفحة الرئيسية' : 'Main header'}
        style={{
          background: 'linear-gradient(135deg, #002f34, #003d3b)',
          color: 'white',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          flexDirection: isRTL ? 'row' : 'row',
        }}
      >
        <a
          href="/"
          className="header-brand"
          aria-label={lang === 'ar' ? 'اكستوكس - الصفحة الرئيسية' : 'XTOX - Home'}
          style={{ fontSize: 22, fontWeight: 800, letterSpacing: 1, color: 'white', textDecoration: 'none', flexShrink: 0 }}
        >
          XTOX
        </a>

        {/* Search */}
        <form
          role="search"
          aria-label={lang === 'ar' ? 'بحث في الإعلانات' : 'Search ads'}
          onSubmit={handleSearchSubmit}
          style={{ flex: 1, position: 'relative' }}
        >
          <label htmlFor="main-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            {lang === 'ar' ? 'ابحث عن إعلانات' : 'Search for ads'}
          </label>
          <input
            id="main-search"
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t.search || (lang === 'ar' ? 'ابحث عن أي شيء...' : 'Search anything...')}
            aria-label={lang === 'ar' ? 'ابحث في الإعلانات' : 'Search ads'}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '9px 14px',
              borderRadius: 20,
              border: 'none',
              fontSize: 14,
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              outline: 'none',
              textAlign: isRTL ? 'right' : 'left',
              fontFamily: 'inherit',
            }}
          />
        </form>

        {/* Sell button */}
        <a
          href="/sell"
          className="header-sell"
          aria-label={lang === 'ar' ? 'أضف إعلانك الآن' : 'Post your ad'}
          style={{
            background: '#00b09b',
            color: 'white',
            padding: '9px 16px',
            borderRadius: 20,
            textDecoration: 'none',
            fontWeight: 'bold',
            fontSize: 14,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'background 0.18s',
          }}
        >
          {t.sell || (lang === 'ar' ? 'أعلن' : 'Sell')}
        </a>

        {/* Saved */}
        <a
          href="/saved"
          title={savedLabel}
          aria-label={lang === 'ar' ? `المحفوظات${savedCount > 0 ? ` - ${savedCount} إعلان` : ''}` : `Saved${savedCount > 0 ? ` - ${savedCount}` : ''}`}
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '50%',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 18 }} aria-hidden="true">🔖</span>
          {savedCount > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: '#ff4d4d',
                color: 'white',
                borderRadius: '50%',
                fontSize: 10,
                fontWeight: 'bold',
                minWidth: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                lineHeight: 1,
              }}
            >
              {savedCount > 9 ? '9+' : savedCount}
            </span>
          )}
        </a>

        {/* User / Login */}
        {user ? (
          <a
            href={`/profile/${user.id}`}
            aria-label={lang === 'ar' ? `الملف الشخصي - ${user.name}` : `Profile - ${user.name}`}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              textDecoration: 'none',
              color: 'white',
              fontSize: 16,
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {user.avatar
              ? <img src={user.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt={user.name || ''} />
              : user.name?.[0]?.toUpperCase()}
          </a>
        ) : (
          <a
            href="/login"
            aria-label={lang === 'ar' ? 'تسجيل الدخول إلى حسابك' : 'Log in to your account'}
            style={{
              background: 'rgba(255,255,255,0.15)',
              color: 'white',
              padding: '8px 14px',
              borderRadius: 20,
              textDecoration: 'none',
              fontSize: 13,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {loginLabel}
          </a>
        )}
      </header>

      {/* ── Quick Actions ── */}
      <nav
        aria-label={lang === 'ar' ? 'روابط سريعة' : 'Quick links'}
        style={{ background: 'white', borderBottom: '1px solid #eee' }}
      >
        <div
          className="quick-scroll"
          style={{ display: 'flex', gap: 8, padding: '10px 16px', overflowX: 'auto' }}
        >
          <a href="/nearby" aria-label={lang === 'ar' ? 'الإعلانات القريبة منك' : 'Ads near you'} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#002f34', color: 'white', borderRadius: 20, textDecoration: 'none', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span aria-hidden="true">📍</span> {t.nearby || (lang === 'ar' ? 'قريب منك' : 'Nearby')}
          </a>
          <a href="/my-ads" aria-label={lang === 'ar' ? 'إعلاناتي' : 'My ads'} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#f0f0f0', color: '#333', borderRadius: 20, textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span aria-hidden="true">📋</span> {t.myAds || (lang === 'ar' ? 'إعلاناتي' : 'My Ads')}
          </a>
          <a href="/chat" aria-label={lang === 'ar' ? 'المحادثات' : 'Messages'} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#f0f0f0', color: '#333', borderRadius: 20, textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span aria-hidden="true">💬</span> {t.messages || (lang === 'ar' ? 'رسائل' : 'Messages')}
          </a>
          <a href="/search" aria-label={lang === 'ar' ? 'البحث المتقدم' : 'Advanced search'} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#f0f0f0', color: '#333', borderRadius: 20, textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <span aria-hidden="true">🔍</span> {t.advancedSearch || (lang === 'ar' ? 'بحث متقدم' : 'Advanced')}
          </a>
        </div>
      </nav>

      {/* ── Categories ── */}
      <nav
        role="navigation"
        aria-label={lang === 'ar' ? 'تصفية حسب الفئة' : 'Filter by category'}
        style={{ background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
      >
        <div
          ref={catScrollRef}
          className="cat-scroll"
          role="list"
          style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto' }}
        >
          {CAT_KEYS.map((key, i) => (
            <button
              key={key}
              role="listitem"
              onClick={() => selectCat(i)}
              aria-pressed={catIdx === i}
              aria-label={lang === 'ar' ? `تصفية: ${CAT_NAMES_AR[key]}` : `Filter: ${key}`}
              className="cat-btn"
              style={{
                fontWeight: catIdx === i ? 'bold' : 'normal',
                background: catIdx === i ? '#002f34' : '#f0f0f0',
                color: catIdx === i ? 'white' : '#444',
                fontFamily: 'inherit',
                border: catIdx === i ? '2px solid #002f34' : '2px solid transparent',
              }}
            >
              <span aria-hidden="true">{CAT_ICONS[i]}</span>{' '}
              {t[key] || CAT_NAMES_AR[key]}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Ads Count Bar ── */}
      {!loading && !error && (
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            padding: '8px 16px',
            background: '#fafafa',
            borderBottom: '1px solid #eee',
            fontSize: 13,
            color: '#666',
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {lang === 'ar'
            ? `${regular.length} إعلان في ${currentCatNameAr}`
            : `${regular.length} ads in ${CAT_NAMES_AR[currentCatKey]}`}
        </div>
      )}

      {/* ── Featured Ads ── */}
      {featured.length > 0 && (
        <section
          aria-label={lang === 'ar' ? 'الإعلانات المميزة' : 'Featured ads'}
          style={{ background: 'linear-gradient(135deg, #002f34 0%, #00695c 100%)', padding: '16px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ background: '#ffd700', color: '#002f34', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' }}>
              <span aria-hidden="true">⭐</span> {t.featured || (lang === 'ar' ? 'مميز' : 'Featured')}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              {featured.length}/16 {t.perWeek || (lang === 'ar' ? 'أسبوعياً' : 'per week')}
            </span>
          </div>
          <div
            className="feat-scroll"
            role="list"
            style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}
          >
            {featured.map(ad => (
              <a
                key={ad._id}
                href={`/ads/${ad._id}`}
                role="listitem"
                aria-label={lang === 'ar' ? `إعلان مميز: ${ad.title} - ${ad.price} ${ad.currency || locale.currency}` : `Featured: ${ad.title}`}
                style={{
                  minWidth: 160,
                  background: 'white',
                  borderRadius: 14,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'block',
                  flexShrink: 0,
                  border: ad.featuredStyle === 'cartoon' ? '3px solid #ffd700' : 'none',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              >
                <div style={{ height: 110, background: '#f0f0f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                  {ad.media?.[0]
                    ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={ad.title || ''} loading="lazy" />
                    : <span aria-hidden="true">📦</span>}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 12, margin: 0 }}>{ad.title?.slice(0, 28)}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 13, margin: '3px 0 0' }}>
                    {ad.price} {ad.currency || locale.currency}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── Main Ads Grid ── */}
      <main
        role="main"
        aria-label={lang === 'ar' ? 'قائمة الإعلانات' : 'Ads listing'}
        style={{ padding: '16px' }}
      >
        {/* Loading state */}
        {loading && (
          <div
            aria-live="polite"
            aria-busy="true"
            aria-label={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          >
            <p
              className="loading-pulse"
              style={{
                textAlign: 'center',
                color: '#002f34',
                fontWeight: 600,
                fontSize: 15,
                margin: '0 0 16px',
              }}
            >
              <span aria-hidden="true">⏳</span>{' '}
              {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
            <div className="ads-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {Array.from({ length: 8 }).map((_, i) => <AdCardSkeleton key={i} />)}
            </div>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              textAlign: 'center',
              padding: '48px 24px',
              color: '#666',
            }}
          >
            <div style={{ fontSize: 56, marginBottom: 12 }} aria-hidden="true">⚠️</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#444', margin: '0 0 8px' }}>{error}</p>
            <button
              onClick={handleRetry}
              aria-label={lang === 'ar' ? 'إعادة المحاولة لتحميل الإعلانات' : 'Retry loading ads'}
              style={{
                marginTop: 16,
                padding: '10px 28px',
                background: '#002f34',
                color: 'white',
                border: 'none',
                borderRadius: 20,
                fontWeight: 'bold',
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {lang === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        )}

        {/* Ads grid */}
        {!loading && !error && (
          <div
            role="list"
            className="ads-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}
          >
            {regular.map(ad => (
              <a
                key={ad._id}
                href={`/ads/${ad._id}`}
                role="listitem"
                className="ad-card"
                aria-label={
                  lang === 'ar'
                    ? `${ad.title} - ${ad.price} ${ad.currency || locale.currency} - ${ad.city || ''}`
                    : `${ad.title} - ${ad.price} ${ad.currency || locale.currency}`
                }
              >
                <div style={{ height: 140, background: '#f0f0f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                  {ad.video
                    ? <video src={ad.video} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop playsInline aria-hidden="true" />
                    : ad.media?.[0]
                      ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" loading="lazy" />
                      : <span aria-hidden="true">📦</span>}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 13, margin: 0, lineHeight: 1.4 }}>{ad.title?.slice(0, 32)}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 14, margin: '4px 0' }}>
                    {ad.price} {ad.currency || locale.currency}
                  </p>
                  <p style={{ color: '#999', fontSize: 11, margin: '2px 0 0' }}>
                    <span aria-hidden="true">👁</span> {ad.views} · {ad.city}
                  </p>
                  {ad.expiresAt && (
                    <p style={{ color: '#e44', fontSize: 11, margin: '2px 0 0' }}>
                      <span aria-hidden="true">⏰</span>{' '}
                      {new Date(ad.expiresAt).toLocaleDateString(
                        lang === 'ar' ? 'ar-EG' : lang === 'de' ? 'de-DE' : lang === 'fr' ? 'fr-FR' : 'en-US'
                      )}
                    </p>
                  )}
                </div>
              </a>
            ))}

            {/* Empty state */}
            {regular.length === 0 && (
              <div
                role="status"
                aria-live="polite"
                style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 24px', color: '#999' }}
              >
                <div style={{ fontSize: 56, marginBottom: 12 }} aria-hidden="true">
                  {EMPTY_STATE_ICONS[currentCatKey] || '🏪'}
                </div>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#555', margin: '0 0 8px' }}>
                  {lang === 'ar'
                    ? `لا توجد إعلانات في ${currentCatNameAr} حتى الآن`
                    : `No ads in ${currentCatNameAr} yet`}
                </p>
                <p style={{ fontSize: 13, margin: '0 0 20px', color: '#aaa' }}>
                  {lang === 'ar' ? 'كن أول من يضيف إعلاناً!' : 'Be the first to post!'}
                </p>
                <a
                  href="/sell"
                  aria-label={lang === 'ar' ? 'أضف إعلانك الآن' : 'Post your first ad'}
                  style={{
                    display: 'inline-block',
                    background: '#002f34',
                    color: 'white',
                    padding: '10px 28px',
                    borderRadius: 20,
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    fontSize: 14,
                  }}
                >
                  {lang === 'ar' ? 'أضف إعلاناً' : 'Post Ad'}
                </a>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer
        role="contentinfo"
        aria-label={lang === 'ar' ? 'معلومات الموقع' : 'Site info'}
        style={{
          textAlign: 'center',
          padding: '24px 16px',
          color: '#999',
          fontSize: 13,
          borderTop: '1px solid #eee',
          marginTop: 20,
        }}
      >
        <nav aria-label={lang === 'ar' ? 'روابط الموقع' : 'Site links'}>
          <a href="/about" aria-label={lang === 'ar' ? 'من نحن' : 'About us'} style={{ color: '#002f34', margin: '0 8px' }}>{t.about || (lang === 'ar' ? 'من نحن' : 'About')}</a>
          <a href="/privacy" aria-label={lang === 'ar' ? 'سياسة الخصوصية' : 'Privacy policy'} style={{ color: '#002f34', margin: '0 8px' }}>{t.privacy || (lang === 'ar' ? 'الخصوصية' : 'Privacy')}</a>
          <a href="/terms" aria-label={lang === 'ar' ? 'الشروط والأحكام' : 'Terms and conditions'} style={{ color: '#002f34', margin: '0 8px' }}>{t.terms || (lang === 'ar' ? 'الشروط' : 'Terms')}</a>
        </nav>
        <span style={{ marginTop: 8, display: 'block' }}>XTOX © 2026</span>
      </footer>

      {/* ── Scroll-to-top ── */}
      {scrollY > 300 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={lang === 'ar' ? 'العودة إلى الأعلى' : 'Back to top'}
          style={{
            position: 'fixed',
            bottom: 80,
            [isRTL ? 'left' : 'right']: 16,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#002f34',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 200,
          }}
        >
          ↑
        </button>
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="toast"
          style={{
            background: toast.type === 'error' ? '#e44' : '#002f34',
            color: 'white',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Featured Ad Popup (bottom sheet) ── */}
      {popup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'ar' ? 'إعلان مميز' : 'Featured ad'}
          onClick={() => setPopup(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="slide-in"
            style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: 24, maxWidth: 380, width: '100%' }}
          >
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 64, display: 'inline-block' }} aria-hidden="true">{popup.cartoon}</div>
              <p style={{ color: '#002f34', fontWeight: 'bold', margin: '8px 0 0', fontSize: 16 }}>
                {lang === 'ar' ? 'إعلان مميز خصيصاً لك! 🎉' : lang === 'de' ? 'Empfohlene Anzeige! 🎉' : 'Featured Ad for you! 🎉'}
              </p>
            </div>
            {popup.ad && (
              <a
                href={`/ads/${popup.ad._id}`}
                onClick={() => setPopup(null)}
                aria-label={lang === 'ar' ? `الإعلان المميز: ${popup.ad.title}` : `Featured ad: ${popup.ad.title}`}
                style={{ display: 'block', background: '#f8f8f8', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit', border: '2px solid #002f34', marginBottom: 16 }}
              >
                {popup.ad.media?.[0] && <img src={popup.ad.media[0]} style={{ width: '100%', height: 140, objectFit: 'cover' }} alt={popup.ad.title || ''} loading="lazy" />}
                <div style={{ padding: '10px 14px', textAlign: isRTL ? 'right' : 'left' }}>
                  <p style={{ fontWeight: 'bold', margin: 0 }}>{popup.ad.title}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', margin: '4px 0 0', fontSize: 18 }}>
                    {popup.ad.price} {popup.ad.currency}
                  </p>
                </div>
              </a>
            )}
            <div style={{ display: 'flex', gap: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <button
                onClick={() => setPopup(null)}
                aria-label={lang === 'ar' ? 'متابعة التصفح' : 'Continue browsing'}
                style={{ flex: 1, padding: '12px', background: '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}
              >
                {lang === 'ar' ? 'متابعة التصفح' : lang === 'de' ? 'Weiter browsen' : 'Continue'}
              </button>
              <button
                onClick={() => setPopupMuted(m => !m)}
                aria-label={popupMuted
                  ? (lang === 'ar' ? 'تشغيل الإشعارات' : 'Unmute notifications')
                  : (lang === 'ar' ? 'كتم الإشعارات' : 'Mute notifications')}
                aria-pressed={popupMuted}
                style={{ padding: '12px 16px', background: '#f0f0f0', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 18 }}
              >
                <span aria-hidden="true">{popupMuted ? '🔇' : '🔔'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <CartoonMoodPopup ads={ads} />
    </div>
  );
}
