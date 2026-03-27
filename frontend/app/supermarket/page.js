'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
const API = process.env.NEXT_PUBLIC_API_URL || '';
export default function SupermarketPage() {
  const [items, setItems] = useState([]);
  const [cart, setCart] = useState([]);
  const country = typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG';
  useEffect(() => { axios.get(`${API}/api/supermarket`, { params: { country } }).then(r => setItems(r.data)); }, []);
  const addToCart = (item) => setCart(c => [...c, item]);
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-6"><button onClick={() => history.back()} className="text-brand">←</button><h1 className="text-2xl font-bold text-brand">🛒 السوبرماركت</h1><span className="mr-auto bg-brand text-white px-3 py-1 rounded-full text-sm">🛒 {cart.length}</span></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(item => (<div key={item._id} className="bg-white rounded-xl shadow p-3 text-center"><div className="text-4xl mb-2">🧺</div><p className="font-bold text-sm">{item.title}</p><p className="text-brand font-bold">{item.price} {item.currency}</p><button onClick={() => addToCart(item)} className="mt-2 w-full bg-brand text-white py-2 rounded-xl text-sm">أضف للسلة</button></div>))}
      </div>
    </div>
  );
}
