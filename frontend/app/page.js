'use client';
import { useState, useEffect } from 'react';
import { detectAndSetLocale, getT, COUNTRY_CONFIG } from './lib/locale';
import AdCardSkeleton from './components/AdCardSkeleton';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://fox-production.up.railway.app';
const CAT_KEYS = ['all', 'vehicles', 'electronics', 'realEstate', 'jobs', 'services', 'supermarket', 'pharmacy', 'food', 'fashion'];
const CAT_VALS = ['', 'Vehicles', 'Electronics', 'Real Estate', 'Jobs', 'Services', 'Supermarket', 'Pharmacy', 'Fast Food', 'Fashion'];
const CAT_ICONS = ['🌐', '🚗', '📱', '🏠', '💼', '🔧', '🛒', '💊', '🍕', '👗'];

const POPUP_INTERVAL = 4 * 60 * 60 * 1000;
const CARTOONS = ['🦊', '🐨', '🦁', '🐸', '🦝', '🐙', '🦄', '🐼'];

export default function Home() {
  const [ads, setAds] = useState([]);
  const [catIdx, setCatIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState({ lang: 'ar', dir: 'rtl', country: 'EG', currency: 'EGP' });
  const [t, setT] = useState(getT('ar'));
  const [user, setUser] = useState(null);
  const [popup, setPopup] = useState(null);
  const [popupMuted, setPopupMuted] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    async function init() {
      const loc = await detectAndSetLocale();
      setLocale(loc);
      setT(getT(loc.lang));
      document.documentElement.lang = loc.lang;
      document.documentElement.dir = loc.dir;
      document.body.style.direction = loc.dir;
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
  }, []);

  async function fetchAds(category, country) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ country: country || locale.country });
      if (category) params.append('category', category);
      const res = await fetch(`${API}/api/ads?${params}`);
      if (res.ok) setAds(await res.json());
      else setAds([]);
    } catch { setAds([]); }
    setLoading(false);
  }

  function selectCat(idx) {
    setCatIdx(idx);
    fetchAds(CAT_VALS[idx], locale.country);
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

  const isRTL = locale.dir === 'rtl';
  const featured = ads.filter(a => a.isFeatured);
  const regular = ads.filter(a => !a.isFeatured).filter(ad => !search || ad.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: locale.lang === 'ar' ? "'Cairo', 'Tajawal', system-ui" : "'Inter', system-ui, sans-serif", direction: locale.dir }}>
      {/* Header */}
      <header style={{ background: 'linear-gradient(135deg, #002f34, #003d3b)', color: 'white', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        <span style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: 1 }}>XTOX</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && search && (window.location.href = `/search?q=${search}`)}
          placeholder={t.search}
          style={{ flex: 1, padding: '8px 14px', borderRadius: 20, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.15)', color: 'white', outline: 'none', textAlign: isRTL ? 'right' : 'left' }} />
        <a href="/sell" style={{ background: '#00b09b', color: 'white', padding: '8px 16px', borderRadius: 20, textDecoration: 'none', fontWeight: 'bold', fontSize: 14, whiteSpace: 'nowrap' }}>{t.sell}</a>
        <a href="/saved" title={locale.lang === 'ar' ? 'المحفوظات' : locale.lang === 'de' ? 'Gespeichert' : locale.lang === 'fr' ? 'Favoris' : 'Saved'} style={{ position: 'relative', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: '50%', textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontSize: 18 }}>🔖</span>
          {savedCount > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, background: '#ff4d4d', color: 'white', borderRadius: '50%', fontSize: 10, fontWeight: 'bold', minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px', lineHeight: 1 }}>
              {savedCount > 9 ? '9+' : savedCount}
            </span>
          )}
        </a>
        {user ? (
          <a href={`/profile/${user.id}`} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', textDecoration: 'none', color: 'white', fontSize: 16, flexShrink: 0 }}>
            {user.avatar ? <img src={user.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" /> : user.name?.[0]?.toUpperCase()}
          </a>
        ) : (
          <a href="/login" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '8px 14px', borderRadius: 20, textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap' }}>{locale.lang === 'ar' ? 'دخول' : locale.lang === 'de' ? 'Einloggen' : locale.lang === 'fr' ? 'Connexion' : 'Login'}</a>
        )}
      </header>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 16px', background: 'white', borderBottom: '1px solid #eee', overflowX: 'auto' }}>
        <a href="/nearby" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#002f34', color: 'white', borderRadius: 20, textDecoration: 'none', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>
          📍 {t.nearby}
        </a>
        <a href="/my-ads" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#f0f0f0', color: '#333', borderRadius: 20, textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
          📋 {t.myAds}
        </a>
        <a href="/chat" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#f0f0f0', color: '#333', borderRadius: 20, textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
          💬 {t.messages}
        </a>
        <a href="/search" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#f0f0f0', color: '#333', borderRadius: 20, textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0 }}>
          🔍 {t.advancedSearch}
        </a>
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', overflowX: 'auto' }}>
        {CAT_KEYS.map((key, i) => (
          <button key={key} onClick={() => selectCat(i)}
            style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: catIdx === i ? 'bold' : 'normal', background: catIdx === i ? '#002f34' : '#f0f0f0', color: catIdx === i ? 'white' : '#444', fontFamily: 'inherit' }}>
            {CAT_ICONS[i]} {t[key]}
          </button>
        ))}
      </div>

      {/* Featured */}
      {featured.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #002f34 0%, #00695c 100%)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ background: '#ffd700', color: '#002f34', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' }}>⭐ {t.featured}</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{featured.length}/16 {t.perWeek}</span>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {featured.map(ad => (
              <a key={ad._id} href={`/ads/${ad._id}`} style={{ minWidth: 160, background: 'white', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit', display: 'block', flexShrink: 0, border: ad.featuredStyle === 'cartoon' ? '3px solid #ffd700' : 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                <div style={{ height: 110, background: '#f0f0f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                  {ad.media?.[0] ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📦'}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 12, margin: 0 }}>{ad.title?.slice(0, 28)}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 13, margin: '3px 0 0' }}>{ad.price} {ad.currency || locale.currency}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Regular Ads */}
      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {Array.from({ length: 8 }).map((_, i) => <AdCardSkeleton key={i} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {regular.map(ad => (
              <a key={ad._id} href={`/ads/${ad._id}`} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ height: 140, background: '#f0f0f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                  {ad.video ? <video src={ad.video} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop playsInline /> :
                   ad.media?.[0] ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📦'}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 13, margin: 0 }}>{ad.title?.slice(0, 32)}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 14, margin: '4px 0' }}>{ad.price} {ad.currency || locale.currency}</p>
                  <p style={{ color: '#999', fontSize: 11, margin: '2px 0 0' }}>👁 {ad.views} · {ad.city}</p>
                  <p style={{ color: '#e44', fontSize: 11, margin: '2px 0 0' }}>⏰ {ad.expiresAt ? new Date(ad.expiresAt).toLocaleDateString(locale.lang === 'ar' ? 'ar-EG' : locale.lang === 'de' ? 'de-DE' : locale.lang === 'fr' ? 'fr-FR' : 'en-US') : ''}</p>
                </div>
              </a>
            ))}
            {regular.length === 0 && !loading && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#999' }}>
                <div style={{ fontSize: 48 }}>🏪</div>
                <p style={{ marginTop: 12 }}>{t.noAds}</p>
                <a href="/sell" style={{ color: '#002f34', fontWeight: 'bold' }}>{t.beFirst}</a>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px 16px', color: '#999', fontSize: 13, borderTop: '1px solid #eee', marginTop: 20 }}>
        <a href="/about" style={{ color: '#002f34', margin: '0 8px' }}>{t.about}</a>
        <a href="/privacy" style={{ color: '#002f34', margin: '0 8px' }}>{t.privacy}</a>
        <a href="/terms" style={{ color: '#002f34', margin: '0 8px' }}>{t.terms}</a>
        <br /><span style={{ marginTop: 8, display: 'block' }}>XTOX © 2026</span>
      </footer>

      {/* Popup Cartoon */}
      {popup && (
        <div onClick={() => setPopup(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} className="slide-in" style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: 24, maxWidth: 380, width: '100%' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 64, display: 'inline-block' }}>{popup.cartoon}</div>
              <p style={{ color: '#002f34', fontWeight: 'bold', margin: '8px 0 0', fontSize: 16 }}>
                {locale.lang === 'ar' ? 'إعلان مميز لك! 🎉' : locale.lang === 'de' ? 'Empfohlene Anzeige! 🎉' : 'Featured Ad for you! 🎉'}
              </p>
            </div>
            {popup.ad && (
              <a href={`/ads/${popup.ad._id}`} onClick={() => setPopup(null)} style={{ display: 'block', background: '#f8f8f8', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit', border: '2px solid #002f34', marginBottom: 16 }}>
                {popup.ad.media?.[0] && <img src={popup.ad.media[0]} style={{ width: '100%', height: 140, objectFit: 'cover' }} alt="" />}
                <div style={{ padding: '10px 14px' }}>
                  <p style={{ fontWeight: 'bold', margin: 0 }}>{popup.ad.title}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', margin: '4px 0 0', fontSize: 18 }}>{popup.ad.price} {popup.ad.currency}</p>
                </div>
              </a>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPopup(null)} style={{ flex: 1, padding: '12px', background: '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14 }}>
                {locale.lang === 'ar' ? 'متابعة التصفح' : locale.lang === 'de' ? 'Weiter browsen' : 'Continue'}
              </button>
              <button onClick={() => setPopupMuted(m => !m)} style={{ padding: '12px 16px', background: '#f0f0f0', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 18 }}>
                {popupMuted ? '🔇' : '🔔'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
      `}</style>
    </div>
  );
}
