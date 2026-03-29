'use client';
export default function AdCard({ ad }) {
  if (!ad) return null;
  return (
    <a href={`/ads/${ad._id}`} className="bg-white rounded-xl shadow hover:shadow-lg transition block slide-in">
      {ad.media?.[0] ? (
        <div className="relative w-full h-44 overflow-hidden rounded-t-xl">
          <img
            loading="lazy"
            src={ad.media[0]}
            className="w-full h-full object-cover img-blur-load"
            alt={ad.title}
            onLoad={e => e.target.classList.add('loaded')}
          />
        </div>
      ) : (
        <div className="w-full h-44 bg-gray-200 rounded-t-xl flex items-center justify-center text-4xl">📦</div>
      )}
      <div className="p-3">
        <p className="font-bold text-sm line-clamp-2">{ad.title}</p>
        <p className="text-brand font-bold mt-1">{ad.price} {ad.currency}</p>
        <p className="text-xs text-gray-500 mt-1">👁 {ad.views} | {ad.city}</p>
      </div>
    </a>
  );
}
