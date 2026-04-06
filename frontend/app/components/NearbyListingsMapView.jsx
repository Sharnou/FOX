"use client";
import { useState, useEffect } from "react";
import { MapPin, Layers, List, X, Navigation } from "lucide-react";

const LABELS = {
  ar: {
    title: "الإعلانات القريبة منك",
    searching: "جاري البحث...",
    found: (n, r) => n + ' إعلان ضمن ' + r + ' كم',
    noAds: "لا توجد إعلانات قريبة منك",
    expandSearch: "جرّب توسيع نطاق البحث",
    viewAd: "عرض الإعلان",
    km: "كم",
  },
  en: {
    title: "Nearby Listings",
    searching: "Searching...",
    found: (n, r) => n + ' listings within ' + r + ' km',
    noAds: "No nearby listings found",
    expandSearch: "Try expanding your search radius",
    viewAd: "View Listing",
    km: "km",
  },
  de: {
    title: "Angebote in der Nähe",
    searching: "Suche läuft...",
    found: (n, r) => n + ' Angebote in ' + r + ' km Umkreis',
    noAds: "Keine Angebote in der Nähe",
    expandSearch: "Suchradius vergrößern",
    viewAd: "Angebot ansehen",
    km: "km",
  },
};

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toArabicNumerals(num) {
  return String(num).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

export default function NearbyListingsMapView({
  lang = "ar",
  onClose,
  category = null,
}) {
  const L = LABELS[lang] || LABELS.ar;
  const isRTL = lang === "ar";

  const [listings, setListings] = useState([]);
  const [userLocation, setUserLocation] = useState([24.7136, 46.6753]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [selectedAd, setSelectedAd] = useState(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      () => setLocationError(true),
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const [lat, lng] = userLocation;
    const params = new URLSearchParams({
      lat: lat.toString(),
      lng: lng.toString(),
      radius: radiusKm.toString(),
      limit: "50",
      ...(category && { category }),
    });
    setLoading(true);
    fetch('/api/ads/nearby?' + params)
      .then((r) => r.json())
      .then((data) => {
        const ads = (data.ads || []).map((ad) => ({
          ...ad,
          distanceKm: getDistanceKm(lat, lng, ad.location?.lat || lat, ad.location?.lng || lng),
        }));
        setListings(ads);
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [userLocation, radiusKm, category]);

  const formatPrice = (price, currency) => {
    const formatted =
      lang === "ar"
        ? toArabicNumerals(price.toLocaleString("ar-SA"))
        : price.toLocaleString();
    return formatted + ' ' + (currency || '');
  };

  const formatDistance = (km) => {
    const rounded = km < 1 ? (Math.round(km * 1000) + 'م') : (km.toFixed(1) + ' ' + L.km);
    return lang === "ar" ? toArabicNumerals(rounded) : rounded;
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-white flex flex-col"
      dir={isRTL ? "rtl" : "ltr"}
      style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "inherit" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
        <h2 className="text-lg font-bold text-gray-800">{L.title}</h2>
        <div className="flex items-center gap-2">
          <select
            value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {[5, 10, 25, 50].map((r) => (
              <option key={r} value={r}>
                {lang === "ar" ? toArabicNumerals(r) : r} {L.km}
              </option>
            ))}
          </select>
          <button
            onClick={() => setView(view === "map" ? "list" : "map")}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            title={view === "map" ? "List view" : "Map view"}
          >
            {view === "map" ? (
              <List className="w-5 h-5" />
            ) : (
              <Layers className="w-5 h-5" />
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-blue-50 text-sm text-blue-700 flex items-center gap-2">
        <MapPin className="w-4 h-4 flex-shrink-0" />
        <span>
          {loading
            ? L.searching
            : L.found(
                lang === "ar" ? toArabicNumerals(listings.length) : listings.length,
                lang === "ar" ? toArabicNumerals(radiusKm) : radiusKm
              )}
        </span>
        {locationError && (
          <span className="text-amber-600 text-xs mr-auto">
            {lang === "ar" ? "⚠️ يتم استخدام الموقع الافتراضي" : "⚠️ Using default location"}
          </span>
        )}
      </div>

      {/* Map Placeholder */}
      {view === "map" && (
        <div className="flex-1 bg-gray-100 flex items-center justify-center relative">
          <div className="text-center text-gray-500">
            <Layers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm font-medium">
              {lang === "ar"
                ? "لتفعيل الخريطة التفاعلية أضف: react-leaflet"
                : "To enable interactive map: add react-leaflet"}
            </p>
            <p className="text-xs text-gray-400 mt-1">npm install leaflet react-leaflet react-leaflet-cluster</p>
          </div>
          {/* Show clickable ad pins as absolute positioned elements in placeholder */}
          {listings.slice(0, 6).map((ad, i) => (
            <button
              key={ad._id}
              onClick={() => setSelectedAd(ad)}
              style={{
                position: "absolute",
                left: (20 + (i % 3) * 30) + '%',
                top: (25 + Math.floor(i / 3) * 35) + '%',
              }}
              className="bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg hover:bg-blue-700 transition-colors border-2 border-white"
            >
              {formatPrice(ad.price, ad.currency)}
            </button>
          ))}
        </div>
      )}

      {/* List View */}
      {view === "list" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex gap-3 bg-white border rounded-xl p-3 animate-pulse"
                >
                  <div className="w-20 h-20 bg-gray-200 rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && listings.length === 0 && (
            <div className="text-center pt-20 text-gray-500">
              <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">{L.noAds}</p>
              <p className="text-sm mt-1 text-gray-400">{L.expandSearch}</p>
            </div>
          )}

          {!loading &&
            listings.map((ad) => (
              <a
                key={ad._id}
                href={'/ads/' + ad._id}
                className="flex gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]"
              >
                <img
                  src={ad.images?.[0] || "/placeholder.jpg"}
                  alt={ad.title}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                  loading="lazy"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate text-sm">
                    {ad.title}
                  </h3>
                  <p className="text-blue-600 font-bold mt-1">
                    {formatPrice(ad.price, ad.currency)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1.5">
                    <Navigation className="w-3 h-3" />
                    <span>
                      {formatDistance(ad.distanceKm)} • {ad.city}
                    </span>
                  </div>
                  {ad.category && (
                    <span className="inline-block mt-1.5 text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                      {ad.category}
                    </span>
                  )}
                </div>
              </a>
            ))}
        </div>
      )}

      {/* Selected Ad Bottom Sheet */}
      {selectedAd && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-4 z-10 border-t">
          <div className="w-8 h-1 bg-gray-200 rounded-full mx-auto mb-3" />
          <div className={'flex gap-3 ' + (isRTL ? 'flex-row-reverse text-right' : '')}>
            <img
              src={selectedAd.images?.[0] || "/placeholder.jpg"}
              alt={selectedAd.title}
              className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
            />
            <div className="flex-1">
              <p className="font-bold text-gray-800 text-sm">{selectedAd.title}</p>
              <p className="text-blue-600 font-bold mt-0.5">
                {formatPrice(selectedAd.price, selectedAd.currency)}
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Navigation className="w-3 h-3" />
                {formatDistance(selectedAd.distanceKm)} • {selectedAd.city}
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <a
              href={'/ads/' + selectedAd._id}
              className="flex-1 bg-blue-600 text-white text-center py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
            >
              {L.viewAd}
            </a>
            <button
              onClick={() => setSelectedAd(null)}
              className="p-2.5 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
