'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const CATEGORIES = ['All', 'Vehicles', 'Electronics', 'Real Estate', 'Jobs', 'Services', 'Supermarket', 'Pharmacy', 'Fast Food', 'Fashion'];
const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function Home() {
  const [ads, setAds] = useState([]);
  const [cat, setCat] = useState('All');
  const [search, setSearch] = useState('');
  const [country] = useState(typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG');

  useEffect(() => { fetchAds(); }, [cat, country]);

  async function fetchAds() {
    const params = { country };
    if (cat !== 'All') params.category = cat;
    const res = await axios.get(`${API}/api/ads`, { params });
    setAds(res.data);
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-brand text-white p-4 flex items-center gap-4 sticky top-0 z-50">
        <span className="text-2xl font-bold">XTOX</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن أي شيء..." className="flex-1 p-2 rounded text-black text-sm" />
        <a href="/sell" className="bg-accent px-4 py-2 rounded font-bold text-sm">+ بيع</a>
        <a href="/admin" className="text-xs opacity-70">Admin</a>
      </header>

      <div className="flex gap-2 p-4 overflow-x-auto bg-white shadow-sm">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap font-medium ${cat === c ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700'}`}>{c}</button>
        ))}
      </div>

      {ads.filter(a => a.isFeatured).length > 0 && (
        <div className="p-4">
          <h2 className="font-bold mb-3 text-brand">⭐ إعلانات مميزة</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {ads.filter(a => a.isFeatured).map(ad => (
              <a key={ad._id} href={`/ads/${ad._id}`} className={`min-w-48 bg-white rounded-xl shadow p-3 ${ad.featuredStyle === 'cartoon' ? 'border-4 border-yellow-400 animate-pulse' : 'border-2 border-brand'}`}>
                {ad.media?.[0] && <img src={ad.media[0]} className="w-full h-32 object-cover rounded" alt={ad.title} />}
                <p className="font-bold mt-2 text-sm">{ad.title}</p>
                <p className="text-brand font-bold">{ad.price} {ad.currency}</p>
                {ad.featuredStyle === 'cartoon' && <span className="text-2xl">🌟</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {ads.filter(a => !a.isFeatured).map(ad => (
          <a key={ad._id} href={`/ads/${ad._id}`} className="bg-white rounded-xl shadow hover:shadow-lg transition">
            {ad.video ? (
              <video src={ad.video} className="w-full h-44 object-cover rounded-t-xl" autoPlay muted loop playsInline />
            ) : ad.media?.[0] ? (
              <img src={ad.media[0]} className="w-full h-44 object-cover rounded-t-xl" alt={ad.title} />
            ) : (
              <div className="w-full h-44 bg-gray-200 rounded-t-xl flex items-center justify-center text-4xl">📦</div>
            )}
            <div className="p-3">
              <p className="font-bold text-sm line-clamp-2">{ad.title}</p>
              <p className="text-brand font-bold mt-1">{ad.price} {ad.currency}</p>
              <p className="text-xs text-gray-500 mt-1">👁 {ad.views} | {ad.city}</p>
              <p className="text-xs text-red-500 mt-1">⏰ {new Date(ad.expiresAt).toLocaleDateString('ar-EG')}</p>
            </div>
          </a>
        ))}
      </div>

      <footer className="text-center py-8 text-gray-500 text-sm">
        <a href={`/rss/${country}`} className="underline hover:text-brand">RSS Feed</a>
        {' | '}
        <a href="/about" className="underline hover:text-brand">عن التطبيق</a>
        {' | '}
        <a href="/privacy" className="underline hover:text-brand">الخصوصية</a>
      </footer>
    </div>
  );
}
