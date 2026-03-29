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
      "@id": "https://fox-kohl-eight.vercel.app/fastfood",
      "url": "https://fox-kohl-eight.vercel.app/fastfood",
      "name": "وجبات سريعة XTOX",
      "description": "تصفح إعلانات الوجبات السريعة والمطاعم في منطقتك",
      "isPartOf": { "@id": "https://fox-kohl-eight.vercel.app" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://fox-kohl-eight.vercel.app" },
        { "@type": "ListItem", "position": 2, "name": "وجبات سريعة", "item": "https://fox-kohl-eight.vercel.app/fastfood" }
      ]
    }
  ]
};
export default function FastFoodPage() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const country = typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG';
  useEffect(() => {
    axios.get(`${API}/api/fastfood`, { params: { country } })
      .then(r => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="max-w-3xl mx-auto p-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="flex items-center gap-3 mb-6"><button onClick={() => history.back()} className="text-brand">←</button><h1 className="text-2xl font-bold text-brand">🍕 الطعام السريع</h1><span className="mr-auto bg-orange-500 text-white px-3 py-1 rounded-full text-sm">🛒 {cart.length}</span></div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <AdCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map(item => (<div key={item._id} className="bg-white rounded-xl shadow p-4"><div className="text-3xl mb-2">🍔</div><p className="font-bold">{item.title}</p><p className="text-sm text-gray-500">{item.description}</p><p className="text-brand font-bold mt-2">{item.price} {item.currency}</p><button onClick={() => setCart(c => [...c, item])} className="mt-2 w-full bg-orange-500 text-white py-2 rounded-xl text-sm font-bold">أضف للسلة</button></div>))}
        </div>
      )}
    </div>
  );
}
