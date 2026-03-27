'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
const API = process.env.NEXT_PUBLIC_API_URL || '';
export default function AdPage({ params: { id } }) {
  const [ad, setAd] = useState(null);
  const [mediaIdx, setMediaIdx] = useState(0);
  useEffect(() => { axios.get(`${API}/api/ads/${id}`).then(r => setAd(r.data)); }, [params.id]);
  if (!ad) return <div className="flex justify-center p-20 text-brand text-2xl">جار التحميل...</div>;
  const media = ad.media || [];
  return (
    <div className="max-w-2xl mx-auto p-4">
      <button onClick={() => history.back()} className="mb-4 text-brand font-bold">← رجوع</button>
      {ad.video ? (
        <video src={ad.video} controls autoPlay className="w-full rounded-xl max-h-96 object-cover" />
      ) : media.length > 0 ? (
        <div>
          <img src={media[mediaIdx]} className="w-full rounded-xl max-h-96 object-cover" alt={ad.title} />
          <div className="flex gap-2 mt-2">
            {media.map((m, i) => <img key={i} src={m} onClick={() => setMediaIdx(i)} className={`w-16 h-16 object-cover rounded cursor-pointer ${i === mediaIdx ? 'ring-2 ring-brand' : ''}`} alt="" />)}
          </div>
        </div>
      ) : null}
      <h1 className="text-2xl font-bold mt-4">{ad.title}</h1>
      <p className="text-3xl text-brand font-bold mt-2">{ad.price} {ad.currency}</p>
      <p className="text-gray-600 mt-3">{ad.description}</p>
      <div className="flex gap-4 mt-4 text-sm text-gray-500">
        <span>📍 {ad.city}</span>
        <span>👁 {ad.views} مشاهدة</span>
        <span>⏰ ينتهي {new Date(ad.expiresAt).toLocaleDateString('ar-EG')}</span>
      </div>
      <div className="flex gap-3 mt-6">
        <a href={`/chat?target=${ad.userId?._id}&ad=${ad._id}`} className="flex-1 bg-brand text-white text-center py-3 rounded-xl font-bold">💬 تواصل مع البائع</a>
        <a href={`tel:`} className="flex-1 bg-green-600 text-white text-center py-3 rounded-xl font-bold">📞 اتصل</a>
      </div>
      {ad.qrCode && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 mb-2">QR Code للإعلان</p>
          <img src={ad.qrCode} className="mx-auto w-32" alt="QR" />
        </div>
      )}
    </div>
  );
}
