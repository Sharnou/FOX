'use client';
export default function FeaturedAds({ ads = [] }) {
  const featured = ads.filter(a => a.isFeatured);
  if (!featured.length) return null;
  return (
    <div className="p-4">
      <h2 className="font-bold mb-3 text-brand">⭐ إعلانات مميزة</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {featured.map(ad => (
          <a key={ad._id} href={`/ads/${ad._id}`} className={`min-w-48 bg-white rounded-xl shadow p-3 ${ad.featuredStyle === 'cartoon' ? 'border-4 border-yellow-400' : 'border-2 border-brand'}`}>
            {ad.media?.[0] && <img src={ad.media[0]} className="w-full h-32 object-cover rounded" alt={ad.title} />}
            <p className="font-bold mt-2 text-sm">{ad.title}</p>
            <p className="text-brand font-bold">{ad.price} {ad.currency}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
