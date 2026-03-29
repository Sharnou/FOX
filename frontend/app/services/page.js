'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdCardSkeleton from '../components/AdCardSkeleton';
const API = process.env.NEXT_PUBLIC_API_URL || '';
const WORKER_ICONS = { Plumber: '🔧', Electrician: '⚡', Carpenter: '🪚', Cleaner: '🧹', Painter: '🎨', Delivery: '🚚', Gardener: '🌱', Driver: '🚗' };
export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [filter, setFilter] = useState('All');
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const country = typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG';
  useEffect(() => {
    Promise.all([
      axios.get(`${API}/api/services`, { params: { country } }),
      axios.get(`${API}/api/services/types`)
    ]).then(([r1, r2]) => {
      setServices(r1.data);
      setTypes(r2.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  const filtered = filter === 'All' ? services : services.filter(s => s.subcategory === filter);
  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center gap-3 mb-4"><button onClick={() => history.back()} className="text-brand">←</button><h1 className="text-2xl font-bold text-brand">🔨 الخدمات والعمال</h1></div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {['All', ...types].map(t => (<button key={t} onClick={() => setFilter(t)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${filter === t ? 'bg-brand text-white' : 'bg-gray-100'}`}>{WORKER_ICONS[t] || '👷'} {t}</button>))}
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <AdCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(s => (<div key={s._id} className="bg-white rounded-xl shadow p-4"><p className="text-3xl">{WORKER_ICONS[s.subcategory] || '👷'}</p><p className="font-bold mt-2">{s.title}</p><p className="text-sm text-gray-500">{s.city}</p><p className="text-brand font-bold">{s.price} {s.currency}</p><a href={`/chat?target=${s.userId}`} className="mt-2 block bg-brand text-white text-center py-2 rounded-xl text-sm">تواصل</a></div>))}
        </div>
      )}
    </div>
  );
}
