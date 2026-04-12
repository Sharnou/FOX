'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { detectAndSetLocale, getT, COUNTRY_CONFIG } from './lib/locale';
import AdCardSkeleton from './components/AdCardSkeleton';
import CartoonMoodPopup from './components/CartoonMoodPopup';
import BannerAds from './components/BannerAds';
import { detectLang } from '../lib/lang';

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
    const controller = new AbortController();
    const timeoutId = setTimeout(function() { controller.abort(); }, 10000);
    try {
      // Do NOT filter by country — ads are stored with 'EG' country code,
      // but ipapi.co may detect a different country for the user, causing 0 results.
      // Country detection is only used for locale/UI, not for the ads query.
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      const res = await fetch(API + '/api/ads?' + params, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      setAds(Array.isArray(data) ? data : (data.ads || data.data || data.results || []));
      setError(null);
    } catch (e) {
      clearTimeout(timeoutId);
      setAds([]);
      setError('تعذّر تحميل الإعلانات — تحقّق من اتصالك بالإنترنت وأعد المحاولة');
    }
    setLoading(false);
  }

  function selectCat(idx) {
    setCatIdx(idx);
    fetchAds(CAT_VALS[idx], locale.country);
    const el = catScrollRef.current?.children[idx];
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  async function showPopup(country) {
    try {
      // FIX A: No country filter — ensures featured ads always load
      const res = await fetch(API + '/api/ads');
      if (!res.ok) return;
      const all = await res.json();
      const allList = Array.isArray(all) ? all : (all.ads || all.data || all.results || []);
      const featured = allList.filter(a => a.isFeatured);
      if (featured.length > 0) {
        setPopup({ ad: featured[Math.floor(Math.random() * featured.length)], cartoon: CARTOONS[Math.floor(Math.random() * CARTOONS.length)] });
        localStorage.setItem('lastPopup', Date.now().toString());
      }
    } catch {}
  }

  const handleRetry = useCallback(() => {
    fetchAds(CAT_VALS[catIdx], locale.country);
  }, [catIdx, locale.country]);

  const isRTL = locale.dir === 'rtl';
  const lang = locale.lang;
  const featured = ads.filter(a => a.isFeatured);
  const regular = ads.filter(a => !a.isFeatured);
  const currentCatKey = CAT_KEYS[catIdx];
  const currentCatNameAr = CAT_NAMES_AR[currentCatKey] || 'جميع الإعلانات';

  const prices = ads.map(a => Number(a.price)).filter(p => p > 0);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'إعلانات XTOX - ' + currentCatNameAr,
    description: 'سوق XTOX للإعلانات المبوبة - ' + currentCatNameAr,
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
        url: 'https://xtox.app/ads/' + ad._id,
        image: ad.media?.[0] || ad.images?.[0] || undefined,
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

  const breadcrumbItems = [
    { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: 'https://xtox.app' },
  ];
  if (catIdx !== 0) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: currentCatNameAr,
      item: 'https://xtox.app/?cat=' + CAT_VALS[catIdx],
    });
  }
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  };

  const loginLabel = lang === 'ar' ? 'دخول' : lang === 'de' ? 'Einloggen' : lang === 'fr' ? 'Connexion' : 'Login';
  const savedLabel = lang === 'ar' ? 'المحفوظات' : lang === 'de' ? 'Gespeichert' : lang === 'fr' ? 'Favoris' : 'Saved';

  /* ─── CSS vars ─── */
  const PRIMARY   = '#6366f1'; // indigo-500
  const PRIMARY_D = '#4f46e5'; // indigo-600
  const PRIMARY_L = '#818cf8'; // indigo-400
  const SURFACE   = 'rgba(255,255,255,0.07)';
  const CARD_BG   = '#ffffff';
  const BG_MAIN   = '#f1f5f9'; // slate-100

  return (
    <div
      dir={locale.dir}
      lang={locale.lang}
      style={{
        minHeight: '100dvh',
        background: BG_MAIN,
        fontFamily: lang === 'ar'
          ? "'Cairo', 'Noto Sans Arabic', 'Tajawal', system-ui, sans-serif"
          : "'Inter', system-ui, sans-serif",
        direction: locale.dir,
        textAlign: isRTL ? 'right' : 'left',
        overflowX: 'hidden',
      }}
    >
      {/* ── Global Styles ── */}
      <style>{'\n        @import url(\'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Noto+Sans+Arabic:wght@400;600;700&display=swap\');\n        *, *::before, *::after { box-sizing: border-box; }\n        body { margin: 0; padding: 0; }\n\n        :focus-visible { outline: 2px solid ' + PRIMARY + '; outline-offset: 2px; border-radius: 4px; }\n\n        /* Scrollbar hiding */\n        .cat-scroll::-webkit-scrollbar,\n        .feat-scroll::-webkit-scrollbar,\n        .quick-scroll::-webkit-scrollbar { display: none; }\n        .cat-scroll, .feat-scroll, .quick-scroll { -ms-overflow-style: none; scrollbar-width: none; }\n\n        /* Popup slide-in */\n        .slide-in { animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); }\n        @keyframes slideUp { from { transform: translateY(100%); opacity:0; } to { transform: translateY(0); opacity:1; } }\n\n        /* Ad card */\n        .ad-card {\n          background: ' + CARD_BG + ';\n          border-radius: 18px;\n          overflow: hidden;\n          box-shadow: 0 2px 8px rgba(99,102,241,0.06), 0 1px 3px rgba(0,0,0,0.07);\n          text-decoration: none;\n          color: inherit;\n          display: block;\n          transition: transform 0.2s ease, box-shadow 0.2s ease;\n          border: 1.5px solid rgba(99,102,241,0.08);\n        }\n        .ad-card:hover {\n          transform: translateY(-4px) scale(1.01);\n          box-shadow: 0 12px 32px rgba(99,102,241,0.18), 0 2px 8px rgba(0,0,0,0.1);\n          border-color: rgba(99,102,241,0.25);\n        }\n        .ad-card:active { transform: translateY(-1px) scale(1.0); }\n\n        /* Category pill */\n        .cat-btn {\n          padding: 8px 18px;\n          border-radius: 999px;\n          border: none;\n          cursor: pointer;\n          white-space: nowrap;\n          font-size: 13px;\n          font-weight: 600;\n          transition: all 0.18s ease;\n          flex-shrink: 0;\n          letter-spacing: 0.2px;\n        }\n        .cat-btn:active { transform: scale(0.94); }\n\n        /* Featured card */\n        .feat-card {\n          min-width: 165px;\n          background: white;\n          border-radius: 18px;\n          overflow: hidden;\n          text-decoration: none;\n          color: inherit;\n          display: block;\n          flex-shrink: 0;\n          box-shadow: 0 6px 20px rgba(0,0,0,0.15);\n          transition: transform 0.2s ease, box-shadow 0.2s ease;\n          border: 2px solid rgba(255,255,255,0.2);\n        }\n        .feat-card:hover { transform: translateY(-3px) scale(1.02); box-shadow: 0 12px 28px rgba(0,0,0,0.2); }\n        .feat-card:active { transform: translateY(0); }\n\n        /* Quick action */\n        .quick-btn {\n          display: flex;\n          align-items: center;\n          gap: 6px;\n          padding: 8px 16px;\n          border-radius: 999px;\n          text-decoration: none;\n          font-size: 13px;\n          font-weight: 600;\n          white-space: nowrap;\n          flex-shrink: 0;\n          transition: all 0.18s ease;\n        }\n        .quick-btn:hover { transform: translateY(-1px); }\n        .quick-btn:active { transform: scale(0.96); }\n\n        /* Toast */\n        .toast {\n          position: fixed;\n          bottom: 88px;\n          left: 50%;\n          transform: translateX(-50%);\n          z-index: 9999;\n          padding: 11px 22px;\n          border-radius: 999px;\n          font-size: 14px;\n          font-weight: 700;\n          white-space: nowrap;\n          animation: toastIn 0.3s ease forwards;\n          pointer-events: none;\n          max-width: 88vw;\n          text-align: center;\n          backdrop-filter: blur(12px);\n          box-shadow: 0 8px 24px rgba(0,0,0,0.2);\n        }\n        @keyframes toastIn {\n          from { opacity:0; transform: translateX(-50%) translateY(12px) scale(0.95); }\n          to   { opacity:1; transform: translateX(-50%) translateY(0)    scale(1); }\n        }\n\n        /* Skeleton pulse */\n        .loading-pulse { animation: pulse 1.6s ease-in-out infinite; }\n        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }\n\n        /* Hero gradient animation */\n        @keyframes gradShift {\n          0%   { background-position: 0% 50%; }\n          50%  { background-position: 100% 50%; }\n          100% { background-position: 0% 50%; }\n        }\n\n        /* Navbar scroll effect */\n        .navbar-scrolled {\n          background: rgba(15,10,40,0.82) !important;\n          box-shadow: 0 4px 24px rgba(99,102,241,0.18) !important;\n        }\n\n        /* Price badge */\n        .price-badge {\n          background: linear-gradient(135deg, ' + PRIMARY + ', ' + PRIMARY_D + ');\n          color: white;\n          border-radius: 8px;\n          padding: 2px 8px;\n          font-size: 13px;\n          font-weight: 800;\n          display: inline-block;\n        }\n\n        /* Hover glow on FAB */\n        .fab-btn {\n          transition: transform 0.2s, box-shadow 0.2s;\n        }\n        .fab-btn:hover {\n          transform: scale(1.1);\n          box-shadow: 0 8px 24px rgba(99,102,241,0.5) !important;\n        }\n\n        /* Responsive grid */\n        @media (max-width: 480px) {\n          .ads-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; }\n          .hero-title { font-size: 22px !important; }\n          .hero-subtitle { font-size: 13px !important; }\n          .header-brand { font-size: 20px !important; }\n          .header-sell  { padding: 7px 12px !important; font-size: 13px !important; }\n        }\n        @media (min-width: 640px) {\n          .ads-grid { grid-template-columns: repeat(3, 1fr) !important; }\n        }\n        @media (min-width: 1024px) {\n          .ads-grid { grid-template-columns: repeat(4, 1fr) !important; }\n        }\n        @media (min-width: 1280px) {\n          .ads-grid { grid-template-columns: repeat(5, 1fr) !important; }\n        }\n      '}</style>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* ══════════════════════════════════════════
          GLASSMORPHISM STICKY NAVBAR
      ══════════════════════════════════════════ */}
      <header
        role="banner"
        aria-label={lang === 'ar' ? 'رأس الصفحة الرئيسية' : 'Main header'}
        className={scrollY > 10 ? 'navbar-scrolled' : ''}
        style={{
          background: scrollY > 10
            ? 'rgba(15,10,40,0.82)'
            : 'linear-gradient(135deg, #0f0a28 0%, #1e1047 50%, #1a0f3d 100%)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          color: 'white',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'sticky',
          top: 0,
          zIndex: 500,
          boxShadow: scrollY > 10
            ? '0 4px 24px rgba(99,102,241,0.18)'
            : '0 2px 12px rgba(0,0,0,0.3)',
          transition: 'background 0.3s ease, box-shadow 0.3s ease',
          borderBottom: '1px solid rgba(99,102,241,0.15)',
        }}
      >
        {/* Brand */}
        <Link
          href="/"
          className="header-brand"
          aria-label={lang === 'ar' ? 'اكستوكس - الصفحة الرئيسية' : 'XTOX - Home'}
          style={{
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: 1.5,
            textDecoration: 'none',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #a5b4fc, #818cf8, #c4b5fd)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.4))',
          }}
        >
          XTOX
        </Link>


        {/* Sell CTA */}
        <Link
          href="/sell"
          className="header-sell"
          aria-label={lang === 'ar' ? 'أضف إعلانك الآن' : 'Post your ad'}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            padding: '9px 18px',
            borderRadius: 999,
            textDecoration: 'none',
            fontWeight: 800,
            fontSize: 14,
            whiteSpace: 'nowrap',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
            transition: 'all 0.2s',
            letterSpacing: 0.3,
          }}
        >
          {t.sell || (lang === 'ar' ? '＋ أعلن' : '＋ Sell')}
        </Link>

        {/* Saved */}
        <Link
          href="/saved"
          title={savedLabel}
          aria-label={lang === 'ar' ? 'المحفوظات' + (savedCount > 0 ? ' - ' + savedCount + ' إعلان' + ' إعلان' : '') : 'Saved' + (savedCount > 0 ? ' - ' + savedCount : '')}
          style={{
            position: 'relative',
            width: 38,
            height: 38,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(99,102,241,0.18)',
            borderRadius: '50%',
            textDecoration: 'none',
            flexShrink: 0,
            border: '1px solid rgba(99,102,241,0.3)',
            transition: 'background 0.2s',
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
                background: '#f43f5e',
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
                boxShadow: '0 2px 6px rgba(244,63,94,0.5)',
              }}
            >
              {savedCount > 9 ? '9+' : savedCount}
            </span>
          )}
        </Link>

        {/* User / Login */}
        {user ? (
          <a
            href={(user._id || user.id) ? '/profile/' + (user._id || user.id) : '/profile'}
            aria-label={lang === 'ar' ? 'الملف الشخصي - ' + user.name : 'Profile - ' + user.name}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              textDecoration: 'none',
              color: 'white',
              fontSize: 16,
              flexShrink: 0,
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
            }}
          >
            {user.avatar
              ? <img src={user.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt={user.name || ''} />
              : user.name?.[0]?.toUpperCase()}
          </a>
        ) : (
          <Link
            href="/login"
            aria-label={lang === 'ar' ? 'تسجيل الدخول إلى حسابك' : 'Log in to your account'}
            style={{
              background: 'rgba(99,102,241,0.18)',
              color: 'white',
              padding: '8px 14px',
              borderRadius: 999,
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              border: '1px solid rgba(99,102,241,0.3)',
            }}
          >
            {loginLabel}
          </Link>
        )}
      </header>


      {/* ══════════════════════════════════════════
          SHAM EL NESSIM HOLIDAY BANNER
      ══════════════════════════════════════════ */}
      <div
        role="banner"
        aria-label="Sham El Nessim Holiday Banner"
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 25%, #a1c4fd 50%, #d4fc79 75%, #ffecd2 100%)',
          backgroundSize: '300% 300%',
          animation: 'shamBannerShift 6s ease infinite',
          padding: '18px 20px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 24px rgba(168,237,234,0.4), 0 2px 8px rgba(0,0,0,0.08)',
          borderBottom: '3px solid rgba(255,255,255,0.6)',
        }}
      >
        <style>{`
          @keyframes shamBannerShift {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes shamFloat {
            0%, 100% { transform: translateY(0px) rotate(-2deg); }
            50%       { transform: translateY(-6px) rotate(2deg); }
          }
          @keyframes shamSpin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          .sham-emoji {
            display: inline-block;
            animation: shamFloat 2.5s ease-in-out infinite;
            font-size: 26px;
            margin: 0 4px;
          }
          .sham-emoji:nth-child(2) { animation-delay: 0.3s; }
          .sham-emoji:nth-child(3) { animation-delay: 0.6s; }
          .sham-emoji:nth-child(4) { animation-delay: 0.9s; }
          .sham-emoji:nth-child(5) { animation-delay: 1.2s; }
        `}</style>

        {/* Decorative circles */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: -30, left: -30,
          width: 100, height: 100, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          pointerEvents: 'none',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: -20, right: -20,
          width: 80, height: 80, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          pointerEvents: 'none',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', top: '50%', left: '10%',
          transform: 'translateY(-50%)',
          width: 60, height: 60, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          pointerEvents: 'none',
        }} />

        {/* Floating emojis row */}
        <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 2 }}>
          <span className="sham-emoji" aria-hidden="true">🌸</span>
          <span className="sham-emoji" aria-hidden="true">🐟</span>
          <span className="sham-emoji" aria-hidden="true">🥚</span>
          <span className="sham-emoji" aria-hidden="true">🌺</span>
          <span className="sham-emoji" aria-hidden="true">🌿</span>
        </div>

        {/* Main card */}
        <div style={{
          display: 'inline-block',
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 20,
          padding: '14px 28px',
          boxShadow: '0 8px 32px rgba(168,237,234,0.3), 0 2px 8px rgba(0,0,0,0.08)',
          border: '2px solid rgba(255,255,255,0.8)',
          maxWidth: 600,
          width: '100%',
        }}>
          {/* Arabic line */}
          <p style={{
            margin: '0 0 4px',
            fontSize: 20,
            fontWeight: 900,
            color: '#2d6a4f',
            direction: 'rtl',
            textShadow: '0 1px 4px rgba(45,106,79,0.15)',
            lineHeight: 1.5,
            fontFamily: "'Cairo', 'Noto Sans Arabic', 'Tajawal', system-ui, sans-serif",
          }}>
            كل عام وأنتم بخير! 🌸 شم النسيم المبارك
          </p>
          {/* English line */}
          <p style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: '#1d6fa4',
            textShadow: '0 1px 3px rgba(29,111,164,0.12)',
            lineHeight: 1.5,
          }}>
            Happy Sham El Nessim! Enjoy the spring festival 🐟🥚🌺
          </p>
        </div>

        {/* Bottom emoji strip */}
        <div style={{ marginTop: 8, fontSize: 18, letterSpacing: 4, opacity: 0.75 }} aria-hidden="true">
          🌷🐠🥚🌻🌿🌸🐟🌼🥚🌺🌱
        </div>
      </div>

      {/* ══════════════════════════════════════════
          ANIMATED GRADIENT HERO
      ══════════════════════════════════════════ */}
      <section
        aria-label={lang === 'ar' ? 'الصفحة الرئيسية' : 'Homepage hero'}
        style={{
          background: 'linear-gradient(270deg, #0f0a28, #1e1047, #2d1b69, #1a0f3d, #0d1b4b)',
          backgroundSize: '300% 300%',
          animation: 'gradShift 10s ease infinite',
          padding: '36px 16px 32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative orbs */}
        <div aria-hidden="true" style={{
          position: 'absolute', top: -60, left: isRTL ? 'auto' : -60, right: isRTL ? -60 : 'auto',
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div aria-hidden="true" style={{
          position: 'absolute', bottom: -40, right: isRTL ? 'auto' : -40, left: isRTL ? -40 : 'auto',
          width: 160, height: 160, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <h1
          className="hero-title"
          style={{
            color: 'white',
            fontSize: 28,
            fontWeight: 900,
            margin: '0 0 8px',
            letterSpacing: -0.5,
            textShadow: '0 2px 12px rgba(99,102,241,0.4)',
          }}
        >
          {lang === 'ar' ? '🛒 سوق XTOX الذكي' : '🛒 XTOX Smart Market'}
        </h1>
        <p
          className="hero-subtitle"
          style={{
            color: 'rgba(165,180,252,0.85)',
            fontSize: 15,
            margin: '0 0 20px',
            fontWeight: 500,
          }}
        >
          {lang === 'ar' ? 'اعثر على أفضل الإعلانات بالقرب منك' : 'Discover the best local ads near you'}
        </p>

        {/* Quick links in hero */}
        <nav
          aria-label={lang === 'ar' ? 'روابط سريعة' : 'Quick links'}
          className="quick-scroll"
          style={{ display: 'flex', gap: 8, justifyContent: 'center', overflowX: 'auto', paddingBottom: 4 }}
        >
          <Link href="/nearby" className="quick-btn" aria-label={lang === 'ar' ? 'الإعلانات القريبة' : 'Nearby ads'} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
            <span aria-hidden="true">📍</span>{t.nearby || (lang === 'ar' ? 'قريب منك' : 'Nearby')}
          </Link>
          <Link href="/my-ads" className="quick-btn" aria-label={lang === 'ar' ? 'إعلاناتي' : 'My ads'} style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <span aria-hidden="true">📋</span>{t.myAds || (lang === 'ar' ? 'إعلاناتي' : 'My Ads')}
          </Link>
          <Link href="/chat" className="quick-btn" aria-label={lang === 'ar' ? 'المحادثات' : 'Messages'} style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <span aria-hidden="true">💬</span>{t.messages || (lang === 'ar' ? 'رسائل' : 'Messages')}
          </Link>
          <Link href="/search" className="quick-btn" aria-label={lang === 'ar' ? 'البحث المتقدم' : 'Advanced search'} style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.9)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
            <span aria-hidden="true">🔍</span>{t.advancedSearch || (lang === 'ar' ? 'بحث متقدم' : 'Advanced')}
          </Link>
        </nav>
      </section>

      {/* ══════════════════════════════════════════
          CATEGORY FILTER PILLS
      ══════════════════════════════════════════ */}
      <nav
        role="navigation"
        aria-label={lang === 'ar' ? 'تصفية حسب الفئة' : 'Filter by category'}
        style={{
          background: 'white',
          boxShadow: '0 2px 12px rgba(99,102,241,0.07)',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          position: 'sticky',
          top: 58,
          zIndex: 400,
        }}
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
              aria-label={lang === 'ar' ? 'تصفية: ' + CAT_NAMES_AR[key] : 'Filter: ' + key}
              className="cat-btn"
              style={{
                fontWeight: catIdx === i ? 800 : 600,
                background: catIdx === i
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : '#f1f5f9',
                color: catIdx === i ? 'white' : '#64748b',
                boxShadow: catIdx === i ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
                fontFamily: 'inherit',
                border: catIdx === i ? '2px solid transparent' : '2px solid transparent',
                transform: catIdx === i ? 'translateY(-1px)' : 'none',
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
            padding: '8px 20px',
            background: 'rgba(99,102,241,0.04)',
            borderBottom: '1px solid rgba(99,102,241,0.08)',
            fontSize: 13,
            color: '#64748b',
            fontWeight: 500,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {lang === 'ar'
            ? '✨ ' + regular.length + ' إعلان في ' + currentCatNameAr
            : '✨ ' + regular.length + ' ads in ' + CAT_NAMES_AR[currentCatKey]}
        </div>
      )}

      {/* ── Banner Ads Strip ── */}
      <div style={{ padding: '12px 16px 0' }}>
        <BannerAds ads={ads} lang={locale.lang} />
      </div>

      {/* ══════════════════════════════════════════
          FEATURED ADS — HORIZONTAL CAROUSEL
      ══════════════════════════════════════════ */}
      {featured.length > 0 && (
        <section
          aria-label={lang === 'ar' ? 'الإعلانات المميزة' : 'Featured ads'}
          style={{
            background: 'linear-gradient(135deg, #0f0a28 0%, #2d1b69 50%, #1e1047 100%)',
            padding: '20px 16px',
            margin: '12px 0 0',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Decorative glow */}
          <div aria-hidden="true" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.5), transparent)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              color: '#1c1917',
              padding: '4px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              boxShadow: '0 2px 8px rgba(251,191,36,0.4)',
              letterSpacing: 0.3,
            }}>
              <span aria-hidden="true">⭐</span> {t.featured || (lang === 'ar' ? 'مميز' : 'Featured')}
            </span>
            <span style={{ color: 'rgba(165,180,252,0.7)', fontSize: 12, fontWeight: 500 }}>
              {featured.length}/16 {t.perWeek || (lang === 'ar' ? 'أسبوعياً' : 'per week')}
            </span>
          </div>

          <div
            className="feat-scroll"
            role="list"
            style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 4 }}
          >
            {featured.map(ad => (
              <a
                key={ad._id}
                href={'/ads/' + ad._id}
                role="listitem"
                className="feat-card"
                aria-label={lang === 'ar' ? 'إعلان مميز: ' + ad.title + ' - ' + ad.price + ' ' + (ad.currency || locale.currency) : 'Featured: ' + ad.title}
                style={{
                  border: ad.featuredStyle === 'gold'
                    ? '2px solid #fbbf24'
                    : ad.featuredStyle === 'banner'
                    ? '2px solid #6366f1'
                    : ad.featuredStyle === 'cartoon'
                    ? '2px solid #c084fc'
                    : '2px solid rgba(255,255,255,0.15)',
                }}
              >
                {/* Style badge */}
                {ad.featuredStyle && ad.featuredStyle !== 'normal' && (
                  <div style={{
                    position: 'absolute',
                    top: 8,
                    [isRTL ? 'left' : 'right']: 8,
                    background: ad.featuredStyle === 'gold' ? '#fbbf24'
                      : ad.featuredStyle === 'banner' ? '#6366f1'
                      : '#c084fc',
                    color: ad.featuredStyle === 'gold' ? '#1c1917' : 'white',
                    borderRadius: 6,
                    fontSize: 9,
                    fontWeight: 800,
                    padding: '2px 6px',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    {ad.featuredStyle === 'gold' ? '🥇' : ad.featuredStyle === 'banner' ? '🏆' : '🎨'}
                  </div>
                )}
                <div style={{ height: 115, background: '#f1f5f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, position: 'relative' }}>
                  {(ad.media?.[0] || ad.images?.[0])
                    ? <img src={ad.media?.[0] || ad.images?.[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={ad.title || ''} loading="lazy" />
                    : <span aria-hidden="true">📦</span>}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontWeight: 700, fontSize: 12, margin: '0 0 4px', lineHeight: 1.4, color: '#1e293b' }}>{ad.title?.slice(0, 30)}</p>
                  <span className="price-badge">{ad.price} {ad.currency || locale.currency}</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════
          MAIN ADS GRID
      ══════════════════════════════════════════ */}
      <main
        role="main"
        aria-label={lang === 'ar' ? 'قائمة الإعلانات' : 'Ads listing'}
        style={{ padding: '20px 16px 100px' }}
      >
        {/* Section label */}
        {!loading && !error && regular.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e293b' }}>
              {lang === 'ar' ? '📋 أحدث الإعلانات' : '📋 Latest Ads'}
            </h2>
            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(99,102,241,0.3), transparent)' }} />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div
            aria-live="polite"
            aria-busy="true"
            aria-label={lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          >
            <p
              className="loading-pulse"
              style={{ textAlign: 'center', color: PRIMARY, fontWeight: 700, fontSize: 15, margin: '0 0 20px' }}
            >
              <span aria-hidden="true">⏳</span>{' '}
              {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
            </p>
            <div className="ads-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {Array.from({ length: 8 }).map((_, i) => <AdCardSkeleton key={i} />)}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              textAlign: 'center',
              padding: '56px 24px',
              background: 'white',
              borderRadius: 24,
              boxShadow: '0 4px 20px rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.1)',
            }}
          >
            <div style={{ fontSize: 60, marginBottom: 16 }} aria-hidden="true">⚠️</div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#334155', margin: '0 0 8px' }}>{error}</p>
            <button
              onClick={handleRetry}
              aria-label={lang === 'ar' ? 'إعادة المحاولة لتحميل الإعلانات' : 'Retry loading ads'}
              style={{
                marginTop: 18,
                padding: '11px 30px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                border: 'none',
                borderRadius: 999,
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                letterSpacing: 0.3,
              }}
            >
              {lang === 'ar' ? '↩ إعادة المحاولة' : '↩ Retry'}
            </button>
          </div>
        )}

        {/* Ads Grid */}
        {!loading && !error && (
          <div
            role="list"
            className="ads-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}
          >
            {regular.map(ad => (
              <a
                key={ad._id}
                href={'/ads/' + ad._id}
                role="listitem"
                className="ad-card"
                aria-label={
                  lang === 'ar'
                    ? ad.title + ' - ' + ad.price + ' ' + (ad.currency || locale.currency) + ' - ' + (ad.city || '')
                    : ad.title + ' - ' + ad.price + ' ' + (ad.currency || locale.currency)
                }
              >
                {/* Image / Video */}
                <div style={{
                  height: 145,
                  background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 40,
                  position: 'relative',
                }}>
                  {ad.video
                    ? <video src={ad.video} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop playsInline aria-hidden="true" />
                    : (ad.media?.[0] || ad.images?.[0])
                      ? <img src={ad.media?.[0] || ad.images?.[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" loading="lazy" />
                      : <span aria-hidden="true">📦</span>}
                  {/* Second-subcategory badge on image — sort/group by subsub */}
                  {(ad.subsub || ad.category) && (
                    <span style={{
                      position: 'absolute',
                      top: 8,
                      [isRTL ? 'right' : 'left']: 8,
                      background: 'rgba(15,10,40,0.7)',
                      color: 'rgba(165,180,252,0.95)',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      backdropFilter: 'blur(6px)',
                    }}>
                      {(ad.subsub && ad.subsub !== 'Other') ? ad.subsub : ad.category}
                    </span>
                  )}
                </div>

                {/* Card Body */}
                <div style={{ padding: '10px 12px 12px' }}>
                  <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 6px', lineHeight: 1.4, color: '#1e293b' }}>
                    {ad.title?.slice(0, 34)}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                    <span className="price-badge">
                      {ad.price ? ad.price.toLocaleString() + ' ' + (ad.currency || locale.currency) : (lang === 'ar' ? 'تواصل' : 'Contact')}
                    </span>
                    {ad.city && (
                      <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 500 }}>
                        📍 {ad.city}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ color: '#cbd5e1', fontSize: 11 }}>
                      👁 {ad.views || 0}
                    </span>
                    {ad.expiresAt && (
                      <span style={{ color: '#f87171', fontSize: 11 }}>
                        ⏰ {new Date(ad.expiresAt).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US')}
                      </span>
                    )}
                  </div>
                </div>
              </a>
            ))}

            {/* Empty State */}
            {regular.length === 0 && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  gridColumn: '1/-1',
                  textAlign: 'center',
                  padding: '64px 24px',
                  background: 'white',
                  borderRadius: 24,
                  boxShadow: '0 4px 20px rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.1)',
                }}
              >
                <div style={{ fontSize: 64, marginBottom: 16 }} aria-hidden="true">
                  {EMPTY_STATE_ICONS[currentCatKey] || '🏪'}
                </div>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>
                  {lang === 'ar'
                    ? 'لا توجد إعلانات في ' + currentCatNameAr + ' حتى الآن'
                    : 'No ads in ' + currentCatNameAr + ' yet'}
                </p>
                <p style={{ fontSize: 13, margin: '0 0 24px', color: '#94a3b8' }}>
                  {lang === 'ar' ? 'كن أول من يضيف إعلاناً!' : 'Be the first to post!'}
                </p>
                <Link
                  href="/sell"
                  aria-label={lang === 'ar' ? 'أضف إعلانك الآن' : 'Post your first ad'}
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white',
                    padding: '12px 32px',
                    borderRadius: 999,
                    textDecoration: 'none',
                    fontWeight: 800,
                    fontSize: 15,
                    boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
                  }}
                >
                  {lang === 'ar' ? '＋ أضف إعلاناً' : '＋ Post Ad'}
                </Link>
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
          padding: '28px 16px',
          color: '#94a3b8',
          fontSize: 13,
          borderTop: '1px solid rgba(99,102,241,0.1)',
          background: 'white',
        }}
      >
        <nav aria-label={lang === 'ar' ? 'روابط الموقع' : 'Site links'} style={{ marginBottom: 8 }}>
          {[
            ['/about', t.about || (lang === 'ar' ? 'من نحن' : 'About')],
            ['/privacy', t.privacy || (lang === 'ar' ? 'الخصوصية' : 'Privacy')],
            ['/terms', t.terms || (lang === 'ar' ? 'الشروط' : 'Terms')],
          ].map(([href, label]) => (
            <a key={href} href={href} style={{ color: PRIMARY, margin: '0 10px', fontWeight: 600, textDecoration: 'none' }}>{label}</a>
          ))}
        </nav>
        <span>XTOX © 2026 · {lang === 'ar' ? 'السوق المحلي الذكي' : 'The Smart Local Market'}</span>
      </footer>

      {/* ── Scroll-to-top FAB ── */}
      {scrollY > 300 && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label={lang === 'ar' ? 'العودة إلى الأعلى' : 'Back to top'}
          className="fab-btn"
          style={{
            position: 'fixed',
            bottom: 80,
            [isRTL ? 'left' : 'right']: 16,
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(99,102,241,0.45)',
            zIndex: 300,
          }}
        >
          ↑
        </button>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="toast"
          style={{
            background: toast.type === 'error'
              ? 'rgba(239,68,68,0.9)'
              : 'rgba(99,102,241,0.92)',
            color: 'white',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Featured Ad Popup (Bottom Sheet) ── */}
      {popup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'ar' ? 'إعلان مميز' : 'Featured ad'}
          onClick={() => setPopup(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,10,40,0.65)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 16,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="slide-in"
            style={{
              background: 'white',
              borderRadius: '28px 28px 0 0',
              padding: 28,
              maxWidth: 420,
              width: '100%',
              boxShadow: '0 -8px 40px rgba(99,102,241,0.2)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 68, display: 'inline-block', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }} aria-hidden="true">{popup.cartoon}</div>
              <p style={{ color: '#1e293b', fontWeight: 800, margin: '10px 0 0', fontSize: 17 }}>
                {lang === 'ar' ? '🎉 إعلان مميز خصيصاً لك!' : '🎉 Featured Ad for You!'}
              </p>
            </div>
            {popup.ad && (
              <a
                href={'/ads/' + popup.ad._id}
                onClick={() => setPopup(null)}
                aria-label={lang === 'ar' ? 'الإعلان المميز: ' + popup.ad.title : 'Featured ad: ' + popup.ad.title}
                style={{
                  display: 'block',
                  background: '#f8faff',
                  borderRadius: 18,
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'inherit',
                  border: '2px solid rgba(99,102,241,0.2)',
                  marginBottom: 18,
                  boxShadow: '0 4px 14px rgba(99,102,241,0.1)',
                }}
              >
                {(popup.ad.media?.[0] || popup.ad.images?.[0]) && (
                  <img src={popup.ad.media?.[0] || popup.ad.images?.[0]} style={{ width: '100%', height: 148, objectFit: 'cover' }} alt={popup.ad.title || ''} loading="lazy" />
                )}
                <div style={{ padding: '12px 16px', textAlign: isRTL ? 'right' : 'left' }}>
                  <p style={{ fontWeight: 700, margin: '0 0 6px', color: '#1e293b' }}>{popup.ad.title}</p>
                  <span className="price-badge" style={{ fontSize: 15 }}>{popup.ad.price} {popup.ad.currency}</span>
                </div>
              </a>
            )}
            <div style={{ display: 'flex', gap: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
              <button
                onClick={() => setPopup(null)}
                aria-label={lang === 'ar' ? 'متابعة التصفح' : 'Continue browsing'}
                style={{
                  flex: 1,
                  padding: '13px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
                }}
              >
                {lang === 'ar' ? 'متابعة التصفح' : 'Continue'}
              </button>
              <button
                onClick={() => setPopupMuted(m => !m)}
                aria-label={popupMuted
                  ? (lang === 'ar' ? 'تشغيل الإشعارات' : 'Unmute')
                  : (lang === 'ar' ? 'كتم الإشعارات' : 'Mute')}
                aria-pressed={popupMuted}
                style={{
                  padding: '13px 18px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 14,
                  cursor: 'pointer',
                  fontSize: 20,
                }}
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
