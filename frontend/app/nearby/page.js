'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

// Module-level to avoid TDZ after SWC minification
// Previously inside plotAds useCallback — moved here for safety
const CAT_SUBSUB_MAP = {
  cars: ['Cars','Motorcycles','SpareParts','Trucks','Boats','Sedan','SUV','Pickup','Coupe','Electric','Sport','Scooter','OffRoad','Cruiser','Engine','Tires','BodyParts','LightTruck','HeavyTruck','FishingBoat','Yacht'],
  real_estate: ['Apartments','Villas','Land','Commercial','Offices','Rooms','Studio','1BR','2BR','3BR','4BR','Duplex','Penthouse','Independent','Compound','TwinHouse','TownHouse','Residential','Agricultural','Shop','Warehouse','Restaurant','Private','Shared','Single','Double'],
  electronics: ['MobilePhones','Laptops','Tablets','TVs','Cameras','Gaming','Audio','Accessories','iPhone','Samsung','Huawei','Xiaomi','Oppo','MacBook','GamingLaptop','Business','iPad','SamsungTab','SmartTV','OLED','LED','DSLR','Mirrorless','Security','PlayStation','Xbox','Nintendo','PCGaming','Headphones','Earbuds','Speakers','Chargers','Cases','PowerBanks'],
  jobs: ['FullTime','PartTime','Freelance','Internship','Remote','IT','Engineering','Medical','Marketing','Finance','Education','Sales','Delivery','Tutoring','CustomerService','Design','Development','Writing','Translation','Technical','Content'],
  services: ['HomeServices','Cleaning','Repairs','Education','Health','Transport','Design','Plumber','Electrician','Carpenter','Painter','ACRepair','PestControl','HomeCleaning','OfficeCleaning','CarWash','SofaCleaning','Electronics','Appliances','Furniture','Math','Science','Languages','Quran','Music','Fitness','Nutrition','Salon','Spa','FurnitureMoving','AirportTransfer','LogoDesign','Print','WebDesign','Video','Photography'],
};

// ─── Arabic constants & labels ───────────────────────────────────────────────
const LABELS = {
  title: '🗺️ إعلانات قريبة',
  searching: 'جارٍ البحث بالقرب منك...',
  adsFound: (n, r) => n + ' إعلان في نطاق ' + r + ' كم',
  noAds: 'لا توجد إعلانات في هذا النطاق',
  noAdsHint: 'جرّب توسيع نطاق البحث أو الانتقال لمنطقة أخرى',
  radius: 'النطاق:',
  km: 'كم',
  history: '🕐 السجل',
  share: '🔗 مشاركة',
  liveOn: '📡 مباشر',
  liveOff: '⏹ إيقاف',
  myLocation: '📍 موقعك الحالي',
  newNearby: '🔔 إعلان جديد بالقرب منك!',
  viewAd: 'عرض',
  viewAdFull: 'عرض الإعلان',
  navigate: '🗺️',
  priceOnContact: 'السعر عند التواصل',
  copyDone: '✅ تم نسخ رابط الخريطة!',
  copyFail: 'تعذّر النسخ',
  backBtn: '→',
  geoError: 'تعذّر تحديد موقعك — تأكّد من تفعيل خدمة الموقع',
  fetchError: 'تعذّر تحميل الإعلانات، يرجى إعادة المحاولة',
  retry: '🔄 إعادة المحاولة',
  refresh: '🔄',
  refreshLabel: 'تحديث النتائج',
  save: '🔖',
  saved: '✅',
  share_wa: '💬 واتساب',
  share_copy: '🔗 نسخ الرابط',
  close: '✕',
  filterAll: 'الكل',
  filter: 'تصفية',
  categories: {
    all: '📋 الكل',
    cars: '🚗 سيارات',
    real_estate: '🏠 عقارات',
    electronics: '📱 إلكترونيات',
    jobs: '💼 وظائف',
    services: '🔧 خدمات',
    other: '📦 أخرى',
  },
};

// ─── localStorage helpers ─────────────────────────────────────────────────────
const HISTORY_KEY = 'xtox_map_history';
const SAVED_KEY   = 'xtox_saved_ads';

function saveMapHistory(lat, lng, zoom, label) {
  try {
    const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    const entry   = { lat, lng, zoom, label, at: Date.now() };
    const filtered= history.filter(h => Math.abs(h.lat - lat) > 0.01 || Math.abs(h.lng - lng) > 0.01);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...filtered].slice(0, 5)));
  } catch (_) {}
}
function getMapHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch (_) { return []; }
}
function getSavedAds() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch (_) { return []; }
}
function toggleSaveAd(id) {
  const saved = getSavedAds();
  const next  = saved.includes(id) ? saved.filter(s => s !== id) : [...saved, id];
  localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  return next;
}

