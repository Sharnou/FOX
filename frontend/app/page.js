'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const CATEGORIES = ['الكل', 'سيارات', 'إلكترونيات', 'عقارات', 'وظائف', 'خدمات', 'سوبرماركت', 'صيدلية', 'طعام', 'موضة'];
const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function Home() {
  const [ads, setAds] = useState([]);
  const [cat, setCat] = useState('الكل');
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('EG');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCountry(localStorage.getItem('country') || 'EG');
    }
  }, []);

  useEffect(() => {
    fetchAds();
  }, [cat, country]);

  async function fetchAds() {
    try {
      const catMap = { 'سيارات': 'Vehicles', 'إلكترونيات': 'Electronics', 'عقارات': 'Real Estate', 'وظائف': 'Jobs', 'خدمات': 'Services', 'سوبرماركت': 'Supermarket', 'صيدلية': 'Pharmacy', 'طعام': 'Fast Food', 'موضة': 'Fashion' };
      const params = { country };
      if (cat !== 'الكل') params.category = catMap[cat] || cat;
      const res = await axios.get(`${API}/api/ads`, { params });
      setAds(res.data || []);
    } catch {
      setAds([]);
    }
  }

  const featured = ads.filter(a => a.isFeatured);
  const regular = ads.filter(a => !a.isFeatured);

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#002f34', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <span style={{ fontSize: 22, fontWeight: 'bold' }}>XTOX</span>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="ابحث عن أي شيء..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', fontSize: 14 }} />
        <a href="/sell" style={{ background: '#00b09b', color: 'white', padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontWeight: 'bold', fontSize: 14, whiteSpace: 'nowrap' }}>+ بيع</a>
        <a href="/admin" style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Admin</a>
      </header>

      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', overflowX: 'auto', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 13, fontWeight: cat === c ? 'bold' : 'normal', background: cat === c ? '#002f34' : '#f0f0f0', color: cat === c ? 'white' : '#333' }}>
            {c}
          </button>
        ))}
      </div>

      {featured.length > 0 && (
        <div style={{ padding: '16px' }}>
          <h2 style={{ color: '#002f34', fontWeight: 'bold', marginBottom: 12 }}>⭐ إعلانات مميزة</h2>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {featured.map(ad => (
              <a key={ad._id} href={`/ads/${ad._id}`} style={{ minWidth: 180, background: 'white', borderRadius: 12, overflow: 'hidden', border: ad.featuredStyle === 'cartoon' ? '3px solid #ffd700' : '2px solid #002f34', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ height: 120, background: '#e8f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                  {ad.media?.[0] ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📦'}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 13, margin: 0 }}>{ad.title}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', margin: '4px 0 0', fontSize: 14 }}>{ad.price} {ad.currency}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, padding: '16px' }}>
        {regular.filter(ad => !search || ad.title?.toLowerCase().includes(search.toLowerCase())).map(ad => (
          <a key={ad._id} href={`/ads/${ad._id}`} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div style={{ height: 140, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, overflow: 'hidden' }}>
              {ad.video ? (
                <video src={ad.video} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay muted loop playsInline />
              ) : ad.media?.[0] ? (
                <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              ) : '📦'}
            </div>
            <div style={{ padding: '10px 12px' }}>
              <p style={{ fontWeight: 'bold', fontSize: 13, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{ad.title}</p>
              <p style={{ color: '#002f34', fontWeight: 'bold', margin: '4px 0 0', fontSize: 14 }}>{ad.price} {ad.currency}</p>
              <p style={{ color: '#999', fontSize: 11, margin: '4px 0 0' }}>👁 {ad.views} · {ad.city}</p>
              <p style={{ color: '#e53', fontSize: 11, margin: '2px 0 0' }}>⏰ {ad.expiresAt ? new Date(ad.expiresAt).toLocaleDateString('ar-EG') : ''}</p>
            </div>
          </a>
        ))}
        {regular.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#999' }}>
            <div style={{ fontSize: 48 }}>🏪</div>
            <p style={{ marginTop: 12 }}>لا توجد إعلانات بعد</p>
            <a href="/sell" style={{ color: '#002f34', fontWeight: 'bold' }}>كن أول من ينشر!</a>
          </div>
        )}
      </div>

      <footer style={{ textAlign: 'center', padding: '24px 16px', color: '#999', fontSize: 13, borderTop: '1px solid #eee', marginTop: 20 }}>
        <a href={`${API}/rss/EG`} style={{ color: '#002f34', marginRight: 16 }}>RSS Feed</a>
        <a href="/admin" style={{ color: '#002f34', marginRight: 16 }}>Admin</a>
        <span>XTOX Marketplace © 2026</span>
      </footer>
    </div>
  );
}
