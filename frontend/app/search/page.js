'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import AdCardSkeleton from '../components/AdCardSkeleton';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://fox-production.up.railway.app';
const CATEGORIES = ['الكل', 'سيارات', 'إلكترونيات', 'عقارات', 'وظائف', 'خدمات', 'سوبرماركت', 'صيدلية', 'طعام', 'موضة'];
const CAT_MAP = { 'سيارات': 'Vehicles', 'إلكترونيات': 'Electronics', 'عقارات': 'Real Estate', 'وظائف': 'Jobs', 'خدمات': 'Services', 'سوبرماركت': 'Supermarket', 'صيدلية': 'Pharmacy', 'طعام': 'Fast Food', 'موضة': 'Fashion' };

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState('الكل');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [city, setCity] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [searched, setSearched] = useState(false);
  const country = typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      if (q) { setQuery(q); doSearch(q); }
    }
  }, []);

  async function doSearch(q = query) {
    if (!q.trim() && category === 'الكل') return;
    setLoading(true); setSearched(true);
    try {
      const params = { country };
      if (category !== 'الكل') params.category = CAT_MAP[category] || category;
      if (city) params.city = city;
      const res = await axios.get(`${API}/api/ads`, { params });
      const filtered = (res.data || []).filter(ad =>
        !q.trim() ||
        ad.title?.toLowerCase().includes(q.toLowerCase()) ||
        ad.description?.toLowerCase().includes(q.toLowerCase()) ||
        ad.city?.toLowerCase().includes(q.toLowerCase())
      );
      setResults(filtered);
    } catch { setResults([]); }
    setLoading(false);
  }

  const sorted = [...results].sort((a, b) => {
    if (sortBy === 'price_low') return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price_high') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'views') return (b.views || 0) - (a.views || 0);
    return new Date(b.createdAt) - new Date(a.createdAt);
  }).filter(ad => {
    if (minPrice && ad.price < Number(minPrice)) return false;
    if (maxPrice && ad.price > Number(maxPrice)) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h1 style={{ color: '#002f34', margin: 0, fontSize: 22, fontWeight: 'bold' }}>🔍 البحث</h1>
      </div>

      <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="ابحث عن أي شيء..."
            style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '2px solid #002f34', fontSize: 16, fontFamily: 'inherit' }} autoFocus />
          <button onClick={() => doSearch()}
            style={{ padding: '12px 24px', background: '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>
            بحث
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          <select value={category} onChange={e => setCategory(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: 'white' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={city} onChange={e => setCity(e.target.value)} placeholder="المدينة"
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, fontFamily: 'inherit' }} />
          <input value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="أدنى سعر" type="number"
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13 }} />
          <input value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="أعلى سعر" type="number"
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13 }} />
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 13, background: 'white' }}>
            <option value="newest">الأحدث</option>
            <option value="price_low">السعر: الأقل</option>
            <option value="price_high">السعر: الأعلى</option>
            <option value="views">الأكثر مشاهدة</option>
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
          {[...Array(6)].map((_, i) => <AdCardSkeleton key={i} />)}
        </div>
      )}
      {!loading && searched && (
        <div>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
            {sorted.length > 0 ? `وجدنا ${sorted.length} نتيجة` : 'لا توجد نتائج — جرب كلمات أخرى'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {sorted.map(ad => (
              <a key={ad._id} href={`/ads/${ad._id}`} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ height: 130, background: '#f0f0f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                  {ad.media?.[0] ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📦'}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 13, margin: 0 }}>{ad.title?.slice(0, 30)}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 14, margin: '4px 0' }}>{ad.price} {ad.currency}</p>
                  <p style={{ color: '#999', fontSize: 11, margin: 0 }}>👁 {ad.views} · {ad.city}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
      {!searched && (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
          <div style={{ fontSize: 60 }}>🔍</div>
          <p style={{ marginTop: 12 }}>ابحث عن أي شيء في XTOX</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 16 }}>
            {['عربية', 'آيفون', 'شقة', 'لابتوب', 'سباك'].map(s => (
              <button key={s} onClick={() => { setQuery(s); doSearch(s); }}
                style={{ padding: '8px 16px', background: '#f0f0f0', border: 'none', borderRadius: 20, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
