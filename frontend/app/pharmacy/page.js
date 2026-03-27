'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
const API = process.env.NEXT_PUBLIC_API_URL || '';
export default function PharmacyPage() {
  const [items, setItems] = useState([]);
  const country = typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG';
  useEffect(() => { axios.get(`${API}/api/pharmacy`, { params: { country } }).then(r => setItems(r.data)); }, []);
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-6"><button onClick={() => history.back()} className="text-brand">←</button><h1 className="text-2xl font-bold text-brand">💊 الصيدلية</h1></div>
      <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-3 mb-4 text-sm">⚠️ تحقق دائمًا من تاريخ الانتهاء قبل الشراء</div>
      <div className="grid grid-cols-2 gap-4">
        {items.map(item => (<div key={item._id} className="bg-white rounded-xl shadow p-4"><p className="font-bold">{item.title}</p><p className="text-sm text-gray-500 mt-1">{item.description}</p><p className="text-brand font-bold mt-2">{item.price} {item.currency}</p><a href={`/chat?target=${item.userId}`} className="mt-2 block bg-brand text-white text-center py-2 rounded-xl text-sm">تواصل</a></div>))}
      </div>
    </div>
  );
}
