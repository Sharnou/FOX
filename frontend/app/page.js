'use client';
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const CATEGORIES = ['الكل', 'سيارات', 'إلكترونيات', 'عقارات', 'وظائف', 'خدمات', 'سوبرماركت', 'صيدلية', 'طعام', 'موضة'];
const CAT_MAP = { 'سيارات': 'Vehicles', 'إلكترونيات': 'Electronics', 'عقارات': 'Real Estate', 'وظائف': 'Jobs', 'خدمات': 'Services', 'سوبرماركت': 'Supermarket', 'صيدلية': 'Pharmacy', 'طعام': 'Fast Food', 'موضة': 'Fashion' };
const API = process.env.NEXT_PUBLIC_API_URL || '';
const POPUP_INTERVAL = 4 * 60 * 60 * 1000;
const CARTOONS = ['🦊', '🐨', '🦁', '🐸', '🦝', '🐙', '🦄', '🐼'];

export default function Home() {
  const [ads, setAds] = useState([]);
  const [cat, setCat] = useState('الكل');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('EG');
  const [user, setUser] = useState(null);
  const [popup, setPopup] = useState(null);
  const [popupMuted, setPopupMuted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedCountry = localStorage.getItem('country') || 'EG';
    setCountry(storedCountry);
    const storedUser = localStorage.getItem('user');
    if (storedUser) try { setUser(JSON.parse(storedUser)); } catch {}
    checkPopup();
  }, []);

  useEffect(() => { fetchAds(); }, [cat, country]);

  async function fetchAds() {
    setLoading(true);
    try {
      const params = { country };
      if (cat !== 'الكل') params.category = CAT_MAP[cat] || cat;
      const res = await axios.get(`${API}/api/ads`, { params });
      setAds(res.data || []);
    } catch { setAds([]); }
    setLoading(false);
  }

  function checkPopup() {
    const last = localStorage.getItem('lastPopup');
    if (!last || Date.now() - Number(last) > POPUP_INTERVAL) {
      setTimeout(() => showPopup(), 3000);
    }
  }

  async function showPopup() {
    try {
      const c = localStorage.getItem('country') || 'EG';
      const res = await axios.get(`${API}/api/ads`, { params: { country: c } });
      const featured = (res.data || []).filter(a => a.isFeatured);
      if (!featured.length) return;
      const randomAd = featured[Math.floor(Math.random() * featured.length)];
      const cartoon = CARTOONS[Math.floor(Math.random() * CARTOONS.length)];
      setPopup({ ad: randomAd, cartoon });
      localStorage.setItem('lastPopup', Date.now().toString());
    } catch {}
  }

  const featuredAds = ads.filter(a => a.isFeatured);
  const regularAds = ads.filter(a => !a.isFeatured).filter(ad =>
    !search || ad.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header — NO admin link */}
      <header style={{ background: '#002f34', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        <span style={{ fontSize: 22, fontWeight: 'bold', letterSpacing: 1 }}>XTOX</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث عن أي شيء..."
          style={{ flex: 1, padding: '8px 14px', borderRadius: 20, border: 'none', fontSize: 14, background: 'rgba(255,255,255,0.15)', color: 'white', outline: 'none' }} />
        <a href="/sell" style={{ background: '#00b09b', color: 'white', padding: '8px 16px', borderRadius: 20, textDecoration: 'none', fontWeight: 'bold', fontSize: 14, whiteSpace: 'nowrap' }}>+ بيع</a>
        {user ? (
          <a href={`/profile/${user.id}`} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', textDecoration: 'none', color: 'white', fontSize: 16, flexShrink: 0 }}>
            {user.avatar ? <img src={user.avatar} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} alt="" /> : user.name?.[0]?.toUpperCase()}
          </a>
        ) : (
          <a href="/login" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '8px 14px', borderRadius: 20, textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap' }}>دخول</a>
        )}
      </header>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: cat === c ? 'bold' : 'normal', background: cat === c ? '#002f34' : '#f0f0f0', color: cat === c ? 'white' : '#444', fontFamily: 'inherit' }}>
            {c}
          </button>
        ))}
      </div>

      {/* FEATURED — max 16, newest first */}
      {featuredAds.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #002f34 0%, #004d40 100%)', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ background: '#ffd700', color: '#002f34', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 'bold' }}>⭐ مميز</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{featuredAds.length}/16 هذا الأسبوع</span>
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {featuredAds.map(ad => (
              <a key={ad._id} href={`/ads/${ad._id}`}
                style={{ minWidth: 160, background: 'white', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit', display: 'block', flexShrink: 0, border: ad.featuredStyle === 'cartoon' ? '3px solid #ffd700' : 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                <div style={{ height: 110, background: '#f0f0f0', overflow: 'hidden', position: 'relative' }}>
                  {ad.media?.[0] ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>📦</div>}
                  {ad.featuredStyle === 'cartoon' && <span style={{ position: 'absolute', top: 4, right: 4, background: '#ffd700', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌟</span>}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 12, margin: 0 }}>{ad.title?.slice(0, 28)}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 13, margin: '3px 0 0' }}>{ad.price} {ad.currency}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* REGULAR ADS */}
      <div style={{ padding: '16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>جار التحميل...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {regularAds.map(ad => (
              <a key={ad._id} href={`/ads/${ad._id}`}
                style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ height: 140, background: '#f0f0f0', overflow: 'hidden' }}>
                  {ad.video ? <video src={ad.video} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop playsInline />
                    : ad.media?.[0] ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>📦</div>}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 13, margin: 0 }}>{ad.title?.slice(0, 32)}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 14, margin: '4px 0 0' }}>{ad.price} {ad.currency}</p>
                  <p style={{ color: '#999', fontSize: 11, margin: '4px 0 0' }}>👁 {ad.views} · {ad.city}</p>
                  <p style={{ color: '#e44', fontSize: 11, margin: '2px 0 0' }}>⏰ {ad.expiresAt ? new Date(ad.expiresAt).toLocaleDateString('ar-EG') : ''}</p>
                </div>
              </a>
            ))}
            {regularAds.length === 0 && !loading && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#999' }}>
                <div style={{ fontSize: 48 }}>🏪</div>
                <p style={{ marginTop: 12 }}>لا توجد إعلانات بعد</p>
                <a href="/sell" style={{ color: '#002f34', fontWeight: 'bold' }}>كن أول من ينشر!</a>
              </div>
            )}
          </div>
        )}
      </div>

      <footer style={{ textAlign: 'center', padding: '24px 16px', color: '#999', fontSize: 13, borderTop: '1px solid #eee', marginTop: 20 }}>
        <span>XTOX © 2026</span>
      </footer>

      {/* POPUP — every 4h, cartoon + featured ad */}
      {popup && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 24, maxWidth: 380, width: '100%', position: 'relative' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 72, display: 'inline-block' }}>{popup.cartoon}</div>
              <p style={{ color: '#002f34', fontWeight: 'bold', margin: '8px 0 0', fontSize: 16 }}>إعلان مميز لك! 🎉</p>
            </div>
            {popup.ad && (
              <a href={`/ads/${popup.ad._id}`} onClick={() => setPopup(null)}
                style={{ display: 'block', background: '#f8f8f8', borderRadius: 14, overflow: 'hidden', textDecoration: 'none', color: 'inherit', border: '2px solid #002f34', marginBottom: 16 }}>
                {popup.ad.media?.[0] && <img src={popup.ad.media[0]} style={{ width: '100%', height: 140, objectFit: 'cover' }} alt="" />}
                <div style={{ padding: '10px 14px' }}>
                  <p style={{ fontWeight: 'bold', margin: 0 }}>{popup.ad.title}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', margin: '4px 0 0', fontSize: 18 }}>{popup.ad.price} {popup.ad.currency}</p>
                </div>
              </a>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setPopup(null)}
                style={{ flex: 1, padding: '12px', background: '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                متابعة التصفح
              </button>
              <button onClick={() => setPopupMuted(m => !m)}
                style={{ padding: '12px 16px', background: '#f0f0f0', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 18 }}>
                {popupMuted ? '🔇' : '🔔'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
