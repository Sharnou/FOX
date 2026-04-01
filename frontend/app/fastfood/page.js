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
      "@id": "https://xtox.app/fastfood",
      "url": "https://xtox.app/fastfood",
      "name": "وجبات سريعة XTOX",
      "description": "تصفح إعلانات الوجبات السريعة والمطاعم في منطقتك",
      "isPartOf": { "@id": "https://xtox.app" }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "الرئيسية", "item": "https://xtox.app" },
        { "@type": "ListItem", "position": 2, "name": "وجبات سريعة", "item": "https://xtox.app/fastfood" }
      ]
    }
  ]
};
export default function FastFoodPage() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const country = typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG';

  useEffect(() => {
    axios.get(`${API}/api/fastfood`, { params: { country } })
      .then(r => setItems(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c._id === item._id);
      if (existing) {
        return prev.map(c => c._id === item._id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(c => c._id !== id));

  const changeQty = (id, delta) => {
    setCart(prev =>
      prev.map(c => c._id === id ? { ...c, qty: Math.max(1, c.qty + delta) } : c)
    );
  };

  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const totalPrice = cart.reduce((s, c) => s + (parseFloat(c.price) || 0) * c.qty, 0);
  const currency = cart[0]?.currency || '';

  return (
    <div className="max-w-3xl mx-auto p-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => history.back()} className="text-brand">←</button>
        <h1 className="text-2xl font-bold text-brand">🍕 الطعام السريع</h1>
        <button
          onClick={() => setCartOpen(true)}
          className="mr-auto relative bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold"
        >
          🛒 {totalItems}
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <AdCardSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">🍔</div>
          <p className="text-lg">لا توجد وجبات متاحة في منطقتك الآن</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {items.map(item => (
            <div key={item._id} className="bg-white rounded-xl shadow p-4 flex flex-col">
              <div className="text-3xl mb-2">🍔</div>
              <p className="font-bold">{item.title}</p>
              <p className="text-sm text-gray-500 flex-1">{item.description}</p>
              <p className="text-brand font-bold mt-2">{item.price} {item.currency}</p>
              <button
                onClick={() => addToCart(item)}
                className="mt-2 w-full bg-orange-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition"
              >
                أضف للسلة
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Cart Drawer Overlay */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setCartOpen(false)} />
          <div className="w-80 bg-white h-full shadow-2xl flex flex-col" dir="rtl">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">🛒 السلة</h2>
              <button onClick={() => setCartOpen(false)} className="text-gray-500 text-xl">✕</button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
                <div className="text-5xl">🛒</div>
                <p>السلة فارغة</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.map(c => (
                    <div key={c._id} className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{c.title}</p>
                        <p className="text-brand text-sm">{(parseFloat(c.price) * c.qty).toFixed(2)} {c.currency}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => changeQty(c._id, -1)}
                          className="w-6 h-6 bg-gray-200 rounded-full text-sm font-bold flex items-center justify-center"
                        >−</button>
                        <span className="w-6 text-center text-sm font-bold">{c.qty}</span>
                        <button
                          onClick={() => changeQty(c._id, 1)}
                          className="w-6 h-6 bg-orange-500 text-white rounded-full text-sm font-bold flex items-center justify-center"
                        >+</button>
                      </div>
                      <button onClick={() => removeFromCart(c._id)} className="text-red-400 text-lg">🗑</button>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t">
                  <div className="flex justify-between font-bold text-lg mb-3">
                    <span>الإجمالي:</span>
                    <span className="text-brand">{totalPrice.toFixed(2)} {currency}</span>
                  </div>
                  <button
                    onClick={() => alert('سيتم إضافة خاصية الطلب قريبًا!')}
                    className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold text-base hover:bg-orange-600 transition"
                  >
                    تأكيد الطلب 🍕
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
