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

// Category-specific emoji fallback map
const CATEGORY_EMOJI = {
  'موبايلات': '📱',
  'ملاكي': '🚗',
  'شقق': '🏠',
  'ملابس': '👗',
  'خدمات': '🔧',
  'حيوانات': '🐾',
  'لابتوب': '💻',
  'كاميرات': '📷',
  'أجهزة منزلية': '🏠',
  'إلكترونيات': '📺',
  'عقارات': '🏗️',
  'سيارات': '🚗',
  'وظائف': '💼',
  'صيدلية': '💊',
  'مطاعم': '🍔',
};

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
          ids.map(id => fetch(API + '/api/ads/' + id, { signal: AbortSignal.timeout(8000) }).then(r => r.ok ? r.json() : null))
        );
        setAds(results.flatMap(r => (r.status === 'fulfilled' && r.value ? [r.value] : [])));
      } catch {}
    }
    load();
  }, [currentAdId]);

  if (!ads.length) return null;

  const isRtl = lang === 'ar';
  const label = lang === 'ar' ? 'شاهدتها مؤخراً' : 'Recently Viewed';

  return (
    <section dir={isRtl ? 'rtl' : 'ltr'} className="py-4 px-4">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{label}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide scroll-smooth" style={{ touchAction: 'pan-x' }}>
        {ads.map(ad => {
          const emoji = CATEGORY_EMOJI[ad.subcategory] || CATEGORY_EMOJI[ad.category] || '🏷️';
          return (
            <Link key={ad._id} href={'/ads/' + ad._id}
              className="flex-shrink-0 w-36 snap-start rounded-xl overflow-hidden shadow-sm border border-gray-100 bg-white hover:shadow-md transition-shadow">
              <div className="w-full h-24 bg-gray-100 overflow-hidden">
                {ad.images?.[0]
                  ? <img
                      src={optimizeImage(ad.images[0])}
                      alt={ad.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  : <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 gap-1">
                      <span className="text-3xl">{emoji}</span>
                      <span className="text-[10px] text-gray-400 font-medium truncate max-w-[90%] text-center">{ad.subcategory || ad.category || ''}</span>
                    </div>
                }
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-800 line-clamp-1 leading-tight">{ad.title}</p>
                {ad.price != null && (
                  <p className="text-xs text-emerald-600 font-bold mt-0.5">
                    {ad.price === 0 ? (isRtl ? 'مجاني' : 'Free') : ad.price.toLocaleString(isRtl ? 'ar-EG' : 'en-US')}
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
