'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdCardSkeleton from '../components/AdCardSkeleton';
const API = process.env.NEXT_PUBLIC_API_URL || '';
const WORKER_ICONS = { Plumber: '\ud83d\udd27', Electrician: '\u26a1', Carpenter: '\ud83e\udea5', Cleaner: '\ud83e\uddf9', Painter: '\ud83c\udfa8', Delivery: '\ud83d\ude9a', Gardener: '\ud83c\udf31', Driver: '\ud83d\ude97' };
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0627\u0644\u062e\u062f\u0645\u0627\u062a | XTOX",
    "description": "\u062a\u0635\u0641\u062d \u0623\u062d\u062f\u062b \u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0627\u0644\u0645\u062d\u0644\u064a\u0629 \u0641\u064a \u0645\u0646\u0637\u0642\u062a\u0643",
    "url": "https://fox-kohl-eight.vercel.app/services",
    "inLanguage": "ar",
    "isPartOf": {
      "@type": "WebSite",
      "name": "XTOX",
      "url": "https://fox-kohl-eight.vercel.app"
    },
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629",
          "item": "https://fox-kohl-eight.vercel.app"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "\u0627\u0644\u062e\u062f\u0645\u0627\u062a",
          "item": "https://fox-kohl-eight.vercel.app/services"
        }
      ]
    }
  };
  return (
    <div className="max-w-3xl mx-auto p-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />
      <div className="flex items-center gap-3 mb-4"><button onClick={() => history.back()} className="text-brand">\u2190</button><h1 className="text-2xl font-bold text-brand">\ud83d\udd28 \u0627\u0644\u062e\u062f\u0645\u0627\u062a \u0648\u0627\u0644\u0639\u0645\u0627\u0644</h1></div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {['All', ...types].map(t => (<button key={t} onClick={() => setFilter(t)} className={`px-4 py-2 rounded-full text-sm whitespace-nowrap ${filter === t ? 'bg-brand text-white' : 'bg-gray-100'}`}>{WORKER_ICONS[t] || '\ud83d\udc77'} {t}</button>))}
      </div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <AdCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(s => (<div key={s._id} className="bg-white rounded-xl shadow p-4"><p className="text-3xl">{WORKER_ICONS[s.subcategory] || '\ud83d\udc77'}</p><p className="font-bold mt-2">{s.title}</p><p className="text-sm text-gray-500">{s.city}</p><p className="text-brand font-bold">{s.price} {s.currency}</p><a href={`/chat?target=${s.userId}`} className="mt-2 block bg-brand text-white text-center py-2 rounded-xl text-sm">\u062a\u0648\u0627\u0635\u0644</a></div>))}
        </div>
      )}
    </div>
  );
}