// ─── Toast component (RTL-aware) ──────────────────────────────────────────────
function Toast({ message, type = 'info', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const bg = type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#002f34';
  return (
    <div role="alert" aria-live="polite" style={{
      position: 'fixed', bottom: 80, right: 16, left: 16, maxWidth: 380,
      margin: '0 auto', zIndex: 99999,
      background: bg, color: '#fff',
      borderRadius: 12, padding: '12px 16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'toastIn 0.3s cubic-bezier(.21,1.02,.73,1) both',
      direction: 'rtl', fontFamily: 'Cairo,sans-serif',
    }}>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{message}</span>
      <button
        onClick={onClose}
        aria-label={LABELS.close}
        style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>
        {LABELS.close}
      </button>
    </div>
  );
}

// ─── Loading skeleton for ad count bar ───────────────────────────────────────
function SkeletonBar() {
  return (
    <div style={{ height: 14, borderRadius: 7, width: 140, background: 'rgba(255,255,255,0.25)', animation: 'shimmer 1.4s infinite linear' }} />
  );
}

// ─── Empty-state overlay ──────────────────────────────────────────────────────
function EmptyState({ radius, onExpand }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 500,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.96)', borderRadius: 20, padding: '28px 32px',
        textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        direction: 'rtl', fontFamily: 'Cairo,sans-serif', pointerEvents: 'all',
        maxWidth: 300,
      }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🔍</div>
        <div style={{ fontWeight: 700, fontSize: 16, color: '#002f34', marginBottom: 6 }}>{LABELS.noAds}</div>
        <div style={{ color: '#888', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>{LABELS.noAdsHint}</div>
        <button
          onClick={onExpand}
          aria-label="توسيع نطاق البحث"
          style={{
            background: '#002f34', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 20px', fontSize: 14,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo,sans-serif',
          }}>
          🔍 توسيع النطاق إلى {Math.min(radius * 2, 50)} كم
        </button>
      </div>
    </div>
  );
}

// ─── Error state overlay ──────────────────────────────────────────────────────
function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(245,245,245,0.85)',
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, padding: '28px 32px',
        textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        direction: 'rtl', fontFamily: 'Cairo,sans-serif', maxWidth: 300,
      }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#e74c3c', marginBottom: 6 }}>{message}</div>
        <button
          onClick={onRetry}
          aria-label={LABELS.retry}
          style={{
            background: '#002f34', color: '#fff', border: 'none',
            borderRadius: 10, padding: '10px 20px', fontSize: 14,
            fontWeight: 700, cursor: 'pointer', marginTop: 8, fontFamily: 'Cairo,sans-serif',
          }}>
          {LABELS.retry}
        </button>
      </div>
    </div>
  );
}

