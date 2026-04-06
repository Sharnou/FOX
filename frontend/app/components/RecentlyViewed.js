'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const MAX_ITEMS = 6;
const STORAGE_KEY = 'xtox_recently_viewed';
const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

function optimizeImage(url, width = 200) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto,w_' + width + ',c_limit/');
}

export function recordRecentView(adId) {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const updated = [adId, ...stored.filter(id => id !== adId)].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export default function RecentlyViewed({ currentAdId, lang = 'ar' }) {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const ids = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
          .filter(id => id !== currentAdId).slice(0, MAX_ITEMS);
        if (!ids.length) return;
        const results = await Promise.allSettled(
          ids.map(id => fetch(API + '/api/ads/' + id).then(r => r.ok ? r.json() : null))
        );
        setAds(results.flatMap(r => (r.status === 'fulfilled' && r.value ? [r.value] : [])));
      } catch {}
    }
    load();
  }, [currentAdId]);

  if (!ads.length) return null;

  const isRtl = lang === 'ar';
  const label = lang === 'ar' ? '\u0634\u0627\u0647\u062f\u062a\u0647\u0627 \u0645\u0624\u062e\u0631\u0627\u064b' : 'Recently Viewed';

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="py-4 px-4">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{label}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {ads.map(ad => (
          <Link key={ad._id} href={'/ads/' + ad._id}
            className="flex-shrink-0 w-32 snap-start rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white hover:shadow-md transition-shadow">
            <div className="w-full h-20 bg-gray-100 overflow-hidden">
              {ad.images?.[0]
                ? <img src={ad.images && ad.images[0] ? optimizeImage(ad.images[0]) : '/placeholder.png'} alt={ad.title} className="w-full h-full object-cover" loading="lazy" />
                : <div className="w-full h-full flex items-center justify-center text-2xl">\ud83c\udff7\ufe0f</div>}
            </div>
            <div className="p-1.5">
              <p className="text-xs font-semibold text-gray-800 truncate leading-tight">{ad.title}</p>
              {ad.price != null && (
                <p className="text-xs text-emerald-600 font-bold mt-0.5">
                  {ad.price.toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
