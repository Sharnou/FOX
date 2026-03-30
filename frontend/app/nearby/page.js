'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox.up.railway.app';

// Max 5 recent map locations saved in localStorage
const HISTORY_KEY = 'xtox_map_history';
function saveMapHistory(lat, lng, zoom, label) {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const entry = { lat, lng, zoom, label, at: Date.now() };
    const filtered = history.filter(h => Math.abs(h.lat - lat) > 0.01 || Math.abs(h.lng - lng) > 0.01);
    const updated = [entry, ...filtered].slice(0, 5);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch(e) {}
}
function getMapHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(e) { return []; }
}

export default function NearbyPage() {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const clusterGroup = useRef(null);
  const watchId = useRef(null);

  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState(5);
  const [userPos, setUserPos] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [nearbyAlert, setNearbyAlert] = useState(null);
  const [liveTracking, setLiveTracking] = useState(false);
  const lastAlertAdId = useRef(null);

  // Load Leaflet + MarkerCluster CSS
  useEffect(() => {
    if (document.getElementById('leaflet-css')) return;
    const link1 = document.createElement('link');
    link1.id = 'leaflet-css';
    link1.rel = 'stylesheet';
    link1.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link1);
    const link2 = document.createElement('link');
    link2.rel = 'stylesheet';
    link2.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css';
    document.head.appendChild(link2);
    const link3 = document.createElement('link');
    link3.rel = 'stylesheet';
    link3.href = 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css';
    document.head.appendChild(link3);
  }, []);

  // Init map
  useEffect(() => {
    if (leafletMap.current || !mapRef.current) return;
    let map, L;

    async function initMap() {
      const leaflet = await import('leaflet');
      L = leaflet.default;

      // Fix default icons
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      map = L.map(mapRef.current, { zoomControl: false }).setView([30.0444, 31.2357], 12);
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // CartoDB Positron — clean streets-only tiles, no schools/stores/government POI shown
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© XTOX | © OpenStreetMap | © CartoDB',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      leafletMap.current = map;

      // Save map position to history when user stops moving
      map.on('moveend', () => {
        const c = map.getCenter();
        const z = map.getZoom();
        const label = `${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}`;
        saveMapHistory(c.lat, c.lng, z, label);
        setHistory(getMapHistory());
      });

      // Load MarkerCluster
      const MC = await import('leaflet.markercluster');
      clusterGroup.current = L.markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div style="background:#002f34;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-family:Cairo,sans-serif">${count}</div>`,
            className: '',
            iconSize: [36, 36],
          });
        },
      });
      map.addLayer(clusterGroup.current);

      // Get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude: lat, longitude: lng } = pos.coords;
            setUserPos({ lat, lng });
            map.setView([lat, lng], 13);
            saveMapHistory(lat, lng, 13, 'موقعك الحالي');
            setHistory(getMapHistory());

            // User location marker (blue circle)
            L.circleMarker([lat, lng], {
              radius: 10, fillColor: '#4285F4', color: '#fff',
              fillOpacity: 0.9, weight: 2,
            }).addTo(map).bindPopup('<div style="font-family:Cairo;direction:rtl;font-weight:700">📍 موقعك الحالي</div>');

            fetchAds(lat, lng);
          },
          () => fetchAds(30.0444, 31.2357)
        );
      } else {
        fetchAds(30.0444, 31.2357);
      }

      setHistory(getMapHistory());
    }

    initMap();
    return () => {
      if (leafletMap.current) { leafletMap.current.remove(); leafletMap.current = null; }
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  const fetchAds = useCallback(async (lat, lng) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/ads?lat=${lat}&lng=${lng}&radius=${radius}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      const adList = Array.isArray(data) ? data : (data.ads || []);
      setAds(adList);
      plotAds(adList);

      // Check for new nearby ad (alert)
      if (adList.length > 0 && adList[0]._id !== lastAlertAdId.current) {
        lastAlertAdId.current = adList[0]._id;
        if (adList[0].createdAt && Date.now() - new Date(adList[0].createdAt).getTime() < 3600000) {
          setNearbyAlert(adList[0]);
          setTimeout(() => setNearbyAlert(null), 6000);
        }
      }
    } catch(e) {
      console.error(e);
    }
    setLoading(false);
  }, [radius]);

  const plotAds = (adList) => {
    if (!clusterGroup.current || !window.L) return;
    const L = window.L;
    clusterGroup.current.clearLayers();

    adList.forEach(ad => {
      const lat = ad.location?.coordinates?.[1] || ad.lat;
      const lng = ad.location?.coordinates?.[0] || ad.lng;
      if (!lat || !lng) return;

      const img = ad.media?.[0] || ad.images?.[0] || '';
      const price = ad.price ? `${Number(ad.price).toLocaleString('ar-EG')} ج.م` : 'السعر عند التواصل';
      const dist = ad.distance ? `${(ad.distance/1000).toFixed(1)} كم` : '';

      // Custom ad marker icon
      const icon = L.divIcon({
        html: `<div style="background:#002f34;color:#fff;border-radius:10px;padding:4px 8px;font-size:11px;font-weight:700;white-space:nowrap;font-family:Cairo,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2)">${ad.isFeatured ? '⭐ ' : ''}${price}</div>`,
        className: '',
        iconAnchor: [0, 0],
      });

      const marker = L.marker([lat, lng], { icon });

      // Mini AdCard popup
      const popupContent = `
        <div style="font-family:Cairo,sans-serif;direction:rtl;min-width:200px;max-width:240px">
          ${img ? `<img src="${img}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;margin-bottom:8px" onerror="this.style.display='none'">` : ''}
          <div style="font-weight:700;font-size:14px;color:#002f34;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ad.title || 'إعلان'}</div>
          <div style="color:#e74c3c;font-weight:700;font-size:13px;margin-bottom:4px">${price}</div>
          ${dist ? `<div style="color:#888;font-size:11px;margin-bottom:6px">📍 ${dist}</div>` : ''}
          <div style="display:flex;gap:6px">
            <a href="/ads/${ad._id}" style="flex:1;background:#002f34;color:#fff;text-align:center;padding:7px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none">عرض الإعلان</a>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}" target="_blank" style="background:#4285F4;color:#fff;padding:7px 10px;border-radius:8px;font-size:12px;text-decoration:none">🗺️</a>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { maxWidth: 250, className: 'xtox-popup' });
      clusterGroup.current.addLayer(marker);
    });
  };

  // Live location tracking
  const toggleLiveTracking = () => {
    if (liveTracking) {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      setLiveTracking(false);
    } else {
      watchId.current = navigator.geolocation.watchPosition(pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserPos({ lat, lng });
        if (leafletMap.current) leafletMap.current.setView([lat, lng], 15);
        fetchAds(lat, lng);
      }, null, { enableHighAccuracy: true, maximumAge: 10000 });
      setLiveTracking(true);
    }
  };

  // Fly to history location
  const flyToHistory = (h) => {
    if (leafletMap.current) {
      leafletMap.current.flyTo([h.lat, h.lng], h.zoom || 14, { duration: 1.2 });
      fetchAds(h.lat, h.lng);
    }
    setShowHistory(false);
  };

  // Share current map area to Google Maps
  const shareToGoogleMaps = () => {
    if (!leafletMap.current) return;
    const c = leafletMap.current.getCenter();
    const url = `https://www.google.com/maps/@${c.lat},${c.lng},${leafletMap.current.getZoom()}z`;
    if (navigator.share) {
      navigator.share({ title: 'إعلانات XTOX في هذه المنطقة', url });
    } else {
      navigator.clipboard.writeText(url);
      alert('تم نسخ رابط الخريطة!');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'Cairo, sans-serif', direction: 'rtl', background: '#f5f5f5' }}>

      {/* Header */}
      <div style={{ background: '#002f34', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 1000, flexShrink: 0 }}>
        <a href="/" style={{ color: '#fff', textDecoration: 'none', fontSize: 20 }}>←</a>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>🗺️ إعلانات قريبة</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>{loading ? 'جار البحث...' : `${ads.length} إعلان في نطاق ${radius} كم`}</div>
        </div>

        {/* Live tracking */}
        <button onClick={toggleLiveTracking} style={{ background: liveTracking ? '#e74c3c' : 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer' }}>
          {liveTracking ? '⏹ إيقاف' : '📡 مباشر'}
        </button>
      </div>

      {/* Controls bar */}
      <div style={{ background: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, zIndex: 999, borderBottom: '1px solid #eee', flexShrink: 0, overflowX: 'auto' }}>
        {/* Radius */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, color: '#666' }}>النطاق:</span>
          {[1, 3, 5, 10, 25].map(r => (
            <button key={r} onClick={() => { setRadius(r); if (userPos) fetchAds(userPos.lat, userPos.lng); }}
              style={{ background: radius === r ? '#002f34' : '#f0f0f0', color: radius === r ? '#fff' : '#333', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
              {r} كم
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Recent history */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setShowHistory(!showHistory)} style={{ background: '#f0f0f0', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            🕐 السجل
          </button>
          {showHistory && history.length > 0 && (
            <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 200, zIndex: 9999, overflow: 'hidden' }}>
              {history.map((h, i) => (
                <button key={i} onClick={() => flyToHistory(h)} style={{ display: 'block', width: '100%', textAlign: 'right', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f0f0f0', color: '#333' }}>
                  📍 {h.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Share map */}
        <button onClick={shareToGoogleMaps} style={{ background: '#4285F4', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
          🔗 مشاركة
        </button>
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, zIndex: 1 }} />

      {/* Nearby alert */}
      {nearbyAlert && (
        <div style={{ position: 'absolute', top: 130, right: 16, left: 16, zIndex: 9999, background: '#002f34', color: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.3)', animation: 'slideDown 0.3s ease', direction: 'rtl' }}>
          <style>{`@keyframes slideDown{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 24 }}>🔔</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>إعلان جديد بالقرب منك!</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{nearbyAlert.title}</div>
            </div>
            <a href={`/ads/${nearbyAlert._id}`} style={{ background: '#fff', color: '#002f34', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>عرض</a>
            <button onClick={() => setNearbyAlert(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      )}

      <style>{`
        .xtox-popup .leaflet-popup-content-wrapper { border-radius: 12px; padding: 0; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
        .xtox-popup .leaflet-popup-content { margin: 12px; }
        .xtox-popup .leaflet-popup-tip { background: #fff; }
        .leaflet-marker-cluster { background: transparent !important; }
      `}</style>
    </div>
  );
}
