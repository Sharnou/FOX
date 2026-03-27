'use client';
import AdCard from './AdCard';
export default function AdFeed({ ads = [] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
      {ads.map(ad => <AdCard key={ad._id} ad={ad} />)}
    </div>
  );
}