// ─── Category filter chips ────────────────────────────────────────────────────
function CategoryChips({ selected, onSelect }) {
  const cats = Object.entries(LABELS.categories);
  return (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 4px', scrollbarWidth: 'none' }}>
      {cats.map(([key, label]) => (
        <button
          key={key}
          onClick={() => onSelect(key === 'all' ? null : key)}
          aria-pressed={selected === (key === 'all' ? null : key)}
          style={{
            flexShrink: 0,
            background: (key === 'all' ? selected === null : selected === key) ? '#002f34' : '#f0f0f0',
            color: (key === 'all' ? selected === null : selected === key) ? '#fff' : '#555',
            border: 'none', borderRadius: 20, padding: '5px 12px',
            fontSize: 12, cursor: 'pointer', fontFamily: 'Cairo,sans-serif',
            transition: 'all 0.15s ease', whiteSpace: 'nowrap',
          }}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function NearbyPage() {
  const { language } = useLanguage();
  const mapRef      = useRef(null);
  const leafletMap  = useRef(null);
  const clusterGroup= useRef(null);
  const watchId     = useRef(null);
  const routePolylineRef = useRef(null);
  const userLocMarkerRef = useRef(null);

  const [ads, setAds]                 = useState([]);
  const [loading, setLoading]         = useState(true);
  const [fetchError, setFetchError]   = useState(null);
  const [geoError, setGeoError]       = useState(false);
  const [radius, setRadius]           = useState(5);
  const [userPos, setUserPos]         = useState(null);
  const [history, setHistory]         = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [nearbyAlert, setNearbyAlert] = useState(null);
  const [liveTracking, setLiveTracking] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [savedAds, setSavedAds]       = useState([]);
  const [toast, setToast]             = useState(null);
  const [mapReady, setMapReady]       = useState(false);
  const lastAlertAdId = useRef(null);

  // ── Routing state ──
  const [route, setRoute]             = useState(null);
  const [routingTo, setRoutingTo]     = useState(null);
  const [routeError, setRouteError]   = useState('');
  const [userLocState, setUserLocState] = useState(null);

  // ── Show toast helper ──
  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  // ── Inline OSRM directions ──
  const getDirections = useCallback((sellerLat, sellerLng, sellerName) => {
    if (!navigator.geolocation) {
      setRouteError('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    setRouteError('');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const userLat = pos.coords.latitude;
      const userLng = pos.coords.longitude;
      setUserLocState({ lat: userLat, lng: userLng });
      setRoutingTo({ name: sellerName, lat: sellerLat, lng: sellerLng });

      // Draw/update user location marker
      const L = window.L;
      if (L && leafletMap.current) {
        if (userLocMarkerRef.current) { userLocMarkerRef.current.remove(); userLocMarkerRef.current = null; }
        const userIcon = L.divIcon({
          html: '<div style="width:14px;height:14px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(59,130,246,0.5)"></div>',
          className: '', iconSize: [14, 14], iconAnchor: [7, 7],
        });
        userLocMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon })
          .addTo(leafletMap.current)
          .bindPopup('<div style="font-family:Cairo,sans-serif;direction:rtl;font-weight:700">📍 موقعك الحالي</div>');
      }

      try {
        const url =
          'https://router.project-osrm.org/route/v1/driving/' +
          userLng + ',' + userLat + ';' + sellerLng + ',' + sellerLat +
          '?overview=full&geometries=geojson';
        const res  = await fetch(url, { signal: AbortSignal.timeout(10000) });
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0]) {
          const r = data.routes[0];
          const coords   = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          const distKm   = (r.distance / 1000).toFixed(1);
          const durationMin = Math.round(r.duration / 60);

          if (window.L && leafletMap.current) {
            if (routePolylineRef.current) { routePolylineRef.current.remove(); routePolylineRef.current = null; }
            routePolylineRef.current = window.L.polyline(coords, { color: '#6366f1', weight: 5, opacity: 0.85 })
              .addTo(leafletMap.current);
            leafletMap.current.fitBounds([[userLat, userLng], [sellerLat, sellerLng]], { padding: [50, 50] });
          }
          setRoute({ coordinates: coords, distance: distKm, duration: durationMin });
        } else {
          setRouteError('تعذر حساب المسار — حاول مرة أخرى');
        }
      } catch (e) {
        setRouteError('فشل تحميل المسار — تحقق من الإنترنت');
      }
    }, () => {
      setRouteError('يرجى السماح بالوصول إلى موقعك لعرض الاتجاهات');
    });
  }, []);

  // Register window callbacks so Leaflet popup buttons can call them
  useEffect(() => {
    window.__foxGetDirections = getDirections;

    // Contact button in map popup — opens mini modal or redirects to login
    window.__foxContact = function(adId, sellerId, adTitle) {
      const token = localStorage.getItem('xtox_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
      if (!token) {
        window.location.href = '/login?redirect=/nearby';
        return;
      }
      const myId = localStorage.getItem('userId') || localStorage.getItem('xtox_user_id') || '';
      if (myId && sellerId && myId === sellerId) {
        alert('هذا إعلانك الخاص');
        return;
      }
      const existing = document.getElementById('__foxChatModal');
      if (existing) existing.remove();
      const modal = document.createElement('div');
      modal.id = '__foxChatModal';
      modal.innerHTML = `
        <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-end;justify-content:center;">
          <div style="background:white;border-radius:20px 20px 0 0;padding:20px;width:100%;max-width:500px;direction:rtl;font-family:Cairo,sans-serif;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <strong style="font-size:15px;">💬 راسل البائع</strong>
              <button onclick="document.getElementById('__foxChatModal').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;">✕</button>
            </div>
            <div style="font-size:13px;color:#6b7280;margin-bottom:10px;">${adTitle}</div>
            <textarea id="__foxChatMsg" placeholder="اكتب رسالتك للبائع..." rows="3" style="width:100%;padding:10px;border:1px solid #d1d5db;border-radius:10px;font-size:14px;direction:rtl;resize:none;box-sizing:border-box;font-family:inherit;"></textarea>
            <div id="__foxChatErr" style="color:#ef4444;font-size:12px;margin:4px 0;display:none;"></div>
            <button onclick="window.__foxSendMsg('${adId}','${sellerId}')" style="margin-top:8px;width:100%;padding:12px;background:linear-gradient(135deg,rgb(99,102,241),rgb(139,92,246));color:white;border:none;border-radius:10px;font-size:14px;font-weight:bold;cursor:pointer;font-family:inherit;">إرسال ←</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    };

    window.__foxSendMsg = async function(adId, sellerId) {
      const msg = document.getElementById('__foxChatMsg')?.value?.trim();
      const errEl = document.getElementById('__foxChatErr');
      if (!msg) { if (errEl) { errEl.style.display='block'; errEl.textContent='اكتب رسالة أولاً'; } return; }
      const token = localStorage.getItem('xtox_token') || localStorage.getItem('token') || localStorage.getItem('authToken');
      const btn = document.querySelector('#__foxChatModal button:last-child');
      if (btn) { btn.disabled=true; btn.textContent='جارٍ الإرسال...'; }
      try {
        const res = await fetch('https://xtox-production.up.railway.app/api/chat/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ receiverId: sellerId, adId, message: msg }),
        });
        if (res.ok) {
          document.getElementById('__foxChatModal').remove();
          const toast = document.createElement('div');
          toast.textContent = '✓ تم إرسال رسالتك!';
          toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#22c55e;color:white;padding:10px 20px;border-radius:20px;z-index:9999;font-weight:bold;font-size:14px;font-family:Cairo,sans-serif;';
          document.body.appendChild(toast);
          setTimeout(() => toast.remove(), 3000);
        } else {
          const err = await res.json().catch(() => ({}));
          if (errEl) { errEl.style.display='block'; errEl.textContent=err.error||'فشل الإرسال'; }
          if (btn) { btn.disabled=false; btn.textContent='إرسال ←'; }
        }
      } catch(e) {
        if (errEl) { errEl.style.display='block'; errEl.textContent='تحقق من اتصالك'; }
        if (btn) { btn.disabled=false; btn.textContent='إرسال ←'; }
      }
    };

    return () => {
      try { delete window.__foxGetDirections; } catch (_) {}
      try { delete window.__foxContact; } catch (_) {}
      try { delete window.__foxSendMsg; } catch (_) {}
    };
  }, [getDirections]);

  // ── Load saved ads from localStorage ──
  useEffect(() => {
    setSavedAds(getSavedAds());
  }, []);

  // ── Handle save/unsave ──
  const handleSave = useCallback((adId) => {
    const next = toggleSaveAd(adId);
    setSavedAds(next);
    showToast(next.includes(adId) ? '🔖 تمت إضافة الإعلان للمحفوظات' : '🗑️ تمت إزالة الإعلان من المحفوظات', 'success');
  }, [showToast]);

  // ── Load Leaflet CSS ──
  useEffect(() => {
    if (document.getElementById('leaflet-css')) { setMapReady(true); return; }
    const links = [
      { id: 'leaflet-css', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css' },
      { href: 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css' },
      { href: 'https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css' },
    ];
    links.forEach(({ id, href }) => {
      const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
      if (id) link.id = id;
      document.head.appendChild(link);
    });
    setMapReady(true);
  }, []);

  // ── Plot ads with category filter ──
  const plotAds = useCallback((adList) => {
    if (!clusterGroup.current || !window.L) return;
    const L = window.L;
    clusterGroup.current.clearLayers();

    // CAT_SUBSUB_MAP moved to module level to avoid TDZ
    const filtered = categoryFilter
      ? adList.filter(ad => {
          const subsubList = CAT_SUBSUB_MAP[categoryFilter] || [];
          if (ad.subsub && ad.subsub !== 'Other' && subsubList.length > 0) {
            return subsubList.includes(ad.subsub);
          }
          return (ad.category || '').toLowerCase() === categoryFilter || (ad.subcategory || '').toLowerCase().includes(categoryFilter);
        })
      : adList;

    filtered.forEach(ad => {
      const lat = ad.location?.coordinates?.[1] || ad.lat;
      const lng = ad.location?.coordinates?.[0] || ad.lng;
      if (!lat || !lng) return;

      const img   = ad.media?.[0] || ad.images?.[0] || '';
      const price = ad.price
        ? Number(ad.price).toLocaleString('ar-EG') + ' ج.م'
        : LABELS.priceOnContact;
      const dist  = ad.distance != null ? (typeof ad.distance === 'number' ? ad.distance.toFixed(1) : ad.distance) + ' ' + LABELS.km : '';
      const isSaved = savedAds.includes(ad._id);

      const icon = L.divIcon({
        html: '<div style="background:' + (ad.isFeatured ? '#e67e22' : '#002f34') + ';color:#fff;border-radius:10px;padding:4px 8px;font-size:11px;font-weight:700;white-space:nowrap;font-family:Cairo,sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:2px solid rgba(255,255,255,0.3)">' + (ad.isFeatured ? '⭐ ' : '') + price + '</div>',
        className: '',
        iconAnchor: [0, 0],
      });

      const waUrl   = 'https://wa.me/?text=' + encodeURIComponent(ad.title + ' - ' + window.location.origin + '/ads/' + ad._id);


      const adSellerId = (ad.userId?._id || ad.userId || ad.seller?._id || ad.seller || '').toString();
      const adTitleSafe = (ad.title || '').replace(/'/g, '').replace(/"/g, '');
      const popupContent = '\n        <div style="font-family:Cairo,sans-serif;direction:rtl;min-width:210px;max-width:250px">\n          ' + (img ? '<img src="' + img + '" style="width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:8px" onerror="this.style.display=\'none\'" alt="' + (ad.title || 'إعلان') + '" loading="lazy">' : '') + '\n          <div style="font-weight:700;font-size:14px;color:#002f34;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + (ad.title || '') + '">' + (ad.title || 'إعلان') + '</div>\n          ' + ((ad.subsub && ad.subsub !== 'Other') || ad.category ? '<div style="background:#f0f7f4;color:#002f34;font-size:10px;border-radius:6px;padding:2px 8px;display:inline-block;margin-bottom:4px;font-weight:600">' + ((ad.subsub && ad.subsub !== 'Other') ? ad.subsub : ad.category) + '</div>' : '') + '\n          <div style="color:#e74c3c;font-weight:700;font-size:14px;margin-bottom:4px">' + price + '</div>\n          ' + (dist ? '<div style="color:#888;font-size:11px;margin-bottom:8px">📍 ' + dist + '</div>' : '') + '\n          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">\n            <a href="/ads/' + ad._id + '" style="flex:1;min-width:80px;background:#002f34;color:#fff;text-align:center;padding:8px;border-radius:8px;font-size:12px;font-weight:700;text-decoration:none">' + LABELS.viewAdFull + '</a>\n            <button data-lat="' + lat + '" data-lng="' + lng + '" data-name="' + encodeURIComponent(ad.title || '') + '" onclick="window.__foxGetDirections(parseFloat(this.dataset.lat),parseFloat(this.dataset.lng),decodeURIComponent(this.dataset.name))" style="background:#4285F4;color:#fff;padding:8px 10px;border-radius:8px;font-size:12px;border:none;cursor:pointer;font-family:Cairo,sans-serif" title="الاتجاهات">' + LABELS.navigate + '</button>\n            <button onclick="window.__foxContact(\'' + ad._id + '\',\'' + adSellerId + '\',\'' + adTitleSafe + '\')" title="تواصل مع البائع" style="background:linear-gradient(135deg,rgb(99,102,241),rgb(139,92,246));border:none;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:rgba(99,102,241,0.4) 0px 2px 8px;font-size:16px;flex-shrink:0;">💬</button>\n          </div>\n        </div>\n      ';

      const marker = L.marker([lat, lng], { icon });
      marker.bindPopup(popupContent, { maxWidth: 260, className: 'xtox-popup' });
      clusterGroup.current.addLayer(marker);
    });
  }, [categoryFilter, savedAds]);

  // ── Fetch ads ──
  const fetchAds = useCallback(async (lat, lng, retrying = false) => {
    setLoading(true);
    setFetchError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('xtox_token') || localStorage.getItem('token') : null;
      const res   = await fetch(API + '/api/geo/nearby?lat=' + lat + '&lng=' + lng + '&radius=' + radius, {
        headers: token ? { Authorization: 'Bearer ' + token } : {},
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data   = await res.json();
      const adList = Array.isArray(data) ? data : (data.ads || []);
      setAds(adList);
      plotAds(adList);

      // Nearby new-ad alert
      if (adList.length > 0 && adList[0]._id !== lastAlertAdId.current) {
        lastAlertAdId.current = adList[0]._id;
        const isRecent = adList[0].createdAt &&
          Date.now() - new Date(adList[0].createdAt).getTime() < 3_600_000;
        if (isRecent) {
          setNearbyAlert(adList[0]);
          setTimeout(() => setNearbyAlert(null), 6000);
        }
      }
    } catch (e) {
      setFetchError(LABELS.fetchError);
      if (!retrying) showToast(LABELS.fetchError, 'error');
    } finally {
      setLoading(false);
    }
  }, [radius, plotAds, showToast]);

  // ── Re-plot when category filter changes ──
  useEffect(() => {
    if (ads.length > 0) plotAds(ads);
  }, [categoryFilter, plotAds, ads]);

  // ── Init map ──
  useEffect(() => {
    if (!mapReady || leafletMap.current || !mapRef.current) return;
    let map, L;

    async function initMap() {
      const leaflet = await import('leaflet');
      L = leaflet.default;
      window.L = L;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      map = L.map(mapRef.current, { zoomControl: false }).setView([30.0444, 31.2357], 12);
      L.control.zoom({ position: 'bottomleft' }).addTo(map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© XTOX | © OpenStreetMap | © CartoDB',
        subdomains: 'abcd',
        maxZoom: 20,
      }).addTo(map);

      leafletMap.current = map;

      map.on('moveend', () => {
        const c = map.getCenter();
        const z = map.getZoom();
        saveMapHistory(c.lat, c.lng, z, c.lat.toFixed(3) + ', ' + c.lng.toFixed(3));
        setHistory(getMapHistory());
      });

      // MarkerCluster
      const _MC = await import('leaflet.markercluster');
      clusterGroup.current = L.markerClusterGroup({
        maxClusterRadius: 60,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: '<div role="img" aria-label="' + count + ' إعلان" style="background:#002f34;color:#fff;border-radius:50%;width:38px;height:38px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-family:Cairo,sans-serif">' + count + '</div>',
            className: '',
            iconSize: [38, 38],
          });
        },
      });
      map.addLayer(clusterGroup.current);

      // Geolocation
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const { latitude: lat, longitude: lng } = pos.coords;
            setUserPos({ lat, lng });
            map.setView([lat, lng], 13);
            saveMapHistory(lat, lng, 13, LABELS.myLocation);
            setHistory(getMapHistory());

            L.circleMarker([lat, lng], {
              radius: 10, fillColor: '#4285F4', color: '#fff', fillOpacity: 0.9, weight: 3,
            })
              .addTo(map)
              .bindPopup('<div style="font-family:Cairo;direction:rtl;font-weight:700">' + LABELS.myLocation + '</div>');

            fetchAds(lat, lng);
          },
          () => {
            setGeoError(true);
            showToast(LABELS.geoError, 'error');
            // Fall back: fetch all ads without geo sorting
            fetch(API + '/api/ads')
              .then(r => r.json())
              .then(data => {
                const adList = Array.isArray(data) ? data : (data.ads || []);
                setAds(adList);
                plotAds(adList);
              })
              .catch(() => setFetchError(LABELS.fetchError))
              .finally(() => setLoading(false));
          },
          { enableHighAccuracy: true, timeout: 10000 }
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
  }, [mapReady, fetchAds, showToast]);

  // ── Re-fetch when radius changes ──
  const handleRadiusChange = useCallback((r) => {
    setRadius(r);
    if (userPos) fetchAds(userPos.lat, userPos.lng);
    else fetchAds(30.0444, 31.2357);
  }, [userPos, fetchAds]);

  // ── Live tracking toggle ──
  const toggleLiveTracking = useCallback(() => {
    if (liveTracking) {
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setLiveTracking(false);
      showToast('⏹ تم إيقاف التتبع المباشر');
    } else {
      watchId.current = navigator.geolocation.watchPosition(
        pos => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setUserPos({ lat, lng });
          if (leafletMap.current) leafletMap.current.setView([lat, lng], 15);
          fetchAds(lat, lng);
        },
        () => showToast(LABELS.geoError, 'error'),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
      setLiveTracking(true);
      showToast('📡 التتبع المباشر مفعّل');
    }
  }, [liveTracking, fetchAds, showToast]);

  // ── Fly to history location ──
  const flyToHistory = useCallback((h) => {
    if (leafletMap.current) {
      leafletMap.current.flyTo([h.lat, h.lng], h.zoom || 14, { duration: 1.2 });
      fetchAds(h.lat, h.lng);
    }
    setShowHistory(false);
  }, [fetchAds]);

  // ── Share map area ──
  const shareToGoogleMaps = useCallback(async () => {
    if (!leafletMap.current) return;
    const c   = leafletMap.current.getCenter();
    const url = 'https://www.google.com/maps/@' + c.lat + ',' + c.lng + ',' + leafletMap.current.getZoom() + 'z';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'إعلانات XTOX في هذه المنطقة', url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast(LABELS.copyDone, 'success');
      }
    } catch (_) {
      showToast(LABELS.copyFail, 'error');
    }
  }, [showToast]);

  // ── Expand radius if empty ──
  const handleExpand = useCallback(() => {
    const next = Math.min(radius * 2, 50);
    handleRadiusChange(next);
  }, [radius, handleRadiusChange]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl',
        background: '#f5f5f5',
      }}
    >
      {/* Global styles */}
      <style>{'\n        @keyframes shimmer {\n          0%   { opacity: 0.4; }\n          50%  { opacity: 0.9; }\n          100% { opacity: 0.4; }\n        }\n        @keyframes slideDown {\n          from { transform: translateY(-20px); opacity: 0; }\n          to   { transform: translateY(0);     opacity: 1; }\n        }\n        @keyframes toastIn {\n          from { transform: translateY(20px); opacity: 0; }\n          to   { transform: translateY(0);    opacity: 1; }\n        }\n        .xtox-popup .leaflet-popup-content-wrapper {\n          border-radius: 14px; padding: 0; overflow: hidden;\n          box-shadow: 0 6px 24px rgba(0,0,0,0.18);\n        }\n        .xtox-popup .leaflet-popup-content { margin: 12px; }\n        .xtox-popup .leaflet-popup-tip     { background: #fff; }\n        .leaflet-marker-cluster             { background: transparent !important; }\n        ::-webkit-scrollbar                 { width: 0; height: 0; }\n        button:focus-visible {\n          outline: 2px solid #4285F4;\n          outline-offset: 2px;\n        }\n      '}</style>

      {/* ── Header ── */}
      <header
        role="banner"
        style={{
          background: 'linear-gradient(135deg, #002f34 0%, #005c5e 100%)',
          color: '#fff',
          padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          zIndex: 1000, flexShrink: 0,
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        }}>
        <a
          href="/"
          aria-label="العودة للرئيسية"
          style={{ color: '#fff', textDecoration: 'none', fontSize: 22, lineHeight: 1 }}>
          {LABELS.backBtn}
        </a>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '0.01em' }}>{LABELS.title}</div>
          <div style={{ fontSize: 12, opacity: 0.85, marginTop: 1 }}>
            {loading
              ? <SkeletonBar />
              : fetchError
                ? <span style={{ color: '#ff8a80' }}>⚠️ {LABELS.fetchError}</span>
                : LABELS.adsFound(ads.length, radius)
            }
          </div>
          {geoError && (
            <div style={{ fontSize: 11, color: '#FFD54F', marginTop: 2 }}>
              📍 {LABELS.geoError}
            </div>
          )}
        </div>

        {/* Manual refresh */}
        <button
          onClick={() => userPos ? fetchAds(userPos.lat, userPos.lng) : fetchAds(30.0444, 31.2357)}
          aria-label={LABELS.refreshLabel}
          disabled={loading}
          style={{
            background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
            borderRadius: 8, padding: '6px 10px', fontSize: 16, cursor: 'pointer',
            opacity: loading ? 0.5 : 1,
            transition: 'opacity 0.2s',
          }}>
          {LABELS.refresh}
        </button>

        {/* Live tracking */}
        <button
          onClick={toggleLiveTracking}
          aria-label={liveTracking ? 'إيقاف التتبع المباشر' : 'تفعيل التتبع المباشر'}
          aria-pressed={liveTracking}
          style={{
            background: liveTracking ? '#e74c3c' : 'rgba(255,255,255,0.15)',
            color: '#fff', border: 'none', borderRadius: 8, padding: '6px 10px',
            fontSize: 12, cursor: 'pointer', fontFamily: 'Cairo,sans-serif',
            fontWeight: 600, transition: 'background 0.2s',
          }}>
          {liveTracking ? LABELS.liveOff : LABELS.liveOn}
        </button>
      </header>

      {/* ── Controls bar ── */}
      <nav
        role="navigation"
        aria-label="أدوات الخريطة"
        style={{
          background: '#fff', padding: '10px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
          zIndex: 999, borderBottom: '1px solid #e8e8e8', flexShrink: 0,
        }}>

        {/* Row 1: radius + share + history */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto' }}>
          <span style={{ fontSize: 12, color: '#666', flexShrink: 0 }}>{LABELS.radius}</span>
          {[1, 3, 5, 10, 25].map(r => (
            <button
              key={r}
              onClick={() => handleRadiusChange(r)}
              aria-pressed={radius === r}
              aria-label={'نطاق ' + r + ' كيلومتر'}
              style={{
                flexShrink: 0,
                background: radius === r ? '#002f34' : '#f0f0f0',
                color: radius === r ? '#fff' : '#333',
                border: 'none', borderRadius: 8, padding: '5px 12px',
                fontSize: 12, cursor: 'pointer',
                fontFamily: 'Cairo,sans-serif', fontWeight: 600,
                transition: 'all 0.15s ease',
              }}>
              {r} {LABELS.km}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          {/* History dropdown */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setShowHistory(v => !v)}
              aria-expanded={showHistory}
              aria-haspopup="listbox"
              aria-label="سجل المواقع الأخيرة"
              style={{
                background: '#f0f0f0', border: 'none', borderRadius: 8,
                padding: '6px 10px', fontSize: 12, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: 'Cairo,sans-serif',
              }}>
              {LABELS.history}
            </button>
            {showHistory && history.length > 0 && (
              <ul
                role="listbox"
                aria-label="المواقع الأخيرة"
                style={{
                  position: 'absolute', top: '110%', right: 0,
                  background: '#fff', borderRadius: 12,
                  boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
                  minWidth: 210, zIndex: 9999, overflow: 'hidden',
                  listStyle: 'none', margin: 0, padding: 0,
                }}>
                {history.map((h, i) => (
                  <li key={i}>
                    <button
                      role="option"
                      onClick={() => flyToHistory(h)}
                      style={{
                        display: 'block', width: '100%', textAlign: 'right',
                        padding: '10px 14px', border: 'none', background: 'none',
                        cursor: 'pointer', fontSize: 13,
                        borderBottom: '1px solid #f0f0f0', color: '#333',
                        fontFamily: 'Cairo,sans-serif',
                      }}>
                      📍 {h.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Share */}
          <button
            onClick={shareToGoogleMaps}
            aria-label="مشاركة رابط الخريطة"
            style={{
              background: '#4285F4', color: '#fff', border: 'none',
              borderRadius: 8, padding: '6px 10px', fontSize: 12,
              cursor: 'pointer', flexShrink: 0, fontFamily: 'Cairo,sans-serif',
            }}>
            {LABELS.share}
          </button>
        </div>

        {/* Row 2: Category filter chips */}
        <CategoryChips selected={categoryFilter} onSelect={setCategoryFilter} />
      </nav>

      {/* ── Map container ── */}
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <div
          ref={mapRef}
          aria-label="خريطة الإعلانات القريبة"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
        />

        {/* Loading overlay on map */}
        {loading && (
          <div
            aria-live="polite"
            aria-label="جارٍ تحميل الإعلانات"
            style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              zIndex: 500, background: '#002f34', color: '#fff',
              borderRadius: 20, padding: '6px 16px', fontSize: 12, fontWeight: 600,
              fontFamily: 'Cairo,sans-serif', boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            <span style={{ animation: 'shimmer 1s infinite' }}>⏳</span>
            {LABELS.searching}
          </div>
        )}

        {/* Error state */}
        {fetchError && !loading && (
          <ErrorState
            message={fetchError}
            onRetry={() => userPos ? fetchAds(userPos.lat, userPos.lng, true) : fetchAds(30.0444, 31.2357, true)}
          />
        )}

        {/* Empty state */}
        {!loading && !fetchError && ads.length === 0 && (
          <EmptyState radius={radius} onExpand={handleExpand} />
        )}

        {/* ── Inline route info panel ── */}
        {route && routingTo && (
          <div style={{
            position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, background: 'white', borderRadius: 14,
            padding: '10px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
            display: 'flex', alignItems: 'center', gap: 12, fontSize: 13,
            direction: 'rtl', minWidth: 220, pointerEvents: 'all',
            fontFamily: 'Cairo,sans-serif',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#374151', marginBottom: 2 }}>
                🚗 {route.distance} كم
              </div>
              <div style={{ color: '#6b7280', fontSize: 12 }}>
                ⏱ {route.duration} دقيقة تقريباً
              </div>
              <div style={{ color: '#6366f1', fontSize: 11, marginTop: 2 }}>
                إلى: {routingTo.name?.slice(0, 30)}{routingTo.name?.length > 30 ? '…' : ''}
              </div>
            </div>
            <button
              onClick={() => {
                setRoute(null); setRoutingTo(null); setUserLocState(null); setRouteError('');
                if (routePolylineRef.current) { routePolylineRef.current.remove(); routePolylineRef.current = null; }
                if (userLocMarkerRef.current) { userLocMarkerRef.current.remove(); userLocMarkerRef.current = null; }
              }}
              aria-label="إغلاق المسار"
              style={{
                background: '#f3f4f6', border: 'none', borderRadius: 8,
                padding: '6px 10px', cursor: 'pointer', color: '#374151',
                fontWeight: 700, fontFamily: 'Cairo,sans-serif',
              }}>✕</button>
          </div>
        )}
        {routeError && (
          <div style={{
            position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, background: '#fee2e2', borderRadius: 14,
            padding: '8px 16px', color: '#dc2626', fontSize: 13,
            direction: 'rtl', fontFamily: 'Cairo,sans-serif',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>{routeError}</span>
            <button
              onClick={() => setRouteError('')}
              aria-label="إغلاق الخطأ"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>
              ✕
            </button>
          </div>
        )}
      </div>

      {/* ── Nearby new-ad alert banner ── */}
      {nearbyAlert && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position: 'absolute', top: 140, right: 16, left: 16,
            zIndex: 9999, background: '#002f34', color: '#fff',
            borderRadius: 14, padding: '12px 16px',
            boxShadow: '0 6px 20px rgba(0,0,0,0.3)',
            animation: 'slideDown 0.3s ease',
            direction: 'rtl',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 26 }}>🔔</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{LABELS.newNearby}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                {nearbyAlert.title?.slice(0, 40)}{nearbyAlert.title?.length > 40 ? '…' : ''}
              </div>
            </div>
            <a
              href={'/ads/' + nearbyAlert._id}
              style={{
                background: '#fff', color: '#002f34', padding: '6px 14px',
                borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none',
              }}>
              {LABELS.viewAd}
            </a>
            <button
              onClick={() => setNearbyAlert(null)}
              aria-label={LABELS.close}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>
              {LABELS.close}
            </button>
          </div>
        </div>
      )}

      {/* ── Toast notification ── */}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
