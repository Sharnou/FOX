'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://fox-production.up.railway.app';

export default function NearbyPage() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [radius, setRadius] = useState(10);
  const [shareData, setShareData] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const country = typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG';

  useEffect(() => { detectLocation(); }, []);

  function detectLocation() {
    setLoading(true); setError('');
    if (!navigator.geolocation) {
      setError('الموقع غير مدعوم في متصفحك');
      setLoading(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng });
        await fetchNearby(lat, lng);
        await fetchShareData(lat, lng);
      },
      () => {
        setError('لم نتمكن من تحديد موقعك. تأكد من السماح بالوصول للموقع.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function fetchNearby(lat, lng) {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/geo/nearby`, { params: { lat, lng, radius, country } });
      setAds(res.data || []);
    } catch { setAds([]); }
    setLoading(false);
  }

  async function fetchShareData(lat, lng) {
    try {
      const res = await axios.get(`${API}/api/geo/app-share`, { params: { lat, lng } });
      setShareData(res.data);
    } catch {}
  }

  function shareApp() {
    if (!shareData) return;
    if (navigator.share) {
      navigator.share({ title: 'XTOX — السوق المحلي', text: shareData.shareText, url: shareData.shareUrl });
    } else {
      setShowShareModal(true);
    }
  }

  function copyLink() {
    if (shareData) {
      navigator.clipboard.writeText(shareData.shareUrl);
      alert('✅ تم نسخ الرابط!');
    }
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h1 style={{ color: '#002f34', margin: 0, fontSize: 22, fontWeight: 'bold' }}>📍 إعلانات قريبة منك</h1>
      </div>

      {/* Location Status */}
      <div style={{ background: 'white', borderRadius: 16, padding: 16, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        {location ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>📍</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 'bold', color: '#002f34' }}>تم تحديد موقعك</p>
              <p style={{ margin: '2px 0 0', color: '#666', fontSize: 13 }}>{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
            </div>
            <button onClick={() => fetchNearby(location.lat, location.lng)}
              style={{ background: '#002f34', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>تحديث</button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            {error ? (
              <div>
                <p style={{ color: '#e44', margin: 0 }}>{error}</p>
                <button onClick={detectLocation}
                  style={{ marginTop: 12, background: '#002f34', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
                  حاول مجدداً
                </button>
              </div>
            ) : (
              <p style={{ color: '#666', margin: 0 }}>🔍 جار تحديد موقعك...</p>
            )}
          </div>
        )}
      </div>

      {/* Radius Control */}
      {location && (
        <div style={{ background: 'white', borderRadius: 14, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>نطاق البحث:</span>
          {[5, 10, 20, 50].map(r => (
            <button key={r} onClick={() => { setRadius(r); fetchNearby(location.lat, location.lng); }}
              style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: radius === r ? '#002f34' : '#f0f0f0', color: radius === r ? 'white' : '#333', fontSize: 13, fontFamily: 'inherit' }}>
              {r} كم
            </button>
          ))}
        </div>
      )}

      {/* Share App */}
      {shareData && (
        <div style={{ background: 'linear-gradient(135deg, #002f34, #004d40)', borderRadius: 18, padding: 20, marginBottom: 20, color: 'white' }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>📢 شارك XTOX مع الناس القريبين منك</h3>
          <p style={{ margin: '0 0 16px', opacity: 0.8, fontSize: 13 }}>أخبر من حولك عن السوق المحلي</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={shareApp}
              style={{ padding: '12px', background: '#00b09b', border: 'none', borderRadius: 12, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              📤 شارك الآن
            </button>
            <a href={shareData.whatsappUrl} target="_blank" rel="noopener"
              style={{ padding: '12px', background: '#25d366', borderRadius: 12, color: 'white', fontWeight: 'bold', fontSize: 14, textDecoration: 'none', textAlign: 'center', display: 'block' }}>
              💬 واتساب
            </a>
            <button onClick={copyLink}
              style={{ padding: '12px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              🔗 نسخ الرابط
            </button>
            <button onClick={() => setShowShareModal(true)}
              style={{ padding: '12px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              📱 QR Code
            </button>
          </div>
        </div>
      )}

      {/* Ads Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>🔍 جار البحث عن إعلانات قريبة منك...</div>
      ) : ads.length > 0 ? (
        <div>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>وجدنا {ads.length} إعلان في نطاق {radius} كم</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {ads.map(ad => (
              <a key={ad._id} href={`/ads/${ad._id}`}
                style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ height: 120, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, overflow: 'hidden' }}>
                  {ad.media?.[0] ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📦'}
                </div>
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 13, margin: 0 }}>{ad.title?.slice(0, 28)}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 14, margin: '4px 0' }}>{ad.price} {ad.currency}</p>
                  <p style={{ color: '#00aa44', fontSize: 12, margin: 0 }}>📍 {ad.distance} كم</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : location ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 16, color: '#999' }}>
          <div style={{ fontSize: 48 }}>🗺️</div>
          <p>لا توجد إعلانات في نطاق {radius} كم</p>
          <button onClick={() => { setRadius(50); fetchNearby(location.lat, location.lng); }}
            style={{ background: '#002f34', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', marginTop: 12, fontFamily: 'inherit' }}>
            توسيع البحث إلى 50 كم
          </button>
        </div>
      ) : null}

      {/* QR Modal */}
      {showShareModal && shareData && (
        <div onClick={() => setShowShareModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 24, padding: 32, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <h2 style={{ color: '#002f34', marginBottom: 8 }}>📱 QR Code للتطبيق</h2>
            <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>اطبعه أو شاركه — أي شخص يمسحه يفتح XTOX مباشرة</p>
            <img src={shareData.qrUrl} style={{ width: 200, height: 200, borderRadius: 12, border: '2px solid #002f34' }} alt="QR" />
            <p style={{ color: '#999', fontSize: 11, marginTop: 12, wordBreak: 'break-all' }}>{shareData.shareUrl}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => { navigator.clipboard.writeText(shareData.shareUrl); alert('تم نسخ الرابط!'); }}
                style={{ flex: 1, padding: '12px', background: '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit' }}>
                نسخ الرابط
              </button>
              <a href={shareData.qrUrl} download="xtox-qr.png"
                style={{ flex: 1, padding: '12px', background: '#00b09b', color: 'white', borderRadius: 12, fontWeight: 'bold', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                تحميل QR
              </a>
            </div>
            <button onClick={() => setShowShareModal(false)}
              style={{ width: '100%', marginTop: 10, padding: '10px', background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontFamily: 'inherit' }}>
              إغلاق
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
