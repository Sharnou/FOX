'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function AdPage({ params }) {
  const [ad, setAd] = useState(null);
  const [mediaIdx, setMediaIdx] = useState(0);

  useEffect(() => {
    if (params?.id) {
      axios.get(`${API}/api/ads/${params.id}`).then(r => setAd(r.data)).catch(() => {});
    }
  }, [params?.id]);

  if (!ad) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#002f34', fontSize: 20 }}>
      جار التحميل...
    </div>
  );

  const media = ad.media || [];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif' }}>
      <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>← رجوع</button>
      {ad.video ? (
        <video src={ad.video} controls autoPlay style={{ width: '100%', borderRadius: 12, maxHeight: 360, objectFit: 'cover' }} />
      ) : media.length > 0 ? (
        <div>
          <img src={media[mediaIdx]} style={{ width: '100%', borderRadius: 12, maxHeight: 360, objectFit: 'cover' }} alt={ad.title} />
          {media.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {media.map((m, i) => (
                <img key={i} src={m} onClick={() => setMediaIdx(i)}
                  style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: i === mediaIdx ? '2px solid #002f34' : '2px solid transparent' }} alt="" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: 200, background: '#f0f0f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>📦</div>
      )}
      <h1 style={{ fontSize: 22, fontWeight: 'bold', marginTop: 16 }}>{ad.title}</h1>
      <p style={{ fontSize: 26, color: '#002f34', fontWeight: 'bold', margin: '8px 0' }}>{ad.price} {ad.currency}</p>
      <p style={{ color: '#555', lineHeight: 1.6 }}>{ad.description}</p>
      <div style={{ display: 'flex', gap: 16, color: '#999', fontSize: 13, margin: '12px 0' }}>
        <span>📍 {ad.city}</span>
        <span>👁 {ad.views} مشاهدة</span>
        <span>📁 {ad.category}</span>
      </div>
      <p style={{ color: '#e44', fontSize: 13 }}>⏰ ينتهي {ad.expiresAt ? new Date(ad.expiresAt).toLocaleDateString('ar-EG') : ''}</p>
      <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
        <a href={`/chat?target=${ad.userId?._id || ad.userId}&ad=${ad._id}`}
          style={{ flex: 1, background: '#002f34', color: 'white', textAlign: 'center', padding: '14px', borderRadius: 12, textDecoration: 'none', fontWeight: 'bold' }}>
          💬 تواصل مع البائع
        </a>
      </div>
    </div>
  );
}
