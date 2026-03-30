'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox.up.railway.app';

// Category colors for map pins
const CAT_COLORS = {
  Vehicles: '#e53e3e',
  Electronics: '#3182ce',
  'Real Estate': '#38a169',
  Jobs: '#d69e2e',
  Services: '#805ad5',
  Supermarket: '#dd6b20',
  Pharmacy: '#e53e3e',
  'Fast Food': '#d69e2e',
  Fashion: '#ed64a6',
  General: '#718096'
};

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function NearbyPage() {
  const [ads, setAds] = useState([]);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [radius, setRadius] = useState(10);
  const [view, setView] = useState('map'); // 'map' | 'list'
  const [shareData, setShareData] = useState(null);
  const [showQR, setShowQR] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const country = typeof window !== 'undefined' ? localStorage.getItem('country') || 'EG' : 'EG';

  // Auto-detect location on load
  useEffect(() => {
    detectLocation();
  }, []);

  // Initialize map when location changes
  useEffect(() => {
    if (location && view === 'map') {
      initMap();
    }
  }, [location, ads, view]);

  // Cleanup map on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  function detectLocation() {
    setLoading(true);
    setError('');
    if (!navigator.geolocation) {
      setError('الموقع غير مدعوم في متصفحك');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const loc = { lat, lng };
        setLocation(loc);
        // Save to localStorage for auto-sharing
        localStorage.setItem('userLat', lat.toString());
        localStorage.setItem('userLng', lng.toString());
        await fetchNearbyAds(lat, lng, radius);
        await fetchShareData(lat, lng);
        setLoading(false);
      },
      (err) => {
        setError('لم نتمكن من تحديد موقعك. الرجاء السماح بالوصول للموقع.');
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function fetchNearbyAds(lat, lng, r) {
    try {
      const res = await fetch(`${API}/api/geo/nearby?lat=${lat}&lng=${lng}&radius=${r}&country=${country}`);
      if (res.ok) {
        const data = await res.json();
        setAds(Array.isArray(data) ? data : []);
      }
    } catch { setAds([]); }
  }

  async function fetchShareData(lat, lng) {
    try {
      const res = await fetch(`${API}/api/geo/app-share?lat=${lat}&lng=${lng}`);
      if (res.ok) setShareData(await res.json());
    } catch {}
  }

  function initMap() {
    if (typeof window === 'undefined' || !mapRef.current) return;
    // Remove old map
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    markersRef.current = [];

    // Load Leaflet dynamically
    if (!window.L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => createMap();
      document.head.appendChild(script);
    } else {
      createMap();
    }
  }

  function createMap() {
    if (!mapRef.current || !window.L || !location) return;
    const L = window.L;

    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false }).setView(
      [location.lat, location.lng], 13
    );

    // OpenStreetMap tiles (free, no API key)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // User location - pulsing blue dot
    const userIcon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.3);animation:pulse 2s infinite"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    L.marker([location.lat, location.lng], { icon: userIcon })
      .bindPopup('<b>موقعك الحالي</b>')
      .addTo(map);

    // Radius circle
    L.circle([location.lat, location.lng], {
      radius: radius * 1000,
      color: '#3b82f6',
      fillColor: '#3b82f6',
      fillOpacity: 0.05,
      weight: 1,
      dashArray: '5, 5'
    }).addTo(map);

    // Ad pins
    ads.forEach(ad => {
      if (!ad.location?.coordinates) return;
      const [adLng, adLat] = ad.location.coordinates;
      const color = CAT_COLORS[ad.category] || '#718096';
      const dist = haversineDistance(location.lat, location.lng, adLat, adLng);

      const icon = L.divIcon({
        className: '',
        html: `<div style="background:${color};color:white;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:bold;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3);font-family:Cairo,sans-serif">${ad.price} ${ad.currency || ''}</div>`,
        iconSize: [null, null],
        iconAnchor: [0, 0]
      });

      const popup = `
        <div style="font-family:Cairo,sans-serif;direction:rtl;min-width:200px">
          ${ad.media?.[0] ? `<img src="${ad.media[0]}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px">` : ''}
          <b style="font-size:14px">${ad.title?.slice(0,40)}</b><br>
          <span style="color:#002f34;font-weight:bold;font-size:16px">${ad.price} ${ad.currency || ''}</span><br>
          <span style="color:#666;font-size:12px">📍 ${dist.toFixed(1)} كم · ${ad.city || ''}</span><br>
          <a href="/ads/${ad._id}" style="display:inline-block;margin-top:8px;background:#002f34;color:white;padding:6px 16px;border-radius:8px;text-decoration:none;font-size:13px">عرض الإعلان</a>
        </div>
      `;

      const marker = L.marker([adLat, adLng], { icon })
        .bindPopup(popup, { maxWidth: 220 })
        .addTo(map);
      markersRef.current.push(marker);
    });

    mapInstanceRef.current = map;

    // Add pulse animation CSS
    if (!document.getElementById('map-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'map-pulse-style';
      style.textContent = '@keyframes pulse{0%,100%{box-shadow:0 0 0 4px rgba(59,130,246,0.3)}50%{box-shadow:0 0 0 8px rgba(59,130,246,0)}}';
      document.head.appendChild(style);
    }
  }

  function changeRadius(r) {
    setRadius(r);
    if (location) fetchNearbyAds(location.lat, location.lng, r);
  }

  function shareApp() {
    if (!shareData) return;
    if (navigator.share) {
      navigator.share({ title: 'XTOX', text: shareData.shareText, url: shareData.shareUrl });
    } else {
      navigator.clipboard?.writeText(shareData.shareUrl);
      alert('تم نسخ الرابط!');
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cairo', system-ui", background: '#f5f5f5' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 60, animation: 'spin 2s linear infinite', display: 'inline-block' }}>📍</div>
        <p style={{ color: '#002f34', fontWeight: 'bold', marginTop: 12 }}>جار تحديد موقعك...</p>
        <p style={{ color: '#666', fontSize: 13 }}>يرجى السماح بالوصول للموقع</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', fontFamily: "'Cairo', system-ui" }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #002f34, #004d40)', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 500 }}>
        <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 'bold' }}>📍 إعلانات قريبة منك</h1>
          {location && <p style={{ margin: 0, fontSize: 12, opacity: 0.8 }}>{ads.length} إعلان في نطاق {radius} كم</p>}
        </div>
        <button onClick={detectLocation} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', padding: '6px 12px', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>🔄 تحديث</button>
      </div>

      {error && (
        <div style={{ background: '#fff0f0', border: '1px solid #fcc', margin: 16, padding: 12, borderRadius: 12, color: '#c00', textAlign: 'center' }}>
          ⚠️ {error}
          <br /><button onClick={detectLocation} style={{ marginTop: 8, background: '#002f34', color: 'white', border: 'none', padding: '8px 20px', borderRadius: 10, cursor: 'pointer' }}>حاول مجدداً</button>
        </div>
      )}

      {location && (
        <>
          {/* Controls */}
          <div style={{ background: 'white', padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            {/* View toggle */}
            <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 10, padding: 3 }}>
              <button onClick={() => setView('map')} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: view === 'map' ? '#002f34' : 'transparent', color: view === 'map' ? 'white' : '#333', fontSize: 13, fontFamily: 'inherit' }}>🗺️ خريطة</button>
              <button onClick={() => setView('list')} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: view === 'list' ? '#002f34' : 'transparent', color: view === 'list' ? 'white' : '#333', fontSize: 13, fontFamily: 'inherit' }}>📋 قائمة</button>
            </div>
            {/* Radius */}
            {[5, 10, 20, 50].map(r => (
              <button key={r} onClick={() => changeRadius(r)}
                style={{ padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', background: radius === r ? '#002f34' : '#f0f0f0', color: radius === r ? 'white' : '#333', fontSize: 13, fontFamily: 'inherit' }}>
                {r} كم
              </button>
            ))}
            {/* Share */}
            <button onClick={shareApp} style={{ marginRight: 'auto', background: '#00b09b', color: 'white', border: 'none', padding: '5px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>📤 شارك XTOX</button>
          </div>

          {/* Map View */}
          {view === 'map' && (
            <div ref={mapRef} style={{ height: 'calc(100vh - 130px)', width: '100%', zIndex: 1 }} />
          )}

          {/* List View */}
          {view === 'list' && (
            <div style={{ padding: 16 }}>
              {ads.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                  <div style={{ fontSize: 48 }}>🗺️</div>
                  <p>لا توجد إعلانات في نطاق {radius} كم</p>
                  <button onClick={() => changeRadius(50)} style={{ background: '#002f34', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}>توسيع البحث إلى 50 كم</button>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {ads.map(ad => {
                    const dist = ad.location?.coordinates ? haversineDistance(location.lat, location.lng, ad.location.coordinates[1], ad.location.coordinates[0]) : null;
                    return (
                      <a key={ad._id} href={`/ads/${ad._id}`} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit', display: 'block' }}>
                        <div style={{ height: 120, background: '#f0f0f0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                          {ad.media?.[0] ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📦'}
                        </div>
                        <div style={{ padding: '10px 12px' }}>
                          <p style={{ fontWeight: 'bold', fontSize: 13, margin: 0 }}>{ad.title?.slice(0, 28)}</p>
                          <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 14, margin: '4px 0' }}>{ad.price} {ad.currency}</p>
                          {dist && <p style={{ color: '#00aa44', fontSize: 12, margin: 0 }}>📍 {dist.toFixed(1)} كم</p>}
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}