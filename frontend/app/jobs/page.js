'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import AdCardSkeleton from '../components/AdCardSkeleton';
const API = process.env.NEXT_PUBLIC_API_URL || '';
export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const country = typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG';
  useEffect(() => {
    axios.get(`${API}/api/jobs`, { params: { country } })
      .then(r => setJobs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0627\u0644\u0648\u0638\u0627\u0626\u0641 | XTOX",
    "description": "\u062a\u0635\u0641\u062d \u0623\u062d\u062f\u062b \u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0627\u0644\u0648\u0638\u0627\u0626\u0641 \u0648\u0627\u0644\u0639\u0645\u0644 \u0641\u064a \u0645\u0646\u0637\u0642\u062a\u0643",
    "url": "https://fox-kohl-eight.vercel.app/jobs",
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
          "name": "\u0627\u0644\u0648\u0638\u0627\u0626\u0641",
          "item": "https://fox-kohl-eight.vercel.app/jobs"
        }
      ]
    }
  };
  return (
    <div className="max-w-3xl mx-auto p-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(jsonLd)}} />
      <div className="flex items-center gap-3 mb-6"><button onClick={() => history.back()} className="text-brand font-bold">\u2190</button><h1 className="text-2xl font-bold text-brand">\ud83d\udcbc \u0627\u0644\u0648\u0638\u0627\u0626\u0641</h1><a href="/jobs/post" className="mr-auto bg-brand text-white px-4 py-2 rounded-xl text-sm">+ \u0646\u0634\u0631 \u0648\u0638\u064a\u0641\u0629</a></div>
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <AdCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map(j => (<div key={j._id} className="bg-white rounded-xl shadow p-4"><h2 className="font-bold text-lg">{j.title}</h2><p className="text-gray-600 text-sm mt-1">{j.description}</p><div className="flex gap-4 mt-3 text-sm text-gray-500"><span>\ud83d\udccd {j.city}</span><span>\ud83d\udcb0 {j.price} {j.currency}</span></div><a href={`/chat?target=${j.userId}`} className="mt-3 block bg-brand text-white text-center py-2 rounded-xl text-sm font-bold">\u0627\u0644\u062a\u0648\u0627\u0635\u0644</a></div>))}
        </div>
      )}
    </div>
  );
}
