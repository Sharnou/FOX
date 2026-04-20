'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdCardSkeleton from '../components/AdCardSkeleton';
const API = process.env.NEXT_PUBLIC_API_URL || '';
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "CollectionPage",
      "@id": "https://xtox.app/supermarket",
      "url": "https://xtox.app/supermarket",
      "name": "سوبرماركت XTOX",
      "description": "تصفح إعلانات السوبرماركت والمنتجات الغذائية في منطقتك",
      "isPartOf": { "@id": "https://xtox.app" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://xtox.app" },
        { "@type": "ListItem", "position": 2, "name": "سوبرماركت", "item": "https://xtox.app/supermarket" }
      ]
    }
  ]
};
export default function SupermarketPage() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [country, setCountry] = useState('EG');

  // Read country from localStorage only on client to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCountry(localStorage.getItem('country') || 'EG');
    }
  }, []);

  const fetchItems = () => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    axios.get(API + '/api/supermarket', { params: { country }, signal: controller.signal })
      .then(r => setItems(Array.isArray(r.data) ? r.data : []))
      .catch(e => { if (!axios.isCancel(e)) setError(true); })
      .finally(() => setLoading(false));
    return controller;
  };

  useEffect(() => {
    const controller = fetchItems();
    return () => controller.abort();
  }, [country]);
  const addToCart = (item) => setCart(c => [...c, item]);
  // Smart retry: clear stale SW cache + backoff before re-fetching
  async function smartRetry(fetchFn) {
    setError(false);
    if (typeof setLoading === 'function') setLoading(true);
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter(k => k.includes('xtox')).map(k => caches.delete(k)));
      }
    } catch(e) {}
    await new Promise(r => setTimeout(r, 500));
    fetchFn();
  }


  return (
    <div className="max-w-4xl mx-auto p-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex items-center gap-3 mb-6"><button onClick={() => history.back()} className="text-brand">←</button><h1 className="text-2xl font-bold text-brand">🛒 السوبرماركت</h1><span className="mr-auto bg-brand text-white px-3 py-1 rounded-full text-sm">🛒 {cart.length}</span></div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <AdCardSkeleton key={i} />)}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">⚠️</div>
          <p className="text-lg text-gray-500 mb-4">تعذّر تحميل المنتجات</p>
          <button onClick={() => smartRetry(fetchItems)} className="bg-brand text-white px-6 py-2 rounded-xl font-bold">إعادة المحاولة</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map(item => (<div key={item._id} className="bg-white rounded-xl shadow p-3 text-center"><div className="text-4xl mb-2">🧺</div><p className="font-bold text-sm">{item.title}</p><p className="text-brand font-bold">{item.price} {item.currency}</p><button onClick={() => addToCart(item)} className="mt-2 w-full bg-brand text-white py-2 rounded-xl text-sm">أضف للسلة</button></div>))}
        </div>
      )}
    </div>
  );
}
