'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

const LABELS = {
  ar: { title: 'الإعلانات الرائجة', hot: '🔥 رائج', noAds: 'لا توجد إعلانات رائجة حالياً', error: 'تعذّر تحميل الإعلانات' },
  en: { title: 'Trending Ads', hot: '🔥 Hot', noAds: 'No trending ads right now', error: 'Failed to load ads' },
  de: { title: 'Trendende Anzeigen', hot: '🔥 Trend', noAds: 'Keine Trendanzeigen', error: 'Fehler beim Laden' },
  fr: { title: 'Annonces tendance', hot: '🔥 Tendance', noAds: 'Aucune annonce tendance', error: 'Échec du chargement' },
};

function formatPrice(price, currency = 'EGP', lang = 'ar') {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : lang, {
      style: 'currency', currency, maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${price} ${currency}`;
  }
}

export default function TrendingAdsWidget({ lang = 'ar', countryCode = 'EG', currency = 'EGP', onAdClick }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isRTL = lang === 'ar';
  const t = LABELS[lang] || LABELS['ar'];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch(`/api/ads?sort=trending&limit=6&country=${countryCode}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        if (!cancelled) {
          setAds(Array.isArray(data.ads) ? data.ads : Array.isArray(data) ? data : []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setError(true); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [countryCode]);

  return (
    <section dir={isRTL ? 'rtl' : 'ltr'} className="w-full py-6 px-4">
      <h2 className={`text-xl font-bold mb-4 text-gray-800 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t.title}
      </h2>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl bg-gray-100 animate-pulse h-48" />
          ))}
        </div>
      )}

      {!loading && error && (
        <p className={`text-red-500 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.error}</p>
      )}

      {!loading && !error && ads.length === 0 && (
        <p className={`text-gray-400 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t.noAds}</p>
      )}

      {!loading && !error && ads.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {ads.map((ad, idx) => (
            <div
              key={ad._id || idx}
              onClick={() => onAdClick && onAdClick(ad)}
              className="relative rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow duration-200"
            >
              {/* Hot badge for top 3 */}
              {idx < 3 && (
                <span className="absolute top-2 start-2 z-10 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {t.hot}
                </span>
              )}

              {/* Ad image */}
              <div className="relative w-full h-32 bg-gray-50">
                {ad.images?.[0] ? (
                  <Image
                    src={ad.images[0]}
                    alt={ad.title || ''}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl">🖼️</div>
                )}
              </div>

              {/* Ad info */}
              <div className={`p-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                <p className="text-sm font-semibold text-gray-800 line-clamp-1">{ad.title}</p>
                <p className="text-base font-bold text-emerald-600 mt-0.5">
                  {ad.price != null ? formatPrice(ad.price, currency, lang) : '—'}
                </p>
                {ad.city && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {ad.city}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
